import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {StageTag} from '../../components/StageTag';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';
import {CHART, DOOR, KEY, keyPath} from '../shared/handoffs';

// Scene 12 — the gate. The key rides a timeline (pilots, clinical validation...) up to a door with the
// CE mark. It unlocks it and goes through; the door shuts again and the copycats bounce off it.
// The camera ends with the door on the left and the timeline as the next scene's x-axis.

const scene = getScene('gate');
const vo = (word: string, n = 0) => scene.voAt + wordTime('gate', word, n);

const T = {
  one: vo('one'),
  door: vo('that') - 0.2,
  ce: vo('ce'),
  toLock: vo('ce') + 0.5,
  turn: vo('one-time') - 0.15,
  open: vo('one-time') + 0.1,
  through: vo('investment'),
  close: vo('and', 1) - 0.1,
  barrier: vo('barrier'),
  copy: vo('barrier') - 0.4,
  copycats: vo('copycats'),
  exit: 8.7,
};

// World geometry (timeline at LINE_Y; the camera pans along it).
const LINE_Y = 640;
const DX = 1600;
const DOOR_L = DX - DOOR.w / 2;
const DOOR_T = LINE_Y - DOOR.h;
const KEYHOLE = {x: DOOR_L + DOOR.w - 48, y: LINE_Y - DOOR.h * 0.46};
export const MILESTONES = [
  {x: 650, label: 'PILOTS', at: 0.45},
  {x: 1100, label: 'CLINICAL VALIDATION', at: 1.45},
  {x: 2330, label: 'REVENUE', at: 5.6, coral: true},
];

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const GateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Camera dolly along the timeline, then a final reframe that leaves the door on the left.
  const exit = Easing.inOut(Easing.cubic)(interpolate(t, [T.exit, scene.seconds - 1 / fps], [0, 1], clamp));
  // Holds on PILOTS for a beat before travelling along the timeline.
  const dolly = Easing.inOut(Easing.cubic)(interpolate(t, [0.95, T.door + 0.6], [0, 1], clamp));
  const camX = lerp(0, 780 - DX, dolly) + (CHART.doorX - DX - (780 - DX)) * exit;
  const camY = (CHART.axisY - LINE_Y) * exit;

  const line = interpolate(t, [0, 0.9], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const rise = spring({frame: (t - T.door) * fps, fps, config: {damping: 14, stiffness: 120}});
  const ceDraw = interpolate(t, [T.ce - 0.15, T.ce + 0.55], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const open = Easing.inOut(Easing.cubic)(interpolate(t, [T.open, T.open + 0.5], [0, 1], clamp)) * (1 - Easing.inOut(Easing.cubic)(interpolate(t, [T.close, T.close + 0.4], [0, 1], clamp)));
  const light = open;

  return (
    <AbsoluteFill>
      <BrandBackground />

      <AbsoluteFill style={{transform: `translate(${camX}px, ${camY}px)`}}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {/* Light spilling out of the open door onto the floor */}
          {light > 0 && <path d={`M ${DOOR_L} ${LINE_Y} L ${DOOR_L + DOOR.w} ${LINE_Y} L ${DOOR_L + DOOR.w + 160} ${LINE_Y + 170} L ${DOOR_L - 160} ${LINE_Y + 170} Z`} fill={`rgba(255,110,66,${0.18 * light})`} />}
          <line x1={-200} x2={-200 + 3600 * line} y1={LINE_Y} y2={LINE_Y} stroke={COLORS.ink} strokeWidth={4} strokeLinecap="round" />
          {MILESTONES.map((m) => (
            <Milestone key={m.label} t={t} {...m} />
          ))}
          <Copycats t={t} exit={exit} />
        </svg>

        <CeDoor left={DOOR_L} baseY={LINE_Y} rise={rise} open={open} ceDraw={ceDraw} light={light} labelK={interpolate(t, [T.ce + 0.3, T.ce + 0.7], [0, 1], clamp)} />

        <CostPill t={t} exit={exit} />
      </AbsoluteFill>

      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <TravelKey t={t} camX={camX} />
      </svg>

      <Headline t={t} exit={exit} />
      <StageTag label="REGULATORY ESTIMATE · TO BE CONFIRMED WITH A NOTIFIED BODY" opacity={interpolate(t, [T.through, T.through + 0.4], [0, 1], clamp) * (1 - exit)} />

      <VoiceOver scene={scene} />
      <Sfx name="blip-low" at={0.75} volume={0.25} />
      <Sfx name="blip-low" at={1.35} volume={0.25} />
      <Sfx name="impact" at={T.door + 0.15} volume={0.45} />
      <Sfx name="shimmer" at={T.ce} volume={0.3} />
      <Sfx name="coin" at={T.turn + 0.2} volume={0.45} />
      <Sfx name="whoosh" at={T.open} volume={0.4} />
      <Sfx name="hit" at={T.close + 0.4} volume={0.55} />
      {[0, 1, 2, 3].map((i) => (
        <Sfx key={i} name="blip-low" at={T.copycats - 0.3 + i * 0.09} volume={0.3} />
      ))}
      <Sfx name="whoosh" at={T.exit} volume={0.35} />
    </AbsoluteFill>
  );
};

export const Milestone: React.FC<{t: number; x: number; label: string; at: number; coral?: boolean}> = ({t, x, label, at, coral}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - at) * fps, fps, config: {damping: 11, stiffness: 220}});
  if (s <= 0.001) return null;
  const color = coral ? COLORS.coral : COLORS.ink;
  return (
    <g>
      <circle cx={x} cy={LINE_Y} r={13 * s} fill={COLORS.paper} stroke={color} strokeWidth={4} />
      <circle cx={x} cy={LINE_Y} r={5 * s} fill={color} />
      <text x={x} y={LINE_Y + 52} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={700} fontSize={19} letterSpacing={4} fill={color} opacity={s}>
        {label}
      </text>
    </g>
  );
};

