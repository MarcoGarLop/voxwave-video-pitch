import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {StageTag} from '../../components/StageTag';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';
import {TAG} from '../shared/handoffs';

const scene = getScene('value');
const vo = (word: string, n = 0) => scene.voAt + wordTime('value', word, n);

// Scene 10b — why pay? The coral €480 tag left by the price scene falls onto the left pan of a line-art
// balance and turns into a weight. On the other pan the reasons stack up as weights, one on top of the
// other, as they are named: neurologist time, better triage (the right patient seen first) and one avoided
// hospital stay (≈€4,400, the mean cost of a Parkinson's admission in Spain's national data), which tips
// the balance: it covers nine patients for a year (4,378 / 480 ≈ 9). The weight then turns back into the
// tag and returns to the centre, exactly where the unit-economics scene starts.
const T = {
  draw: 0.1,
  why: vo('why') - 0.1,
  tagGo: 0.35,
  land: 1.15,
  time: vo('save') - 0.2,
  triage: vo('need') - 0.2,
  stay: vo('avoided') - 0.15,
  result: vo('covers') - 0.1,
  nine: vo('nine'),
  exit: scene.seconds - 0.85,
};

const PIVOT = {x: 960, y: 320};
const BEAM = 400;
const HANG = 340;
const PAN_W = 320;
const BASE_Y = 900;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

type Icon = 'clock' | 'triage' | 'bed';
type Weight = {at: number; w: number; h: number; label: string; caption: string; icon: Icon; heavy?: boolean; kick: number};
// Bottom to top, in the order they are named. `kick` is how far each one turns the beam (degrees).
const WEIGHTS: Weight[] = [
  {at: T.time, w: 230, h: 96, label: 'TIME', caption: 'Neurologist time', icon: 'clock', kick: 5},
  {at: T.triage, w: 250, h: 104, label: 'TRIAGE', caption: 'The right patient, seen first', icon: 'triage', kick: 7},
  {at: T.stay, w: 280, h: 128, label: '€4,400', caption: '1 avoided hospital stay', icon: 'bed', heavy: true, kick: 9},
];
const LEFT = {w: 240, h: 132};

// Damped response to a step at `at` (0 -> 1 with a little overshoot), for the beam's swing.
const step = (t: number, at: number) => (t < at ? 0 : 1 - Math.exp(-4.5 * (t - at)) * Math.cos(8 * (t - at)));

const tagPath = (w: number, h: number, c: number) => `M ${c} 0 H ${w - c} L ${w} ${c} V ${h - 22} Q ${w} ${h} ${w - 22} ${h} H 22 Q 0 ${h} 0 ${h - 22} V ${c} Z`;

// Classic iron weight: tapered body with rounded corners and a loop handle on top (local px, origin top-left).
const weightPath = (w: number, h: number) => {
  const bodyTop = h * 0.3;
  const inset = w * 0.12;
  const r = 12;
  return `M ${inset + r} ${bodyTop} H ${w - inset - r} Q ${w - inset} ${bodyTop} ${w - inset + 2} ${bodyTop + r}
    L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} L ${inset - 2} ${bodyTop + r} Q ${inset} ${bodyTop} ${inset + r} ${bodyTop} Z`;
};
const handlePath = (w: number, h: number) => {
  const bodyTop = h * 0.3;
  return `M ${w * 0.36} ${bodyTop} V ${bodyTop * 0.45} Q ${w * 0.36} 4 ${w * 0.5} 4 Q ${w * 0.64} 4 ${w * 0.64} ${bodyTop * 0.45} V ${bodyTop}`;
};

