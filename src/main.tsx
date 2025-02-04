import debounce from 'lodash/debounce';
import {
    AbstractTextComponent,
    App,
    ItemView,
    Platform,
    Plugin,
    PluginSettingTab,
    requireApiVersion,
    Setting,
    TFile,
    WorkspaceLeaf,
} from 'obsidian';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import DismissedPluginVersions from './components/DismissedPluginVersions';
import PluginUpdateManager from './components/PluginUpdateManager';
import RibbonIcon from './components/RibbonIcon';
import UpdateStatusIcon from './components/UpdateStatusIcon';
import initiatePluginSettings from './domain/initiatePluginSettings';
import { DEFAULT_PLUGIN_SETTINGS, PluginSettings } from './domain/pluginSettings';
import { RESET_ACTION, store } from './state';
import { cleanupDismissedPluginVersions } from './state/actionProducers/cleanupDismissedPluginVersions';
import { fetchReleases } from './state/actionProducers/fetchReleases';
import { syncApp } from './state/actionProducers/syncApp';
import { syncSettings, syncThisPluginId } from './state/obsidianReducer';

export const PLUGIN_UPDATES_MANAGER_VIEW_TYPE = 'swar8080/AVAILABLE_PLUGIN_UPDATES';

const INSTALLED_VERSION_POLLING_MS =
    parseInt(process.env['OBSIDIAN_APP_INSTALLED_VERSION_POLLING_SECONDS'] || '99999999') * 1000;

const MIN_RELEASE_POLLING_HOURS = parseFloat(
    process.env['OBSIDIAN_APP_RELEASE_MIN_POLLING_HOURS'] || '0.5'
);
const DEV_POLLING_FREQUENCY_MULTIPLIER = parseInt(
    process.env['OBSIDIAN_APP_POLLING_FREQUENCY_MULTIPLIER'] || '3600000'
);

const SHOW_STATUS_BAR_ICON_ALL_PLATFORMS =
    process.env['OBSIDIAN_APP_SHOW_STATUS_BAR_ICON_ALL_PLATFORMS'] === 'true';
const SHOW_RIBBON_ICON_ALL_PLATFORMS =
    process.env['OBSIDIAN_APP_SHOW_RIBBON_ICON_ALL_PLATFORMS'] === 'true';

export default class PluginUpdateCheckerPlugin extends Plugin {
    settings: PluginSettings;
    private statusBarIconEl: HTMLElement | undefined;
    private statusBarIconRootComponent: ReactDOM.Root | undefined;
    private ribbonIconRootComponent: ReactDOM.Root | undefined;
    private fileOpenCallback: (file: TFile | null) => any;
    private activeLeafChangeCallback: (leaf: WorkspaceLeaf | null) => any;
    private releasePollingIntervalTimerId: number | undefined;

    async onload() {
        this.registerView(
            PLUGIN_UPDATES_MANAGER_VIEW_TYPE,
            (leaf) => new PluginUpdateManagerView(this, leaf)
        );

        //reset the store in-case this plugin was just updated and then reloaded
        store.dispatch(RESET_ACTION);
        store.dispatch(syncThisPluginId(this.manifest.id));

        await this.loadSettings();
        const {
            payload: { enabledPlugins },
        } = await store.dispatch(syncApp(this.app));
        this.pollForInstalledPluginVersions();

        if (this.settings.excludeDisabledPlugins && enabledPlugins?.['lazy-plugin']) {
            setTimeout(async () => {
                // Avoid race conditions checking whether a plugin is enabled. Wait a bit before lazy plugin is done enabling plugins before displaying the filtered update count.
                await store.dispatch(syncApp(this.app));
                store.dispatch(fetchReleases());
            }, 10000);
        } else {
            store.dispatch(fetchReleases());
        }

        this.pollForPluginReleases(this.settings, this.settings.hoursBetweenCheckingForUpdates);

        if (Platform.isDesktop || SHOW_STATUS_BAR_ICON_ALL_PLATFORMS) {
            this.renderStatusBarIcon();
        }
        this.updateRibonIconVisibilty();

        this.addSettingTab(new PluginUpdateCheckerSettingsTab(this.app, this));

        this.closeTabWhenOpeningNewNote();

        //Clean-up previously dismissed versions that are now behind the currently installed version
        store.dispatch(
            cleanupDismissedPluginVersions({
                persistPluginSettings: (settings) => this.saveSettings(settings),
            })
        );
    }