// The CE door: a frame, a leaf hinged on its left with the CE mark drawn on it, a keyhole,
// and coral light when it opens. Shared with scene 13, where it falls flat into the chart.
export const CeDoor: React.FC<{left: number; baseY: number; rise: number; open: number; ceDraw: number; light: number; labelK: number; fall?: number}> = ({
  left,
  baseY,
  rise,
  open,
  ceDraw,
  light,
  labelK,
  fall = 0,
}) => {
  if (rise <= 0.001) return null;
  const h = DOOR.h * rise;
  const top = baseY - h;
  // CE mark: two half-circle letterforms (C, and E with its middle bar), centered on the leaf.
  const r = 32;
  const gap = 20;
  const cy = DOOR.h * 0.36;
  const cC = DOOR.w / 2 - gap / 2; // C: arc opening to the right, its center on its right edge
  const cE = DOOR.w / 2 + gap / 2 + r; // E: mirrored
  const C = `M ${cC} ${cy - r} A ${r} ${r} 0 1 0 ${cC} ${cy + r}`;
  const E = `M ${cE} ${cy - r} A ${r} ${r} 0 0 0 ${cE} ${cy + r} M ${cE - r} ${cy} H ${cE - r * 0.15}`;
  const kx = DOOR.w - 48;
  const ky = DOOR.h * 0.54;
  return (
    <div style={{position: 'absolute', left, top, width: DOOR.w, height: h, perspective: 900}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 100%', transform: `perspective(1200px) rotateX(${-fall * 180}deg)`, transformStyle: 'preserve-3d'}}>
        {/* Doorway: coral light behind the leaf */}
        <div style={{position: 'absolute', inset: 0, background: `rgba(255,110,66,${0.9 * light})`, borderRadius: '6px 6px 0 0'}} />
        {/* Frame */}
        <div style={{position: 'absolute', inset: -10, bottom: 0, border: `5px solid ${COLORS.ink}`, borderBottom: 'none', borderRadius: '10px 10px 0 0'}} />
        {/* Leaf */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: '0% 50%',
            transform: `rotateY(${-100 * open}deg)`,
            background: COLORS.card,
            border: `4px solid ${COLORS.ink}`,
            borderRadius: '6px 6px 0 0',
            overflow: 'hidden',
          }}
        >
          <svg width={DOOR.w} height={DOOR.h} style={{position: 'absolute', left: -4, top: -4 + (h - DOOR.h) / 2}}>
            <path d={C} fill="none" stroke={COLORS.coral} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={`${ceDraw} 1`} opacity={ceDraw > 0 ? 1 : 0} />
            <path d={E} fill="none" stroke={COLORS.coral} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={`${ceDraw} 1`} opacity={ceDraw > 0 ? 1 : 0} />
            {/* Keyhole */}
            <circle cx={kx} cy={ky} r={11} fill={COLORS.ink} />
            <path d={`M ${kx - 6} ${ky + 4} L ${kx - 9} ${ky + 30} H ${kx + 9} L ${kx + 6} ${ky + 4} Z`} fill={COLORS.ink} />
          </svg>
        </div>
      </div>
      <div style={{position: 'absolute', left: -60, right: -60, top: h + 34, textAlign: 'center', fontFamily: FONTS.ui, fontWeight: 800, fontSize: 19, letterSpacing: 4, color: COLORS.coral, opacity: labelK * (1 - fall * 3)}}>CE MARK</div>
    </div>
  );
};

