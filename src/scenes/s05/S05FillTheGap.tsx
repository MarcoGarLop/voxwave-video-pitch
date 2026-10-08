import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';

const scene = getScene('s05');
const vo = (word: string, n = 0) => scene.voAt + wordTime('s05', word, n);

const T = {
  strike: vo('diagnose') + 0.45,
  clear: vo('we', 1) - 0.25,
  visitA: vo('fill'),
  visitB: vo('fill') + 0.15,
  months: vo('three-to-six-month') + 0.1,
  gapWord: vo('gap'),
  dotsFrom: vo('gap') + 0.05,
  dotsTo: vo('between') + 0.25,
  join: vo('between'),
  joined: vo('visits') + 0.5,
  exit: 5.55,
  exitEnd: 5.9,
};

const HEAD = {size: 136, weight: 800, y: 470};
const LINE_Y = 640;
const VISIT = {a: 440, b: 1480};
const DOTS = 46;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const PAPER_FAINT = 'rgba(241,237,228,0.35)';

export const S05FillTheGap: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Measure the headline so the strike-through sits exactly on "diagnose".
  const layout = useMemo(() => {
    const m = (text: string) => measureText({text, fontFamily: FONTS.display, fontSize: HEAD.size, fontWeight: HEAD.weight}).width;
    const words = ['We', "don't", 'diagnose.'];
    const space = m('We diagnose') - m('We') - m('diagnose');
    const widths = words.map(m);
    const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
    let x = 960 - total / 2;
    const xs = widths.map((w) => {
      const at = x;
      x += w + space;
      return at;
    });
    return {words, xs, widths, diagnoseW: m('diagnose')};
  }, []);

  const slamAt = [vo('we'), vo("don't"), vo('diagnose')];
  const clear = interpolate(t, [T.clear, T.clear + 0.35], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});

  // The strike-through line: drawn over "diagnose", then it stretches into the timeline between visits.
  const draw = interpolate(t, [T.strike, T.strike + 0.22], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const morph = interpolate(t, [T.clear, T.clear + 0.55], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const strikeX0 = layout.xs[2];
  const strikeX1 = layout.xs[2] + layout.diagnoseW * draw;
  const strikeY = HEAD.y + HEAD.size * 0.1;
  const lx0 = strikeX0 + (VISIT.a - strikeX0) * morph;
  const lx1 = strikeX1 + (VISIT.b - strikeX1) * morph;
  const ly = strikeY + (LINE_Y - strikeY) * morph;
  const lineColor = interpolateColors(morph, [0, 1], [COLORS.coral, PAPER_FAINT]);

  const exit = interpolate(t, [T.exit, T.exitEnd], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});

  return (
    <AbsoluteFill>
      <BrandBackground tone="ink" />

      {/* "We don't diagnose." */}
      {layout.words.map((w, i) => {
        const s = spring({frame: (t - slamAt[i]) * fps, fps, config: {damping: 11, stiffness: 260, mass: 0.6}});
        const dim = i === 2 ? interpolate(t, [T.strike + 0.1, T.strike + 0.4], [1, 0.3], clamp) : 1;
        const fly = interpolate(clear, [i * 0.12, Math.min(1, 0.6 + i * 0.12)], [0, 1], clamp);
        return (
          <div
            key={w}
            style={{
              position: 'absolute',
              left: layout.xs[i],
              top: HEAD.y - HEAD.size * 0.62,
              fontFamily: FONTS.display,
              fontWeight: HEAD.weight,
              fontSize: HEAD.size,
              lineHeight: 1.2,
              color: COLORS.paper,
              whiteSpace: 'pre',
              opacity: s * dim * (1 - fly),
              transform: `translateY(${(1 - s) * 50 - fly * 90}px) scale(${1.25 - 0.25 * s})`,
              transformOrigin: 'center bottom',
            }}
          >
            {w}
          </div>
        );
      })}

      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {draw > 0 && exit < 1 && (
          <line
            x1={lx0}
            x2={lx1}
            y1={ly}
            y2={ly}
            stroke={lineColor}
            strokeWidth={14 - 10 * morph}
            strokeLinecap="round"
            strokeDasharray={morph > 0.98 ? '2 12' : undefined}
            opacity={1 - exit}
          />
        )}
        <Visits t={t} fade={exit} />
        <DataFill t={t} exit={exit} />
      </svg>

      <FillHeadline t={t} fade={exit} />

      <VoiceOver scene={scene} />
      <Sfx name="hit" at={slamAt[0]} volume={0.45} />
      <Sfx name="hit" at={slamAt[2]} volume={0.6} />
      <Sfx name="whoosh-short" at={T.strike - 0.05} volume={0.5} />
      <Sfx name="whoosh" at={T.clear} volume={0.3} />
      <Sfx name="blip-low" at={T.visitA} volume={0.3} />
      <Sfx name="blip-low" at={T.visitB} volume={0.3} />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <Sfx key={k} name="blip" at={T.dotsFrom + ((T.dotsTo - T.dotsFrom) * k) / 6} volume={0.1} />
      ))}
      <Sfx name="shimmer" at={T.joined - 0.35} volume={0.3} />
      <Sfx name="whoosh-short" at={T.exit} volume={0.35} />
    </AbsoluteFill>
  );
};

