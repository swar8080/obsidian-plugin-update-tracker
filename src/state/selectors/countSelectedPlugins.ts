import { State } from '..';

export const countSelectedPlugins = (state: State) => {
    return Object.values(state.obsidian.selectedPluginsById).reduce(
        (count, isSelected) => count + (isSelected ? 1 : 0),
        0
    );
};
