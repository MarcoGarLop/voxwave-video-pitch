// Procedural sound design for the pitch. Writes 44.1 kHz stereo WAVs to public/audio/sfx.
// Usage: npm run sfx
import fs from 'node:fs';
import path from 'node:path';
import {SR, noise, buf, clamp, lerp, sweepBandpass, lowpass, reverb, stereo, writeWav as writeWavTo} from './dsp.mjs';

const OUT_DIR = path.resolve('public/audio/sfx');
fs.mkdirSync(OUT_DIR, {recursive: true});

const writeWav = (name, channels, peak) => writeWavTo(OUT_DIR, name, channels, peak);

// ---------- sounds ----------

// Riser: noise sweeping up + a rising tone. Builds tension into a reveal (3.4 s).
{
  const dur = 3.4;
  const src = buf(dur).map(noise);
  const swept = sweepBandpass(src, (t) => 250 * Math.pow(6000 / 250, Math.pow(t / dur, 1.6)), 2.2);
  const out = buf(dur);
  let ph = 0, ph2 = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, p = t / dur;
    const amp = Math.pow(p, 2.4);
    const f = 70 * Math.pow(420 / 70, Math.pow(p, 1.8)) * (1 + 0.012 * Math.sin(2 * Math.PI * 5.5 * t));
    ph += (2 * Math.PI * f) / SR;
    ph2 += (2 * Math.PI * f * 1.5) / SR;
    out[i] = swept[i] * amp * 1.4 + (Math.sin(ph) * 0.5 + Math.sin(ph2) * 0.18) * amp;
  }
  writeWav('riser', stereo(reverb(out, {mix: 0.25, tail: 0.3}), 0.5), 0.8);
}

// Impact: sub boom + noise crack with a long tail. The reveal hit.
{
  const dur = 1.2;
  const out = buf(dur);
  let ph = 0;
  const crack = lowpass(buf(dur).map(noise), 3500);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 35 + 85 * Math.exp(-t * 9);
    ph += (2 * Math.PI * f) / SR;
    const sub = Math.sin(ph) * Math.exp(-t * 3.2);
    const noiseHit = crack[i] * Math.exp(-t * 28) * 0.9;
    out[i] = Math.tanh((sub * 1.1 + noiseHit) * 1.6);
  }
  writeWav('impact', stereo(reverb(out, {decay: 0.86, mix: 0.32, tail: 2.2}), 0.4), 0.92);
}

// Shimmer: bright bell partials with long tail. For logo/wordmark sparkle.
{
  const dur = 2.2;
  const out = buf(dur);
  const partials = [
    [1318.5, 0.0, 0.5], [1975.5, 0.03, 0.35], [2637, 0.06, 0.3], [3951, 0.09, 0.18], [5274, 0.12, 0.1],
  ];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const [f, at, a] of partials) {
      if (t < at) continue;
      const tt = t - at;
      s += Math.sin(2 * Math.PI * f * tt + Math.sin(2 * Math.PI * 4 * tt) * 0.4) * a * Math.exp(-tt * 3.5) * Math.min(1, tt * 200);
    }
    out[i] = s;
  }
  writeWav('shimmer', stereo(reverb(out, {decay: 0.88, mix: 0.45, tail: 1.5}), 0.9), 0.5);
}

// Whoosh: band-passed noise swept up then down, bell envelope.
const makeWhoosh = (name, dur, lo, hi, peak) => {
  const src = buf(dur).map(noise);
  const swept = sweepBandpass(src, (t) => {
    const p = t / dur;
    return lo * Math.pow(hi / lo, Math.sin(Math.PI * Math.min(1, p * 1.1)));
  }, 1.4);
  const out = swept.map((v, i) => {
    const p = i / swept.length;
    return v * Math.pow(Math.sin(Math.PI * Math.pow(p, 0.7)), 2);
  });
  writeWav(name, stereo(reverb(out, {mix: 0.18, tail: 0.4}), 0.7), peak);
};
makeWhoosh('whoosh', 0.7, 500, 4200, 0.75);
makeWhoosh('whoosh-short', 0.35, 900, 5200, 0.6);

// Dry hit: punchy "golpe seco" for kinetic typography.
{
  const dur = 0.45;
  const out = buf(dur);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 48 + 140 * Math.exp(-t * 40);
    ph += (2 * Math.PI * f) / SR;
    const body = Math.sin(ph) * Math.exp(-t * 11);
    const click = noise() * Math.exp(-t * 180) * 0.6;
    out[i] = Math.tanh((body + click) * 2.2);
  }
  writeWav('hit', stereo(reverb(out, {mix: 0.12, tail: 0.35}), 0.2), 0.9);
}

