import dayjs from 'dayjs';
import filter from 'lodash/filter';
import map from 'lodash/map';
import orderBy from 'lodash/orderBy';
import { PluginManifest, requireApiVersion } from 'obsidian';
import { PluginFileAssetIds, PluginReleases, ReleaseVersion } from 'shared-types';
export default class InstalledPluginReleases {
    private plugin: PluginManifest;
    private releases: PluginReleases | undefined;

    public static create(
        plugins: PluginManifest[],
        releases: PluginReleases[]
    ): InstalledPluginReleases[] {
        const releasesByPluginId = releases.reduce((map, p) => {
            map[p.obsidianPluginId] = p;
            return map;
        }, {} as Record<string, PluginReleases>);

        return map(
            plugins,
            (plugin) => new InstalledPluginReleases(plugin, releasesByPluginId[plugin.id])
        );
    }

    private constructor(plugin: PluginManifest, releases: PluginReleases | undefined) {
        this.plugin = plugin;

        if (releases?.newVersions) {
            //sort releases in descending order
            releases = {
                ...releases,
                newVersions: orderBy(
                    releases.newVersions,
                    (release) => release.publishedAt,
                    'desc'
                ),
            };
        }
        this.releases = releases;
    }

    public getUninstalledNewReleases(versionCompatabilityCheck: boolean): ReleaseVersion[] {
        if (this.getInstalledVersionNumber() == this.getLatestVersionNumber()) {
            return [];
        }

        return filter(
            this.releases?.newVersions,
            (version) =>
                !versionCompatabilityCheck ||
                version.minObsidianAppVersion == null ||
                requireApiVersion(version.minObsidianAppVersion)
        );
    }

    public getPluginId(): string {
        return this.plugin.id;
    }

    public getPluginName(): string {
        return this.plugin.name;
    }

    public getInstalledVersionNumber(): string {
        return this.plugin.version;
    }

    public getLatestVersionNumber(): string {
        const newReleaseVersion = this.getNewReleaseVersion();
        if (newReleaseVersion) {
            return newReleaseVersion.versionNumber;
        }
        return this.plugin.version;
    }

    public getLatestUpdateTime(): dayjs.Dayjs | undefined {
        const newReleaseVersion = this.getNewReleaseVersion();
        if (newReleaseVersion) {
            return dayjs(newReleaseVersion.updatedAt);
        }
    }

    public getLatestDownloads(): number {
        const newReleaseVersion = this.getNewReleaseVersion();
        return newReleaseVersion?.downloads || 0;
    }

    public getPluginRepositoryUrl(): string {
        return this.releases?.pluginRepositoryUrl || '';
    }

    public getLatestReleaseAssetIds(): PluginFileAssetIds | undefined {
        const newReleaseVersion = this.getNewReleaseVersion();
        return newReleaseVersion?.fileAssetIds;
    }

    public getRepoPath(): string | undefined {
        return this.releases?.pluginRepoPath;
    }

    private getNewReleaseVersion(): ReleaseVersion | undefined {
        if (this.releases?.newVersions.length) {
            return this.releases.newVersions[0];
        }
    }
}
