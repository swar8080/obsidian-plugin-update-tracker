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
        </DivSelectedPluginActionBarContainer>
    );
};

const DivSelectedPluginActionBarContainer = styled.div`
    padding: 0.5rem 0;

    h4 {
        margin: 0;
        text-align: center;
    }

    background-color: var(--background-secondary);

    border: 3px var(--background-modifier-border) solid;
`;

export default SelectedPluginActionBar;
