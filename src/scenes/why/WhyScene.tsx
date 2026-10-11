import React from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {StageTag} from '../../components/StageTag';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {useVoAmplitude} from '../../lib/useVoAmplitude';
import {getScene} from '../config';
import {RADAR_AXES} from '../shared/handoffs';

// Scene 7 — "Why clinics choose it", told from inside the prototype: the camera has moved into the device
// and finds a line-art plan of its board; the voice runs through it as coral pulses, and each selling point
// lights up on the part that delivers it. The data then forks into "We measure | Doctors decide",
// and that fork becomes the axes of the radar in scene 8.

const scene = getScene('why');
const vo = (word: string, n = 0) => scene.voAt + wordTime('why', word, n);

const T = {
  board: 0.25,
  built: vo('built'),
  care: vo('care'),
  p1: vo('locally'),
  p2: vo('minimal'),
  p3: vo('eu'),
  fork: vo('design') + 0.05,
  measure: vo('measure'),
  doctors: vo('doctors'),
  exit: 9.75,
};

// ---------------------------------------------------------------- board geometry (board-local units)
type Pt = [number, number];
const BS = 0.907; // local -> px
const BX = 660; // board top-left on screen
const BY = 343;
const toS = ([x, y]: Pt) => ({x: BX + x * BS, y: BY + y * BS});

const BOARD = {w: 860, h: 566};
const SOC = {x: 300, y: 190, w: 150, h: 150};
const MIC: Pt = [-190, 120];
const BUTTON: Pt = [-190, 400];
const USBC = {x: 90, y: 532, w: 80, h: 50};

const VOICE_PATH: Pt[] = [[-156, 120], [-60, 120], [-20, 80], [262, 80], [262, 120], [325, 183], [360, 230]];
const BUTTON_PATH: Pt[] = [[-162, 400], [-60, 400], [-20, 360], [190, 360], [250, 300], [300, 300]];
const POWER_PATH: Pt[] = [[130, 532], [130, 470], [300, 470], [340, 430], [340, 340]];
const OUT_Y = BOARD.h;
const OUT_X = 430;

// Decorative traces (drawn in as the board appears).
const TRACES: Pt[][] = [
  ...[0, 1, 2, 3, 4].map((i): Pt[] => [[300 + i * 25, 56], [300 + i * 25, 120], [320 + i * 25, 160], [320 + i * 25, 190]]),
  ...[0, 1, 2, 3, 4, 5].map((i): Pt[] => [[450, 212 + i * 20], [500, 212 + i * 20]]),
  [[450, 300], [470, 300], [490, 380], [700, 380], [735, 385]],
  [[450, 320], [480, 320], [500, 400], [710, 400], [735, 410]],
  [[600, 240], [690, 240], [710, 225], [735, 225]],
  [[600, 260], [700, 260], [715, 275], [735, 275]],
  [[560, 330], [560, 470], [520, 510], [420, 510]],
  [[200, 470], [200, 520], [260, 540]],
  [[230, 300], [230, 420], [260, 450], [300, 450]],
  [[150, 56], [150, 150], [120, 180], [60, 180]],
  [[175, 56], [175, 140], [205, 170], [260, 170], [300, 210]],
  [[OUT_X, 340], [OUT_X, OUT_Y]],
];
const SMALL_PARTS: {x: number; y: number; w: number; h: number}[] = [
  {x: 70, y: 230, w: 26, h: 12},
  {x: 70, y: 260, w: 26, h: 12},
  {x: 110, y: 300, w: 12, h: 26},
  {x: 190, y: 230, w: 50, h: 50},
  {x: 640, y: 460, w: 60, h: 40},
  {x: 520, y: 440, w: 26, h: 12},
  {x: 620, y: 140, w: 26, h: 12},
  {x: 650, y: 140, w: 26, h: 12},
  {x: 470, y: 150, w: 12, h: 26},
  {x: 240, y: 400, w: 26, h: 12},
  {x: 60, y: 400, w: 70, h: 50},
  {x: 600, y: 330, w: 12, h: 26},
];

// Labels (screen px): the y of each leader's horizontal run.
const LABEL_Y = {p1: 405, p2: 768, p3: 470};

