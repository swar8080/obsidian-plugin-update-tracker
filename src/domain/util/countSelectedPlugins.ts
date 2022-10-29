import { State } from '../../state';

export const countSelectedPlugins = (state: State) =>
    Object.values(state.obsidian.selectedPluginsById).reduce(
        (count, isSelected) => count + (isSelected ? 1 : 0),
        0
    );
