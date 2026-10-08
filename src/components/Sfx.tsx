import React from 'react';
import {Sequence, staticFile, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';

export type SfxName =
  | 'riser' | 'impact' | 'shimmer' | 'whoosh' | 'whoosh-short' | 'hit'
  | 'blip' | 'blip-low' | 'alert' | 'ring' | 'drone';

// One-shot sound effect placed at a time (seconds) relative to the parent sequence.
export const Sfx: React.FC<{name: SfxName; at: number; volume?: number}> = ({name, at, volume = 1}) => {
  const {fps} = useVideoConfig();
  return (
    <Sequence from={Math.round(at * fps)} name={`SFX ${name}`} layout="none">
      <Audio src={staticFile(`audio/sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  );
};
