import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, interpolateColors, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';
import meta from '../../../public/device/turntable/meta.json';
import closeMeta from '../../../public/device/closeup/meta.json';

const scene = getScene('s06');
const vo = (word: string, n = 0) => scene.voAt + wordTime('s06', word, n);

// Where the turntable render (rendered at its on-screen size) sits on screen: STAGE is the render center.
const STAGE = {x: 1250, y: 500, scale: 1};
const RW = meta.width;
const RH = meta.height;
const toScreen = ([x, y]: number[]) => ({x: STAGE.x + (x - RW / 2) * STAGE.scale, y: STAGE.y + (y - RH / 2) * STAGE.scale});

// Flat platform under the device: the projected turntable disc from meta.json (Blender catches the shadows on it).
const floorC = toScreen(meta.center);
const PLAT = (() => {
  const k = 1;
  const rx = ((meta.right[0] - meta.left[0]) / 2) * STAGE.scale * k;
  const front = toScreen(meta.front).y;
  const back = toScreen(meta.back).y;
  const ry = ((front - back) / 2) * k;
  const cy = floorC.y + ((front + back) / 2 - floorC.y) * k;
  return {cx: floorC.x, cy, rx, ry};
})();

// Assembly beats rendered in Blender (frames -> seconds).
const A = meta.assembly;
const sec = (f: number) => f / 30;

const T = {
  grow: 0.0,
  flatten: 0.3,
  drop: sec(A.drop_from),
  land: sec(A.land),
  lidLand: sec(A.lid_land),
  rural: vo('rural'),
  alone: vo('people'),
  exit: 6.45,
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const pad = (n: number) => String(n).padStart(4, '0');

export const S06DeviceTurntable: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = frame / fps;

  // The coral point from scene 5 grows, travels and flattens into the teal platform.
  const travel = Easing.inOut(Easing.cubic)(interpolate(t, [0, T.flatten + 0.15], [0, 1], clamp));
  const open = spring({frame: (t - T.flatten) * fps, fps, config: {damping: 13, stiffness: 120}});
  const r0 = interpolate(travel, [0, 1], [10, 70]);
  const pcx = 960 + (PLAT.cx - 960) * travel;
  const pcy = 540 + (PLAT.cy - 540) * travel;
  const prx = r0 + (PLAT.rx - r0) * open;
  const pry = r0 + (PLAT.ry - r0) * open;
  const platColor = interpolateColors(travel, [0, 1], [COLORS.coral, COLORS.teal]);

  // The base (and later the lid) drop in inside the Blender render; the platform dips on each impact.
  const dip = (at: number, amount: number) => (t > at ? Math.sin(Math.min(1, (t - at) / 0.25) * Math.PI) * amount : 0);
  const impact = dip(T.land, 1) + dip(T.lidLand, 0.5);

  // Exit: push into the coral button (tracked per frame from Blender), then a paper circle opens from it
  // revealing the first frame of the scene 7 close-up, which slides from the button into its real framing.
  const exit = interpolate(t, [T.exit, scene.seconds], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const zoom = 1 + exit * 1.6;
  const zoomOrigin = toScreen(meta.button[Math.min(frame, meta.button.length - 1)]);
  const wipe = interpolate(t, [T.exit + 0.18, scene.seconds - 1 / fps], [0, 1], clamp);
  const wipeR = Easing.in(Easing.quad)(wipe) * 2300;
  const settle = Easing.out(Easing.cubic)(wipe);
  const cb = closeMeta.buttonStart.map((v) => (v * 1920) / closeMeta.width);
  const closeShift = {x: (zoomOrigin.x - cb[0]) * (1 - settle), y: (zoomOrigin.y - cb[1]) * (1 - settle)};
  const closeScale = 0.55 + 0.45 * settle;

  return (
    <AbsoluteFill>
      <BrandBackground tone="ink" />

      <AbsoluteFill style={{transform: `scale(${zoom})`, transformOrigin: `${zoomOrigin.x}px ${zoomOrigin.y}px`}}>
        {/* Platform: two flat ellipses give it a little thickness */}
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          {open > 0.05 && <ellipse cx={pcx} cy={pcy + 22 * open} rx={prx} ry={pry} fill="#023A55" />}
          <ellipse cx={pcx} cy={pcy + impact * 6} rx={prx * (1 + impact * 0.015)} ry={pry} fill={platColor} />
          {open > 0.2 && (
            <ellipse cx={pcx} cy={pcy + impact * 6} rx={prx * 0.86} ry={pry * 0.86} fill="none" stroke="rgba(241,237,228,0.14)" strokeWidth={2} strokeDasharray="3 10" />
          )}
        </svg>

        {/* Turntable render from Blender */}
        <div
          style={{
            position: 'absolute',
            left: STAGE.x - (RW / 2) * STAGE.scale,
            top: STAGE.y - (RH / 2) * STAGE.scale + impact * 6,
            width: RW * STAGE.scale,
            height: RH * STAGE.scale,
          }}
        >
          <Img src={staticFile(`device/turntable/frame_${pad(Math.min(frame, durationInFrames - 1))}.png`)} style={{width: '100%', height: '100%'}} />
        </div>
      </AbsoluteFill>

      <Copy t={t} fade={exit} />

      {wipeR > 0 && (
        <AbsoluteFill style={{clipPath: `circle(${wipeR}px at ${zoomOrigin.x}px ${zoomOrigin.y}px)`}}>
          <BrandBackground />
          <Img
            src={staticFile('device/closeup/frame_0000.png')}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              transform: `translate(${closeShift.x}px, ${closeShift.y}px) scale(${closeScale})`,
              transformOrigin: `${cb[0]}px ${cb[1]}px`,
            }}
          />
        </AbsoluteFill>
      )}

      <VoiceOver scene={scene} />
      <Sfx name="whoosh" at={T.drop - 0.1} volume={0.35} />
      <Sfx name="impact" at={T.land - 0.05} volume={0.55} />
      <Sfx name="whoosh-short" at={sec(A.lid_from)} volume={0.3} />
      <Sfx name="hit" at={T.lidLand - 0.03} volume={0.45} />
      {A.screw_starts.map((f) => (
        <Sfx key={f} name="blip-low" at={sec(f + A.screw_len) - 0.03} volume={0.22} />
      ))}
      <Sfx name="whoosh-short" at={sec(A.cable_from)} volume={0.2} />
      <Sfx name="blip" at={sec(A.plug_click)} volume={0.35} />
      <Sfx name="blip" at={T.rural} volume={0.35} />
      <Sfx name="blip-low" at={T.alone} volume={0.35} />
      <Sfx name="whoosh" at={T.exit} volume={0.45} />
    </AbsoluteFill>
  );
};

