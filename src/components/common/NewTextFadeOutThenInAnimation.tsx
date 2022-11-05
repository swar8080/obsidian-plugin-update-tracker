import * as React from 'react';
import styled from 'styled-components';
import { useChangeAwareEffect } from 'use-change-aware-effect';

interface NewTextFadeInThenOutAnimationProps {
    text: string;
}

export const NewTextFadeInThenOutAnimation: React.FC<NewTextFadeInThenOutAnimationProps> = ({
    text,
}) => {
    const textChangeTracker = React.useRef({
        didChange: false,
        previousText: '',
    });
    useChangeAwareEffect(
        ({ did, previous, isMount }) => {
            if (did.text.change && !isMount) {
                textChangeTracker.current = {
                    didChange: true,
                    previousText: previous.text,
                };
            }
        },
        { text }
    );

    if (textChangeTracker.current.didChange) {
        return (
            <>
                <SpanFadeOut key={text}>{textChangeTracker.current.previousText}</SpanFadeOut>
                <SpanFadeIn key={text}>{text}</SpanFadeIn>
            </>
        );
    } else {
        return <span>{text}</span>;
    }
};

const ANIMIATION_SECONDS = 1.5;

const SpanFadeOut = styled.span`
    animation-name: fadeOut;
    animation-delay: 0s;
    animation-duration: ${ANIMIATION_SECONDS}s;
    animation-timing-effect: linear;
    animation-fill-mode: forwards;
    position: absolute;

    @keyframes fadeOut {
        0% {
            opacity: 1;
        }

        100% {
            opacity: 0;
        }
    }
`;

const SpanFadeIn = styled.span`
    opacity: 0;
    animation-name: fadeIn;
    animation-delay: ${ANIMIATION_SECONDS}s;
    animation-duration: ${ANIMIATION_SECONDS}s;
    animation-timing-effect: linear;
    animation-fill-mode: forwards;

    @keyframes fadeIn {
        0% {
            opacity: 0;
        }

        100% {
            opacity: 1;
        }
    }
`;
