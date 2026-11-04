import axios, { AxiosError } from 'axios';
import { RateLimitedError } from './errors';
import { MetricLogger } from './MetricLogger';
import { GithubReleaseApi } from './ReleaseApi';

jest.mock('axios', () => {
    const actualAxios = jest.requireActual('axios');
    const mockedAxios: any = jest.fn();
    mockedAxios.AxiosError = actualAxios.AxiosError;
    mockedAxios.isAxiosError = actualAxios.isAxiosError;
    mockedAxios.default = mockedAxios;
    return mockedAxios;
});

const mockedAxios = axios as unknown as jest.Mock;

const NOW_MS = Date.parse('2026-11-03T12:00:00Z');
const RESET_EPOCH_SECONDS = NOW_MS / 1000 + 600;
const REPO = 'author/plugin';

function httpError(status: number, headers: Record<string, string>, data: object = {}) {
    return new AxiosError(
        `Request failed with status code ${status}`,
        'ERR_BAD_REQUEST',
        { method: 'get', url: 'https://api.github.com/repos/author/plugin/releases' } as any,
        {},
        { status, headers, data, statusText: '', config: {} as any }
    );
}

const releasesResponse = (headers: Record<string, string> = {}) => ({
    data: [],
    headers: { etag: 'etag', ...headers },
});

describe('GithubReleaseApi rate limit pause', () => {
    let metricLogger: MetricLogger;
    let releaseApi: GithubReleaseApi;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let currentTimeMs: number;

    beforeEach(() => {
        currentTimeMs = NOW_MS;
        jest.spyOn(Date, 'now').mockImplementation(() => currentTimeMs);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        mockedAxios.mockReset();
        metricLogger = {
            trackGithubRateLimit: jest.fn().mockResolvedValue(undefined),
            trackErrorCodeOccurrence: jest.fn().mockResolvedValue(undefined),
        };
        releaseApi = new GithubReleaseApi('token', metricLogger, 1000);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('stops calling github after a rate limit rejection, logging and tracking it once', async () => {
        mockedAxios.mockRejectedValueOnce(
            httpError(403, {
                'x-ratelimit-remaining': '0',
                'x-ratelimit-reset': RESET_EPOCH_SECONDS.toString(),
            })
        );

        await expect(releaseApi.fetchReleases(REPO, 10)).rejects.toBeInstanceOf(RateLimitedError);
        await expect(releaseApi.fetchReleases(REPO, 10)).rejects.toBeInstanceOf(RateLimitedError);
        await expect(releaseApi.fetchMasterManifest(REPO, undefined)).rejects.toBeInstanceOf(
            RateLimitedError
        );

        expect(mockedAxios).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(metricLogger.trackErrorCodeOccurrence).toHaveBeenCalledTimes(1);
        expect(metricLogger.trackErrorCodeOccurrence).toHaveBeenCalledWith('GITHUB_RATE_LIMITED');
    });

    it('resumes calling github once the limit has reset', async () => {
        mockedAxios.mockRejectedValueOnce(
            httpError(403, {
                'x-ratelimit-remaining': '0',
                'x-ratelimit-reset': RESET_EPOCH_SECONDS.toString(),
            })
        );
        await expect(releaseApi.fetchReleases(REPO, 10)).rejects.toBeInstanceOf(RateLimitedError);

        currentTimeMs = RESET_EPOCH_SECONDS * 1000 + 1;
        mockedAxios.mockResolvedValueOnce(releasesResponse());

        await expect(releaseApi.fetchReleases(REPO, 10)).resolves.toMatchObject({
            hasChanges: true,
        });
        expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it('waits for the retry-after period of a secondary rate limit', async () => {
        mockedAxios.mockRejectedValueOnce(
            httpError(
                429,
                { 'retry-after': '30' },
                { message: 'You have exceeded a secondary rate limit' }
            )
        );
        await expect(releaseApi.fetchReleases(REPO, 10)).rejects.toBeInstanceOf(RateLimitedError);

        currentTimeMs = NOW_MS + 29 * 1000;
        await expect(releaseApi.fetchReleases(REPO, 10)).rejects.toBeInstanceOf(RateLimitedError);
        expect(mockedAxios).toHaveBeenCalledTimes(1);

        currentTimeMs = NOW_MS + 31 * 1000;
        mockedAxios.mockResolvedValueOnce(releasesResponse());
        await releaseApi.fetchReleases(REPO, 10);
        expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it('pauses after a successful response that used the last remaining call', async () => {
        mockedAxios.mockResolvedValueOnce(
            releasesResponse({
                'x-ratelimit-remaining': '0',
                'x-ratelimit-reset': RESET_EPOCH_SECONDS.toString(),
            })
        );

        await releaseApi.fetchReleases(REPO, 10);
        await expect(releaseApi.fetchReleases(REPO, 10)).rejects.toBeInstanceOf(RateLimitedError);

        expect(mockedAxios).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('does not pause for a 403 that is not a rate limit', async () => {
        const forbiddenError = httpError(
            403,
            { 'x-ratelimit-remaining': '4000' },
            { message: 'Repository access blocked' }
        );
        mockedAxios.mockRejectedValueOnce(forbiddenError);
        mockedAxios.mockResolvedValueOnce(releasesResponse());

        await expect(releaseApi.fetchReleases(REPO, 10)).rejects.toBe(forbiddenError);
        await releaseApi.fetchReleases(REPO, 10);

        expect(mockedAxios).toHaveBeenCalledTimes(2);
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(metricLogger.trackErrorCodeOccurrence).toHaveBeenCalledWith('GITHUB_FETCH_RELEASES');
    });

    it('does not pause for an etag match', async () => {
        mockedAxios.mockRejectedValueOnce(httpError(304, { 'x-ratelimit-remaining': '0' }));
        mockedAxios.mockResolvedValueOnce(releasesResponse());

        await expect(releaseApi.fetchReleases(REPO, 10, 'etag')).resolves.toEqual({
            hasChanges: false,
        });
        await releaseApi.fetchReleases(REPO, 10);

        expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it('logs unexpected errors without request headers', async () => {
        mockedAxios.mockRejectedValueOnce(
            httpError(500, { 'x-ratelimit-remaining': '4000' }, { message: 'Server Error' })
        );

        await expect(releaseApi.fetchReleases(REPO, 10)).rejects.toBeInstanceOf(AxiosError);

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        const loggedArguments = consoleErrorSpy.mock.calls[0];
        expect(loggedArguments).toHaveLength(1);
        expect(loggedArguments[0]).toContain('status 500: Server Error');
        expect(loggedArguments[0]).not.toContain('Authorization');
    });
});