const LINE = 'rgba(241,237,228,0.55)';
const FAINT = 'rgba(241,237,228,0.22)';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const lengthOf = (pts: Pt[]) => pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const pointAt = (pts: Pt[], u: number): Pt => {
  let d = Math.max(0, Math.min(1, u)) * lengthOf(pts);
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= seg) {
      const k = seg ? d / seg : 0;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    }
    d -= seg;
  }
  return pts[pts.length - 1];
};
const poly = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');

// Fork (screen px): the data leaves the board and splits into "We measure" and "Doctors decide".
// The board group shrinks to FORK_SCALE around the top so the data exit lands right on FORK.x.
const FORK_SCALE = 0.6;
const FORK = {x: 960, y: 700, left: 560, right: 1360};
const FORK_GX = FORK.x - (BX + OUT_X * BS) * FORK_SCALE;
const FORK_GY = -60;

export const WhyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const voice = useVoAmplitude(scene);

  // Entry: we are inside the device; the board settles from close up into its full view.
  const intro = Easing.out(Easing.cubic)(interpolate(t, [0, 1.1], [0, 1], clamp));
  const introScale = 1.7 - 0.7 * intro;

  // Fork: the board and its labels shrink up out of the way.
  const forkK = Easing.inOut(Easing.cubic)(interpolate(t, [T.fork, T.fork + 0.7], [0, 1], clamp));
  const gs = 1 - (1 - FORK_SCALE) * forkK;

  // Exit: everything but the fork lines fades; they become the radar's axes.
  const exit = Easing.inOut(Easing.cubic)(interpolate(t, [T.exit, scene.seconds - 1 / fps], [0, 1], clamp));
  const fadeOut = interpolate(exit, [0, 0.45], [1, 0], clamp);

  const groupTransform =
    t < T.fork
      ? `translate(${960 - 960 * introScale}px, ${600 - 600 * introScale}px) scale(${introScale})`
      : `translate(${FORK_GX * forkK}px, ${FORK_GY * forkK}px) scale(${gs})`;

  return (
    <AbsoluteFill>
      <BrandBackground tone="ink" />
      <BlueprintGrid opacity={interpolate(t, [0.4, 1.2], [0, 1], clamp) * fadeOut} />

      {/* Board, parts, pulses and callouts */}
      <AbsoluteFill style={{transform: groupTransform, transformOrigin: '0 0', opacity: intro * fadeOut}}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <Board t={t} voice={voice} />
          <Leaders t={t} />
        </svg>
        <Callouts t={t} />
      </AbsoluteFill>

      <Title t={t} fade={Math.max(forkK, 1 - fadeOut)} />
      <ForkStage t={t} exit={exit} />


      <div style={{position: 'absolute', right: 64, bottom: 54, fontFamily: FONTS.ui, fontWeight: 600, fontSize: 15, letterSpacing: 3.5, color: 'rgba(241,237,228,0.35)', opacity: intro * fadeOut}}>
        VOXWAVE HOME UNIT · REV 0.3 · RASPBERRY PI
      </div>
      <StageTag label="PROTOTYPE" tone="ink" opacity={intro * fadeOut} />

      <VoiceOver scene={scene} />
      <Sfx name="shimmer" at={0.45} volume={0.3} />
      <Sfx name="blip-low" at={0.7} volume={0.15} />
      <Sfx name="blip-low" at={0.95} volume={0.15} />
      <Sfx name="blip" at={1.2} volume={0.15} />
      <Sfx name="hit" at={T.p1} volume={0.45} />
      <Sfx name="hit" at={T.p2} volume={0.45} />
      <Sfx name="hit" at={T.p3} volume={0.45} />
      <Sfx name="blip" at={T.p3 + 0.35} volume={0.4} />
      <Sfx name="whoosh-short" at={T.fork} volume={0.35} />
      <Sfx name="impact" at={T.measure - 0.03} volume={0.4} />
      <Sfx name="impact" at={T.doctors - 0.03} volume={0.45} />
      <Sfx name="whoosh" at={T.exit} volume={0.4} />
    </AbsoluteFill>
  );
};

