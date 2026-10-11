import React, {createContext, useContext} from 'react';
import {Sequence, staticFile, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';

export type SfxName =
  | 'riser' | 'impact' | 'shimmer' | 'whoosh' | 'whoosh-short' | 'hit'
  | 'blip' | 'blip-low' | 'alert' | 'ring' | 'drone' | 'sonar-ping' | 'sonar-hero' | 'coin';

// Master level for every sound effect, so the effects sit under the voice-over.
const SFX_GAIN = 0.7;

// The effects make way for the narrator. While the voice-over is speaking, small embellishments are left
// out altogether and hits and whooshes are turned down; in the pauses they play as written.
const ACCENTS: SfxName[] = ['blip', 'blip-low', 'shimmer', 'coin', 'sonar-ping'];
const WHOOSHES: SfxName[] = ['whoosh', 'whoosh-short', 'riser', 'drone'];
const UNDER_VOICE = {accent: 0, hit: 0.45, whoosh: 0.6};
// Base level per kind: whooshes and hits (stamps, slams) sit lower than the rest.
const KIND_GAIN = {accent: 0.65, hit: 0.65, whoosh: 0.55};

// Speech intervals of the current scene's voice-over, in seconds from the scene start.
export const SpeechContext = createContext<[number, number][]>([]);

export const Sfx: React.FC<{name: SfxName; at: number; volume?: number}> = ({name, at, volume = 1}) => {
  const {fps} = useVideoConfig();
  const speech = useContext(SpeechContext);
  const speaking = speech.some(([a, b]) => at >= a - 0.1 && at <= b + 0.1);
  const kind = ACCENTS.includes(name) ? 'accent' : WHOOSHES.includes(name) ? 'whoosh' : 'hit';
  const duck = speaking ? UNDER_VOICE[kind] : 1;
  if (duck === 0) return null;
  const level = volume * SFX_GAIN * duck * KIND_GAIN[kind];
  return (
    <Sequence from={Math.round(at * fps)} name={`SFX ${name}`} layout="none">
      <Audio src={staticFile(`audio/sfx/${name}.wav`)} volume={level} />
    </Sequence>
  );
};
