export type PluginSettings = {
    daysToSuppressNewUpdates: number;
    dismissedVersionsByPluginId: Record<string, PluginDismissedVersions>;
    excludeBetaVersions: boolean;
    excludeDisabledPlugins: boolean;
    showIconOnMobile: boolean;
    hideIconIfNoUpdatesAvailable: boolean;
};

export type PluginDismissedVersions = {
    pluginId: string;
    pluginRepoPath: string;
    dismissedVersions: DismissedPluginVersion[];
};

export type DismissedPluginVersion = {
    versionNumber: string;
    versionName: string;
    publishedAt: string;
};

export const DEFAULT_PLUGIN_SETTINGS: PluginSettings = {
    daysToSuppressNewUpdates: 0,
    dismissedVersionsByPluginId: {},
    showIconOnMobile: true,
    excludeBetaVersions: true,
    excludeDisabledPlugins: false,
    hideIconIfNoUpdatesAvailable: false,
};
