import {noise2D} from '@remotion/noise';

// Deterministic speech-like loudness (0..1): syllable pulses grouped into words, with short pauses.
export const voiceLevel = (t: number, seed = 'voice') => {
  const syllables = Math.pow(Math.max(0, Math.sin(2 * Math.PI * 4.3 * t + 2.2 * noise2D(seed, t * 0.9, 0))), 0.6);
  const phrase = noise2D(`${seed}-phrase`, t * 0.9, 3);
  const pause = phrase < -0.55 ? 0.08 : 1;
  const loudness = 0.55 + 0.45 * noise2D(`${seed}-loud`, t * 1.7, 7);
  const grain = 0.85 + 0.15 * noise2D(`${seed}-grain`, t * 18, 1);
  return Math.min(1, Math.max(0.04, syllables * loudness * pause * grain));
};

// Bars for a right-to-left scrolling waveform. Each bar is a fixed slice of time so bars never flicker.
export const scrollingBars = (t: number, count: number, slice: number, startAt: number, seed?: string) => {
  const head = t / slice;
  const newest = Math.floor(head);
  const frac = head - newest;
  return new Array(count).fill(0).map((_, i) => {
    const n = newest - (count - 1 - i);
    const time = n * slice;
    const level = time < startAt ? 0 : voiceLevel(time, seed);
    return {index: i, offset: count - 1 - i + frac, level};
  });
};
