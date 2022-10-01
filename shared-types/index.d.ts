export type NewPluginVersionRequest = {
    currentPluginVersions: InstalledPluginVersion[];
};

export type InstalledPluginVersion = {
    obsidianPluginId: string;
    version: string;
};

export type PluginReleases = {
    obsidianPluginId: string;
    pluginName: string;
    pluginRepositoryUrl: string;
    newVersions: ReleaseVersion[];
};

type ReleaseVersion = {
    releaseId: number;
    versionName: string;
    versionNumber: string;
    minObsidianAppVersion?: string;
    notes: string;
    areNotesTruncated: boolean;
    downloads: number;
    publishedAt: string;
    updatedAt: string;
};
