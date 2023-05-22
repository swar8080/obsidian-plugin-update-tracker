import { DEFAULT_PLUGIN_SETTINGS, PluginSettings } from './pluginSettings';

export default function initiateSettings(savedSettings: Partial<PluginSettings>): PluginSettings {
    const migratedSettings: Partial<PluginSettings> = {};

    if (
        savedSettings.hideIconIfNoUpdatesAvailable !== undefined &&
        savedSettings.minUpdateCountToShowIcon === undefined
    ) {
        migratedSettings.minUpdateCountToShowIcon = savedSettings.hideIconIfNoUpdatesAvailable
            ? 1
            : 0;
    }

    return Object.assign({}, DEFAULT_PLUGIN_SETTINGS, savedSettings, migratedSettings);
}
