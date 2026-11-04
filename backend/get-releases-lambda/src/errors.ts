import axios from 'axios';

const MAX_RESPONSE_MESSAGE_LENGTH = 200;

/**
 * Thrown instead of calling github while the api rate limit is known to be exhausted.
 */
export class RateLimitedError extends Error {
    public readonly resumeAtMs: number;

    constructor(resumeAtMs: number) {
        super(`GitHub api rate limited until ${new Date(resumeAtMs).toISOString()}`);
        this.name = 'RateLimitedError';
        this.resumeAtMs = resumeAtMs;
        Object.setPrototypeOf(this, RateLimitedError.prototype);
    }
}

/**
 * Axios errors embed the full request config, including the Authorization header, so they
 * are summarized rather than logged as objects.
 */
export function describeError(err: unknown): string {
    if (axios.isAxiosError(err)) {
        const request = `${(err.config?.method || 'get').toUpperCase()} ${err.config?.url}`;
        if (err.response == null) {
            return `${request} failed: ${err.code || err.message}`;
        }
        const responseData = err.response.data as { message?: unknown } | string | undefined;
        const responseMessage =
            typeof responseData === 'object' && typeof responseData?.message === 'string'
                ? `: ${responseData.message.substring(0, MAX_RESPONSE_MESSAGE_LENGTH)}`
                : '';
        return `${request} failed with status ${err.response.status}${responseMessage}`;
    }
    if (err instanceof Error) {
        return err.stack || `${err.name}: ${err.message}`;
    }
    return String(err);
}

/**
 * Logs an error on one line, skipping RateLimitedError so a pause isn't logged for every plugin.
 */
export function logError(message: string, err: unknown) {
    if (err instanceof RateLimitedError) {
        return;
    }
    console.error(`${message}: ${describeError(err)}`);
}