export const ValueScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Beam angle (degrees, positive = right pan down): the €480 tips it left, each reason turns it back.
  const angle = -11 * step(t, T.land) + WEIGHTS.reduce((sum, w) => sum + w.kick * step(t, w.at + 0.3), 0);
  const rad = (angle * Math.PI) / 180;
  const ends = {
    l: {x: PIVOT.x - BEAM * Math.cos(rad), y: PIVOT.y - BEAM * Math.sin(rad)},
    r: {x: PIVOT.x + BEAM * Math.cos(rad), y: PIVOT.y + BEAM * Math.sin(rad)},
  };
  const panL = {x: ends.l.x, y: ends.l.y + HANG};
  const panR = {x: ends.r.x, y: ends.r.y + HANG};

  const draw = interpolate(t, [T.draw, T.draw + 0.8], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const exit = Easing.inOut(Easing.cubic)(interpolate(t, [T.exit, scene.seconds - 1 / fps], [0, 1], clamp));
  const away = interpolate(exit, [0, 0.6], [0, 1], clamp);

  // The price: tag (centre pose, as the price scene leaves it) -> weight on the left pan -> tag again.
  const go = Easing.inOut(Easing.cubic)(interpolate(t, [T.tagGo, T.land], [0, 1], clamp));
  const k = go * (1 - exit);
  const asWeight = interpolate(t, [T.land - 0.16, T.land - 0.04], [0, 1], clamp) * (1 - interpolate(exit, [0, 0.3], [0, 1], clamp));
  const centre = {x: TAG.cx, bottom: TAG.cy + (TAG.h * TAG.backScale) / 2};
  const x = lerp(centre.x, panL.x, k);
  const bottom = lerp(centre.bottom, panL.y - 4, k) - Math.sin(go * Math.PI) * 110 * (1 - exit);
  const tagScale = lerp(TAG.backScale, LEFT.h / TAG.h, k);
  // A little squash as it lands.
  const squash = 1 - 0.12 * Math.sin(interpolate(t, [T.land, T.land + 0.3], [0, Math.PI], clamp));

  return (
    <AbsoluteFill>
      <BrandBackground />

      <div style={{position: 'absolute', inset: 0, opacity: 1 - away}}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <Balance draw={draw} ends={ends} panL={panL} panR={panR} />
        </svg>
        {WEIGHTS.map((w, i) => (
          <StackedWeight key={w.label} t={t} weight={w} pan={panR} below={WEIGHTS.slice(0, i).reduce((s, b) => s + b.h, 0)} />
        ))}
        <Why t={t} />
        <Result t={t} />
      </div>

      {/* The price: the tag, which becomes the €480 weight while on the pan */}
      {asWeight < 1 && (
        <div
          style={{
            position: 'absolute',
            left: x - TAG.w / 2,
            top: bottom - TAG.h * tagScale,
            width: TAG.w,
            height: TAG.h,
            transformOrigin: '50% 0%',
            transform: `scale(${tagScale})`,
            opacity: 1 - asWeight,
          }}
        >
          <svg width={TAG.w} height={TAG.h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            <path d={tagPath(TAG.w, TAG.h, TAG.chamfer)} fill={COLORS.coral} stroke={COLORS.coral} strokeWidth={4} />
            <circle cx={TAG.w / 2} cy={34} r={13} fill={COLORS.paper} stroke={COLORS.card} strokeWidth={3} />
          </svg>
          <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 40}}>
            <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 130, color: COLORS.card, lineHeight: 1}}>€480</div>
            <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 19, letterSpacing: 4, color: COLORS.card, marginTop: 8}}>/ YEAR · PER PATIENT</div>
          </div>
        </div>
      )}
      {asWeight > 0 && (
        <WeightShape
          x={x}
          bottom={bottom}
          w={LEFT.w}
          h={LEFT.h}
          heavy
          opacity={asWeight}
          squash={squash}
          content={
            <>
              <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 46, lineHeight: 1}}>€480</div>
              <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 13, letterSpacing: 2.5, marginTop: 4}}>PER PATIENT / YEAR</div>
            </>
          }
        />
      )}

      <StageTag
        label="ESTIMATE · ≈€4,400 = MEAN COST OF A PARKINSON'S ADMISSION (SPAIN, NATIONAL DATA) · TO VALIDATE IN PILOTS"
        opacity={interpolate(t, [T.stay, T.stay + 0.4], [0, 1], clamp) * (1 - away)}
      />

      <VoiceOver scene={scene} />
      <Sfx name="hit" at={T.land - 0.03} volume={0.45} />
      <Sfx name="blip-low" at={T.time + 0.3} volume={0.4} />
      <Sfx name="blip-low" at={T.triage + 0.3} volume={0.4} />
      <Sfx name="impact" at={T.stay + 0.28} volume={0.5} />
      <Sfx name="coin" at={T.nine} volume={0.35} />
      <Sfx name="whoosh" at={T.exit} volume={0.35} />
    </AbsoluteFill>
  );
};

