import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {COLORS} from '../../brand/tokens';
import {LOGO} from '../../brand/logo';
import {LOGO_CENTERLINES} from '../../brand/logoCenterlines';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {resampleSmooth, toPolyline, type Pt} from '../../lib/curves';
import {getScene} from '../config';
import {GAP_LINE} from '../shared/handoffs';

const scene = getScene('s01');

// Starts on the opening's last frame: a still coral line across the middle of a black screen
// (measured on the team's opening v08 at 60.5 s). It stretches out, splits into three voice waves that
// build up and lock into the logo.
const START_LINE = {x1: 481.5, x2: 1438.5, y: 540, width: 9.5};

// Beats (seconds from scene start).
const T = {
  split: 0.55,
  morphStart: 2.1,
  reveal: 2.8,
  wordmark: scene.voAt + wordTime('s01', 'voxwave') - 0.3,
  // The symbol drops into a paper bubble, which then floods the frame (scene "gap" starts on paper).
  exit: scene.voAt + 1.45,
  expand: scene.voAt + 2.0,
};

// Paper bubble the symbol lands in, centered on screen.
const AV = {x: 960, y: 540, r: 74, unitPx: 104 / 954};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const N = 320;
const LOGO_WIDTH = 900;
const K = LOGO_WIDTH / 1254; // logo units -> px
const SYMBOL_CENTER = {x: 634, y: 560};
const FULL_CENTER_Y = 637.5;

const STROKES = [
  {key: 'navy', color: COLORS.white, offset: -6, phase: 0},
  {key: 'coral', color: COLORS.coral, offset: 0, phase: 2.1},
  {key: 'teal', color: COLORS.tealBright, offset: 6, phase: 4.2},
] as const;

// Wordmark letters, left to right, so they can be revealed one by one.
const LETTERS = [
  ...LOGO.wordmark.navy.map((d) => ({d, tone: 'navy' as const})),
  ...LOGO.wordmark.teal.map((d) => ({d, tone: 'teal' as const})),
].sort((a, b) => parseFloat(a.d.slice(1)) - parseFloat(b.d.slice(1)));

const ease = Easing.bezier(0.75, 0, 0.2, 1);

// Voice-like waveform: two travelling sines, modulated by noise ("syllables") and a center-weighted envelope.
// "reach" stretches the line from the opening's still coral line to the full width.
const wavePoints = (t: number, i: number, amp: number, phaseShift = 0, reach = 1): Pt[] => {
  const pts: Pt[] = [];
  const x0 = START_LINE.x1 + (-80 - START_LINE.x1) * reach;
  const x1 = START_LINE.x2 + (2000 - START_LINE.x2) * reach;
  for (let j = 0; j < N; j++) {
    const x = x0 + (j / (N - 1)) * (x1 - x0);
    const u = Math.min(1, Math.max(0, x / 1920));
    const env = Math.pow(Math.sin(Math.PI * u), 2);
    const syllable = 0.55 + 0.45 * noise2D(`syl${i}`, x * 0.0025, t * 1.6);
    const ph = STROKES[i].phase + phaseShift;
    const w =
      0.62 * Math.sin((2 * Math.PI * x) / (250 + 40 * i) + t * (2.4 + 0.6 * i) + ph) +
      0.38 * Math.sin((2 * Math.PI * x) / (105 + 18 * i) - t * 3.3 + ph * 2);
    pts.push([x, 540 + STROKES[i].offset + amp * env * syllable * w]);
  }
  return pts;
};

