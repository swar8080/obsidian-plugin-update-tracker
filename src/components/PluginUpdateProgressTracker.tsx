import * as React from 'react';
import styled from 'styled-components';
import { countSelectedPlugins } from '../domain/util/countSelectedPlugins';
import { pluralize } from '../domain/util/pluralize';
import { useAppDispatch, useAppSelector } from '../state';
import {
    acknowledgePluginUpdateResults,
    PluginUpdateResult,
    PluginUpdateStatus,
} from '../state/obsidianReducer';

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
        dispatch(acknowledgePluginUpdateResults());
    }

    return (
        <PluginUpdateProgressTracker
            updateResults={updateResults}
            isUpdatingPlugins={isUpdatingPlugins}
            onAcknowledgeResults={onAcknowledgeResults}
        />
    );
};

export const PluginUpdateProgressTracker: React.FC<{
    updateResults: PluginUpdateResult[];
    isUpdatingPlugins: boolean;
    onAcknowledgeResults: () => any;
}> = ({ updateResults, isUpdatingPlugins, onAcknowledgeResults }) => {
    const failureCount = updateResults.reduce(
        (count, result) => count + (result.status === 'failure' ? 1 : 0),
        0
    );

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
                                <span>Try again in an hour or report an issue </span>
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
