import { ComponentMeta, ComponentStory } from '@storybook/react';
import dayjs from 'dayjs';
import React from 'react';
import { PluginUpdateList, PluginViewModel } from './PluginUpdateList';

type Story = ComponentStory<typeof PluginUpdateList>;

const PLUGIN_UPDATE_LIST_BASE = {
    selectedPluginIds: [],
    selectedPluginCount: 0,
    handleToggleSelection: () => {},
    handleToggleSelectAll: () => {},
    handleInstall: () => Promise.resolve(),
    isUpdatingDismissedVersions: false,
    handleClickDismissPluginVersions: () => {},
};

const MOST_RECENTLY_UPDATED_PLUGIN_TIME = dayjs().subtract(32, 'hours');

let pluginId = 10;

const PLUGIN_VIEW_MODEL_BASE: PluginViewModel = {
    id: 'plugin1',
    name: 'Dataview',
    downloads: 12355,
    lastUpdatedTime: MOST_RECENTLY_UPDATED_PLUGIN_TIME,
    githubRepositoryUrl: 'https://github.com/blacksmithgu/obsidian-dataview',
    installedVersionNumber: '0.5.44',
    latestInstallableVersionNumber: '0.5.46',
    latestInstallableVersionIsBeta: false,
    releaseNotes: [
        {
            releaseId: 101,
            versionName: 'Release 0.5.46 (beta)',
            versionNumber: '0.5.46',
            notes: 'Some release notes',
            isBetaVersion: true,
        },
        {
            releaseId: 100,
            versionName: 'Relase 0.5.45',
            versionNumber: '0.5.45',
            notes: 'Some release notes',
            isBetaVersion: true,
        },
    ],
    hasInstallableReleaseAssets: true,
};

export const MixOfPlugins: Story = () => {
    const noReleaseNotes = {
        ...PLUGIN_VIEW_MODEL_BASE,
        id: 'no release notes',
        name: 'No Release Notes',
        lastUpdatedTime: dayjs().subtract(48, 'hours'),
        releaseNotes: [],
        downloads: 32,
    };
    const plugin3 = {
        ...PLUGIN_VIEW_MODEL_BASE,
        id: 'plugin3',
        lastUpdatedTime: dayjs().subtract(72, 'hours'),
        name: 'Plugin 3',
    };
    const plugin4 = {
        ...PLUGIN_VIEW_MODEL_BASE,
        id: 'plugin4',
        lastUpdatedTime: dayjs().subtract(48, 'hours'),
        name: 'Plugin 4',
    };
    return (
        <PluginUpdateList
            plugins={[PLUGIN_VIEW_MODEL_BASE, noReleaseNotes, plugin3, plugin4]}
            {...PLUGIN_UPDATE_LIST_BASE}
        />
    );
};

export const MarkdownParsingAndEnrichment: Story = () => {
    function pluginWithNotes(name: string, notes: string): PluginViewModel {
        return {
            ...PLUGIN_VIEW_MODEL_BASE,
            id: `Plugin ${pluginId++}`,
            name,
            releaseNotes: [
                {
                    releaseId: pluginId++,
                    versionName: '1.2.3 Beta',
                    versionNumber: '1.2.3',
                    notes,
                    isBetaVersion: true,
                },
            ],
        };
    }

    return (
        <PluginUpdateList
            isInitiallyExpanded
            plugins={[
                pluginWithNotes('Dupe version name', '1.2.3 Beta\r\n- Note 1'),
                pluginWithNotes('Dupe version number', '1.2.3\r\n- Note 1'),
                pluginWithNotes(
                    'With links to issues',
                    '- Fixed #123\r\n- Fixed #456 test\r\n- Blocked by [#5703](https://github.com/excalidraw/excalidraw/issues/5703)\r\n- Fixes #789'
                ),
                pluginWithNotes(
                    'Contains HTML',
                    '<html> <head> <style> body { background-color: linen; } h1 { color: maroon; margin-left: 40px; } </style> </head><h2 id="foo" onclick="alert(1)">h2 header</h2><script>alert(1)</script><img width="782" alt="image" src="https://user-images.githubusercontent.com/17691679/202867410-8db3b025-3b16-48ff-958d-17605a84bc1b.png">'
                ),
                pluginWithNotes('Contains emoji', 'fix: 🐛'),
            ]}
            {...PLUGIN_UPDATE_LIST_BASE}
        />
    );
};

export default {
    title: 'PluginUpdateList',
    component: PluginUpdateList,
} as ComponentMeta<typeof PluginUpdateList>;