export const S01WaveToLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Target centerlines in screen space (symbol centered on screen during the morph).
  const targets = useMemo(
    () =>
      STROKES.map(({key}) =>
        resampleSmooth(LOGO_CENTERLINES[key].points, N).map(
          ([x, y]): Pt => [960 + (x - SYMBOL_CENTER.x) * K, 540 + (y - SYMBOL_CENTER.y) * K],
        ),
      ),
    [],
  );

  // Amplitude grows from a faint tremble to a full, energetic wave.
  const amp = interpolate(t, [0, 0.35, 1.2, 1.75, T.morphStart], [0, 14, 55, 130, 190], {
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });
  // From the still line: it stretches to the edges while the glow, the echoes and the other two strokes
  // (which start hidden under the coral one) come in.
  const reach = interpolate(t, [0.05, T.split + 0.25], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const split = interpolate(t, [0.1, T.split], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  // Each stroke snaps into place slightly after the previous one.
  const morphOf = (i: number) =>
    ease(interpolate(t, [T.morphStart + i * 0.07, T.reveal - (2 - i) * 0.02], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const linesOpacity = interpolate(t, [T.reveal - 0.05, T.reveal + 0.1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Starts exactly where the lines end, kicks outward on the hit and settles back.
  const logoScale = interpolate(t, [T.reveal, T.reveal + 0.07, T.reveal + 0.55], [1, 1.07, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const logoOpacity = interpolate(t, [T.reveal - 0.08, T.reveal + 0.02], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Group shifts up when the wordmark arrives so the full lockup stays centered.
  const wmFrame = Math.round(T.wordmark * fps);
  const lift = spring({frame: frame - wmFrame + 4, fps, config: {damping: 16, stiffness: 120}});
  // Exit: wordmark drops away, symbol shrinks and flies to the avatar spot, colors switch to the light variant.
  const wmOut = interpolate(t, [T.exit - 0.25, T.exit + 0.1], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const ex = interpolate(t, [T.exit, T.expand], [0, 1], {...clamp, easing: Easing.bezier(0.65, 0, 0.25, 1)});
  // Then the bubble floods the frame while the symbol is pressed flat into the line that opens the next scene.
  const grow = interpolate(t, [T.expand, scene.seconds - 1 / fps], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const squash = interpolate(t, [T.expand, T.expand + 0.32], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const floodR = AV.r + grow * 1200;
  const lineW = interpolate(squash, [0, 1], [0, 104]) + grow * (GAP_LINE.width - 104);
  const centerY = SYMBOL_CENTER.y + (FULL_CENTER_Y - SYMBOL_CENTER.y) * lift * (1 - wmOut);
  const float = Math.sin(t * 1.8) * 4 * logoOpacity * (1 - ex);
  const camera = interpolate(t, [0, T.exit, scene.seconds], [1, 1.05, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
  const groupScale = K * logoScale * Math.pow(AV.unitPx / K, ex);
  const groupX = 960 + (AV.x - 960) * ex;
  const groupY = 540 + float * (1 - ex) + (AV.y - 540) * ex;
  const discR = AV.r * interpolate(ex, [0.3, 1], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.4))});
  // Lights on: matte paper wipes out from the center on the reveal; before that, a faint warm glow.
  const paperR = interpolate(t, [T.reveal - 0.04, T.reveal + 0.4], [0, 1250], {...clamp, easing: Easing.out(Easing.cubic)});
  const preGlow = interpolate(t, [0.6, T.reveal], [0, 0.16], clamp);
  const lit = interpolate(t, [T.reveal, T.reveal + 0.4], [0, 1], clamp);

  // Lines stay thin while travelling and only fatten at the very end of the morph.
  const strokeW = (i: number) => {
    const travel = STROKES[i].key === 'coral' ? START_LINE.width + (3 + amp / 70 - START_LINE.width) * split : 3 + amp / 70;
    return interpolate(Math.pow(morphOf(i), 3), [0, 1], [travel, LOGO_CENTERLINES[STROKES[i].key].width * K]);
  };
  const strokeOpacity = (i: number) => (STROKES[i].key === 'coral' ? 1 : split);

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.black}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, ${COLORS.paper} 0%, transparent 55%)`, opacity: preGlow}} />
      {paperR > 0 && (
        <AbsoluteFill style={{clipPath: `circle(${paperR}px at 50% 50%)`}}>
          <BrandBackground />
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{transform: `scale(${camera})`}}>
        <Particles t={t} visibility={lit * (1 - ex) * 0.6} />

        {/* Waves: faint echoes + main strokes, morphing onto the logo centerlines */}
        <svg width={1920} height={1080} style={{position: 'absolute', opacity: linesOpacity}}>
          <defs>
            <filter id="s01-glow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation={Math.max(0.01, (4 + amp / 25) * split)} result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {STROKES.map((s, i) =>
            [1.2, 0.6].map((shift, e) => {
              const pts = wavePoints(t, i, amp * (0.85 - e * 0.15), shift, reach).map(
                ([x, y], j): Pt => [x + (targets[i][j][0] - x) * morphOf(i), y + (targets[i][j][1] - y) * morphOf(i)],
              );
              return (
                <polyline
                  key={`${s.key}-echo-${e}`}
                  points={toPolyline(pts)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={1.5}
                  opacity={(e === 0 ? 0.22 : 0.4) * Math.pow(1 - morphOf(i), 2) * split}
                />
              );
            }),
          )}
          <g filter="url(#s01-glow)">
            {STROKES.map((s, i) => {
              const pts = wavePoints(t, i, amp, 0, reach).map(
                ([x, y], j): Pt => [x + (targets[i][j][0] - x) * morphOf(i), y + (targets[i][j][1] - y) * morphOf(i)],
              );
              return (
                <polyline
                  key={s.key}
                  points={toPolyline(pts)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeW(i)}
                  opacity={strokeOpacity(i)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
          </g>
        </svg>

        {/* The real logo takes over on the reveal */}
        <svg width={1920} height={1080} style={{position: 'absolute', opacity: t < T.expand ? logoOpacity : 0}}>
          <defs>
            <filter id="s01-disc-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx={0} dy={10} stdDeviation={14} floodColor={COLORS.ink} floodOpacity={0.22} />
            </filter>
            <clipPath id="s01-wordmark-clip">
              <rect x={0} y={755} width={1254} height={190} />
            </clipPath>
          </defs>
          {discR > 0 && <circle cx={groupX} cy={groupY} r={discR} fill={COLORS.white} filter="url(#s01-disc-shadow)" />}
          <g
            transform={`translate(${groupX} ${groupY}) scale(${groupScale}) translate(${-SYMBOL_CENTER.x} ${-centerY})`}
          >
            <path d={LOGO.symbol.navy.join('')} fill={COLORS.navy} />
            <path d={LOGO.symbol.teal.join('')} fill={COLORS.teal} />
            <path d={LOGO.symbol.coral.join('')} fill={COLORS.coral} />
            <g clipPath="url(#s01-wordmark-clip)">
              {LETTERS.map((l, i) => {
                const s = spring({frame: frame - wmFrame - i * 2, fps, config: {damping: 13, stiffness: 140, mass: 0.6}});
                return (
                  <path
                    key={i}
                    d={l.d}
                    fill={l.tone === 'navy' ? COLORS.navy : COLORS.teal}
                    transform={`translate(0 ${(1 - s) * 190 + interpolate(wmOut, [i * 0.05, Math.min(1, 0.6 + i * 0.05)], [0, 190], clamp)})`}
                  />
                );
              })}
            </g>
          </g>
        </svg>
      </AbsoluteFill>


      {t >= T.expand && (
        <>
          <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            <defs>
              <filter id="s01-flood-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx={0} dy={10} stdDeviation={14} floodColor={COLORS.ink} floodOpacity={0.22} />
              </filter>
            </defs>
            <circle cx={AV.x} cy={AV.y} r={floodR} fill={COLORS.white} filter="url(#s01-flood-shadow)" opacity={Math.max(0, 1 - grow * 3)} />
          </svg>
          <AbsoluteFill style={{clipPath: `circle(${floodR}px at ${AV.x}px ${AV.y}px)`}}>
            <BrandBackground />
            <AbsoluteFill style={{backgroundColor: interpolateColors(grow, [0, 1], [COLORS.white, COLORS.paper]), opacity: 1 - grow}} />
          </AbsoluteFill>
          <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
            <g
              opacity={1 - squash}
              transform={`translate(${AV.x} ${AV.y}) scale(${AV.unitPx} ${AV.unitPx * (1 - 0.97 * squash)}) translate(${-SYMBOL_CENTER.x} ${-SYMBOL_CENTER.y})`}
            >
              <path d={LOGO.symbol.navy.join('')} fill={COLORS.navy} />
              <path d={LOGO.symbol.teal.join('')} fill={COLORS.teal} />
              <path d={LOGO.symbol.coral.join('')} fill={COLORS.coral} />
            </g>
            <line
              x1={GAP_LINE.x - lineW / 2}
              x2={GAP_LINE.x + lineW / 2}
              y1={GAP_LINE.y}
              y2={GAP_LINE.y}
              stroke={COLORS.ink}
              strokeWidth={GAP_LINE.stroke}
              strokeLinecap="round"
              opacity={squash}
            />
          </svg>
        </>
      )}

      <VoiceOver scene={scene} />
      {/* The riser peaks on the reveal; its first part is trimmed so it starts with the scene. */}
      <Sfx name="riser" at={T.reveal - 3.4} volume={0.55} />
      <Sfx name="impact" at={T.reveal - 0.02} volume={0.9} />
      <Sfx name="whoosh-short" at={T.wordmark - 0.1} volume={0.35} />
      <Sfx name="shimmer" at={T.wordmark + 0.05} volume={0.4} />
      <Sfx name="whoosh" at={T.expand} volume={0.4} />
    </AbsoluteFill>
  );
};

// Soft drifting specks that appear as the background lights up.
const Particles: React.FC<{t: number; visibility: number}> = ({t, visibility}) => {
  return (
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      {new Array(46).fill(0).map((_, i) => {
        const x = random(`px${i}`) * 1920;
        const speed = 12 + random(`ps${i}`) * 30;
        const y = ((random(`py${i}`) * 1180 - t * speed) % 1180 + 1180) % 1180 - 50;
        const r = 1 + random(`pr${i}`) * 2.6;
        const tw = 0.5 + 0.5 * Math.sin(t * (1 + random(`pt${i}`) * 2) + i);
        return (
          <circle
            key={i}
            cx={x + Math.sin(t * 0.8 + i) * 10}
            cy={y}
            r={r}
            fill={i % 3 === 0 ? COLORS.coral : COLORS.teal}
            opacity={visibility * 0.6 * tw}
          />
        );
      })}
    </svg>
  );
};
