import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {StageTag} from '../../components/StageTag';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';
import {MARKET_DOT, RADAR_AXES} from '../shared/handoffs';

// Scene 8 — the market as a sonar. A first fast sweep reveals the map; then it slows down, detects the
// global players in the "heavy cloud & trial" corner, crosses the empty quadrant and stops on VoxWave.

const scene = getScene('radar');
const vo = (word: string, n = 0) => scene.voAt + wordTime('radar', word, n);

const C = {x: RADAR_AXES.cx, y: RADAR_AXES.cy};
const R = 520;
const RINGS = [130, 260, 390, 500];

// Positions relative to the center (y down). Angles in degrees, clockwise from +x.
const A = {dx: -200, dy: 260}; // Canary Speech
const B = {dx: -430, dy: 170}; // Aural Analytics (Linus Health)
const V = {dx: 300, dy: -260}; // VoxWave
const ang = (p: {dx: number; dy: number}) => (Math.atan2(p.dy, p.dx) * 180) / Math.PI;
const ANG_A = ang(A) + 360;
const ANG_B = ang(B) + 360;
const ANG_V = ang(V) + 720;

const T = {
  lapStart: 0.15,
  lapEnd: 1.45,
  a: vo('canary'),
  b: vo('aural'),
  heavy: vo('heavy'),
  cloud: vo('cloud'),
  clinical: vo('clinical'),
  v: vo('voxwave'),
  clinic: vo('clinic'),
  exit: 12.4,
};

// Beam angle over time: one fast lap, then a slow hunt that lands on each detection exactly when it is named.
const beamAt = (t: number) =>
  interpolate(t, [T.lapStart, T.lapEnd, T.a, T.b, T.v - 0.05], [-90, 270, ANG_A, ANG_B, ANG_V], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  });

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const PAPER = (a: number) => `rgba(241,237,228,${a})`;
const TEAL = (a: number) => `rgba(47,155,203,${a})`;
const CORAL = (a: number) => `rgba(255,110,66,${a})`;
const pos = (p: {dx: number; dy: number}) => ({x: C.x + p.dx, y: C.y + p.dy});
const polar = (deg: number, r: number) => ({x: C.x + r * Math.cos((deg * Math.PI) / 180), y: C.y + r * Math.sin((deg * Math.PI) / 180)});

export const RadarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const beam = beamAt(t);
  const lap = interpolate(t, [T.lapStart, T.lapEnd], [0, 1], clamp);

  // Exit: the camera homes in on VoxWave while the map fades; its point ends centered.
  const exit = Easing.inOut(Easing.cubic)(interpolate(t, [T.exit, scene.seconds - 1 / fps], [0, 1], clamp));
  const vp = pos(V);
  const camScale = 1 + 0.5 * exit;
  const camX = (C.x - vp.x) * exit;
  const camY = (C.y - vp.y) * exit;
  const mapFade = 1 - interpolate(exit, [0, 0.55], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <BrandBackground tone="ink" />

      <AbsoluteFill style={{transform: `translate(${camX}px, ${camY}px) scale(${camScale})`, transformOrigin: `${vp.x}px ${vp.y}px`}}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <g opacity={mapFade}>
            <Grid lap={lap} />
            <Axes t={t} />
            <Zone t={t} />
            <OpenQuadrant t={t} />
            <Beam beam={beam} t={t} />
            <Blip t={t} at={T.a} p={A} />
            <Blip t={t} at={T.b} p={B} />
            <EmptyPings t={t} />
          </g>
          <VoxPing t={t} />
        </svg>
        <div style={{opacity: mapFade}}>
          <AxisLabels lap={lap} />
          <CompetitorCard t={t} at={T.a} p={A} side="below" name="Canary Speech" tags={['CLOUD API', 'HIPAA']} line="Conversational speech analysis" hotTag={0} hotAt={T.cloud} />
          <CompetitorCard t={t} at={T.b} p={B} side="left" name="Aural Analytics" owner="Linus Health" tags={['CLINICAL TRIALS', 'RESEARCH']} line="Speech analytics for pharma studies" hotTag={0} hotAt={T.clinical} />
          <VoxCard t={t} />
        </div>
      </AbsoluteFill>

      {/* VoxWave's point, drawn in screen space so it lands exactly on the next scene's start */}
      <VoxDot t={t} exit={exit} />

      <Hud t={t} fade={mapFade} />
      <StageTag label="ILLUSTRATIVE POSITIONING" tone="ink" opacity={interpolate(t, [0.6, 1.0], [0, 1], clamp) * mapFade} />

      <VoiceOver scene={scene} />
      <Sfx name="sonar-ping" at={T.a} volume={0.55} />
      <Sfx name="sonar-ping" at={T.b} volume={0.5} />
      <Sfx name="blip-low" at={T.v - 0.95} volume={0.2} />
      <Sfx name="blip-low" at={T.v - 0.55} volume={0.2} />
      <Sfx name="sonar-hero" at={T.v} volume={0.7} />
      <Sfx name="impact" at={T.v} volume={0.35} />
      <Sfx name="shimmer" at={T.clinic} volume={0.3} />
      <Sfx name="whoosh" at={T.exit} volume={0.4} />
    </AbsoluteFill>
  );
};

