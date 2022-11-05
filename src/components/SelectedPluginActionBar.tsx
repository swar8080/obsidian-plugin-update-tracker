import * as React from 'react';
import { pluralize } from 'src/domain/util/pluralize';
import styled from 'styled-components';

interface SelectedPluginActionBarProps {
    numberOfPluginsSelected: number;
    isDisabled: boolean;
    onClickInstall: () => void;
    onClickDismissVersions: () => void;
}

const SelectedPluginActionBar: React.FC<SelectedPluginActionBarProps> = ({
    numberOfPluginsSelected,
    onClickInstall,
    onClickDismissVersions,
    isDisabled,
}) => {
    const headerText = `${numberOfPluginsSelected} Plugin${
        numberOfPluginsSelected != 1 ? 's' : ''
    } Selected`;
    const updatePluginText = `Update ${pluralize('Plugin', numberOfPluginsSelected)}`;

    return (
        <DivSelectedPluginActionBarContainer>
            <h4>{headerText}</h4>
            <button onClick={onClickInstall} disabled={isDisabled}>
                {updatePluginText}
            </button>
            <button onClick={onClickDismissVersions} disabled={isDisabled}>
                Ignore Version
            </button>
        </DivSelectedPluginActionBarContainer>
    );
};

const DivSelectedPluginActionBarContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;

    padding: 0.5rem 2rem;

    h4 {
        margin: 0 0 0.25rem 0;
        text-align: center;
    }

    background-color: var(--background-secondary);

    border: 3px var(--background-modifier-border) solid;
    border-bottom: none;

    button {
        cursor: pointer;
    }
`;

export default SelectedPluginActionBar;
