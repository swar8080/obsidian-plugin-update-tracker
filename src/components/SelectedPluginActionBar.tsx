import * as React from 'react';
import styled from 'styled-components';

interface SelectedPluginActionBarProps {
    numberOfPluginsSelected: number;
    onClickInstall: () => void;
}

const SelectedPluginActionBar: React.FC<SelectedPluginActionBarProps> = ({
    numberOfPluginsSelected,
    onClickInstall,
}) => {
    const headerText = `${numberOfPluginsSelected} Plugin${
        numberOfPluginsSelected != 1 ? 's' : ''
    } Selected`;

    return (
        <DivSelectedPluginActionBarContainer>
            <h4>{headerText}</h4>
            <button onClick={onClickInstall}>Update Plugins</button>
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
`;

export default SelectedPluginActionBar;