// Range rings, drawn by the first sweep, with small tick marks.
const Grid: React.FC<{lap: number}> = ({lap}) => (
  <g>
    {RINGS.map((r, i) => (
      <circle
        key={r}
        cx={C.x}
        cy={C.y}
        r={r}
        fill="none"
        stroke={PAPER(i === RINGS.length - 1 ? 0.2 : 0.11)}
        strokeWidth={i === RINGS.length - 1 ? 2 : 1.5}
        strokeDasharray={i % 2 ? '2 8' : undefined}
        pathLength={i % 2 ? undefined : 1}
        style={{strokeDasharray: i % 2 ? undefined : `${lap} 1`}}
        transform={`rotate(-90 ${C.x} ${C.y})`}
        opacity={i % 2 ? lap : 1}
      />
    ))}
    {new Array(72).fill(0).map((_, k) => {
      const a = k * 5 - 90;
      if ((a + 90) / 360 > lap) return null;
      const p1 = polar(a, R - (k % 6 === 0 ? 18 : 8));
      const p2 = polar(a, R);
      return <line key={k} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={PAPER(k % 6 === 0 ? 0.35 : 0.18)} strokeWidth={1.5} />;
    })}
  </g>
);

// Axes carried over from scene 7, with arrowheads that appear on the first sweep.
const Axes: React.FC<{t: number}> = ({t}) => {
  const arrows = interpolate(t, [0.2, 0.7], [0, 1], clamp);
  const head = (x: number, y: number, rot: number) => (
    <path d="M -14 -9 L 0 0 L -14 9" transform={`translate(${x} ${y}) rotate(${rot})`} fill="none" stroke={PAPER(0.6)} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={arrows} />
  );
  return (
    <g>
      <line x1={-40} x2={1960} y1={C.y} y2={C.y} stroke={RADAR_AXES.color} strokeWidth={RADAR_AXES.width} />
      <line x1={C.x} x2={C.x} y1={-40} y2={1120} stroke={RADAR_AXES.color} strokeWidth={RADAR_AXES.width} />
      {head(1880, C.y, 0)}
      {head(40, C.y, 180)}
      {head(C.x, 34, -90)}
      {head(C.x, 1046, 90)}
    </g>
  );
};

const AxisLabels: React.FC<{lap: number}> = ({lap}) => {
  // Each label appears as the first sweep passes its direction (top, right, bottom, left).
  const show = (deg: number) => interpolate(lap, [(deg + 90) / 360 - 0.04, (deg + 90) / 360 + 0.06], [0, 1], clamp);
  const title: React.CSSProperties = {fontFamily: FONTS.ui, fontWeight: 700, fontSize: 20, letterSpacing: 4, color: PAPER(0.9)};
  const sub: React.CSSProperties = {fontFamily: FONTS.ui, fontSize: 18, color: PAPER(0.5), marginTop: 4};
  return (
    <>
      <div style={{position: 'absolute', left: C.x + 26, top: 40, opacity: show(-90)}}>
        <div style={title}>LOCAL ADAPTATION</div>
        <div style={sub}>Baltic / regional care</div>
      </div>
      <div style={{position: 'absolute', right: 64, top: C.y - 76, textAlign: 'right', opacity: show(0)}}>
        <div style={title}>LOW FRICTION</div>
        <div style={sub}>Frontline-ready</div>
      </div>
      <div style={{position: 'absolute', left: C.x + 26, top: 1000, opacity: show(90)}}>
        <div style={title}>GENERIC / GLOBAL</div>
      </div>
      <div style={{position: 'absolute', left: 64, top: C.y - 76, opacity: show(180)}}>
        <div style={title}>DEPLOYMENT FRICTION</div>
        <div style={sub}>Heavy cloud, complex integration</div>
      </div>
    </>
  );
};

