import { AppThunk } from '..';
import pluginFilter from '../../domain/pluginFilter';
import { PLUGIN_UPDATES_MANAGER_VIEW_TYPE } from '../../main';
import { acknowledgedPluginUpdateResults } from '../obsidianReducer';

export const acknowledgeUpdateResult = (): AppThunk => (dispatch, getState) => {
    dispatch(acknowledgedPluginUpdateResults());

    //Close the view if there's no plugins left to be updated
    const state = getState();
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
};
