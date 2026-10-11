import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';
import {CalloutLabel, CalloutLine, type IconName, type Side} from '../shared/Callout';
import {PHOTO_FRAME, PHOTO_ZOOM} from '../shared/handoffs';
import {FrameBox, FrameOutline, FramePhoto, FramePill, FrameTab, TEAM_PLACE, TEAM_TAB, TeamPhoto} from '../shared/PhotoCard';

const scene = getScene('proto');
const vo = (word: string, n = 0) => scene.voAt + wordTime('proto', word, n);

// Scene 17 — we've built health hardware before. The team photo card flips over: on its back, the
// stroke-screening glove the team built for the Harvard HSIL Hackathon, with callouts to its parts.
// Exit: the camera dives into the laptop in the photo; its screen goes dark and fills the frame, which is
// exactly how the MVP scene starts (the dark laptop screen, before the dashboard boots).
const T = {
  flip: 0,
  flipEnd: 0.6,
  parts: vo('hardware'),
  report: vo('before') + 0.15,
  headline: vo('stroke-screening'),
  dive: scene.seconds - 1.05,
};

const F = PHOTO_FRAME;
const CENTER = {x: F.x + F.w / 2, y: F.y + F.h / 2};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
type Pt = {x: number; y: number};

// The prototype photo (5120×3840) fills the frame. Points below are in a 2000-wide copy of it.
const PROTO = {src: 'team/prototype.jpg', size: {w: 5120, h: 3840}, crop: {x: 0, y: 0, w: 5120}};
const P = F.w / 2000;
const proto = (x: number, y: number): Pt => ({x: F.x + x * P, y: F.y + y * P});

const PARTS: {title: string; sub: string; icon: IconName; at: number; from: Pt; side: Side; y: number}[] = [
  {title: 'MOTION SENSORS', sub: 'Glove-mounted', icon: 'motion', at: T.parts, from: proto(1050, 1262), side: 'right', y: 790},
  {title: 'BIOSIGNALS', sub: 'Skin-contact electrodes', icon: 'pulse', at: T.parts + 0.25, from: proto(1505, 470), side: 'right', y: 410},
  {title: 'CLINICAL REPORT', sub: 'Generated per session', icon: 'report', at: T.report, from: proto(790, 300), side: 'left', y: 335},
];

// The laptop lid in the photo (2000-wide coords): its outline, centre and the tilt of its top edge.
const SCREEN = {quad: [proto(596, 36), proto(1106, 163), proto(974, 612), proto(536, 406)], center: proto(805, 305), tilt: -14};

export const ProtoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Card flip: front = the team photo as the team scene left it; back = the prototype.
  const flip = interpolate(t, [T.flip, T.flipEnd], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const back = flip >= 0.5;
  const depth = 1 - 0.08 * Math.sin(flip * Math.PI);

  // Dive into the laptop screen: zoom about it, bring it to the centre and straighten it.
  const dive = interpolate(t, [T.dive, scene.seconds - 1 / fps], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const zoom = Math.pow(16, dive);
  const toCenter = Easing.inOut(Easing.cubic)(interpolate(t, [T.dive, scene.seconds], [0, 1], clamp));
  const cam = {x: (960 - SCREEN.center.x) * toCenter, y: (540 - SCREEN.center.y) * toCenter, rot: -SCREEN.tilt * toCenter};
  const dark = interpolate(dive, [0.15, 0.55], [0, 1], clamp);
  const ink = interpolate(dive, [0.8, 1], [0, 1], clamp);
  const calloutsOut = interpolate(t, [T.dive - 0.1, T.dive + 0.25], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});


  return (
    <AbsoluteFill>
      <BrandBackground />

      {/* Camera (dive) */}
      <AbsoluteFill
        style={{
          transformOrigin: `${SCREEN.center.x}px ${SCREEN.center.y}px`,
          transform: `translate(${cam.x}px, ${cam.y}px) rotate(${cam.rot}deg) scale(${zoom})`,
        }}
      >
        {/* The card */}
        <AbsoluteFill style={{perspective: 2200, perspectiveOrigin: `${CENTER.x}px ${CENTER.y}px`}}>
          <FrameBox style={{transformOrigin: '50% 50%', transform: `scale(${depth}) rotateY(${flip * 180}deg)`}}>
            {!back ? (
              <>
                <TeamPhoto zoom={PHOTO_ZOOM.to} />
                <FrameOutline />
                <FrameTab {...TEAM_TAB} />
                <FramePill text={TEAM_PLACE} />
              </>
            ) : (
              <div style={{position: 'absolute', inset: 0, transform: 'scaleX(-1)'}}>
                <FramePhoto {...PROTO} />
                <FrameOutline />
                <FrameTab label="PROTOTYPE" title="Harvard HSIL Hackathon 2026" scale={1 - calloutsOut} />
              </div>
            )}
          </FrameBox>
        </AbsoluteFill>

        {/* The laptop screen in the photo goes dark as we reach it */}
        {dark > 0 && (
          <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            <polygon points={SCREEN.quad.map((p) => `${p.x},${p.y}`).join(' ')} fill={COLORS.ink} opacity={dark} />
          </svg>
        )}

        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {PARTS.map((p) => (
            <CalloutLine key={p.title} t={t} at={p.at} from={p.from} side={p.side} labelY={p.y} out={calloutsOut} />
          ))}
        </svg>
      </AbsoluteFill>

      {PARTS.map((p) => (
        <CalloutLabel
          key={p.title}
          side={p.side}
          y={p.y}
          title={p.title}
          sub={p.sub}
          icon={p.icon}
          t={t}
          at={p.at}
          out={calloutsOut}
          titleSize={28}
        />
      ))}
      <CalloutLabel
        side="left"
        y={700}
        title="STROKE SCREENING"
        sub="From upper-limb movement"
        icon="stroke"
        t={t}
        at={T.headline - 0.15}
        out={calloutsOut}
        titleSize={28}
      />

      {/* Last frames: the dark screen fills everything (= first frame of the MVP scene) */}
      {ink > 0 && <AbsoluteFill style={{backgroundColor: COLORS.ink, opacity: ink}} />}

      <VoiceOver scene={scene} />
      <Sfx name="whoosh" at={T.flip} volume={0.35} />
      <Sfx name="blip" at={T.parts + 0.05} volume={0.3} />
      <Sfx name="blip" at={T.parts + 0.3} volume={0.3} />
      <Sfx name="blip" at={T.report + 0.05} volume={0.3} />
      <Sfx name="hit" at={T.headline} volume={0.35} />
      <Sfx name="whoosh" at={T.dive} volume={0.4} />
    </AbsoluteFill>
  );
};
