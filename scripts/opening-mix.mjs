// Rebuilds the sound of the team's cinematic opening (v08) with the mother's lines re-recorded.
// Writes public/opening/opening-v08-mix-new-mother.wav (48 kHz, 24-bit, stereo, 72.2 s).
// Usage: npm run opening-mix
//
// Sources (opening-v08/), 48 kHz 16-bit WAV (mono, except the shot ambience, which is stereo):
//   stems/dialogue-phone.wav  the team's phone-filtered dialogue (both voices, 3 s lead, 50 s);
//                             cues in stems/dialogue-edit.json (mother = turns 1, 3, 5, 7, 9, 11)
//   stems/bed.wav, ring.wav   music/SFX bed and the ringtone, as placed in the final v08 mix
//   stems/amb1..4.wav         the audio of the four generated shots (ambience)
//   mother/1..6.wav           the new recordings of the mother's six lines, in order
// They were converted from jjpaz/VoxWave (branch video/opening-v08-handoff) and Recursos/1..6.mpeg with
// `ffmpeg -i <src> -vn -ac <1|2> -ar 48000 -c:a pcm_s16le`.
//
// The chain follows video/tools/finalize_opening_v08.py of that branch: the daughter's turns are kept as
// they were; the new mother takes get the same telephone filter (highpass 300 Hz + lowpass 3400 Hz) and
// the level of the line they replace. Then: compressor (threshold 0.12, ratio 2, attack 15 ms, release
// 180 ms, makeup 1.5) -> x0.30 -> 2.8 s delay; ambience gains, limiter and fades per shot, ducked by the
// dialogue; ring x0.8; bed; a final limiter at 0.7943. The narrator's logo tail is not used any more.
// As in ffmpeg, the mono sources become stereo at -3 dB (centre mix level) before any processing.
// `CONTROL=1 OUT=<file> npm run opening-mix` rebuilds the original mix instead (no replacement), to check
// this chain against the team's mix.wav.
import fs from 'node:fs';
import path from 'node:path';

const SR = 48000;
const END = 72.2;
const N = Math.round(END * SR);
const DIR = path.resolve('opening-v08');

const MONO = Math.SQRT1_2;

// 16-bit PCM WAV -> one Float32Array per channel.
const readWav = (file) => {
  const b = fs.readFileSync(file);
  let p = 12;
  let channels = 1;
  while (p < b.length) {
    const id = b.toString('ascii', p, p + 4);
    const len = b.readUInt32LE(p + 4);
    if (id === 'fmt ') channels = b.readUInt16LE(p + 10);
    if (id === 'data') {
      const n = len / 2 / channels;
      const out = Array.from({length: channels}, () => new Float32Array(n));
      for (let i = 0; i < n; i++) for (let c = 0; c < channels; c++) out[c][i] = b.readInt16LE(p + 8 + (i * channels + c) * 2) / 32768;
      return out;
    }
    p += 8 + len + (len & 1);
  }
  throw new Error(`no data in ${file}`);
};
const readMono = (file) => readWav(file)[0];

const writeWav24 = (file, L, R) => {
  const n = L.length;
  const b = Buffer.alloc(44 + n * 6);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 6, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 6, 28); b.writeUInt16LE(6, 32); b.writeUInt16LE(24, 34);
  b.write('data', 36); b.writeUInt32LE(n * 6, 40);
  for (let i = 0; i < n; i++) {
    b.writeIntLE(Math.round(Math.max(-1, Math.min(1, L[i])) * 8388607), 44 + i * 6, 3);
    b.writeIntLE(Math.round(Math.max(-1, Math.min(1, R[i])) * 8388607), 47 + i * 6, 3);
  }
  fs.writeFileSync(file, b);
};

