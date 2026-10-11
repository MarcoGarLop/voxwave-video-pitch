import React from 'react';
import {useCurrentFrame} from 'remotion';
import wave from '../data/opening-wave.json';

// The voice wave on the opening's black text cards, redrawn so it follows the re-recorded mother.
// The team baked it into the video (video/tools/finalize_opening_v08.py, draw_wave); here the old one is
// covered with black and the same curve is drawn from the new dialogue (src/data/opening-wave.json,
// written by scripts/opening-mix.mjs). Geometry is theirs, scaled from 1280×720 to 1920×1080.
const S = 1920 / 1280;
// The cards, in source seconds of the opening (cards are black frames: text + this wave).
const CARDS: [number, number][] = [
  [8.8, 13.8],
  [18.8, 29.8],
  [34.8, 39.8],
  [44.8, 53.2],
  [53.2, 59.2],
];
const BOX = {left: 312, top: 464, width: 656, height: 168}; // the area their wave is drawn into (720p)
const POINTS = 321;

const levelAt = (t: number) => {
  const p = Math.max(0, Math.min(wave.levels.length - 1, t / wave.dt));
  const i = Math.floor(p);
  const a = wave.levels[i];
  const b = wave.levels[Math.min(i + 1, wave.levels.length - 1)];
  return a + (b - a) * (p - i);
};

// `toSource` maps this composition's frame to the opening's source time (the opening is cut in places).
export const OpeningWave: React.FC<{toSource: (frame: number) => number}> = ({toSource}) => {
  const frame = useCurrentFrame();
  const t = toSource(frame);
  if (!CARDS.some(([a, b]) => t >= a && t < b)) return null;
  const level = t >= 5.8 ? levelAt(t - 2.8) : 0;
  const path = (sign: number) =>
    new Array(POINTS)
      .fill(0)
      .map((_, j) => {
        const u = j / (POINTS - 1);
        const shape = Math.exp(-(((u - 0.5) / 0.2) ** 2)) * Math.sin(u * Math.PI * 4 + (t - 2.8) * 0.8);
        const x = (BOX.left + 8 + 640 * u) * S;
        const y = (548 + sign * level * 65 * shape) * S;
        return `${j ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <rect x={BOX.left * S} y={BOX.top * S} width={BOX.width * S} height={BOX.height * S} fill="#000" />
      {[-1, 1].map((sign) => (
        <path key={sign} d={path(sign)} fill="none" stroke="#FE653C" strokeWidth={5 * S} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
};
