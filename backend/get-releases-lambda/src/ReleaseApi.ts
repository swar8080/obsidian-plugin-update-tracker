import axios, { AxiosError, AxiosResponse } from 'axios';
import { MetricLogger } from './MetricLogger';

export interface ReleaseApi {
    fetchReleases(
        repositoryPath: string,
        limit: number,
        etag?: string
    ): Promise<ApiReleaseResponse>;

    fetchManifest(repositoryPath: string, assetId: number): Promise<ApiPluginManifest>;
}

export type ApiReleaseResponse =
    | {
          hasChanges: true;
          releases: ApiReleases[];
          etag: string;
      }
    | { hasChanges: false };

export class GithubReleaseApi implements ReleaseApi {
    private githubAccessToken: string;
    private metricLogger: MetricLogger;

    constructor(githubAccessToken: string, metricLogger: MetricLogger) {
        this.githubAccessToken = githubAccessToken;
        this.metricLogger = metricLogger;
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
                console.info(`Etag match on ${repositoryPath}`);
                return {
                    hasChanges: false,
                };
            }
            console.error(`Unexpected error fetching github releases for ${repositoryPath}`, err);
            throw err;
        }
    }

    async fetchManifest(repositoryPath: string, assetId: number): Promise<ApiPluginManifest> {
        const response = await axios({
            method: 'get',
            url: `https://api.github.com/repos/${repositoryPath}/releases/assets/${assetId}`,
            headers: {
                Authorization: `Bearer ${this.githubAccessToken}`,
                Accept: 'application/octet-stream',
            },
        });

        this.emitRateLimitMetric(response);

        return response.data;
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