// "We fill the gap." — "gap." lands in coral exactly when the voice says it.
const FillHeadline: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const words = [
    {w: 'We', at: vo('we', 1)},
    {w: 'fill', at: vo('fill')},
    {w: 'the', at: vo('the')},
    {w: 'gap.', at: T.gapWord},
  ];
  return (
    <div style={{position: 'absolute', top: 230, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 26, opacity: 1 - fade}}>
      {words.map(({w, at}, i) => {
        const s = spring({frame: (t - at) * fps, fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
        return (
          <span
            key={w}
            style={{
              fontFamily: FONTS.display,
              fontWeight: 800,
              fontSize: 96,
              color: i === 3 ? COLORS.coral : COLORS.paper,
              opacity: s,
              transform: `translateY(${(1 - s) * 40}px) scale(${1.2 - 0.2 * s})`,
              display: 'inline-block',
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

const Visits: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const marker = (x: number, at: number) => {
    const s = spring({frame: (t - at) * fps, fps, config: {damping: 12, stiffness: 180}});
    if (s <= 0.001) return null;
    const top = LINE_Y - 150 * s;
    return (
      <g key={x} opacity={1 - fade}>
        <line x1={x} x2={x} y1={LINE_Y} y2={top} stroke={COLORS.paper} strokeWidth={4} strokeLinecap="round" />
        <circle cx={x} cy={top} r={10} fill={COLORS.paper} />
        <circle cx={x} cy={LINE_Y} r={7} fill={COLORS.paper} />
        <text x={x} y={top - 30} textAnchor="middle" fontFamily={FONTS.display} fontWeight={700} fontSize={44} fill={COLORS.paper} opacity={s}>
          Visit
        </text>
      </g>
    );
  };
  const months = interpolate(t, [T.months, T.months + 0.4], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const half = ((VISIT.b - VISIT.a) / 2 - 20) * months;
  const mid = (VISIT.a + VISIT.b) / 2;
  return (
    <>
      {marker(VISIT.a, T.visitA)}
      {marker(VISIT.b, T.visitB)}
      {months > 0 && (
        <g opacity={1 - fade}>
          <path
            d={`M ${mid - half} ${LINE_Y + 50} v 16 H ${mid + half} v -16`}
            stroke={PAPER_FAINT}
            strokeWidth={3}
            fill="none"
          />
          <text x={mid} y={LINE_Y + 120} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={600} fontSize={34} letterSpacing={2} fill={COLORS.paper} opacity={months * 0.8}>
            3–6 months
          </text>
        </g>
      )}
    </>
  );
};

// Dozens of coral data points land in the gap, then join into one continuous line.
const DataFill: React.FC<{t: number; exit: number}> = ({t, exit}) => {
  const dots = useMemo(
    () =>
      new Array(DOTS).fill(0).map((_, i) => {
        const u = (i + 0.5) / DOTS;
        return {
          x: VISIT.a + 18 + u * (VISIT.b - VISIT.a - 36),
          scatter: (random(`dy${i}`) - 0.5) * 150,
          settle: Math.sin(u * Math.PI * 3) * 22,
          at: T.dotsFrom + random(`dt${i}`) * (T.dotsTo - T.dotsFrom),
        };
      }),
    [],
  );
  const join = interpolate(t, [T.join, T.joined], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const drawn = interpolate(t, [T.join + 0.15, T.joined], [0, 1], clamp);

  // Exit: the line contracts into a single coral point at the center of the frame.
  const cx = 960;
  const cy = 540;
  const pos = dots.map((d) => {
    const x = d.x + (cx - d.x) * exit;
    const y = LINE_Y + d.scatter * (1 - join) + d.settle * join;
    return {x, y: y + (cy - y) * exit};
  });

  const visible = dots.filter((d) => t >= d.at);
  if (visible.length === 0) return null;
  const lastIdx = Math.floor(drawn * (DOTS - 1));
  const path = pos
    .slice(0, lastIdx + 1)
    .map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`)
    .join(' ');
  const connectA = drawn > 0 ? `M ${VISIT.a + (cx - VISIT.a) * exit} ${LINE_Y + (cy - LINE_Y) * exit} L ${pos[0].x} ${pos[0].y}` : '';
  const connectB = drawn >= 1 ? `M ${pos[DOTS - 1].x} ${pos[DOTS - 1].y} L ${VISIT.b + (cx - VISIT.b) * exit} ${LINE_Y + (cy - LINE_Y) * exit}` : '';

  return (
    <g>
      <path d={`${connectA} ${path} ${connectB}`} stroke={COLORS.coral} strokeWidth={6} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {dots.map((d, i) => {
        const s = interpolate(t, [d.at, d.at + 0.12], [0, 1], {...clamp, easing: Easing.out(Easing.back(3))});
        if (s <= 0) return null;
        return <circle key={i} cx={pos[i].x} cy={pos[i].y} r={(7 - 2 * join) * s * (1 + exit * 0.4)} fill={COLORS.coral} />;
      })}
    </g>
  );
};
