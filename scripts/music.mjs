// Procedural music bed for the pitch (original, so no licensing). Writes to public/audio/music:
//   bed.wav    calm, hopeful loop-based bed for the body of the video (84 bpm, D major, 4-bar progression)
//   outro.wav  the closing swell: the progression resolves on Dmaj9 with a bell as the logo forms
// Usage: npm run music
import path from 'node:path';
import fs from 'node:fs';
import {SR, buf, noise, lowpass, sweepBandpass, reverb, stereo, writeWav} from './dsp.mjs';

const OUT_DIR = path.resolve('public/audio/music');
fs.mkdirSync(OUT_DIR, {recursive: true});

const BPM = 84;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const tri = (ph) => (2 / Math.PI) * Math.asin(Math.sin(ph));

// Bass root + upper voicing for each bar of the progression.
const PROGRESSION = [
  {root: 38, voices: [57, 61, 64, 66]}, // Dmaj9
  {root: 35, voices: [54, 57, 62, 64]}, // Bm7(add11)
  {root: 31, voices: [54, 59, 62, 66]}, // Gmaj7
  {root: 33, voices: [52, 59, 61, 64]}, // Asus2
];

// Soft pad: two slightly detuned sines and a quiet triangle per voice, slow attack and release.
const addPad = (out, start, dur, voices, gain) => {
  const att = 0.9, rel = 1.4;
  const i0 = Math.round(start * SR);
  const n = Math.round((dur + rel) * SR);
  for (const m of voices) {
    const f = hz(m);
    for (let k = 0; k < n && i0 + k < out.length; k++) {
      const t = k / SR;
      const env = Math.min(1, t / att) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1);
      const ph = 2 * Math.PI * f * t;
      const s = 0.45 * Math.sin(ph * 1.0023) + 0.45 * Math.sin(ph * 0.9977) + 0.18 * tri(ph);
      out[i0 + k] += s * env * gain;
    }
  }
};

// Plucked arpeggio note: triangle + sine with a quick exponential decay.
const addPluck = (out, start, midi, gain, decay = 0.28) => {
  const f = hz(midi);
  const i0 = Math.round(start * SR);
  const n = Math.round(decay * 6 * SR);
  for (let k = 0; k < n && i0 + k < out.length; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / decay);
    const ph = 2 * Math.PI * f * t;
    out[i0 + k] += (0.6 * tri(ph) + 0.4 * Math.sin(2 * ph) * Math.exp(-t / 0.08)) * env * gain;
  }
};

// Round bass note on beats 1 and 3.
const addBass = (out, start, midi, gain, dur) => {
  const f = hz(midi);
  const i0 = Math.round(start * SR);
  const n = Math.round(dur * SR);
  for (let k = 0; k < n && i0 + k < out.length; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.03) * Math.exp(-t / 0.9) * Math.min(1, (dur - t) / 0.1);
    out[i0 + k] += Math.sin(2 * Math.PI * f * t) * env * gain;
  }
};

// Bell: inharmonic partials, long decay.
const addBell = (out, start, midi, gain) => {
  const f = hz(midi);
  const i0 = Math.round(start * SR);
  const n = Math.round(5 * SR);
  for (let k = 0; k < n && i0 + k < out.length; k++) {
    const t = k / SR;
    const s = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 1.6) + 0.45 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t / 0.7) + 0.2 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t / 0.3);
    out[i0 + k] += s * Math.min(1, t / 0.003) * gain;
  }
};

// Arpeggio pattern over the four upper voices (one octave up), eighth notes.
const ARP = [0, 2, 1, 3, 2, 1, 3, 2];

// ---------- bed ----------
{
  const LEN = 230; // longer than the body of the video; the composition trims it
  const pad = buf(LEN), pluck = buf(LEN), bass = buf(LEN), shaker = buf(LEN);
  const bars = Math.floor(LEN / BAR);
  for (let b = 0; b < bars; b++) {
    const c = PROGRESSION[b % PROGRESSION.length];
    const t0 = b * BAR;
    addPad(pad, t0, BAR, c.voices, 0.07);
    // Arpeggio from the second bar, bass and shaker from the fourth: the bed builds gently.
    if (b >= 1) ARP.forEach((v, i) => addPluck(pluck, t0 + i * (BEAT / 2), c.voices[v] + 12, i % 2 ? 0.06 : 0.085));
    if (b >= 3) {
      addBass(bass, t0, c.root, 0.22, BEAT * 2);
      addBass(bass, t0 + BEAT * 2, c.root, 0.16, BEAT * 2);
    }
    if (b >= 5) {
      for (let i = 0; i < 8; i++) {
        const i0 = Math.round((t0 + i * (BEAT / 2)) * SR);
        const g = i % 2 ? 0.05 : 0.025;
        for (let k = 0; k < 0.06 * SR && i0 + k < LEN * SR; k++) shaker[i0 + k] += noise() * Math.exp(-k / SR / 0.018) * g;
      }
    }
  }
  const shakerF = sweepBandpass(shaker, () => 7000, 1.4);
  const mix = buf(LEN);
  for (let i = 0; i < mix.length; i++) mix[i] = pad[i] + pluck[i] + bass[i] + shakerF[i];
  const wet = reverb(lowpass(mix, 7000), {decay: 0.86, mix: 0.3, tail: 2});
  writeWav(OUT_DIR, 'bed', stereo(wet, 0.6), 0.8);
}

// ---------- outro ----------
// 0 s: pad swells on Asus2 -> 2.6 s: resolves on Dmaj9 with a bell (the logo forms) -> long release.
{
  const LEN = 11;
  const out = buf(LEN);
  addPad(out, 0, 2.6, PROGRESSION[3].voices, 0.06);
  addBass(out, 0, PROGRESSION[3].root, 0.16, 2.6);
  [0, 1, 2, 3, 4, 5].forEach((i) => addPluck(out, i * (BEAT / 2), PROGRESSION[3].voices[ARP[i]] + 12, 0.06 * (1 - i / 7)));
  addPad(out, 2.6, 5.2, [50, ...PROGRESSION[0].voices], 0.075);
  addBass(out, 2.6, PROGRESSION[0].root, 0.24, 4.5);
  addBell(out, 2.6, 74, 0.12);
  addBell(out, 3.3, 81, 0.06);
  const wet = reverb(lowpass(out, 7000), {decay: 0.88, mix: 0.36, tail: 2.5});
  writeWav(OUT_DIR, 'outro', stereo(wet, 0.6), 0.8);
}
