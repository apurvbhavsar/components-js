import * as React from 'react';
import { Participant, Track } from 'livekit-client';
import { isParticipantSourcePinned, setupParticipantTile } from '@livekit/components-core';
import { ConnectionQualityIndicator } from '../components/participant/ConnectionQualityIndicator';
import { MediaTrack } from '../components/participant/MediaTrack';
import { ParticipantName } from '../components/participant/ParticipantName';
import { TrackMutedIndicator } from '../components/participant/TrackMutedIndicator';
import {
  useMaybeParticipantContext,
  ParticipantContext,
  useEnsureParticipant,
  useMaybeLayoutContext,
} from '../context';
import { useIsMuted, useIsSpeaking } from '../hooks';
import { mergeProps } from '../utils';
import { FocusToggle } from '../components/controls/FocusToggle';

export type ParticipantTileProps = React.HTMLAttributes<HTMLDivElement> & {
  participant?: Participant;
  trackSource?: Track.Source;
};

export function useParticipantTile<T extends React.HTMLAttributes<HTMLElement>>({
  participant,
  props,
}: {
  participant: Participant;
  props: T;
}) {
  const mergedProps = React.useMemo(() => {
    const { className } = setupParticipantTile();
    return mergeProps(props, { className });
  }, [props]);
  const isVideoMuted = useIsMuted({ source: Track.Source.Camera, participant });
  const isAudioMuted = useIsMuted({ source: Track.Source.Microphone, participant });
  const isSpeaking = useIsSpeaking(participant);
  return {
    elementProps: {
      'data-lk-audio-muted': isAudioMuted,
      'data-lk-video-muted': isVideoMuted,
      'data-lk-speaking': isSpeaking,
      'data-lk-local-participant': participant.isLocal,
      ...mergedProps,
    },
  };
}

export function ParticipantContextIfNeeded(
  props: React.PropsWithChildren<{
    participant?: Participant;
  }>,
) {
  const hasContext = !!useMaybeParticipantContext();
  return props.participant && !hasContext ? (
    <ParticipantContext.Provider value={props.participant}>
      {props.children}
    </ParticipantContext.Provider>
  ) : (
    <>{props.children}</>
  );
}

/**
 * The ParticipantTile component is the base utility wrapper for displaying a visual representation of a participant.
 * This component can be used as a child of the `ParticipantLoop` component or independently if a participant is passed as a property.
 *
 * @example
 * ```tsx
 * {...}
 *   <ParticipantTile>
 *     {...}
 *   </ParticipantTile>
 * {...}
 * ```
 *
 * @see `ParticipantLoop` component
 */
export const ParticipantTile = ({
  participant,
  children,
  trackSource,
  ...htmlProps
}: ParticipantTileProps) => {
  const p = useEnsureParticipant(participant);
  const { elementProps } = useParticipantTile({ participant: p, props: htmlProps });

  const pinContext = useMaybeLayoutContext().pin;

  const handleSubscribe = React.useCallback(
    (subscribed: boolean) => {
      if (
        trackSource &&
        !subscribed &&
        pinContext.dispatch &&
        isParticipantSourcePinned(p, trackSource, pinContext.state)
      ) {
        pinContext.dispatch({ msg: 'clear_pin' });
      }
    },
    [p, pinContext, trackSource],
  );
  const trackSource_ = trackSource ?? Track.Source.Camera;

  return (
    <div style={{ position: 'relative' }} {...elementProps}>
      <ParticipantContextIfNeeded participant={participant}>
        {children ?? (
          <>
            <MediaTrack
              source={trackSource_}
              onSubscriptionStatusChanged={handleSubscribe}
            ></MediaTrack>
            <div className="lk-participant-metadata">
              <div className="lk-participant-metadata-item">
                {trackSource_ === Track.Source.Camera ? (
                  <>
                    <TrackMutedIndicator source={Track.Source.Microphone}></TrackMutedIndicator>
                    <TrackMutedIndicator source={Track.Source.Camera}></TrackMutedIndicator>
                    <ParticipantName />
                  </>
                ) : (
                  <ParticipantName>&apos;s screen share</ParticipantName>
                )}
              </div>
              <div className="lk-participant-metadata-item">
                <ConnectionQualityIndicator />
              </div>
            </div>
          </>
        )}
        <FocusToggle trackSource={trackSource_} />
      </ParticipantContextIfNeeded>
    </div>
  );
};

ParticipantTile.defaultProps = {
  trackSource: Track.Source.Camera,
};