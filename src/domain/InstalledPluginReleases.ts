import dayjs from 'dayjs';
import filter from 'lodash/filter';
import find from 'lodash/find';
import map from 'lodash/map';
import orderBy from 'lodash/orderBy';
import { PluginManifest } from 'obsidian';
import { PluginFileAssetIds, PluginReleases, ReleaseVersion } from 'oput-common';
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

    public keepReleaseVersions(keepFilter: (version: ReleaseVersion) => boolean): void {
        if (this.releases) {
            this.releases.newVersions = filter(this.releases.newVersions, keepFilter);
        }
    }

    public getReleaseVersions(): ReleaseVersion[] {
        return this.releases?.newVersions || [];
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

    public getReleaseAssetIdsForVersion(versionNumber: string): PluginFileAssetIds | undefined {
        const release = find(
            this.releases?.newVersions,
            (release) => release.versionNumber == versionNumber
        );
        return release?.fileAssetIds;
    }

    public isLatestVersionABetaVersion(): boolean {
        const newReleaseVersion = this.getNewReleaseVersion();
        return newReleaseVersion?.isBetaVersion === true;
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