type P = {x: number; y: number};

// Line-art balance: stand, pivot, beam, strings and two shallow pans; drawn on at the start.
const Balance: React.FC<{draw: number; ends: {l: P; r: P}; panL: P; panR: P}> = ({draw, ends, panL, panR}) => {
  if (draw <= 0.001) return null;
  const dash = {pathLength: 1, strokeDasharray: `${draw} 1`};
  const pan = (p: P) => `M ${p.x - PAN_W / 2} ${p.y - 6} Q ${p.x} ${p.y + 44} ${p.x + PAN_W / 2} ${p.y - 6} Z`;
  const strings = (end: P, p: P) => `M ${end.x} ${end.y} L ${p.x - PAN_W / 2 + 18} ${p.y - 6} M ${end.x} ${end.y} L ${p.x + PAN_W / 2 - 18} ${p.y - 6}`;
  return (
    <g fill="none" stroke={COLORS.ink} strokeLinecap="round" strokeLinejoin="round">
      {/* Stand */}
      <path d={`M ${PIVOT.x} ${PIVOT.y} V ${BASE_Y}`} strokeWidth={6} {...dash} />
      <path d={`M ${PIVOT.x - 130} ${BASE_Y} H ${PIVOT.x + 130}`} strokeWidth={6} {...dash} />
      <path d={`M ${PIVOT.x - 40} ${PIVOT.y + 34} L ${PIVOT.x} ${PIVOT.y} L ${PIVOT.x + 40} ${PIVOT.y + 34}`} strokeWidth={4} {...dash} />
      {/* Beam */}
      <path d={`M ${ends.l.x} ${ends.l.y} L ${ends.r.x} ${ends.r.y}`} strokeWidth={6} {...dash} />
      <circle cx={PIVOT.x} cy={PIVOT.y} r={10 * draw} fill={COLORS.coral} stroke="none" />
      {/* Strings and pans */}
      <path d={strings(ends.l, panL)} strokeWidth={2.5} opacity={0.55} {...dash} />
      <path d={strings(ends.r, panR)} strokeWidth={2.5} opacity={0.55} {...dash} />
      <path d={pan(panL)} strokeWidth={4} fill={draw > 0.9 ? COLORS.card : 'none'} {...dash} />
      <path d={pan(panR)} strokeWidth={4} fill={draw > 0.9 ? COLORS.card : 'none'} {...dash} />
    </g>
  );
};

// One weight, drawn at a screen position (x = centre, bottom = where it rests).
const WeightShape: React.FC<{
  x: number;
  bottom: number;
  w: number;
  h: number;
  heavy?: boolean;
  opacity?: number;
  squash?: number;
  content: React.ReactNode;
}> = ({x, bottom, w, h, heavy, opacity = 1, squash = 1, content}) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: bottom - h,
      width: w,
      height: h,
      opacity,
      transformOrigin: '50% 100%',
      transform: `scale(${2 - squash}, ${squash})`,
    }}
  >
    <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <path d={handlePath(w, h)} fill="none" stroke={heavy ? COLORS.coral : COLORS.ink} strokeWidth={8} strokeLinecap="round" />
      <path d={weightPath(w, h)} fill={heavy ? COLORS.coral : COLORS.card} stroke={heavy ? COLORS.coral : COLORS.ink} strokeWidth={4} strokeLinejoin="round" />
    </svg>
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: h * 0.3,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: heavy ? COLORS.card : COLORS.ink,
      }}
    >
      {content}
    </div>
  </div>
);

