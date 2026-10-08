import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {scrollingBars, voiceLevel} from '../../lib/voiceSignal';
import {getScene} from '../config';
import {BARS_CENTER, LivePanel, PANEL, WAVE_HANDOFF as H} from '../shared/LivePanel';

const scene = getScene('s03');
const vo = (word: string) => scene.voAt + wordTime('s03', word);

const T = {
  decel: 0.4,
  scanStart: 0.7,
  scanEnd: 2.2,
  split: vo("can't") - 0.04,
  hub: vo("can't") + 0.15,
  collapse: 6.2,
};

// Camera carried over from scene 2: it arrives with velocity v0 and decelerates to rest.
const V0 = ((H.scale - 1.03) * 3) / 0.75;
const camScaleAt = (t: number) => {
  const tt = Math.min(t, T.decel);
  return H.scale + V0 * (tt - (tt * tt) / (2 * T.decel)) + Math.max(0, t - T.decel) * 0.04;
};

const HUB = {x: 960, y: 540};
const CARD = {w: 700, h: 330};
const VIZ = {x: 30, y: 112, w: 640, h: 190};

type Marker = {
  key: 'tremor' | 'pitch' | 'rhythm' | 'pauses';
  label: string;
  value: number;
  decimals: number;
  unit: string;
  sub: string;
  accent: string;
  cx: number;
  cy: number;
};

const MARKERS: Marker[] = [
  {key: 'tremor', label: 'Tremor', value: 1.8, decimals: 1, unit: '%', sub: 'jitter', accent: COLORS.coral, cx: 545, cy: 300},
  {key: 'pitch', label: 'Pitch', value: 124, decimals: 0, unit: 'Hz', sub: 'F0 mean', accent: COLORS.teal, cx: 1375, cy: 300},
  {key: 'rhythm', label: 'Rhythm', value: 4.2, decimals: 1, unit: '', sub: 'syllables / s', accent: COLORS.teal, cx: 545, cy: 790},
  {key: 'pauses', label: 'Pauses', value: 0.38, decimals: 2, unit: 's', sub: 'avg. pause', accent: COLORS.coral, cx: 1375, cy: 790},
];

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const S03Biomarkers: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const S = camScaleAt(Math.min(t, T.split));

  const activeAt = MARKERS.map((m) => vo(m.key));
  const collapse = interpolate(t, [T.collapse, scene.seconds - 0.12], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const sceneCam = interpolate(t, [T.split, T.collapse], [1, 1.035], clamp);
  const gridOn = interpolate(t, [T.scanStart - 0.2, T.scanStart + 0.4], [0, 1], clamp) * (1 - collapse);

  return (
    <AbsoluteFill>
      <BrandBackground />
      <AnalysisGrid opacity={gridOn * 0.5} t={t} />

      {/* Phase 1: inside the live waveform, AI scan */}
      {t < T.split && (
        <>
          <AbsoluteFill style={{transform: `translateX(${H.translateX}px) scale(${S})`, transformOrigin: `${PANEL.x}px ${PANEL.y}px`}}>
            <Chromatic t={t}>
              <div style={{position: 'absolute', left: PANEL.x - PANEL.w / 2, top: PANEL.y - PANEL.h / 2, width: PANEL.w, height: PANEL.h}}>
                <LivePanel t={t + H.clockOffset} start={H.liveStart} chrome={0} id="s03-live" />
              </div>
            </Chromatic>
          </AbsoluteFill>
          <ScanOverlay t={t} S={S} />
        </>
      )}

      <Hud t={t} fade={collapse} />

      {/* Phase 2: four copies of the waveform fly out to their biomarker cards */}
      <AbsoluteFill style={{transform: `scale(${sceneCam})`}}>
        {t >= T.split && <HubAndLinks t={t} collapse={collapse} />}
        {t >= T.split &&
          MARKERS.map((m, i) => (
            <MarkerCard key={m.key} m={m} index={i} t={t} activeAt={activeAt[i]} collapse={collapse} />
          ))}
        <FinalDot t={t} />
      </AbsoluteFill>

      <VoiceOver scene={scene} />
      <Sfx name="whoosh" at={T.scanStart - 0.1} volume={0.22} />
      <Sfx name="whoosh-short" at={T.split - 0.05} volume={0.45} />
      <Sfx name="shimmer" at={T.hub} volume={0.18} />
      {activeAt.map((at, i) => (
        <Sfx key={i} name={i % 2 ? 'blip-low' : 'blip'} at={at - 0.02} volume={0.55} />
      ))}
      <Sfx name="whoosh" at={T.collapse - 0.05} volume={0.4} />
      <Sfx name="hit" at={scene.seconds - 0.15} volume={0.35} />
    </AbsoluteFill>
  );
};