// UI blip: short clean tone, for metric indicators lighting up.
const makeBlip = (name, f1, f2, peak) => {
  const dur = 0.18;
  const out = buf(dur);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = t < 0.06 ? f1 : f2;
    ph += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t * 22) * Math.min(1, t * 2000);
  }
  writeWav(name, stereo(reverb(out, {mix: 0.25, tail: 0.4}), 0.6), peak);
};
makeBlip('blip', 1320, 1760, 0.45);
makeBlip('blip-low', 880, 990, 0.45);

// Alert: two soft ascending pings.
{
  const dur = 0.9;
  const out = buf(dur);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const [f, at] of [[880, 0], [1318.5, 0.16]]) {
      if (t < at) continue;
      const tt = t - at;
      s += (Math.sin(2 * Math.PI * f * tt) + 0.3 * Math.sin(2 * Math.PI * f * 2 * tt)) * Math.exp(-tt * 6) * Math.min(1, tt * 400);
    }
    out[i] = s;
  }
  writeWav('alert', stereo(reverb(out, {mix: 0.3, tail: 0.8}), 0.6), 0.6);
}

// Phone ring: modern soft marimba-like double ring (1.6 s).
{
  const dur = 1.6;
  const out = buf(dur);
  const notes = [[1046.5, 0], [1318.5, 0.11], [1046.5, 0.5], [1318.5, 0.61]];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const [f, at] of notes) {
      if (t < at) continue;
      const tt = t - at;
      s += (Math.sin(2 * Math.PI * f * tt) + 0.25 * Math.sin(2 * Math.PI * f * 4 * tt) * Math.exp(-tt * 30)) * Math.exp(-tt * 7) * Math.min(1, tt * 600);
    }
    out[i] = s;
  }
  writeWav('ring', stereo(reverb(out, {mix: 0.25, tail: 0.6}), 0.5), 0.55);
}

// Low drone swell: soft tonal bed, used under quiet moments.
{
  const dur = 4;
  const out = buf(dur);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR, p = t / dur;
    const env = Math.sin(Math.PI * p);
    out[i] = (Math.sin(2 * Math.PI * 55 * t) * 0.6 + Math.sin(2 * Math.PI * 82.4 * t) * 0.3 + Math.sin(2 * Math.PI * 110.3 * t) * 0.15) * env;
  }
  writeWav('drone', stereo(lowpass(out, 600), 0.6), 0.5);
}

// Sonar ping: pure tone with a slight downward glide and a long, airy tail (radar detections).
{
  const dur = 0.9;
  const out = buf(dur);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 1250 * (1 - 0.06 * Math.min(1, t / 0.5));
    ph += (2 * Math.PI * f) / SR;
    out[i] = (Math.sin(ph) + 0.18 * Math.sin(2 * ph)) * Math.exp(-t * 5.5) * Math.min(1, t * 900);
  }
  writeWav('sonar-ping', stereo(reverb(out, {decay: 0.86, mix: 0.45, tail: 1.6}), 0.7), 0.5);
}

// Deep sonar ping for the hero detection: lower, longer, with a sub layer.
{
  const dur = 1.6;
  const out = buf(dur);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 880 * (1 - 0.05 * Math.min(1, t / 0.8));
    ph += (2 * Math.PI * f) / SR;
    out[i] = (Math.sin(ph) + 0.25 * Math.sin(2 * ph) + 0.5 * Math.sin(ph / 4)) * Math.exp(-t * 3) * Math.min(1, t * 700);
  }
  writeWav('sonar-hero', stereo(reverb(out, {decay: 0.88, mix: 0.5, tail: 2}), 0.8), 0.6);
}

// Coin: bright inharmonic metal partials with a quick decay (a coin landing on the desk).
{
  const dur = 0.8;
  const out = buf(dur);
  const partials = [[2637, 1, 9], [3951, 0.6, 12], [5274, 0.35, 16], [7020, 0.2, 22]];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const [f, a, d] of partials) s += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * d);
    // second, softer bounce
    if (t > 0.09) {
      const tt = t - 0.09;
      for (const [f, a, d] of partials) s += 0.45 * a * Math.sin(2 * Math.PI * f * 1.01 * tt) * Math.exp(-tt * d * 1.3);
    }
    out[i] = s * Math.min(1, t * 3000);
  }
  writeWav('coin', stereo(reverb(out, {mix: 0.2, tail: 0.5}), 0.5), 0.5);
}
