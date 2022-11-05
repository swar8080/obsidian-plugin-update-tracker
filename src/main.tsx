import {
    App,
    ItemView,
    Plugin,
    PluginSettingTab,
    requireApiVersion,
    Setting,
    WorkspaceLeaf,
} from 'obsidian';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import DismissedPluginVersions from './components/DismissedPluginVersions';
import PluginUpdateManager from './components/PluginUpdateManager';
import UpdateStatusIcon from './components/UpdateStatusIcon';
import { DEFAULT_PLUGIN_SETTINGS, PluginSettings } from './domain/pluginSettings';
import { RESET_ACTION, store } from './state';
import { fetchReleases } from './state/actionProducers/fetchReleases';
import { syncApp } from './state/actionProducers/syncApp';
import { syncSettings, syncThisPluginId } from './state/obsidianReducer';

export const PLUGIN_UPDATES_MANAGER_VIEW_TYPE = 'swar8080/AVAILABLE_PLUGIN_UPDATES';

const PLUGIN_UPDATE_POLLING_MS =
    parseInt(process.env['OBSIDIAN_APP_RELEASE_POLLING_SECONDS'] || '99999999') * 1000;
const INSTALLED_VERSION_POLLING_MS =
    parseInt(process.env['OBSIDIAN_APP_INSTALLED_VERSION_POLLING_SECONDS'] || '99999999') * 1000;

export default class PluginUpdateCheckerPlugin extends Plugin {
    settings: PluginSettings;
    private statusIconRootComponent: ReactDOM.Root | undefined;

    async onload() {
        this.registerView(
            PLUGIN_UPDATES_MANAGER_VIEW_TYPE,
            (leaf) => new PluginUpdateManagerView(this, leaf)
        );

        //reset the store in-case this plugin was just updated and then reloaded
        store.dispatch(RESET_ACTION);
        store.dispatch(syncThisPluginId(this.manifest.id));

        await this.loadSettings();
        this.pollForInstalledPluginVersions();
        this.pollForPluginReleases();

        this.renderUpdateStatusIcon();

        this.addSettingTab(new PluginUpdateCheckerSettingsTab(this.app, this));
    }

    async loadSettings() {
        const savedSettings = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_PLUGIN_SETTINGS, savedSettings);
        store.dispatch(syncSettings(this.settings));
    }

    async saveSettings(settings: PluginSettings) {
        this.settings = settings;
        await this.saveData(settings);
        store.dispatch(syncSettings(settings));
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

        if (!requireApiVersion('1.0.0')) {
            statusIconEl.style.padding = '0';
            statusIconEl.style.marginLeft = '-0.25rem';
            statusIconEl.style.marginRight = '-0.25rem';
        }

        this.statusIconRootComponent = renderRootComponent(
            statusIconEl,
            <UpdateStatusIcon onClickViewUpdates={() => this.showPluginUpdateManagerView()} />
        );
    }

    async showPluginUpdateManagerView() {
        if (!this.app.workspace.getActiveViewOfType(PluginUpdateManagerView)) {
            this.app.workspace.detachLeavesOfType(PLUGIN_UPDATES_MANAGER_VIEW_TYPE);

            await this.app.workspace.getLeaf(false).setViewState({
                type: PLUGIN_UPDATES_MANAGER_VIEW_TYPE,
                active: true,
            });

            const pluginLeaf = this.app.workspace.getLeavesOfType(
                PLUGIN_UPDATES_MANAGER_VIEW_TYPE
            )[0];
            if (pluginLeaf) {
                this.app.workspace.revealLeaf(pluginLeaf);
            }
        }
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(PLUGIN_UPDATES_MANAGER_VIEW_TYPE);

        if (this.statusIconRootComponent) {
            this.statusIconRootComponent.unmount();
        }
    }
}

class PluginUpdateManagerView extends ItemView {
    private plugin: PluginUpdateCheckerPlugin;
    private rootComponent: ReactDOM.Root | undefined;

    constructor(plugin: PluginUpdateCheckerPlugin, leaf: WorkspaceLeaf) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return PLUGIN_UPDATES_MANAGER_VIEW_TYPE;
    }

    getDisplayText() {
        return 'Plugin Updates';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();

        //@ts-ignore
        const titleEl = this.titleEl as HTMLElement;

        this.rootComponent = renderRootComponent(
            container,
            <PluginUpdateManager
                titleEl={titleEl}
                persistPluginSettings={async (settings) => await this.plugin.saveSettings(settings)}
                closeObsidianTab={() => this.closeThisTab()}
            />
        );
    }

    closeThisTab() {
        this.plugin.app.workspace.detachLeavesOfType(PLUGIN_UPDATES_MANAGER_VIEW_TYPE);
    }

    async onClose() {
        if (this.rootComponent) {
            this.rootComponent.unmount();
        }
    }
}

class PluginUpdateCheckerSettingsTab extends PluginSettingTab {
    private plugin: PluginUpdateCheckerPlugin;
    private dismissedVersionsRootComponent: ReactDOM.Root | undefined;

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
                            const updatedSettings = {
                                ...this.plugin.settings,
                                daysToSuppressNewUpdates: days,
                            };
                            await this.plugin.saveSettings(updatedSettings);
                        }
                    })
            );

        const dismissedPluginVersionsDiv = containerEl.createDiv();
        this.dismissedVersionsRootComponent = renderRootComponent(
            dismissedPluginVersionsDiv,
            <DismissedPluginVersions
                persistPluginSettings={(settings) => this.plugin.saveSettings(settings)}
            />
        );
    }

    hide() {
        if (this.dismissedVersionsRootComponent) {
            this.dismissedVersionsRootComponent.unmount();
        }
    }
}

function renderRootComponent(rootEl: Element, component: JSX.Element): ReactDOM.Root {
    const root = ReactDOM.createRoot(rootEl);
    root.render(<Provider store={store}>{component}</Provider>);
    return root;
}
