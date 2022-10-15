import { faClock } from '@fortawesome/free-regular-svg-icons/faClock';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown';
import { faCaretRight } from '@fortawesome/free-solid-svg-icons/faCaretRight';
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';
import InstalledPluginReleases from '../domain/InstalledPluginReleases';
import enrichReleaseNotes from '../domain/releaseNoteEnricher';
import { countSelectedPlugins } from '../domain/util/countSelectedPlugins';
import { useAppDispatch, useAppSelector } from '../state';
import { updatePlugins } from '../state/actionProducers/updatePlugins';
import { togglePluginSelection, toggleSelectAllPlugins } from '../state/obsidianReducer';
import usePluginReleaseFilter from './hooks/usePluginReleaseFilter';
import SelectedPluginActionBar from './SelectedPluginActionBar';
dayjs.extend(relativeTime);

interface PluginUpdateListProps {
    titleEl: HTMLElement | undefined;
}

const PluginUpdateListConnected: React.FC<PluginUpdateListProps> = ({ titleEl }) => {
    const allPluginReleases: InstalledPluginReleases[] = usePluginReleaseFilter();
    const selectedPluginsById = useAppSelector((state) => state.obsidian.selectedPluginsById);
    const selectedPluginCount = useAppSelector(countSelectedPlugins);
    const dispatch = useAppDispatch();

    React.useEffect(() => {
        let titleText = 'Available Plugin Updates';
        if (allPluginReleases.length > 0) {
            titleText = titleText + ` (${allPluginReleases.length})`;
        }

        if (titleEl) {
            titleEl.innerText = titleText;
        }
    }, [titleEl, allPluginReleases.length]);

    function handleToggleSelection(pluginId: string, selected: boolean) {
        dispatch(togglePluginSelection({ pluginId, selected }));
    }

    function handleToggleSelectAll(selectAll: boolean) {
        const visiblePluginIds = allPluginReleases.map((release) => release.getPluginId());
        dispatch(toggleSelectAllPlugins({ select: selectAll, pluginIds: visiblePluginIds }));
    }

    function handleClickInstall(): Promise<any> {
        return dispatch(updatePlugins());
    }

    const plugins: PluginViewModel[] = React.useMemo(
        () =>
            allPluginReleases.map((pluginReleases) => ({
                id: pluginReleases.getPluginId(),
                name: pluginReleases.getPluginName(),
                lastUpdatedTime: pluginReleases.getLatestUpdateTime(),
                downloads: pluginReleases.getLatestDownloads(),
                githubRepositoryUrl: pluginReleases.getPluginRepositoryUrl(),
                installedVersionNumber: pluginReleases.getInstalledVersionNumber(),
                latestInstallableVersionNumber: pluginReleases.getLatestVersionNumber(),
                releaseNotes: pluginReleases.getUninstalledNewReleases(true).map((release) => ({
                    releaseId: release.releaseId,
                    versionName: release.versionName,
                    versionNumber: release.versionNumber,
                    notes: release.notes,
                })),
                hasInstallableReleaseAssets: !!pluginReleases.getLatestReleaseAssetIds(),
            })),
        [allPluginReleases]
    );

    return (
        <PluginUpdateList
            plugins={plugins}
            selectedPluginCount={selectedPluginCount}
            selectedPluginsById={selectedPluginsById}
            handleToggleSelection={handleToggleSelection}
            handleToggleSelectAll={handleToggleSelectAll}
            handleInstall={handleClickInstall}
        />
    );
};