// Slight RGB split on the waveform right before it breaks apart.
const Chromatic: React.FC<{t: number; children: React.ReactNode}> = ({t, children}) => {
  const k = interpolate(t, [T.split - 0.3, T.split], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  if (k <= 0) return <>{children}</>;
  return (
    <>
      <AbsoluteFill style={{transform: `translate(${-10 * k}px, ${3 * k}px)`, opacity: 0.6 * k, filter: 'hue-rotate(160deg) saturate(2)', mixBlendMode: 'multiply'}}>
        {children}
      </AbsoluteFill>
      <AbsoluteFill style={{transform: `translate(${10 * k}px, ${-3 * k}px)`, opacity: 0.6 * k, mixBlendMode: 'multiply'}}>{children}</AbsoluteFill>
      {children}
    </>
  );
};

// Faint measurement grid that appears while the AI is "listening".
const AnalysisGrid: React.FC<{opacity: number; t: number}> = ({opacity, t}) => {
  if (opacity <= 0) return null;
  const lines = [];
  const off = (t * 20) % 80;
  for (let x = -80; x < 2000; x += 80) lines.push(<line key={`x${x}`} x1={x + off} y1={0} x2={x + off} y2={1080} />);
  for (let y = 20; y < 1080; y += 80) lines.push(<line key={`y${y}`} x1={0} y1={y} x2={1920} y2={y} />);
  return (
    <AbsoluteFill style={{opacity, maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)'}}>
      <svg width={1920} height={1080} stroke="rgba(9,38,52,0.07)" strokeWidth={1}>
        {lines}
      </svg>
    </AbsoluteFill>
  );
};

// Vertical scanning beam; behind it, the AI traces the envelope of the voice.
const ScanOverlay: React.FC<{t: number; S: number}> = ({t, S}) => {
  const p = interpolate(t, [T.scanStart, T.scanEnd], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
  const on = interpolate(t, [T.scanStart, T.scanStart + 0.15, T.split - 0.1, T.split], [0, 1, 1, 0], clamp);
  if (on <= 0) return null;
  const beamX = 230 + p * 1480;
  const cy = 540 + 20 * S;
  const bars = scrollingBars(t + H.clockOffset, 64, 0.055, H.liveStart, 'patient');
  const pts = bars
    .map((b) => {
      const xUnscaled = PANEL.x - PANEL.w / 2 + PANEL.w - 60 - b.offset * 11.5;
      const x = 960 + S * (xUnscaled - PANEL.x);
      const h = (4 + b.level * 290) * S;
      return {x, y: cy - h / 2 - 14, level: b.level};
    })
    .filter((q) => q.x < beamX && q.x > 300);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: on}}>
      <defs>
        <linearGradient id="s03-beam" x1="0" x2="1">
          <stop offset="0" stopColor={COLORS.coral} stopOpacity={0} />
          <stop offset="1" stopColor={COLORS.coral} stopOpacity={0.16} />
        </linearGradient>
      </defs>
      <rect x={beamX - 260} y={150} width={260} height={780} fill="url(#s03-beam)" />
      <line x1={beamX} x2={beamX} y1={150} y2={930} stroke={COLORS.coral} strokeWidth={3} />
      <polyline points={pts.map((q) => `${q.x},${q.y}`).join(' ')} fill="none" stroke={COLORS.teal} strokeWidth={2.5} strokeDasharray="2 6" />
      {pts
        .filter((q) => q.level > 0.55)
        .map((q, i) => (
          <circle key={i} cx={q.x} cy={q.y} r={6} fill={COLORS.coral} />
        ))}
    </svg>
  );
};

const Hud: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const title = 'AI VOICE ANALYSIS';
  const chars = Math.floor(interpolate(t, [T.scanStart, T.scanStart + 0.6], [0, title.length], clamp));
  const on = interpolate(t, [T.scanStart - 0.1, T.scanStart + 0.1], [0, 1], clamp) * (1 - fade);
  const status = t < T.split ? 'LISTENING' : t < vo('pauses') + 0.4 ? 'EXTRACTING BIOMARKERS' : '4 / 4 BIOMARKERS';
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
      <div style={{position: 'absolute', top: 56, left: 70, fontSize: 22, letterSpacing: 5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 14}}>
        <span style={{width: 12, height: 12, borderRadius: '50%', background: COLORS.coral, opacity: 0.5 + 0.5 * Math.sin(t * 10)}} />
        {title.slice(0, chars)}
      </div>
      <div style={{position: 'absolute', top: 58, right: 70, fontSize: 18, letterSpacing: 4, color: COLORS.teal, fontWeight: 600}}>{status}</div>
    </AbsoluteFill>
  );
};