// Faint technical-drawing grid on the ink stage.
const BlueprintGrid: React.FC<{opacity: number}> = ({opacity}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity}}>
    <defs>
      <pattern id="why-grid" width={48} height={48} patternUnits="userSpaceOnUse" x={0} y={12}>
        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(47,155,203,0.07)" strokeWidth={1} />
      </pattern>
    </defs>
    <rect width={1920} height={1080} fill="url(#why-grid)" />
  </svg>
);

// ---------------------------------------------------------------- the board
const Board: React.FC<{t: number; voice: number}> = ({t, voice}) => {
  const {fps} = useVideoConfig();
  const outline = interpolate(t, [T.board, T.board + 0.7], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const parts = (i: number) => spring({frame: (t - T.board - 0.3 - i * 0.04) * fps, fps, config: {damping: 13, stiffness: 200}});
  const trace = (i: number) => interpolate(t, [T.board + 0.45 + i * 0.03, T.board + 0.95 + i * 0.03], [0, 1], clamp);

  const on1 = interpolate(t, [T.p1, T.p1 + 0.2], [0, 1], clamp);
  const on2 = interpolate(t, [T.p2, T.p2 + 0.2], [0, 1], clamp);
  const on3 = interpolate(t, [T.p3, T.p3 + 0.2], [0, 1], clamp);
  const hot = (k: number) => interpolateColors(k, [0, 1], [LINE, COLORS.coral]);
  const outPulse = interpolate(t, [T.fork + 0.05, T.fork + 0.45], [0, 1], clamp);

  return (
    <g transform={`translate(${BX} ${BY}) scale(${BS})`}>
      {/* On-device boundary (privacy) */}
      <OnDevice t={t} />

      {/* Board outline + mounting holes */}
      <rect x={0} y={0} width={BOARD.w} height={BOARD.h} rx={26} fill="rgba(241,237,228,0.025)" stroke={LINE} strokeWidth={2.4} pathLength={1} strokeDasharray={`${outline} 1`} />
      {[[34, 34], [34, 532], [620, 34], [620, 532]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={15 * parts(i)} fill="none" stroke={LINE} strokeWidth={2} />
      ))}

      {/* Decorative traces */}
      {TRACES.map((tr, i) => (
        <path key={i} d={poly(tr)} fill="none" stroke={FAINT} strokeWidth={2} strokeLinejoin="round" pathLength={1} strokeDasharray={`${trace(i)} 1`} />
      ))}

      {/* GPIO header */}
      {new Array(40).fill(0).map((_, i) => {
        const k = parts(4 + (i % 20) * 0.15);
        return <rect key={i} x={150 + (i % 20) * 25 - 7 * k} y={(i < 20 ? 22 : 47) - 7 * k} width={14 * k} height={14 * k} rx={2} fill="none" stroke={LINE} strokeWidth={1.6} />;
      })}

      {/* Small parts */}
      {SMALL_PARTS.map((p, i) => {
        const k = parts(6 + i * 0.5);
        return <rect key={i} x={p.x + (p.w * (1 - k)) / 2} y={p.y + (p.h * (1 - k)) / 2} width={p.w * k} height={p.h * k} rx={3} fill="rgba(241,237,228,0.04)" stroke={FAINT} strokeWidth={1.6} />;
      })}

      {/* RAM, USB / Ethernet stacks, micro-HDMI */}
      <Part k={parts(2)} x={500} y={200} w={100} h={130} label="RAM" />
      <Part k={parts(3)} x={735} y={30} w={160} h={110} label="USB" />
      <Part k={parts(4)} x={735} y={170} w={160} h={110} label="USB" />
      <Part k={parts(5)} x={735} y={320} w={160} h={130} label="ETH" />
      <Part k={parts(6)} x={230} y={540} w={60} h={34} />
      <Part k={parts(7)} x={330} y={540} w={60} h={34} />

      {/* Routes that matter, highlighted when their selling point is named */}
      <path d={poly(VOICE_PATH)} fill="none" stroke={hot(on1)} strokeWidth={3 + on1} strokeLinejoin="round" pathLength={1} strokeDasharray={`${trace(3)} 1`} />
      <path d={poly(BUTTON_PATH)} fill="none" stroke={hot(on2)} strokeWidth={3 + on2} strokeLinejoin="round" pathLength={1} strokeDasharray={`${trace(5)} 1`} />
      <path d={poly(POWER_PATH)} fill="none" stroke={hot(on2)} strokeWidth={3 + on2} strokeLinejoin="round" pathLength={1} strokeDasharray={`${trace(7)} 1`} />

      {/* SoC (with the lock that closes for privacy) */}
      <Part k={parts(1)} x={SOC.x} y={SOC.y} w={SOC.w} h={SOC.h} label="SoC" hot={on3} inner />
      <Lock t={t} />

      {/* USB-C power, microphone and button (off-board, on the lid) */}
      <Part k={parts(8)} x={USBC.x} y={USBC.y} w={USBC.w} h={USBC.h} label="USB-C" hot={on2} radius={16} />
      <Mic k={parts(0)} hot={on1} voice={voice} />
      <Button k={parts(1)} hot={on2} t={t} />

      {/* Voice pulses: from the mic into the SoC, livelier when the narrator speaks */}
      <Pulses t={t} path={VOICE_PATH} start={T.board + 0.9} speed={0.9} every={0.22} size={1 + voice * 0.8} />
      <Pulses t={t} path={BUTTON_PATH} start={T.p2} speed={1.4} every={0.5} size={1} count={3} />
      <Pulses t={t} path={POWER_PATH} start={T.p2 + 0.15} speed={1.2} every={0.45} size={1} count={3} />
      {outPulse > 0 && outPulse < 1 && <circle cx={OUT_X} cy={340 + (OUT_Y - 340) * outPulse} r={8} fill={COLORS.coral} />}
      <PartRing t={t} at={T.p1} c={MIC} r={44} />
      <PartRing t={t} at={T.p2} c={BUTTON} r={40} />
      <PartRing t={t} at={T.p3} c={[SOC.x + SOC.w / 2, SOC.y + SOC.h / 2]} r={100} />
    </g>
  );
};

