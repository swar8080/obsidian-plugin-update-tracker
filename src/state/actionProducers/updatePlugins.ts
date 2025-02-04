import { createAsyncThunk, ThunkDispatch } from '@reduxjs/toolkit';
import { normalizePath } from 'obsidian';
import { State } from '..';
import { getReleaseAsset } from '../../domain/api';
import InstalledPluginReleases from '../../domain/InstalledPluginReleases';
import { sleep } from '../../domain/util/sleep';
import { githubRateLimit, ObsidianApp, pluginUpdateStatusChange } from '../obsidianReducer';
import { getSelectedPluginIds } from '../selectors/getSelectedPluginIds';
import { syncApp } from './syncApp';

const SIMULATE_UPDATE_PLUGINS = process.env['OBSIDIAN_APP_SIMULATE_UPDATE_PLUGINS'] === 'true';

type Params = {
    visiblePluginVersionsById: Record<string, string>;
};

export const updatePlugins = createAsyncThunk(
    'obsidian/updatePlugins',
    async (params: Params, thunkAPI) => {
        const dispatch = thunkAPI.dispatch;
        const app = window.app as ObsidianApp;

        // Update cached values that may be stale before retrieving state
        await dispatch(syncApp(app));
        const state = thunkAPI.getState() as State;

        const allPlugins = InstalledPluginReleases.create(
            state.obsidian.pluginManifests,
            state.releases.releases
        );
        const allPluginsById = allPlugins.reduce((combined, plugin) => {
            combined[plugin.getPluginId()] = plugin;
            return combined;
        }, {} as Record<string, InstalledPluginReleases>);

        const selectedPluginIds = getSelectedPluginIds(state);

        let isRateLimited = false;
        for (const pluginId of selectedPluginIds) {
            const installedPlugin = allPluginsById[pluginId];
            const versionToInstall = params.visiblePluginVersionsById[pluginId];
            const versionReleastAssetIds =
                installedPlugin.getReleaseAssetIdsForVersion(versionToInstall);
            const pluginRepoPath = installedPlugin.getRepoPath();
            const isPluginEnabled =
                state.obsidian.enabledPlugins != null && state.obsidian.enabledPlugins[pluginId];
            const isUpdatingThisPlugin = pluginId === state.obsidian.thisPluginId;

            let success: boolean;
            let didDisable = false;
            try {
                dispatch(
                    pluginUpdateStatusChange({
                        pluginId,
                        pluginName: installedPlugin.getPluginName(),
                        status: 'loading',
                    })
                );

                //Just to be safe, since these are undocumented apis
                if (
                    !app.plugins?.disablePlugin ||
                    !app.plugins?.enablePlugin ||
                    !app.plugins?.loadManifests
                ) {
                    throw new Error('missing obsidian api');
                }
                if (!versionReleastAssetIds?.mainJs || !versionReleastAssetIds?.manifestJson) {
                    throw new Error('missing asset ids');
                }
                if (!pluginRepoPath) {
                    throw new Error('missing github repository path');
                }

                if (isRateLimited) {
                    success = false;
                } else if (!SIMULATE_UPDATE_PLUGINS) {
                    //download and install seperately to reduce the chances of only some of the new files being written to disk
                    const [mainJs, manifestJson, styleCss] = await Promise.all([
                        downloadPluginFile(versionReleastAssetIds.mainJs, pluginRepoPath, dispatch),
                        downloadPluginFile(
                            versionReleastAssetIds.manifestJson,
                            pluginRepoPath,
                            dispatch
                        ),
                        downloadPluginFile(
                            versionReleastAssetIds.styleCss,
                            pluginRepoPath,
                            dispatch
                        ),
                    ]);

                    if (!isUpdatingThisPlugin) {
                        // Wait for any other queued/in-progress reloads to finish, based on https://github.com/pjeby/hot-reload/blob/master/main.js
                        await app.plugins.disablePlugin(pluginId);
                        didDisable = true;
                    }

                    await Promise.all([
                        installPluginFile(pluginId, 'main.js', mainJs),
                        installManifestFile(
                            pluginId,
                            'manifest.json',
                            manifestJson,
                            versionToInstall
                        ),
                        installPluginFile(pluginId, 'styles.css', styleCss),
                    ]);
                    success = true;
                } else {
                    await sleep(Math.random() * 5000);
                    success = Math.random() > 0.2;
                }

                //thanks https://github.com/TfTHacker/obsidian42-brat/blob/main/src/features/BetaPlugins.ts
                await app.plugins.loadManifests();
                if (isPluginEnabled && didDisable) {
                    await app.plugins.enablePlugin(pluginId);
                }
            } catch (err) {
                console.error('Error updating ' + pluginId, err);
                success = false;

                if (err instanceof GithubRateLimitError) {
                    isRateLimited = true;
                }

                if (isPluginEnabled && didDisable && app.plugins?.enablePlugin) {
                    await app.plugins.enablePlugin(pluginId);
                }
            }

            dispatch(
                pluginUpdateStatusChange({
                    pluginId,
                    pluginName: installedPlugin.getPluginName(),
                    status: success ? 'success' : 'failure',
                })
            );
        }

        //update snapshot of plugin manifests which also will filter out the plugins that are now up-to-date
        dispatch(syncApp(app));
    }
);

async function downloadPluginFile(
    assetId: number | undefined,
    gitRepoPath: string,
    dispatch: ThunkDispatch<any, any, any>
): Promise<string> {
    if (!assetId) {
        return '';
    }
    const result = await getReleaseAsset(assetId, gitRepoPath);

    if (result.success) {
        return result.fileContents || '';
    }

    if (result.rateLimitResetTimestamp) {
        dispatch(githubRateLimit(result.rateLimitResetTimestamp));
        throw new GithubRateLimitError();
    }
    throw new Error('Unexpected error fetching file ' + assetId);
}

class GithubRateLimitError extends Error {}

async function installManifestFile(
    pluginId: string,
    fileName: string,
    fileContents: string,
    versionNumber: string
) {
    /**
     * Do not trust the version number in the downloaded manifest file as some beta releases (installed using something like BART) use a previous version number.
     * Instead, use the github version number.
     * An example is periodic-notes version 1.0.0-beta.3 that uses version 0.0.17 in its manifest.
     */
    const manifestJson = JSON.parse(fileContents);
    let contents = fileContents;
    // only update the manifest.json if changes need to be made
    if (manifestJson.version !== versionNumber) {
        manifestJson.version = versionNumber;
        contents = JSON.stringify(manifestJson, null, '\t');
    }
    await installPluginFile(pluginId, fileName, contents);
}

async function installPluginFile(pluginId: string, fileName: string, fileContents: string) {
    const configDir = normalizePath(app.vault.configDir);
    const filePath = `${configDir}/plugins/${pluginId}/${fileName}`;
    await app.vault.adapter.write(filePath, fileContents);
}
