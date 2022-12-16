import axios, { AxiosError, AxiosResponse } from 'axios';
import { MetricLogger } from './MetricLogger';

export interface ReleaseApi {
    fetchReleases(
        repositoryPath: string,
        limit: number,
        etag?: string
    ): Promise<ApiReleaseResponse>;

    fetchReleaseManifest(repositoryPath: string, assetId: number): Promise<ApiPluginManifest>;

    fetchMasterManifest(
        repositoryPath: string,
        etag: string | undefined
    ): Promise<ApiMasterPluginManifestResponse>;
}

export class GithubReleaseApi implements ReleaseApi {
    private githubAccessToken: string;
    private metricLogger: MetricLogger;
    private timeoutMs: number;

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
            console.error(`Unexpected error fetching github releases for ${repositoryPath}`, err);
            throw err;
        }
    }

    async fetchReleaseManifest(
        repositoryPath: string,
        assetId: number
    ): Promise<ApiPluginManifest> {
        const response = await axios({
            method: 'get',
            url: `https://api.github.com/repos/${repositoryPath}/releases/assets/${assetId}`,
            headers: {
                Authorization: `Bearer ${this.githubAccessToken}`,
                Accept: 'application/octet-stream',
            },
            timeout: this.timeoutMs,
        });

        this.emitRateLimitMetric(response);

        return response.data;
    }

    async fetchMasterManifest(
        repositoryPath: string,
        etag: string | undefined
    ): Promise<ApiMasterPluginManifestResponse> {
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
            console.error(`Unexpected error fetching master manifest for ${repositoryPath}`, err);
            throw err;
        }
    }

    private emitRateLimitMetric(response: AxiosResponse) {
        const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
        try {
            if (rateLimitRemaining != null) {
                this.metricLogger.logGithubRateLimit(parseInt(rateLimitRemaining));
            }
        } catch (err) {
            console.warn(`Error logging rate limit metric ${rateLimitRemaining}`, err);
        }
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
    download_count: number;
    updated_at: string;
};

export type ApiPluginManifest = {
    version?: string;
    minAppVersion?: string;
};
