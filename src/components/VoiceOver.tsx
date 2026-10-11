import React from 'react';
import {Sequence, staticFile, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import type {SceneConfig} from '../scenes/config';
import {VO_GAPS} from '../data/vo';

export const VoiceOver: React.FC<{scene: SceneConfig; volume?: number}> = ({scene, volume = 1}) => {
  const {fps} = useVideoConfig();
  const src = staticFile(`audio/vo/${scene.id}.mp3`);
  const pause = VO_GAPS[scene.id];
  if (!pause) {
    return (
      <Sequence from={Math.round(scene.voAt * fps)} name={`VO ${scene.id}`} layout="none">
        <Audio src={src} volume={volume} />
      </Sequence>
    );
  }
  // Played in two parts with a pause between them.
  const split = Math.round(pause.at * fps);
  return (
    <>
      <Sequence from={Math.round(scene.voAt * fps)} durationInFrames={split} name={`VO ${scene.id} · 1`} layout="none">
        <Audio src={src} volume={volume} trimAfter={split} />
      </Sequence>
      <Sequence from={Math.round((scene.voAt + pause.at + pause.gap) * fps)} name={`VO ${scene.id} · 2`} layout="none">
        <Audio src={src} volume={volume} trimBefore={split} />
      </Sequence>
    </>
  );
};
