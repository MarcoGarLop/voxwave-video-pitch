import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {StageTag} from '../../components/StageTag';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';
import {MARKET_DOT, TAG} from '../shared/handoffs';

// Scene 10 — who pays and the price. The coral point lands like a coin and turns the lights on.
// Our two kinds of customer build themselves floor by floor: a private clinic (B2B) and a public hospital
// (B2G; the coin becomes its roof sign). A signpost is driven into the ground next to them and its board
// unrolls the price; a second, coral board adds €0 for the patient, device included. The price board then
// flips to its coral back (€480 / year) for scene 11.

const scene = getScene('pay');
const vo = (word: string, n = 0) => scene.voAt + wordTime('pay', word, n);

const T = {
  land: 0.45,
  who: 0.55,
  whoOut: vo('private') - 0.2,
  build: vo('private'),
  build2: vo('public'),
  roof: vo('providers') + 0.1,
  post: vo('forty') - 0.6,
  board: vo('forty') - 0.1,
  paid: vo('per'),
  free: vo('free') - 0.1,
  device: vo('device'),
  flip: scene.seconds - 0.9,
};

// Layout on the paper.
const GROUND = 800;
const FLOOR = 100;
// Private clinic (B2B) and public hospital (B2G, carries the coin as its roof sign).
const CLINIC = {cx: 365, w: 300, floors: 3, windows: 2, at: () => T.build, name: 'PRIVATE CLINICS', badge: 'B2B', sub: 'Neuro-rehab clinics', mast: false};
const HOSP = {cx: 800, w: 440, floors: 4, windows: 3, at: () => T.build2, name: 'PUBLIC HEALTH', badge: 'B2G', sub: 'Public hospitals & providers', mast: true};
type Building = typeof CLINIC;
const H_TOP = GROUND - FLOOR * HOSP.floors;
const SIGN = {x: HOSP.cx, y: H_TOP - 62, r: 40};
const POST = {x: 1390, top: 300};
const B1 = {x: 1060, y: 330, w: 600, h: 230}; // price board (arrow points left, to the hospital)
const B2 = {x: 1180, y: 590, w: 560, h: 150}; // patient board (coral, arrow points right)

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const PayScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Coin: the point grows, flips showing "€", lands with a clink and floods the paper. It then hovers
  // over the building site and drops onto the roof as the hospital's sign.
  const coinGrow = interpolate(t, [0, T.land], [MARKET_DOT.r, 56], {...clamp, easing: Easing.out(Easing.cubic)});
  const flipK = interpolate(t, [0, T.land], [0, 2], clamp);
  const coinScaleX = t < T.land ? Math.max(0.08, Math.abs(Math.cos(flipK * Math.PI))) : 1;
  const paperR = interpolate(t, [T.land, T.land + 0.55], [0, 1300], {...clamp, easing: Easing.out(Easing.cubic)});
  const hover = Easing.inOut(Easing.cubic)(interpolate(t, [T.land + 0.1, T.land + 0.6], [0, 1], clamp));
  const drop = interpolate(t, [T.roof - 0.25, T.roof], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const coin = {
    x: lerp(960, SIGN.x, hover),
    y: lerp(lerp(540, 170, hover), SIGN.y, drop) + Math.sin(t * 3) * 6 * hover * (1 - drop),
    r: lerp(coinGrow, SIGN.r, hover),
  };

  // Camera shake when the signpost hits the ground.
  const hit = T.post + 0.32;
  const shake = t > hit ? Math.sin((t - hit) * 60) * 9 * Math.exp(-(t - hit) * 7) : 0;

  // Exit: everything except the price board slides away; the board flips to the coral €480 tag.
  const flip = Easing.inOut(Easing.cubic)(interpolate(t, [T.flip, scene.seconds - 1 / fps], [0, 1], clamp));
  const away = interpolate(flip, [0, 0.5], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <BrandBackground tone="ink" />
      <AbsoluteFill style={{clipPath: `circle(${paperR}px at 960px 540px)`}}>
        <BrandBackground />
      </AbsoluteFill>

      <AbsoluteFill style={{transform: `translateY(${shake}px)`}}>
        <WhoPays t={t} />
        <div style={{position: 'absolute', inset: 0, opacity: 1 - away, transform: `translateX(${-away * 200}px)`}}>
          <Building t={t} b={CLINIC} />
          <Building t={t} b={HOSP} />
          <Coin x={coin.x} y={coin.y} r={coin.r} scaleX={coinScaleX} t={t} />
        </div>
        <div style={{position: 'absolute', inset: 0, opacity: 1 - away}}>
          <Ground t={t} />
          <Post t={t} />
          <PatientBoard t={t} />
        </div>
        <PriceBoard t={t} flip={flip} />
      </AbsoluteFill>

      <StageTag label="PRICING HYPOTHESIS" opacity={interpolate(t, [T.board, T.board + 0.5], [0, 1], clamp) * (1 - away)} />

      <VoiceOver scene={scene} />
      <Sfx name="coin" at={T.land - 0.02} volume={0.6} />
      <Sfx name="impact" at={T.who} volume={0.35} />
      {[0, 1, 2, 3].map((i) => (
        <Sfx key={i} name="blip-low" at={T.build + 0.12 + i * 0.17} volume={0.3} />
      ))}
      <Sfx name="hit" at={T.roof} volume={0.45} />
      <Sfx name="shimmer" at={T.roof + 0.2} volume={0.2} />
      <Sfx name="whoosh" at={T.post} volume={0.35} />
      <Sfx name="impact" at={hit - 0.02} volume={0.65} />
      <Sfx name="coin" at={T.board + 0.75} volume={0.35} />
      <Sfx name="hit" at={T.free + 0.25} volume={0.55} />
      <Sfx name="blip" at={T.device} volume={0.35} />
      <Sfx name="whoosh" at={T.flip} volume={0.4} />
    </AbsoluteFill>
  );
};

