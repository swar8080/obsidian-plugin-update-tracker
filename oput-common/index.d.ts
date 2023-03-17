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
    pluginRepoPath: string;
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
    isBetaVersion: boolean;
    publishedAt: string;
    fileAssetIds?: PluginFileAssetIds;
    updatedAt: string;
};

export type PluginFileAssetIds = {
    mainJs: number;
    manifestJson: number;
    styleCss?: number;
};
