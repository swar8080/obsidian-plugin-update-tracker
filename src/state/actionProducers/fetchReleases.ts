import { createAsyncThunk } from '@reduxjs/toolkit';
import { NewPluginVersionRequest } from 'shared-types';
import { State } from '..';
import { getReleases } from '../../domain/api';

export const fetchReleases = createAsyncThunk('releases/fetch', async (_: void, thunkAPI) => {
    const state = thunkAPI.getState() as State;

    const request: NewPluginVersionRequest = {
        currentPluginVersions: state.obsidian.pluginManifests.map((manifest) => ({
            obsidianPluginId: manifest.id,
            version: manifest.version,
        })),
    };

    return await getReleases(request);
});
