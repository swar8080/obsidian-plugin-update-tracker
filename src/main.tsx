import { App, ItemView, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import AvailablePluginUpdates from './components/AvailablePluginUpdates';
import UpdateStatusIcon from './components/UpdateStatusIcon';
import { DEFAULT_PLUGIN_SETTINGS, PluginSettings } from './domain/pluginSettings';
import { store } from './state';
import { fetchReleases } from './state/actionProducers/fetchReleases';
import { syncApp } from './state/actionProducers/syncApp';
import { syncSettings } from './state/obsidianReducer';

const AVAILABLE_PLUGIN_UPDATES_VIEW_TYPE = 'swar8080/AVAILABLE_PLUGIN_UPDATES';

const PLUGIN_UPDATE_POLLING_MS =
    parseInt(process.env['OBSIDIAN_APP_RELEASE_POLLING_SECONDS'] || '99999999') * 1000;
const INSTALLED_VERSION_POLLING_MS =
    parseInt(process.env['OBSIDIAN_APP_INSTALLED_VERSION_POLLING_SECONDS'] || '99999999') * 1000;

export default class PluginUpdateCheckerPlugin extends Plugin {
    settings: PluginSettings;

    async onload() {
        this.registerView(
            AVAILABLE_PLUGIN_UPDATES_VIEW_TYPE,
            (leaf) => new AvailablePluginUpdatesView(leaf)
        );

        await this.loadSettings();
        this.pollForInstalledPluginVersions();
        this.pollForPluginReleases();

        this.renderUpdateStatusIcon();

        this.addSettingTab(new PluginUpdateCheckerSettingsTab(this.app, this));
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(AVAILABLE_PLUGIN_UPDATES_VIEW_TYPE);
    }

    async loadSettings() {
        const savedSettings = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_PLUGIN_SETTINGS, savedSettings);
        store.dispatch(syncSettings(this.settings));
    }

    async saveSettings() {
        await this.saveData(this.settings);
        store.dispatch(syncSettings(this.settings));
    }

    pollForInstalledPluginVersions() {
        store.dispatch(syncApp(this.app));
        this.registerInterval(
            window.setInterval(() => {
                store.dispatch(syncApp(this.app));
            }, INSTALLED_VERSION_POLLING_MS)
        );
    }

    pollForPluginReleases() {
        store.dispatch(fetchReleases());
        this.registerInterval(
            window.setInterval(() => {
                store.dispatch(fetchReleases());
            }, PLUGIN_UPDATE_POLLING_MS)
        );
    }

    renderUpdateStatusIcon() {
        const statusIconEl = this.addStatusBarItem();
        statusIconEl.style.padding = '0';
        statusIconEl.style.marginLeft = '-0.25rem';
        statusIconEl.style.marginRight = '-0.25rem';
        renderRootComponent(
            statusIconEl,
            <UpdateStatusIcon onClickViewUpdates={() => this.showAvailableUpdatesView()} />
        );
    }

    async showAvailableUpdatesView() {
        this.app.workspace.detachLeavesOfType(AVAILABLE_PLUGIN_UPDATES_VIEW_TYPE);

        await this.app.workspace.getLeaf(false).setViewState({
            type: AVAILABLE_PLUGIN_UPDATES_VIEW_TYPE,
            active: true,
        });

        this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(AVAILABLE_PLUGIN_UPDATES_VIEW_TYPE)[0]
        );
    }
}

class AvailablePluginUpdatesView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return AVAILABLE_PLUGIN_UPDATES_VIEW_TYPE;
    }

    getDisplayText() {
        //updated by AvailablePluginUpdates
        return '';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();

        //@ts-ignore
        const titleEl = this.titleEl as HTMLElement;

        renderRootComponent(container, <AvailablePluginUpdates titleEl={titleEl} />);
    }

    async onClose() {}
}

class PluginUpdateCheckerSettingsTab extends PluginSettingTab {
    private plugin: PluginUpdateCheckerPlugin;

    constructor(app: App, plugin: PluginUpdateCheckerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Days until new plugin versions are shown')
            .setDesc('Waiting a few days can help avoid bugs and security issues')
            .addText((text) =>
                text
                    .setValue((this.plugin.settings.daysToSuppressNewUpdates ?? '').toString())
                    .onChange(async (value) => {
                        //allow numbers >= 0 and ''
                        let days = parseInt(value);
                        if (!!value && (isNaN(days) || days < 0)) {
                            days = 0;
                            text.setValue('0');
                        }

                        if (!isNaN(days)) {
                            this.plugin.settings = {
                                ...this.plugin.settings,
                                daysToSuppressNewUpdates: days,
                            };
                            await this.plugin.saveSettings();
                        }
                    })
            );
    }
}

function renderRootComponent(rootEl: Element, component: JSX.Element) {
    const root = ReactDOM.createRoot(rootEl);
    root.render(<Provider store={store}>{component}</Provider>);
}
