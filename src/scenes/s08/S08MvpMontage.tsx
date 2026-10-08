import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';
import {AlertCard, CARDS, DashboardChrome, LiveCard, MarkersCard, SCREEN_H, SCREEN_W, TrendCard, type CardId} from './MvpScreens';

const scene = getScene('s08');
const vo = (word: string) => scene.voAt + wordTime('s08', word);

const T = {
  pullEnd: 0.85,
  dot: 0.42,
  boot: 0.72,
  layout: 3.35,
  our: vo('our'),
  mvp: vo('mvp'),
  will: vo('will'),
  final: vo('final'),
  weekend: vo('weekend'),
};

// One continuous dashboard: each card pops in and lifts off the screen in turn, the alert stays up.
const CARD_AT: Record<CardId, number> = {live: 1.0, markers: 1.55, trend: 2.1, alert: vo('beginning') + 0.05};
const ORDER: CardId[] = ['live', 'markers', 'trend', 'alert'];

// Laptop geometry, relative to the screen center (screen-local px).
const BEZEL = 22;
const OUTER = {w: SCREEN_W + BEZEL * 2, h: SCREEN_H + BEZEL * 2};
// Scale at which the screen alone fills the frame: scene 7 ends on full ink = the dark laptop screen.
const S0 = 1.76;

// Camera: screen center on canvas, scale, and a 3D angle (seen slightly from above).
const START = {x: 960, y: 540, s: S0, rx: 0, ry: 0};
const SHOW = {x: 960, y: 500, s: 1.0, rx: -7, ry: -12};
const SHOW_END = {x: 960, y: 505, s: 1.06, rx: -5, ry: -5};
const FINAL = {x: 1385, y: 515, s: 0.64, rx: -6, ry: 14};

type Cam = typeof START;
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  x: a.x + (b.x - a.x) * k,
  y: a.y + (b.y - a.y) * k,
  s: a.s + (b.s - a.s) * k,
  rx: a.rx + (b.rx - a.rx) * k,
  ry: a.ry + (b.ry - a.ry) * k,
});

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const S08MvpMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Pull back out of the screen while swinging into a 3/4 view, drift slowly, then slide right for the headline.
  const pull = Easing.out(Easing.cubic)(interpolate(t, [0, T.pullEnd], [0, 1], clamp));
  const drift = Easing.inOut(Easing.sin)(interpolate(t, [T.pullEnd, T.layout + 0.6], [0, 1], clamp));
  const settle = spring({frame: (t - T.layout) * fps, fps, config: {damping: 17, stiffness: 80}});
  const cam = mix(mix(mix(START, SHOW, pull), SHOW_END, drift), FINAL, settle);

  // Boot: a coral dot in the middle of the dark screen opens into the dashboard.
  const dot = spring({frame: (t - T.dot) * fps, fps, config: {damping: 12, stiffness: 220}});
  const boot = interpolate(t, [T.boot, T.boot + 0.3], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});

  return (
    <AbsoluteFill>
      <BrandBackground />

      <AbsoluteFill style={{perspective: 2600, perspectiveOrigin: `${cam.x}px ${cam.y}px`}}>
        <div
          style={{
            position: 'absolute',
            left: cam.x,
            top: cam.y,
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            transform: `scale(${cam.s}) rotateX(${cam.rx}deg) rotateY(${cam.ry}deg)`,
          }}
        >
          <LaptopBody />
          <div
            style={{
              position: 'absolute',
              left: -SCREEN_W / 2,
              top: -SCREEN_H / 2,
              width: SCREEN_W,
              height: SCREEN_H,
              transformStyle: 'preserve-3d',
              transform: 'translateZ(0.5px)',
            }}
          >
            <div style={{position: 'absolute', inset: 0, borderRadius: 6, background: COLORS.ink, overflow: 'hidden'}}>
              {boot < 1 && (
                <svg width={SCREEN_W} height={SCREEN_H} style={{position: 'absolute', inset: 0}}>
                  <circle cx={SCREEN_W / 2} cy={SCREEN_H / 2} r={12 * dot} fill={COLORS.coral} />
                </svg>
              )}
              {boot > 0 && (
                <div style={{position: 'absolute', inset: 0, clipPath: `circle(${12 + boot * 660}px at ${SCREEN_W / 2}px ${SCREEN_H / 2}px)`}}>
                  <DashboardChrome />
                </div>
              )}
            </div>
            {ORDER.map((id) => (
              <Card key={id} id={id} t={t} />
            ))}
          </div>
        </div>
      </AbsoluteFill>

      <Headline t={t} />

      <VoiceOver scene={scene} />
      <Sfx name="whoosh" at={0} volume={0.35} />
      <Sfx name="blip" at={T.dot} volume={0.35} />
      <Sfx name="whoosh-short" at={T.boot} volume={0.3} />
      <Sfx name="blip" at={CARD_AT.live} volume={0.3} />
      <Sfx name="blip-low" at={CARD_AT.markers} volume={0.3} />
      <Sfx name="blip" at={CARD_AT.trend} volume={0.3} />
      <Sfx name="alert" at={CARD_AT.alert} volume={0.3} />
      <Sfx name="whoosh" at={T.layout} volume={0.3} />
      <Sfx name="impact" at={T.mvp - 0.04} volume={0.5} />
      <Sfx name="hit" at={T.final} volume={0.5} />
      <Sfx name="shimmer" at={T.weekend} volume={0.35} />
    </AbsoluteFill>
  );
};

