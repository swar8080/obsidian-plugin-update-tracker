import dayjs = require('dayjs');
import {
    NewPluginVersionRequest,
    PluginReleases,
    InstalledPluginVersion,
    ReleaseVersion,
    PluginFileAssetIds,
} from '../../../oput-common';
import {
    ReleaseApi,
    ApiReleaseResponse,
    ApiPluginManifest,
    ApiMasterPluginManifestResponse,
} from './ReleaseApi';
import { PluginRepository, PluginRecord } from './PluginRepository';
import { ReleaseRepository, PluginReleasesRecord, MasterManifestInfo } from './ReleaseRepository';
import { isEmpty, isString, groupById, debug } from './util';
import { semverCompare } from '../../../oput-common/semverCompare';

const THIS_PLUGIN_ID = 'obsidian-plugin-update-tracker';

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

        request.currentPluginVersions = (request.currentPluginVersions || [])
            .filter(
                (pluginVersion) =>
                    isString(pluginVersion?.obsidianPluginId) && isString(pluginVersion?.version)
            )
            .map((pluginVersion) => ({
                ...pluginVersion,
                obsidianPluginId: pluginVersion.obsidianPluginId.toLowerCase(),
            }));

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

        //For larger requests, cache for longer to reduce response time
        const releaseCacheLength =
            Math.ceil(pluginIds.length / this.config.pluginCacheLengthDivisor) *
            this.config.releaseCacheLengthMultiplierSeconds;

        let releaseRecordUpdates: PluginReleasesRecord[] = [];
        for (const pluginId of pluginIds) {
            debug(`Processing ${pluginId}`);

            if (this.config.ignoreReleasesForThisPlugin && pluginId === THIS_PLUGIN_ID) {
                //disable surfacing updates for this plugin so that testing can be done before releasing it
                continue;
            }

            const plugin = plugins[pluginId];
            const cachedReleases = cachedReleasesByPluginId[pluginId];
            const installed = installedPluginsById[pluginId];

            try {
                let releasesRecord = await this.fetchReleaseRecords(
                    plugin,
                    cachedReleases,
                    releaseRecordUpdates,
                    releaseCacheLength
                );

                if (this.hasUninstalledVersion(releasesRecord, installed)) {
                    const clientResponse: PluginReleases = this.convertRecordToClientResponse(
                        releasesRecord,
                        plugin,
                        installed
                    );
                    clientResponses.push(clientResponse);
                }

                if (releaseRecordUpdates.length > 50) {
                    await this.trySavingReleases(releaseRecordUpdates);
                    releaseRecordUpdates = [];
                }
            } catch (err) {
                console.error('Error processing releases for', plugin, err);
            }
        }

        await this.trySavingReleases(releaseRecordUpdates);

        return clientResponses;
    }

    private async fetchReleaseRecords(
        plugin: PluginRecord,
        cachedReleases: PluginReleasesRecord | undefined,
        releaseRecordUpdates: PluginReleasesRecord[],
        releaseCacheLength: number
    ): Promise<PluginReleasesRecord> {
        if (cachedReleases != null && !this.hasCacheExpired(cachedReleases, releaseCacheLength)) {
            return cachedReleases;
        }

        debug(`Fetching releases for ${plugin.id}`);
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

        let masterManifestResponse: ApiMasterPluginManifestResponse | null = null;
        try {
            masterManifestResponse = await this.releaseApi.fetchMasterManifest(
                plugin.repo,
                cachedReleases?.masterManifest?.etag
            );
        } catch (err) {
            console.error(`Error fetching master manifest for ${plugin.id}`, err);
        }

        if (!releasesApiResponse.hasChanges || masterManifestResponse?.hasChanges === false) {
            debug(
                `Etag match on ${
                    plugin.id
                }: releases=${!releasesApiResponse.hasChanges}, masterManifest=${
                    masterManifestResponse?.hasChanges === false
                }`
            );
        }

        const releasesRecord = this.convertApiReleasesToRecord(
            plugin,
            releasesApiResponse,
            cachedReleases,
            masterManifestResponse
        );

        const didUpdateManifests = await this.fetchAndApplyManifestUpdates(
            releasesApiResponse,
            releasesRecord,
            cachedReleases
        );

        if (
            releasesApiResponse.hasChanges ||
            masterManifestResponse?.hasChanges ||
            didUpdateManifests
        ) {
            releaseRecordUpdates.push(releasesRecord);
        }

        return releasesRecord;
    }

    private hasCacheExpired(
        cachedReleases: PluginReleasesRecord,
        releaseCacheLength: number
    ): boolean {
        const lastUpdated = dayjs(cachedReleases.lastFetchedFromGithub);
        const secondsSinceUpdate = this.now.diff(lastUpdated, 'seconds');
        return secondsSinceUpdate > releaseCacheLength;
    }

    private convertApiReleasesToRecord(
        plugin: PluginRecord,
        apiReleasesResponse: ApiReleaseResponse,
        cachedReleases: PluginReleasesRecord | undefined,
        masterManifestResponse: ApiMasterPluginManifestResponse | null
    ): PluginReleasesRecord {
        let masterManifestInfo: MasterManifestInfo | undefined = undefined;
        if (masterManifestResponse?.hasChanges) {
            masterManifestInfo = {
                versionNumber: masterManifestResponse.manifest.version,
                etag: masterManifestResponse.etag,
            };
        } else if (cachedReleases != null) {
            masterManifestInfo = cachedReleases.masterManifest;
        }

        if (!apiReleasesResponse.hasChanges) {
            const releasesRecord = cachedReleases as PluginReleasesRecord;
            releasesRecord.masterManifest = masterManifestInfo;
            return releasesRecord;
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

            masterManifest: masterManifestInfo,
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

        const currentManifestsByReleaseId = releasesApiResponse.releases.reduce((prev, current) => {
            const manifestAsset = (current.assets || []).find(
                (asset) => asset.name === 'manifest.json'
            );
            if (manifestAsset?.updated_at) {
                prev[current.id.toString()] = {
                    manifestUpdatedTime: manifestAsset.updated_at,
                    manifestAssetId: manifestAsset.id,
                };
            }
            return prev;
        }, {} as Record<string, { manifestAssetId: number; manifestUpdatedTime: string }>);

        const cachedManifestsByReleaseId = (cachedReleases?.releases || []).reduce(
            (prev, current) => {
                if (current.fileAssetIds?.manifestJson && current.manifestLastUpdatedAt) {
                    prev[current.id.toString()] = {
                        manifestUpdatedTime: current.manifestLastUpdatedAt,
                        manifestAssetId: current.fileAssetIds.manifestJson,
                    };
                }
                return prev;
            },
            {} as Record<string, { manifestAssetId: number; manifestUpdatedTime: string }>
        );

        const manifestAssetIdsToFetch = Object.keys(currentManifestsByReleaseId)
            .filter(
                (releaseId) =>
                    //include if never fetched manifest or manifest has been updated
                    !(releaseId in cachedManifestsByReleaseId) ||
                    currentManifestsByReleaseId[releaseId].manifestUpdatedTime >
                        cachedManifestsByReleaseId[releaseId].manifestUpdatedTime
            )
            .map((releaseId) => currentManifestsByReleaseId[releaseId].manifestAssetId)
            //Take the most recent
            .sort((v1, v2) => -(v1 - v2))
            //Fetch a fixed amount to minimize impact on rate limit
            .slice(0, this.config.maxManifestsToFetchPerPlugin);

        if (manifestAssetIdsToFetch.length === 0) {
            return false;
        }

        debug(
            `Fetching ${manifestAssetIdsToFetch.length} manifests for ${releasesApiResponse.releases[0].id}`
        );

        const manifestRequests = manifestAssetIdsToFetch.map((releaseId) =>
            this.releaseApi.fetchReleaseManifest(releasesToUpdate.pluginRepo, releaseId)
        );

        let manifests: ApiPluginManifest[] = [];
        try {
            manifests = await Promise.all(manifestRequests);
        } catch (err) {
            console.error('Error fetching manifests', manifestRequests, err);
        }

        //update min app version for releases with missing or out-of-date values
        let hasUpdates = false;
        const releaseByVersion = groupById(releasesToUpdate.releases, 'versionNumber');
        for (const manifest of manifests) {
            const release = releaseByVersion[manifest.version || ''];
            if (release && release.minObsidianVersion !== manifest.minAppVersion) {
                release.minObsidianVersion = manifest.minAppVersion;
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

    private async trySavingReleases(releases: PluginReleasesRecord[]) {
        try {
            if (releases.length > 0) {
                await this.pluginReleaseRepository.save(releases);
            }
        } catch (err) {
            console.error('Error saving release record updates', releases, err);
        }
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
                isBetaVersion: this.isBetaVersion(
                    releasesRecord.masterManifest,
                    release.versionNumber
                ),
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

    private isBetaVersion(
        masterManifest: MasterManifestInfo | undefined,
        releaseVersionNumber: string
    ): boolean {
        releaseVersionNumber = releaseVersionNumber.toLowerCase();
        if (releaseVersionNumber.includes('beta') || releaseVersionNumber.includes('alpha')) {
            return true;
        }

        if (masterManifest?.versionNumber == undefined) {
            //not enough info, assume it's not beta
            return false;
        }

        /**
         * Developers can create betas by creating a github release with a version number that is higher than the version in the master/main branch's manifest.json.
         * Obsidian will not download these newer versions because of the mismatch in the version numbers.
         *
         * Greater-than check instead of a not-equal check is needed in-case there are multiple new non-beta versions
         */
        return semverCompare(releaseVersionNumber, masterManifest.versionNumber) > 0;
    }
}

export type GetReleasesConfiguration = {
    releaseCacheLengthMultiplierSeconds: number;
    pluginCacheLengthDivisor: number;
    releasesFetchedPerPlugin: number;
    maxReleaseNoteLength: number;
    maxManifestsToFetchPerPlugin: number;
    ignoreReleasesForThisPlugin: boolean;
};
