import { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { PluginUpdateResult } from 'src/state/obsidianReducer';
import { PluginUpdateProgressTracker } from './PluginUpdateProgressTracker';

type Story = ComponentStory<typeof PluginUpdateProgressTracker>;

const BASE_PLUGIN_UPDATE_PROGRESS_TRACKER = {
    onAcknowledgeResults: () => alert('onAcknowledgeResults'),
};

const MULTIPLE_RESULTS: PluginUpdateResult[] = [
    { pluginName: 'Plugin1', status: 'failure' },
    { pluginName: 'Plugin2', status: 'success' },
    { pluginName: 'Plugin3', status: 'failure' },
    { pluginName: 'Very Long Plugin Name That Takes Up Lots of Space', status: 'failure' },
    { pluginName: 'Medium Length Plugin Name', status: 'failure' },
    { pluginName: 'Plugin4', status: 'failure' },
    { pluginName: 'Plugin5', status: 'success' },
    { pluginName: 'Plugin6', status: 'success' },
    { pluginName: 'Plugin7', status: 'loading' },
];

export const AllUpdatesInProgress_1Plugin: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={true}
        updateResults={[]}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const AllUpdatesInProgress_10Plugins: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={true}
        updateResults={[]}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const OneUpdateSuccessful: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={true}
        updateResults={[{ pluginName: 'Plugin1', status: 'success' }]}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const OneUpdateFailed: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={true}
        updateResults={[{ pluginName: 'Plugin1', status: 'failure' }]}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const MultipleResults: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={true}
        updateResults={MULTIPLE_RESULTS}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const CompletedSuccessfullyOnePlugin: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={false}
        updateResults={[{ pluginName: 'Plugin1', status: 'success' }]}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const CompletedSuccessfullyMultiplePlugins: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={false}
        updateResults={[
            { pluginName: 'Plugin1', status: 'success' },
            { pluginName: 'Plugin2', status: 'success' },
        ]}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const CompletedWithMultipleResults: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={false}
        updateResults={MULTIPLE_RESULTS}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export default {
    title: 'PluginUpdateProgressTracker',
    component: PluginUpdateProgressTracker,
} as ComponentMeta<typeof PluginUpdateProgressTracker>;
