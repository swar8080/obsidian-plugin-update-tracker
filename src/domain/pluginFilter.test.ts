import dayjs from 'dayjs';
import { PluginManifest } from 'obsidian';
import { PluginReleases, ReleaseVersion } from '../../oput-common';
import InstalledPluginReleases from './InstalledPluginReleases';
import pluginFilter, { PluginFilters } from './pluginFilter';
import { DEFAULT_PLUGIN_SETTINGS, DismissedPluginVersion, PluginSettings } from './pluginSettings';

describe('pluginFilter', () => {
    let id = 1000;

    const PREVIOUS_PLUGIN_VERSION = '0.99.99';
    const INSTALLED_PLUGIN_VERSION = '1.0.0';
    const INSTALLED_PLUGIN_ID = 'plugin 1 id';
    const COMPATIBLE_APP_VERSION = '15.0.0';
    const INCOMPATIBLE_APP_VERSION = '16.0.0';

    const NEW_PLUGIN_VERSION = '1.0.' + ++id;
    const NEW_PLUGIN_VERSION_PUBLISHED_DATE = '2022-06-15T6:00:00Z';
    const NEW_PLUGIN_VERSION_UPDATED_AT = '2022-06-16T6:00:00Z';

    let pluginSettings: PluginSettings;
    const PLUGIN_SETTINGS_BASE: PluginSettings = {
        ...DEFAULT_PLUGIN_SETTINGS,
        daysToSuppressNewUpdates: 0,
        dismissedVersionsByPluginId: {},
        showIconOnMobile: true,
        excludeDisabledPlugins: false,
        excludeBetaVersions: false,
    };

    let pluginManifests: PluginManifest[];
    const PLUGIN_MANIFEST_BASE: PluginManifest = {
        id: INSTALLED_PLUGIN_ID,
        version: INSTALLED_PLUGIN_VERSION,
        minAppVersion: COMPATIBLE_APP_VERSION,
        name: 'Plugin1',
        author: '',
        description: '',
    };

    let enabledPlugins: Record<string, boolean>;

    const PLUGIN_NEW_RELEASE_VERSION_BASE: ReleaseVersion = {
        releaseId: id++,
        versionName: 'v1.0.1',
        versionNumber: NEW_PLUGIN_VERSION,
        minObsidianAppVersion: COMPATIBLE_APP_VERSION,
        notes: 'release notes',
        areNotesTruncated: false,
        downloads: 123,
        publishedAt: NEW_PLUGIN_VERSION_PUBLISHED_DATE,
        isBetaVersion: false,
        fileAssetIds: {
            mainJs: id++,
            manifestJson: id++,
        },
        updatedAt: NEW_PLUGIN_VERSION_UPDATED_AT,
    };
    const PLUGIN_NEW_RELEASES_BASE: Omit<PluginReleases, 'newVersions'> = {
        obsidianPluginId: INSTALLED_PLUGIN_ID,
        pluginName: 'Plugin1',
        pluginRepositoryUrl: 'https://github.com/author1/some-plugin',
        pluginRepoPath: 'author1/some-plugin',
    };
    let pluginReleases: PluginReleases[];

    const DISABLED_FILTERS: PluginFilters = {
        excludeDisabledPlugins: false,
        excludeBetaVersions: false,
        excludeDismissed: false,
        excludeIncompatibleVersions: false,
        excludeTooRecentUpdates: false,
    };

    beforeEach(() => {
        pluginSettings = { ...PLUGIN_SETTINGS_BASE };
        pluginManifests = [{ ...PLUGIN_MANIFEST_BASE }];
        enabledPlugins = { [INSTALLED_PLUGIN_ID]: true };
        pluginReleases = [
            {
                ...PLUGIN_NEW_RELEASES_BASE,
                newVersions: [{ ...PLUGIN_NEW_RELEASE_VERSION_BASE }],
            },
        ];
    });

    describe('semver filtering', () => {
        it('includes versions with greater semver versions as installed', () => {
            const result = testWithSemverVersion(NEW_PLUGIN_VERSION);

            expect(result).toHaveLength(1);
        });

        it('ignores versions from an earlier semver version than installed', () => {
            const result = testWithSemverVersion(PREVIOUS_PLUGIN_VERSION);

            expect(result).toHaveLength(0);
        });

        it('ignores versions with the same semver version as installed', () => {
            const result = testWithSemverVersion(INSTALLED_PLUGIN_VERSION);

            expect(result).toHaveLength(0);
        });

        it('ignores versions without a semver version', () => {
            const result = testWithSemverVersion(null);

            expect(result).toHaveLength(0);
        });

        function testWithSemverVersion(version: string | null): InstalledPluginReleases[] {
            //@ts-ignore
            pluginReleases[0].newVersions[0].versionNumber = version;

            return pluginFilter(
                { ...DISABLED_FILTERS },
                pluginSettings,
                pluginManifests,
                enabledPlugins,
                pluginReleases
            );
        }
    });

    describe('dismissed version filtering', () => {
        const DISMISSED_VERSION_BASE: Omit<DismissedPluginVersion, 'versionNumber'> = {
            versionName: '',
            publishedAt: '',
        };
        const SOME_OTHER_PLUGIN_ID = 'some other plugin id';

        beforeEach(() => {
            pluginSettings.dismissedVersionsByPluginId = {
                [INSTALLED_PLUGIN_ID]: {
                    pluginRepoPath: '',
                    pluginId: INSTALLED_PLUGIN_ID,
                    dismissedVersions: [],
                },
                [SOME_OTHER_PLUGIN_ID]: {
                    pluginRepoPath: '',
                    pluginId: SOME_OTHER_PLUGIN_ID,
                    dismissedVersions: [],
                },
            };
        });

        it('ignores versions that are dismissed', () => {
            pluginSettings.dismissedVersionsByPluginId[INSTALLED_PLUGIN_ID].dismissedVersions.push({
                versionNumber: NEW_PLUGIN_VERSION,
                ...DISMISSED_VERSION_BASE,
            });

            const result = testCase();

            expect(result).toHaveLength(0);
        });

        it('includes versions when a different version was dismissed', () => {
            pluginSettings.dismissedVersionsByPluginId[INSTALLED_PLUGIN_ID].dismissedVersions.push({
                versionNumber: PREVIOUS_PLUGIN_VERSION,
                ...DISMISSED_VERSION_BASE,
            });

            const result = testCase();

            expect(result).toHaveLength(1);
        });

        it('includes versions when a different plugin dismissed the same version', () => {
            pluginSettings.dismissedVersionsByPluginId[SOME_OTHER_PLUGIN_ID].dismissedVersions.push(
                {
                    versionNumber: NEW_PLUGIN_VERSION,
                    ...DISMISSED_VERSION_BASE,
                }
            );

            const result = testCase();

            expect(result).toHaveLength(1);
        });

        function testCase(): InstalledPluginReleases[] {
            return pluginFilter(
                { ...DISABLED_FILTERS, excludeDismissed: true },
                pluginSettings,
                pluginManifests,
                enabledPlugins,
                pluginReleases
            );
        }
    });

    describe('version compatability filter', () => {
        test('all are compatible', () => {
            const result = testWithVersionCompatability(
                COMPATIBLE_APP_VERSION,
                COMPATIBLE_APP_VERSION
            );

            expect(result).toHaveLength(1);
            expect(result[0].getReleaseVersions()).toHaveLength(2);
        });

        test('no versions are compatible', () => {
            const result = testWithVersionCompatability(
                INCOMPATIBLE_APP_VERSION,
                INCOMPATIBLE_APP_VERSION
            );

            expect(result).toHaveLength(0);
        });

        test('only latest is compatible', () => {
            const result = testWithVersionCompatability(
                COMPATIBLE_APP_VERSION,
                INCOMPATIBLE_APP_VERSION
            );

            expect(result).toHaveLength(1);
            expect(result[0].getReleaseVersions()).toHaveLength(1);
            expect(result[0].getLatestVersionNumber()).toBe(
                pluginReleases[0].newVersions[0].versionNumber
            );
        });

        test('only previous is compatible', () => {
            const result = testWithVersionCompatability(
                INCOMPATIBLE_APP_VERSION,
                COMPATIBLE_APP_VERSION
            );

            expect(result).toHaveLength(1);
            expect(result[0].getReleaseVersions()).toHaveLength(1);
            expect(result[0].getLatestVersionNumber()).toBe(
                pluginReleases[0].newVersions[1].versionNumber
            );
        });

        test('missing compatibility version is considered compatible', () => {
            const result = testWithVersionCompatability(undefined, undefined);

            expect(result).toHaveLength(1);
            expect(result[0].getReleaseVersions()).toHaveLength(2);
        });

        function testWithVersionCompatability(
            newReleaseCompatibleObsidianVersion: string | undefined,
            previousReleaseCompatibleObsidianVersion: string | undefined
        ): InstalledPluginReleases[] {
            pluginReleases[0].newVersions[0].minObsidianAppVersion =
                previousReleaseCompatibleObsidianVersion;

            const nextVersion = buildNextVersion();
            nextVersion.minObsidianAppVersion = newReleaseCompatibleObsidianVersion;
            pluginReleases[0].newVersions = [nextVersion, ...pluginReleases[0].newVersions];

            return pluginFilter(
                { ...DISABLED_FILTERS, excludeIncompatibleVersions: true },
                pluginSettings,
                pluginManifests,
                enabledPlugins,
                pluginReleases
            );
        }
    });

    describe('plugin enablement filter', () => {
        test('plugin enablement filter override takes precedent over settings', () => {
            testCase({ pluginEnabled: true, excludeDisabled: true, isIncluded: true });
            testCase({ pluginEnabled: true, excludeDisabled: false, isIncluded: true });
            testCase({ pluginEnabled: false, excludeDisabled: true, isIncluded: false });
            testCase({ pluginEnabled: false, excludeDisabled: false, isIncluded: true });
        });

        function testCase(params: {
            pluginEnabled: boolean;
            excludeDisabled: boolean;
            isIncluded: boolean;
        }) {
            enabledPlugins[INSTALLED_PLUGIN_ID] = params.pluginEnabled;

            const result = pluginFilter(
                { ...DISABLED_FILTERS, excludeDisabledPlugins: params.excludeDisabled },
                pluginSettings,
                pluginManifests,
                enabledPlugins,
                pluginReleases
            );

            expect(result).toHaveLength(params.isIncluded ? 1 : 0);
        }

        test("enablement plugin setting is used when filter override isn't provided", () => {
            enabledPlugins[INSTALLED_PLUGIN_ID] = false;
            let filterOverride = { ...DISABLED_FILTERS };
            //@ts-ignore
            delete filterOverride['excludeDisabledPlugins'];
            pluginSettings.excludeDisabledPlugins = true;

            let result = pluginFilter(
                filterOverride,
                pluginSettings,
                pluginManifests,
                enabledPlugins,
                pluginReleases
            );

            expect(result).toHaveLength(0);

            pluginSettings.excludeDisabledPlugins = false;

            result = pluginFilter(
                filterOverride,
                pluginSettings,
                pluginManifests,
                enabledPlugins,
                pluginReleases
            );

            expect(result).toHaveLength(1);
        });
    });

    describe('days since update filter', () => {
        const now = dayjs();

        test('all versions updated too recently', () => {
            const result = testCase({
                latestVersionUpdatedAt: now.subtract(10, 'minutes'),
                previousVersionUpdatedAt: now.subtract(20, 'minutes'),
                daysToWaitForUpdates: 1,
            });

            expect(result).toHaveLength(0);
        });

        test('all versions updated long ago enough', () => {
            const result = testCase({
                latestVersionUpdatedAt: now.subtract(1, 'day').subtract(1, 'second'),
                previousVersionUpdatedAt: now.subtract(20, 'days'),
                daysToWaitForUpdates: 1,
            });

            expect(result).toHaveLength(1);
            expect(result[0].getReleaseVersions()).toHaveLength(2);
        });

        test('most recent version updated too recently, use previous version', () => {
            const result = testCase({
                latestVersionUpdatedAt: now.subtract(1, 'day').add(1, 'second'),
                previousVersionUpdatedAt: now.subtract(20, 'days'),
                daysToWaitForUpdates: 1,
            });

            expect(result).toHaveLength(1);
            expect(result[0].getReleaseVersions()).toHaveLength(1);
            expect(result[0].getReleaseVersions()[0].versionNumber).toBe(
                pluginReleases[0].newVersions[1].versionNumber
            );
        });

        test('previous version updated too recently, use more recent version', () => {
            const result = testCase({
                latestVersionUpdatedAt: now.subtract(20, 'day'),
                previousVersionUpdatedAt: now.subtract(20, 'minutes'),
                daysToWaitForUpdates: 1,
            });

            expect(result).toHaveLength(1);
            expect(result[0].getReleaseVersions()).toHaveLength(1);
            expect(result[0].getReleaseVersions()[0].versionNumber).toBe(
                pluginReleases[0].newVersions[0].versionNumber
            );
        });

        function testCase(params: {
            latestVersionUpdatedAt: dayjs.Dayjs;
            previousVersionUpdatedAt: dayjs.Dayjs;
            daysToWaitForUpdates: number;
        }): InstalledPluginReleases[] {
            const newVersion = buildNextVersion();
            newVersion.updatedAt = params.latestVersionUpdatedAt.format();

            const prevVersion = pluginReleases[0].newVersions[0];
            prevVersion.updatedAt = params.previousVersionUpdatedAt.format();

            pluginReleases[0].newVersions = [newVersion, prevVersion];

            pluginSettings.daysToSuppressNewUpdates = params.daysToWaitForUpdates;

            return pluginFilter(
                { ...DISABLED_FILTERS, excludeTooRecentUpdates: true },
                pluginSettings,
                pluginManifests,
                enabledPlugins,
                pluginReleases,
                now
            );
        }
    });

    it('ignores versions without known asset ids', () => {
        pluginReleases[0].newVersions[0].fileAssetIds = undefined;

        const result = pluginFilter(
            { ...DISABLED_FILTERS },
            pluginSettings,
            pluginManifests,
            enabledPlugins,
            pluginReleases
        );

        expect(result).toHaveLength(0);
    });

    function buildNextVersion(): ReleaseVersion {
        const nextVersion = '1.0.' + id++;
        return {
            ...PLUGIN_NEW_RELEASE_VERSION_BASE,
            releaseId: id++,
            versionNumber: nextVersion,
            versionName: 'v' + nextVersion,
        };
    }
});
