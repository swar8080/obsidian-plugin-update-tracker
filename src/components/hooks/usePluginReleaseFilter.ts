import * as React from 'react';
import InstalledPluginReleases from '../../domain/InstalledPluginReleases';
import pluginFilter, { DEFAULT_FILTERS, PluginFilters } from '../../domain/pluginFilter';
import { useAppSelector } from '../../state';

export default function usePluginReleaseFilter(
    filters: Partial<PluginFilters> = {}
): InstalledPluginReleases[] {
    const installed = useAppSelector((state) => state.obsidian.pluginManifests);
    const enabledPlugins = useAppSelector((state) => state.obsidian.enabledPlugins);
    const releases = useAppSelector((state) => state.releases.releases);
    const pluginSettings = useAppSelector((state) => state.obsidian.settings);

    const allFilters = Object.assign({}, filters, DEFAULT_FILTERS);
    const filteredPlugins = React.useMemo(
        () => pluginFilter(allFilters, pluginSettings, installed, enabledPlugins, releases),
        [[...Object.values(allFilters), pluginSettings, installed, enabledPlugins, releases]]
    );

    return filteredPlugins;
}