// Rotating sonar beam with a fading trail.
const Beam: React.FC<{beam: number; t: number}> = ({beam, t}) => {
  // Fades back once it has locked on VoxWave, so the label reads clean.
  const on = interpolate(t, [T.lapStart - 0.1, T.lapStart + 0.15], [0, 1], clamp) * interpolate(t, [T.v + 0.2, T.v + 0.8], [1, 0.3], clamp);
  const slices = 34;
  const step = 1.6;
  const wedge = (a0: number, a1: number) => {
    const p0 = polar(a0, R);
    const p1 = polar(a1, R);
    return `M ${C.x} ${C.y} L ${p0.x} ${p0.y} A ${R} ${R} 0 0 1 ${p1.x} ${p1.y} Z`;
  };
  const tip = polar(beam, R);
  return (
    <g opacity={on}>
      {new Array(slices).fill(0).map((_, k) => (
        <path key={k} d={wedge(beam - (k + 1) * step, beam - k * step + 0.2)} fill={CORAL(0.3 * Math.pow(1 - k / slices, 2.2))} />
      ))}
      <line x1={C.x} y1={C.y} x2={tip.x} y2={tip.y} stroke={COLORS.coral} strokeWidth={3} strokeLinecap="round" />
      <circle cx={C.x} cy={C.y} r={9} fill={COLORS.coral} />
      <circle cx={tip.x} cy={tip.y} r={5} fill={COLORS.coral} />
    </g>
  );
};

// A detection: blip, sonar echo rings, and a lingering glow.
const Blip: React.FC<{t: number; at: number; p: {dx: number; dy: number}}> = ({t, at, p}) => {
  if (t < at - 0.02) return null;
  const {x, y} = pos(p);
  const pop = interpolate(t, [at - 0.02, at + 0.12], [0, 1], {...clamp, easing: Easing.out(Easing.back(2.5))});
  const rings = [0, 0.25, 0.5].map((d) => interpolate(t, [at + d, at + d + 1.1], [0, 1], clamp));
  return (
    <g>
      {rings.map((k, i) => (k > 0 && k < 1 ? <circle key={i} cx={x} cy={y} r={12 + k * 90} fill="none" stroke={TEAL(0.8)} strokeWidth={2.5 * (1 - k)} opacity={1 - k} /> : null))}
      <circle cx={x} cy={y} r={20 * pop} fill={TEAL(0.18)} />
      <circle cx={x} cy={y} r={9 * pop} fill={COLORS.tealBright} />
    </g>
  );
};

