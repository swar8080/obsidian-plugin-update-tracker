export type PluginSettings = {
    daysToSuppressNewUpdates: number;
    dismissedPublishedDateByPluginId: Record<string, string>;
    dismissedVersionsByPluginId: Record<string, PluginDismissedVersions>;
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
    dismissedPublishedDateByPluginId: {},
    dismissedVersionsByPluginId: {},
};
