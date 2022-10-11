import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import find from 'lodash/find';
import { App, PluginManifest } from 'obsidian';
import { DEFAULT_PLUGIN_SETTINGS, PluginSettings } from '../domain/pluginSettings';
import { updatePlugins } from './actionProducers/updatePlugins';

export type ObsidianApp = App & {
    plugins?: {
        manifests?: Record<string, PluginManifest>;
        enabledPlugins?: Set<string>;
        disablePlugin?: (pluginId: string) => Promise<any>;
        enablePlugin?: (pluginId: string) => Promise<any>;
        loadManifests?: () => Promise<any>;
    };
};

type ObsidianState = {
    pluginManifests: PluginManifest[];
    enabledPlugins?: Record<string, boolean>;
    settings: PluginSettings;
    selectedPluginsById: Record<string, boolean>;
    isUpdatingPlugins: boolean;
    pluginUpdateProgress: PluginUpdateResult[];
    isUpdateResultAcknowledged: boolean;
};

const DEFAULT_STATE: ObsidianState = {
    pluginManifests: [],
    enabledPlugins: undefined,
    settings: DEFAULT_PLUGIN_SETTINGS,
    selectedPluginsById: {},
    isUpdatingPlugins: false,
    pluginUpdateProgress: [],
    isUpdateResultAcknowledged: true,
};

export type PluginUpdateResult = {
    pluginName: string;
    status: PluginUpdateStatus;
};

export type PluginUpdateStatus = 'loading' | 'success' | 'failure';

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
        pluginUpdateStatusChange(state, action: PayloadAction<PluginUpdateResult>) {
            const update = action.payload;

            const existing = find(
                state.pluginUpdateProgress,
                (plugin) => plugin.pluginName === update.pluginName
            );
            if (existing) {
                existing.status = update.status;
            } else {
                state.pluginUpdateProgress.push(update);
            }
        },
        acknowledgePluginUpdateResults(state) {
            state.isUpdateResultAcknowledged = true;
        },
        togglePluginSelection(
            state,
            action: PayloadAction<{ pluginId: string; selected: boolean }>
        ) {
            const { pluginId, selected } = action.payload;
            state.selectedPluginsById[pluginId] = selected;
        },
        toggleSelectAllPlugins(
            state,
            action: PayloadAction<{ select: boolean; pluginIds: string[] }>
        ) {
            const { select, pluginIds } = action.payload;
            state.selectedPluginsById = {};

            if (select) {
                pluginIds.forEach((pluginId) => (state.selectedPluginsById[pluginId] = true));
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(updatePlugins.pending, (state) => {
                state.isUpdatingPlugins = true;
                state.pluginUpdateProgress = [];
                state.isUpdateResultAcknowledged = false;
            })
            .addCase(updatePlugins.fulfilled, (state) => {
                state.isUpdatingPlugins = false;
                state.selectedPluginsById = {};
            })
            .addCase(updatePlugins.rejected, (state) => {
                state.isUpdatingPlugins = false;
                state.selectedPluginsById = {};
            });
    },
});

export const {
    syncSettings,
    syncPluginManifests,
    togglePluginSelection,
    toggleSelectAllPlugins,
    pluginUpdateStatusChange,
    acknowledgePluginUpdateResults,
} = obsidianStateSlice.actions;
export default obsidianStateSlice.reducer;
