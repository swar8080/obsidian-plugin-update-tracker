import { createAsyncThunk } from '@reduxjs/toolkit';

import { PluginDismissedVersions, PluginSettings } from 'src/domain/pluginSettings';
import { groupById } from 'src/domain/util/groupById';
import { semverCompare } from 'src/domain/util/semverCompare';
import { State } from '..';

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
                            const installedVersion = manifestById[pluginId].version;
                            return (
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
