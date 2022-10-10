import { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { PluginUpdateResult } from 'src/state/obsidianReducer';
import { PluginUpdateProgressTracker } from './PluginUpdateProgressTracker';

type Story = ComponentStory<typeof PluginUpdateProgressTracker>;

const BASE_PLUGIN_UPDATE_PROGRESS_TRACKER = {
    onAcknowledgeResults: () => alert('onAcknowledgeResults'),
};

const MULTIPLE_RESULTS: PluginUpdateResult[] = [
    { pluginName: 'Plugin1', success: false },
    { pluginName: 'Plugin2', success: true },
    { pluginName: 'Plugin3', success: false },
    { pluginName: 'Very Long Plugin Name That Takes Up Lots of Space', success: false },
    { pluginName: 'Medium Length Plugin Name', success: false },
    { pluginName: 'Plugin4', success: false },
    { pluginName: 'Plugin5', success: true },
    { pluginName: 'Plugin6', success: true },
];

export const AllUpdatesInProgress_1Plugin: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={true}
        updateResults={[]}
        numberOfPluginsBeingUpdated={1}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const AllUpdatesInProgress_10Plugins: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={true}
        updateResults={[]}
        numberOfPluginsBeingUpdated={10}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const OneUpdateSuccessful: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={true}
        updateResults={[{ pluginName: 'Plugin1', success: true }]}
        numberOfPluginsBeingUpdated={1}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const OneUpdateFailed: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={true}
        updateResults={[{ pluginName: 'Plugin1', success: false }]}
        numberOfPluginsBeingUpdated={1}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const MultipleResults: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={true}
        updateResults={MULTIPLE_RESULTS}
        numberOfPluginsBeingUpdated={MULTIPLE_RESULTS.length}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export const CompletedWithMultipleResults: Story = () => (
    <PluginUpdateProgressTracker
        isUpdatingPlugins={false}
        updateResults={MULTIPLE_RESULTS}
        numberOfPluginsBeingUpdated={MULTIPLE_RESULTS.length}
        {...BASE_PLUGIN_UPDATE_PROGRESS_TRACKER}
    />
);

export default {
    title: 'PluginUpdateProgressTracker',
    component: PluginUpdateProgressTracker,
} as ComponentMeta<typeof PluginUpdateProgressTracker>;