// A reason dropping onto the right pan and stacking on the ones below, with its caption beside it.
const StackedWeight: React.FC<{t: number; weight: Weight; pan: P; below: number}> = ({t, weight, pan, below}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - weight.at) * fps, fps, config: {damping: 12, stiffness: 170, mass: weight.heavy ? 1.1 : 0.8}});
  if (s <= 0.001) return null;
  const rest = pan.y - 4 - below;
  const bottom = rest - (1 - s) * 560;
  const landed = interpolate(s, [0.85, 1], [0, 1], clamp);
  const cap = interpolate(t, [weight.at + 0.25, weight.at + 0.55], [0, 1], clamp);
  const iconColor = weight.heavy ? COLORS.card : COLORS.coral;
  return (
    <>
      <WeightShape
        x={pan.x}
        bottom={bottom}
        w={weight.w}
        h={weight.h}
        heavy={weight.heavy}
        opacity={Math.min(1, s * 2)}
        squash={1 - 0.1 * Math.sin(landed * Math.PI)}
        content={
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <WeightIcon kind={weight.icon} color={iconColor} />
            <span style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: weight.heavy ? 40 : 28, lineHeight: 1}}>{weight.label}</span>
          </div>
        }
      />
      {/* Caption to the right of the stack */}
      <div
        style={{
          position: 'absolute',
          left: pan.x + weight.w / 2 + 22,
          top: bottom - weight.h * 0.35 - 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          opacity: cap,
          transform: `translateX(${(1 - cap) * -16}px)`,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{width: 22, height: 2.5, background: COLORS.ink, borderRadius: 2}} />
        <span style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 21, color: weight.heavy ? COLORS.coral : COLORS.ink}}>{weight.caption}</span>
      </div>
    </>
  );
};

const WeightIcon: React.FC<{kind: Icon; color: string}> = ({kind, color}) => (
  <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    {kind === 'clock' && (
      <>
        <circle cx={12} cy={12} r={8.5} />
        <path d="M12 7.5V12l3 2" />
      </>
    )}
    {kind === 'triage' && <path d="M4 7h9M4 12h9M4 17h9M18 18V6M15 9l3-3 3 3" />}
    {kind === 'bed' && <path d="M3 7v12M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6M7 12.2h.01" />}
  </svg>
);

// "WHY PAY?" slams in at the top left and stays.
const Why: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  return (
    <div style={{position: 'absolute', left: 110, top: 96, fontFamily: FONTS.display, fontWeight: 800, fontSize: 104, color: COLORS.ink, letterSpacing: -2, whiteSpace: 'pre'}}>
      {'WHY PAY?'.split('').map((ch, i) => {
        const s = spring({frame: (t - T.why - i * 0.03) * fps, fps, config: {damping: 11, stiffness: 300, mass: 0.6}});
        return (
          <span key={i} style={{display: 'inline-block', opacity: s, color: ch === '?' ? COLORS.coral : COLORS.ink, transform: `translateY(${(1 - s) * 50}px) scale(${1.4 - 0.4 * s})`}}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// "= covers 9 patients for a year" at the top right, with the 9 counting up on the voice.
const Result: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - T.result) * fps, fps, config: {damping: 13, stiffness: 200}});
  if (s <= 0.001) return null;
  const n = Math.round(interpolate(t, [T.result, T.nine + 0.25], [1, 9], {...clamp, easing: Easing.out(Easing.cubic)}));
  return (
    <div
      style={{
        position: 'absolute',
        right: 110,
        top: 104,
        display: 'flex',
        alignItems: 'baseline',
        gap: 16,
        fontFamily: FONTS.display,
        fontWeight: 800,
        color: COLORS.ink,
        opacity: s,
        transform: `translateY(${(1 - s) * 30}px)`,
      }}
    >
      <span style={{fontSize: 40}}>= covers</span>
      <span style={{fontSize: 92, color: COLORS.coral, fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>{n}</span>
      <span style={{fontSize: 40}}>patients for a year</span>
    </div>
  );
};
