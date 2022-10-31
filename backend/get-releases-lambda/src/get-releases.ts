import dayjs = require('dayjs');
import {
    NewPluginVersionRequest,
    PluginReleases,
    InstalledPluginVersion,
    ReleaseVersion,
    PluginFileAssetIds,
} from '../../../shared-types';
import { ReleaseApi, ApiReleaseResponse, ApiPluginManifest } from './ReleaseApi';
import { PluginRepository, PluginRecord } from './PluginRepository';
import { ReleaseRepository, PluginReleasesRecord } from './ReleaseRepository';
import { isEmpty, groupById } from './util';

export class GetReleases {
    private config: GetReleasesConfiguration;
    private pluginRepository: PluginRepository;
    private pluginReleaseRepository: ReleaseRepository;
    private releaseApi: ReleaseApi;
    private now: dayjs.Dayjs;

    public constructor(
        config: GetReleasesConfiguration,
        pluginRepository: PluginRepository,
        pluginReleaseRepository: ReleaseRepository,
        releaseApi: ReleaseApi
    ) {
        this.config = config;
        this.pluginRepository = pluginRepository;
        this.pluginReleaseRepository = pluginReleaseRepository;
        this.releaseApi = releaseApi;
        this.now = dayjs();
    }

    public async execute(
        request: NewPluginVersionRequest,
        now = dayjs()
    ): Promise<PluginReleases[]> {
        this.now = now;
        const clientResponses: PluginReleases[] = [];

        request.currentPluginVersions = (request.currentPluginVersions || []).map(
            (pluginVersion) => ({
                ...pluginVersion,
                obsidianPluginId: pluginVersion.obsidianPluginId.toLowerCase(),
            })
        );

        const installedPluginsById: Record<string, InstalledPluginVersion> = groupById(
            request.currentPluginVersions,
            'obsidianPluginId'
        );

        let requestedPluginIds = Object.keys(installedPluginsById);
        const plugins: Record<string, PluginRecord> = await this.pluginRepository.getPluginsById(
            requestedPluginIds
        );
        const pluginIds = Object.keys(plugins);

        if (isEmpty(pluginIds)) {
            console.log('No plugin records exist for ', request.currentPluginVersions);
            return clientResponses;
        }

        const cachedReleasesByPluginId: Record<string, PluginReleasesRecord> =
            await this.getCachedReleases(pluginIds);

        const releaseRecordUpdates: PluginReleasesRecord[] = [];
        for (const pluginId of pluginIds) {
            console.log(`Processing ${pluginId}`);
            const plugin = plugins[pluginId];
            const cachedReleases = cachedReleasesByPluginId[pluginId];
            const installed = installedPluginsById[pluginId];

            try {
                let releasesRecord = await this.fetchReleaseRecords(
                    plugin,
                    cachedReleases,
                    releaseRecordUpdates
                );

                if (this.hasUninstalledVersion(releasesRecord, installed)) {
                    const clientResponse: PluginReleases = this.convertRecordToClientResponse(
                        releasesRecord,
                        plugin,
                        installed
                    );
                    clientResponses.push(clientResponse);
                }
            } catch (err) {
                console.error('Error updating releases for', plugin, err);
            }
        }

        try {
            if (releaseRecordUpdates.length > 0) {
                await this.pluginReleaseRepository.save(releaseRecordUpdates);
            }
        } catch (err) {
            console.error('Error saving release record updates', releaseRecordUpdates, err);
        }

        return clientResponses;
    }

    private async fetchReleaseRecords(
        plugin: PluginRecord,
        cachedReleases: PluginReleasesRecord | undefined,
        releaseRecordUpdates: PluginReleasesRecord[]
    ): Promise<PluginReleasesRecord> {
        if (cachedReleases != null && !this.hasCacheExpired(cachedReleases)) {
            return cachedReleases;
        }

        console.log(`Fetching releases for ${plugin.id}`);
        let releasesApiResponse: ApiReleaseResponse;
        try {
            releasesApiResponse = await this.releaseApi.fetchReleases(
                plugin.repo,
                this.config.releasesFetchedPerPlugin,
                cachedReleases?.lastFetchedETag
            );
        } catch (err) {
            if (cachedReleases != null) {
                console.error(
                    `Error fetching releases for ${plugin.id}, falling back to cached value`,
                    err
                );
                return cachedReleases;
            }
            console.error(`Error fetching releases for ${plugin.id}, no cached values exist`, err);
            throw err;
        }

        if (!releasesApiResponse.hasChanges) {
            //no changes means we have an etag, so cachedReleases is defined
            return cachedReleases as PluginReleasesRecord;
        }

        const releasesRecord = this.convertApiReleasesToRecord(
            plugin,
            releasesApiResponse,
            cachedReleases
        );

        const didUpdateManifests = await this.fetchAndApplyManifestUpdates(
            releasesApiResponse,
            releasesRecord,
            cachedReleases
        );

        //Exclude beta releases that re-use a previous plugin version (for now)
        releasesRecord.releases = releasesRecord.releases.filter(
            (release) =>
                release.versionNumber === release.manifestVersionId || !release.manifestVersionId
        );

        if (releasesApiResponse.hasChanges || didUpdateManifests) {
            releaseRecordUpdates.push(releasesRecord);
        }

        return releasesRecord;
    }

