import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';

const scene = getScene('s04');
const vo = (word: string) => scene.voAt + wordTime('s04', word);

// Chart geometry (screen px).
const X0 = 330;
const STEP = 92;
const WEEKS = 14;
const BAND = {center: 500, half: 72};
const AXIS_Y = 780;
const xOf = (i: number) => X0 + i * STEP;

// Weekly voice-stability values (px offsets from the baseline center). The last two drift away.
const VALUES = [-18, 10, -30, 22, -6, 31, -24, 4, 26, -12, 18, -20, 66, 178];
const DRIFT_FROM = 12; // index of the first week that leaves the pattern

const T = {
  land: 0.55,
  firstWeek: 0.7,
  weekEvery: 0.245,
  band: vo('baseline') - 0.15,
  w13: vo('flags') - 0.35,
  w14: vo('flags'),
  alert: vo('flags') + 0.15,
  projection: vo('starts') - 0.4,
  wipe: 7.35,
};

const weekAt = (i: number) => (i === 0 ? T.land : i < DRIFT_FROM ? T.firstWeek + (i - 1) * T.weekEvery : i === DRIFT_FROM ? T.w13 : T.w14);

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const S04TrendAlert: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const pts = VALUES.map((v, i) => ({x: xOf(i), y: BAND.center + v, at: weekAt(i)}));
  const alertPt = pts[WEEKS - 1];

  // Camera drifts along with the newest week, then leans into the alert.
  const newest = pts.filter((p) => t >= p.at).length - 1;
  const follow = interpolate(newest, [0, WEEKS - 1], [0, -40], clamp);
  const lean = interpolate(t, [T.alert, T.alert + 1.2], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const camScale = interpolate(t, [0, T.alert], [1, 1.03], clamp) + lean * 0.035;

  // Lights down: an ink circle grows out of the alert point and swallows the frame.
  const wipeR = interpolate(t, [T.wipe, scene.seconds], [0, 2300], {...clamp, easing: Easing.in(Easing.cubic)});

  return (
    <AbsoluteFill>
      <BrandBackground />
      <AbsoluteFill style={{transform: `translateX(${follow}px) scale(${camScale})`, transformOrigin: `${alertPt.x}px ${alertPt.y}px`}}>
        <ChartFrame t={t} />
        <Baseline t={t} />
        <TrendLine t={t} pts={pts} />
        <Projection t={t} from={alertPt} />
        <AlertCard t={t} anchor={alertPt} />
        <ArrivingDot t={t} to={pts[0]} />
      </AbsoluteFill>
      <ChartHeader t={t} />

      {wipeR > 0 && (
        <AbsoluteFill style={{clipPath: `circle(${wipeR}px at ${alertPt.x + follow}px ${alertPt.y}px)`}}>
          <BrandBackground tone="ink" />
        </AbsoluteFill>
      )}

      <VoiceOver scene={scene} />
      <Sfx name="whoosh-short" at={0.05} volume={0.3} />
      {pts.slice(1, DRIFT_FROM).map((p, i) => (
        <Sfx key={i} name={i % 2 ? 'blip-low' : 'blip'} at={p.at} volume={0.12} />
      ))}
      <Sfx name="shimmer" at={T.band} volume={0.15} />
      <Sfx name="blip-low" at={T.w13} volume={0.25} />
      <Sfx name="alert" at={T.w14} volume={0.6} />
      <Sfx name="whoosh" at={T.wipe - 0.05} volume={0.45} />
      <Sfx name="drone" at={T.wipe} volume={0.35} />
    </AbsoluteFill>
  );
};

// The coral point left by scene 3 travels to become week 1.
const ArrivingDot: React.FC<{t: number; to: {x: number; y: number}}> = ({t, to}) => {
  if (t > T.land + 0.05) return null;
  const p = Easing.inOut(Easing.cubic)(interpolate(t, [0, T.land], [0, 1], clamp));
  const x = 960 + (to.x - 960) * p;
  const y = 540 + (to.y - 540) * p - Math.sin(p * Math.PI) * 90;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <circle cx={x} cy={y} r={28 - 14 * p} fill={COLORS.coral} opacity={0.16 * (1 - p)} />
      <circle cx={x} cy={y} r={14 - 5 * p} fill={COLORS.coral} />
    </svg>
  );
};

