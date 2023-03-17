import { Platform } from 'obsidian';
import * as React from 'react';
import { PluginSettings } from '../domain/pluginSettings';
import { useAppSelector } from '../state';
import PluginUpdateList from './PluginUpdateList';
import PluginUpdateProgressTracker from './PluginUpdateProgressTracker';

interface PluginUpdateManagerProps {
    titleEl: HTMLElement | undefined;
    persistPluginSettings: (settings: PluginSettings) => Promise<void>;
    closeObsidianTab: () => void;
}

const ACTION_BAR_LOCATION_MIDDLE =
    process.env['OBSIDIAN_APP_ACTION_BAR_LOCATION_MIDDLE'] === 'true';

const PluginUpdateManager: React.FC<PluginUpdateManagerProps> = ({
    titleEl,
    persistPluginSettings,
    closeObsidianTab,
}) => {
    const showUpdateProgressTracker = useAppSelector(
        (state) => state.obsidian.isUpdatingPlugins || !state.obsidian.isUpdateResultAcknowledged
    );

    //Action bar is cut-off on iphone https://github.com/swar8080/obsidian-plugin-update-tracker/issues/49
    //@ts-ignore
    const isPhone = Platform.isPhone;
    const isIPhone = Platform.isIosApp && isPhone;
    const actionBarLocation = isIPhone || ACTION_BAR_LOCATION_MIDDLE ? 'middle' : 'bottom';

    if (showUpdateProgressTracker) {
        return <PluginUpdateProgressTracker titleEl={titleEl} />;
    } else {
        return (
            <PluginUpdateList
                titleEl={titleEl}
                persistPluginSettings={persistPluginSettings}
                closeObsidianTab={closeObsidianTab}
                actionBarLocation={actionBarLocation}
            />
        );
    }
};

export default PluginUpdateManager;
