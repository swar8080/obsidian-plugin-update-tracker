export type PluginSettings = {
    daysToSuppressNewUpdates: number;
    dismissedPublishedDateByPluginId: Record<string, string>;
};

export const DEFAULT_PLUGIN_SETTINGS = {
    daysToSuppressNewUpdates: 0,
    dismissedPublishedDateByPluginId: {},
};
