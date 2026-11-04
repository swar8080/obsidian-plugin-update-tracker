import { AxiosError } from 'axios';
import { describeError, logError, RateLimitedError } from './errors';

describe('describeError', () => {
    it('summarizes http errors without headers', () => {
        const err = new AxiosError(
            'Request failed',
            'ERR_BAD_REQUEST',
            {
                method: 'get',
                url: 'https://api.github.com/repos/a/b/releases',
                headers: { Authorization: 'Bearer secret-token' },
            } as any,
            {},
            {
                status: 403,
                headers: {},
                data: { message: 'API rate limit exceeded' },
                statusText: '',
                config: {} as any,
            }
        );

        const description = describeError(err);

        expect(description).toBe(
            'GET https://api.github.com/repos/a/b/releases failed with status 403: API rate limit exceeded'
        );
        expect(description).not.toContain('secret-token');
    });

    it('summarizes errors without a response', () => {
        const err = new AxiosError('timeout of 5000ms exceeded', 'ECONNABORTED', {
            method: 'get',
            url: 'https://example.com',
        } as any);

        expect(describeError(err)).toBe('GET https://example.com failed: ECONNABORTED');
    });

    it('includes the stack of other errors', () => {
        expect(describeError(new TypeError('bad value'))).toContain('TypeError: bad value');
    });

    it('stringifies non-errors', () => {
        expect(describeError('oops')).toBe('oops');
    });
});

describe('logError', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('logs one line', () => {
        logError('Failed thing', new Error('boom'));

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy.mock.calls[0]).toHaveLength(1);
        expect(consoleErrorSpy.mock.calls[0][0]).toContain('Failed thing: Error: boom');
    });

    it('does not log rate limit pauses', () => {
        logError('Failed thing', new RateLimitedError(Date.now() + 1000));

        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
