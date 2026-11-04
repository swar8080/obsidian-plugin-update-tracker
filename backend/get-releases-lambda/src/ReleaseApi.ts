import axios, { AxiosError, AxiosResponse } from 'axios';
import { MetricLogger } from './MetricLogger';
import { describeError, RateLimitedError } from './errors';

//github asks for at least a minute before retrying when a secondary rate limit has no retry-after header
const DEFAULT_SECONDARY_RATE_LIMIT_PAUSE_MS = 60 * 1000;

export interface ReleaseApi {
    fetchReleases(
        repositoryPath: string,
        limit: number,
        etag?: string
    ): Promise<ApiReleaseResponse>;

    fetchReleaseManifest(manifestDownloadUrl: string): Promise<ApiPluginManifest>;

    fetchMasterManifest(
        repositoryPath: string,
        etag: string | undefined
    ): Promise<ApiMasterPluginManifestResponse>;
}

export class GithubReleaseApi implements ReleaseApi {
    private githubAccessToken: string;
    private metricLogger: MetricLogger;
    private timeoutMs: number;
    private rateLimitedUntilMs = 0;

    constructor(githubAccessToken: string, metricLogger: MetricLogger, timeoutMs: number) {
        this.githubAccessToken = githubAccessToken;
        this.metricLogger = metricLogger;
        this.timeoutMs = timeoutMs;
    }

    async fetchReleases(
        repositoryPath: string,
        limit: number,
        etag?: string | undefined
    ): Promise<ApiReleaseResponse> {
        //fetch more than needed because draft/prereleases may be included in the results
        const per_page = Math.min(100, limit * 2);

        this.throwIfRateLimited();
        try {
            const response = await axios({
                method: 'get',
                url: `https://api.github.com/repos/${repositoryPath}/releases?per_page=${per_page}`,
                headers: {
                    Authorization: `Bearer ${this.githubAccessToken}`,
                    Accept: 'application/vnd.github+json',
                    'If-None-Match': etag || '',
                },
                timeout: this.timeoutMs,
            });

            this.emitRateLimitMetric(response);

            const releases: ApiReleases[] = response.data;
            const filteredReleases = releases.filter((release) => !release.draft).slice(0, limit);

            return {
                hasChanges: true,
                releases: filteredReleases,
                etag: response.headers['etag'],
            };
        } catch (err) {
            if (err instanceof AxiosError && err.response?.status === 304) {
                return {
                    hasChanges: false,
                };
            }
            const rateLimitedError = await this.pauseIfRateLimitRejection(err);
            if (rateLimitedError != null) {
                throw rateLimitedError;
            }
            console.error(
                `Unexpected error fetching github releases for ${repositoryPath}: ${describeError(
                    err
                )}`
            );
            await this.metricLogger.trackErrorCodeOccurrence('GITHUB_FETCH_RELEASES');
            throw err;
        }
    }

    /**
     * Downloads from the asset's browser_download_url instead of the api.github.com asset endpoint
     * because release asset downloads are served from github's file hosts and don't use the api rate limit.
     */
    async fetchReleaseManifest(manifestDownloadUrl: string): Promise<ApiPluginManifest> {
        try {
            const response = await axios({
                method: 'get',
                url: manifestDownloadUrl,
                timeout: this.timeoutMs,
            });

            return response.data;
        } catch (err) {
            this.metricLogger.trackErrorCodeOccurrence('GITHUB_FETCH_MANIFEST');
            throw err;
        }
    }

