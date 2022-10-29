import dayjs = require('dayjs');
import {
    InstalledPluginVersion,
    NewPluginVersionRequest,
    PluginReleases,
} from '../../../shared-types';
import { GetReleases, GetReleasesConfiguration } from './get-releases';
import { PluginRecord, PluginRepository } from './PluginRepository';
import { ApiReleases, ReleaseApi } from './ReleaseApi';
import { PluginReleasesRecord, ReleaseRepository } from './ReleaseRepository';

const PLUGIN_REQUEST_BASE: InstalledPluginVersion = { obsidianPluginId: '', version: '' };

const PLUGIN_1_ID_REQUESTED = 'PLUGIN_1_ID';
const PLUGIN_1_ID = 'plugin_1_id';
const PLUGIN_1_INSTALLED_VERSION = '1.2.3';
const PLUGIN_1_REQUEST: InstalledPluginVersion = {
    ...PLUGIN_REQUEST_BASE,
    obsidianPluginId: PLUGIN_1_ID_REQUESTED,
    version: PLUGIN_1_INSTALLED_VERSION,
};
const PLUGIN_1_REPO = 'author1/plugin1';
const PLUGIN_1_RECORD: PluginRecord = { id: PLUGIN_1_ID, repo: PLUGIN_1_REPO, name: 'Plugin 1' };
const PLUGIN_1_NEW_VERSION_NUM = '1.2.4';

const PLUGIN_2_ID_REQUESTED = 'PLUGIN_2_ID';
const PLUGIN_2_ID = 'plugin_2_id';
const PLUGIN_2_INSTALLED_VERSION = '3.4.5';
const PLUGIN_2_REPO = 'author2/plugin2';
const PLUGIN_2_REQUEST: InstalledPluginVersion = {
    ...PLUGIN_REQUEST_BASE,
    obsidianPluginId: PLUGIN_2_ID_REQUESTED,
    version: PLUGIN_2_INSTALLED_VERSION,
};
const PLUGIN_2_RECORD: PluginRecord = { id: PLUGIN_2_ID, repo: PLUGIN_2_REPO, name: 'Plugin 2' };

const UNKNOWN_PLUGIN_ID = 'unknown';
const UNKNOWN_PLUGIN_REQUEST: InstalledPluginVersion = {
    ...PLUGIN_REQUEST_BASE,
    obsidianPluginId: UNKNOWN_PLUGIN_ID.toUpperCase(),
};

const now = dayjs('2022-09-30T18:44:09-04:00');

let id = 1000;

