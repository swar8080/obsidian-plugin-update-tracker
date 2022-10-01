import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { NewPluginVersionRequest, PluginReleases } from 'shared-types';
import releaseApi from '../domain/releaseApi';
import { State } from './index';

type ReleaseState = {
    isLoadingReleases: boolean;
    isErrorLoadingReleases: boolean;
    releases: PluginReleases[];
};

const DEFAULT_STATE: ReleaseState = {
    isLoadingReleases: false,
    isErrorLoadingReleases: false,
    releases: [],
};

export const fetchReleases = createAsyncThunk('releases/fetch', async (_: void, thunkAPI) => {
    const state = thunkAPI.getState() as State;

    const request: NewPluginVersionRequest = {
        currentPluginVersions: state.obsidian.pluginManifests.map((manifest) => ({
            obsidianPluginId: manifest.id,
            version: manifest.version,
        })),
    };

    return await releaseApi(request);
});

const releaseReducer = createSlice({
    name: 'release',
    initialState: DEFAULT_STATE,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchReleases.pending, (state) => {
                state.isLoadingReleases = true;
            })
            .addCase(fetchReleases.fulfilled, (state, action) => {
                state.releases = action.payload;
                state.isLoadingReleases = false;
                state.isErrorLoadingReleases = false;
            })
            .addCase(fetchReleases.rejected, (state) => {
                state.isLoadingReleases = false;
                state.isErrorLoadingReleases = true;
            });
    },
});

export default releaseReducer.reducer;