// The coin; once it lands on the roof it shows the hospital's cross.
const Coin: React.FC<{x: number; y: number; r: number; scaleX: number; t: number}> = ({x, y, r, scaleX, t}) => {
  const euro = interpolate(t, [0.05, 0.25], [0, 1], clamp) * (1 - interpolate(t, [T.roof - 0.3, T.roof], [0, 1], clamp));
  const cross = interpolate(t, [T.roof - 0.1, T.roof + 0.1], [0, 1], clamp);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <g transform={`translate(${x} ${y}) scale(${scaleX} 1)`}>
        <circle r={r} fill={COLORS.coral} />
        <circle r={r * 0.8} fill="none" stroke={COLORS.card} strokeWidth={Math.max(1.5, r * 0.06)} opacity={0.5 * euro} />
        <text y={r * 0.36} textAnchor="middle" fontFamily={FONTS.display} fontWeight={800} fontSize={r * 1.05} fill={COLORS.card} opacity={euro}>
          €
        </text>
        <path d={`M 0 ${-r * 0.5} V ${r * 0.5} M ${-r * 0.5} 0 H ${r * 0.5}`} stroke={COLORS.card} strokeWidth={r * 0.22} strokeLinecap="round" opacity={cross} />
      </g>
    </svg>
  );
};

