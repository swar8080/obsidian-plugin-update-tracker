import * as React from 'react';
import { useAppSelector } from 'src/state';
import usePluginReleaseFilter from './hooks/usePluginReleaseFilter';

interface RibbonIconProps {
    rootEl: HTMLElement;
}

const RibbonIcon: React.FC<RibbonIconProps> = ({ rootEl }) => {
    const isShownOnMobile = useAppSelector((state) => state.obsidian.settings.showIconOnMobile);
    const pluginsWithUpdatesCount = usePluginReleaseFilter().length;
    const defaultIconDisplay = React.useRef(rootEl.style.display);

    React.useLayoutEffect(() => {
        if (isShownOnMobile && pluginsWithUpdatesCount > 0) {
            rootEl.style.display = defaultIconDisplay.current;
        } else {
            rootEl.style.display = 'none';
        }
    }, [isShownOnMobile, pluginsWithUpdatesCount, rootEl]);

    return null;
};

export default RibbonIcon;
