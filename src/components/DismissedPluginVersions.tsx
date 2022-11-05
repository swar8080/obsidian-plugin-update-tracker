import isEmpty from 'lodash/isEmpty';
import { PluginManifest } from 'obsidian';
import * as React from 'react';
import { PluginDismissedVersions } from 'src/domain/pluginSettings';
import { groupById } from 'src/domain/util/groupById';
import { useAppSelector } from 'src/state';
import styled from 'styled-components';

const DismissedPluginVersionsConnected: React.FC<{}> = ({}) => {
    const dismissedVersionsByPluginId = useAppSelector(
        (state) => state.obsidian.settings.dismissedVersionsByPluginId
    );
    const pluginManifests = useAppSelector((state) => state.obsidian.pluginManifests);

    return (
        <DismissedPluginVersions
            dismissedVersionsByPluginId={dismissedVersionsByPluginId}
            pluginManifests={pluginManifests}
        />
    );
};

interface DismissedPluginVersionsProps {
    dismissedVersionsByPluginId: Record<string, PluginDismissedVersions>;
    pluginManifests: PluginManifest[];
}

const DismissedPluginVersions: React.FC<DismissedPluginVersionsProps> = ({
    dismissedVersionsByPluginId,
    pluginManifests,
}) => {
    const rows = React.useMemo(() => {
        const denormalizedRows: DismissedVersionRow[] = [];

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

        denormalizedRows.sort((v1, v2) => {
            if (v1.pluginId == v2.pluginId) {
                return -v1.publishedAt.localeCompare(v2.publishedAt);
            }

            return v1.pluginName.localeCompare(v2.pluginName);
        });

        return denormalizedRows;
    }, [dismissedVersionsByPluginId, pluginManifests]);

    if (isEmpty(dismissedVersionsByPluginId)) {
        return null;
    }

    return (
        <DivDismissedPluginVersionContainer>
            <h2>Ignored Plugin Versions</h2>
            {rows.map((row) => {
                const releaseUrl = `https://github.com/${row.pluginRepo}/releases/tag/${row.versionNumber}`;

                return (
                    <DivDismissedVersionRow key={row.pluginId + row.versionNumber}>
                        <span>{row.pluginName} (</span>
                        <a href={releaseUrl}>{row.versionName}</a>
                        <span>)</span>
                        <button>X</button>
                    </DivDismissedVersionRow>
                );
            })}
        </DivDismissedPluginVersionContainer>
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

const DivDismissedPluginVersionContainer = styled.div``;

const DivDismissedVersionRow = styled.div``;

export default DismissedPluginVersionsConnected;