    private hasCacheExpired(cachedReleases: PluginReleasesRecord): boolean {
        const lastUpdated = dayjs(cachedReleases.lastFetchedFromGithub);
        const secondsSinceUpdate = this.now.diff(lastUpdated, 'seconds');
        return secondsSinceUpdate > this.config.releasesCacheLengthSeconds;
    }

    private convertApiReleasesToRecord(
        plugin: PluginRecord,
        apiReleasesResponse: ApiReleaseResponse,
        cachedReleases?: PluginReleasesRecord | undefined
    ): PluginReleasesRecord {
        if (!apiReleasesResponse.hasChanges) {
            return cachedReleases as PluginReleasesRecord;
        }

        return {
            pluginId: plugin.id,
            pluginRepo: plugin.repo,

            releases: apiReleasesResponse.releases
                .sort((r1, r2) => -r1.published_at.localeCompare(r2.published_at)) //sort most recent first
                .map((release) => {
                    const fullReleaseNotes = release.body || '';
                    const truncatedReleaseNotes = fullReleaseNotes.substring(
                        0,
                        this.config.maxReleaseNoteLength - 1
                    );
                    const areNotesTruncated =
                        fullReleaseNotes.length > this.config.maxReleaseNoteLength;

                    const manifestJsonAsset = (release.assets || []).find(
                        (asset) => asset.name === 'manifest.json'
                    );
                    const mainJsAsset = (release.assets || []).find(
                        (asset) => asset.name === 'main.js'
                    );
                    const styleCssAsset = (release.assets || []).find(
                        (asset) => asset.name === 'styles.css'
                    );

                    const cachedRelease = (cachedReleases?.releases || []).find(
                        (cached) => cached.id === release.id
                    );

                    let fileAssetIds: PluginFileAssetIds | undefined = undefined;
                    if (manifestJsonAsset && mainJsAsset) {
                        fileAssetIds = {
                            manifestJson: manifestJsonAsset.id,
                            mainJs: mainJsAsset.id,
                            styleCss: styleCssAsset?.id,
                        };
                    }

                    return {
                        id: release.id,
                        versionName: release.name,
                        versionNumber: release.tag_name,
                        notes: truncatedReleaseNotes,
                        areNotesTruncated,
                        downloads: mainJsAsset?.download_count || 0,
                        publishedAt: release.published_at,
                        sourceCodeUpdatedAt: mainJsAsset?.updated_at || release.published_at,
                        fileAssetIds,
                        minObsidianVersion: cachedRelease?.minObsidianVersion,
                        manifestLastUpdatedAt: manifestJsonAsset?.updated_at,
                    };
                }),

            lastFetchedFromGithub: this.now.format(),
            lastFetchedETag: apiReleasesResponse.etag,
        };
    }