const Part: React.FC<{k: number; x: number; y: number; w: number; h: number; label?: string; hot?: number; inner?: boolean; radius?: number}> = ({
  k,
  x,
  y,
  w,
  h,
  label,
  hot = 0,
  inner,
  radius = 8,
}) => {
  if (k <= 0.001) return null;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const stroke = interpolateColors(hot, [0, 1], [LINE, COLORS.coral]);
  return (
    <g transform={`translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})`}>
      <rect x={x} y={y} width={w} height={h} rx={radius} fill={`rgba(255,110,66,${0.14 * hot})`} stroke={stroke} strokeWidth={2.4 + hot} />
      {inner && <rect x={x + 18} y={y + 18} width={w - 36} height={h - 36} rx={4} fill="none" stroke={stroke} strokeWidth={1.6} opacity={0.7} />}
      {label && (
        <text x={cx} y={cy + 6} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={700} fontSize={16} letterSpacing={2} fill={stroke} opacity={0.85}>
          {label}
        </text>
      )}
    </g>
  );
};

const Mic: React.FC<{k: number; hot: number; voice: number}> = ({k, hot, voice}) => {
  const [x, y] = MIC;
  const stroke = interpolateColors(hot, [0, 1], [LINE, COLORS.coral]);
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <circle r={34 + voice * 8 * hot} fill="none" stroke={stroke} strokeOpacity={0.35} strokeWidth={2} />
      <circle r={30} fill={`rgba(255,110,66,${0.14 * hot})`} stroke={stroke} strokeWidth={2.4 + hot} />
      {[-12, -4, 4, 12].map((dx) => (
        <line key={dx} x1={dx} x2={dx} y1={-16 + Math.abs(dx) * 0.4} y2={16 - Math.abs(dx) * 0.4} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      ))}
      <text y={58} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={700} fontSize={16} letterSpacing={2} fill={stroke} opacity={0.85}>
        MIC
      </text>
    </g>
  );
};