// The key waits under the headline; when the door is up it flies into the lock, turns and disappears into it.
const TravelKey: React.FC<{t: number; camX: number}> = ({t, camX}) => {
  const {fps} = useVideoConfig();
  const arrive = spring({frame: t * fps, fps, config: {damping: 200}});
  const lock = Easing.inOut(Easing.cubic)(interpolate(t, [T.toLock, T.turn - 0.1], [0, 1], clamp));
  const insert = interpolate(t, [T.turn - 0.14, T.turn], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const turn = interpolate(t, [T.turn, T.turn + 0.25], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const vanish = interpolate(t, [T.turn + 0.28, T.turn + 0.48], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  if (vanish >= 1) return null;
  const idle = Math.sin(t * 2.2) * 5 * (1 - lock);
  const hole = {x: KEYHOLE.x + camX - KEY.len + 4, y: KEYHOLE.y};
  const x = lerp(KEY.x, hole.x, lock) + 18 * insert + 30 * vanish;
  const y = lerp(KEY.y + idle * arrive, hole.y, lock) - Math.sin(lock * Math.PI) * 120;
  const tilt = Math.sin(lock * Math.PI) * -14;
  const sy = Math.cos(turn * Math.PI);
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${1 - 0.35 * vanish} ${Math.abs(sy) < 0.15 ? 0.15 * Math.sign(sy || 1) : sy})`} opacity={1 - vanish}>
      <path d={keyPath(KEY.len, KEY.bow, KEY.shaft)} fill={COLORS.coral} />
      <circle r={KEY.bow * 0.42} fill={COLORS.paper} />
    </g>
  );
};

// Grey copycats roll in behind, hit the closed door and bounce back.
const Copycats: React.FC<{t: number; exit: number}> = ({t, exit}) => {
  if (t < T.copy) return null;
  const r = 17;
  return (
    <g opacity={1 - interpolate(exit, [0, 0.5], [0, 1], clamp)}>
      {[0, 1, 2, 3].map((i) => {
        const startX = 760 - i * 70;
        const wall = DOOR_L - 18 - r - i * 4;
        const hitAt = T.copycats - 0.3 + i * 0.09;
        const approach = interpolate(t, [T.copy + i * 0.05, hitAt], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
        const tau = Math.max(0, t - hitAt);
        const bounce = t > hitAt ? (90 + i * 30) * Math.abs(Math.sin(tau * 7)) * Math.exp(-tau * 3.5) : 0;
        const x = lerp(startX, wall, approach) - bounce - (t > hitAt ? Math.min(1, tau / 0.5) * (40 + i * 55) : 0);
        const squash = t > hitAt && tau < 0.12 ? 0.7 : 1;
        return <ellipse key={i} cx={x} cy={LINE_Y - r * squash} rx={r * (2 - squash)} ry={r * squash} fill="rgba(9,38,52,0.28)" />;
      })}
    </g>
  );
};

const CostPill: React.FC<{t: number; exit: number}> = ({t, exit}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - T.through) * fps, fps, config: {damping: 12, stiffness: 220}});
  if (s <= 0.001) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: DOOR_L + DOOR.w + 40,
        top: DOOR_T + 20,
        padding: '10px 18px',
        borderRadius: 16,
        border: `2px solid ${COLORS.ink}`,
        background: COLORS.card,
        fontFamily: FONTS.ui,
        fontWeight: 700,
        fontSize: 18,
        letterSpacing: 3,
        color: COLORS.ink,
        whiteSpace: 'nowrap',
        opacity: s * (1 - interpolate(exit, [0, 0.5], [0, 1], clamp)),
        transform: `scale(${0.7 + 0.3 * s})`,
        transformOrigin: '0% 50%',
      }}
    >
      €50–110k · ONE-TIME · <span style={{color: COLORS.coral}}>ESTIMATE</span>
    </div>
  );
};

// Headline that swaps with the voice: ONE GATE → CE MARKING → A ONE-TIME INVESTMENT → THE BARRIER…
const LINES: {at: number; parts: {text: string; coral?: boolean}[][]}[] = [
  {at: T.one, parts: [[{text: 'ONE '}, {text: 'GATE.', coral: true}]]},
  {at: T.ce - 0.1, parts: [[{text: 'CE ', coral: true}, {text: 'MARKING.'}]]},
  {at: T.turn, parts: [[{text: 'A '}, {text: 'ONE-TIME', coral: true}, {text: ' INVESTMENT.'}]]},
  {at: T.barrier - 0.1, parts: [[{text: 'THE BARRIER THAT'}], [{text: 'KEEPS '}, {text: 'COPYCATS', coral: true}, {text: ' OUT.'}]]},
];

const Headline: React.FC<{t: number; exit: number}> = ({t, exit}) => {
  const {fps} = useVideoConfig();
  return (
    <div style={{position: 'absolute', left: 120, top: 92, height: 200, overflow: 'hidden', width: 1700, opacity: 1 - interpolate(exit, [0, 0.4], [0, 1], clamp)}}>
      {LINES.map((l, i) => {
        const next = LINES[i + 1]?.at ?? 99;
        if (t < l.at - 0.05 || t > next + 0.3) return null;
        const inK = spring({frame: (t - l.at) * fps, fps, config: {damping: 14, stiffness: 240, mass: 0.6}});
        const outK = interpolate(t, [next - 0.05, next + 0.2], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
        return (
          <div key={i} style={{position: 'absolute', left: 0, top: 0, transform: `translateY(${(1 - inK) * 120 - outK * 160}px)`, opacity: 1 - outK}}>
            {l.parts.map((row, r) => (
              <div key={r} style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: l.parts.length > 1 ? 70 : 92, lineHeight: 1.02, color: COLORS.ink, whiteSpace: 'nowrap'}}>
                {row.map((p, k) => (
                  <span key={k} style={{color: p.coral ? COLORS.coral : COLORS.ink, textDecoration: p.text === 'COPYCATS' ? 'line-through' : undefined, textDecorationThickness: 8}}>
                    {p.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