    async loadSettings() {
        const savedSettings = await this.loadData();
        this.settings = initiatePluginSettings(savedSettings);
        store.dispatch(syncSettings(this.settings));
    }

    async saveSettings(settings: PluginSettings) {
        this.settings = settings;
        await this.saveData(settings);
        store.dispatch(syncSettings(settings));
    }

    pollForInstalledPluginVersions() {
        this.registerInterval(
            window.setInterval(() => {
                store.dispatch(syncApp(this.app));
            }, INSTALLED_VERSION_POLLING_MS)
        );
    }

    pollForPluginReleases(settings: PluginSettings, newFrequencyInHours: number) {
        const validatedFrequencyInHours = Math.max(newFrequencyInHours, MIN_RELEASE_POLLING_HOURS);

        if (validatedFrequencyInHours !== this.settings.hoursBetweenCheckingForUpdates) {
            this.saveSettings({
                ...settings,
                hoursBetweenCheckingForUpdates: validatedFrequencyInHours,
            });
        }

        if (this.releasePollingIntervalTimerId !== undefined) {
            clearInterval(this.releasePollingIntervalTimerId);
        }
        const intervalMs = validatedFrequencyInHours * DEV_POLLING_FREQUENCY_MULTIPLIER;
        this.releasePollingIntervalTimerId = this.registerInterval(
            window.setInterval(() => {
                store.dispatch(fetchReleases());
            }, intervalMs)
        );
    }

    renderStatusBarIcon() {
        this.statusBarIconEl = this.addStatusBarItem();

        if (!requireApiVersion('1.0.0')) {
            this.statusBarIconEl.style.padding = '0';
            this.statusBarIconEl.style.marginLeft = '-0.25rem';
            this.statusBarIconEl.style.marginRight = '-0.25rem';
        }

        this.statusBarIconRootComponent = renderRootComponent(
            this.statusBarIconEl,
            <UpdateStatusIcon
                onClickViewUpdates={() => this.showPluginUpdateManagerView()}
                parentEl={this.statusBarIconEl}
            />
        );
    }

    updateRibonIconVisibilty() {
        const isShownOnPlatform = Platform.isMobile || SHOW_RIBBON_ICON_ALL_PLATFORMS;

        if (isShownOnPlatform && this.settings.showIconOnMobile && !this.ribbonIconRootComponent) {
            const root = this.addRibbonIcon('download', 'Plugin Update Tracker', () =>
                this.showPluginUpdateManagerView()
            );
            const child = root.createEl('div');
            this.ribbonIconRootComponent = renderRootComponent(child, <RibbonIcon rootEl={root} />);
        }
    }

    closeTabWhenOpeningNewNote() {
        //solution for desktop
        this.fileOpenCallback = () => {
            if (Platform.isDesktop) {
                this.app.workspace.detachLeavesOfType(PLUGIN_UPDATES_MANAGER_VIEW_TYPE);
            }
        };
        app.workspace.on('file-open', this.fileOpenCallback);

        //solution for mobile
        this.activeLeafChangeCallback = (leaf) => {
            if (!(leaf?.view instanceof PluginUpdateManagerView) && Platform.isMobile) {
                //On mobile, remove the leaf when opening a new note
                this.app.workspace.detachLeavesOfType(PLUGIN_UPDATES_MANAGER_VIEW_TYPE);
            }
        };
        app.workspace.on('active-leaf-change', this.activeLeafChangeCallback);
    }