export const PluginUpdateList: React.FC<{
    plugins: PluginViewModel[];
    isInitiallyExpanded?: boolean;
    selectedPluginsById: Record<string, boolean>;
    selectedPluginCount: number;
    handleToggleSelection: (pluginId: string, selected: boolean) => any;
    handleToggleSelectAll: (selectAll: boolean) => void;
    handleInstall: () => Promise<any>;
}> = ({
    plugins,
    isInitiallyExpanded,
    selectedPluginsById,
    selectedPluginCount,
    handleToggleSelection,
    handleToggleSelectAll,
    handleInstall,
}) => {
    const sortedAndFormattedPluginData = React.useMemo(
        () =>
            plugins
                .sort((p1, p2) =>
                    //More recently updated first
                    dayjs(p1.lastUpdatedTime || 0) > dayjs(p2.lastUpdatedTime || 0) ? -1 : 1
                )
                .map((plugin) => ({
                    ...plugin,
                    releaseNotes: plugin.releaseNotes.map((releaseNote) => ({
                        ...releaseNote,
                        notes: enrichReleaseNotes(
                            releaseNote.notes,
                            releaseNote.versionName,
                            releaseNote.versionNumber,
                            plugin.githubRepositoryUrl
                        ),
                    })),
                })),
        [plugins]
    );

    function handleToggleSelectedClicked(pluginId: string, e: React.SyntheticEvent) {
        const checkbox = e.target as HTMLInputElement;
        handleToggleSelection(pluginId, checkbox.checked);
    }

    function handleClickInstall() {
        handleInstall();
    }

    function handleClickSelectAll(e: React.SyntheticEvent) {
        const checkbox = e.target as HTMLInputElement;
        handleToggleSelectAll(checkbox.checked);
    }

    const isSelectAllChecked = selectedPluginCount === plugins.length;

    return (
        <>
            {plugins.length > 1 && (
                <DivSelectAll>
                    <input
                        type="checkbox"
                        onClick={handleClickSelectAll}
                        checked={isSelectAllChecked}
                        title={isSelectAllChecked ? 'Deselect All' : 'Select All'}
                    />
                </DivSelectAll>
            )}
            <DivPluginUpdateListContainer>
                {sortedAndFormattedPluginData.map((plugin) => (
                    <PluginUpdates
                        plugin={plugin}
                        key={plugin.id}
                        isInitiallyExpanded={plugins.length === 1 || !!isInitiallyExpanded}
                        selectable={plugin.hasInstallableReleaseAssets}
                        selected={!!selectedPluginsById[plugin.id]}
                        onToggleSelectedClicked={(e) => handleToggleSelectedClicked(plugin.id, e)}
                    />
                ))}
            </DivPluginUpdateListContainer>

            {selectedPluginCount > 0 && (
                <ActionBarContainer>
                    <SelectedPluginActionBar
                        numberOfPluginsSelected={selectedPluginCount}
                        onClickInstall={handleClickInstall}
                    />
                </ActionBarContainer>
            )}
        </>
    );
};

export type PluginViewModel = {
    id: string;
    name: string;
    lastUpdatedTime?: dayjs.Dayjs;
    downloads: number;
    githubRepositoryUrl: string;
    installedVersionNumber: string;
    latestInstallableVersionNumber: string;
    releaseNotes: {
        releaseId: number;
        versionName: string;
        versionNumber: string;
        notes: string;
    }[];
    hasInstallableReleaseAssets: boolean;
};

const PluginUpdates: React.FC<{
    plugin: PluginViewModel;
    isInitiallyExpanded: boolean;
    selectable: boolean;
    selected: boolean;
    onToggleSelectedClicked: (e: React.SyntheticEvent) => void;
}> = ({ plugin, isInitiallyExpanded, selected, onToggleSelectedClicked }) => {
    const [isReleaseNotesExpanded, setIsReleaseNotesExpanded] = React.useState(isInitiallyExpanded);
    const hasReleaseNotes =
        find(plugin.releaseNotes, (releaseNote) => !isEmpty(releaseNote.notes)) != null;

    const downloadsText = `${plugin.downloads.toLocaleString()} Downloads`;
    const isLastUpdatedTimeKnown = !!plugin.lastUpdatedTime;
    const lastUpdatedText = `Updated ${plugin.lastUpdatedTime?.fromNow()}`;
    const gitDiffUrl = `${plugin.githubRepositoryUrl}/compare/${plugin.installedVersionNumber}...${plugin.latestInstallableVersionNumber}#files_bucket`;

    return (
        <DivPluginUpdateContainer>
            <DivPluginUpdateHeaderContainer>
                <H2PluginName>{`${plugin.name} (${plugin.latestInstallableVersionNumber})`}</H2PluginName>
                <DivSelectPluginContainer>
                    <input type="checkbox" checked={selected} onChange={onToggleSelectedClicked} />
                </DivSelectPluginContainer>
            </DivPluginUpdateHeaderContainer>
            <DivReleaseSummaryContainer>
                {isLastUpdatedTimeKnown && (
                    <DivLastUpdated
                        title={`${
                            plugin.latestInstallableVersionNumber
                        } code last updated ${plugin.lastUpdatedTime?.fromNow()}`}
                    >
                        <FontAwesomeIcon icon={faClock} />
                        <span>{lastUpdatedText}</span>
                    </DivLastUpdated>
                )}
                <DivDownloaded
                    title={`${plugin.downloads.toLocaleString()} downloads of ${
                        plugin.latestInstallableVersionNumber
                    }`}
                >
                    <FontAwesomeIcon icon={faDownload} />
                    <span>{downloadsText}</span>
                </DivDownloaded>
                <DivGitDiff>
                    <a href={gitDiffUrl} target="_blank" title="View Changes on Github">
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                        <span>Code Changes</span>
                    </a>
                </DivGitDiff>
            </DivReleaseSummaryContainer>
            <DivReleaseNotesContainer>
                <DivExpandNotesContainer hasReleaseNotes={hasReleaseNotes}>
                    <FontAwesomeIcon
                        icon={isReleaseNotesExpanded ? faCaretDown : faCaretRight}
                        onClick={() => setIsReleaseNotesExpanded(!isReleaseNotesExpanded)}
                        title={isReleaseNotesExpanded ? 'Hide Release Notes' : 'Show Release Notes'}
                        size="2x"
                    />
                </DivExpandNotesContainer>
                <DivReleaseNotes>
                    {isReleaseNotesExpanded &&
                        plugin.releaseNotes.map((release) => (
                            <DivReleaseNote key={release.releaseId}>
                                <DivReleaeseName>{release.versionName}</DivReleaeseName>
                                <DivReleaseNoteText>
                                    <ReactMarkdown>{release.notes}</ReactMarkdown>
                                </DivReleaseNoteText>
                            </DivReleaseNote>
                        ))}
                    {!isReleaseNotesExpanded && (
                        <DivVersionChange>{`${plugin.installedVersionNumber} → ${plugin.latestInstallableVersionNumber}`}</DivVersionChange>
                    )}
                </DivReleaseNotes>
            </DivReleaseNotesContainer>
        </DivPluginUpdateContainer>
    );
};

