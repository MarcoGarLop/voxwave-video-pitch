import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {COLORS, FONTS} from '../../brand/tokens';
import {LOGO} from '../../brand/logo';
import {LOGO_CENTERLINES} from '../../brand/logoCenterlines';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {resampleSmooth, toPolyline, type Pt} from '../../lib/curves';
import {useVoAmplitude} from '../../lib/useVoAmplitude';
import {getScene} from '../config';
import {CLOSE_WAVE} from '../shared/handoffs';

const scene = getScene('close');
const vo = (word: string, n = 0) => scene.voAt + wordTime('close', word, n);

// Scene 19 — the close. "Between visits, a voice still has something to say": the grey, almost flat line
// left by the MVP scene trembles with the narrator but nobody hears it. "VoxWave makes sure someone hears
// it": a coral point runs along it and lights it up into a living voice wave, which slowly locks into the
// logo (same three-stroke morph as the opening, with a soft crossfade into the filled logo). Then the
// question from the opening comes back over it, "What if the answer was there all along?", the event
// line, and a slow fade out.
const T = {
  visits: vo('visits') - 0.15,
  ignite: vo('voxwave') - 0.15,
  igniteEnd: vo('someone'),
  morphStart: vo('someone'),
  reveal: vo('someone') + 0.95,
  wordmark: vo('someone') + 1.05,
  footer: vo('along') + 0.6,
  fade: scene.seconds - 0.55,
};

// When the logo forms (scene time); the music ending resolves on it.
export const CLOSE_REVEAL = T.reveal;

const N = 320;
const W = CLOSE_WAVE;
// Final lockup: symbol + wordmark, centred at LOCK.y, LOCK.width wide.
const LOCK = {y: 430, width: 700};
const K = LOCK.width / 1254;
const LOCK_CENTER = {x: 634, y: 637.5};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.75, 0, 0.2, 1);

const STROKES = [
  {key: 'navy', color: COLORS.navy, offset: -6, phase: 0},
  {key: 'coral', color: COLORS.coral, offset: 0, phase: 2.1},
  {key: 'teal', color: COLORS.teal, offset: 6, phase: 4.2},
] as const;

const LETTERS = [
  ...LOGO.wordmark.navy.map((d) => ({d, tone: 'navy' as const})),
  ...LOGO.wordmark.teal.map((d) => ({d, tone: 'teal' as const})),
].sort((a, b) => parseFloat(a.d.slice(1)) - parseFloat(b.d.slice(1)));

// The handed-over grey line (61-point polyline of handoffs.wavePath), sampled at N points so it can morph.
const baseY = (u: number, amp: number, phase: number) => {
  const yAt = (i: number) => W.y + Math.sin(i * 0.85 + phase) * amp * Math.sin((i / 60) * Math.PI);
  const i0 = Math.min(59, Math.floor(u));
  return yAt(i0) + (yAt(i0 + 1) - yAt(i0)) * (u - i0);
};

