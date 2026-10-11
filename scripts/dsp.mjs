// Small DSP toolkit shared by the procedural sound effects (sfx.mjs) and the music bed (music.mjs).
import fs from 'node:fs';
import path from 'node:path';

export const SR = 44100;

// ---------- helpers ----------
let seed = 1234567;
export const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
export const noise = () => rand() * 2 - 1;
export const buf = (seconds) => new Float32Array(Math.round(seconds * SR));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// RBJ biquad band-pass, coefficients recomputed per sample so the center can sweep.
export const sweepBandpass = (input, centerAt, q = 1.2) => {
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

export const lowpass = (input, cutoff) => {
  const out = new Float32Array(input.length);
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < input.length; i++) out[i] = y += a * (input[i] - y);
  return out;
};

// Small Schroeder reverb for a sense of space.
export const reverb = (input, {decay = 0.82, mix = 0.3, tail = 1.5} = {}) => {
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

export const normalize = (ch, peak = 0.89) => {
  let m = 0;
  for (const c of ch) for (const v of c) m = Math.max(m, Math.abs(v));
  const g = m ? peak / m : 1;
  return ch.map((c) => c.map((v) => v * g));
};

// Constant-power stereo spread of a mono signal plus a decorrelated copy.
export const stereo = (mono, width = 0.3) => {
  const d = Math.round(0.011 * SR);
  const L = new Float32Array(mono.length), R = new Float32Array(mono.length);
  for (let i = 0; i < mono.length; i++) {
    const delayed = i >= d ? mono[i - d] : 0;
    L[i] = mono[i] * (1 - width * 0.5) + delayed * width * 0.5;
    R[i] = mono[i] * (1 - width * 0.5) - delayed * width * 0.5 + delayed * width * 0.3;
  }
  return [L, R];
};

export const writeWav = (dir, name, channels, peak) => {
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
  fs.writeFileSync(path.join(dir, `${name}.wav`), b);
  console.log(`${name}.wav  ${(n / SR).toFixed(2)}s`);
};

