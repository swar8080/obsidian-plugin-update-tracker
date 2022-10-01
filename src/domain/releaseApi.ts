import { NewPluginVersionRequest, PluginReleases } from 'shared-types';

type ReleaseApi = (request: NewPluginVersionRequest) => Promise<PluginReleases[]>;

const API_URL =
    (process.env['OBSIDIAN_APP_UPDATE_CHECKER_URL'] || '') + '/obsidian-plugin-update-checker';

const releaseApi: ReleaseApi = async (request: NewPluginVersionRequest) => {
    return await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(request),
    }).then((res) => res.json());
};

export default releaseApi;
