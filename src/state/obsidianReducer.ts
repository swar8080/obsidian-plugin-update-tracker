import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import values from 'lodash/values';
import { App, normalizePath, PluginManifest } from 'obsidian';
import { State } from '.';
import { getReleaseAsset } from '../domain/api';
import InstalledPluginReleases from '../domain/InstalledPluginReleases';
import { DEFAULT_PLUGIN_SETTINGS, PluginSettings } from '../domain/pluginSettings';

export type ObsidianApp = App & {
    plugins?: {
        manifests?: Record<string, PluginManifest>;
        enabledPlugins?: Set<string>;
        disablePlugin?: (pluginId: string) => Promise<any>;
        enablePlugin?: (pluginId: string) => Promise<any>;
    };
};

type ObsidianState = {
    pluginManifests: PluginManifest[];
    enabledPlugins?: Record<string, boolean>;
    settings: PluginSettings;
    isUpdatingPlugins: boolean;
    pluginUpdateProgress: PluginUpdateResult[];
};

const DEFAULT_STATE: ObsidianState = {
    pluginManifests: [],
    enabledPlugins: undefined,
    settings: DEFAULT_PLUGIN_SETTINGS,
    isUpdatingPlugins: false,
    pluginUpdateProgress: [],
};

export const updatePlugins = createAsyncThunk(
    'obsidian/updatePlugins',
    async (pluginIds: string[], thunkAPI) => {
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

        for (const pluginId of pluginIds) {
            const installedPlugin = allPluginsById[pluginId];
            const latestReleaseAssetIds = installedPlugin.getLatestReleaseAssetIds();
            const pluginRepoPath = installedPlugin.getRepoPath();
            const isPluginEnabled =
                state.obsidian.enabledPlugins != null && pluginId in state.obsidian.enabledPlugins;

            let success: boolean;
            try {
                //Just to be safe, since these are undocumented apis
                if (!app.plugins?.disablePlugin || !app.plugins?.enablePlugin) {
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

                //download and install seperately to reduce the chances of only some of the new files being written to disk
                const [mainJs, manifestJson, styleCss] = await Promise.all([
                    downloadPluginFile(latestReleaseAssetIds.mainJs, pluginRepoPath),
                    downloadPluginFile(latestReleaseAssetIds.manifestJson, pluginRepoPath),
                    downloadPluginFile(latestReleaseAssetIds.styleCss, pluginRepoPath),
                ]);
                await Promise.all([
                    installPluginFile(pluginId, 'main.js', mainJs),
                    installPluginFile(pluginId, 'manifest.json', manifestJson),
                    installPluginFile(pluginId, 'styles.css', styleCss),
                ]);

                if (isPluginEnabled) {
                    await app.plugins.enablePlugin(pluginId);
                }

                success = true;
            } catch (err) {
                //this could happen if hitting the public github api rate limit of 60 requests/hour per ip
                console.warn('Error updating ' + pluginId, err);
                success = false;
            }

            const updateResult: PluginUpdateResult = {
                success,
                pluginName: installedPlugin.getPluginName(),
            };
            dispatch({ type: 'obsidian/pluginUpdateFinished', payload: updateResult });
        }

        //update snapshot of plugin manifests which also will filter out the plugins that are now up-to-date
        dispatch(syncApp(app));
    }
);

async function downloadPluginFile(
    assetId: number | undefined,
    gitRepoPath: string
): Promise<string> {
    if (!assetId) {
        return '';
    }
    return await getReleaseAsset(assetId, gitRepoPath);
}

async function installPluginFile(pluginId: string, fileName: string, fileContents: string) {
    const configDir = normalizePath(app.vault.configDir);
    const filePath = `${configDir}/plugins/${pluginId}/${fileName}`;
    await app.vault.adapter.write(filePath, fileContents);
}

export type PluginUpdateResult = {
    pluginName: string;
    success: boolean;
};

const obsidianStateSlice = createSlice({
    name: 'obsidian',
    initialState: DEFAULT_STATE,
    reducers: {
        syncPluginManifests(
            state,
            action: PayloadAction<{
                manifests: PluginManifest[];
                enabledPlugins?: Record<string, boolean>;
            }>
        ) {
            state.pluginManifests = action.payload.manifests;
            state.enabledPlugins = action.payload.enabledPlugins;
        },
        syncSettings(state, action: PayloadAction<PluginSettings>) {
            state.settings = action.payload;
        },
        pluginUpdateFinished(state, action: PayloadAction<PluginUpdateResult>) {
            state.pluginUpdateProgress.push(action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(updatePlugins.pending, (state) => {
                state.isUpdatingPlugins = true;
                state.pluginUpdateProgress = [];
            })
            .addCase(updatePlugins.fulfilled, (state) => {
                state.isUpdatingPlugins = false;
            })
            .addCase(updatePlugins.rejected, (state) => {
                state.isUpdatingPlugins = false;
            });
    },
});

export const syncApp = (app: App) => {
    const obsidianApp = app as ObsidianApp;
    const manifests = values(obsidianApp.plugins?.manifests) || [];

    let enabledPlugins: Record<string, boolean> | undefined = undefined;
    if (obsidianApp.plugins?.enabledPlugins instanceof Set) {
        enabledPlugins = {};
        for (let pluginId of obsidianApp.plugins.enabledPlugins) {
            enabledPlugins[pluginId] = true;
        }
    }

    return obsidianStateSlice.actions.syncPluginManifests({ manifests, enabledPlugins });
};

export const { syncSettings } = obsidianStateSlice.actions;
export default obsidianStateSlice.reducer;