    async fetchMasterManifest(
        repositoryPath: string,
        etag: string | undefined
    ): Promise<ApiMasterPluginManifestResponse> {
        this.throwIfRateLimited();
        try {
            const response = await axios({
                method: 'get',
                url: `https://api.github.com/repos/${repositoryPath}/contents/manifest.json`,
                headers: {
                    Authorization: `Bearer ${this.githubAccessToken}`,
                    'If-None-Match': etag || '',
                },
                timeout: this.timeoutMs,
            });
            this.emitRateLimitMetric(response);

            const base64Content: string = response.data.content;
            const base64Buffer = Buffer.from(base64Content, 'base64');
            const manifest = JSON.parse(base64Buffer.toString('utf-8'));

            return {
                hasChanges: true,
                manifest,
                etag: response.headers['etag'],
            };
        } catch (err) {
            if (err instanceof AxiosError && err.response?.status === 304) {
                return {
                    hasChanges: false,
                };
            }
            const rateLimitedError = await this.pauseIfRateLimitRejection(err);
            if (rateLimitedError != null) {
                throw rateLimitedError;
            }
            console.error(
                `Unexpected error fetching master manifest for ${repositoryPath}: ${describeError(
                    err
                )}`
            );
            await this.metricLogger.trackErrorCodeOccurrence('GITHUB_FETCH_MASTER_MANIFEST');
            throw err;
        }
    }

    private emitRateLimitMetric(response: AxiosResponse) {
        const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
        try {
            if (rateLimitRemaining != null) {
                this.metricLogger.trackGithubRateLimit(parseInt(rateLimitRemaining));
            }
        } catch (err) {
            console.warn(`Error logging rate limit metric ${rateLimitRemaining}`, err);
        }

        if (rateLimitRemaining === '0') {
            const resetEpochSeconds = parseInt(response.headers['x-ratelimit-reset']);
            if (!isNaN(resetEpochSeconds)) {
                this.rateLimitedUntilMs = Math.max(
                    this.rateLimitedUntilMs,
                    resetEpochSeconds * 1000
                );
            }
        }
    }

    private throwIfRateLimited() {
        if (Date.now() < this.rateLimitedUntilMs) {
            throw new RateLimitedError(this.rateLimitedUntilMs);
        }
    }

    private async pauseIfRateLimitRejection(err: unknown): Promise<RateLimitedError | null> {
        if (!(err instanceof AxiosError) || ![403, 429].includes(err.response?.status || 0)) {
            return null;
        }
        const headers = err.response?.headers || {};
        const retryAfterSeconds = parseInt(headers['retry-after']);
        const resetEpochSeconds = parseInt(headers['x-ratelimit-reset']);
        const responseMessage = String((err.response?.data as { message?: string })?.message);

        let resumeAtMs: number;
        if (!isNaN(retryAfterSeconds)) {
            resumeAtMs = Date.now() + retryAfterSeconds * 1000;
        } else if (headers['x-ratelimit-remaining'] === '0' && !isNaN(resetEpochSeconds)) {
            resumeAtMs = resetEpochSeconds * 1000;
        } else if (/rate limit/i.test(responseMessage)) {
            resumeAtMs = Date.now() + DEFAULT_SECONDARY_RATE_LIMIT_PAUSE_MS;
        } else {
            return null;
        }

        const isNewPause = Date.now() >= this.rateLimitedUntilMs;
        this.rateLimitedUntilMs = Math.max(this.rateLimitedUntilMs, resumeAtMs);
        if (isNewPause) {
            console.warn(
                `GitHub api rate limit hit, skipping github api calls until ${new Date(
                    this.rateLimitedUntilMs
                ).toISOString()}`
            );
            await this.metricLogger.trackErrorCodeOccurrence('GITHUB_RATE_LIMITED');
        }
        return new RateLimitedError(this.rateLimitedUntilMs);
    }
}

export type ApiReleaseResponse =
    | {
          hasChanges: true;
          releases: ApiReleases[];
          etag: string;
      }
    | { hasChanges: false };

export type ApiMasterPluginManifestResponse =
    | {
          hasChanges: true;
          manifest: ApiPluginManifest;
          etag: string;
      }
    | { hasChanges: false };

export type ApiReleases = {
    id: number;
    name: string;
    tag_name: string;
    prerelease: boolean;
    draft: boolean;
    published_at: string;
    body?: string;
    assets?: ApiReleaseAsset[];
};

type ApiReleaseAsset = {
    id: number;
    name: string;
    browser_download_url: string;
    download_count: number;
    updated_at: string;
};

export type ApiPluginManifest = {
    version?: string;
    minAppVersion?: string;
};
