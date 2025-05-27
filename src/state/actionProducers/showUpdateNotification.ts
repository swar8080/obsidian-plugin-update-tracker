import PluginUpdateCheckerPlugin from 'src/main';
import { store } from '..';
import { ObsidianApp } from '../obsidianReducer';
import { fetchReleases } from './fetchReleases';

export const showUpdateNotificationMiddleware = () => (next: any) => (action: any) => {
    const result = next(action);

    if (action.type === fetchReleases.fulfilled.type) {
        const state = store.getState();
        const thisPluginId = state.obsidian.thisPluginId;

        const app = window.app as ObsidianApp;
        const plugin = app.plugins?.plugins?.[thisPluginId] as PluginUpdateCheckerPlugin;

        if (plugin) {
            // Bind the method to preserve the this context
            plugin.showNotificationOnNewUpdate.bind(plugin)();
        }
    }

    return result;
};
