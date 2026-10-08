import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';
import meta from '../../../public/device/closeup/meta.json';

const scene = getScene('s07');
const vo = (word: string) => scene.voAt + wordTime('s07', word);

// The Blender camera tracks its aim point, so the button (start) and the screen (end) sit at the same spot.
const SX = 1920 / meta.width;
const FOCUS = {x: meta.buttonStart[0] * SX, y: meta.buttonStart[1] * SX};
const SCREEN = {x: meta.screenEnd[0] * SX, y: meta.screenEnd[1] * SX};

const T = {
  press: 21 / 30,
  one: vo('one'),
  offline: vo('works'),
  advice: vo('tells'),
  exit: 6.5,
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const pad = (n: number) => String(n).padStart(4, '0');

export const S07DeviceCloseup: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = frame / fps;

  // Exit: dive into the OLED; its black glass becomes the ink background of scene 8.
  const exit = interpolate(t, [T.exit, scene.seconds - 1 / fps], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const dive = 1 + exit * 4;
  const inkR = interpolate(exit, [0.35, 1], [0, 1500], {...clamp, easing: Easing.in(Easing.quad)});

  return (
    <AbsoluteFill>
      <BrandBackground />
      <AbsoluteFill style={{transform: `scale(${dive})`, transformOrigin: `${SCREEN.x}px ${SCREEN.y}px`}}>
        <Img src={staticFile(`device/closeup/frame_${pad(Math.min(frame, durationInFrames - 1))}.png`)} style={{width: '100%', height: '100%'}} />
        <PressPulse t={t} />
      </AbsoluteFill>

      <Claims t={t} fade={exit} />

      {inkR > 0 && (
        <AbsoluteFill style={{clipPath: `circle(${inkR}px at ${SCREEN.x}px ${SCREEN.y}px)`}}>
          <BrandBackground tone="ink" />
        </AbsoluteFill>
      )}

      <VoiceOver scene={scene} />
      <Sfx name="hit" at={T.one} volume={0.6} />
      <Sfx name="blip" at={T.press} volume={0.35} />
      <Sfx name="hit" at={T.offline} volume={0.6} />
      <Sfx name="whoosh-short" at={T.advice - 1.4} volume={0.25} />
      <Sfx name="alert" at={T.advice - 0.1} volume={0.35} />
      <Sfx name="hit" at={T.advice} volume={0.6} />
      <Sfx name="whoosh" at={T.exit} volume={0.45} />
    </AbsoluteFill>
  );
};

// Small coral pulse around the button when it is pressed.
const PressPulse: React.FC<{t: number}> = ({t}) => {
  const p = interpolate(t, [T.press, T.press + 0.6], [0, 1], clamp);
  if (p <= 0 || p >= 1) return null;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <ellipse cx={FOCUS.x} cy={FOCUS.y + 118} rx={172 + p * 120} ry={(172 + p * 120) * 0.45} fill="none" stroke={COLORS.coral} strokeWidth={4 * (1 - p)} opacity={1 - p} />
    </svg>
  );
};

const Claims: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const rows = [
    {at: T.one, icon: 'button' as const, lines: ['One button.']},
    {at: T.offline, icon: 'offline' as const, lines: ['Works offline.']},
    {at: T.advice, icon: 'screen' as const, lines: ['Clear advice,', 'on screen.']},
  ];
  const eyebrow = interpolate(t, [0.2, 0.6], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 110, top: 260, opacity: 1 - fade, transform: `translateX(${-fade * 160}px)`}}>
      <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 20, letterSpacing: 5, color: COLORS.coral, opacity: eyebrow, marginBottom: 34}}>
        HOME DEVICE · PROTOTYPE
      </div>
      {rows.map((r, i) => (
        <ClaimRow key={i} t={t} {...r} newest={rows.filter((x) => t >= x.at).length - 1 === i} />
      ))}
    </div>
  );
};

const ClaimRow: React.FC<{t: number; at: number; icon: 'button' | 'offline' | 'screen'; lines: string[]; newest: boolean}> = ({t, at, icon, lines, newest}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - at) * fps, fps, config: {damping: 11, stiffness: 300, mass: 0.6}});
  const settle = interpolate(t, [at + 0.5, at + 0.9], [1, 0], clamp);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 26,
        marginBottom: 30,
        opacity: s,
        transform: `translateX(${(1 - s) * -60}px) scale(${1.15 - 0.15 * s})`,
        transformOrigin: 'left center',
      }}
    >
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: 22,
          background: newest ? COLORS.coral : COLORS.ink,
          flexShrink: 0,
          marginTop: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `rotate(${settle * -6}deg)`,
        }}
      >
        <ClaimIcon kind={icon} />
      </div>
      <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 72, lineHeight: 1.04, color: COLORS.ink}}>
        {lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
    </div>
  );
};

const ClaimIcon: React.FC<{kind: 'button' | 'offline' | 'screen'}> = ({kind}) => (
  <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={COLORS.paper} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    {kind === 'button' && (
      <>
        <circle cx={12} cy={12} r={8.5} />
        <circle cx={12} cy={12} r={4} fill={COLORS.paper} />
      </>
    )}
    {kind === 'offline' && (
      <>
        <path d="M2.5 9 C8 4 16 4 21.5 9" />
        <path d="M5.5 12.5 C9.3 9.3 14.7 9.3 18.5 12.5" />
        <path d="M8.8 16 C10.7 14.6 13.3 14.6 15.2 16" />
        <circle cx={12} cy={19} r={0.9} fill={COLORS.paper} />
        <path d="M4 3 L20 21" />
      </>
    )}
    {kind === 'screen' && (
      <>
        <rect x={3} y={5} width={18} height={12} rx={2} />
        <path d="M12 8.5 V11.5" />
        <circle cx={12} cy={14} r={0.6} fill={COLORS.paper} />
        <path d="M9 20 H15" />
      </>
    )}
  </svg>
);