// RBJ biquad (Butterworth Q), as ffmpeg's highpass/lowpass with default poles=2.
const biquad = (x, type, f) => {
  const w0 = (2 * Math.PI * f) / SR;
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const cos = Math.cos(w0);
  const [b0, b1, b2] = type === 'lp' ? [(1 - cos) / 2, 1 - cos, (1 - cos) / 2] : [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
  const out = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
};

// RMS-detecting compressor (feed-forward), close to ffmpeg's acompressor / sidechaincompress.
const compressGain = (detector, {threshold, ratio, attack, release}) => {
  const a = Math.exp(-1 / (attack * SR));
  const r = Math.exp(-1 / (release * SR));
  const g = new Float32Array(detector.length);
  let env = 0;
  for (let i = 0; i < detector.length; i++) {
    const sq = detector[i] * detector[i];
    env = sq > env ? a * env + (1 - a) * sq : r * env + (1 - r) * sq;
    const lvl = Math.sqrt(env);
    g[i] = lvl > threshold ? (threshold * Math.pow(lvl / threshold, 1 / ratio)) / lvl : 1;
  }
  return g;
};

// Peak limiter with a short attack and release (ffmpeg alimiter, level=0), linked across channels.
const limit = (chs, ceiling) => {
  const att = Math.exp(-1 / (0.005 * SR)), rel = Math.exp(-1 / (0.05 * SR));
  let g = 1;
  const out = chs.map((c) => new Float32Array(c.length));
  for (let i = 0; i < chs[0].length; i++) {
    const peak = Math.max(...chs.map((c) => Math.abs(c[i])));
    const need = peak > ceiling ? ceiling / peak : 1;
    g = need < g ? att * g + (1 - att) * need : rel * g + (1 - rel) * need;
    chs.forEach((c, k) => (out[k][i] = Math.max(-ceiling, Math.min(ceiling, c[i] * g))));
  }
  return out;
};

const rms = (x, a = 0, b = x.length) => {
  let s = 0, n = 0;
  for (let i = a; i < b; i++) if (Math.abs(x[i]) > 0.003) { s += x[i] * x[i]; n++; }
  return n ? Math.sqrt(s / n) : 0;
};

// Where the speech starts in a take (first 20 ms window within 35 dB of its loudest one).
const speechStart = (x) => {
  const win = Math.round(0.02 * SR);
  const lv = [];
  for (let i = 0; i + win <= x.length; i += win) {
    let s = 0;
    for (let k = 0; k < win; k++) s += x[i + k] ** 2;
    lv.push(10 * Math.log10(s / win + 1e-12));
  }
  const th = Math.max(...lv) - 35;
  return Math.max(0, lv.findIndex((v) => v > th)) * win;
};

// ---------- dialogue: daughter as recorded, mother re-recorded ----------
const edit = JSON.parse(fs.readFileSync(path.join(DIR, 'stems/dialogue-edit.json'), 'utf8').replace(/^﻿/, ''));
const original = readMono(path.join(DIR, 'stems/dialogue-phone.wav'));
// Room after the last line: the new "Love you too. Bye" runs ~1 s past the end of the original stem.
const dialogue = new Float32Array(original.length + 2 * SR);
dialogue.set(original);
// CONTROL=1 rebuilds the original mix (no replacement) to check the chain against the team's mix.
const CONTROL = process.env.CONTROL === '1';
const MOTHER_TURNS = [0, 2, 4, 6, 8, 10];
(CONTROL ? [] : MOTHER_TURNS).forEach((turn, i) => {
  const cue = edit.cues[turn];
  const a = Math.round((cue.start - 0.05) * SR);
  const b = Math.round((cue.end + 0.05) * SR);
  const target = rms(original, a, b);
  // Silence the old line (short fades at the edges).
  for (let k = a; k < b; k++) {
    const f = Math.min(1, (k - a) / (0.01 * SR), (b - k) / (0.01 * SR));
    dialogue[k] *= 1 - Math.max(0, Math.min(1, f));
  }
  // The new take, through the same telephone filter, at the level of the line it replaces.
  let take = readMono(path.join(DIR, `mother/${i + 1}.wav`));
  take = biquad(biquad(take, 'hp', 300), 'lp', 3400);
  const g = target / rms(take);
  const start = Math.round(cue.start * SR) - speechStart(take);
  for (let k = 0; k < take.length; k++) {
    const at = start + k;
    if (at < 0 || at >= dialogue.length) continue;
    const fade = Math.min(1, k / (0.005 * SR), (take.length - 1 - k) / (0.02 * SR));
    dialogue[at] += take[k] * g * fade;
  }
  console.log(`mother ${i + 1}: cue ${cue.start.toFixed(2)}-${cue.end.toFixed(2)} s, take ${(take.length / SR).toFixed(2)} s, gain ${(20 * Math.log10(g)).toFixed(1)} dB`);
});

// The cards' voice wave follows this dialogue track. Same envelope as finalize_opening_v08.py: 10 ms RMS,
// normalised to the 92nd percentile of the active windows, attack 85 ms, release 240 ms. Written for
// src/opening/OpeningWave.tsx (stem time; the video adds the 2.8 s delay).
{
  const hop = Math.round(SR / 100);
  const raw = [];
  for (let i = 0; i < dialogue.length; i += hop) {
    let sum = 0;
    for (let k = i; k < Math.min(dialogue.length, i + hop); k++) sum += dialogue[k] * dialogue[k];
    raw.push(Math.sqrt(sum / hop));
  }
  const active = raw.filter((v) => v > 0.001).sort((x, y) => x - y);
  const ref = active[Math.floor(0.92 * active.length)];
  const levels = [];
  let value = 0;
  for (const v of raw) {
    const target = v > 0.001 ? Math.min(1.05, v / ref) : 0;
    const tau = target > value ? 0.085 : 0.24;
    value += (target - value) * (1 - Math.exp(-hop / (SR * tau)));
    if (value < 0.0005) value = 0;
    levels.push(Math.round(value * 1000) / 1000);
  }
  const waveFile = CONTROL ? `${process.env.OUT ?? 'opening-v08/control.wav'}.wave.json` : 'src/data/opening-wave.json';
  fs.writeFileSync(waveFile, JSON.stringify({dt: hop / SR, levels}));
}

// Compressor, level and 2.8 s delay (as in the final mix).
for (let i = 0; i < dialogue.length; i++) dialogue[i] *= MONO;
const cg = compressGain(dialogue, {threshold: 0.12, ratio: 2, attack: 0.015, release: 0.18});
const phone = new Float32Array(N);
const delay = Math.round(2.8 * SR);
for (let i = 0; i < dialogue.length && i + delay < N; i++) phone[i + delay] = dialogue[i] * cg[i] * 1.5 * 0.3;

// ---------- ambience of the four shots, ducked by the dialogue ----------
const SHOTS = [
  {file: 'amb1.wav', a: 0, b: 8.8, gainDb: -7.309244374564976, fadeOutAt: 8},
  {file: 'amb2.wav', a: 13.8, b: 18.8, gainDb: -6.172213048894406, fadeOutAt: 5},
  {file: 'amb3.wav', a: 29.8, b: 34.8, gainDb: -4.26017192295636, fadeOutAt: 5},
  {file: 'amb4.wav', a: 39.8, b: 44.8, gainDb: -10.454239696804173, fadeOutAt: 5},
];
const amb = [new Float32Array(N), new Float32Array(N)];
for (const s of SHOTS) {
  const src = readWav(path.join(DIR, 'stems', s.file));
  const len = Math.round((s.b - s.a) * SR);
  const g = Math.pow(10, s.gainDb / 20) * 2;
  const pre = src.map((c) => {
    const x = new Float32Array(len);
    for (let k = 0; k < len; k++) x[k] = (k < c.length ? c[k] : 0) * g;
    return x;
  });
  const lim = limit(pre, 0.06324);
  const outStart = (Math.min(s.b - s.a, s.fadeOutAt) - 0.5) * SR;
  for (let k = 0; k < len; k++) {
    const fin = Math.min(1, k / (0.3 * SR));
    const fout = k < outStart ? 1 : Math.max(0, 1 - (k - outStart) / (0.5 * SR));
    const at = Math.round(s.a * SR) + k;
    if (at < N) for (let c = 0; c < 2; c++) amb[c][at] += lim[c][k] * 0.5 * fin * fout;
  }
}
const duck = compressGain(phone, {threshold: 0.012, ratio: 3, attack: 0.03, release: 0.35});
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) amb[c][i] *= duck[i];

// ---------- mix ----------
const bed = readMono(path.join(DIR, 'stems/bed.wav'));
const ring = readMono(path.join(DIR, 'stems/ring.wav'));
const mix = [new Float32Array(N), new Float32Array(N)];
for (let i = 0; i < N; i++) {
  const centre = phone[i] + (bed[i] ?? 0) * MONO + (i < ring.length ? ring[i] * 0.8 * MONO : 0);
  for (let c = 0; c < 2; c++) mix[c][i] = centre + amb[c][i];
}
const out = limit(mix, 0.7943);
const file = CONTROL ? path.resolve(process.env.OUT ?? 'opening-v08/control.wav') : path.resolve('public/opening/opening-v08-mix-new-mother.wav');
writeWav24(file, out[0], out[1]);
console.log(`${path.relative(process.cwd(), file)}  ${END}s`);
