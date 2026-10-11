import React from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {StageTag} from '../../components/StageTag';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {useVoAmplitude} from '../../lib/useVoAmplitude';
import {voiceLevel} from '../../lib/voiceSignal';
import {getScene} from '../config';
import {KEY, TAG, keyPath} from '../shared/handoffs';

// Scene 11 — one patient, one year. The €480 tag becomes 52 voice bars (the year's weekly sessions).
// A receipt prints the costs and each one takes a few bars; the bars that remain turn coral: ≈80%
// contribution margin. Then the coral bars are forged into the key that opens the next scene's gate.

const scene = getScene('unit');
const vo = (word: string, n = 0) => scene.voAt + wordTime('unit', word, n);

const T = {
  spread: 0.15,
  calls: vo('sessions'),
  cloud: vo('cloud'),
  device: vo('device'),
  support: vo('support'),
  forty: vo('hundred', 1), // 2nd "hundred": "about a hundred" (the 1st is "four hundred and eighty")
  wave: vo('hundred', 1) + 0.3,
  eighty: vo('eighty', 1), // 2nd "eighty": "eighty percent"
  margin: vo('contribution'),
  exit: 11.4,
};

const N = 52;
const X0 = 140;
const X1 = 1380;
const STEP = (X1 - X0) / (N - 1);
const CY = 560;
// Each cost takes a few bars: 10 of 52 ≈ €100 of €480, leaving ≈80%.
const COSTS = [
  {idx: [8, 9, 10], at: T.calls, label: 'SESSIONS'},
  {idx: [21, 22], at: T.cloud, label: 'CLOUD & DATABASE'},
  {idx: [33, 34, 35], at: T.device, label: 'DEVICE · LENT'},
  {idx: [45, 46], at: T.support, label: 'SUPPORT'},
];
const COST_IDX = new Set(COSTS.flatMap((c) => c.idx));
const KEPT = N - COST_IDX.size;
const HEIGHTS = new Array(N).fill(0).map((_, i) => 70 + 160 * voiceLevel(i * 0.13 + 3, 'unit-year'));
const RECEIPT = {x: 1470, y: 150, w: 350, row: 52, first: 118};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const UnitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const voice = useVoAmplitude(scene);

  const spread = Easing.inOut(Easing.cubic)(interpolate(t, [T.spread, T.spread + 1.1], [0, 1], clamp));
  const tagFade = interpolate(t, [T.spread + 0.1, T.spread + 0.5], [1, 0], clamp);
  const close = Easing.inOut(Easing.cubic)(interpolate(t, [T.wave, T.wave + 0.6], [0, 1], clamp));
  const exit = Easing.inOut(Easing.cubic)(interpolate(t, [T.exit, scene.seconds - 1 / fps], [0, 1], clamp));
  const panelsOut = interpolate(exit, [0, 0.4], [0, 1], clamp);
  const forge = interpolate(exit, [0.25, 1], [0, 1], clamp);

  // Remaining (margin) bars, in order, for closing the gaps and forging the key.
  const kept = new Array(N).fill(0).map((_, i) => i).filter((i) => !COST_IDX.has(i));

  return (
    <AbsoluteFill>
      <BrandBackground />


      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {new Array(N).fill(0).map((_, i) => {
          // Start: packed inside the tag. Then spread out across the year.
          const startX = TAG.cx + (i - (N - 1) / 2) * 8;
          let x = startX + (X0 + i * STEP - startX) * spread;
          let h = 30 + (HEIGHTS[i] - 30) * spread;
          let color = interpolateColors(spread, [0, 1], [COLORS.coral, COLORS.ink]);
          let opacity = 1;
          let dy = 0;
          const cost = COSTS.find((c) => c.idx.includes(i));
          if (cost) {
            // Eaten by a cost: flashes grey, then flies into its receipt line (one after another).
            const j = cost.idx.indexOf(i) * 0.07;
            const k = interpolate(t, [cost.at + 0.15 + j, cost.at + 0.65 + j], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
            const target = {x: RECEIPT.x + RECEIPT.w - 40, y: RECEIPT.y + RECEIPT.first + COSTS.indexOf(cost) * RECEIPT.row};
            if (t > cost.at) color = 'rgba(9,38,52,0.25)';
            x = x + (target.x - x) * k;
            dy = (target.y - CY) * k - Math.sin(k * Math.PI) * 120;
            h = h * (1 - 0.85 * k);
            opacity = 1 - interpolate(k, [0.85, 1], [0, 1], clamp);
          } else {
            const rank = kept.indexOf(i);
            const closedX = X0 + rank * ((X1 - X0) / (N - 1));
            x = x + (closedX - x) * close;
            // Coral wave across the margin bars.
            const wave = interpolate(t, [T.wave + rank * 0.012, T.wave + 0.25 + rank * 0.012], [0, 1], clamp);
            color = interpolateColors(wave, [0, 1], [COLORS.ink, COLORS.coral]);
            // Forge: bars squeeze into the key's shaft.
            const shaftX = KEY.x + KEY.bow * 0.8 + (rank / (kept.length - 1)) * (KEY.len - KEY.bow * 0.8);
            x = x + (shaftX - x) * forge;
            h = h + (KEY.shaft - h) * forge;
            dy = (KEY.y - CY) * forge;
            h *= 1 + Math.sin((t * 6 + i) * 0.9) * 0.06 * (1 - forge) * spread;
          }
          if (opacity <= 0) return null;
          const w = 14 + (STEP + 2 - 14) * forge;
          return <rect key={i} x={x - w / 2} y={CY + dy - h / 2} width={w} height={h} rx={Math.min(7, w / 2)} fill={color} opacity={opacity} />;
        })}
        <Bracket t={t} fade={panelsOut} />
        <Key forge={forge} />
      </svg>

      {tagFade > 0 && <TagBack opacity={tagFade} />}
      <Header t={t} fade={panelsOut} />

      <Receipt t={t} fade={panelsOut} />
      <Margin t={t} voice={voice} fade={panelsOut} />

      <StageTag label="ESTIMATE · BEFORE FIXED COSTS" opacity={interpolate(t, [T.forty, T.forty + 0.5], [0, 1], clamp) * (1 - panelsOut)} />

      <VoiceOver scene={scene} />
      <Sfx name="shimmer" at={T.spread + 0.3} volume={0.25} />
      <Sfx name="blip-low" at={T.calls - 0.4} volume={0.2} />
      {COSTS.map((c) => (
        <Sfx key={c.label} name="blip" at={c.at + 0.6} volume={0.3} />
      ))}
      <Sfx name="hit" at={T.forty} volume={0.5} />
      <Sfx name="shimmer" at={T.wave} volume={0.35} />
      <Sfx name="impact" at={T.eighty} volume={0.45} />
      <Sfx name="hit" at={T.margin} volume={0.4} />
      <Sfx name="whoosh" at={T.exit} volume={0.4} />
      <Sfx name="coin" at={scene.seconds - 0.35} volume={0.45} />
    </AbsoluteFill>
  );
};

