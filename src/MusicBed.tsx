import React, {useMemo} from 'react';
import {interpolate, Sequence, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {VIDEO} from './brand/tokens';
import {voWords} from './data/vo';
import {BLOCK_SCENES, CLOSE_SCENES, FINANCE_SCENES, sceneFrames} from './scenes/config';
import {CLOSE_REVEAL} from './scenes/close/CloseScene';

// Music under our part of the pitch (scripts/music.mjs): the bed comes in under "Meet VoxWave", ducks
// while the narrator speaks and crossfades into the ending, whose chord resolves as the closing logo forms
// (2.6 s into outro.wav). `start` is the frame where s01 begins in the full video.
const FPS = VIDEO.fps;
const OUTRO_RESOLVE = 2.6;
const LEVEL = {bed: 0.2, underVoice: 0.42, outro: 0.32};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const SCENES = [...BLOCK_SCENES, ...FINANCE_SCENES, ...CLOSE_SCENES];

export const musicLength = () => SCENES.reduce((sum, s) => sum + sceneFrames(s), 0);

// 1 in pauses, LEVEL.underVoice while the narrator speaks; quick to duck, slow to come back.
const useDuck = (frames: number) =>
  useMemo(() => {
    const speaking = new Uint8Array(frames);
    let offset = 0;
    for (const s of SCENES) {
      for (const w of voWords(s.id)) {
        const a = Math.max(0, Math.floor((offset + (s.voAt + w.start - 0.1) * FPS)));
        const b = Math.min(frames - 1, Math.ceil(offset + (s.voAt + w.end + 0.25) * FPS));
        for (let f = a; f <= b; f++) speaking[f] = 1;
      }
      offset += sceneFrames(s);
    }
    const env = new Float32Array(frames);
    let g = 1;
    for (let f = 0; f < frames; f++) {
      const target = speaking[f] ? LEVEL.underVoice : 1;
      g += (target - g) * (target < g ? 0.35 : 0.06);
      env[f] = g;
    }
    return env;
  }, [frames]);

export const MusicBed: React.FC<{start: number}> = ({start}) => {
  const total = musicLength();
  const duck = useDuck(total);
  const closeStart = total - sceneFrames(CLOSE_SCENES[CLOSE_SCENES.length - 1]);
  const outroAt = closeStart + Math.round((CLOSE_REVEAL - OUTRO_RESOLVE) * FPS);
  const bedEnd = outroAt + Math.round(1.2 * FPS);
  return (
    <>
      <Sequence from={start} durationInFrames={bedEnd} name="Music · bed" layout="none">
        <Audio
          src={staticFile('audio/music/bed.wav')}
          volume={(f) =>
            LEVEL.bed *
            duck[Math.min(f, total - 1)] *
            interpolate(f, [0, 2 * FPS], [0, 1], clamp) *
            interpolate(f, [outroAt, bedEnd], [1, 0], clamp)
          }
        />
      </Sequence>
      <Sequence from={start + outroAt} durationInFrames={total - outroAt} name="Music · outro" layout="none">
        <Audio
          src={staticFile('audio/music/outro.wav')}
          volume={(f) => LEVEL.outro * duck[Math.min(outroAt + f, total - 1)] ** 0.5 * interpolate(f, [total - outroAt - 15, total - outroAt], [1, 0], clamp)}
        />
      </Sequence>
    </>
  );
};
