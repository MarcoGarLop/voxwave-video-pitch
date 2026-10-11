import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {StageTag} from '../../components/StageTag';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';
import {CHART, DOOR, SCALE_DOT} from '../shared/handoffs';
import {CeDoor} from '../gate/GateScene';

// Scene 13 — after the gate. The CE door falls flat into the chart as the "pit" of the one-time
// investment; the key becomes the head of the cumulative contribution curve, which climbs out of
// the pit as patients rain onto the axis. Repaid in about 300 patients; a pin marks the 1,000-patient
// 3-year target (≈€380k a year). The camera then dives into the pin's coral head.

const scene = getScene('payback');
const vo = (word: string, n = 0) => scene.voAt + wordTime('payback', word, n);

const T = {
  fall: 0.15,
  axes: 0.35,
  start: 0.8,
  repay: vo('repay'),
  adds: vo('adds'),
  thousand: vo('thousand'),
  target: vo('three-year'),
  means: vo('means'),
  exit: 12.25,
};

// Chart geometry: the axis is the gate scene's timeline; the origin sits at the door's right edge.
const AX = CHART.axisY;
const DOOR_L = CHART.doorX - DOOR.w / 2;
const X0 = DOOR_L + DOOR.w;
const X1 = CHART.x1;
const PMAX = 1100;
const xOf = (p: number) => X0 + (p / PMAX) * (X1 - X0);
const yOf = (k: number) => AX - k * 1.2; // k€
// k€, one prudent scenario: CE marking ≈€100k + €15k of first-year running costs. Repaid at ≈300 patients,
// which is what the voice-over says.
const GATE = {best: 115, worst: 115};
const PER = 0.38; // k€ per patient per year (€480 − ≈€100 variable costs)
const REPAY = {best: GATE.best / PER, worst: GATE.worst / PER}; // ≈303 patients

// Patients reached over time.
const headAt = (t: number) =>
  interpolate(t, [T.start, T.repay + 0.2, T.adds + 1.2, T.thousand + 0.45, T.target + 0.6], [0, 300, 640, 1000, 1080], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  });

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const PaybackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const head = headAt(t);

  const fall = Easing.in(Easing.cubic)(interpolate(t, [T.fall, T.fall + 0.45], [0, 1], clamp));
  const pit = interpolate(t, [T.fall + 0.4, T.fall + 0.75], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.6))});
  const axes = interpolate(t, [T.axes, T.axes + 0.7], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});

  // Exit: dive into the pin's coral head; it ends as a point centered on paper.
  const exit = Easing.inOut(Easing.cubic)(interpolate(t, [T.exit, scene.seconds - 1 / fps], [0, 1], clamp));
  const pin = {x: xOf(1000), y: yOf(1000 * PER - GATE.best) - 120};
  const zoom = 1 + 5 * Math.pow(exit, 2);
  const camX = (SCALE_DOT.x - pin.x) * exit;
  const camY = (SCALE_DOT.y - pin.y) * exit;
  const fadeAll = interpolate(exit, [0.1, 0.6], [1, 0], clamp);

  return (
    <AbsoluteFill>
      <BrandBackground />

      <AbsoluteFill style={{transform: `translate(${camX}px, ${camY}px) scale(${zoom})`, transformOrigin: `${pin.x}px ${pin.y}px`}}>
        <div style={{position: 'absolute', inset: 0, opacity: fadeAll}}>
          <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            {/* Timeline -> x-axis */}
            <line x1={-200} x2={2300} y1={AX} y2={AX} stroke={COLORS.ink} strokeWidth={4} strokeLinecap="round" />
            <Revenue t={t} />
            <Pit pit={pit} />
            <Axes t={t} k={axes} />
            <RepayBand t={t} />
            <Curves head={head} t={t} />
            <Rain t={t} head={head} />
            <Slope t={t} />
          </svg>
          {fall < 1 && <CeDoor left={DOOR_L} baseY={AX} rise={1} open={0} ceDraw={1} light={0} labelK={1} fall={fall * 0.5} />}
          <RepayStamp t={t} />
          <HeadLabel t={t} head={head} />
        </div>
        <Pin t={t} at={pin} exit={exit} fade={fadeAll} />
      </AbsoluteFill>

      <Target t={t} fade={fadeAll} />

      <StageTag label="PRUDENT SCENARIO · ≈€100k CE MARKING + €15k FIRST-YEAR COSTS" opacity={interpolate(t, [0.8, 1.2], [0, 1], clamp) * fadeAll} />

      <VoiceOver scene={scene} />
      <Sfx name="impact" at={T.fall + 0.45} volume={0.45} />
      <Sfx name="shimmer" at={T.axes + 0.2} volume={0.25} />
      <Sfx name="hit" at={T.repay + 0.05} volume={0.55} />
      <Sfx name="blip" at={T.adds} volume={0.35} />
      <Sfx name="impact" at={T.thousand + 0.4} volume={0.45} />
      <Sfx name="hit" at={T.target} volume={0.4} />
      <Sfx name="shimmer" at={T.means} volume={0.35} />
      <Sfx name="whoosh" at={T.exit} volume={0.4} />
      {new Array(16).fill(0).map((_, i) => (
        <Sfx key={i} name="blip-low" at={T.start + 0.2 + i * 0.42} volume={0.08} />
      ))}
    </AbsoluteFill>
  );
};

