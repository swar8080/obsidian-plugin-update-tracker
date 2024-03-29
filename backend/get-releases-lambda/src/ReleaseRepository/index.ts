import { PluginFileAssetIds } from '../../../../oput-common';

export interface ReleaseRepository {
    //Sorted from most to least recent
    getReleases(pluginIds: string[]): Promise<PluginReleasesRecord[]>;
    save(records: PluginReleasesRecord[]): Promise<void>;
}

export type PluginReleasesRecord = {
    pluginId: string;
    pluginRepo: string;

    releases: {
        id: number;
        versionName: string;
        versionNumber: string;
        notes: string;
        areNotesTruncated: boolean;
        downloads: number;
        publishedAt: string;
        sourceCodeUpdatedAt: string;

        fileAssetIds?: PluginFileAssetIds;
        manifestAssetId?: number;
        minObsidianVersion?: string;
        manifestLastUpdatedAt?: string;
    }[];

    masterManifest?: MasterManifestInfo;

    lastFetchedFromGithub: string;
    lastFetchedETag: string;
};

export type MasterManifestInfo = {
    versionNumber?: string;
    etag: string;
};
