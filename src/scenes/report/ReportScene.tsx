import React from 'react';
import {AbsoluteFill, Easing, Freeze, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {LOGO} from '../../brand/logo';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {StageTag} from '../../components/StageTag';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene, sceneFrames} from '../config';
import {S04TrendAlert} from '../s04/S04TrendAlert';

const scene = getScene('report');
const vo = (word: string) => scene.voAt + wordTime('report', word);
const S04_LAST = sceneFrames(getScene('s04')) - 1;

const T = {
  dockEnd: 1.1,
  sheetIn: 0.15,
  header: 0.9,
  markers: 1.55,
  cards: 2.2,
  footer: 2.9,
  before: vo('before'),
  neuro: vo('neurologist'),
  one: vo('one'),
  clear: vo('clear'),
  page: vo('page'),
  // The page is complete by ~3 s; it folds away shortly after the voice-over ends.
  fold: scene.seconds - 1.15,
  shrink: scene.seconds - 0.8,
  ink: scene.seconds - 0.5,
};

// The clinician sheet (A4 proportions), centered right of frame.
const SHEET = {cx: 1240, cy: 540, w: 640, h: 905};
const PAD = 40;
// Chart window on the sheet: scene 4's frame docks into it.
const BOX = {x: PAD, y: 176, w: SHEET.w - 2 * PAD, h: Math.round(((SHEET.w - 2 * PAD) * 1080) / 1920)};
const DOCK_K = BOX.w / 1920;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const ReportScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Sheet slides in from the right while scene 4's chart shrinks into its window.
  const slide = spring({frame: (t - T.sheetIn) * fps, fps, config: {damping: 16, stiffness: 95}});
  const dock = Easing.inOut(Easing.cubic)(interpolate(t, [0, T.dockEnd], [0, 1], clamp));
  const push = interpolate(t, [T.dockEnd + 0.1, T.fold], [1, 1.045], {...clamp, easing: Easing.inOut(Easing.sin)});
  const sheetLeft = SHEET.cx - SHEET.w / 2;
  const sheetTop = SHEET.cy - SHEET.h / 2;

  // Exit: the top half folds down over the bottom, the folded sheet shrinks into a coral point,
  // then ink floods out of it (scene 6 starts on ink with that point).
  const fold = interpolate(t, [T.fold, T.shrink], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const shrink = interpolate(t, [T.shrink, T.ink], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const inkR = interpolate(t, [T.ink, scene.seconds - 1 / fps], [10, 1200], {...clamp, easing: Easing.in(Easing.cubic)});
  const dotR = interpolate(shrink, [0.6, 1], [0, 10], clamp);

  // Where the folded sheet goes: the screen center, scaled down to nothing.
  const sheetX = (1 - slide) * 900 + (960 - SHEET.cx) * shrink;
  const sheetY = (540 - (SHEET.cy + SHEET.h / 4)) * shrink;
  const sheetScale = push * (1 - shrink * 0.985);

  return (
    <AbsoluteFill>
      <BrandBackground />

      <LeftCopy t={t} fade={fold} />

      {/* Camera group: sheet (and the chart once docked) */}
      <AbsoluteFill
        style={{
          transform: `translate(${sheetX}px, ${sheetY}px) scale(${sheetScale})`,
          transformOrigin: `${SHEET.cx}px ${SHEET.cy + (SHEET.h / 4) * shrink}px`,
          perspective: 2200,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: sheetLeft,
            top: sheetTop,
            width: SHEET.w,
            height: SHEET.h,
            transform: `rotate(${(1 - slide) * 6}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Bottom half (static) */}
          <div style={{position: 'absolute', inset: 0, clipPath: `inset(${SHEET.h / 2}px 0 0 0)`}}>
            <Sheet t={t} showChart={t >= T.dockEnd} shade={0} />
          </div>
          {/* Top half: folds down over the bottom half */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transformOrigin: '50% 50%',
              transform: `rotateX(${-fold * 180}deg)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {fold < 0.5 ? (
              <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 ${SHEET.h / 2}px 0)`}}>
                <Sheet t={t} showChart={t >= T.dockEnd} shade={fold * 0.5} />
              </div>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  height: SHEET.h / 2,
                  background: interpolateColors(shrink, [0, 0.55], [COLORS.card, COLORS.coral]),
                  borderRadius: 18 + shrink * 300,
                  transform: 'rotateX(180deg)',
                  boxShadow: `0 30px 60px rgba(9,38,52,${0.25 * (1 - shrink)}), inset 0 0 0 1.5px ${COLORS.inkFaint}`,
                }}
              />
            )}
          </div>
        </div>
      </AbsoluteFill>

      {/* Scene 4's last frame, flying into the chart window until it docks */}
      {t < T.dockEnd && (
        <AbsoluteFill
          style={{
            transformOrigin: '0 0',
            transform: `translate(${(sheetLeft + BOX.x + (1 - slide) * 900) * dock}px, ${(sheetTop + BOX.y) * dock}px) scale(${1 + (DOCK_K - 1) * dock})`,
            borderRadius: 14 / Math.max(DOCK_K, 1 + (DOCK_K - 1) * dock),
            overflow: 'hidden',
            boxShadow: `0 ${30 * dock}px ${60 * dock}px rgba(9,38,52,${0.25 * dock})`,
          }}
        >
          <Freeze frame={S04_LAST}>
            <S04TrendAlert embedded />
          </Freeze>
        </AbsoluteFill>
      )}

      {/* Ink floods out of the coral point that is left */}
      {t >= T.ink - 0.05 && (
        <AbsoluteFill style={{clipPath: `circle(${inkR}px at 960px 540px)`}}>
          <BrandBackground tone="ink" />
        </AbsoluteFill>
      )}
      {dotR > 0 && (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <circle cx={960} cy={540} r={dotR} fill={COLORS.coral} />
        </svg>
      )}

      <StageTag label="ILLUSTRATIVE DATA" opacity={interpolate(t, [0.6, 1.0], [0, 1], clamp) * (1 - fold)} />

      <VoiceOver scene={scene} />
      <Sfx name="whoosh" at={0.05} volume={0.35} />
      <Sfx name="blip" at={T.dockEnd} volume={0.4} />
      <Sfx name="blip-low" at={T.markers} volume={0.2} />
      <Sfx name="blip-low" at={T.cards} volume={0.2} />
      <Sfx name="blip-low" at={T.cards + 0.25} volume={0.2} />
      <Sfx name="hit" at={T.page + 0.1} volume={0.55} />
      <Sfx name="whoosh" at={T.ink} volume={0.4} />
    </AbsoluteFill>
  );
};

// "Before each checkup, the neurologist gets one clear page." as kinetic type on the left.
const LeftCopy: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const sp = (at: number, stiffness = 240) => spring({frame: (t - at) * fps, fps, config: {damping: 12, stiffness, mass: 0.6}});
  const word = (k: number): React.CSSProperties => ({
    display: 'inline-block',
    opacity: k,
    transform: `translateY(${(1 - k) * 40}px) scale(${1.2 - 0.2 * k})`,
    transformOrigin: 'left bottom',
  });
  const underline = interpolate(t, [T.page + 0.15, T.page + 0.65], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const W = 560;
  const wave = new Array(57)
    .fill(0)
    .map((_, i) => {
      const x = (i / 56) * W;
      return `${i ? 'L' : 'M'} ${x} ${12 + Math.sin(i * 0.9) * 9 * Math.sin((i / 56) * Math.PI)}`;
    })
    .join(' ');
  return (
    <div style={{position: 'absolute', left: 120, top: 330, opacity: 1 - fade, transform: `translateX(${-fade * 140}px)`}}>
      <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 20, letterSpacing: 5, color: COLORS.coral, opacity: sp(T.before)}}>BEFORE EACH CHECKUP</div>
      <div style={{fontFamily: FONTS.display, fontWeight: 600, fontSize: 52, color: COLORS.inkSoft, marginTop: 18}}>
        <span style={word(sp(T.neuro))}>The neurologist gets</span>
      </div>
      <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 124, lineHeight: 1.02, color: COLORS.ink, marginTop: 6}}>
        <span style={word(sp(T.one, 300))}>one</span> <span style={word(sp(T.clear, 300))}>clear</span>
        <br />
        <span style={{...word(sp(T.page, 320)), color: COLORS.coral}}>page.</span>
      </div>
      <svg width={W} height={26} style={{marginTop: 8, overflow: 'visible'}}>
        <path d={wave} fill="none" stroke={COLORS.teal} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - underline} opacity={underline > 0 ? 1 : 0} />
      </svg>
    </div>
  );
};

// The one-page report. shade darkens the top half as it folds.
const Sheet: React.FC<{t: number; showChart: boolean; shade: number}> = ({t, showChart, shade}) => {
  const {fps} = useVideoConfig();
  const sp = (at: number, stiffness = 170) => spring({frame: (t - at) * fps, fps, config: {damping: 14, stiffness}});
  const header = sp(T.header);
  const ring = interpolate(t, [T.dockEnd, T.dockEnd + 0.7], [0, 1], clamp);
  const stamp = spring({frame: (t - T.page - 0.1) * fps, fps, config: {damping: 9, stiffness: 260, mass: 0.7}});
  const fadeUp = (k: number): React.CSSProperties => ({opacity: k, transform: `translateY(${(1 - k) * 22}px)`});
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: COLORS.card,
        borderRadius: 18,
        boxShadow: '0 40px 80px rgba(9,38,52,0.22), 0 6px 16px rgba(9,38,52,0.1)',
        fontFamily: FONTS.ui,
        color: COLORS.ink,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{position: 'absolute', left: PAD, right: PAD, top: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...fadeUp(header)}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <svg viewBox="140 330 990 460" width={44}>
            <path d={LOGO.symbol.navy.join('')} fill={COLORS.navy} />
            <path d={LOGO.symbol.teal.join('')} fill={COLORS.teal} />
            <path d={LOGO.symbol.coral.join('')} fill={COLORS.coral} />
          </svg>
          <span style={{fontSize: 15, fontWeight: 700, letterSpacing: 4}}>VOXWAVE CLINICAL REPORT</span>
        </div>
        <span style={{fontSize: 13, fontWeight: 600, letterSpacing: 2, color: COLORS.inkSoft}}>WEEK 14</span>
      </div>
      <div style={{position: 'absolute', left: PAD, top: 96, ...fadeUp(sp(T.header + 0.1))}}>
        <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 30}}>Patient #0427</div>
        <div style={{fontSize: 16, color: COLORS.inkSoft, marginTop: 2}}>Pre-visit summary · 14 weekly check-ins</div>
      </div>

      {/* Stamp */}
      <div
        style={{
          position: 'absolute',
          right: PAD - 6,
          top: 100,
          padding: '8px 14px',
          border: `3px solid ${COLORS.coral}`,
          borderRadius: 10,
          color: COLORS.coral,
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: 2.5,
          lineHeight: 1.25,
          textAlign: 'center',
          opacity: Math.min(1, stamp * 1.5),
          transform: `rotate(-8deg) scale(${2 - stamp})`,
        }}
      >
        1-PAGE
        <br />
        CLINICIAN REPORT
      </div>

      {/* Chart window */}
      <div style={{position: 'absolute', left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, borderRadius: 14, overflow: 'hidden', background: COLORS.paper}}>
        {showChart && (
          <div style={{width: 1920, height: 1080, transform: `scale(${DOCK_K})`, transformOrigin: '0 0'}}>
            <Freeze frame={S04_LAST}>
              <S04TrendAlert embedded />
            </Freeze>
          </div>
        )}
      </div>
      {ring > 0 && ring < 1 && (
        <div
          style={{
            position: 'absolute',
            left: BOX.x - 14 * ring,
            top: BOX.y - 14 * ring,
            width: BOX.w + 28 * ring,
            height: BOX.h + 28 * ring,
            borderRadius: 14 + 14 * ring,
            border: `${4 * (1 - ring)}px solid ${COLORS.coral}`,
            opacity: 1 - ring,
          }}
        />
      )}

      {/* Voice markers: trends only, no values */}
      <div style={{position: 'absolute', left: PAD, right: PAD, top: 512}}>
        <div style={{fontSize: 12, fontWeight: 700, letterSpacing: 3, color: COLORS.inkSoft, ...fadeUp(sp(T.markers))}}>VOICE MARKERS · 14-WEEK TREND</div>
        <div style={{display: 'flex', gap: 12, marginTop: 12}}>
          {MINI.map((m, i) => (
            <div key={m.label} style={{flex: 1, padding: '10px 12px', borderRadius: 12, background: m.alert ? 'rgba(255,110,66,0.1)' : 'rgba(0,78,114,0.07)', ...fadeUp(sp(T.markers + 0.08 + i * 0.07))}}>
              <div style={{fontSize: 14, fontWeight: 700, color: m.alert ? '#D9481E' : COLORS.ink}}>{m.label}</div>
              <Spark vals={m.vals} color={m.alert ? COLORS.coral : COLORS.teal} draw={interpolate(t, [T.markers + 0.1 + i * 0.07, T.markers + 0.7 + i * 0.07], [0, 1], clamp)} />
            </div>
          ))}
        </div>
      </div>

      {/* Quality flags + session context */}
      <div style={{position: 'absolute', left: PAD, right: PAD, top: 640, display: 'flex', gap: 16}}>
        <div style={{flex: 1, padding: '16px 18px', borderRadius: 14, border: `1.5px solid ${COLORS.inkFaint}`, ...fadeUp(sp(T.cards))}}>
          <div style={{fontSize: 12, fontWeight: 700, letterSpacing: 3, color: COLORS.inkSoft}}>QUALITY FLAGS</div>
          <div style={{display: 'flex', gap: 9, marginTop: 14, alignItems: 'center'}}>
            {new Array(10).fill(0).map((_, i) =>
              i === 6 ? (
                <svg key={i} width={18} height={18} viewBox="0 0 18 18">
                  <circle cx={9} cy={9} r={7} fill="none" stroke={COLORS.coral} strokeWidth={2.5} />
                  <path d="M5 5 L13 13" stroke={COLORS.coral} strokeWidth={2.5} strokeLinecap="round" />
                </svg>
              ) : (
                <span key={i} style={{width: 14, height: 14, borderRadius: '50%', background: COLORS.teal, opacity: 0.85}} />
              ),
            )}
          </div>
          <div style={{fontSize: 15, marginTop: 12, lineHeight: 1.35}}>
            <b>1 session discarded</b>
            <br />
            <span style={{color: COLORS.inkSoft}}>background noise</span>
          </div>
        </div>
        <div style={{flex: 1, padding: '16px 18px', borderRadius: 14, border: `1.5px solid ${COLORS.inkFaint}`, ...fadeUp(sp(T.cards + 0.25))}}>
          <div style={{fontSize: 12, fontWeight: 700, letterSpacing: 3, color: COLORS.inkSoft}}>SESSION CONTEXT</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 14}}>
            <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={COLORS.teal} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x={3} y={8.5} width={18} height={7} rx={3.5} transform="rotate(-35 12 12)" />
              <path d="M9.4 7.7 L14.6 16.3" />
            </svg>
            <div style={{fontFamily: FONTS.display, fontWeight: 700, fontSize: 19}}>Last dose logged</div>
          </div>
          <div style={{fontSize: 15, color: COLORS.inkSoft, marginTop: 8}}>2 h before the call</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{position: 'absolute', left: PAD, right: PAD, bottom: 34, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: COLORS.inkSoft, borderTop: `1.5px solid ${COLORS.inkFaint}`, paddingTop: 14, ...fadeUp(sp(T.footer))}}>
        <span>Auto-generated before each visit · Measures, not diagnoses</span>
        <span>1 / 1</span>
      </div>

      {shade > 0 && <div style={{position: 'absolute', inset: 0, background: COLORS.ink, opacity: shade}} />}
    </div>
  );
};

const MINI = [
  {label: 'Tremor', vals: [0.1, -0.1, 0.05, -0.05, 0.1, 0, -0.1, 0.05], alert: false},
  {label: 'Pitch', vals: [0, 0.1, -0.1, 0.05, 0, -0.05, 0.1, 0], alert: false},
  {label: 'Rhythm', vals: [0.1, 0, 0.05, -0.05, 0, -0.15, -0.25, -0.35], alert: false},
  {label: 'Pauses', vals: [-0.3, -0.25, -0.3, -0.2, -0.25, 0, 0.35, 0.7], alert: true},
];

const Spark: React.FC<{vals: number[]; color: string; draw: number}> = ({vals, color, draw}) => {
  const W = 110;
  const H = 34;
  const d = vals.map((v, i) => `${i ? 'L' : 'M'} ${(i / (vals.length - 1)) * W} ${H / 2 - v * (H / 2)}`).join(' ');
  return (
    <svg width={W} height={H} style={{marginTop: 8, overflow: 'visible'}}>
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
    </svg>
  );
};
