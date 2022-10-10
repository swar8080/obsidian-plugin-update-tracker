import * as React from 'react';
import styled from 'styled-components';
import { useAppSelector } from '../state';
import { PluginUpdateResult } from '../state/obsidianReducer';

interface PluginUpdateProgressTrackerProps {
    numberOfPluginsBeingUpdated: number;
    onAcknowledgeResults: () => any;
}

const PluginUpdateProgressTrackerConnected: React.FC<PluginUpdateProgressTrackerProps> = ({
    numberOfPluginsBeingUpdated,
    onAcknowledgeResults,
}) => {
    const updateResults = useAppSelector((state) => state.obsidian.pluginUpdateProgress);
    const isUpdatingPlugins = useAppSelector((state) => state.obsidian.isUpdatingPlugins);

    return (
        <PluginUpdateProgressTracker
            updateResults={updateResults}
            isUpdatingPlugins={isUpdatingPlugins}
            numberOfPluginsBeingUpdated={numberOfPluginsBeingUpdated}
            onAcknowledgeResults={onAcknowledgeResults}
        />
    );
};

export const PluginUpdateProgressTracker: React.FC<{
    updateResults: PluginUpdateResult[];
    isUpdatingPlugins: boolean;
    numberOfPluginsBeingUpdated: number;
    onAcknowledgeResults: () => any;
}> = ({ updateResults, isUpdatingPlugins, numberOfPluginsBeingUpdated, onAcknowledgeResults }) => {
    let headerMsg: string;
    const numberOfPluginsText = `${numberOfPluginsBeingUpdated} Plugin${
        numberOfPluginsBeingUpdated === 1 ? '' : 's'
    }`;
    if (isUpdatingPlugins) {
        headerMsg = `Updating ${numberOfPluginsText}...`;
    } else {
        headerMsg = `Finished Updating ${numberOfPluginsText}`;
    }

    const failureCount = updateResults.reduce(
        (count, result) => count + (result.success ? 0 : 1),
        0
    );

    return (
        <DivPluginUpdateProgressTracker>
            <H2PluginUpdateProgressTracker>{headerMsg}</H2PluginUpdateProgressTracker>
            {updateResults.map((updateResult) => (
                <PluginUpdateResultView updateResult={updateResult} key={updateResult.pluginName} />
            ))}
            {!isUpdatingPlugins && (
                <DivCompletedNextSteps>
                    {failureCount > 0 && (
                        <div>
                            <p>{`Completed with ${failureCount} failure${
                                failureCount > 1 ? 's' : ''
                            }`}</p>
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
            <DivPluginUpdateResultName>{updateResult.pluginName}</DivPluginUpdateResultName>
            <DivPluginUpdateResultOutcome>
                {updateResult.success ? '✅' : '❌'}
            </DivPluginUpdateResultOutcome>
        </DivPluginUpdateResult>
    );
};

const DivPluginUpdateProgressTracker = styled.div``;

const H2PluginUpdateProgressTracker = styled.h2``;

const DivPluginUpdateResult = styled.div`
    display: flex;
    flex-direction: row;
`;

const DivPluginUpdateResultName = styled.div``;

const DivPluginUpdateResultOutcome = styled.div``;

const DivCompletedNextSteps = styled.div``;

export default PluginUpdateProgressTrackerConnected;