const ChartHeader: React.FC<{t: number}> = ({t}) => {
  const on = interpolate(t, [0.2, 0.6], [0, 1], clamp);
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <path d={`M ${x} ${y + sy * 40} L ${x} ${y} L ${x + sx * 40} ${y}`} stroke={COLORS.ink} strokeWidth={3} fill="none" />
  );
  return (
    <AbsoluteFill style={{opacity: on, fontFamily: FONTS.ui, color: COLORS.ink}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {corner(40, 40, 1, 1)}
        {corner(1880, 40, -1, 1)}
        {corner(40, 1040, 1, -1)}
        {corner(1880, 1040, -1, -1)}
      </svg>
      <div style={{position: 'absolute', top: 56, left: 70, fontSize: 22, letterSpacing: 5, fontWeight: 700}}>PATIENT #0427 · WEEKLY VOICE TREND</div>
      <div style={{position: 'absolute', top: 58, right: 70, fontSize: 18, letterSpacing: 4, color: COLORS.teal, fontWeight: 600}}>
        {t < T.w14 ? 'MONITORING' : 'ATTENTION'}
      </div>
    </AbsoluteFill>
  );
};

const ChartFrame: React.FC<{t: number}> = ({t}) => {
  const axis = interpolate(t, [0.25, 1.1], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const xEnd = X0 - 40 + (xOf(WEEKS - 1) + 120 - (X0 - 40)) * axis;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {[BAND.center - 180, BAND.center - 90, BAND.center, BAND.center + 90, BAND.center + 180].map((y) => (
        <line key={y} x1={X0 - 40} x2={xEnd} y1={y} y2={y} stroke={COLORS.inkFaint} strokeWidth={1} strokeDasharray="2 8" />
      ))}
      <line x1={X0 - 40} x2={xEnd} y1={AXIS_Y} y2={AXIS_Y} stroke={COLORS.ink} strokeWidth={2.5} />
      {new Array(WEEKS).fill(0).map((_, i) => {
        const on = interpolate(t, [weekAt(i) - 0.1, weekAt(i) + 0.1], [0, 1], clamp);
        return (
          <g key={i} opacity={on}>
            <line x1={xOf(i)} x2={xOf(i)} y1={AXIS_Y} y2={AXIS_Y + 10} stroke={COLORS.ink} strokeWidth={2} />
            <text x={xOf(i)} y={AXIS_Y + 38} textAnchor="middle" fontFamily={FONTS.ui} fontSize={18} fontWeight={600} fill={i >= DRIFT_FROM + 1 ? COLORS.coral : COLORS.inkSoft}>
              W{i + 1}
            </text>
          </g>
        );
      })}
      <text x={X0 - 40} y={BAND.center - 215} fontFamily={FONTS.ui} fontSize={16} letterSpacing={3} fontWeight={700} fill={COLORS.inkSoft} opacity={axis}>
        VOICE STABILITY
      </text>
    </svg>
  );
};

// The patient's own baseline: a band that "learns" its width from the first weeks.
const Baseline: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const grow = spring({frame: (t - T.band) * fps, fps, config: {damping: 14, stiffness: 90}});
  if (grow <= 0.001) return null;
  const half = BAND.half * grow;
  const xA = X0 - 40;
  const xB = xOf(WEEKS - 1) + 120;
  const label = spring({frame: (t - T.band - 0.3) * fps, fps, config: {damping: 13}});
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <rect x={xA} y={BAND.center - half} width={xB - xA} height={half * 2} fill={COLORS.teal} opacity={0.1} />
      <line x1={xA} x2={xB} y1={BAND.center - half} y2={BAND.center - half} stroke={COLORS.teal} strokeWidth={2} strokeDasharray="10 8" />
      <line x1={xA} x2={xB} y1={BAND.center + half} y2={BAND.center + half} stroke={COLORS.teal} strokeWidth={2} strokeDasharray="10 8" />
      <g transform={`translate(${xA + 10} ${BAND.center - half - 20}) scale(${label})`} opacity={label}>
        <rect x={0} y={-30} width={230} height={40} rx={20} fill={COLORS.teal} />
        <text x={115} y={-3} textAnchor="middle" fontFamily={FONTS.ui} fontSize={19} fontWeight={700} fill={COLORS.paper}>
          Personal baseline
        </text>
      </g>
    </svg>
  );
};

