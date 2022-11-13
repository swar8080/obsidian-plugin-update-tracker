import { faRotateLeft } from '@fortawesome/free-solid-svg-icons/faRotateLeft';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { PluginManifest } from 'obsidian';
import * as React from 'react';
import styled from 'styled-components';
import { PluginDismissedVersions, PluginSettings } from '../domain/pluginSettings';
import { groupById } from '../domain/util/groupById';
import { semverCompare } from '../domain/util/semverCompare';
import { useAppDispatch, useAppSelector } from '../state';
import { unDismissPluginVersion } from '../state/actionProducers/undismissPluginVersion';

interface DismissedPluginVersionsConnectedProps {
    persistPluginSettings: (settings: PluginSettings) => Promise<void>;
}

const DismissedPluginVersionsConnected: React.FC<DismissedPluginVersionsConnectedProps> = ({
    persistPluginSettings,
}) => {
    const dismissedVersionsByPluginId = useAppSelector(
        (state) => state.obsidian.settings.dismissedVersionsByPluginId
    );
    const isUpdatingDismissedVersions = useAppSelector(
        (state) => state.releases.isUpdatingDismissedVersions
    );
    const pluginManifests = useAppSelector((state) => state.obsidian.pluginManifests);
    const dispatch = useAppDispatch();

    async function handleUndismissVersion(pluginId: string, versionNumber: string) {
        if (!isUpdatingDismissedVersions) {
            return dispatch(
                unDismissPluginVersion({
                    pluginId,
                    versionNumber,
                    persistPluginSettings,
                })
            );
        }
    }

    return (
        <DismissedPluginVersions
            dismissedVersionsByPluginId={dismissedVersionsByPluginId}
            pluginManifests={pluginManifests}
            onClickUndismissVersion={handleUndismissVersion}
        />
    );
};

interface DismissedPluginVersionsProps {
    dismissedVersionsByPluginId: Record<string, PluginDismissedVersions>;
    pluginManifests: PluginManifest[];
    onClickUndismissVersion: (pluginId: string, versionNumber: string) => Promise<any>;
}

const DismissedPluginVersions: React.FC<DismissedPluginVersionsProps> = ({
    dismissedVersionsByPluginId,
    pluginManifests,
    onClickUndismissVersion,
}) => {
    const rows = React.useMemo(() => {
        let denormalizedRows: DismissedVersionRow[] = [];

        const manifestById = groupById(pluginManifests, 'id');

        const pluginIds = Object.keys(dismissedVersionsByPluginId);
        pluginIds
            .filter((pluginId) => pluginId in manifestById)
            .forEach((pluginId) => {
                const pluginDismissedVersions = dismissedVersionsByPluginId[pluginId];

                pluginDismissedVersions.dismissedVersions.forEach((version) =>
                    denormalizedRows.push({
                        pluginId,
                        pluginRepo: pluginDismissedVersions.pluginRepoPath,
                        pluginName: manifestById[pluginId].name,
                        ...version,
                    })
                );
            });

        denormalizedRows = denormalizedRows
            .filter((version) => {
                //only keep newer versions than what's installed
                const installedVersion = manifestById[version.pluginId].version;
                return semverCompare(version.versionNumber, installedVersion) > 0;
            })
            .sort((v1, v2) => {
                if (v1.pluginId !== v2.pluginId) {
                    //list plugins alphabetically
                    return v1.pluginName.localeCompare(v2.pluginName);
                }

                //list newer versions first for the same plugin
                return -v1.publishedAt.localeCompare(v2.publishedAt);
            });

        return denormalizedRows;
    }, [dismissedVersionsByPluginId, pluginManifests]);

    const instructions = `You can hide specific plugin versions from appearing in the plugin icon count and plugin update list, and then unhide them below${
        rows.length > 0 ? ':' : ''
    }`;
    return (
        <div>
            <hr />
            <PDismissedVersionInfo>{instructions}</PDismissedVersionInfo>
            <DivDismissedVersionRows>
                {rows.length > 0 &&
                    rows.map((row) => {
                        const releaseUrl = `https://github.com/${row.pluginRepo}/releases/tag/${row.versionNumber}`;

                        return (
                            <div key={row.pluginId + row.versionNumber}>
                                <SpanUndismissIcon
                                    onClick={() =>
                                        onClickUndismissVersion(row.pluginId, row.versionNumber)
                                    }
                                    aria-label="Restore"
                                    aria-label-position-="top"
                                    className="clickable-icon"
                                >
                                    <FontAwesomeIcon icon={faRotateLeft} size="sm" />
                                </SpanUndismissIcon>
                                <span>{row.pluginName} (</span>
                                <a href={releaseUrl}>{row.versionName}</a>
                                <span>)</span>
                            </div>
                        );
                    })}

                {rows.length === 0 && (
                    <PNoVersionsDismissed>No versions are ignored</PNoVersionsDismissed>
                )}
            </DivDismissedVersionRows>
        </div>
    );
};

type DismissedVersionRow = {
    pluginId: string;
    pluginName: string;
    pluginRepo: string;
    versionName: string;
    versionNumber: string;
    publishedAt: string;
};

const DivDismissedVersionRows = styled.div`
    margin-top: 0.5rem;
`;

const PDismissedVersionInfo = styled.p`
    margin: 0;
`;

const PNoVersionsDismissed = styled.p`
    font-style: italic;
    font-size: var(--font-ui-small);
    margin: 0;
`;

const SpanUndismissIcon = styled.span`
    color: var(--icon-color);
    opacity: var(--icon-opacity);
    cursor: var(--cursor);
    display: inline;
    padding-left: 0.375rem;
`;

export default DismissedPluginVersionsConnected;