// The coral back of the price tag (exactly as scene 10 left it), fading as its bars spill out.
const TagBack: React.FC<{opacity: number}> = ({opacity}) => {
  const {w, h, chamfer, backScale} = TAG;
  const shape = `M ${chamfer} 0 H ${w - chamfer} L ${w} ${chamfer} V ${h - 22} Q ${w} ${h} ${w - 22} ${h} H 22 Q 0 ${h} 0 ${h - 22} V ${chamfer} Z`;
  const top = TAG.cy - (h * backScale) / 2;
  return (
    <div style={{position: 'absolute', left: TAG.cx - w / 2, top, width: w, height: h, transformOrigin: '50% 0%', transform: `scale(${backScale})`, opacity}}>
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <path d={shape} fill={COLORS.coral} stroke={COLORS.coral} strokeWidth={4} />
        <circle cx={w / 2} cy={34} r={13} fill={COLORS.paper} stroke={COLORS.card} strokeWidth={3} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 228, textAlign: 'center', fontFamily: FONTS.ui, fontWeight: 700, fontSize: 19, letterSpacing: 4, color: COLORS.card}}>/ YEAR · PER PATIENT</div>
    </div>
  );
};

// "€480" travels from the tag to the header; the year's label types in next to it.
const Header: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const k = Easing.inOut(Easing.cubic)(interpolate(t, [T.spread, T.spread + 1.0], [0, 1], clamp));
  const {w, h, backScale} = TAG;
  const fromX = TAG.cx;
  const fromY = TAG.cy - (h * backScale) / 2 + 154.5 * backScale;
  const toX = X0 + 200;
  const toY = 205;
  const x = fromX + (toX - fromX) * k;
  const y = fromY + (toY - fromY) * k;
  const size = 130 * backScale + (112 - 130 * backScale) * k;
  const color = interpolateColors(k, [0, 1], [COLORS.card, COLORS.ink]);
  const label = interpolate(t, [T.spread + 0.8, T.spread + 1.3], [0, 1], clamp);
  void w;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - fade}}>
      <div style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', fontFamily: FONTS.display, fontWeight: 800, fontSize: size, color, lineHeight: 1, whiteSpace: 'nowrap'}}>
        <span style={{color: interpolateColors(k, [0, 1], [COLORS.card, COLORS.coral])}}>€</span>480
      </div>
      <div style={{position: 'absolute', left: X0 + 430, top: 170, opacity: label, transform: `translateX(${(1 - label) * -30}px)`}}>
        <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 22, letterSpacing: 5, color: COLORS.ink}}>/ YEAR · ONE PATIENT</div>
        <div style={{fontFamily: FONTS.ui, fontSize: 20, color: COLORS.inkSoft, marginTop: 6}}>52 weekly sessions · each bar is one</div>
      </div>
    </div>
  );
};

