import { createAsyncThunk, ThunkDispatch } from '@reduxjs/toolkit';
import { normalizePath } from 'obsidian';
import { State } from '..';
import { getReleaseAsset } from '../../domain/api';
import InstalledPluginReleases from '../../domain/InstalledPluginReleases';
import { sleep } from '../../domain/util/sleep';
import { githubRateLimit, ObsidianApp, pluginUpdateStatusChange } from '../obsidianReducer';
import { syncApp } from './syncApp';

const SIMULATE_UPDATE_PLUGINS = process.env['OBSIDIAN_APP_SIMULATE_UPDATE_PLUGINS'] === 'true';

export const updatePlugins = createAsyncThunk(
    'obsidian/updatePlugins',
    async (_: void, thunkAPI) => {
        const state = thunkAPI.getState() as State;
        const dispatch = thunkAPI.dispatch;
        const app = window.app as ObsidianApp;

        const allPlugins = InstalledPluginReleases.create(
            state.obsidian.pluginManifests,
            state.releases.releases
        );
        const allPluginsById = allPlugins.reduce((combined, plugin) => {
            combined[plugin.getPluginId()] = plugin;
            return combined;
        }, {} as Record<string, InstalledPluginReleases>);

        const selectedPluginIds = Object.keys(state.obsidian.selectedPluginsById).filter(
            (pluginId) => state.obsidian.selectedPluginsById[pluginId]
        );

        for (const pluginId of selectedPluginIds) {
            const installedPlugin = allPluginsById[pluginId];
            const latestReleaseAssetIds = installedPlugin.getLatestReleaseAssetIds();
            const pluginRepoPath = installedPlugin.getRepoPath();
            const isPluginEnabled =
                state.obsidian.enabledPlugins != null && pluginId in state.obsidian.enabledPlugins;

            let success: boolean;
            let didDisable = false;
            try {
                dispatch(
                    pluginUpdateStatusChange({
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
                    success = false;
                    continue;
                }
                if (!latestReleaseAssetIds?.mainJs || !latestReleaseAssetIds?.manifestJson) {
                    success = false;
                    continue;
                }
                if (!pluginRepoPath) {
                    success = false;
                    continue;
                }

                // Wait for any other queued/in-progress reloads to finish, based on https://github.com/pjeby/hot-reload/blob/master/main.js
                await app.plugins.disablePlugin(pluginId);
                didDisable = true;

                if (!SIMULATE_UPDATE_PLUGINS) {
                    //download and install seperately to reduce the chances of only some of the new files being written to disk
                    const [mainJs, manifestJson, styleCss] = await Promise.all([
                        downloadPluginFile(latestReleaseAssetIds.mainJs, pluginRepoPath, dispatch),
                        downloadPluginFile(
                            latestReleaseAssetIds.manifestJson,
                            pluginRepoPath,
                            dispatch
                        ),
                        downloadPluginFile(
                            latestReleaseAssetIds.styleCss,
                            pluginRepoPath,
                            dispatch
                        ),
                    ]);
                    await Promise.all([
                        installPluginFile(pluginId, 'main.js', mainJs),
                        installPluginFile(pluginId, 'manifest.json', manifestJson),
                        installPluginFile(pluginId, 'styles.css', styleCss),
                    ]);
                    success = true;
                } else {
                    await sleep(Math.random() * 5000);
                    success = Math.random() > 0.2;
                }

                //thanks https://github.com/TfTHacker/obsidian42-brat/blob/main/src/features/BetaPlugins.ts
                await app.plugins.loadManifests();
                if (isPluginEnabled) {
                    await app.plugins.enablePlugin(pluginId);
                }
            } catch (err) {
                //this could happen if hitting the public github api rate limit of 60 requests/hour per ip
                console.warn('Error updating ' + pluginId, err);
                success = false;

                if (isPluginEnabled && didDisable && app.plugins?.enablePlugin) {
                    app.plugins.enablePlugin(pluginId);
                }
            }

            dispatch(
                pluginUpdateStatusChange({
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
    }
    throw new Error('Rate limit error fetching file ' + assetId);
}

async function installPluginFile(pluginId: string, fileName: string, fileContents: string) {
    const configDir = normalizePath(app.vault.configDir);
    const filePath = `${configDir}/plugins/${pluginId}/${fileName}`;
    await app.vault.adapter.write(filePath, fileContents);
}