const CompetitorCard: React.FC<{
  t: number;
  at: number;
  p: {dx: number; dy: number};
  side: 'below' | 'left';
  name: string;
  owner?: string;
  tags: string[];
  line: string;
  hotTag: number;
  hotAt: number;
}> = ({t, at, p, side, name, owner, tags, line, hotTag, hotAt}) => {
  const {fps} = useVideoConfig();
  const open = spring({frame: (t - at - 0.15) * fps, fps, config: {damping: 15, stiffness: 160}});
  if (open <= 0.001) return null;
  const {x, y} = pos(p);
  const W = 360;
  const box: React.CSSProperties =
    side === 'below'
      ? {left: x - W / 2, top: y + 36, transformOrigin: '50% 0%'}
      : {left: x - W - 36, top: y - 50, transformOrigin: '100% 50%'};
  const hot = interpolate(t, [hotAt, hotAt + 0.2], [0, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        width: W,
        ...box,
        padding: '16px 20px 18px',
        borderRadius: 18,
        background: 'rgba(241,237,228,0.06)',
        border: `1.5px solid ${PAPER(0.22)}`,
        fontFamily: FONTS.ui,
        color: PAPER(0.92),
        transform: side === 'below' ? `scaleY(${open})` : `scaleX(${open})`,
        opacity: Math.min(1, open * 1.5),
      }}
    >
      <div style={{fontFamily: FONTS.display, fontWeight: 700, fontSize: 27, whiteSpace: 'nowrap'}}>{name}</div>
      {owner && <div style={{fontSize: 15, color: PAPER(0.5), marginTop: 2}}>now part of {owner}</div>}
      <div style={{display: 'flex', gap: 8, marginTop: 10}}>
        {tags.map((tag, i) => {
          const h = i === hotTag ? hot : 0;
          return (
            <span
              key={tag}
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 2.5,
                padding: '5px 10px',
                borderRadius: 12,
                border: `1.5px solid ${h > 0.5 ? COLORS.tealBright : PAPER(0.3)}`,
                background: TEAL(0.25 * h),
                color: h > 0.5 ? COLORS.white : PAPER(0.75),
                transform: `scale(${1 + 0.12 * Math.sin(h * Math.PI)})`,
              }}
            >
              {tag}
            </span>
          );
        })}
      </div>
      <div style={{fontSize: 17, color: PAPER(0.6), marginTop: 10}}>{line}</div>
    </div>
  );
};

