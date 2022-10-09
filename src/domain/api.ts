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

export const getReleaseAsset = async (assetId: number, githubRepo: string): Promise<string> => {
    return await fetch(`https://api.github.com/repos/${githubRepo}/releases/assets/${assetId}`, {
        method: 'GET',
        headers: new Headers({
            Accept: 'application/octet-stream',
        }),
    }).then((res) => res.text());
};