const HubAndLinks: React.FC<{t: number; collapse: number}> = ({t, collapse}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - T.hub) * fps, fps, config: {damping: 12, stiffness: 160}});
  const draw = interpolate(t, [T.hub, T.hub + 0.35], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const corners = MARKERS.map((m) => ({
    x: m.cx + (m.cx < HUB.x ? CARD.w / 2 : -CARD.w / 2),
    y: m.cy + (m.cy < HUB.y ? CARD.h / 2 : -CARD.h / 2),
  }));
  const hubScale = s * (1 - collapse);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {corners.map((c, i) => {
        const x2 = HUB.x + (c.x - HUB.x) * draw * (1 - collapse);
        const y2 = HUB.y + (c.y - HUB.y) * draw * (1 - collapse);
        return (
          <g key={i}>
            <line x1={HUB.x} y1={HUB.y} x2={x2} y2={y2} stroke="rgba(9,38,52,0.3)" strokeWidth={2} strokeDasharray="4 8" />
            {draw >= 1 &&
              [0, 0.5].map((o) => {
                const p = ((t - T.hub) * 1.1 + o) % 1;
                return <circle key={o} cx={HUB.x + (x2 - HUB.x) * p} cy={HUB.y + (y2 - HUB.y) * p} r={5} fill={i % 2 ? COLORS.teal : COLORS.coral} opacity={Math.sin(p * Math.PI) * (1 - collapse)} />;
              })}
          </g>
        );
      })}
      <g transform={`translate(${HUB.x} ${HUB.y}) scale(${hubScale})`}>
        <circle r={66} fill="none" stroke={COLORS.teal} strokeWidth={2} strokeDasharray="6 10" transform={`rotate(${t * 60})`} opacity={0.8} />
        <circle r={50} fill={COLORS.ink} />
        <circle r={50 + 8 * Math.sin(t * 6)} fill="none" stroke={COLORS.coral} strokeWidth={2} opacity={0.35} />
        <text textAnchor="middle" dominantBaseline="central" fill={COLORS.paper} fontFamily={FONTS.display} fontWeight={800} fontSize={32}>
          AI
        </text>
      </g>
    </svg>
  );
};

