// Procedural sound design for the pitch. Writes 44.1 kHz stereo WAVs to public/audio/sfx.
// Usage: npm run sfx
import fs from 'node:fs';
import path from 'node:path';

const SR = 44100;
const OUT_DIR = path.resolve('public/audio/sfx');
fs.mkdirSync(OUT_DIR, {recursive: true});

// ---------- helpers ----------
let seed = 1234567;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rand() * 2 - 1;
const buf = (seconds) => new Float32Array(Math.round(seconds * SR));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

// RBJ biquad band-pass, coefficients recomputed per sample so the center can sweep.
const sweepBandpass = (input, centerAt, q = 1.2) => {
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const f = centerAt(i / SR);
    const w0 = (2 * Math.PI * f) / SR;
    const alpha = Math.sin(w0) / (2 * q);
    const a0 = 1 + alpha;
    const b0 = alpha / a0, b2 = -alpha / a0;
    const a1 = (-2 * Math.cos(w0)) / a0, a2 = (1 - alpha) / a0;
    const x = input[i];
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
};

const lowpass = (input, cutoff) => {
  const out = new Float32Array(input.length);
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < input.length; i++) out[i] = y += a * (input[i] - y);
  return out;
};

// Small Schroeder reverb for a sense of space.
const reverb = (input, {decay = 0.82, mix = 0.3, tail = 1.5} = {}) => {
  const len = input.length + Math.round(tail * SR);
  const dry = new Float32Array(len);
  dry.set(input);
  const combs = [1557, 1617, 1491, 1422].map((d) => ({d, buf: new Float32Array(d), i: 0}));
  const aps = [225, 556].map((d) => ({d, buf: new Float32Array(d), i: 0}));
  const out = new Float32Array(len);
  for (let n = 0; n < len; n++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.buf[c.i] = dry[n] + y * decay;
      c.i = (c.i + 1) % c.d;
      s += y;
    }
    s /= combs.length;
    for (const a of aps) {
      const y = a.buf[a.i];
      a.buf[a.i] = s + y * 0.5;
      a.i = (a.i + 1) % a.d;
      s = y - s * 0.5;
    }
    out[n] = dry[n] * (1 - mix) + s * mix;
  }
  return out;
};

const normalize = (ch, peak = 0.89) => {
  let m = 0;
  for (const c of ch) for (const v of c) m = Math.max(m, Math.abs(v));
  const g = m ? peak / m : 1;
  return ch.map((c) => c.map((v) => v * g));
};

// Constant-power stereo spread of a mono signal plus a decorrelated copy.
const stereo = (mono, width = 0.3) => {
  const d = Math.round(0.011 * SR);
  const L = new Float32Array(mono.length), R = new Float32Array(mono.length);
  for (let i = 0; i < mono.length; i++) {
    const delayed = i >= d ? mono[i - d] : 0;
    L[i] = mono[i] * (1 - width * 0.5) + delayed * width * 0.5;
    R[i] = mono[i] * (1 - width * 0.5) - delayed * width * 0.5 + delayed * width * 0.3;
  }
  return [L, R];
};

const writeWav = (name, channels, peak) => {
  const [L, R] = normalize(channels, peak);
  const n = L.length;
  const b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    // short fade in/out to avoid clicks
    const f = Math.min(1, i / 64, (n - 1 - i) / 256);
    b.writeInt16LE(Math.round(clamp(L[i] * f, -1, 1) * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(clamp(R[i] * f, -1, 1) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path.join(OUT_DIR, `${name}.wav`), b);
  console.log(`${name}.wav  ${(n / SR).toFixed(2)}s`);
};

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
