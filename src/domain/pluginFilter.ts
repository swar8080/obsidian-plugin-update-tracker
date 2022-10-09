import dayjs from 'dayjs';
import find from 'lodash/find';
import { PluginManifest } from 'obsidian';
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
    filters: PluginFilters,
    pluginSettings: PluginSettings,
    installedPlugins: PluginManifest[],
    enabledPlugins: Record<string, boolean> | undefined,
    releases: PluginReleases[]
): InstalledPluginReleases[] => {
    const allPlugins = InstalledPluginReleases.create(installedPlugins, releases);

    return allPlugins.filter((plugin) => {
        let include = true;

        const newReleases = plugin.getUninstalledNewReleases(filters.excludeIncompatibleVersions);

        if (newReleases.length == 0) {
            include = false;
        }

        if (filters.excludeDisabledPlugins && enabledPlugins) {
            include = include && enabledPlugins[plugin.getPluginId()] === true;
        }

        if (
            filters.excludeTooRecentUpdates &&
            newReleases.length > 0 &&
            pluginSettings.daysToSuppressNewUpdates > 0
        ) {
            const lastUpdated = plugin.getLatestUpdateTime() || dayjs();
            const daysSinceUpdate = dayjs().diff(lastUpdated, 'days');

            include = include && daysSinceUpdate > pluginSettings.daysToSuppressNewUpdates;
        }

        if (filters.excludeDismissed) {
            const pluginId = plugin.getPluginId();
            const dimissedPublishedDate = pluginSettings.dismissedPublishedDateByPluginId[pluginId];

            const releaseAfterDismissedDate = find(
                newReleases,
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
