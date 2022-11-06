import { createAsyncThunk } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import { State } from '..';
import { PluginSettings } from '../../domain/pluginSettings';

type Paramters = {
    pluginId: string;
    versionNumber: string;
    persistPluginSettings: (settings: PluginSettings) => Promise<void>;
};

export const unDismissPluginVersion = createAsyncThunk(
    'releases/unDismissPluginVersions',
    async (params: Paramters, thunkAPI) => {
        const { pluginId, versionNumber, persistPluginSettings } = params;
        const state = thunkAPI.getState() as State;
        let settings = state.obsidian.settings;
        const dismissedVersionsByPluginId = settings.dismissedVersionsByPluginId;

        if (pluginId in dismissedVersionsByPluginId) {
            settings = {
                ...settings,
                dismissedVersionsByPluginId: {
                    ...settings.dismissedVersionsByPluginId,
                    [pluginId]: {
                        ...settings.dismissedVersionsByPluginId[pluginId],
                        dismissedVersions:
                            filter(
                                settings.dismissedVersionsByPluginId[pluginId].dismissedVersions,
                                (dismissedVersion) =>
                                    dismissedVersion.versionNumber !== versionNumber
                            ) || [],
                    },
                },
            };

            await persistPluginSettings(settings);
        }
    }
);
