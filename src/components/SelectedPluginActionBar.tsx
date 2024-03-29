import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faCircleXmark } from '@fortawesome/free-solid-svg-icons/faCircleXmark';
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import styled from 'styled-components';
import { pluralize } from '../domain/util/pluralize';

interface SelectedPluginActionBarProps {
    numberOfPluginsSelected: number;
    isDisabled: boolean;
    onClickInstall: () => Promise<any>;
    onClickDismissVersions: () => Promise<any>;
    hasBottomBorder: boolean;
}

const LOADING_ANIMATION_SEQUENCE_MS = 1200;

const ANIMATION_STATE_CONFIG = {
    loading: {
        icon: faSpinner,
        colour: undefined,
        text: undefined,
    },
    success: {
        icon: faCheck,
        colour: undefined,
        text: undefined,
    },
    error: {
        icon: faCircleXmark,
        colour: '#FF3333',
        text: 'Error',
    },
};

const SelectedPluginActionBar: React.FC<SelectedPluginActionBarProps> = ({
    numberOfPluginsSelected,
    onClickInstall,
    onClickDismissVersions,
    isDisabled,
    hasBottomBorder,
}) => {
    const [loadingAnimationState, setLoadingAnimationState] = React.useState<LoadingAnimationState>(
        {
            isInProgress: false,
        }
    );
    const headerText = `${numberOfPluginsSelected} Plugin${
        numberOfPluginsSelected != 1 ? 's' : ''
    } Selected`;
    const updatePluginText = `Update ${pluralize('Plugin', numberOfPluginsSelected)}`;

    const loadingStateIcon = ANIMATION_STATE_CONFIG[loadingAnimationState.displayIcon || 'loading'];
    const disabled = isDisabled || loadingAnimationState.isInProgress;

    function handleActionClick(upstreamActionHandler: () => Promise<any>) {
        setLoadingAnimationState({
            isInProgress: true,
            displayIcon: 'loading',
        });

        setTimeout(async () => {
            let successful = true;
            try {
                await upstreamActionHandler();
            } catch (err) {
                successful = false;
            }

            setLoadingAnimationState({
                isInProgress: true,
                displayIcon: successful ? 'success' : 'error',
            });

            const nextSequenceLength = successful
                ? LOADING_ANIMATION_SEQUENCE_MS
                : LOADING_ANIMATION_SEQUENCE_MS * 2;
            setTimeout(() => {
                setLoadingAnimationState({
                    isInProgress: false,
                    displayIcon: undefined,
                });
            }, nextSequenceLength);
        }, LOADING_ANIMATION_SEQUENCE_MS);
    }

    const statusBarHeight: number = React.useMemo(() => {
        const statusBar = document.querySelector('.status-bar') as HTMLElement;
        if (statusBar) {
            const computedStyle = window.getComputedStyle(statusBar);
            return (
                statusBar.offsetHeight +
                parseInt(computedStyle.getPropertyValue('margin-top')) +
                parseInt(computedStyle.getPropertyValue('margin-bottom'))
            );
        }
        return 0;
    }, []);
    const actionButtonPaddingBottomPx = statusBarHeight + 3;

    return (
        <DivSelectedPluginActionBarContainer hasBottomBorder={hasBottomBorder}>
            <DivHeaderContainer>
                {!loadingAnimationState.isInProgress && <H4HeaderText>{headerText}</H4HeaderText>}
                {loadingAnimationState.isInProgress && (
                    <>
                        {loadingStateIcon.text && <span>{loadingStateIcon.text} </span>}
                        <FontAwesomeIcon
                            icon={loadingStateIcon.icon}
                            spin={loadingAnimationState.displayIcon === 'loading'}
                            color={loadingStateIcon.colour}
                        />
                    </>
                )}
            </DivHeaderContainer>

            <DivActionButtonContainer paddingBottom={actionButtonPaddingBottomPx}>
                <ButtonAction
                    onClick={() => handleActionClick(onClickInstall)}
                    disabled={disabled}
                    isDisabled={disabled}
                >
                    {updatePluginText}
                </ButtonAction>

                <ButtonAction
                    onClick={() => handleActionClick(onClickDismissVersions)}
                    disabled={disabled}
                    isDisabled={disabled}
                >
                    Ignore Version
                </ButtonAction>
            </DivActionButtonContainer>
        </DivSelectedPluginActionBarContainer>
    );
};

type LoadingAnimationState = {
    isInProgress: boolean;
    displayIcon?: AnimationIcons;
};

type AnimationIcons = 'loading' | 'success' | 'error';

const CONTAINER_BORDER = '3px var(--background-modifier-border) solid';

const DivSelectedPluginActionBarContainer = styled.div<{ hasBottomBorder: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;

    padding: 0.5rem 2rem;

    h4 {
        margin: 0 0 0.25rem 0;
        text-align: center;
    }

    background-color: var(--background-secondary);

    border: ${CONTAINER_BORDER};
    border-bottom: ${({ hasBottomBorder }) => (hasBottomBorder ? CONTAINER_BORDER : 'none')};
`;

const DivHeaderContainer = styled.div`
    margin-bottom: 0.25rem;
    font-size: var(--h4-size);
    line-height: var(--h4-line-height);
`;

const H4HeaderText = styled.h4`
    margin: 0;
`;

const DivActionButtonContainer = styled.div<{ paddingBottom: number }>`
    display: flex;
    flex-direction: row;
    align-items: center;

    button {
        margin-right: 0.5rem;
    }

    button:last-child {
        margin-right: 0;
    }

    padding-bottom: ${(props) => `${props.paddingBottom}px`};
`;

const ButtonAction = styled.button<{ isDisabled: boolean }>`
    opacity: ${({ isDisabled }) => (isDisabled ? '0.75' : '1')};
    cursor: ${({ isDisabled }) => (isDisabled ? 'not-allowed' : 'pointer')};
`;

export default SelectedPluginActionBar;