// "WHO PAYS?" slams in letter by letter and blows away upwards.
const WhoPays: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const text = 'WHO PAYS?';
  if (t < T.who || t > T.whoOut + 0.5) return null;
  const out = interpolate(t, [T.whoOut, T.whoOut + 0.4], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 400, textAlign: 'center', fontFamily: FONTS.display, fontWeight: 800, fontSize: 200, color: COLORS.ink, letterSpacing: -4, whiteSpace: 'pre'}}>
      {text.split('').map((ch, i) => {
        const s = spring({frame: (t - T.who - i * 0.03) * fps, fps, config: {damping: 11, stiffness: 300, mass: 0.6}});
        const o = interpolate(out, [i * 0.05, Math.min(1, 0.5 + i * 0.05)], [0, 1], clamp);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: s * (1 - o),
              color: ch === '?' ? COLORS.coral : COLORS.ink,
              transform: `translateY(${(1 - s) * 60 - o * 260}px) scale(${1.5 - 0.5 * s}) rotate(${o * (i % 2 ? 14 : -14)}deg)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

const Ground: React.FC<{t: number}> = ({t}) => {
  const k = interpolate(t, [T.build - 0.15, T.build + 0.35], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  if (k <= 0) return null;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <line x1={960 - 820 * k} x2={960 + 820 * k} y1={GROUND} y2={GROUND} stroke={COLORS.ink} strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
};

// A building: floors drop in and stack, windows flicker on; the public hospital gets the roof mast for the
// coin. Its label names the customer and the model (B2B / B2G).
const Building: React.FC<{t: number; b: Building}> = ({t, b}) => {
  const {fps} = useVideoConfig();
  const left = b.cx - b.w / 2;
  const top = GROUND - FLOOR * b.floors;
  const label = spring({frame: (t - b.at() - 0.55) * fps, fps, config: {damping: 14, stiffness: 200}});
  const mast = interpolate(t, [T.roof - 0.35, T.roof - 0.1], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const slot = (b.w - 60) / b.windows;
  const winW = Math.min(90, slot - 24);
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {new Array(b.floors).fill(0).map((_, i) => {
          const at = b.at() + 0.1 + i * 0.15;
          const s = spring({frame: (t - at) * fps, fps, config: {damping: 12, stiffness: 220, mass: 0.7}});
          if (s <= 0.001) return null;
          const y = GROUND - (i + 1) * FLOOR - (1 - s) * 700;
          const isTop = i === b.floors - 1;
          return (
            <g key={i} opacity={Math.min(1, s * 2)}>
              <rect x={left} y={y} width={b.w} height={FLOOR} fill={COLORS.card} stroke={COLORS.ink} strokeWidth={4} />
              {isTop && <rect x={left - 14} y={y - 14} width={b.w + 28} height={14} fill={COLORS.ink} />}
              {i === 0 ? (
                <>
                  <path d={`M ${b.cx - 44} ${y + FLOOR} V ${y + 24} H ${b.cx + 44} V ${y + FLOOR}`} fill="none" stroke={COLORS.ink} strokeWidth={4} />
                  <line x1={b.cx} x2={b.cx} y1={y + 24} y2={y + FLOOR} stroke={COLORS.ink} strokeWidth={3} />
                  {[left + 22, left + b.w - 22 - winW].map((wx) => (
                    <Window key={wx} x={wx} y={y + 26} w={winW} t={t} seed={`${b.name}${i}-${wx}`} />
                  ))}
                </>
              ) : (
                new Array(b.windows).fill(0).map((__, k) => (
                  <Window key={k} x={left + 30 + k * slot + (slot - winW) / 2} y={y + 26} w={winW} t={t} seed={`${b.name}${i}-${k}`} />
                ))
              )}
            </g>
          );
        })}
        {/* Mast for the roof sign (the coin lands on it) */}
        {b.mast && <line x1={SIGN.x} x2={SIGN.x} y1={top - 14} y2={top - 14 - (top - 14 - (SIGN.y + SIGN.r)) * mast} stroke={COLORS.ink} strokeWidth={6} />}
      </svg>
      <div style={{position: 'absolute', left: left - 80, width: b.w + 160, top: GROUND + 26, textAlign: 'center', opacity: label, transform: `translateY(${(1 - label) * 20}px)`}}>
        <div style={{display: 'inline-flex', alignItems: 'center', gap: 12}}>
          <span style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 32, color: COLORS.ink, whiteSpace: 'nowrap'}}>{b.name}</span>
          <span style={{fontFamily: FONTS.ui, fontWeight: 800, fontSize: 16, letterSpacing: 2, color: COLORS.card, background: COLORS.coral, borderRadius: 8, padding: '4px 9px'}}>{b.badge}</span>
        </div>
        <div style={{fontFamily: FONTS.ui, fontSize: 19, color: COLORS.inkSoft, marginTop: 2}}>{b.sub}</div>
      </div>
    </>
  );
};

// A window that flickers on once its building is up.
const Window: React.FC<{x: number; y: number; w: number; t: number; seed: string}> = ({x, y, w, t, seed}) => {
  const at = T.roof + 0.15 + random(seed) * 0.6;
  const on = t > at && !(t < at + 0.12 && Math.floor(t * 30) % 2 === 0);
  return <rect x={x} y={y} width={w} height={52} rx={4} fill={on ? (random(`${seed}c`) > 0.55 ? 'rgba(255,110,66,0.85)' : 'rgba(255,110,66,0.25)') : 'transparent'} stroke={COLORS.ink} strokeWidth={3} />;
};

// The signpost: drops from the sky and is driven into the ground with a puff of dust.
const Post: React.FC<{t: number}> = ({t}) => {
  const fall = interpolate(t, [T.post, T.post + 0.32], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  if (fall <= 0) return null;
  const sink = t > T.post + 0.32 ? Math.min(1, (t - T.post - 0.32) / 0.08) * 18 : 0;
  const y0 = lerp(-700, POST.top, fall) + sink;
  const dust = interpolate(t, [T.post + 0.32, T.post + 0.9], [0, 1], clamp);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <rect x={POST.x - 9} y={y0} width={18} height={GROUND - POST.top + 30} fill={COLORS.ink} rx={3} />
      <circle cx={POST.x} cy={y0 - 4} r={12} fill={COLORS.coral} />
      {dust > 0 && dust < 1 &&
        [-1, 1].flatMap((side) =>
          [0, 1, 2].map((k) => (
            <circle
              key={`${side}${k}`}
              cx={POST.x + side * (26 + dust * (70 + k * 40))}
              cy={GROUND - 10 - dust * (14 + k * 16)}
              r={(10 + k * 4) * (1 - dust * 0.6)}
              fill="none"
              stroke={COLORS.ink}
              strokeWidth={2.5}
              opacity={(1 - dust) * 0.7}
            />
          )),
        )}
      {dust > 0 && dust < 1 && <line x1={POST.x - 60 - 120 * dust} x2={POST.x + 60 + 120 * dust} y1={GROUND + 6} y2={GROUND + 6} stroke={COLORS.ink} strokeWidth={2} opacity={1 - dust} strokeDasharray="6 10" />}
    </svg>
  );
};

// Arrow-shaped sign board outline. dir: which way the arrow points.
const boardPath = (w: number, h: number, dir: 'left' | 'right') => {
  const tip = 46;
  return dir === 'left'
    ? `M 0 ${h / 2} L ${tip} 0 H ${w - 14} Q ${w} 0 ${w} 14 V ${h - 14} Q ${w} ${h} ${w - 14} ${h} H ${tip} Z`
    : `M ${w} ${h / 2} L ${w - tip} ${h} H 14 Q 0 ${h} 0 ${h - 14} V 14 Q 0 0 14 0 H ${w - tip} Z`;
};
const tagPath = (w: number, h: number, c: number) =>
  `M ${c} 0 H ${w - c} L ${w} ${c} V ${h - 22} Q ${w} ${h} ${w - 22} ${h} H 22 Q 0 ${h} 0 ${h - 22} V ${c} Z`;

// The price board: unrolls from the post with a slot-machine €40; on exit it flips to the coral tag.
const PriceBoard: React.FC<{t: number; flip: number}> = ({t, flip}) => {
  const {fps} = useVideoConfig();
  const open = spring({frame: (t - T.board) * fps, fps, config: {damping: 13, stiffness: 170}});
  if (open <= 0.001) return null;
  const paid = spring({frame: (t - T.paid) * fps, fps, config: {damping: 14, stiffness: 200}});
  // Geometry morphs from the board to the tag while it flies to the center.
  const w = lerp(B1.w, TAG.w, flip);
  const h = lerp(B1.h, TAG.h, flip);
  const scale = lerp(1, TAG.backScale, flip);
  const top = {x: lerp(B1.x + B1.w / 2, TAG.cx, flip), y: lerp(B1.y, TAG.cy - (TAG.h * TAG.backScale) / 2, flip)};
  const back = flip >= 0.5;
  return (
    <div
      style={{
        position: 'absolute',
        left: top.x - w / 2,
        top: top.y,
        width: w,
        height: h,
        transformOrigin: flip > 0 ? '50% 0%' : `${POST.x - B1.x}px 50%`,
        transform: `perspective(1400px) scale(${flip > 0 ? scale : 1}) rotateY(${flip * 180}deg) scaleX(${flip > 0 ? 1 : open})`,
      }}
    >
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible', transform: back ? 'scaleX(-1)' : undefined}}>
        {back ? (
          <>
            <path d={tagPath(w, h, TAG.chamfer)} fill={COLORS.coral} stroke={COLORS.coral} strokeWidth={4} />
            <circle cx={w / 2} cy={34} r={13} fill={COLORS.paper} stroke={COLORS.card} strokeWidth={3} />
          </>
        ) : (
          <>
            <path d={boardPath(w, h, 'left')} fill={COLORS.card} stroke={COLORS.ink} strokeWidth={5} />
            <circle cx={POST.x - B1.x} cy={15} r={6} fill={COLORS.ink} />
            <circle cx={POST.x - B1.x} cy={h - 15} r={6} fill={COLORS.ink} />
          </>
        )}
      </svg>
      {!back ? (
        <div style={{position: 'absolute', inset: 0, paddingLeft: 70, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
          <div style={{display: 'flex', alignItems: 'flex-start', fontFamily: FONTS.display, fontWeight: 800, color: COLORS.ink, lineHeight: 1}}>
            <span style={{fontSize: 70, marginTop: 12, color: COLORS.coral}}>€</span>
            <Odometer value="40" t={t} start={T.board + 0.25} size={128} />
            <span style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 21, letterSpacing: 3, color: COLORS.inkSoft, marginTop: 30, marginLeft: 16, lineHeight: 1.4}}>
              / MONTH
              <br />
              PER PATIENT
            </span>
          </div>
          <div style={{fontFamily: FONTS.ui, fontWeight: 800, fontSize: 18, letterSpacing: 3.5, color: COLORS.coral, marginTop: 12, opacity: paid, transform: `translateX(${(1 - paid) * -20}px)`}}>
            ← PAID BY CLINICS &amp; PUBLIC HEALTH
          </div>
        </div>
      ) : (
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 40, transform: 'scaleX(-1)'}}>
          <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 130, color: COLORS.card, lineHeight: 1}}>€480</div>
          <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 19, letterSpacing: 4, color: COLORS.card, marginTop: 8}}>/ YEAR · PER PATIENT</div>
        </div>
      )}
    </div>
  );
};

// Second board: €0 for the patient, device included. Drops down the post and clamps on.
const PatientBoard: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - T.free) * fps, fps, config: {damping: 10, stiffness: 200, mass: 0.8}});
  if (s <= 0.001) return null;
  const dev = spring({frame: (t - T.device) * fps, fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
  return (
    <div style={{position: 'absolute', left: B2.x, top: B2.y - (1 - s) * 380, width: B2.w, height: B2.h, transform: `rotate(${(1 - s) * -6}deg)`, transformOrigin: `${POST.x - B2.x}px 0px`}}>
      <svg width={B2.w} height={B2.h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <path d={boardPath(B2.w, B2.h, 'right')} fill={COLORS.coral} stroke={COLORS.coral} strokeWidth={5} />
        <circle cx={POST.x - B2.x} cy={13} r={6} fill={COLORS.ink} />
        <circle cx={POST.x - B2.x} cy={B2.h - 13} r={6} fill={COLORS.ink} />
      </svg>
      <div style={{position: 'absolute', inset: 0, paddingLeft: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center', color: COLORS.card}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 14}}>
          <span style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 70, lineHeight: 1}}>€0</span>
          <span style={{fontFamily: FONTS.ui, fontWeight: 800, fontSize: 22, letterSpacing: 3}}>FOR THE PATIENT</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, opacity: dev, transform: `translateY(${(1 - dev) * 14}px)`}}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={COLORS.card} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5 L10 18 L20 6" />
          </svg>
          <span style={{fontFamily: FONTS.ui, fontWeight: 800, fontSize: 20, letterSpacing: 3}}>DEVICE INCLUDED</span>
        </div>
      </div>
    </div>
  );
};

// Slot-machine digits: each column spins through a few cycles and lands on its digit.
const Odometer: React.FC<{value: string; t: number; start: number; size: number}> = ({value, t, start, size}) => {
  const lineH = size;
  return (
    <span style={{display: 'inline-flex', height: lineH, overflow: 'hidden', fontVariantNumeric: 'tabular-nums'}}>
      {value.split('').map((ch, i) => {
        const d = Number(ch);
        const cycles = 2 + i;
        const k = Easing.out(Easing.cubic)(interpolate(t, [start + i * 0.08, start + 0.7 + i * 0.12], [0, 1], clamp));
        const pos = (cycles * 10 + d) * k;
        const digits = new Array(cycles * 10 + 10).fill(0).map((_, j) => j % 10);
        return (
          <span key={i} style={{display: 'inline-block', transform: `translateY(${-pos * lineH}px)`}}>
            {digits.map((n, j) => (
              <span key={j} style={{display: 'block', height: lineH, fontSize: size, lineHeight: `${lineH}px`}}>
                {n}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
};
