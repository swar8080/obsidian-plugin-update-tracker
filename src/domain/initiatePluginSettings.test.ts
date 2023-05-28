import initiatePluginSettings from './initiatePluginSettings';
import { DEFAULT_PLUGIN_SETTINGS, PluginSettings } from './pluginSettings';

describe('initiatePluginSettings', () => {
    test('loading plugin for first time with null existing settings uses default settings', () => {
        const settings = initiatePluginSettings(null);

        expect(settings).toEqual(DEFAULT_PLUGIN_SETTINGS);
    });

    test('loading plugin for first time uses default settings', () => {
        const settings = initiatePluginSettings({});

        expect(settings).toEqual(DEFAULT_PLUGIN_SETTINGS);
    });

    test('loading saved settings', () => {
        const savedSettings: PluginSettings = {
            daysToSuppressNewUpdates: DEFAULT_PLUGIN_SETTINGS.daysToSuppressNewUpdates + 1,
            dismissedVersionsByPluginId: {
                plugin1: {
                    pluginId: 'plugin1',
                    pluginRepoPath: 'author/plugin1',
                    dismissedVersions: [],
                },
            },
            showIconOnMobile: !DEFAULT_PLUGIN_SETTINGS.showIconOnMobile,
            excludeBetaVersions: !DEFAULT_PLUGIN_SETTINGS.excludeBetaVersions,
            excludeDisabledPlugins: !DEFAULT_PLUGIN_SETTINGS.excludeDisabledPlugins,
            minUpdateCountToShowIcon: DEFAULT_PLUGIN_SETTINGS.minUpdateCountToShowIcon + 1,
            hoursBetweenCheckingForUpdates:
                DEFAULT_PLUGIN_SETTINGS.hoursBetweenCheckingForUpdates + 1,
        };

        const settings = initiatePluginSettings(savedSettings);

        expect(settings).toEqual(savedSettings);
    });

    describe('migrating hideIconIfNoUpdatesAvailable', () => {
        test('previously showing if no updates available', () => {
            const savedSettings: Partial<PluginSettings> = {
                hideIconIfNoUpdatesAvailable: false,
            };

            const settings = initiatePluginSettings(savedSettings);

            expect(settings.minUpdateCountToShowIcon).toBe(0);
            expect(settings.hideIconIfNoUpdatesAvailable).toBe(false);
        });

        test('previously hiding if no updates available', () => {
            const savedSettings: Partial<PluginSettings> = {
                hideIconIfNoUpdatesAvailable: true,
            };

            const settings = initiatePluginSettings(savedSettings);

            expect(settings.minUpdateCountToShowIcon).toBe(1);
            expect(settings.hideIconIfNoUpdatesAvailable).toBe(true);
        });

        test('ignore hideIconIfNoUpdatesAvailable if minUpdateCountToShowIcon is already populated', () => {
            const savedSettings: Partial<PluginSettings> = {
                hideIconIfNoUpdatesAvailable: true,
                minUpdateCountToShowIcon: 15,
            };

            const settings = initiatePluginSettings(savedSettings);

            expect(settings.minUpdateCountToShowIcon).toBe(15);
            expect(settings.hideIconIfNoUpdatesAvailable).toBe(true);
        });
    });
});
