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
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import styled from 'styled-components';
import { visit } from 'unist-util-visit';
import InstalledPluginReleases from '../domain/InstalledPluginReleases';
import { PluginSettings } from '../domain/pluginSettings';
import enrichReleaseNotes from '../domain/releaseNoteEnricher';
import { groupById } from '../domain/util/groupById';
import { useAppDispatch, useAppSelector } from '../state';
import {
    dismissSelectedPluginVersions,
    PluginVersionsToDismiss,
} from '../state/actionProducers/dismissPluginVersions';
import { updatePlugins } from '../state/actionProducers/updatePlugins';
import { togglePluginSelection, toggleSelectAllPlugins } from '../state/obsidianReducer';
import { countSelectedPlugins } from '../state/selectors/countSelectedPlugins';
import { getSelectedPluginIds } from '../state/selectors/getSelectedPluginIds';
import { NewTextFadeInThenOutAnimation } from './common/NewTextFadeOutThenInAnimation';
import usePluginReleaseFilter from './hooks/usePluginReleaseFilter';
import SelectedPluginActionBar from './SelectedPluginActionBar';
dayjs.extend(relativeTime);

interface PluginUpdateListProps {
    titleEl: HTMLElement | undefined;
    persistPluginSettings: (settings: PluginSettings) => Promise<void>;
    closeObsidianTab: () => void;
    actionBarLocation: ActionBarLocation;
}

type ActionBarLocation = 'bottom' | 'middle';

const PluginUpdateListConnected: React.FC<PluginUpdateListProps> = ({
    titleEl,
    persistPluginSettings,
    closeObsidianTab,
    actionBarLocation,
}) => {
    const allPluginReleases: InstalledPluginReleases[] = usePluginReleaseFilter();
    const isLoadingReleases = useAppSelector((state) => state.releases.isLoadingReleases);
    const enabledPlugins = useAppSelector((state) => state.obsidian.enabledPlugins) || {};
    const selectedPluginsById = useAppSelector(getSelectedPluginIds);
    const selectedPluginCount = useAppSelector(countSelectedPlugins);
    const isUpdatingDismissedVersions = useAppSelector(
        (state) => state.releases.isUpdatingDismissedVersions
    );
    const dispatch = useAppDispatch();

    React.useEffect(() => {
        if (!isLoadingReleases && allPluginReleases.length === 0) {
            closeObsidianTab();
        }
    }, [isLoadingReleases, allPluginReleases]);

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
        const visiblePluginVersionsById = allPluginReleases.reduce((combined, next) => {
            //getLatestVersionNumber is the latest version that isn't ignored or filtered-out
            combined[next.getPluginId()] = next.getLatestVersionNumber();
            return combined;
        }, {} as Record<string, string>);

        return dispatch(updatePlugins({ visiblePluginVersionsById }));
    }

    async function handleDismissPluginVersions(): Promise<void> {
        const installedById = groupById(allPluginReleases, (release) => release.getPluginId());
        const selectedPluginVersions: PluginVersionsToDismiss = selectedPluginsById.map(
            (pluginId) => ({
                pluginId,
                pluginVersionNumber: installedById[pluginId].getLatestVersionNumber(),
                isLastAvailableVersion: installedById[pluginId].getReleaseVersions().length <= 1,
            })
        );

        await dispatch(
            dismissSelectedPluginVersions({
                pluginVersionsToDismiss: selectedPluginVersions,
                persistPluginSettings,
            })
        );
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
                latestInstallableVersionIsBeta: pluginReleases.isLatestVersionABetaVersion(),
                releaseNotes: pluginReleases.getReleaseVersions().map((release) => ({
                    releaseId: release.releaseId,
                    versionName: release.versionName,
                    versionNumber: release.versionNumber,
                    notes: release.notes,
                    isBetaVersion: release.isBetaVersion,
                })),
                hasInstallableReleaseAssets: !!pluginReleases.getLatestReleaseAssetIds(),
                isPluginEnabled:
                    pluginReleases.getPluginId() in enabledPlugins &&
                    enabledPlugins[pluginReleases.getPluginId()],
            })),
        [allPluginReleases]
    );

    return (
        <PluginUpdateList
            plugins={plugins}
            selectedPluginCount={selectedPluginCount}
            selectedPluginIds={selectedPluginsById}
            isUpdatingDismissedVersions={isUpdatingDismissedVersions}
            actionBarLocation={actionBarLocation}
            handleToggleSelection={handleToggleSelection}
            handleToggleSelectAll={handleToggleSelectAll}
            handleInstall={handleClickInstall}
            handleClickDismissPluginVersions={handleDismissPluginVersions}
        />
    );
};