const Button: React.FC<{k: number; hot: number; t: number}> = ({k, hot, t}) => {
  const [x, y] = BUTTON;
  const stroke = interpolateColors(hot, [0, 1], [LINE, COLORS.coral]);
  const press = t > T.p2 ? Math.max(0, Math.sin(Math.min(1, (t - T.p2) / 0.3) * Math.PI)) : 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <circle r={30} fill="none" stroke={stroke} strokeWidth={2.4} />
      <circle r={20 - press * 4} fill={hot > 0.5 ? COLORS.coral : 'rgba(241,237,228,0.08)'} stroke={stroke} strokeWidth={2} />
      <text y={58} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={700} fontSize={16} letterSpacing={2} fill={stroke} opacity={0.85}>
        BUTTON
      </text>
    </g>
  );
};

const Lock: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const appear = spring({frame: (t - T.p3 - 0.05) * fps, fps, config: {damping: 12, stiffness: 200}});
  const close = interpolate(t, [T.p3 + 0.25, T.p3 + 0.4], [12, 0], {...clamp, easing: Easing.in(Easing.quad)});
  if (appear <= 0.001) return null;
  const cx = SOC.x + SOC.w / 2;
  const cy = SOC.y + SOC.h / 2 + 6;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${appear})`}>
      <path d={`M -14 ${-8 - close} V ${-20 - close} A 14 14 0 0 1 14 ${-20 - close} V ${-8 - close * 0.2}`} fill="none" stroke={COLORS.coral} strokeWidth={6} strokeLinecap="round" />
      <rect x={-24} y={-10} width={48} height={38} rx={8} fill={COLORS.coral} />
      <circle cx={0} cy={6} r={5} fill={COLORS.navy} />
    </g>
  );
};

// Coral ring that pulses out of a part when it is named.
const PartRing: React.FC<{t: number; at: number; c: Pt; r: number}> = ({t, at, c, r}) => {
  const p = interpolate(t, [at, at + 0.7], [0, 1], clamp);
  if (p <= 0 || p >= 1) return null;
  return <circle cx={c[0]} cy={c[1]} r={r + p * 90} fill="none" stroke={COLORS.coral} strokeWidth={4 * (1 - p)} opacity={1 - p} />;
};

// Coral data pulses travelling along a route, each with a short fading tail.
const Pulses: React.FC<{t: number; path: Pt[]; start: number; speed: number; every: number; size: number; count?: number}> = ({
  t,
  path,
  start,
  speed,
  every,
  size,
  count = 40,
}) => {
  if (t < start) return null;
  const out: React.ReactNode[] = [];
  for (let k = 0; k < count; k++) {
    const u = (t - start - k * every) * speed;
    if (u < 0 || u > 1) continue;
    [0, 0.025, 0.05].forEach((lag, j) => {
      const [x, y] = pointAt(path, u - lag);
      out.push(<circle key={`${k}-${j}`} cx={x} cy={y} r={(7 - j * 2) * size} fill={COLORS.coral} opacity={1 - j * 0.35} />);
    });
  }
  return <g>{out}</g>;
};

// Dashed coral boundary around everything: the voice is processed on the device.
const OnDevice: React.FC<{t: number}> = ({t}) => {
  const draw = interpolate(t, [T.p3 + 0.2, T.p3 + 0.9], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  if (draw <= 0) return null;
  const box = {x: -235, y: -40, w: BOARD.w + 170 + 235, h: BOARD.h + 90};
  return (
    <g>
      <defs>
        <mask id="ondevice-draw">
          <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={34} fill="none" stroke="white" strokeWidth={14} pathLength={1} strokeDasharray={`${draw} 1`} />
        </mask>
      </defs>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={34} fill="none" stroke={COLORS.coral} strokeWidth={2.6} strokeDasharray="12 10" mask="url(#ondevice-draw)" />
      <rect x={box.x + 40} y={box.y - 16} width={350 * Math.min(1, draw * 3)} height={32} fill={COLORS.navy} />
      <text x={box.x + 54} y={box.y + 8} fontFamily={FONTS.ui} fontWeight={700} fontSize={20} letterSpacing={4} fill={COLORS.coral} opacity={Math.min(1, draw * 3)}>
        PROCESSED ON THE DEVICE
      </text>
    </g>
  );
};

// ---------------------------------------------------------------- callouts
const Leaders: React.FC<{t: number}> = ({t}) => {
  const mic = toS([MIC[0] - 34, MIC[1]]);
  const btn = toS([BUTTON[0] - 34, BUTTON[1]]);
  const soc = toS([SOC.x + SOC.w, SOC.y]);
  const lines: {at: number; pts: Pt[]}[] = [
    {at: T.p1, pts: [[mic.x, mic.y], [mic.x - 30, LABEL_Y.p1], [70, LABEL_Y.p1]]},
    {at: T.p2, pts: [[btn.x, btn.y], [btn.x - 30, LABEL_Y.p2 - 30], [btn.x - 30, LABEL_Y.p2], [70, LABEL_Y.p2]]},
    {at: T.p3, pts: [[soc.x, soc.y], [soc.x + 45, LABEL_Y.p3], [1860, LABEL_Y.p3]]},
  ];
  return (
    <g>
      {lines.map(({at, pts}, i) => {
        const d = interpolate(t, [at, at + 0.35], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        if (d <= 0) return null;
        return (
          <g key={i}>
            <path d={poly(pts)} fill="none" stroke={COLORS.coral} strokeWidth={2.4} pathLength={1} strokeDasharray={`${d} 1`} />
            <circle cx={pts[0][0]} cy={pts[0][1]} r={6} fill={COLORS.coral} />
          </g>
        );
      })}
    </g>
  );
};

const Callouts: React.FC<{t: number}> = ({t}) => (
  <>
    <Callout t={t} at={T.p1} n="01" lines={['LOCALLY', 'ADAPTED']} sub="Local language & care pathways" x={70} lineY={LABEL_Y.p1} align="left" />
    <Callout t={t} at={T.p2} n="02" lines={['MINIMAL STAFF', 'FRICTION']} sub="One button. Plug it in, it works." x={70} lineY={LABEL_Y.p2} align="left" />
    <Callout t={t} at={T.p3} n="03" lines={['EU PRIVACY-', 'BY-DESIGN']} sub="Voice processed on the device" x={1860} lineY={LABEL_Y.p3} align="right" />
  </>
);

// A selling point: number, two-line title that "decodes" in, and a caption under the leader line.
const Callout: React.FC<{t: number; at: number; n: string; lines: string[]; sub: string; x: number; lineY: number; align: 'left' | 'right'}> = ({
  t,
  at,
  n,
  lines,
  sub,
  x,
  lineY,
  align,
}) => {
  const {fps} = useVideoConfig();
  if (t < at) return null;
  const s = spring({frame: (t - at - 0.1) * fps, fps, config: {damping: 13, stiffness: 200}});
  const subIn = interpolate(t, [at + 0.35, at + 0.6], [0, 1], clamp);
  const pos: React.CSSProperties = align === 'left' ? {left: x} : {right: 1920 - x, textAlign: 'right'};
  return (
    <>
      <div style={{position: 'absolute', ...pos, bottom: 1080 - lineY + 12, opacity: s, transform: `translateY(${(1 - s) * 18}px)`}}>
        <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 18, letterSpacing: 4, color: COLORS.coral, marginBottom: 6}}>{n}</div>
        {lines.map((l, i) => (
          <div key={l} style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 41, lineHeight: 1.04, color: COLORS.paper, whiteSpace: 'nowrap'}}>
            <Decode text={l} t={t} start={at + 0.08 + i * 0.08} dur={0.4} />
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', ...pos, top: lineY + 12, fontFamily: FONTS.ui, fontSize: 20, color: 'rgba(241,237,228,0.62)', opacity: subIn, whiteSpace: 'nowrap'}}>{sub}</div>
    </>
  );
};

// Characters scramble through random glyphs and lock in left to right.
const GLYPHS = 'ABCDEFGHKLMNPRSTVXZ0123456789#/+';
const Decode: React.FC<{text: string; t: number; start: number; dur: number}> = ({text, t, start, dur}) => {
  const tick = Math.floor(t * 30);
  return (
    <span>
      {text.split('').map((ch, i) => {
        const settle = start + (dur * i) / text.length;
        if (t < start) return <span key={i} style={{opacity: 0}}>{ch}</span>;
        if (t >= settle || ch === ' ') return <span key={i}>{ch}</span>;
        const g = GLYPHS[Math.floor(random(`${text}-${i}-${tick}`) * GLYPHS.length)];
        return (
          <span key={i} style={{color: COLORS.coral}}>
            {g}
          </span>
        );
      })}
    </span>
  );
};

// "Built for frontline care." — top-left headline.
const Title: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const sp = (at: number) => spring({frame: (t - at) * fps, fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
  const word = (k: number): React.CSSProperties => ({display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * 36}px) scale(${1.2 - 0.2 * k})`, transformOrigin: 'left bottom'});
  const eyebrow = interpolate(t, [0.5, 0.9], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 70, top: 62, opacity: 1 - fade, transform: `translateY(${-fade * 40}px)`}}>
      <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 18, letterSpacing: 5, color: COLORS.coral, opacity: eyebrow}}>INSIDE THE PROTOTYPE</div>
      <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 62, color: COLORS.paper, marginTop: 8, display: 'flex', gap: 18}}>
        <span style={word(sp(Math.max(0.55, T.built)))}>Built for</span>
        <span style={{...word(sp(T.care - 0.3)), color: COLORS.coral}}>frontline care.</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- fork: "We measure | Doctors decide"
