import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import values from 'lodash/values';
import { App, PluginManifest } from 'obsidian';
import { DEFAULT_PLUGIN_SETTINGS, PluginSettings } from '../domain/pluginSettings';

export type ObsidianApp = App & {
    plugins?: {
        manifests?: Record<string, PluginManifest>;
        enabledPlugins?: Set<string>;
    };
};

type ObsidianState = {
    pluginManifests: PluginManifest[];
    enabledPlugins?: Record<string, boolean>;
    settings: PluginSettings;
};

const DEFAULT_STATE: ObsidianState = {
    pluginManifests: [],
    enabledPlugins: undefined,
    settings: DEFAULT_PLUGIN_SETTINGS,
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
