import dayjs from 'dayjs';
import { PluginManifest, requireApiVersion } from 'obsidian';
import { PluginSettings } from './pluginSettings';

import { PluginReleases } from 'oput-common';
import { semverCompare } from '../../oput-common/semverCompare';
import InstalledPluginReleases from './InstalledPluginReleases';

const HIDE_THIS_PLUGINS_UPDATES = process.env['OBSIDIAN_APP_HIDE_THIS_PLUGINS_UPDATES'] === 'true';
const THIS_PLUGIN_ID = process.env['OBSIDIAN_APP_THIS_PLUGIN_ID'];

export type PluginFilters = {
    excludeDismissed: boolean;
    excludeTooRecentUpdates: boolean;
    excludeIncompatibleVersions: boolean;
    excludeBetaVersions: boolean;
    excludeDisabledPlugins: boolean;
};

export const DEFAULT_FILTERS: Omit<
    PluginFilters,
    'excludeDisabledPlugins' | 'excludeBetaVersions'
> = {
    excludeDismissed: true,
    excludeTooRecentUpdates: true,
    excludeIncompatibleVersions: true,
};

const filter = (
    filterOverrides: Partial<PluginFilters>,
    pluginSettings: PluginSettings,
    installedPlugins: PluginManifest[],
    enabledPlugins: Record<string, boolean> | undefined,
    releases: PluginReleases[],
    now: dayjs.Dayjs = dayjs()
): InstalledPluginReleases[] => {
    const filters = Object.assign(
        {
            excludeDisabledPlugins: pluginSettings.excludeDisabledPlugins,
            excludeBetaVersions: pluginSettings.excludeBetaVersions,
        },
        DEFAULT_FILTERS,
        filterOverrides
    );
    const allPlugins = InstalledPluginReleases.create(installedPlugins, releases);
    const isPluginVersionDismissed = buildDismissedPluginVersionMemo(pluginSettings);

    return allPlugins.filter((plugin) => {
        let include = true;

        //Mutate/filter out versions
        plugin.keepReleaseVersions((version) => {
            if (
                filters.excludeIncompatibleVersions &&
                version.minObsidianAppVersion != null &&
                !requireApiVersion(version.minObsidianAppVersion)
            ) {
                return false;
            }

            if (
                filters.excludeTooRecentUpdates &&
                pluginSettings.daysToSuppressNewUpdates > 0 &&
                now.diff(version.updatedAt, 'days') < pluginSettings.daysToSuppressNewUpdates
            ) {
                return false;
            }

            if (
                filters.excludeDismissed &&
                isPluginVersionDismissed(plugin.getPluginId(), version.versionNumber)
            ) {
                return false;
            }

            if (filters.excludeBetaVersions && version.isBetaVersion) {
                return false;
            }

            if (!version.fileAssetIds) {
                return false;
            }

            if (semverCompare(version.versionNumber, plugin.getInstalledVersionNumber()) <= 0) {
                return false;
            }

            return true;
        });

        const newVersions = plugin.getReleaseVersions();
        if (newVersions.length == 0) {
            include = false;
        }

        if (filters.excludeDisabledPlugins && enabledPlugins) {
            include = include && enabledPlugins[plugin.getPluginId()] === true;
        }

        if (HIDE_THIS_PLUGINS_UPDATES && THIS_PLUGIN_ID) {
            include = include && plugin.getPluginId() !== THIS_PLUGIN_ID;
        }

        return include;
    });
};

function buildDismissedPluginVersionMemo(
    settings: PluginSettings
): (pluginId: string, versionNumber: string) => boolean {
    const idVersionSet: Set<string> = new Set();

    const pluginIds = Object.keys(settings.dismissedVersionsByPluginId);
    for (const pluginId of pluginIds) {
        settings.dismissedVersionsByPluginId[pluginId].dismissedVersions.forEach(
            (dismissedVersion) => idVersionSet.add(pluginId + dismissedVersion.versionNumber)
        );
    }

    return (pluginId, versionNumber) => idVersionSet.has(pluginId + versionNumber);
}

export default filter;