    private async fetchAndApplyManifestUpdates(
        releasesApiResponse: ApiReleaseResponse,
        releasesToUpdate: PluginReleasesRecord,
        cachedReleases: PluginReleasesRecord | undefined = undefined
    ): Promise<boolean> {
        if (!releasesApiResponse.hasChanges) {
            return false;
        }

        const fetchedManifestsByAssetId = releasesApiResponse.releases.reduce((prev, release) => {
            const manifestAsset = (release.assets || []).find(
                (asset) => asset.name === 'manifest.json'
            );
            if (manifestAsset?.updated_at) {
                prev[manifestAsset.id.toString()] = {
                    manifestUpdatedTime: manifestAsset.updated_at,
                    releaseId: release.id,
                };
            }
            return prev;
        }, {} as Record<string, { manifestUpdatedTime: string; releaseId: number }>);

        const cachedManifestsByAssetId = (cachedReleases?.releases || []).reduce(
            (prev, current) => {
                if (current.fileAssetIds?.manifestJson && current.manifestLastUpdatedAt) {
                    prev[current.fileAssetIds.manifestJson.toString()] = {
                        manifestUpdatedTime: current.manifestLastUpdatedAt,
                    };
                }
                return prev;
            },
            {} as Record<string, { manifestUpdatedTime: string }>
        );

        const manifestAssetIdsToFetch = Object.keys(fetchedManifestsByAssetId)
            .filter(
                (assetId) =>
                    //include if never fetched manifest or manifest has been updated
                    !(assetId in cachedManifestsByAssetId) ||
                    fetchedManifestsByAssetId[assetId].manifestUpdatedTime >
                        cachedManifestsByAssetId[assetId].manifestUpdatedTime
            )
            .map((assetId) => parseInt(assetId))
            //Take the most recent
            .sort((v1, v2) => -(v1 - v2))
            //Fetch a fixed amount to minimize impact on rate limit
            .slice(0, this.config.maxManifestsToFetchPerPlugin);

        if (manifestAssetIdsToFetch.length === 0) {
            return false;
        }

        console.log(
            `Fetching ${manifestAssetIdsToFetch.length} manifests for ${releasesApiResponse.releases[0].id}`
        );

        const manifestRequests = manifestAssetIdsToFetch.map((releaseId) =>
            this.releaseApi.fetchManifest(releasesToUpdate.pluginRepo, releaseId)
        );

        let manifests: ApiPluginManifest[] = [];
        try {
            manifests = await Promise.all(manifestRequests);
        } catch (err) {
            console.error('Error fetching manifests', manifestRequests, err);
        }

        //update releases with missing or out-of-date values
        let hasUpdates = false;

        const releasesToUpdateById = groupById(releasesToUpdate.releases, 'id');
        for (let i = 0; i < manifestAssetIdsToFetch.length; i++) {
            const manifestAssetId = manifestAssetIdsToFetch[i];
            const manifest = manifests[i];

            const fetchedReleaseManifest = fetchedManifestsByAssetId[manifestAssetId];
            const release = releasesToUpdateById[fetchedReleaseManifest.releaseId];

            if (
                release &&
                (release.minObsidianVersion !== manifest.minAppVersion ||
                    release.manifestVersionId !== manifest.version)
            ) {
                release.minObsidianVersion = manifest.minAppVersion;
                release.manifestVersionId = manifest.version;
                hasUpdates = true;
            }
        }

        return hasUpdates;
    }

    private async getCachedReleases(
        pluginIds: string[]
    ): Promise<Record<string, PluginReleasesRecord>> {
        const pluginReleaseRecords = await this.pluginReleaseRepository.getReleases(pluginIds);
        return groupById(pluginReleaseRecords, 'pluginId');
    }

    private hasUninstalledVersion(
        releasesRecord: PluginReleasesRecord,
        installed: InstalledPluginVersion
    ) {
        const installedReleaseCreationTime = this.getInstalledReleaseCreationTime(
            releasesRecord,
            installed
        );
        const newerRelease = releasesRecord.releases.find((release) =>
            dayjs(release.publishedAt).isAfter(installedReleaseCreationTime)
        );

        return newerRelease != null;
    }

    private convertRecordToClientResponse(
        releasesRecord: PluginReleasesRecord,
        plugin: PluginRecord,
        installed: InstalledPluginVersion
    ): PluginReleases {
        const pluginRepositoryUrl = `https://github.com/${plugin.repo}`;

        const installedReleaseCreationTime = this.getInstalledReleaseCreationTime(
            releasesRecord,
            installed
        );
        const clientReleaseVersions: ReleaseVersion[] = releasesRecord.releases
            .filter((release) => dayjs(release.publishedAt).isAfter(installedReleaseCreationTime))
            .map((release) => ({
                releaseId: release.id,
                versionName: release.versionName,
                versionNumber: release.versionNumber,
                minObsidianAppVersion: release.minObsidianVersion,
                notes: release.notes,
                areNotesTruncated: release.areNotesTruncated,
                downloads: release.downloads,
                fileAssetIds: release.fileAssetIds,
                publishedAt: release.publishedAt,
                updatedAt: release.sourceCodeUpdatedAt,
            }));

        return {
            obsidianPluginId: releasesRecord.pluginId,
            pluginName: plugin.name,
            pluginRepositoryUrl,
            pluginRepoPath: plugin.repo,
            newVersions: clientReleaseVersions,
        };
    }

    private getInstalledReleaseCreationTime(
        releasesRecord: PluginReleasesRecord,
        installed: InstalledPluginVersion
    ) {
        const installedRelease = releasesRecord.releases.find(
            (release) => release.versionNumber === installed.version
        );
        return dayjs(installedRelease?.publishedAt || 0);
    }
}

export type GetReleasesConfiguration = {
    releasesCacheLengthSeconds: number;
    releasesFetchedPerPlugin: number;
    maxReleaseNoteLength: number;
    maxManifestsToFetchPerPlugin: number;
};