// The milestone the key was heading to in scene 12 — it fades as the chart takes over.
const Revenue: React.FC<{t: number}> = ({t}) => {
  const k = 1 - interpolate(t, [0.1, 0.5], [0, 1], clamp);
  if (k <= 0) return null;
  const x = 2330 + CHART.doorX - 1600;
  return (
    <g opacity={k}>
      <circle cx={x} cy={AX} r={13} fill={COLORS.paper} stroke={COLORS.coral} strokeWidth={4} />
      <circle cx={x} cy={AX} r={5} fill={COLORS.coral} />
      <text x={x} y={AX + 52} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={700} fontSize={19} letterSpacing={4} fill={COLORS.coral}>
        REVENUE
      </text>
    </g>
  );
};

// The one-time investment as a hatched pit under the axis (best to worst case).
const Pit: React.FC<{pit: number}> = ({pit}) => {
  if (pit <= 0) return null;
  const best = (yOf(-GATE.best) - AX) * Math.min(1, pit);
  const worst = (yOf(-GATE.worst) - AX) * Math.min(1, pit);
  return (
    <g>
      <defs>
        <pattern id="pit-hatch" width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={12} stroke={COLORS.ink} strokeWidth={2.4} />
        </pattern>
        <pattern id="pit-hatch-faint" width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={12} stroke="rgba(9,38,52,0.3)" strokeWidth={2.4} />
        </pattern>
      </defs>
      <rect x={DOOR_L} y={AX} width={DOOR.w} height={worst} fill="url(#pit-hatch-faint)" />
      <rect x={DOOR_L} y={AX} width={DOOR.w} height={best} fill="url(#pit-hatch)" />
      <rect x={DOOR_L} y={AX} width={DOOR.w} height={worst} fill="none" stroke={COLORS.ink} strokeWidth={3} strokeDasharray="6 6" />
      <text x={CHART.doorX} y={AX + worst + 34} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={800} fontSize={17} letterSpacing={3.5} fill={COLORS.ink} opacity={pit}>
        THE GATE
      </text>
      <text x={CHART.doorX} y={AX + worst + 56} textAnchor="middle" fontFamily={FONTS.ui} fontSize={15} letterSpacing={1} fill={COLORS.inkSoft} opacity={pit}>
        one-time · ≈€115k
      </text>
    </g>
  );
};

const Axes: React.FC<{t: number; k: number}> = ({t, k}) => {
  if (k <= 0) return null;
  const labels = interpolate(t, [T.axes + 0.4, T.axes + 0.8], [0, 1], clamp);
  return (
    <g>
      <line x1={X0} x2={X0} y1={AX + 170} y2={AX + 170 - (AX + 170 - 170) * k} stroke={COLORS.ink} strokeWidth={3} />
      <path d={`M ${X0 - 9} ${186} L ${X0} 170 L ${X0 + 9} 186`} fill="none" stroke={COLORS.ink} strokeWidth={3} opacity={k} />
      <text x={X0 + 18} y={176} fontFamily={FONTS.ui} fontWeight={700} fontSize={17} letterSpacing={4} fill={COLORS.ink} opacity={labels}>
        CUMULATIVE CONTRIBUTION
      </text>
      <text x={X1} y={AX - 18} textAnchor="end" fontFamily={FONTS.ui} fontWeight={700} fontSize={17} letterSpacing={4} fill={COLORS.ink} opacity={labels}>
        PATIENTS →
      </text>
      {[200, 400].map((v) => (
        <g key={v} opacity={labels}>
          <line x1={X0 - 8} x2={X1} y1={yOf(v)} y2={yOf(v)} stroke={COLORS.inkFaint} strokeWidth={1.5} strokeDasharray="4 8" />
          <text x={X0 - 16} y={yOf(v) + 6} textAnchor="end" fontFamily={FONTS.ui} fontWeight={600} fontSize={17} fill={COLORS.inkSoft}>
            €{v}k
          </text>
        </g>
      ))}
      {[250, 500, 750, 1000].map((p) => (
        <g key={p} opacity={labels}>
          <line x1={xOf(p)} x2={xOf(p)} y1={AX} y2={AX + 10} stroke={COLORS.ink} strokeWidth={2.5} />
          <text x={xOf(p)} y={AX + 36} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={600} fontSize={17} fill={COLORS.inkSoft}>
            {p.toLocaleString('en-US')}
          </text>
        </g>
      ))}
    </g>
  );
};