const MarkerCard: React.FC<{m: Marker; index: number; t: number; activeAt: number; collapse: number}> = ({m, index, t, activeAt, collapse}) => {
  const {fps} = useVideoConfig();
  const fly = spring({frame: (t - T.split - index * 0.05) * fps, fps, config: {damping: 15, stiffness: 110, mass: 0.8}});
  const frameDraw = interpolate(fly, [0.35, 1], [0, 1], clamp);
  const vizIn = interpolate(fly, [0.55, 0.95], [0, 1], clamp);
  const act = spring({frame: (t - activeAt) * fps, fps, config: {damping: 10, stiffness: 180}});
  const isActive = t >= activeAt;
  const pulse = isActive ? Math.exp(-(t - activeAt) * 4) : 0;
  const count = interpolate(t, [activeAt, activeAt + 0.6], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});

  // Ghost: a copy of the big waveform that travels from full screen into this card.
  const big = camScaleAt(T.split);
  const vizCx = m.cx;
  const vizCy = m.cy - CARD.h / 2 + VIZ.y + VIZ.h / 2;
  const from = {dx: 960 + big * (BARS_CENTER.x - PANEL.x) - BARS_CENTER.x, dy: 540 + big * (BARS_CENTER.y - 540) - BARS_CENTER.y, sx: big, sy: big};
  const to = {dx: vizCx - BARS_CENTER.x, dy: vizCy - BARS_CENTER.y, sx: VIZ.w / BARS_CENTER.width, sy: 0.55};
  const g = (a: number, b: number) => a + (b - a) * fly;
  const tilt = Math.sin(fly * Math.PI) * (index % 2 ? -7 : 7);
  const ghostOpacity = interpolate(fly, [0, 0.7, 1], [1, 1, 0], clamp) * (index === 0 ? 1 : interpolate(fly, [0, 0.08], [0.55, 1], clamp));

  // Collapse: every card is sucked into the hub.
  const cx = (HUB.x - m.cx) * collapse;
  const cy = (HUB.y - m.cy) * collapse;

  return (
    <>
      {fly < 1 && (
        <AbsoluteFill
          style={{
            transform: `translate(${g(from.dx, to.dx)}px, ${g(from.dy, to.dy)}px) rotate(${tilt}deg) scale(${g(from.sx, to.sx)}, ${g(from.sy, to.sy)})`,
            transformOrigin: `${BARS_CENTER.x}px ${BARS_CENTER.y}px`,
            opacity: ghostOpacity,
          }}
        >
          <div style={{position: 'absolute', left: PANEL.x - PANEL.w / 2, top: PANEL.y - PANEL.h / 2, width: PANEL.w, height: PANEL.h}}>
            <LivePanel t={T.split + H.clockOffset} start={H.liveStart} chrome={0} id={`s03-ghost-${index}`} />
          </div>
        </AbsoluteFill>
      )}

      <div
        style={{
          position: 'absolute',
          left: m.cx - CARD.w / 2,
          top: m.cy - CARD.h / 2,
          width: CARD.w,
          height: CARD.h,
          transform: `translate(${cx}px, ${cy}px) scale(${(1 - collapse) * (1 + pulse * 0.04)}) rotate(${collapse * (index % 2 ? 12 : -12)}deg)`,
          opacity: 1 - collapse * collapse,
          fontFamily: FONTS.ui,
          color: COLORS.ink,
          filter: `drop-shadow(0 18px 30px rgba(9,38,52,${0.1 * frameDraw}))`,
        }}
      >
        <svg width={CARD.w} height={CARD.h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <rect x={1} y={1} width={CARD.w - 2} height={CARD.h - 2} rx={30} fill={`rgba(251,249,244,${frameDraw})`} />
          {isActive && (
            <rect x={1} y={1} width={CARD.w - 2} height={CARD.h - 2} rx={30} fill="none" stroke={m.accent} strokeWidth={4 + pulse * 6} opacity={0.35 + pulse * 0.5} />
          )}
          <rect
            x={1}
            y={1}
            width={CARD.w - 2}
            height={CARD.h - 2}
            rx={30}
            fill="none"
            stroke={isActive ? m.accent : 'rgba(9,38,52,0.18)'}
            strokeWidth={2}
            pathLength={1}
            strokeDasharray={`${frameDraw} 1`}
          />
          <g transform={`translate(${VIZ.x} ${VIZ.y})`} opacity={vizIn}>
            <Viz kind={m.key} t={t} active={isActive ? act : 0} accent={m.accent} />
          </g>
        </svg>

        <div style={{position: 'absolute', top: 30, left: 36, right: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: frameDraw}}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 14, transform: `scale(${1 + pulse * 0.12})`, transformOrigin: 'left center'}}>
            <span style={{fontFamily: FONTS.ui, fontSize: 18, fontWeight: 700, color: isActive ? m.accent : COLORS.inkSoft, letterSpacing: 2}}>
              0{index + 1}
            </span>
            <span style={{fontFamily: FONTS.display, fontSize: 42, fontWeight: 700, color: isActive ? COLORS.ink : COLORS.inkSoft}}>{m.label}</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: isActive ? m.accent : COLORS.inkFaint,
                transform: `scale(${1 + pulse * 0.6})`,
              }}
            />
            <div style={{textAlign: 'right', lineHeight: 1}}>
              <div style={{fontFamily: FONTS.display, fontWeight: 700, fontSize: 44, fontVariantNumeric: 'tabular-nums', color: isActive ? COLORS.ink : 'rgba(9,38,52,0.25)'}}>
                {isActive ? (m.value * count).toFixed(m.decimals) : '–'}
                <span style={{fontSize: 22, marginLeft: 4, opacity: 0.8}}>{m.unit}</span>
              </div>
              <div style={{fontSize: 15, letterSpacing: 1.5, opacity: 0.6, marginTop: 6}}>{m.sub}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Small characteristic visualization of each biomarker (local coords inside VIZ).