// Living voice wave on top of the line (as in the opening): two travelling sines with noisy "syllables".
const voiceY = (x: number, t: number, i: number) => {
  const syllable = 0.55 + 0.45 * noise2D(`cl${i}`, x * 0.0025, t * 1.6);
  const ph = STROKES[i].phase;
  return syllable * (0.62 * Math.sin((2 * Math.PI * x) / (250 + 40 * i) + t * (2.4 + 0.6 * i) + ph) + 0.38 * Math.sin((2 * Math.PI * x) / (105 + 18 * i) - t * 3.3 + ph * 2));
};

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const voice = useVoAmplitude(scene);

  const targets = useMemo(
    () =>
      STROKES.map(({key}) =>
        resampleSmooth(LOGO_CENTERLINES[key].points, N).map(([x, y]): Pt => [960 + (x - LOCK_CENTER.x) * K, LOCK.y + (y - LOCK_CENTER.y) * K]),
      ),
    [],
  );

  // Grey phase: the line breathes and trembles faintly with the narrator, unheard.
  const lit = interpolate(t, [T.ignite, T.igniteEnd], [0, 1], clamp);
  const greyAmp = W.amp + voice * 9 * (1 - lit);
  const phase = t * 0.5;
  // The coral point runs left to right; behind it the wave lights up and swells.
  const dotX = W.x0 + (W.x1 - W.x0) * Easing.inOut(Easing.sin)(lit);
  const swell = interpolate(t, [T.ignite, T.morphStart], [0, 150], {...clamp, easing: Easing.in(Easing.quad)});
  const morphOf = (i: number) => ease(interpolate(t, [T.morphStart + i * 0.08, T.reveal - 0.1 - (2 - i) * 0.03], [0, 1], clamp));
  const split = interpolate(t, [T.morphStart - 0.1, T.morphStart + 0.2], [0, 1], clamp);
  const strokesOn = interpolate(t, [T.reveal - 0.15, T.reveal + 0.3], [1, 0], {...clamp, easing: Easing.inOut(Easing.quad)});

  const wave = (i: number): Pt[] => {
    const pts: Pt[] = [];
    for (let j = 0; j < N; j++) {
      const u = (j / (N - 1)) * 60;
      const x = W.x0 + (j / (N - 1)) * (W.x1 - W.x0);
      const behind = interpolate(dotX - x, [0, 260], [0, 1], clamp);
      const env = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, x / 1920))), 2);
      let y = baseY(u, greyAmp, phase) + STROKES[i].offset * split + swell * env * behind * voiceY(x, t, i);
      const m = morphOf(i);
      if (m > 0) y = y + (targets[i][j][1] - y) * m;
      pts.push([m > 0 ? x + (targets[i][j][0] - x) * m : x, y]);
    }
    return pts;
  };
  const strokeW = (i: number) => interpolate(Math.pow(morphOf(i), 3), [0, 1], [W.stroke, LOGO_CENTERLINES[STROKES[i].key].width * K]);

  // Logo, wordmark, tagline, event line.
  // Soft handover from the strokes to the filled logo (no hard swap).
  const logoIn = interpolate(t, [T.reveal - 0.2, T.reveal + 0.2], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const kick = interpolate(t, [T.reveal - 0.2, T.reveal + 0.6], [0.985, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const visits = interpolate(t, [T.visits, T.visits + 0.35], [0, 1], clamp) * (1 - interpolate(t, [T.ignite, T.ignite + 0.35], [0, 1], clamp));
  const fadeOut = interpolate(t, [T.fade, scene.seconds - 1 / fps], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const dotR = 12 * interpolate(t, [T.ignite - 0.1, T.ignite + 0.1, T.igniteEnd - 0.05, T.igniteEnd + 0.15], [0, 1, 1, 0], clamp);
  const dotY = baseY(((dotX - W.x0) / (W.x1 - W.x0)) * 60, greyAmp, phase);

  return (
    <AbsoluteFill>
      <BrandBackground />

      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          <clipPath id="close-lit">
            <rect x={-100} y={-200} width={Math.max(0, dotX + 100)} height={1480} />
          </clipPath>
          <clipPath id="close-unlit">
            <rect x={dotX} y={-200} width={2200} height={1480} />
          </clipPath>
        </defs>

        {/* Visit markers at both ends: "between visits" */}
        {visits > 0 &&
          [260, 1660].map((x) => (
            <g key={x} opacity={visits}>
              <line x1={x} x2={x} y1={W.y - 46} y2={W.y + 46} stroke={COLORS.inkSoft} strokeWidth={3} strokeLinecap="round" />
              <text x={x} y={W.y - 66} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={700} fontSize={18} letterSpacing={4} fill={COLORS.inkSoft}>
                VISIT
              </text>
            </g>
          ))}

        {strokesOn > 0 && (
          <g opacity={strokesOn}>
            {/* Unlit part (grey) and lit part (coral, then the three brand strokes) */}
            {lit < 1 && <polyline points={toPolyline(wave(1))} fill="none" stroke={W.color} strokeWidth={W.stroke} strokeLinecap="round" strokeLinejoin="round" clipPath="url(#close-unlit)" />}
            <g clipPath={lit < 1 ? 'url(#close-lit)' : undefined}>
              {STROKES.map((s, i) => (
                <polyline
                  key={s.key}
                  points={toPolyline(wave(i))}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeW(i)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={s.key === 'coral' ? 1 : split}
                />
              ))}
            </g>
          </g>
        )}
        {dotR > 0.2 && (
          <g>
            <circle cx={dotX} cy={dotY} r={dotR * 2.2} fill={COLORS.coral} opacity={0.18} />
            <circle cx={dotX} cy={dotY} r={dotR} fill={COLORS.coral} />
          </g>
        )}

        {/* The real logo takes over on the reveal */}
        {logoIn > 0 && (
          <g opacity={logoIn} transform={`translate(960 ${LOCK.y}) scale(${K * kick}) translate(${-LOCK_CENTER.x} ${-LOCK_CENTER.y})`}>
            <path d={LOGO.symbol.navy.join('')} fill={COLORS.navy} />
            <path d={LOGO.symbol.teal.join('')} fill={COLORS.teal} />
            <path d={LOGO.symbol.coral.join('')} fill={COLORS.coral} />
            <clipPath id="close-wordmark">
              <rect x={0} y={750} width={1254} height={200} />
            </clipPath>
            <g clipPath="url(#close-wordmark)">
              {LETTERS.map((l, i) => {
                const s = spring({frame: (t - T.wordmark) * fps - i * 2, fps, config: {damping: 13, stiffness: 140, mass: 0.6}});
                return <path key={i} d={l.d} fill={l.tone === 'navy' ? COLORS.navy : COLORS.teal} transform={`translate(0 ${(1 - s) * 200})`} />;
              })}
            </g>
          </g>
        )}
      </svg>

      <Question t={t} />
      <Footer t={t} />

      {fadeOut > 0 && <AbsoluteFill style={{backgroundColor: COLORS.black, opacity: fadeOut}} />}

      <VoiceOver scene={scene} />
      <Sfx name="whoosh-short" at={T.ignite} volume={0.3} />
      <Sfx name="shimmer" at={T.reveal - 0.2} volume={0.25} />
    </AbsoluteFill>
  );
};

// "What if the answer was there all along?" — word by word with the voice, the last three in coral.
const Question: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const words = ['What', 'if', 'the', 'answer', 'was', 'there', 'all', 'along?'];
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 640,
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        fontFamily: FONTS.display,
        fontWeight: 700,
        fontSize: 52,
        color: COLORS.ink,
      }}
    >
      {words.map((w, i) => {
        const s = spring({frame: (t - vo(w.replace('?', '').toLowerCase())) * fps, fps, config: {damping: 13, stiffness: 220, mass: 0.6}});
        return (
          <span key={i} style={{display: 'inline-block', opacity: s, transform: `translateY(${(1 - s) * 24}px)`, color: i >= 5 ? COLORS.coral : COLORS.ink}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

const Footer: React.FC<{t: number}> = ({t}) => {
  const k = interpolate(t, [T.footer, T.footer + 0.4], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  if (k <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 740,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        fontFamily: FONTS.ui,
        fontWeight: 700,
        fontSize: 18,
        letterSpacing: 5,
        color: COLORS.inkSoft,
        opacity: k,
        transform: `translateY(${(1 - k) * 12}px)`,
      }}
    >
      CREATIVE SHOCK 2026
      <span style={{width: 7, height: 7, borderRadius: '50%', background: COLORS.coral}} />
      FDIPROTOCOL
    </div>
  );
};