// Best-case and worst-case contribution lines, with the band between them.
// The curves grow as a voice wave and settle into straight lines once they reach the target.
const Curves: React.FC<{head: number; t: number}> = ({head, t}) => {
  if (head <= 0) return null;
  const n = 140;
  const ps = new Array(n + 1).fill(0).map((_, i) => (head * i) / n);
  const calm = Easing.inOut(Easing.cubic)(interpolate(head, [820, 1080], [0, 1], clamp));
  const amp = 22 * (1 - calm);
  const wave = (p: number) => {
    // Fades in from the origin and towards the head so the line stays anchored at both ends.
    const env = Math.min(1, p / 60) * Math.min(1, (head - p) / 40 + 0.35);
    return amp * env * (0.65 * Math.sin(p / 22 - t * 7) + 0.35 * Math.sin(p / 9 + t * 4));
  };
  const up = ps.map((p) => [xOf(p), yOf(PER * p - GATE.best) + wave(p)] as const);
  const lo = ps.map((p) => [xOf(p), yOf(PER * p - GATE.worst) + wave(p) * 0.6] as const);
  const line = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
  const band = `${line(up)} ${lo
    .slice()
    .reverse()
    .map(([x, y]) => `L ${x} ${y}`)
    .join(' ')} Z`;
  return (
    <g>
      {GATE.worst !== GATE.best && (
        <>
          <path d={band} fill="rgba(255,110,66,0.14)" />
          <path d={line(lo)} fill="none" stroke={COLORS.coral} strokeWidth={3} strokeDasharray="8 7" opacity={0.8} />
        </>
      )}
      <path d={line(up)} fill="none" stroke={COLORS.coral} strokeWidth={5} strokeLinejoin="round" />
      <circle cx={up[up.length - 1][0]} cy={up[up.length - 1][1]} r={10} fill={COLORS.coral} />
    </g>
  );
};

// Patients rain onto the axis as the curve reaches them (one dot = 25 patients).
const Rain: React.FC<{t: number; head: number}> = ({t, head}) => {
  const dots: React.ReactNode[] = [];
  for (let p = 25; p <= 1075; p += 25) {
    if (head < p) break;
    // When did the head reach p? Approximate by inverting headAt numerically.
    let lo = T.start;
    let hi = T.target + 0.6;
    for (let k = 0; k < 14; k++) {
      const mid = (lo + hi) / 2;
      if (headAt(mid) < p) lo = mid;
      else hi = mid;
    }
    const k = interpolate(t, [hi, hi + 0.35], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
    const x = xOf(p) + (random(`r${p}`) - 0.5) * 8;
    const y = 120 + (AX - 10 - 120) * k;
    dots.push(<circle key={p} cx={x} cy={y} r={6} fill={p <= REPAY.worst ? COLORS.ink : COLORS.coral} opacity={0.35 + 0.65 * k} />);
  }
  return <g>{dots}</g>;
};

// The zero crossing, highlighted around ≈300 patients.
const RepayBand: React.FC<{t: number}> = ({t}) => {
  const k = interpolate(t, [T.repay - 0.1, T.repay + 0.35], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  if (k <= 0) return null;
  const x1 = xOf(REPAY.best - 25);
  const x2 = xOf(REPAY.worst + 25);
  return (
    <g>
      <rect x={x1} y={AX - 80 * k} width={x2 - x1} height={160 * k} fill="rgba(255,110,66,0.12)" stroke={COLORS.coral} strokeWidth={2} strokeDasharray="5 6" rx={8} />
    </g>
  );
};

const RepayStamp: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - T.repay - 0.05) * fps, fps, config: {damping: 9, stiffness: 260, mass: 0.7}});
  if (s <= 0.001) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: xOf((REPAY.best + REPAY.worst) / 2),
        top: AX - 300,
        transform: `translateX(-50%) rotate(-6deg) scale(${2 - s})`,
        opacity: Math.min(1, s * 1.4),
        padding: '12px 20px',
        border: `4px solid ${COLORS.coral}`,
        borderRadius: 14,
        background: COLORS.paper,
        color: COLORS.coral,
        fontFamily: FONTS.display,
        fontWeight: 800,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        lineHeight: 1.1,
      }}
    >
      <div style={{fontSize: 34}}>GATE REPAID</div>
      <div style={{fontFamily: FONTS.ui, fontSize: 18, fontWeight: 800, letterSpacing: 3, marginTop: 6}}>≈300 PATIENTS · ≈4% OF LITHUANIA</div>
    </div>
  );
};

