import * as React from 'react';
import InstalledPluginReleases from '../../domain/InstalledPluginReleases';
import pluginFilter, { PluginFilters } from '../../domain/pluginFilter';
import { useAppSelector } from '../../state';

export default function usePluginReleaseFilter(
    filters: Partial<PluginFilters> = {}
): InstalledPluginReleases[] {
    const installed = useAppSelector((state) => state.obsidian.pluginManifests);
    const enabledPlugins = useAppSelector((state) => state.obsidian.enabledPlugins);
    const releases = useAppSelector((state) => state.releases.releases);
    const pluginSettings = useAppSelector((state) => state.obsidian.settings);

    const filteredPlugins = React.useMemo(
        () => pluginFilter(filters, pluginSettings, installed, enabledPlugins, releases),
        [[...Object.values(filters), pluginSettings, installed, enabledPlugins, releases]]
    );

    return filteredPlugins;
}
