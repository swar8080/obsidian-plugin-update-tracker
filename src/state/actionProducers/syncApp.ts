import values from 'lodash/values';
import { App } from 'obsidian';
import { ObsidianApp, syncPluginManifests } from '../obsidianReducer';

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

    return syncPluginManifests({ manifests, enabledPlugins });
};