const Copy: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const lines = [
    [{w: 'Designed', at: vo('designed')}, {w: 'for', at: vo('for')}],
    [{w: 'those', at: vo('those')}, {w: 'who', at: vo('who')}],
    [{w: 'need', at: vo('need')}, {w: 'it', at: vo('it', 1)}, {w: 'most.', at: vo('most')}],
  ];
  const eyebrow = interpolate(t, [vo('designed') - 0.3, vo('designed')], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 130, top: 250, opacity: 1 - fade, transform: `translateX(${-fade * 120}px)`}}>
      <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 20, letterSpacing: 5, color: COLORS.coral, opacity: eyebrow, marginBottom: 26}}>
        OPTIONAL · WORKS OFFLINE
      </div>
      {lines.map((line, li) => (
        <div key={li} style={{display: 'flex', gap: 24, height: 104}}>
          {line.map(({w, at}) => {
            const s = spring({frame: (t - at) * fps, fps, config: {damping: 12, stiffness: 240, mass: 0.6}});
            return (
              <span
                key={w}
                style={{
                  display: 'inline-block',
                  fontFamily: FONTS.display,
                  fontWeight: 800,
                  fontSize: 92,
                  lineHeight: 1.1,
                  color: li === 2 ? COLORS.coral : COLORS.paper,
                  opacity: s,
                  transform: `translateY(${(1 - s) * 40}px) scale(${1.2 - 0.2 * s})`,
                  transformOrigin: 'left bottom',
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      ))}
      <div style={{display: 'flex', gap: 18, marginTop: 44}}>
        <Chip t={t} at={T.rural} label="Rural areas" icon="home" />
        <Chip t={t} at={T.alone} label="People living alone" icon="person" />
      </div>
    </div>
  );
};

const Chip: React.FC<{t: number; at: number; label: string; icon: 'home' | 'person'}> = ({t, at, label, icon}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - at) * fps, fps, config: {damping: 12, stiffness: 200}});
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 22px 12px 16px',
        borderRadius: 40,
        border: '2px solid rgba(241,237,228,0.35)',
        color: COLORS.paper,
        fontFamily: FONTS.ui,
        fontWeight: 600,
        fontSize: 26,
        opacity: s,
        transform: `translateY(${(1 - s) * 24}px) scale(${0.9 + 0.1 * s})`,
      }}
    >
      <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={COLORS.coral} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {icon === 'home' ? (
          <>
            <path d="M3 11 L12 4 L21 11" />
            <path d="M5 10 V20 H19 V10" />
            <path d="M10 20 V14 H14 V20" />
          </>
        ) : (
          <>
            <circle cx={12} cy={7.5} r={3.5} />
            <path d="M5 20 C5 15.5 8 13 12 13 C16 13 19 15.5 19 20" />
          </>
        )}
      </svg>
      {label}
    </div>
  );
};