// The receipt: prints line by line as each cost is named, with a jagged tear-off edge.
const Receipt: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const start = T.calls - 0.45;
  if (t < start) return null;
  const rows = COSTS.length;
  const totalAt = T.forty;
  const printed = (() => {
    let hgt = 92;
    for (const c of COSTS) hgt += interpolate(t, [c.at - 0.1, c.at + 0.15], [0, RECEIPT.row], clamp);
    hgt += interpolate(t, [totalAt - 0.2, totalAt + 0.1], [0, 96], clamp);
    return hgt;
  })();
  const slide = spring({frame: (t - start) * fps, fps, config: {damping: 15, stiffness: 160}});
  const full = 92 + rows * RECEIPT.row + 96;
  const teeth = new Array(18).fill(0).map((_, i) => `${(i / 17) * RECEIPT.w},${i % 2 ? 0 : 12}`).join(' ');
  const total = spring({frame: (t - totalAt) * fps, fps, config: {damping: 11, stiffness: 260, mass: 0.6}});
  return (
    <div style={{position: 'absolute', left: RECEIPT.x, top: RECEIPT.y + (1 - slide) * -300, width: RECEIPT.w, opacity: 1 - fade, transform: `translateX(${fade * 200}px)`}}>
      <div style={{position: 'relative', height: printed, overflow: 'hidden', background: COLORS.card, borderLeft: `2px solid ${COLORS.inkFaint}`, borderRight: `2px solid ${COLORS.inkFaint}`, boxShadow: '0 20px 40px rgba(9,38,52,0.12)'}}>
        <div style={{padding: '22px 26px 0', fontFamily: FONTS.ui}}>
          <div style={{fontWeight: 800, fontSize: 18, letterSpacing: 5, color: COLORS.ink}}>RECEIPT</div>
          <div style={{fontSize: 14, letterSpacing: 2, color: COLORS.inkSoft, marginTop: 4}}>ONE PATIENT · ONE YEAR · COSTS</div>
          <div style={{borderTop: `2px dashed ${COLORS.inkFaint}`, marginTop: 16}} />
          {COSTS.map((c) => (
            <div key={c.label} style={{height: RECEIPT.row, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 20, fontWeight: 600, color: COLORS.ink}}>
              <span>{c.label}</span>
              <span style={{display: 'flex', gap: 5}}>
                {c.idx.map((bar, j) => (
                  <span key={bar} style={{width: 10, height: 30, borderRadius: 5, background: 'rgba(9,38,52,0.25)', opacity: interpolate(t, [c.at + 0.55 + j * 0.07, c.at + 0.7 + j * 0.07], [0, 1], clamp)}} />
                ))}
              </span>
            </div>
          ))}
          <div style={{borderTop: `2px dashed ${COLORS.inkFaint}`, marginTop: 6}} />
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14}}>
            <span style={{fontWeight: 800, fontSize: 18, letterSpacing: 4, color: COLORS.ink}}>TOTAL</span>
            <span style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 50, color: COLORS.coral, transform: `scale(${1.5 - 0.5 * total})`, transformOrigin: 'right center', opacity: total}}>≈€100</span>
          </div>
        </div>
      </div>
      {printed >= full - 1 && (
        <svg width={RECEIPT.w} height={14} style={{display: 'block'}}>
          <polygon points={`0,0 ${teeth} ${RECEIPT.w},0`} fill={COLORS.card} />
        </svg>
      )}
    </div>
  );
};

