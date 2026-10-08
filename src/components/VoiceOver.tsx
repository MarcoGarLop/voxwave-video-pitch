import React from 'react';
import {Sequence, staticFile, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import type {SceneConfig} from '../scenes/config';

export const VoiceOver: React.FC<{scene: SceneConfig; volume?: number}> = ({scene, volume = 1}) => {
  const {fps} = useVideoConfig();
  return (
    <Sequence from={Math.round(scene.voAt * fps)} name={`VO ${scene.id}`} layout="none">
      <Audio src={staticFile(`audio/vo/${scene.id}.mp3`)} volume={volume} />
    </Sequence>
  );
};
