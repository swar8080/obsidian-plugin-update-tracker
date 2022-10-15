import { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { PluginUpdateResult } from 'src/state/obsidianReducer';
import { PluginUpdateProgressTracker } from './PluginUpdateProgressTracker';

type Story = ComponentStory<typeof PluginUpdateProgressTracker>;

const BASE_PLUGIN_UPDATE_PROGRESS_TRACKER = {
    onAcknowledgeResults: () => alert('onAcknowledgeResults'),
};

const MULTIPLE_RESULTS: PluginUpdateResult[] = [
    { pluginName: 'Plugin1', status: 'failure', pluginId: 'plugin_id' },
    { pluginName: 'Plugin2', status: 'success', pluginId: 'plugin_id' },
    { pluginName: 'Plugin3', status: 'failure', pluginId: 'plugin_id' },
    {
        pluginName: 'Very Long Plugin Name That Takes Up Lots of Space',
        status: 'failure',
        pluginId: 'plugin_id',
    },
    { pluginName: 'Medium Length Plugin Name', status: 'failure', pluginId: 'plugin_id' },
    { pluginName: 'Plugin4', status: 'failure', pluginId: 'plugin_id' },
    { pluginName: 'Plugin5', status: 'success', pluginId: 'plugin_id' },
    { pluginName: 'Plugin6', status: 'success', pluginId: 'plugin_id' },
    { pluginName: 'Plugin7', status: 'loading', pluginId: 'plugin_id' },
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
        updateResults={[{ pluginName: 'Plugin1', status: 'success', pluginId: 'plugin_id' }]}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const OneUpdateFailed: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={true}
        updateResults={[{ pluginName: 'Plugin1', status: 'failure', pluginId: 'plugin_id' }]}
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
        updateResults={[{ pluginName: 'Plugin1', status: 'success', pluginId: 'plugin_id' }]}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const CompletedSuccessfullyMultiplePlugins: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={false}
        updateResults={[
            { pluginName: 'Plugin1', status: 'success', pluginId: 'plugin_id' },
            { pluginName: 'Plugin2', status: 'success', pluginId: 'plugin_id' },
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
