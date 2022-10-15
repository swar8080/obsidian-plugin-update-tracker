import dayjs from 'dayjs';
import * as React from 'react';
import styled from 'styled-components';
import { countSelectedPlugins } from '../domain/util/countSelectedPlugins';
import { pluralize } from '../domain/util/pluralize';
import { useAppDispatch, useAppSelector } from '../state';
import { acknowledgeUpdateResult } from '../state/actionProducers/acknowledgeUpdateResult';
import { PluginUpdateResult, PluginUpdateStatus } from '../state/obsidianReducer';

interface PluginUpdateProgressTrackerProps {
    titleEl: HTMLElement | undefined;
}

const UPDATE_STATUS_ICON: Record<PluginUpdateStatus, string> = {
    loading: '⌛',
    success: '✅',
    failure: '❌',
};

const PluginUpdateProgressTrackerConnected: React.FC<PluginUpdateProgressTrackerProps> = ({
    titleEl,
}) => {
    const updateResults = useAppSelector((state) => state.obsidian.pluginUpdateProgress);
    const isUpdatingPlugins = useAppSelector((state) => state.obsidian.isUpdatingPlugins);
    const selectedPluginCount = useAppSelector(countSelectedPlugins);
    const githubRateLimitTimestamp = useAppSelector(
        (state) => state.obsidian.githubRateLimitResetTimestamp
    );
    const dispatch = useAppDispatch();

    React.useEffect(() => {
        if (titleEl) {
            if (isUpdatingPlugins) {
                titleEl.innerText = `Updating ${selectedPluginCount} ${pluralize(
                    'Plugin',
                    selectedPluginCount
                )}...`;
            } else {
                titleEl.innerText = `Finished Updating Plugins`;
            }
        }
    }, [titleEl, selectedPluginCount, isUpdatingPlugins]);

    function onAcknowledgeResults() {
        dispatch(acknowledgeUpdateResult());
    }

    return (
        <PluginUpdateProgressTracker
            updateResults={updateResults}
            isUpdatingPlugins={isUpdatingPlugins}
            onAcknowledgeResults={onAcknowledgeResults}
            githubRateLimitTimestamp={githubRateLimitTimestamp}
        />
    );
};

export const PluginUpdateProgressTracker: React.FC<{
    updateResults: PluginUpdateResult[];
    isUpdatingPlugins: boolean;
    githubRateLimitTimestamp?: number;
    onAcknowledgeResults: () => any;
}> = ({ updateResults, isUpdatingPlugins, githubRateLimitTimestamp, onAcknowledgeResults }) => {
    const failureCount = updateResults.reduce(
        (count, result) => count + (result.status === 'failure' ? 1 : 0),
        0
    );

    let errorInstructions = '';
    if (githubRateLimitTimestamp) {
        const time = dayjs(githubRateLimitTimestamp);
        errorInstructions = `Try again ${time.fromNow()}, and if that doesn't fix it then report an issue `;
    } else {
        errorInstructions = `Try again or report an issue `;
    }

    return (
        <DivPluginUpdateProgressTracker>
            {updateResults.map((updateResult) => (
                <PluginUpdateResultView updateResult={updateResult} key={updateResult.pluginName} />
            ))}
            {!isUpdatingPlugins && (
                <DivCompletedNextSteps>
                    <hr></hr>
                    {failureCount === 0 && (
                        <div>
                            <p>{`${pluralize(
                                'Plugin',
                                updateResults.length
                            )} successfully installed!`}</p>
                        </div>
                    )}
                    {failureCount > 0 && (
                        <div>
                            <p>{`Completed with ${failureCount} ${pluralize(
                                'failure',
                                failureCount
                            )}`}</p>
                            <p>
                                <span>{errorInstructions}</span>
                                <a
                                    href="https://github.com/swar8080/obsidian-plugin-update-tracker/issues"
                                    target="_blank"
                                >
                                    here
                                </a>
                            </p>
                        </div>
                    )}
                    <button onClick={onAcknowledgeResults}>Continue</button>
                </DivCompletedNextSteps>
            )}
        </DivPluginUpdateProgressTracker>
    );
};

const PluginUpdateResultView: React.FC<{ updateResult: PluginUpdateResult }> = ({
    updateResult,
}) => {
    return (
        <DivPluginUpdateResult>
            <DivPluginUpdateResultText>
                <span>{updateResult.pluginName}</span>
                <SpanUpdateResultIcon>
                    {UPDATE_STATUS_ICON[updateResult.status]}
                </SpanUpdateResultIcon>
            </DivPluginUpdateResultText>
        </DivPluginUpdateResult>
    );
};

const DivPluginUpdateProgressTracker = styled.div``;

const DivPluginUpdateResult = styled.div`
    display: flex;
    flex-direction: row;
`;

const DivPluginUpdateResultText = styled.div``;

const SpanUpdateResultIcon = styled.span`
    padding-left: 0.35rem;
`;

const DivCompletedNextSteps = styled.div`
    hr {
        margin: 1rem 0 0.5rem 0;
    }
`;

export default PluginUpdateProgressTrackerConnected;
