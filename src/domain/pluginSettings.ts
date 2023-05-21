export type PluginSettings = {
    daysToSuppressNewUpdates: number;
    dismissedVersionsByPluginId: Record<string, PluginDismissedVersions>;
    excludeBetaVersions: boolean;
    excludeDisabledPlugins: boolean;
    showIconOnMobile: boolean;
    // Deprecated for minUpdateCountToShowIcon
    hideIconIfNoUpdatesAvailable?: boolean;
    minUpdateCountToShowIcon: number;
    hoursBetweenCheckingForUpdates: number;
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
    minUpdateCountToShowIcon: 0,
    hoursBetweenCheckingForUpdates: 0.5,
};
