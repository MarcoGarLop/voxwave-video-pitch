import React from 'react';
import {Easing, interpolate, spring, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {PHOTO_FRAME} from './handoffs';

// Callouts around the framed photo (team members, prototype parts): a coral dot on the subject, a navy
// line out of the frame and a label (icon, title, coral subtitle) that slams in on its voice-over word.
const F = PHOTO_FRAME;
export const LABEL = {w: 400, h: 112, gap: 30};
export type Side = 'left' | 'right';
type Pt = {x: number; y: number};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const labelEdge = (side: Side): number => (side === 'left' ? F.x - LABEL.gap : F.x + F.w + LABEL.gap);

// Dot on the subject and the line out to its label (diagonal, then a horizontal run). `out` retracts it.
export const CalloutLine: React.FC<{t: number; at: number; from: Pt; side: Side; labelY: number; out: number}> = ({t, at, from, side, labelY, out}) => {
  const {fps} = useVideoConfig();
  const dot = spring({frame: (t - at + 0.15) * fps, fps, config: {damping: 11, stiffness: 260, mass: 0.6}});
  if (dot <= 0.001) return null;
  const line = interpolate(t, [at - 0.05, at + 0.3], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)}) * (1 - out);
  const end = labelEdge(side);
  const dir = side === 'left' ? -1 : 1;
  const elbowX = from.x + dir * Math.min(Math.abs(labelY - from.y) * 0.75, Math.abs(end - from.x) - 60);
  const d = `M ${from.x} ${from.y} L ${elbowX} ${labelY} H ${end}`;
  const pulse = interpolate(t, [at, at + 0.6], [0, 1], clamp);
  return (
    <g>
      {line > 0.001 && (
        <>
          <path d={d} fill="none" stroke={COLORS.card} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${line} 1`} opacity={0.85} />
          <path d={d} fill="none" stroke={COLORS.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${line} 1`} />
        </>
      )}
      {pulse < 1 && <circle cx={from.x} cy={from.y} r={10 + pulse * 26} fill="none" stroke={COLORS.coral} strokeWidth={3} opacity={(1 - pulse) * (1 - out)} />}
      <circle cx={from.x} cy={from.y} r={9 * dot * (1 - out)} fill={COLORS.coral} stroke={COLORS.card} strokeWidth={3} />
    </g>
  );
};

export const CalloutLabel: React.FC<{
  side: Side;
  y: number;
  title: string;
  sub: string;
  icon: IconName;
  t: number;
  at: number;
  out: number;
  titleSize?: number;
}> = ({side, y, title, sub, icon, t, at, out, titleSize = 44}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - at - 0.15) * fps, fps, config: {damping: 12, stiffness: 230, mass: 0.6}});
  if (s <= 0.001) return null;
  const subIn = spring({frame: (t - at - 0.3) * fps, fps, config: {damping: 14, stiffness: 200}});
  const left = side === 'left';
  const edge = labelEdge(side);
  const k = s * (1 - out);
  return (
    <div
      style={{
        position: 'absolute',
        left: left ? edge - LABEL.w : edge,
        top: y - LABEL.h / 2,
        width: LABEL.w,
        height: LABEL.h,
        display: 'flex',
        flexDirection: left ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 18,
        opacity: Math.min(1, k * 1.4),
        transform: `translateX(${(1 - k) * (left ? 40 : -40)}px) scale(${0.85 + 0.15 * k})`,
        transformOrigin: left ? 'right center' : 'left center',
      }}
    >
      <div style={{flex: 'none', width: 74, height: 74, borderRadius: '50%', background: COLORS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Icon name={icon} size={38} color={COLORS.paper} />
      </div>
      <div style={{textAlign: left ? 'right' : 'left'}}>
        <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: titleSize, lineHeight: 1, color: COLORS.ink, letterSpacing: 1, whiteSpace: 'nowrap'}}>{title}</div>
        <div
          style={{
            fontFamily: FONTS.ui,
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: 1.5,
            color: COLORS.coral,
            marginTop: 10,
            opacity: subIn,
            transform: `translateY(${(1 - subIn) * 10}px)`,
            whiteSpace: 'nowrap',
          }}
        >
          {sub.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export type IconName = 'wave' | 'chart' | 'map' | 'chip' | 'motion' | 'pulse' | 'report' | 'stroke';
const ICONS: Record<IconName, string> = {
  wave: 'M2 12h3l2.2-6 3.3 12 3.2-9 2.1 4.5 1.4-1.5H22',
  chart: 'M3 20h18M6.5 16.5v-3.5M11 16.5v-6M15.5 16.5v-4.5M5 9.5l4.5-4 4 3 6-5',
  map: 'M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5zM9 4v13.5M15 6.5V20',
  chip: 'M7 7h10v10H7zM10 10h4v4h-4zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  // Hand with motion lines.
  motion: 'M8 21v-8.5a1.5 1.5 0 0 1 3 0V11a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0v4.5a4.5 4.5 0 0 1-4.5 4.5H8zM8 13.5L6.2 11.7a1.4 1.4 0 0 0-2 2L8 17.5M3 6.5c1.2-1.4 2.6-2 4-2M19.5 4c1.2.6 2 1.6 2.5 3',
  // Electrode pad with a heartbeat.
  pulse: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM5.5 12h3l1.5-3 2.5 6 1.5-3h4.5',
  // Report page.
  report: 'M6 3h9l4 4v14H6zM15 3v4h4M9 11h7M9 14.5h7M9 18h4',
  // Arm and alert spark (stroke screening).
  stroke: 'M4 20l5-6 3 2 5-7M14 9h3v3M18.5 3.5v3M17 5h3',
};
export const Icon: React.FC<{name: IconName; size: number; color: string}> = ({name, size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={ICONS[name]} />
  </svg>
);
