import * as React from 'react';
import usePluginReleaseFilter from './hooks/usePluginReleaseFilter';

interface RibbonIconProps {
    rootEl: HTMLElement;
}

const RibbonIcon: React.FC<RibbonIconProps> = ({ rootEl }) => {
    const pluginsWithUpdatesCount = usePluginReleaseFilter().length;
    const defaultIconDisplay = React.useRef(rootEl.style.display);

    React.useLayoutEffect(() => {
        if (pluginsWithUpdatesCount > 0) {
            rootEl.style.display = defaultIconDisplay.current;
        } else {
            rootEl.style.display = 'none';
        }
    }, [pluginsWithUpdatesCount, rootEl]);

    return null;
};

export default RibbonIcon;
