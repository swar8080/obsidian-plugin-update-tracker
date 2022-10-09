import * as React from 'react';

interface SelectedPluginActionBarProps {
    numberOfPluginsSelected: number;
    onClickInstall: () => void;
}

const SelectedPluginActionBar: React.FC<SelectedPluginActionBarProps> = ({}) => {
    return <div>SelectedPluginActionBar</div>;
};

export default SelectedPluginActionBar;
