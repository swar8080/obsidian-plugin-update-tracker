import values from 'lodash/values';
import { App } from 'obsidian';
import { ObsidianApp, syncPluginManifests } from '../obsidianReducer';

export const syncApp = (app: App) => {
    const obsidianApp = app as ObsidianApp;
    const manifests = values(obsidianApp.plugins?.manifests) || [];

    let enabledPlugins: Record<string, boolean> | undefined = {};

    const pluginIds = manifests.map((manifest) => manifest.id);
    const persistedAsEnabledSet =
        obsidianApp.plugins?.enabledPlugins instanceof Set
            ? obsidianApp.plugins.enabledPlugins
            : undefined;

    for (let pluginId of pluginIds) {
        const currentlyEnabled = obsidianApp.plugins?.plugins?.[pluginId]?._loaded;
        if (currentlyEnabled != undefined) {
            // This is needed to work with plugins like lazy-plugin which seems to persist a disabled status and temporarily enable without persisting.
            enabledPlugins[pluginId] = currentlyEnabled;
        } else if (persistedAsEnabledSet) {
            // Fallback in case undocumented _loaded API changes
            enabledPlugins[pluginId] = persistedAsEnabledSet.has(pluginId);
        } else {
            console.warn(
                'Unable to determine enabled plugins, obsidian APIs may have changed! Please file a bug report at https://github.com/swar8080/obsidian-plugin-update-tracker.'
            );
        }
    }

    return syncPluginManifests({ manifests, enabledPlugins });
};
