import { createSlice } from '@reduxjs/toolkit';
import { PluginReleases } from 'shared-types';
import { fetchReleases } from './actionProducers/fetchReleases';

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