const BORDER_WIDTH = '2px';
const BORDER = `${BORDER_WIDTH} var(--background-modifier-border) solid`;

const DivPluginUpdateListContainer = styled.div`
    display: flex;
    flex-direction: column;

    > * {
        margin-bottom: 1rem;
    }

    background-color: var(--background-primary);
    color: var(--text-normal);
`;

const DivSelectAll = styled.div`
    display: flex;
    justify-content: flex-end;

    border: ${BORDER_WIDTH} transparent solid;
    padding-bottom: 0.25rem;
    padding-right: 0.25rem;
    input {
        margin: 0;
    }
`;

const DivPluginUpdateContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;

    margin-left: 0.25rem;
    padding-bottom: 0.25rem;
    border: ${BORDER};
    border-radius: 0.25rem;
`;

const DivPluginUpdateHeaderContainer = styled.div`
    display: flex;
    flex-direction: row;

    border-bottom: ${BORDER};
`;

const H2PluginName = styled.h2`
    flex-grow: 1;
    text-align: center;

    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
    padding-bottom: 0.5rem;
`;

const DivSelectPluginContainer = styled.div`
    padding-top: 0.25rem;
    padding-right: 0.25rem;
    input {
        margin: 0;
    }
`;

const DivReleaseSummaryContainer = styled.div`
    display: flex;
    flex-direction: row;
    padding-top: 0.35rem;
    padding-bottom: 0.7rem;
    border-bottom: ${BORDER};

    > * {
        flex-grow: 1;
        display: flex;
        justify-content: center;

        border-right: ${BORDER};
        :last-child {
            border-right: none;
        }
    }

    svg {
        padding-right: 0.35rem;
    }
`;

const DivLastUpdated = styled.div`
    svg {
        position: relative;
        top: 0.25rem;
    }
`;

const DivDownloaded = styled.div`
    svg {
        position: relative;
        top: 0.12rem;
    }
`;

const DivGitDiff = styled.div`
    cursor: pointer;

    span {
        color: var(--text-normal);
    }

    a {
        text-decoration: none;
    }

    span:hover {
        color: var(--text-accent);
        text-decoration: underline;
    }
`;

const DivReleaseNotesContainer = styled.div`
    padding-top: 0.75rem;
    margin: 0.35rem;
    display: flex;
    background-color: var(--background-primary-alt);
    border-radius: 0.25rem;
`;

const DivExpandNotesContainer = styled.div<{ hasReleaseNotes: boolean }>`
    width: 1.25rem;
    margin-left: 1rem;
    margin-right: 0.5rem;

    svg {
        position: relative;
        bottom: 0.25rem;
        cursor: pointer;

        visibility: ${({ hasReleaseNotes }) => (hasReleaseNotes ? 'visible' : 'hidden')};
    }

    svg:hover {
        color: var(--interactive-accent-hover);
    }
`;

const DivReleaseNotes = styled.div`
    display: flex;
    flex-direction: column;
`;

const DivReleaseNote = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
`;

const DivVersionChange = styled.div`
    font-size: 1.5rem;
    font-weight: bold;
`;

const DivReleaeseName = styled.div`
    font-size: 1.75rem;
    font-weight: bold;
    text-decoration: underline;
`;

const ActionBarContainer = styled.div`
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);

    @keyframes slideInFromRight {
        0% {
            left: 200%;
        }
        100% {
            left: 50%;
        }
    }
    animation-name: slideInFromRight;
    animation-duration: 0.5s;
    animation-timing-function: ease-in-out;
`;

const DivReleaseNoteText = styled.div``;

export default PluginUpdateListConnected;