export const PluginUpdateList: React.FC<{
    plugins: PluginViewModel[];
    isInitiallyExpanded?: boolean;
    selectedPluginIds: string[];
    selectedPluginCount: number;
    actionBarLocation: ActionBarLocation;
    handleToggleSelection: (pluginId: string, selected: boolean) => any;
    handleToggleSelectAll: (selectAll: boolean) => void;
    handleInstall: () => Promise<any>;
    isUpdatingDismissedVersions: boolean;
    handleClickDismissPluginVersions: () => any;
}> = ({
    plugins,
    isInitiallyExpanded,
    selectedPluginIds,
    selectedPluginCount,
    actionBarLocation,
    handleToggleSelection,
    handleToggleSelectAll,
    handleInstall,
    isUpdatingDismissedVersions,
    handleClickDismissPluginVersions,
}) => {
    /**
     * Keeps track of latest update time of each plugin, remembering the update time of versions that are dismissed.
     * This avoids the plugin's location moving after dimissing one of its many versions.
     */
    const latestUpdateDatesByPlugin = React.useRef<Record<string, dayjs.Dayjs>>({});
    React.useMemo(() => {
        plugins.forEach((plugin) => {
            const latestVisibleVersionUpdatedAt = dayjs(plugin.lastUpdatedTime || 0);
            if (
                !(plugin.id in latestUpdateDatesByPlugin.current) ||
                latestVisibleVersionUpdatedAt.isAfter(latestUpdateDatesByPlugin.current[plugin.id])
            ) {
                latestUpdateDatesByPlugin.current[plugin.id] = latestVisibleVersionUpdatedAt;
            }
        });
    }, [plugins]);
    const sortedAndFormattedPluginData = React.useMemo(
        () =>
            plugins
                .sort((p1, p2) =>
                    //More recently updated first
                    latestUpdateDatesByPlugin.current[p1.id].isAfter(
                        latestUpdateDatesByPlugin.current[p2.id]
                    )
                        ? -1
                        : 1
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
    const selectedPluginIdsSet = React.useMemo(
        () => new Set(selectedPluginIds),
        [selectedPluginIds]
    );

    function handleToggleSelectedClicked(pluginId: string, e: React.SyntheticEvent) {
        const checkbox = e.target as HTMLInputElement;
        handleToggleSelection(pluginId, checkbox.checked);
    }

    async function handleClickInstall() {
        return await handleInstall();
    }

    function handleClickSelectAll(e: React.SyntheticEvent) {
        const checkbox = e.target as HTMLInputElement;
        handleToggleSelectAll(checkbox.checked);
    }

    const isSelectAllChecked = selectedPluginCount === plugins.length;
    const selectAllTitle = isSelectAllChecked ? 'Deselect All' : 'Select All';
    const isDisabled = isUpdatingDismissedVersions;

    return (
        <>
            {plugins.length > 1 && (
                <DivSelectAll>
                    <input
                        type="checkbox"
                        onChange={handleClickSelectAll}
                        checked={isSelectAllChecked}
                        disabled={isDisabled}
                        title={selectAllTitle}
                        aria-label={selectAllTitle}
                        data-tooltip-position="top"
                    />
                </DivSelectAll>
            )}
            <DivPluginUpdateListContainer>
                {sortedAndFormattedPluginData.map((plugin) => (
                    <PluginUpdates
                        plugin={plugin}
                        key={plugin.id}
                        isInitiallyExpanded={plugins.length === 1 || !!isInitiallyExpanded}
                        isSelectionDisabled={isDisabled}
                        selected={selectedPluginIdsSet.has(plugin.id)}
                        onToggleSelectedClicked={(e) => handleToggleSelectedClicked(plugin.id, e)}
                    />
                ))}
            </DivPluginUpdateListContainer>

            {selectedPluginCount > 0 && (
                <ActionBarContainer isLocationBottom={actionBarLocation === 'bottom'}>
                    <SelectedPluginActionBar
                        numberOfPluginsSelected={selectedPluginCount}
                        isDisabled={isDisabled}
                        onClickInstall={handleClickInstall}
                        onClickDismissVersions={handleClickDismissPluginVersions}
                        hasBottomBorder={actionBarLocation === 'middle'}
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
    latestInstallableVersionIsBeta: boolean;
    releaseNotes: {
        releaseId: number;
        versionName: string;
        versionNumber: string;
        notes: string;
        isBetaVersion: boolean;
    }[];
    hasInstallableReleaseAssets: boolean;
    isPluginEnabled: boolean;
};

const PluginUpdates: React.FC<{
    plugin: PluginViewModel;
    isInitiallyExpanded: boolean;
    isSelectionDisabled: boolean;
    selected: boolean;
    onToggleSelectedClicked: (e: React.SyntheticEvent) => void;
}> = ({ plugin, isInitiallyExpanded, isSelectionDisabled, selected, onToggleSelectedClicked }) => {
    const [isReleaseNotesExpanded, setIsReleaseNotesExpanded] = React.useState(isInitiallyExpanded);
    const hasReleaseNotes =
        find(plugin.releaseNotes, (releaseNote) => !isEmpty(releaseNote.notes)) != null;

    const headerText = `${plugin.name} (${plugin.latestInstallableVersionNumber})`;
    const downloadsText = `${plugin.downloads.toLocaleString()} Downloads`;
    const isLastUpdatedTimeKnown = !!plugin.lastUpdatedTime;
    const lastUpdatedText = `Updated ${plugin.lastUpdatedTime?.fromNow()}`;
    const gitDiffUrl = `${plugin.githubRepositoryUrl}/compare/${plugin.installedVersionNumber}...${plugin.latestInstallableVersionNumber}#files_bucket`;

    return (
        <DivPluginUpdateContainer>
            <DivPluginUpdateHeaderContainer>
                <H2PluginName>
                    <NewTextFadeInThenOutAnimation text={headerText} />
                    {plugin.latestInstallableVersionIsBeta && (
                        <SpanBetaVersionBadge
                            aria-label="This version may be unstable"
                            data-tooltip-position="top"
                            className="obsidian-plugin-update-tracker-beta-version"
                        >
                            ⚠️ Beta Version
                        </SpanBetaVersionBadge>
                    )}
                    {!plugin.isPluginEnabled && (
                        <SpanDisabledPlugin
                            aria-label="This plugin is disabled"
                            data-tooltip-position="top"
                            className="obsidian-plugin-update-tracker-disabled-plugin"
                        >
                            Disabled
                        </SpanDisabledPlugin>
                    )}
                </H2PluginName>
                <DivSelectPluginContainer>
                    <input
                        type="checkbox"
                        checked={selected}
                        disabled={isSelectionDisabled}
                        onChange={onToggleSelectedClicked}
                    />
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
                                <DivReleaeseName>
                                    {`${release.versionName}${
                                        release.isBetaVersion &&
                                        !release.versionName.toLowerCase().includes('beta')
                                            ? ' (Beta)'
                                            : ''
                                    }`}
                                </DivReleaeseName>
                                <DivReleaseNoteText>
                                    <ReactMarkdown
                                        rehypePlugins={[
                                            rehypeRaw,
                                            rehypeSanitize,
                                            rehypeReplaceUrls,
                                        ]}
                                    >
                                        {release.notes}
                                    </ReactMarkdown>
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

function rehypeReplaceUrls() {
    return (tree: any) => {
        visit(tree, 'text', (node, index, parent) => {
            const urlRegex = /(\bhttps?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;
            const parts = node.value.split(urlRegex);

            if (parts.length > 1) {
                // Indicates URLs are present
                const nodes = parts.flatMap((part: any) => {
                    if (urlRegex.test(part)) {
                        return [
                            {
                                type: 'element',
                                tagName: 'a',
                                properties: {
                                    href: part,
                                    target: '_blank',
                                    rel: 'noopener noreferrer',
                                },
                                children: [{ type: 'text', value: part }],
                            },
                        ];
                    } else {
                        return part.length > 0 ? [{ type: 'text', value: part }] : [];
                    }
                });

                parent.children.splice(index, 1, ...nodes);
            }
        });
    };
}

const BORDER_WIDTH = '2px';
const BORDER = `${BORDER_WIDTH} var(--background-modifier-border) solid`;

const DivPluginUpdateListContainer = styled.div`
    user-select: text; /* enables selecting/copying of text */

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
        cursor: pointer;
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

const SpanBetaVersionBadge = styled.span`
    font-size: 0.45em;
    display: inline-block;
    text-align: center;
    vertical-align: middle;

    color: #212529;
    background-color: #ffc107;
    font-weight: 700;

    border-radius: 10em;

    padding: 0.25em 0.5em;
    margin-left: 0.4rem;
    user-select: none;
`;

const SpanDisabledPlugin = styled.span`
    font-size: 0.45em;
    display: inline-block;
    text-align: center;
    vertical-align: middle;

    color: #212529;
    background-color: #a0a0a0;
    font-weight: 700;

    border-radius: 10em;

    padding: 0.25em 0.5em;
    margin-left: 0.4rem;
    user-select: none;
`;

const DivSelectPluginContainer = styled.div`
    padding-top: 0.25rem;
    padding-right: 0.25rem;
    input {
        margin: 0;
        cursor: pointer;
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

const ActionBarContainer = styled.div<{ isLocationBottom: boolean }>`
    position: fixed;
    bottom: ${({ isLocationBottom }) => (isLocationBottom ? '0' : '50%')};
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