describe('get-releases', () => {
    let getReleases: GetReleases;
    let config: GetReleasesConfiguration;
    let pluginRepository: PluginRepository;
    let releaseRepository: ReleaseRepository;
    let releaseApi: ReleaseApi;

    let request: NewPluginVersionRequest;
    let result: PluginReleases[];

    beforeEach(() => {
        config = {
            releasesFetchedPerPlugin: 2,
            maxReleaseNoteLength: 100,
            releasesCacheLengthSeconds: 10,
            maxManifestsToFetchPerPlugin: 2,
        };

        pluginRepository = {
            getPluginsById: jest.fn(),
        };
        releaseRepository = {
            getReleases: jest.fn(),
            save: jest.fn(),
        };
        releaseApi = {
            fetchReleases: jest.fn(),
            fetchManifest: jest.fn(),
        };

        getReleases = new GetReleases(config, pluginRepository, releaseRepository, releaseApi);
    });

    let plugin1FirstRelease: ApiReleases;
    const PLUGIN1_RELEASE_1_MAIN_JS_ID = id++;
    const PLUGIN1_RELEASE1_MANIFEST_ID = id++;
    let plugin1SecondRelease: ApiReleases;
    const PLUGIN1_RELEASE_2_MAIN_JS_ID = id++;
    const PLUGIN1_RELEASE2_MANIFEST_ID = id++;

    let plugin2Release1: ApiReleases;
    const PLUGIN2_MAIN_JS_ID = id++;
    const PLUGIN2_MANIFEST_ID = id++;

    let plugin2CachedReleaseRecord: PluginReleasesRecord;

    beforeEach(() => {
        plugin1FirstRelease = {
            id: id++,
            name: 'Plugin 1 Release 1',
            tag_name: PLUGIN_1_INSTALLED_VERSION,
            prerelease: false,
            draft: false,
            published_at: '2022-09-16T08:00:00Z',
            body: 'Plugin 1 release notes\n- Note1',
            assets: [
                {
                    id: PLUGIN1_RELEASE_1_MAIN_JS_ID,
                    name: 'main.js',
                    download_count: 1000,
                    updated_at: '2022-09-16T09:00:00Z',
                },
                {
                    id: PLUGIN1_RELEASE1_MANIFEST_ID,
                    name: 'manifest.json',
                    download_count: 1200,
                    updated_at: '2022-09-16T08:00:01Z',
                },
            ],
        };
        plugin1SecondRelease = {
            id: id++,
            name: 'Plugin1 Release2',
            tag_name: PLUGIN_1_NEW_VERSION_NUM,
            prerelease: false,
            draft: false,
            published_at: '2022-09-17T08:00:00Z',
            body: 'Plugin 1 release notes\n- Note2',
            assets: [
                {
                    id: PLUGIN1_RELEASE_2_MAIN_JS_ID,
                    name: 'main.js',
                    download_count: 2000,
                    updated_at: '2022-07-17T10:00:00Z',
                },
                {
                    id: PLUGIN1_RELEASE2_MANIFEST_ID,
                    name: 'manifest.json',
                    download_count: 2001,
                    updated_at: '2022-07-17T10:00:01Z',
                },
                {
                    id: 2324,
                    name: 'style.css',
                    download_count: 2002,
                    updated_at: '2022-07-17T10:00:02Z',
                },
            ],
        };
        plugin2Release1 = {
            id: id++,
            name: 'Plugin 2 release 1',
            tag_name: PLUGIN_2_INSTALLED_VERSION,
            prerelease: false,
            draft: false,
            published_at: '2022-08-16T08:00:00Z',
            body: 'Plugin 2 release notes\n- Note2',
            assets: [
                {
                    id: PLUGIN2_MAIN_JS_ID,
                    name: 'main.js',
                    download_count: 3000,
                    updated_at: '2022-07-16T09:00:00Z',
                },
                {
                    id: PLUGIN2_MANIFEST_ID,
                    name: 'manifest.json',
                    download_count: 1200,
                    updated_at: '2022-07-16T08:00:01Z',
                },
                {
                    id: 3334,
                    name: 'style.css',
                    download_count: 2002,
                    updated_at: '2022-07-17T10:00:02Z',
                },
            ],
        };

        plugin2CachedReleaseRecord = {
            pluginId: PLUGIN_2_ID,
            pluginRepo: PLUGIN_2_REPO,
            lastFetchedFromGithub: now.format(),
            lastFetchedETag: 'some etag',
            releases: [
                {
                    id: plugin2Release1.id,
                    versionName: plugin2Release1.name,
                    versionNumber: plugin2Release1.tag_name,
                    notes: plugin2Release1.body || '',
                    areNotesTruncated: false,
                    downloads: 3000,
                    publishedAt: plugin2Release1.published_at,
                    sourceCodeUpdatedAt: '2022-07-16T09:00:00Z',
                    minObsidianVersion: '15.15.0',
                    manifestLastUpdatedAt: '2022-07-16T08:00:01Z',
                },
            ],
        };
    });

    describe('Unexpected request inputs', () => {
        it('handles an empty request', async () => {
            request = { currentPluginVersions: [] };
            pluginRepository.getPluginsById = jest.fn().mockResolvedValue({});

            result = await getReleases.execute(request, now);

            expect(result).toEqual([]);
        });

        it('handles unknown plugin ids', async () => {
            request = { currentPluginVersions: [UNKNOWN_PLUGIN_REQUEST] };
            pluginRepository.getPluginsById = jest.fn().mockResolvedValue({});

            result = await getReleases.execute(request, now);

            expect(result).toEqual([]);
            expect(pluginRepository.getPluginsById).toHaveBeenCalledWith([UNKNOWN_PLUGIN_ID]);
        });
    });

    describe('cacheing of releases', () => {
        it('fetches up-to-date releases the first time seeing a plugin', async () => {
            request = {
                currentPluginVersions: [UNKNOWN_PLUGIN_REQUEST, PLUGIN_1_REQUEST, PLUGIN_2_REQUEST],
            };

            pluginRepository.getPluginsById = jest.fn().mockResolvedValue({
                [PLUGIN_1_ID]: PLUGIN_1_RECORD,
                [PLUGIN_2_ID]: PLUGIN_2_RECORD,
            });
            releaseRepository.getReleases = jest.fn().mockResolvedValue([]);
            releaseApi.fetchReleases = jest
                .fn()
                .mockResolvedValueOnce({
                    hasChanges: true,
                    releases: [plugin1FirstRelease, plugin1SecondRelease],
                    etag: 'some etag',
                })
                .mockResolvedValueOnce({
                    hasChanges: true,
                    releases: [plugin2Release1],
                    etag: 'some etag2',
                });
            releaseApi.fetchManifest = jest
                .fn()
                .mockResolvedValueOnce({
                    version: PLUGIN_1_NEW_VERSION_NUM,
                    minAppVersion: '16.0.0',
                })
                .mockResolvedValueOnce({
                    version: PLUGIN_1_INSTALLED_VERSION,
                    minAppVersion: '15.16.0',
                })
                .mockResolvedValueOnce({
                    version: PLUGIN_2_INSTALLED_VERSION,
                    minAppVersion: '15.15.0',
                });

            result = await getReleases.execute(request, now);

            expect(pluginRepository.getPluginsById).toHaveBeenCalledWith([
                UNKNOWN_PLUGIN_ID,
                PLUGIN_1_ID,
                PLUGIN_2_ID,
            ]);

            expect(releaseRepository.getReleases).toHaveBeenCalledWith([PLUGIN_1_ID, PLUGIN_2_ID]);

            expect(releaseApi.fetchReleases).toHaveBeenNthCalledWith(
                1,
                PLUGIN_1_REPO,
                config.releasesFetchedPerPlugin,
                undefined
            );
            expect(releaseApi.fetchReleases).toHaveBeenNthCalledWith(
                2,
                PLUGIN_2_REPO,
                config.releasesFetchedPerPlugin,
                undefined
            );

            expect(releaseApi.fetchManifest).toHaveBeenCalledTimes(3);
            expect(releaseApi.fetchManifest).toHaveBeenNthCalledWith(
                1,
                PLUGIN_1_REPO,
                PLUGIN1_RELEASE2_MANIFEST_ID
            );
            expect(releaseApi.fetchManifest).toHaveBeenNthCalledWith(
                2,
                PLUGIN_1_REPO,
                PLUGIN1_RELEASE1_MANIFEST_ID
            );
            expect(releaseApi.fetchManifest).toHaveBeenNthCalledWith(
                3,
                PLUGIN_2_REPO,
                PLUGIN2_MANIFEST_ID
            );

            expect(releaseRepository.save).toHaveBeenCalledTimes(1);

            //@ts-ignore
            const saved = releaseRepository.save.mock.calls[0][0] as PluginReleasesRecord[];
            expect(saved.length).toBe(2);

            expect(saved[0].pluginId).toBe(PLUGIN_1_ID);
            expect(saved[0].pluginRepo).toBe(PLUGIN_1_REPO);
            expect(saved[0].lastFetchedETag).toBe('some etag');
            expect(saved[0].lastFetchedFromGithub).toBe('2022-09-30T18:44:09-04:00');
            expect(saved[0].releases.length).toBe(2);
            expect(saved[0].releases[0]).toEqual(
                expect.objectContaining({
                    id: plugin1SecondRelease.id,
                    versionName: plugin1SecondRelease.name,
                    versionNumber: plugin1SecondRelease.tag_name,
                    notes: plugin1SecondRelease.body,
                    areNotesTruncated: false,
                    downloads: 2000,
                    fileAssetIds: {
                        manifestJson: PLUGIN1_RELEASE2_MANIFEST_ID,
                        mainJs: PLUGIN1_RELEASE_2_MAIN_JS_ID,
                        styleCss: 2324,
                    },
                    publishedAt: plugin1SecondRelease.published_at,
                    sourceCodeUpdatedAt: '2022-07-17T10:00:00Z',
                    minObsidianVersion: '16.0.0',
                    manifestLastUpdatedAt: '2022-07-17T10:00:01Z',
                })
            );
            expect(saved[0].releases[1]).toEqual(
                expect.objectContaining({
                    id: plugin1FirstRelease.id,
                    versionName: plugin1FirstRelease.name,
                    versionNumber: plugin1FirstRelease.tag_name,
                    notes: plugin1FirstRelease.body,
                    areNotesTruncated: false,
                    downloads: 1000,
                    fileAssetIds: {
                        manifestJson: PLUGIN1_RELEASE1_MANIFEST_ID,
                        mainJs: PLUGIN1_RELEASE_1_MAIN_JS_ID,
                        styleCss: undefined,
                    },
                    publishedAt: plugin1FirstRelease.published_at,
                    sourceCodeUpdatedAt: '2022-09-16T09:00:00Z',
                    minObsidianVersion: '15.16.0',
                    manifestLastUpdatedAt: '2022-09-16T08:00:01Z',
                })
            );

            expect(saved[1].pluginId).toBe(PLUGIN_2_ID);
            expect(saved[1].pluginRepo).toBe(PLUGIN_2_REPO);
            expect(saved[1].lastFetchedETag).toBe('some etag2');
            expect(saved[1].lastFetchedFromGithub).toBe('2022-09-30T18:44:09-04:00');
            expect(saved[1].releases.length).toBe(1);
            expect(saved[1].releases[0]).toEqual(
                expect.objectContaining({
                    id: plugin2Release1.id,
                    versionName: plugin2Release1.name,
                    versionNumber: plugin2Release1.tag_name,
                    notes: plugin2Release1.body,
                    areNotesTruncated: false,
                    downloads: 3000,
                    fileAssetIds: {
                        manifestJson: PLUGIN2_MANIFEST_ID,
                        mainJs: PLUGIN2_MAIN_JS_ID,
                        styleCss: 3334,
                    },
                    publishedAt: plugin2Release1.published_at,
                    sourceCodeUpdatedAt: '2022-07-16T09:00:00Z',
                    minObsidianVersion: '15.15.0',
                    manifestLastUpdatedAt: '2022-07-16T08:00:01Z',
                })
            );
        });

        it('fetches up-to-date releases if cached values have expired', async () => {
            request = {
                currentPluginVersions: [PLUGIN_2_REQUEST],
            };

            pluginRepository.getPluginsById = jest.fn().mockResolvedValue({
                [PLUGIN_2_ID]: PLUGIN_2_RECORD,
            });

            plugin2CachedReleaseRecord.lastFetchedFromGithub = now
                .subtract(config.releasesCacheLengthSeconds + 1, 'seconds')
                .format();

            releaseRepository.getReleases = jest.fn().mockResolvedValue([]);
            releaseApi.fetchReleases = jest.fn().mockResolvedValueOnce({
                hasChanges: true,
                releases: [plugin2Release1],
                etag: 'some etag2',
            });

            result = await getReleases.execute(request, now);

            expect(releaseApi.fetchReleases).toHaveBeenCalledTimes(1);
        });

        it("uses cached releases that haven't expired", () => {});
    });

    describe('processing of release data', () => {
        it('generates the expected client response', () => {});

        it('sorts releases by published date', () => {});

        it("removes releases that are older than the user's installed version", () => {});

        it('handles a missing main.js file', () => {});

        it('handles a missing manifest.json file', () => {});

        it('handles a plugin without releases', () => {});

        it('truncates large release notes', () => {});
    });
});
