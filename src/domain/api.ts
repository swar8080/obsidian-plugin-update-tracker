import { NewPluginVersionRequest, PluginReleases } from 'shared-types';

type ReleaseApi = (request: NewPluginVersionRequest) => Promise<PluginReleases[]>;

const BACKEND_API_URL =
    (process.env['OBSIDIAN_APP_UPDATE_CHECKER_URL'] || '') + '/obsidian-plugin-update-checker';

export const getReleases: ReleaseApi = async (request: NewPluginVersionRequest) => {
    return await fetch(BACKEND_API_URL, {
        method: 'POST',
        body: JSON.stringify(request),
    }).then((res) => res.json());
};

export const getReleaseAsset = async (
    assetId: number,
    githubRepo: string
): Promise<{ success: boolean; fileContents?: string; rateLimitResetTimestamp?: number }> => {
    const res = await fetch(
        `https://api.github.com/repos/${githubRepo}/releases/assets/${assetId}`,
        {
            method: 'GET',
            headers: new Headers({
                Accept: 'application/octet-stream',
            }),
        }
    );

    if (res.status === 200) {
        const fileContents = await res.text();
        return { success: true, fileContents };
    } else if (
        res.headers.get('x-ratelimit-remaining') === '0' &&
        res.headers.get('x-ratelimit-reset') != null
    ) {
        const rateLimitResetTimestamp =
            parseInt(res.headers.get('x-ratelimit-reset') as string) * 1000;
        return { success: false, rateLimitResetTimestamp };
    } else {
        throw res;
    }
};
