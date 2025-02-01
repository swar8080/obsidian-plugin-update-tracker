import values from 'lodash/values';
import { App } from 'obsidian';
import { ObsidianApp, syncPluginManifests } from '../obsidianReducer';

export const syncApp = (app: App) => {
    const obsidianApp = app as ObsidianApp;
    const manifests = values(obsidianApp.plugins?.manifests) || [];

    let enabledPlugins: Record<string, boolean> | undefined = undefined;

    if (typeof obsidianApp.plugins?.isEnabled == 'function') {
        // The isEnabled() function checks if the plugin is currently enabled, regardless of whether enablement is persisted.
        // This is needed to work with plugins like lazy-plugin which seems to persist a disabled status and temporarily enable without persisting.
        enabledPlugins = {};
        const pluginIds = manifests.map((manifest) => manifest.id);
        for (let pluginId of pluginIds) {
            enabledPlugins[pluginId] = obsidianApp.plugins.isEnabled(pluginId);
        }
    } else if (obsidianApp.plugins?.enabledPlugins instanceof Set) {
        // Old way of checking enabled plugins, which may be needed for compatibility with older versions of obsidian.
        // This checks plugins saved as enabled, as in their enablement persists between reloads.
        enabledPlugins = {};
        for (let pluginId of obsidianApp.plugins.enabledPlugins) {
            enabledPlugins[pluginId] = true;
        }
    } else {
        console.warn(
            'Unable to determine enabled plugins, obsidian APIs may have changed! Please file a bug report at https://github.com/swar8080/obsidian-plugin-update-tracker.'
        );
    }

    return syncPluginManifests({ manifests, enabledPlugins });
};
