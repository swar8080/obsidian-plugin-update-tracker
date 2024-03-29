import { createAsyncThunk } from '@reduxjs/toolkit';

import { State } from '..';
import { semverCompare } from '../../../oput-common/semverCompare';
import { PluginDismissedVersions, PluginSettings } from '../../domain/pluginSettings';
import { groupById } from '../../domain/util/groupById';

type Paramters = {
    persistPluginSettings: (settings: PluginSettings) => Promise<void>;
};

export const cleanupDismissedPluginVersions = createAsyncThunk(
    'releases/cleanupDismissedPluginVersions',
    async (params: Paramters, thunkAPI) => {
        try {
            const state = thunkAPI.getState() as State;

            const manifests = state.obsidian.pluginManifests;
            const manifestById = groupById(manifests, 'id');

            const settings = state.obsidian.settings;
            const cleanedSettings: PluginSettings = {
                ...settings,
                dismissedVersionsByPluginId: Object.keys(
                    settings.dismissedVersionsByPluginId
                ).reduce((combined, pluginId) => {
                    const cleanedDismissedVersions: PluginDismissedVersions = {
                        ...settings.dismissedVersionsByPluginId[pluginId],
                        dismissedVersions: settings.dismissedVersionsByPluginId[
                            pluginId
                        ].dismissedVersions.filter((dismissedVersion) => {
                            const installedVersion = manifestById[pluginId]?.version;
                            return (
                                !installedVersion ||
                                semverCompare(dismissedVersion.versionNumber, installedVersion) > 0
                            );
                        }),
                    };

                    combined[pluginId] = cleanedDismissedVersions;

                    return combined;
                }, {} as Record<string, PluginDismissedVersions>),
            };

            await params.persistPluginSettings(cleanedSettings);
        } catch (err) {
            console.error('Error cleaning up dismissed plugin versions', err);
        }
    }
);
