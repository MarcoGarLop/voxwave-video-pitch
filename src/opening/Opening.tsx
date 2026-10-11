import React from 'react';
import {AbsoluteFill, interpolate, Sequence, staticFile} from 'remotion';
import {Audio, Video} from '@remotion/media';

// Cinematic opening (v08) by the team, imported unchanged from jjpaz/VoxWave, branch
// video/opening-v08-handoff (commit 9d11694). Media are byte-identical to the handoff manifest:
//   opening-v08.mp4      video/renders/VoxWave-opening-v08-720p.mp4 (1280×720, 30 fps, 72.2 s)
//   opening-v08-mix.wav  video/renders/v08/mix.wav (48 kHz / 24-bit PCM, the lossless master mix)
// The picture is played muted and the lossless mix is used as its sound. Do not re-edit the files.
//
// Edits made here, at playback:
// - 3 s are taken out of the "What if the answer was always there?" card (55.0 → 58.0 s of the source).
//   The card is completely still from 54.5 to 58.9 s, so the jump is invisible; the quiet pad underneath
//   gets a short crossfade.
// - It ends at 60.5 s of the source, on the still coral line in the middle of the black screen, before its
//   own logo tail ("In the voices we hear every day… Meet VoxWave" and the bell). Our s01 starts on that
//   exact line. The narrator's "In the voices…" starts at 60.80 s, so the sound must end at the cut.
// - The mix is mastered quiet (−28.4 LUFS integrated, −9.2 dBFS peak) while our blocks sit around −17 LUFS,
//   so it is played with one uniform gain: the mix itself is untouched and its peak stays at ≈−1.2 dBFS.
const FPS = 30;
const SOURCE_END = 1815; // 60.5 s
const SKIP = {from: 1650, frames: 90}; // 55.0 → 58.0 s of the source
const XFADE = 6; // frames, audio only

export const OPENING = {
  frames: SOURCE_END - SKIP.frames,
  gainDb: 8,
  fade: {from: -0.3, to: 0}, // seconds relative to the cut into s01
};

const gain = Math.pow(10, OPENING.gainDb / 20);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const OpeningPicture: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    <Sequence durationInFrames={SKIP.from} layout="none">
      <Video src={staticFile('opening/opening-v08.mp4')} muted style={{width: '100%', height: '100%'}} />
    </Sequence>
    <Sequence from={SKIP.from} layout="none">
      <Video src={staticFile('opening/opening-v08.mp4')} muted trimBefore={SKIP.from + SKIP.frames} style={{width: '100%', height: '100%'}} />
    </Sequence>
  </AbsoluteFill>
);

// Kept outside the picture's sequence so the fade can be moved freely around the cut.
export const OpeningSound: React.FC = () => {
  const end = OPENING.frames + Math.round(OPENING.fade.to * FPS);
  const fadeOutStart = OPENING.frames + OPENING.fade.from * FPS;
  return (
    <>
      <Sequence durationInFrames={SKIP.from + XFADE} name="Opening sound (v08 mix) · part 1" layout="none">
        <Audio src={staticFile('opening/opening-v08-mix.wav')} volume={(f) => gain * interpolate(f, [SKIP.from, SKIP.from + XFADE], [1, 0], clamp)} />
      </Sequence>
      <Sequence from={SKIP.from - XFADE} durationInFrames={end - (SKIP.from - XFADE)} name="Opening sound (v08 mix) · part 2" layout="none">
        <Audio
          src={staticFile('opening/opening-v08-mix.wav')}
          trimBefore={SKIP.from + SKIP.frames - XFADE}
          volume={(f) => {
            const at = SKIP.from - XFADE + f;
            return gain * interpolate(f, [0, XFADE], [0, 1], clamp) * interpolate(at, [fadeOutStart, end], [1, 0], clamp);
          }}
        />
      </Sequence>
    </>
  );
};

export const Opening: React.FC = () => (
  <>
    <OpeningPicture />
    <OpeningSound />
  </>
);
