import { faPlug } from '@fortawesome/free-solid-svg-icons/faPlug';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import styled from 'styled-components';
import { useAppSelector } from '../state';
import usePluginReleaseFilter from './hooks/usePluginReleaseFilter';

interface UpdateStatusIconContainerProps {
    onClickViewUpdates: () => any;
    parentEl: HTMLElement;
}

const CSS_CLASS_BASE = 'plugin-update-tracker-icon';

const UpdateStatusIconContainer: React.FC<UpdateStatusIconContainerProps> = ({
    onClickViewUpdates,
    parentEl,
}) => {
    const isLoading = useAppSelector((state) => state.releases.isLoadingReleases);
    const isErrorLoading = useAppSelector((state) => state.releases.isErrorLoadingReleases);

    const pluginsWithUpdates = usePluginReleaseFilter();
    const thisPluginId = useAppSelector((state) => state.obsidian.thisPluginId);
    const hasUpdatesForThisPlugin = pluginsWithUpdates.some(
        (plugin) => plugin.getPluginId() === thisPluginId
    );
    const minUpdateCountToShowIcon = useAppSelector(
        (state) => state.obsidian.settings.minUpdateCountToShowIcon
    );

    const defaultParentElDisplay = React.useRef(parentEl.style.display);
    React.useLayoutEffect(() => {
        if (
            isLoading ||
            pluginsWithUpdates.length >= minUpdateCountToShowIcon ||
            hasUpdatesForThisPlugin ||
            isErrorLoading
        ) {
            parentEl.style.display = defaultParentElDisplay.current;
        } else {
            parentEl.style.display = 'none';
        }
    }, [
        minUpdateCountToShowIcon,
        pluginsWithUpdates.length,
        hasUpdatesForThisPlugin,
        isLoading,
        isErrorLoading,
        parentEl,
    ]);

    return (
        <>
            <UpdateStatusIconView
                isLoading={isLoading}
                isErrorLoading={isErrorLoading}
                pluginsWithUpdatesCount={pluginsWithUpdates.length}
                onClickViewUpdates={onClickViewUpdates}
            />
        </>
    );
};

type UpdateStatusIconViewProps = {
    isLoading: boolean;
    isErrorLoading: boolean;
    pluginsWithUpdatesCount: number;
    onClickViewUpdates: () => any;
};

export const UpdateStatusIconView: React.FC<UpdateStatusIconViewProps> = ({
    onClickViewUpdates,
    isLoading,
    isErrorLoading,
    pluginsWithUpdatesCount,
}) => {
    const [isMouseOver, setIsMouseOver] = React.useState(false);

    let chipText: string;
    let chipColour: string;
    let fontSize = '0.55rem';
    let leftOffset: string = '0.05rem';
    let width = '0.5rem';
    let padding = '0.3rem';
    let cursor: string = 'pointer';
    let title;
    let isClickable = false;
    let cssSelector;
    if (isLoading) {
        chipText = '⌛';
        chipColour = 'transparent';
        fontSize = '0.45rem';
        leftOffset = '-0.1rem';
        cursor = 'wait';
        title = 'Checking for plugin updates...';
        cssSelector = `${CSS_CLASS_BASE}--loading`;
    } else if (isErrorLoading) {
        chipText = 'x';
        chipColour = '#FF3333';
        title = 'Error checking for plugin updates';
        cursor = 'default';
        cssSelector = `${CSS_CLASS_BASE}--error`;
    } else if (pluginsWithUpdatesCount > 0) {
        chipText = (pluginsWithUpdatesCount || 0).toString();
        chipColour = '#FF4F00';
        padding = '0.3rem';
        leftOffset = '0.08rem';
        if (chipText.length > 1) {
            width = '0.65rem';
            padding = '0.3rem 0.4rem';
        }
        title = `${pluginsWithUpdatesCount} plugin update${
            pluginsWithUpdatesCount > 1 ? 's' : ''
        } available`;
        isClickable = true;
        cssSelector = `${CSS_CLASS_BASE}--updates-available`;
    } else {
        chipText = '✓';
        chipColour = '#197300';
        title = 'All plugins up-to-date';
        cursor = 'none';
        cssSelector = `${CSS_CLASS_BASE}--no-updates-available`;
    }

    const isHighlighted = isMouseOver && isClickable;

    const handleClick = () => {
        if (isClickable) {
            onClickViewUpdates();
        }
    };

    return (
        <DivContainer
            onClick={handleClick}
            cursor={cursor}
            title={title}
            aria-label={title}
            aria-label-position="top"
            onMouseOver={() => setIsMouseOver(true)}
            onMouseLeave={() => setIsMouseOver(false)}
            isHighlighted={isHighlighted}
            className={`${CSS_CLASS_BASE} ${cssSelector}`}
        >
            <FontAwesomeIcon icon={faPlug} className={`${CSS_CLASS_BASE}-plug-icon`} />
            <DivPluginStatusChip
                color={chipColour}
                fontSize={fontSize}
                width={width}
                padding={padding}
                leftOffset={leftOffset}
                isHighlighted={isHighlighted}
                className={`${CSS_CLASS_BASE}-chip`}
            >
                {chipText}
            </DivPluginStatusChip>
        </DivContainer>
    );
};

const DivContainer = styled.div<{ cursor: string; isHighlighted: boolean }>`
    height: 100%;
    display: flex;
    align-items: center;

    cursor: ${(props) => props.cursor};
    user-select: none;

    svg {
        color: var(--text-muted);
        color: ${(props) =>
            props.isHighlighted ? 'var(--text-accent-hover)' : 'var(--text-muted)'};
        font-size: 14px;
        height: 14px;
    }
`;

const DivPluginStatusChip = styled.div<{
    fontSize: string;
    color: string;
    leftOffset: string;
    width: string;
    padding: string;
    isHighlighted: boolean;
}>`
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    line-height: 0.5;
    left: ${(props) => props.leftOffset};

    box-sizing: border-box;
    font-size: ${(props) => props.fontSize};
    width: ${(props) => props.width};
    height: 0.6rem;
    max-height: var(--icon-size);
    max-width: var(--icon-size);
    padding: ${(props) => props.padding};
    border-radius: 50%;

    background: ${(props) => props.color};
    color: white;
    filter: ${(props) => (props.isHighlighted ? 'brightness(0.75)' : 'brightness(1)')};
`;

export default UpdateStatusIconContainer;