// "+€380 per patient / year" slope marker.
const Slope: React.FC<{t: number}> = ({t}) => {
  const k = interpolate(t, [T.adds - 0.2, T.adds + 0.35], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  if (k <= 0) return null;
  const p1 = 520;
  const p2 = 680;
  const a = {x: xOf(p1), y: yOf(PER * p1 - GATE.best)};
  const b = {x: xOf(p2), y: yOf(PER * p2 - GATE.best)};
  return (
    <g opacity={k}>
      <path d={`M ${a.x} ${a.y + 26} H ${b.x} V ${b.y + 26}`} fill="none" stroke={COLORS.ink} strokeWidth={2.5} pathLength={1} strokeDasharray={`${k} 1`} />
      <text x={b.x + 18} y={(a.y + b.y) / 2 + 40} fontFamily={FONTS.display} fontWeight={800} fontSize={34} fill={COLORS.ink}>
        +€380
      </text>
      <text x={b.x + 18} y={(a.y + b.y) / 2 + 66} fontFamily={FONTS.ui} fontWeight={700} fontSize={16} letterSpacing={3} fill={COLORS.inkSoft}>
        PER PATIENT / YEAR
      </text>
    </g>
  );
};

// The patient counter riding the curve's head.
const HeadLabel: React.FC<{t: number; head: number}> = ({t, head}) => {
  if (head < 30 || t > T.thousand + 0.5) return null;
  const x = xOf(head);
  const y = yOf(PER * head - GATE.best);
  return (
    <div style={{position: 'absolute', left: x + 18, top: y - 46, fontFamily: FONTS.ui, fontWeight: 700, fontSize: 18, letterSpacing: 2, color: COLORS.coral, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums'}}>
      {Math.round(head / 10) * 10} PATIENTS
    </div>
  );
};

// The 1,000-patient pin (SOM · 3-year target); its coral head is where the camera dives.
const Pin: React.FC<{t: number; at: {x: number; y: number}; exit: number; fade: number}> = ({t, at, exit, fade}) => {
  const {fps} = useVideoConfig();
  const drop = spring({frame: (t - T.thousand - 0.4) * fps, fps, config: {damping: 10, stiffness: 200, mass: 0.8}});
  if (drop <= 0.001) return null;
  const base = {x: at.x, y: yOf(1000 * PER - GATE.best)};
  const headY = at.y - (1 - drop) * 300;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <g opacity={fade}>
        <line x1={base.x} x2={base.x} y1={AX} y2={base.y} stroke={COLORS.coral} strokeWidth={2.5} strokeDasharray="4 7" />
        <line x1={base.x} x2={base.x} y1={base.y} y2={headY} stroke={COLORS.ink} strokeWidth={4} />
        <circle cx={base.x} cy={base.y} r={9} fill={COLORS.coral} />
      </g>
      <circle cx={at.x} cy={headY} r={(SCALE_DOT.r + 6 * (1 - exit)) / (1 + 5 * Math.pow(exit, 2))} fill={COLORS.coral} />
      <circle cx={at.x} cy={headY} r={(SCALE_DOT.r + 14) * (1 - exit)} fill="none" stroke={COLORS.coral} strokeWidth={2} opacity={0.4 * (1 - exit)} />
    </svg>
  );
};

// SOM card: 3-year target, with the yearly contribution counting up.
const Target: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - T.target + 0.2) * fps, fps, config: {damping: 13, stiffness: 190}});
  if (s <= 0.001) return null;
  const n = interpolate(t, [T.means, T.means + 1.2], [0, 380], {...clamp, easing: Easing.out(Easing.cubic)});
  const big = spring({frame: (t - T.means) * fps, fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
  return (
    <div style={{position: 'absolute', left: 820, top: 110, width: 700, opacity: s * fade, transform: `translateY(${(1 - s) * -30}px)`}}>
      <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
        <span style={{fontFamily: FONTS.ui, fontWeight: 800, fontSize: 18, letterSpacing: 3, padding: '5px 10px', borderRadius: 10, background: COLORS.coral, color: COLORS.card}}>SOM</span>
        <span style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 18, letterSpacing: 4, color: COLORS.ink}}>1,000 PATIENTS · 3-YEAR TARGET</span>
      </div>
      <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 104, color: COLORS.coral, lineHeight: 1, marginTop: 14, opacity: big, transform: `scale(${1.25 - 0.25 * big})`, transformOrigin: 'left center', fontVariantNumeric: 'tabular-nums'}}>
        ≈€{Math.round(n)}k
      </div>
      <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 20, letterSpacing: 4, color: COLORS.ink, marginTop: 8, opacity: big}}>CONTRIBUTION / YEAR</div>
    </div>
  );
};
