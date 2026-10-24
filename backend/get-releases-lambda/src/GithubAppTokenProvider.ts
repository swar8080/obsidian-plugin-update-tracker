import axios from 'axios';
import { createSign } from 'crypto';
import { MetricLogger } from './MetricLogger';

//installation tokens last an hour, refresh early so a request never goes out with an expired one
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

//github rejects app JWTs that expire more than 10 minutes out
const APP_JWT_LIFETIME_SECONDS = 9 * 60;

//backdate the JWT to tolerate clock drift between lambda and github
const APP_JWT_CLOCK_DRIFT_SECONDS = 60;

type InstallationToken = {
    token: string;
    expiresAtMs: number;
};

/**
 * Authenticates as a GitHub App installation so github api calls get the installation's
 * rate limit instead of a personal user's.
 */
export class GithubAppTokenProvider {
    private appId: string;
    private installationId: string;
    private privateKey: string;
    private metricLogger: MetricLogger;
    private timeoutMs: number;
    private cachedToken: InstallationToken | null = null;
    private pendingToken: Promise<InstallationToken> | null = null;

    constructor(
        appId: string,
        installationId: string,
        privateKey: string,
        metricLogger: MetricLogger,
        timeoutMs: number
    ) {
        this.appId = appId;
        this.installationId = installationId;
        //single-line env var editors (e.g. the lambda console) require newlines escaped as \n
        this.privateKey = privateKey.replace(/\\n/g, '\n');
        this.metricLogger = metricLogger;
        this.timeoutMs = timeoutMs;
    }

    async getToken(): Promise<string> {
        if (
            this.cachedToken != null &&
            this.cachedToken.expiresAtMs - TOKEN_REFRESH_MARGIN_MS > Date.now()
        ) {
            return this.cachedToken.token;
        }

        if (this.pendingToken == null) {
            this.pendingToken = this.fetchInstallationToken().finally(() => {
                this.pendingToken = null;
            });
        }
        const installationToken = await this.pendingToken;
        this.cachedToken = installationToken;
        return installationToken.token;
    }

    private async fetchInstallationToken(): Promise<InstallationToken> {
        try {
            const response = await axios({
                method: 'post',
                url: `https://api.github.com/app/installations/${this.installationId}/access_tokens`,
                headers: {
                    Authorization: `Bearer ${this.createAppJwt()}`,
                    Accept: 'application/vnd.github+json',
                },
                timeout: this.timeoutMs,
            });

            return {
                token: response.data.token,
                expiresAtMs: Date.parse(response.data.expires_at),
            };
        } catch (err) {
            console.error(
                `Unexpected error fetching github app installation token for app ${this.appId}`,
                err
            );
            await this.metricLogger.trackErrorCodeOccurrence('GITHUB_FETCH_INSTALLATION_TOKEN');
            throw err;
        }
    }

    private createAppJwt(): string {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const header = toBase64UrlJson({ alg: 'RS256', typ: 'JWT' });
        const payload = toBase64UrlJson({
            iat: nowSeconds - APP_JWT_CLOCK_DRIFT_SECONDS,
            exp: nowSeconds + APP_JWT_LIFETIME_SECONDS,
            iss: this.appId,
        });
        const unsignedJwt = `${header}.${payload}`;
        const signature = createSign('RSA-SHA256')
            .update(unsignedJwt)
            .sign(this.privateKey, 'base64url');
        return `${unsignedJwt}.${signature}`;
    }
}

function toBase64UrlJson(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}
