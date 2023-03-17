import { createAsyncThunk } from '@reduxjs/toolkit';
import { NewPluginVersionRequest } from 'oput-common';
import { State } from '..';
import { getReleases } from '../../domain/api';
import { ObsidianState } from '../obsidianReducer';

export const fetchReleases = createAsyncThunk('releases/fetch', async (_: void, thunkAPI) => {
    const state = thunkAPI.getState() as State;
    const obsidianState = state.obsidian as ObsidianState;

    const request: NewPluginVersionRequest = {
        currentPluginVersions: obsidianState.pluginManifests.map((manifest) => ({
            obsidianPluginId: manifest.id,
            version: manifest.version,
        })),
    };

    return await getReleases(request);
});