// "Heavy cloud & trial space": a shaded zone that wraps both detections.
const Zone: React.FC<{t: number}> = ({t}) => {
  const draw = interpolate(t, [T.heavy - 0.1, T.heavy + 0.7], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  if (draw <= 0) return null;
  const box = {x: 80, y: 600, w: 860, h: 400};
  return (
    <g>
      <defs>
        <mask id="radar-zone">
          <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={40} fill="none" stroke="white" strokeWidth={14} pathLength={1} strokeDasharray={`${draw} 1`} />
        </mask>
      </defs>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={40} fill={TEAL(0.07 * draw)} />
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={40} fill="none" stroke={TEAL(0.7)} strokeWidth={2.4} strokeDasharray="10 9" mask="url(#radar-zone)" />
      <rect x={box.x + 34} y={box.y - 15} width={360 * Math.min(1, draw * 2.5)} height={30} fill={COLORS.navy} />
      <text x={box.x + 48} y={box.y + 8} fontFamily={FONTS.ui} fontWeight={700} fontSize={19} letterSpacing={4} fill={COLORS.tealBright} opacity={Math.min(1, draw * 2.5)}>
        HEAVY CLOUD &amp; TRIAL SPACE
      </text>
    </g>
  );
};

// The empty upper-right quadrant: two hollow pings show there is nobody there... until VoxWave.
const EmptyPings: React.FC<{t: number}> = ({t}) => {
  const {x, y} = pos(V);
  return (
    <g>
      {[T.v - 0.95, T.v - 0.55].map((at, i) => {
        const k = interpolate(t, [at, at + 0.9], [0, 1], clamp);
        if (k <= 0 || k >= 1) return null;
        return <circle key={i} cx={x} cy={y} r={14 + k * 120} fill="none" stroke={PAPER(0.6)} strokeWidth={2.5 * (1 - k)} strokeDasharray="4 7" opacity={1 - k} />;
      })}
    </g>
  );
};

const OpenQuadrant: React.FC<{t: number}> = ({t}) => {
  const k = interpolate(t, [T.v, T.v + 0.6], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  if (k <= 0) return null;
  // Quarter disc in the upper-right quadrant, tinted coral.
  const p0 = polar(-90, R);
  const p1 = polar(0, R);
  return <path d={`M ${C.x} ${C.y} L ${p0.x} ${p0.y} A ${R} ${R} 0 0 1 ${p1.x} ${p1.y} Z`} fill={CORAL(0.08 * k)} stroke={CORAL(0.35 * k)} strokeWidth={2} />;
};

// The hero detection: a big coral sonar ping around VoxWave.
const VoxPing: React.FC<{t: number}> = ({t}) => {
  const {x, y} = pos(V);
  return (
    <g>
      {[0, 0.18, 0.36, 1.2, 2.4].map((d, i) => {
        const k = interpolate(t, [T.v + d, T.v + d + 1.3], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        if (k <= 0 || k >= 1) return null;
        return <circle key={i} cx={x} cy={y} r={18 + k * (i < 3 ? 260 : 150)} fill="none" stroke={COLORS.coral} strokeWidth={(i < 3 ? 5 : 3) * (1 - k)} opacity={1 - k} />;
      })}
    </g>
  );
};

const VoxDot: React.FC<{t: number; exit: number}> = ({t, exit}) => {
  const {fps} = useVideoConfig();
  const pop = spring({frame: (t - T.v) * fps, fps, config: {damping: 9, stiffness: 220}});
  if (pop <= 0.001) return null;
  const vp = pos(V);
  const x = vp.x + (MARKET_DOT.x - vp.x) * exit;
  const y = vp.y + (MARKET_DOT.y - vp.y) * exit;
  const glow = 0.5 + 0.5 * Math.sin(t * 5);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <circle cx={x} cy={y} r={(MARKET_DOT.r + 14 + glow * 6) * pop * (1 - exit)} fill={CORAL(0.18)} />
      <circle cx={x} cy={y} r={MARKET_DOT.r * pop} fill={COLORS.coral} />
    </svg>
  );
};

// VoxWave's label: the name, the claim, and what puts it in the empty quadrant.
const VoxCard: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const open = spring({frame: (t - T.v - 0.2) * fps, fps, config: {damping: 14, stiffness: 170}});
  const claim = spring({frame: (t - T.clinic) * fps, fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
  if (open <= 0.001) return null;
  const {x, y} = pos(V);
  return (
    <div style={{position: 'absolute', left: x + 44, top: y - 70, transformOrigin: '0% 50%', transform: `scaleX(${open})`, opacity: Math.min(1, open * 1.5)}}>
      <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 16, letterSpacing: 4, color: COLORS.coral}}>DETECTED · OPEN SPACE</div>
      <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 64, color: COLORS.paper, lineHeight: 1.05, marginTop: 4}}>VoxWave</div>
      <div style={{display: 'flex', gap: 8, marginTop: 10}}>
        {['LOCAL', 'ON-DEVICE', 'FRONTLINE-READY'].map((tag) => (
          <span key={tag} style={{fontFamily: FONTS.ui, fontSize: 13, fontWeight: 700, letterSpacing: 2.5, padding: '5px 10px', borderRadius: 12, background: COLORS.coral, color: COLORS.card}}>
            {tag}
          </span>
        ))}
      </div>
      <div
        style={{
          fontFamily: FONTS.display,
          fontWeight: 800,
          fontSize: 40,
          color: COLORS.paper,
          marginTop: 18,
          opacity: claim,
          transform: `translateY(${(1 - claim) * 24}px)`,
          whiteSpace: 'nowrap',
        }}
      >
        Built for the <span style={{color: COLORS.coral}}>clinic floor.</span>
      </div>
    </div>
  );
};

// Top-left readout: scan state and detection count.
const Hud: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const found = (t >= T.a ? 1 : 0) + (t >= T.b ? 1 : 0) + (t >= T.v ? 1 : 0);
  const blink = Math.floor(t * 3) % 2 === 0;
  const state = t < T.lapEnd ? 'MAPPING' : t < T.v ? 'SCANNING MARKET' : 'TARGET LOCKED';
  return (
    <div style={{position: 'absolute', left: 64, top: 52, fontFamily: FONTS.ui, fontWeight: 700, fontSize: 17, letterSpacing: 4, color: TEAL(0.9), opacity: interpolate(t, [0.3, 0.7], [0, 1], clamp) * fade, display: 'flex', alignItems: 'center', gap: 12}}>
      <span style={{width: 10, height: 10, borderRadius: '50%', background: t >= T.v ? COLORS.coral : COLORS.tealBright, opacity: blink ? 1 : 0.35}} />
      SONAR · {state} · {found} {found === 1 ? 'SIGNAL' : 'SIGNALS'}
    </div>
  );
};
