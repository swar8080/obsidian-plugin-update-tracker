import * as React from 'react';
import { useAppSelector } from '../state';
import PluginUpdateList from './PluginUpdateList';
import PluginUpdateProgressTracker from './PluginUpdateProgressTracker';

interface PluginUpdateManagerProps {
    titleEl: HTMLElement | undefined;
}

const PluginUpdateManager: React.FC<PluginUpdateManagerProps> = ({ titleEl }) => {
    const showUpdateProgressTracker = useAppSelector(
        (state) => state.obsidian.isUpdatingPlugins || !state.obsidian.isUpdateResultAcknowledged
    );

    if (showUpdateProgressTracker) {
        return <PluginUpdateProgressTracker titleEl={titleEl} />;
    } else {
        return <PluginUpdateList titleEl={titleEl} />;
    }
};

export default PluginUpdateManager;