const ForkStage: React.FC<{t: number; exit: number}> = ({t, exit}) => {
  const {fps} = useVideoConfig();
  const start = T.fork + 0.45;
  if (t < start) return null;
  // Screen position where the data leaves the (shrunk) board.
  const outTopY = (BY + OUT_Y * BS) * FORK_SCALE + FORK_GY;
  const trunk = interpolate(t, [start, start + 0.3], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const branch = interpolate(t, [start + 0.25, start + 0.55], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});

  // Exit: lines stretch to the frame edges and the crossing slides to the radar center.
  const lift = (FORK.y - RADAR_AXES.cy) * exit;
  const fy = FORK.y - lift;
  const color = interpolateColors(exit, [0, 1], [LINE, RADAR_AXES.color]);
  const w = 3 - (3 - RADAR_AXES.width) * exit;
  const top = (outTopY - lift) * (1 - exit) - 40 * exit;
  const bottom = exit > 0 ? fy + (1120 - fy) * exit : outTopY + (FORK.y - outTopY) * trunk;
  const left = FORK.x - (FORK.x - FORK.left) * branch - (FORK.left + 40) * exit;
  const right = FORK.x + (FORK.right - FORK.x) * branch + (1960 - FORK.right) * exit;

  // Pulses: down the trunk, then one to the gauge and one that stops at the doctor.
  const pTrunk = interpolate(t, [start + 0.05, start + 0.4], [0, 1], clamp);
  const pLeft = interpolate(t, [T.measure - 0.25, T.measure], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const pRight = interpolate(t, [T.measure - 0.25, T.doctors], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
  const content = 1 - interpolate(exit, [0, 0.4], [0, 1], clamp);

  const measureIn = spring({frame: (t - T.measure) * fps, fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
  const decideIn = spring({frame: (t - T.doctors) * fps, fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
  const gauge = interpolate(t, [T.measure, T.measure + 0.6], [0, 0.72], {...clamp, easing: Easing.out(Easing.cubic)});

  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <line x1={FORK.x} x2={FORK.x} y1={top} y2={bottom} stroke={color} strokeWidth={w} />
        {branch > 0 && <line x1={left} x2={right} y1={fy} y2={fy} stroke={color} strokeWidth={w} />}
        <g opacity={content}>
          {pTrunk > 0 && pTrunk < 1 && <circle cx={FORK.x} cy={outTopY + (FORK.y - outTopY) * pTrunk} r={8} fill={COLORS.coral} />}
          {pLeft > 0 && pLeft < 1 && <circle cx={FORK.x - (FORK.x - FORK.left) * pLeft} cy={FORK.y} r={8} fill={COLORS.coral} />}
          {pRight > 0 && <circle cx={FORK.x + (FORK.right - 70 - FORK.x) * pRight} cy={FORK.y} r={8} fill={COLORS.coral} />}
          <circle cx={FORK.x} cy={FORK.y} r={7 * branch} fill={COLORS.paper} />
          <Gauge x={FORK.left - 60} y={FORK.y} k={branch} value={gauge} />
          <Doctor x={FORK.right + 60} y={FORK.y} k={branch} lit={decideIn} />
        </g>
      </svg>
      <div style={{position: 'absolute', left: FORK.left - 60 - 320, width: 640, top: FORK.y + 92, textAlign: 'center', opacity: measureIn * content, transform: `translateY(${(1 - measureIn) * 30}px)`}}>
        <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 58, color: COLORS.paper, lineHeight: 1}}>WE MEASURE</div>
        <div style={{fontFamily: FONTS.ui, fontSize: 22, color: 'rgba(241,237,228,0.62)', marginTop: 12}}>Objective voice measures, with clinical context</div>
      </div>
      <div style={{position: 'absolute', left: FORK.right + 60 - 320, width: 640, top: FORK.y + 92, textAlign: 'center', opacity: decideIn * content, transform: `translateY(${(1 - decideIn) * 30}px)`}}>
        <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 58, color: COLORS.coral, lineHeight: 1}}>DOCTORS DECIDE</div>
        <div style={{fontFamily: FONTS.ui, fontSize: 22, color: 'rgba(241,237,228,0.62)', marginTop: 12}}>No automated diagnoses</div>
      </div>
    </>
  );
};

const Gauge: React.FC<{x: number; y: number; k: number; value: number}> = ({x, y, k, value}) => {
  const r = 46;
  const at = (v: number) => {
    const a = Math.PI * (1 - v);
    return {x: x + r * Math.cos(a), y: y + 10 - r * Math.sin(a)};
  };
  const a0 = at(0);
  const a1 = at(1);
  const av = at(value);
  const needle = Math.PI * (1 - value);
  return (
    <g opacity={k} transform={`translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})`}>
      <circle cx={x} cy={y} r={70} fill={COLORS.navy} stroke={LINE} strokeWidth={2.4} />
      <path d={`M ${a0.x} ${a0.y} A ${r} ${r} 0 0 1 ${a1.x} ${a1.y}`} fill="none" stroke="rgba(241,237,228,0.18)" strokeWidth={10} strokeLinecap="round" />
      {value > 0.01 && <path d={`M ${a0.x} ${a0.y} A ${r} ${r} 0 0 1 ${av.x} ${av.y}`} fill="none" stroke={COLORS.coral} strokeWidth={10} strokeLinecap="round" />}
      <line x1={x} y1={y + 10} x2={x + 36 * Math.cos(needle)} y2={y + 10 - 36 * Math.sin(needle)} stroke={COLORS.paper} strokeWidth={4} strokeLinecap="round" />
      <circle cx={x} cy={y + 10} r={7} fill={COLORS.paper} />
    </g>
  );
};

const Doctor: React.FC<{x: number; y: number; k: number; lit: number}> = ({x, y, k, lit}) => {
  const stroke = interpolateColors(lit, [0, 1], [LINE, COLORS.coral]);
  return (
    <g opacity={k} transform={`translate(${x} ${y}) scale(${k})`}>
      {lit > 0 && <circle r={70 + 26 * lit} fill="none" stroke={COLORS.coral} strokeWidth={3} opacity={(1 - lit) * 0.8} />}
      <circle r={70} fill={COLORS.navy} stroke={stroke} strokeWidth={2.4 + lit} />
      <circle r={70} fill={`rgba(255,110,66,${0.12 * lit})`} />
      <circle cy={-18} r={17} fill="none" stroke={COLORS.paper} strokeWidth={3.4} />
      <path d="M -30 34 C -30 10 -16 2 0 2 C 16 2 30 10 30 34" fill="none" stroke={COLORS.paper} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M -12 4 C -14 18 -6 26 4 26 C 12 26 16 20 16 12" fill="none" stroke={COLORS.coral} strokeWidth={3} strokeLinecap="round" />
      <circle cx={16} cy={9} r={4} fill={COLORS.coral} />
    </g>
  );
};