    async showPluginUpdateManagerView() {
        if (!this.app.workspace.getActiveViewOfType(PluginUpdateManagerView)) {
            this.app.workspace.detachLeavesOfType(PLUGIN_UPDATES_MANAGER_VIEW_TYPE);

            // Get the latest plugin state which may have recently changed (ex: after lazy-plugin finishes lazy enablement)
            await store.dispatch(syncApp(this.app));

            //Desktop opens in new tab, mobile replaces the current note/tab
            const newLeafPaneType = Platform.isMobile ? false : 'tab';
            await this.app.workspace.getLeaf(newLeafPaneType).setViewState({
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

        if (this.statusBarIconRootComponent) {
            this.statusBarIconRootComponent.unmount();
        }
        if (this.ribbonIconRootComponent) {
            this.ribbonIconRootComponent.unmount();
        }

        this.app.workspace.off('file-open', this.fileOpenCallback);
        this.app.workspace.off('active-leaf-change', this.activeLeafChangeCallback);
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

        containerEl.createEl('h2', { text: 'Plugin Update Filters' });
        new Setting(containerEl)
            .setName('Days until new plugin versions are shown')
            .setDesc('Waiting a few days can help avoid bugs and security issues')
            .addText((text) =>
                text
                    .setValue((this.plugin.settings.daysToSuppressNewUpdates ?? '').toString())
                    .onChange((value) =>
                        handleNonNegativeNumericTextSettingChange(value, text, async (days) => {
                            const updatedSettings = {
                                ...this.plugin.settings,
                                daysToSuppressNewUpdates: days,
                            };
                            await this.plugin.saveSettings(updatedSettings);
                        })
                    )
            );
        new Setting(containerEl)
            .setName('Ignore Beta Versions')
            .setDesc(
                'Plugin beta versions are less stable but allow trying out new features sooner'
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.excludeBetaVersions)
                    .onChange(async (excludeBetaVersions) => {
                        const settings = {
                            ...this.plugin.settings,
                            excludeBetaVersions,
                        };
                        await this.plugin.saveSettings(settings);
                    })
            );
        new Setting(containerEl).setName('Ignore Updates to Disabled Plugins').addToggle((toggle) =>
            toggle
                .setValue(this.plugin.settings.excludeDisabledPlugins)
                .onChange(async (excludeDisabledPlugins) => {
                    const settings = {
                        ...this.plugin.settings,
                        excludeDisabledPlugins,
                    };
                    await this.plugin.saveSettings(settings);
                })
        );

        containerEl.createEl('h2', { text: 'Appearance' });
        new Setting(containerEl)
            .setName('Minimum update count to show plugin icon')
            .setDesc(
                'Hide the plugin icon if there are fewer than this many plugin updates available (unless this plugin has updates)'
            )
            .addText((text) =>
                text
                    .setValue(
                        (
                            this.plugin.settings.minUpdateCountToShowIcon ??
                            DEFAULT_PLUGIN_SETTINGS.minUpdateCountToShowIcon
                        ).toString()
                    )
                    .onChange((value) =>
                        handleNonNegativeNumericTextSettingChange(
                            value,
                            text,
                            async (minUpdateCountToShowIcon) => {
                                const updatedSettings = {
                                    ...this.plugin.settings,
                                    minUpdateCountToShowIcon,
                                };
                                await this.plugin.saveSettings(updatedSettings);
                            }
                        )
                    )
            );

        new Setting(containerEl)
            .setName('Hours between checking for new plugin updates')
            .setDesc('Check for updates when obsidian starts and whenever this many hours passes')
            .addSlider((slider) =>
                slider
                    .setValue(this.plugin.settings.hoursBetweenCheckingForUpdates)
                    .setLimits(MIN_RELEASE_POLLING_HOURS, 24, 0.5)
                    .onChange(
                        debounce(
                            (hours) =>
                                this.plugin.pollForPluginReleases(this.plugin.settings, hours),
                            500
                        )
                    )
                    .setDynamicTooltip()
            );
        new Setting(containerEl)
            .setName('Show on Mobile')
            .setDesc(
                'Adds a ribbon action icon to mobile whenever updates are available. Note that the update count is not currently shown.'
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showIconOnMobile)
                    .onChange(async (showIconOnMobile) => {
                        await this.plugin.saveSettings({
                            ...this.plugin.settings,
                            showIconOnMobile,
                        });
                        this.plugin.updateRibonIconVisibilty();
                    })
            );
        containerEl.createEl('a', { text: 'View CSS Snippet selector list' }, (a) => {
            a.href =
                'https://github.com/swar8080/obsidian-plugin-update-tracker#custom-css-snippets';
            a.style.fontSize = 'var(--font-smallest)';
        });

        containerEl.createEl('h2', { text: 'Restore Ignored Plugin Versions' });
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

async function handleNonNegativeNumericTextSettingChange(
    value: string,
    textInput: AbstractTextComponent<any>,
    onNumberChange: (numericValue: number) => Promise<void>
) {
    let numValue = parseInt(value);
    if (!!value && (isNaN(numValue) || numValue < 0)) {
        numValue = 0;
        textInput.setValue('0');
    }

    if (!isNaN(numValue)) {
        await onNumberChange(numValue);
    }
}