// A dashboard card: pops in, lifts off the screen towards the camera, then settles back (the alert stays up).
const Card: React.FC<{id: CardId; t: number}> = ({id, t}) => {
  const {fps} = useVideoConfig();
  const at = CARD_AT[id];
  const since = t - at;
  if (since < 0) return null;
  const box = CARDS[id];
  const pop = spring({frame: since * fps, fps, config: {damping: 13, stiffness: 170}});
  const up = spring({frame: since * fps, fps, config: {damping: 15, stiffness: 120}});
  const down = id === 'alert' ? 0 : spring({frame: (since - 0.75) * fps, fps, config: {damping: 18, stiffness: 90}});
  const lift = Math.max(0, up - down);
  const z = 2 + lift * (id === 'alert' ? 110 : 80);
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        borderRadius: 20,
        overflow: 'hidden',
        border: id === 'markers' || id === 'trend' ? `1.5px solid ${COLORS.inkFaint}` : undefined,
        fontFamily: FONTS.ui,
        color: COLORS.ink,
        opacity: Math.min(1, pop * 1.4),
        transform: `translateZ(${z}px) scale(${0.85 + 0.15 * pop})`,
        boxShadow: `0 ${6 + lift * 16}px ${14 + lift * 30}px rgba(9,38,52,${0.08 + lift * 0.16})`,
      }}
    >
      {id === 'live' && <LiveCard t={t} since={since} />}
      {id === 'markers' && <MarkersCard since={since} />}
      {id === 'trend' && <TrendCard since={since} />}
      {id === 'alert' && <AlertCard t={t} since={since} fps={fps} />}
    </div>
  );
};

// Laptop: ink lid standing up and a flat keyboard deck lying towards the camera.
const LaptopBody: React.FC = () => {
  const deck = {w: 1260, d: 470};
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: -deck.w / 2,
          top: OUTER.h / 2 - 2,
          width: deck.w,
          height: deck.d,
          borderRadius: '6px 6px 46px 46px',
          background: COLORS.paperShade,
          transformOrigin: 'top center',
          transform: 'rotateX(90deg)',
          boxShadow: '0 0 90px rgba(9,38,52,0.22)',
        }}
      >
        <div style={{position: 'absolute', left: 90, right: 90, top: 46, height: 220, borderRadius: 16, background: '#D8D1C3'}} />
        <div style={{position: 'absolute', left: '50%', width: 400, marginLeft: -200, top: 290, height: 150, borderRadius: 18, background: '#DCD5C8'}} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: -OUTER.w / 2,
          top: -OUTER.h / 2,
          width: OUTER.w,
          height: OUTER.h,
          borderRadius: '30px 30px 10px 10px',
          background: COLORS.ink,
        }}
      />
      <div style={{position: 'absolute', left: -4, top: -OUTER.h / 2 + 8, width: 8, height: 8, borderRadius: '50%', background: '#1E3D4C'}} />
    </>
  );
};

// Closing line: "Our MVP — will be live at the Final Weekend."
const Headline: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const s = (at: number, stiffness = 260) => spring({frame: (t - at) * fps, fps, config: {damping: 12, stiffness, mass: 0.6}});
  const eyebrow = interpolate(t, [T.layout + 0.1, T.layout + 0.4], [0, 1], clamp);
  const our = s(T.our);
  const mvp = s(T.mvp, 320);
  const will = s(T.will);
  const fin = s(T.final, 300);
  const underline = interpolate(t, [T.weekend, T.weekend + 0.5], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const word = (k: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    display: 'inline-block',
    opacity: k,
    transform: `translateY(${(1 - k) * 40}px) scale(${1.2 - 0.2 * k})`,
    transformOrigin: 'left bottom',
    ...extra,
  });

  // Underline: a little voice wave drawn under "Final Weekend."
  const W = 700;
  const wave = new Array(61)
    .fill(0)
    .map((_, i) => {
      const x = (i / 60) * W;
      const env = Math.sin((i / 60) * Math.PI);
      return `${i ? 'L' : 'M'} ${x} ${12 + Math.sin(i * 0.85) * 9 * env}`;
    })
    .join(' ');

  return (
    <div style={{position: 'absolute', left: 120, top: 300}}>
      <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 20, letterSpacing: 5, color: COLORS.coral, opacity: eyebrow, marginBottom: 18}}>
        WHAT’S NEXT
      </div>
      <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 132, lineHeight: 1.05, color: COLORS.ink, display: 'flex', gap: 30}}>
        <span style={word(our)}>Our</span>
        <span style={word(mvp)}>MVP</span>
      </div>
      <div style={{fontFamily: FONTS.display, fontWeight: 600, fontSize: 50, color: COLORS.inkSoft, marginTop: 14}}>
        <span style={word(will)}>will be live at the</span>
      </div>
      <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 96, lineHeight: 1.1, color: COLORS.coral}}>
        <span style={word(fin)}>Final Weekend.</span>
      </div>
      <svg width={W} height={26} style={{marginTop: 6, overflow: 'visible'}}>
        <path d={wave} fill="none" stroke={COLORS.teal} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - underline} opacity={underline > 0 ? 1 : 0} />
      </svg>
    </div>
  );
};
