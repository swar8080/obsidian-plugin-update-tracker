import { PluginFileAssetIds } from '../../../../shared-types';

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
        minObsidianVersion?: string;
        manifestVersionId?: string;
        manifestLastUpdatedAt?: string;
    }[];

    lastFetchedFromGithub: string;
    lastFetchedETag: string;
};
