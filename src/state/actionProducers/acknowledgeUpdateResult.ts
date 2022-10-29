import { createAsyncThunk } from '@reduxjs/toolkit';
import find from 'lodash/find';
import { State } from '..';
import pluginFilter from '../../domain/pluginFilter';
import { PLUGIN_UPDATES_MANAGER_VIEW_TYPE } from '../../main';
import { acknowledgedPluginUpdateResults, ObsidianApp } from '../obsidianReducer';

export const acknowledgeUpdateResult = createAsyncThunk(
    'obsidian/acknowledgeUpdateResult',
    async (_: void, thunkAPI) => {
        const state = thunkAPI.getState() as State;
        const app = window.app as ObsidianApp;

        const didUpdateSelf =
            find(
                state.obsidian.pluginUpdateProgress,
                (updateResult) =>
                    updateResult.pluginId === state.obsidian.thisPluginId &&
                    updateResult.status === 'success'
            ) != null;
        if (didUpdateSelf && app.plugins?.disablePlugin && app.plugins?.enablePlugin) {
            //restart this plugin
            await app.plugins.disablePlugin(state.obsidian.thisPluginId);
            await app.plugins.enablePlugin(state.obsidian.thisPluginId);
            return;
        }

        thunkAPI.dispatch(acknowledgedPluginUpdateResults());

        //Close the view if there's no plugins left to be updated
        const remainingPluginsWithUpdates = pluginFilter(
            {},
            state.obsidian.settings,
            state.obsidian.pluginManifests,
            state.obsidian.enabledPlugins,
            state.releases.releases
        );
        if (remainingPluginsWithUpdates.length === 0) {
            app.workspace.detachLeavesOfType(PLUGIN_UPDATES_MANAGER_VIEW_TYPE);
        }
    }
);
