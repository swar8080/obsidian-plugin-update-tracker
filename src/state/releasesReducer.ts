import { createSlice } from '@reduxjs/toolkit';
import { PluginReleases } from 'shared-types';
import { dismissSelectedPluginVersions } from './actionProducers/dismissPluginVersions';
import { fetchReleases } from './actionProducers/fetchReleases';

export type ReleaseState = {
    isLoadingReleases: boolean;
    isErrorLoadingReleases: boolean;
    releases: PluginReleases[];
    isUpdatingDismissedVersions: boolean;
};

const DEFAULT_STATE: ReleaseState = {
    isLoadingReleases: false,
    isErrorLoadingReleases: false,
    releases: [],
    isUpdatingDismissedVersions: false,
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
            })
            .addCase(dismissSelectedPluginVersions.pending, (state) => {
                state.isUpdatingDismissedVersions = true;
            })
            .addCase(dismissSelectedPluginVersions.fulfilled, (state) => {
                state.isUpdatingDismissedVersions = false;
            })
            .addCase(dismissSelectedPluginVersions.rejected, (state) => {
                state.isUpdatingDismissedVersions = false;
            });
    },
});

export default releaseReducer.reducer;
