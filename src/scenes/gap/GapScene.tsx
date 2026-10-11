import React from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {useVoAmplitude} from '../../lib/useVoAmplitude';
import {getScene} from '../config';
import {GAP_LINE} from '../shared/handoffs';
import {PHONE, PhoneBody} from '../shared/Phone';

const scene = getScene('gap');
const vo = (word: string, n = 0) => scene.voAt + wordTime('gap', word, n);

const T = {
  wake: 0.35,
  ninety: vo('ninety'),
  pull: vo('yet') - 0.05,
  visit1: vo('between'),
  visit2: vo('visits'),
  mute: vo('nobody'),
  box: vo('nobody') + 0.1,
  until: vo('until'),
  morph: 8.95,
};

// World geometry (before the camera pull-back).
const CY = GAP_LINE.y;
const NEEDLE = {x1: 60, x2: 1860, top: CY - 300};
const BOX = {x0: NEEDLE.x1 + 55, x1: NEEDLE.x2 - 55, y0: CY - 215, y1: CY + 215};
const TAG_X = 1180;
const AMP = 135;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const GREY = 'rgba(9,38,52,0.32)';

export const GapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const voice = useVoAmplitude(scene);

  // Camera: a slow push while the wave wakes, then a pull-back to reveal the two visits.
  const pullK = interpolate(t, [T.pull, T.visit2 + 0.35], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const kick = t > T.until ? Math.sin(Math.min(1, (t - T.until) / 0.35) * Math.PI) * 0.025 : 0;
  const cs = 1 + 0.025 * Math.min(1, t / T.pull) - (1.025 - 0.74) * pullK + kick;
  // Vertical framing: tilt down to make room for the tag, then settle so needles + box sit centered.
  const offY = interpolate(t, [0.3, 1.1], [0, 130], {...clamp, easing: Easing.inOut(Easing.cubic)}) - 80 * pullK;
  const toScreen = (x: number, y: number) => ({x: 960 + (x - 960) * cs, y: 540 + (y - 540) * cs + offY});

  // Morph into the phone of the next scene.
  const m = Easing.inOut(Easing.cubic)(interpolate(t, [T.morph, scene.seconds - 1 / fps], [0, 1], clamp));

  // Wave state: wakes up, goes quiet ("nobody is listening"), comes back hard on "until now".
  const wake = interpolate(t, [T.wake, T.wake + 0.8], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const state =
    t < T.until
      ? interpolate(t, [T.mute, T.mute + 0.6], [1, 0.16], {...clamp, easing: Easing.inOut(Easing.sin)})
      : interpolate(t, [T.until, T.until + 0.12, T.until + 0.7], [0.16, 1.4, 1], clamp);
  const amp = AMP * wake * state * (0.5 + 0.8 * voice) * (1 - m);
  const color =
    t < T.mute
      ? interpolateColors(wake, [0, 1], [COLORS.ink, COLORS.coral])
      : t < T.until
        ? interpolateColors(t, [T.mute, T.mute + 0.5], [COLORS.coral, GREY])
        : interpolateColors(t, [T.until, T.until + 0.05], [GREY, COLORS.coral]);

  // Wave span: the short line from the logo stretches out, then reaches the two visits.
  const spread = interpolate(t, [0, 0.6], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const reach = interpolate(t, [T.visit1, T.visit2 + 0.3], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const x0 = GAP_LINE.x - GAP_LINE.width / 2 + (260 - (GAP_LINE.x - GAP_LINE.width / 2)) * spread + (NEEDLE.x1 - 260) * reach;
  const x1 = GAP_LINE.x + GAP_LINE.width / 2 + (1660 - (GAP_LINE.x + GAP_LINE.width / 2)) * spread + (NEEDLE.x2 - 1660) * reach;
  const env = (x: number) => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, (x - x0) / (x1 - x0)))), 1.4);
  const waveAt = (x: number, tt: number) =>
    0.62 * Math.sin((2 * Math.PI * x) / 260 - tt * 5.2) +
    0.38 * Math.sin((2 * Math.PI * x) / 118 + tt * 3.1) * (0.6 + 0.4 * noise2D('gap', x * 0.003, tt * 1.2));
  const waveY = (x: number) => CY + amp * env(x) * waveAt(x, t);
  // The tag rides a smoothed version of the wave so it bobs with the voice without jittering.
  const tagY = CY + amp * env(TAG_X) * ([0, 0.05, 0.1, 0.15].reduce((a, d) => a + waveAt(TAG_X, t - d), 0) / 4) - 4;
  const N = 260;
  const path = new Array(N)
    .fill(0)
    .map((_, i) => {
      const x = x0 + ((x1 - x0) * i) / (N - 1);
      return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${waveY(x).toFixed(1)}`;
    })
    .join(' ');

  return (
    <AbsoluteFill>
      <BrandBackground />

      {/* World: wave, statistic tag and the two visits, under one camera */}
      <AbsoluteFill style={{transform: `translateY(${offY}px) scale(${cs})`}}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <Needle x={NEEDLE.x1} at={T.visit1} label="VISIT 1" t={t} away={m} />
          <Needle x={NEEDLE.x2} at={T.visit2} label="VISIT 2" t={t} away={m} />
          <path d={path} fill="none" stroke={color} strokeWidth={GAP_LINE.stroke + wake} strokeLinecap="round" strokeLinejoin="round" opacity={Math.max(0, 1 - m * 6)} />
        </svg>
        <StatTag t={t} dot={{x: TAG_X, y: waveY(TAG_X)}} anchor={{x: TAG_X, y: Math.min(tagY, CY - 30)}} voice={voice} />
      </AbsoluteFill>

      <GapBox t={t} m={m} toScreen={toScreen} />

      <VoiceOver scene={scene} />
      <Sfx name="shimmer" at={T.wake} volume={0.22} />
      <Sfx name="blip" at={T.ninety} volume={0.4} />
      <Sfx name="whoosh" at={T.pull} volume={0.32} />
      <Sfx name="hit" at={T.visit1 + 0.22} volume={0.45} />
      <Sfx name="hit" at={T.visit2 + 0.22} volume={0.45} />
      <Sfx name="drone" at={T.mute} volume={0.22} />
      <Sfx name="impact" at={T.until - 0.03} volume={0.6} />
      <Sfx name="whoosh" at={T.morph} volume={0.4} />
    </AbsoluteFill>
  );
};

// "Visit" needle that drops in from above and lands on the wave's baseline.
const Needle: React.FC<{x: number; at: number; label: string; t: number; away: number}> = ({x, at, label, t, away}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - at) * fps, fps, config: {damping: 11, stiffness: 170, mass: 0.8}});
  if (s <= 0.001) return null;
  const dy = (1 - s) * -900 - away * 1100;
  const top = NEEDLE.top + dy;
  const base = CY + Math.min(0, dy);
  return (
    <g>
      <line x1={x} x2={x} y1={top} y2={base} stroke={COLORS.ink} strokeWidth={5} strokeLinecap="round" />
      <circle cx={x} cy={top} r={14} fill={COLORS.ink} />
      <circle cx={x} cy={base} r={9} fill={COLORS.ink} />
      <text x={x} y={top - 34} textAnchor="middle" fontFamily={FONTS.display} fontWeight={800} fontSize={50} letterSpacing={3} fill={COLORS.ink}>
        {label}
      </text>
    </g>
  );
};

// "Nearly 90% · speech impairment": a tag on a thread that rises from the wave's crest and rides the voice.
const StatTag: React.FC<{t: number; dot: {x: number; y: number}; anchor: {x: number; y: number}; voice: number}> = ({t, dot, anchor, voice}) => {
  const {fps} = useVideoConfig();
  const at = T.ninety - 0.12;
  if (t < at) return null;
  const thread = interpolate(t, [at, at + 0.22], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const pop = spring({frame: (t - at - 0.12) * fps, fps, config: {damping: 10, stiffness: 190, mass: 0.7}});
  const out = interpolate(t, [T.pull, T.pull + 0.45], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const tau = Math.max(0, t - at - 0.12);
  const swing = 8 * Math.exp(-1.8 * tau) * Math.sin(7 * tau) + Math.sin(t * 1.7) * 1.2;
  const count = interpolate(t, [T.ninety, T.ninety + 0.7], [0, 90], {...clamp, easing: Easing.out(Easing.cubic)});
  const L = 120 * thread * (1 - out);
  const W = 430;
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <line x1={dot.x} x2={anchor.x} y1={dot.y} y2={anchor.y - L} stroke={COLORS.coral} strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" opacity={thread * (1 - out)} />
        <circle cx={dot.x} cy={dot.y} r={9 * thread * (1 - out)} fill={COLORS.coral} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: anchor.x - W / 2,
          top: anchor.y - L - 250,
          width: W,
          height: 250,
          transformOrigin: '50% 100%',
          transform: `rotate(${swing}deg) scale(${pop * (1 - out)})`,
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <div
          style={{
            width: '100%',
            background: COLORS.ink,
            borderRadius: 24,
            padding: '20px 28px 22px',
            boxShadow: '0 24px 44px rgba(9,38,52,0.25)',
            color: COLORS.paper,
            fontFamily: FONTS.ui,
          }}
        >
          <div style={{fontSize: 18, fontWeight: 700, letterSpacing: 5, color: COLORS.coral}}>NEARLY</div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontWeight: 800,
              fontSize: 118,
              lineHeight: 1,
              marginTop: 2,
              fontVariantNumeric: 'tabular-nums',
              transform: `scale(${1 + voice * 0.07})`,
              transformOrigin: 'left center',
            }}
          >
            {Math.round(count)}%
          </div>
          <div style={{fontSize: 18, fontWeight: 700, letterSpacing: 3.5, marginTop: 8}}>SPEECH IMPAIRMENT</div>
          <div style={{fontSize: 18, opacity: 0.6, marginTop: 2}}>in people with Parkinson’s</div>
        </div>
      </div>
    </>
  );
};

// "The monitoring gap": a dashed box drawn between the visits. On "until now" it turns solid,
// then it rounds off and shrinks into the phone of the next scene.
const GapBox: React.FC<{t: number; m: number; toScreen: (x: number, y: number) => {x: number; y: number}}> = ({t, m, toScreen}) => {
  const draw = interpolate(t, [T.box, T.box + 0.75], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  if (draw <= 0) return null;
  const solid = interpolate(t, [T.until, T.until + 0.25], [0, 1], clamp);
  const a = toScreen(BOX.x0, BOX.y0);
  const b = toScreen(BOX.x1, BOX.y1);
  const box = {x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y};
  const legend = 'THE MONITORING GAP';

  if (m <= 0) {
    // Dashed outline, drawn on with a mask; dashes close up on "until now".
    const perim = 2 * (box.w + box.h);
    return (
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <mask id="gap-draw">
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={18} fill="none" stroke="white" strokeWidth={12} pathLength={1} strokeDasharray={`${draw} 1`} />
          </mask>
        </defs>
        <rect
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          rx={18}
          fill="none"
          stroke={COLORS.ink}
          strokeWidth={3 + solid}
          strokeDasharray={`14 ${14 * (1 - solid)}`}
          mask="url(#gap-draw)"
          style={{strokeDashoffset: -perim * 0.002 * t * 30}}
        />
        <Legend x={box.x + 34} y={box.y} text={legend} t={t} />
      </svg>
    );
  }

  // Morph: the solid box becomes the phone body (same tilt as the next scene).
  const lerp = (p: number, q: number) => p + (q - p) * m;
  const target = {x: PHONE.x - PHONE.w / 2, y: PHONE.y - PHONE.h / 2, w: PHONE.w, h: PHONE.h};
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: lerp(box.x, target.x),
          top: lerp(box.y, target.y),
          width: lerp(box.w, target.w),
          height: lerp(box.h, target.h),
          borderRadius: lerp(18, PHONE.radius),
          border: `${4 * (1 - m)}px solid ${COLORS.ink}`,
          transform: `perspective(1600px) rotateY(${PHONE.tiltY * m}deg)`,
          transformOrigin: 'center center',
        }}
      >
        <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, m * 14)}}>
          <PhoneBody>{null}</PhoneBody>
        </div>
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: 1 - m * 3}}>
        <Legend x={box.x + 34} y={box.y} text={legend} t={t} />
      </svg>
    </AbsoluteFill>
  );
};

const Legend: React.FC<{x: number; y: number; text: string; t: number}> = ({x, y, text, t}) => {
  const shown = Math.floor(interpolate(t, [T.box + 0.2, T.box + 0.75], [0, text.length], clamp));
  const w = text.length * 15.2 + 28;
  return (
    <g>
      <rect x={x - 14} y={y - 14} width={w * Math.min(1, shown / 3)} height={28} fill={COLORS.paper} />
      <text x={x} y={y + 8} fontFamily={FONTS.ui} fontWeight={700} fontSize={22} letterSpacing={4} fill={COLORS.ink}>
        {text.slice(0, shown)}
      </text>
    </g>
  );
};
