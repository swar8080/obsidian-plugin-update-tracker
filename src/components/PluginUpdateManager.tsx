import * as React from 'react';
import { PluginSettings } from 'src/domain/pluginSettings';
import { useAppSelector } from '../state';
import PluginUpdateList from './PluginUpdateList';
import PluginUpdateProgressTracker from './PluginUpdateProgressTracker';

interface PluginUpdateManagerProps {
    titleEl: HTMLElement | undefined;
    persistPluginSettings: (settings: PluginSettings) => Promise<void>;
}

const PluginUpdateManager: React.FC<PluginUpdateManagerProps> = ({
    titleEl,
    persistPluginSettings,
}) => {
    const showUpdateProgressTracker = useAppSelector(
        (state) => state.obsidian.isUpdatingPlugins || !state.obsidian.isUpdateResultAcknowledged
    );

    if (showUpdateProgressTracker) {
        return <PluginUpdateProgressTracker titleEl={titleEl} />;
    } else {
        return <PluginUpdateList titleEl={titleEl} persistPluginSettings={persistPluginSettings} />;
    }
};

export default PluginUpdateManager;
