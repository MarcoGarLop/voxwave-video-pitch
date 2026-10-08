import React from 'react';
import {Easing, interpolate, spring} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {LOGO} from '../../brand/logo';
import {scrollingBars} from '../../lib/voiceSignal';

// The MVP clinician dashboard as it appears on the laptop screen (screen-local px).
export const SCREEN_W = 1120;
export const SCREEN_H = 630;
const SIDEBAR = 84;
const HEADER = 64;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const TEAL_TINT = 'rgba(0,78,114,0.1)';

export type CardId = 'live' | 'markers' | 'trend' | 'alert';

// Bento layout: live check-in and alert on top, biomarkers and trend below.
export const CARDS: Record<CardId, {x: number; y: number; w: number; h: number}> = {
  live: {x: 108, y: 84, w: 600, h: 250},
  alert: {x: 726, y: 84, w: 370, h: 250},
  markers: {x: 108, y: 352, w: 370, h: 254},
  trend: {x: 496, y: 352, w: 600, h: 254},
};

// Static chrome: sidebar + header. Revealed by the boot circle.
export const DashboardChrome: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, background: COLORS.paper, fontFamily: FONTS.ui, color: COLORS.ink}}>
    <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDEBAR, background: COLORS.navy, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 18, gap: 18}}>
      <div style={{width: 50, height: 50, borderRadius: 16, background: COLORS.white, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <svg viewBox="140 330 990 460" width={38}>
          <path d={LOGO.symbol.navy.join('')} fill={COLORS.navy} />
          <path d={LOGO.symbol.teal.join('')} fill={COLORS.teal} />
          <path d={LOGO.symbol.coral.join('')} fill={COLORS.coral} />
        </svg>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{width: 44, height: 44, borderRadius: 14, background: i === 0 ? 'rgba(255,110,66,0.22)' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: i === 0 ? 14 : 0}}>
          <div style={{width: 18, height: 18, borderRadius: i % 2 ? 9 : 5, border: `2.5px solid ${i === 0 ? COLORS.coral : 'rgba(255,255,255,0.45)'}`}} />
        </div>
      ))}
    </div>
    <div style={{position: 'absolute', left: SIDEBAR, right: 0, top: 0, height: HEADER, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px'}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 14}}>
        <span style={{fontFamily: FONTS.display, fontWeight: 700, fontSize: 24}}>Clinician dashboard</span>
        <span style={{fontSize: 16, color: COLORS.inkSoft}}>Today · 24 patients monitored</span>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <span style={{fontSize: 14, fontWeight: 700, letterSpacing: 2, color: COLORS.coral, border: `2px solid ${COLORS.coral}`, borderRadius: 14, padding: '4px 12px'}}>MVP</span>
        <div style={{width: 200, height: 36, borderRadius: 18, background: COLORS.card, border: `1.5px solid ${COLORS.inkFaint}`}} />
        <div style={{width: 36, height: 36, borderRadius: '50%', background: COLORS.teal}} />
      </div>
    </div>
  </div>
);

const Label: React.FC<{children: React.ReactNode; color: string}> = ({children, color}) => (
  <div style={{fontSize: 14, fontWeight: 700, letterSpacing: 2.5, color}}>{children}</div>
);

// 1 — Live check-in: a patient's everyday call coming in, in real time.
export const LiveCard: React.FC<{t: number; since: number}> = ({t, since}) => {
  const {w, h} = CARDS.live;
  const COUNT = 46;
  const GAP = 11.5;
  const bars = scrollingBars(t, COUNT, 0.05, t - since - 0.2, 'mvp');
  const pulse = 0.5 + 0.5 * Math.sin(t * 7);
  return (
    <div style={{position: 'absolute', inset: 0, background: COLORS.navy, color: COLORS.paper, padding: '22px 26px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <Label color={COLORS.tealBright}>LIVE CHECK-IN</Label>
        <span style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600}}>
          <span style={{width: 10, height: 10, borderRadius: '50%', background: COLORS.coral, opacity: 0.4 + pulse * 0.6}} />
          Listening
        </span>
      </div>
      <div style={{fontFamily: FONTS.display, fontWeight: 700, fontSize: 26, marginTop: 6}}>Patient 0187 · phone call</div>
      <svg width={w} height={h - 90} style={{position: 'absolute', left: 0, bottom: 0}}>
        {bars.map((b) => {
          const x = w - 40 - b.offset * GAP;
          if (x < 24) return null;
          const bh = 4 + b.level * 120;
          return <rect key={b.index} x={x - 3} y={(h - 90) / 2 - bh / 2} width={6} height={bh} rx={3} fill={b.index >= COUNT - 7 ? COLORS.coral : COLORS.tealBright} />;
        })}
      </svg>
    </div>
  );
};

// 2 — Biomarkers: four ring gauges filling up (same values as scene 3).
const MARKERS = [
  {label: 'Tremor', value: '1.8 %', fill: 0.36, alert: false},
  {label: 'Pitch', value: '124 Hz', fill: 0.62, alert: false},
  {label: 'Rhythm', value: '4.2 syl/s', fill: 0.55, alert: false},
  {label: 'Pauses', value: '0.38 s', fill: 0.78, alert: true},
];

export const MarkersCard: React.FC<{since: number}> = ({since}) => (
  <div style={{position: 'absolute', inset: 0, background: COLORS.card, padding: '20px 22px'}}>
    <Label color={COLORS.inkSoft}>BIOMARKERS · TODAY</Label>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 10px', marginTop: 14}}>
      {MARKERS.map((m, i) => {
        const p = interpolate(since, [0.05 + i * 0.07, 0.6 + i * 0.07], [0, m.fill], {...clamp, easing: Easing.out(Easing.cubic)});
        const r = 26;
        const c = 2 * Math.PI * r;
        const color = m.alert ? COLORS.coral : COLORS.teal;
        return (
          <div key={m.label} style={{display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap'}}>
            <svg width={54} height={54} viewBox="0 0 64 64">
              <circle cx={32} cy={32} r={r} fill="none" stroke={m.alert ? 'rgba(255,110,66,0.18)' : TEAL_TINT} strokeWidth={8} />
              <circle cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 32 32)" />
            </svg>
            <div>
              <div style={{fontSize: 14, fontWeight: 600, color: COLORS.inkSoft}}>{m.label}</div>
              <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 19, color: m.alert ? '#D9481E' : COLORS.ink}}>{m.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// 3 — Trend against the personal baseline (same story as scene 4).
const VALUES = [-18, 10, -30, 22, -6, 31, -24, 4, 26, -12, 18, -20, 66, 150];

export const TrendCard: React.FC<{since: number}> = ({since}) => {
  const {w, h} = CARDS.trend;
  const cw = w - 44;
  const ch = h - 70;
  const x0 = 18;
  const step = (cw - 36) / (VALUES.length - 1);
  const cy = 60;
  const k = 0.42;
  const pts = VALUES.map((v, i) => ({x: x0 + i * step, y: cy + v * k}));
  const band = interpolate(since, [0, 0.3], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const shown = interpolate(since, [0.1, 0.75], [0, VALUES.length - 1], clamp);
  const last = Math.floor(shown);
  const frac = shown - last;
  return (
    <div style={{position: 'absolute', inset: 0, background: COLORS.card, padding: '20px 22px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between'}}>
        <Label color={COLORS.inkSoft}>VOICE TREND · 14 WEEKS</Label>
        <Label color={COLORS.teal}>PERSONAL BASELINE</Label>
      </div>
      <svg width={cw} height={ch} style={{marginTop: 14, overflow: 'visible'}}>
        <rect x={0} y={cy - 22} width={cw * band} height={44} rx={10} fill={TEAL_TINT} />
        {pts.map((p, i) => {
          if (i === 0 || i > last + 1) return null;
          const a = pts[i - 1];
          const u = i === last + 1 ? frac : 1;
          const drift = i >= 12;
          return (
            <line key={i} x1={a.x} y1={a.y} x2={a.x + (p.x - a.x) * u} y2={a.y + (p.y - a.y) * u} stroke={drift ? COLORS.coral : COLORS.ink} strokeWidth={4} strokeLinecap="round" />
          );
        })}
        {pts.slice(0, last + 1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i >= 12 ? 7 : 4.5} fill={i >= 12 ? COLORS.coral : COLORS.ink} />
        ))}
      </svg>
    </div>
  );
};

// 4 — The alert the neurologist acts on.
export const AlertCard: React.FC<{t: number; since: number; fps: number}> = ({t, since, fps}) => {
  const icon = spring({frame: (since - 0.1) * fps, fps, config: {damping: 9, stiffness: 220}});
  const btn = spring({frame: (since - 0.35) * fps, fps, config: {damping: 14, stiffness: 180}});
  const ping = (t * 1.4) % 1;
  return (
    <div style={{position: 'absolute', inset: 0, background: COLORS.coral, color: COLORS.card, padding: '22px 26px'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
        <div style={{position: 'relative', width: 46, height: 46}}>
          <div style={{position: 'absolute', inset: 0, borderRadius: 14, border: `2px solid ${COLORS.card}`, opacity: (1 - ping) * 0.7, transform: `scale(${1 + ping * 0.5})`}} />
          <div style={{position: 'absolute', inset: 0, borderRadius: 14, background: COLORS.card, color: COLORS.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTS.display, fontWeight: 800, fontSize: 30, transform: `scale(${icon})`}}>
            !
          </div>
        </div>
        <Label color={COLORS.card}>VOICE DRIFT DETECTED</Label>
      </div>
      <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 38, marginTop: 18, lineHeight: 1}}>Patient 0187</div>
      <div style={{fontSize: 18, marginTop: 8, opacity: 0.9}}>2 weeks outside personal baseline</div>
      <div
        style={{
          position: 'absolute',
          left: 26,
          bottom: 22,
          background: COLORS.card,
          color: COLORS.ink,
          fontWeight: 700,
          fontSize: 17,
          borderRadius: 14,
          padding: '11px 18px',
          opacity: btn,
          transform: `translateY(${(1 - btn) * 14}px)`,
        }}
      >
        Schedule a visit →
      </div>
    </div>
  );
};