// Bracket under the margin bars.
const Bracket: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const d = interpolate(t, [T.eighty - 0.2, T.eighty + 0.4], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  if (d <= 0) return null;
  const x1 = X0 - 10;
  const x2 = X0 + (KEPT - 1) * ((X1 - X0) / (N - 1)) + 10;
  const y = CY + 150;
  return (
    <g opacity={1 - fade}>
      <path d={`M ${x1} ${y - 14} V ${y} H ${x2} V ${y - 14}`} fill="none" stroke={COLORS.coral} strokeWidth={3} pathLength={1} strokeDasharray={`${d} 1`} />
      <text x={(x1 + x2) / 2} y={y + 34} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={700} fontSize={18} letterSpacing={4} fill={COLORS.coral} opacity={d}>
        KEPT PER PATIENT · ≈€380 / YEAR
      </text>
    </g>
  );
};

// "≈80%" with a voice-reactive pulse and the "contribution margin" label.
const Margin: React.FC<{t: number; voice: number; fade: number}> = ({t, voice, fade}) => {
  const {fps} = useVideoConfig();
  if (t < T.eighty - 0.45) return null;
  const s = spring({frame: (t - T.eighty + 0.45) * fps, fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
  const n = interpolate(t, [T.eighty - 0.4, T.eighty + 0.45], [0, 80], {...clamp, easing: Easing.out(Easing.cubic)});
  const lab = spring({frame: (t - T.margin) * fps, fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
  return (
    <div style={{position: 'absolute', left: X0, top: 760, opacity: 1 - fade, display: 'flex', alignItems: 'flex-end', gap: 34}}>
      <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 210, lineHeight: 0.9, color: COLORS.coral, opacity: s, transform: `scale(${(1.3 - 0.3 * s) * (1 + voice * 0.05)})`, transformOrigin: 'left bottom', fontVariantNumeric: 'tabular-nums'}}>
        ≈{Math.round(n)}%
      </div>
      <div style={{paddingBottom: 18, opacity: lab, transform: `translateX(${(1 - lab) * -40}px)`}}>
        <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 52, color: COLORS.ink, lineHeight: 1}}>CONTRIBUTION</div>
        <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 52, color: COLORS.ink, lineHeight: 1}}>MARGIN</div>
        <div style={{fontFamily: FONTS.ui, fontSize: 20, color: COLORS.inkSoft, marginTop: 8}}>per patient · before fixed costs</div>
      </div>
    </div>
  );
};

// The forged key (appears as the bars fuse into its shaft).
const Key: React.FC<{forge: number}> = ({forge}) => {
  const bow = interpolate(forge, [0.45, 1], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.8))});
  if (forge <= 0.5) return null;
  const solid = interpolate(forge, [0.6, 1], [0, 1], clamp);
  return (
    <g transform={`translate(${KEY.x} ${KEY.y})`}>
      <path d={keyPath(KEY.len, KEY.bow * bow, KEY.shaft)} fill={COLORS.coral} opacity={solid} />
      <circle r={KEY.bow * 0.42 * bow} fill={COLORS.paper} opacity={solid} />
    </g>
  );
};
