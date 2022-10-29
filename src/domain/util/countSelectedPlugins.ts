import { State } from '../../state';
import { ObsidianState } from '../../state/obsidianReducer';

export const countSelectedPlugins = (state: State) => {
    const obsidianState = state.obsidian as ObsidianState;

    return Object.values(obsidianState.selectedPluginsById).reduce(
        (count, isSelected) => count + (isSelected ? 1 : 0),
        0
    );
};
