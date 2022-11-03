import dayjs from 'dayjs';
import find from 'lodash/find';
import { PluginManifest, requireApiVersion } from 'obsidian';
import { PluginSettings } from './pluginSettings';

import { PluginReleases } from 'shared-types';
import InstalledPluginReleases from './InstalledPluginReleases';

export type PluginFilters = {
    excludeDismissed: boolean;
    excludeTooRecentUpdates: boolean;
    excludeIncompatibleVersions: boolean;
    excludeDisabledPlugins: boolean;
};

export const DEFAULT_FILTERS: PluginFilters = {
    excludeDismissed: true,
    excludeTooRecentUpdates: true,
    excludeIncompatibleVersions: true,
    excludeDisabledPlugins: false,
};

const filter = (
    filterOverrides: Partial<PluginFilters>,
    pluginSettings: PluginSettings,
    installedPlugins: PluginManifest[],
    enabledPlugins: Record<string, boolean> | undefined,
    releases: PluginReleases[],
    now: dayjs.Dayjs = dayjs()
): InstalledPluginReleases[] => {
    const allPlugins = InstalledPluginReleases.create(installedPlugins, releases);
    const filters = Object.assign({}, DEFAULT_FILTERS, filterOverrides);

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

            return true;
        });

        const newVersions = plugin.getReleaseVersions();
        if (newVersions.length == 0) {
            include = false;
        }

        if (filters.excludeDisabledPlugins && enabledPlugins) {
            include = include && enabledPlugins[plugin.getPluginId()] === true;
        }

        if (filters.excludeDismissed) {
            const pluginId = plugin.getPluginId();
            const dimissedPublishedDate = pluginSettings.dismissedPublishedDateByPluginId[pluginId];

            const releaseAfterDismissedDate = find(
                newVersions,
                (release) =>
                    dimissedPublishedDate == undefined ||
                    release.publishedAt > dimissedPublishedDate
            );

            include = include && releaseAfterDismissedDate != undefined;
        }

        return include;
    });
};

export default filter;
