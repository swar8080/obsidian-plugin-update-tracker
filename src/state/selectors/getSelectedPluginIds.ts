import { State } from '..';

export function getSelectedPluginIds(state: State): string[] {
    return Object.keys(state.obsidian.selectedPluginsById).filter(
        (pluginId) => state.obsidian.selectedPluginsById[pluginId]
    );
}