const TrendLine: React.FC<{t: number; pts: {x: number; y: number; at: number}[]}> = ({t, pts}) => {
  const {fps} = useVideoConfig();
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const p = interpolate(t, [b.at - 0.12, b.at + 0.05], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
    if (p <= 0) continue;
    const drift = i >= DRIFT_FROM;
    segs.push(
      <line key={i} x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * p} y2={a.y + (b.y - a.y) * p} stroke={drift ? COLORS.coral : COLORS.ink} strokeWidth={drift ? 5 : 3} strokeLinecap="round" />,
    );
  }
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {segs}
      {pts.map((p, i) => {
        const s = spring({frame: (t - p.at) * fps, fps, config: {damping: 9, stiffness: 220, mass: 0.6}});
        if (s <= 0.001) return null;
        const alert = i === WEEKS - 1;
        const warn = i >= DRIFT_FROM;
        const pulse = alert ? (t - p.at) % 0.9 : -1;
        return (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            {alert && pulse >= 0 && <circle r={14 + pulse * 50} fill="none" stroke={COLORS.coral} strokeWidth={3} opacity={(1 - pulse / 0.9) * 0.6} />}
            <circle r={(alert ? 15 : 9) * s} fill={warn ? COLORS.coral : COLORS.ink} stroke={COLORS.paper} strokeWidth={3} />
          </g>
        );
      })}
    </svg>
  );
};

// Dashed coral projection: where the voice is heading if nothing is done.
const Projection: React.FC<{t: number; from: {x: number; y: number}}> = ({t, from}) => {
  const p = interpolate(t, [T.projection, T.projection + 0.6], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  if (p <= 0) return null;
  const to = {x: from.x + 150, y: from.y + 70};
  const x = from.x + (to.x - from.x) * p;
  const y = from.y + (to.y - from.y) * p;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <line x1={from.x} y1={from.y} x2={x} y2={y} stroke={COLORS.coral} strokeWidth={4} strokeDasharray="6 10" strokeLinecap="round" />
      <path d="M -14 -9 L 0 0 L -14 9" transform={`translate(${x} ${y}) rotate(25)`} stroke={COLORS.coral} strokeWidth={4} fill="none" opacity={p} strokeLinecap="round" />
    </svg>
  );
};

const AlertCard: React.FC<{t: number; anchor: {x: number; y: number}}> = ({t, anchor}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - T.alert) * fps, fps, config: {damping: 12, stiffness: 170}});
  if (s <= 0.001) return null;
  const W = 520;
  const left = anchor.x - W + 70;
  const top = 195;
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: s}}>
        <line x1={anchor.x} y1={anchor.y - 18} x2={anchor.x} y2={top + 100} stroke={COLORS.coral} strokeWidth={2.5} strokeDasharray="4 6" />
      </svg>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: W,
          transform: `translateY(${(1 - s) * 40}px) scale(${0.85 + 0.15 * s})`,
          transformOrigin: `${W - 70}px 140px`,
          opacity: s,
          background: COLORS.card,
          borderRadius: 24,
          boxShadow: '0 24px 50px rgba(9,38,52,0.16)',
          border: `2.5px solid ${COLORS.coral}`,
          padding: '24px 28px',
          display: 'flex',
          gap: 22,
          alignItems: 'center',
          fontFamily: FONTS.ui,
          color: COLORS.ink,
        }}
      >
        <div style={{width: 64, height: 64, borderRadius: 18, background: COLORS.coral, color: COLORS.paper, fontFamily: FONTS.display, fontWeight: 800, fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
          !
        </div>
        <div>
          <div style={{fontFamily: FONTS.display, fontWeight: 700, fontSize: 34, lineHeight: 1.1}}>Trend change detected</div>
          <div style={{fontSize: 19, color: COLORS.inkSoft, marginTop: 8}}>Voice drifting below baseline · Week 14</div>
        </div>
      </div>
    </>
  );
};
