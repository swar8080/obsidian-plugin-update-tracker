import { request, requestUrl } from 'obsidian';
import { NewPluginVersionRequest, PluginReleases } from 'shared-types';

type ReleaseApi = (request: NewPluginVersionRequest) => Promise<PluginReleases[]>;

const BACKEND_API_URL =
    (process.env['OBSIDIAN_APP_UPDATE_CHECKER_URL'] || '') + '/obsidian-plugin-update-tracker';

export const getReleases: ReleaseApi = async (newPluginVersionRequest: NewPluginVersionRequest) => {
    try {
        const res: string = await request({
            url: BACKEND_API_URL,
            method: 'POST',
            body: JSON.stringify(newPluginVersionRequest),
        });
        return JSON.parse(res);
    } catch (err) {
        console.error('Error fetching releases', err);
        throw err;
    }
};

export const getReleaseAsset = async (
    assetId: number,
    githubRepo: string
): Promise<{ success: boolean; fileContents?: string; rateLimitResetTimestamp?: number }> => {
    const res = await requestUrl({
        url: `https://api.github.com/repos/${githubRepo}/releases/assets/${assetId}`,
        method: 'GET',
        headers: { Accept: 'application/octet-stream' },
        throw: false,
    });

    if (res.status === 200) {
        const fileContents = res.text;
        return { success: true, fileContents };
    } else if (
        res.headers['x-ratelimit-remaining'] === '0' &&
        res.headers['x-ratelimit-reset'] != null
    ) {
        const rateLimitResetTimestamp = parseInt(res.headers['x-ratelimit-reset']) * 1000;
        return { success: false, rateLimitResetTimestamp };
    } else {
        throw res;
    }
};