const Viz: React.FC<{kind: Marker['key']; t: number; active: number; accent: string}> = ({kind, t, active, accent}) => {
  const midY = VIZ.h / 2;
  if (kind === 'tremor') {
    const smooth: string[] = [];
    const shaky: string[] = [];
    for (let x = 0; x <= VIZ.w; x += 3) {
      const env = Math.sin((Math.PI * x) / VIZ.w);
      const base = 62 * env * Math.sin((2 * Math.PI * x) / 170 - t * 4);
      const jitter = (2 + 9 * active) * Math.sin((2 * Math.PI * x) / 11 + t * 38) * (0.6 + 0.4 * noise2D('trem', x * 0.02, t * 2)) * env;
      smooth.push(`${x},${midY + base}`);
      shaky.push(`${x},${midY + base + jitter}`);
    }
    return (
      <>
        <polyline points={smooth.join(' ')} fill="none" stroke="rgba(9,38,52,0.3)" strokeWidth={2} strokeDasharray="5 7" opacity={active} />
        <polyline points={shaky.join(' ')} fill="none" stroke={active > 0.5 ? accent : COLORS.ink} strokeWidth={3} strokeLinejoin="round" />
      </>
    );
  }
  if (kind === 'pitch') {
    const dots = [];
    for (let x = 6; x <= VIZ.w; x += 14) {
      const y = midY - 62 * noise2D('pitch', x * 0.004 + t * 0.35, 0) - 10 * Math.sin(x * 0.03);
      dots.push(<circle key={x} cx={x} cy={y} r={3 + 2 * active} fill={active > 0.5 ? accent : COLORS.ink} opacity={0.5 + 0.5 * active} />);
    }
    const head = ((t * 260) % (VIZ.w + 100)) - 50;
    return (
      <>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={VIZ.w} y1={VIZ.h * f} y2={VIZ.h * f} stroke={COLORS.inkFaint} strokeWidth={1} />
        ))}
        {dots}
        <line x1={head} x2={head} y1={0} y2={VIZ.h} stroke={accent} strokeWidth={2} opacity={active * 0.7} />
      </>
    );
  }
  if (kind === 'rhythm') {
    const items = [];
    const speed = 70;
    const spacing = 58;
    const shift = (t * speed) % spacing;
    for (let i = -1; i < VIZ.w / spacing + 1; i++) {
      const n = i + Math.floor((t * speed) / spacing);
      const x = i * spacing - shift + 6 * noise2D('rx', n, 0) + 20;
      const h = 50 + 90 * Math.abs(noise2D('rh', n, 1));
      if (x < 0 || x > VIZ.w - 20) continue;
      items.push(<rect key={n} x={x} y={midY - h / 2} width={20} height={h} rx={10} fill={COLORS.ink} opacity={0.85} />);
      if (active > 0 && x + spacing < VIZ.w) {
        items.push(
          <path key={`b${n}`} d={`M ${x + 10} ${VIZ.h - 18} v 8 h ${spacing} v -8`} stroke={accent} strokeWidth={2} fill="none" opacity={active} />,
        );
      }
    }
    return <>{items}</>;
  }
  // pauses: waveform with explicit silent gaps, highlighted once active
  const bars = [];
  const gaps: {x0: number; x1: number}[] = [];
  const count = 58;
  const step = VIZ.w / count;
  const shift = (t * 4) % 1;
  let gapStart = -1;
  for (let i = 0; i < count; i++) {
    const n = i + Math.floor(t * 4 * 1) * 0;
    const tt = (n + shift) * 0.06 + t * 0.6;
    const silent = Math.sin(tt * 2.1) > 0.72 || Math.sin(tt * 1.3 + 2) > 0.85;
    const level = silent ? 0.03 : voiceLevel(tt, 'pauses');
    const x = i * step;
    if (silent && gapStart < 0) gapStart = x;
    if (!silent && gapStart >= 0) {
      gaps.push({x0: gapStart, x1: x});
      gapStart = -1;
    }
    const h = 4 + level * 150;
    bars.push(<rect key={i} x={x + 2} y={midY - h / 2} width={step - 5} height={h} rx={3} fill={COLORS.ink} opacity={0.85} />);
  }
  return (
    <>
      {gaps.map((g, i) => (
        <g key={i} opacity={active}>
          <rect x={g.x0 - 2} y={8} width={g.x1 - g.x0} height={VIZ.h - 16} rx={10} fill={accent} opacity={0.12} />
          <rect x={g.x0 - 2} y={8} width={g.x1 - g.x0} height={VIZ.h - 16} rx={10} fill="none" stroke={accent} strokeWidth={2} strokeDasharray="8 6" />
        </g>
      ))}
      {bars}
    </>
  );
};

// What remains of the analysis: one coral data point, which scene 4 turns into a trend.
const FinalDot: React.FC<{t: number}> = ({t}) => {
  const on = interpolate(t, [T.collapse + 0.45, scene.seconds - 0.1], [0, 1], clamp);
  if (on <= 0) return null;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <circle cx={HUB.x} cy={HUB.y} r={28 * on} fill={COLORS.coral} opacity={0.16 * on} />
      <circle cx={HUB.x} cy={HUB.y} r={14} fill={COLORS.coral} opacity={on} />
    </svg>
  );
};
