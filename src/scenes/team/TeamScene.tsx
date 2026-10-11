import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';
import {PHOTO_FRAME, PHOTO_ZOOM, TEAM_CROP, TEAM_DOT} from '../shared/handoffs';
import {CalloutLabel, CalloutLine, type IconName, type Side} from '../shared/Callout';
import {FrameBox, FramePill, FrameTab, TEAM_PLACE, TEAM_TAB, TeamPhoto} from '../shared/PhotoCard';

const scene = getScene('team');
const vo = (word: string, n = 0) => scene.voAt + wordTime('team', word, n);

// Scene 16 — the team. The coral point left by the finance block runs to the corner of a coral frame and
// draws it like a pen; the team photo (taken in Vilnius) is revealed behind the pen.
// As each name is said, a dot lands on the person and a navy line runs out to their label.
// At the end the labels retract and only the framed photo is left for the prototype card flip.
const T = {
  pen: 0.05,
  draw: 0.35,
  drawEnd: 0.95,
  tab: vo('fdi') - 0.05,
  place: 1.4,
  out: scene.seconds - 0.45,
};

const F = PHOTO_FRAME;
const CENTER = {x: F.x + F.w / 2, y: F.y + F.h / 2};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Positions in the source photo (1600×1200). anchor: where the line leaves the person. Labels sit outside
// the frame, two per side.
const PEOPLE: {
  name: string;
  role: string;
  icon: IconName;
  word: string;
  anchor: Pt;
  side: Side;
  labelY: number;
}[] = [
  {
    name: 'MARTIN',
    role: 'Voice AI & Machine Learning',
    icon: 'wave',
    word: 'martin',
    anchor: {x: 582, y: 517},
    side: 'left',
    labelY: 330,
  },
  {
    name: 'MARCO',
    role: 'Product Design & Finance',
    icon: 'chart',
    word: 'marco',
    anchor: {x: 692, y: 705},
    side: 'left',
    labelY: 690,
  },
  {
    name: 'VICTOR',
    role: 'Marketing & Go-to-Market',
    icon: 'map',
    word: 'victor',
    anchor: {x: 852, y: 730},
    side: 'right',
    labelY: 690,
  },
  {
    name: 'JAVIER',
    role: 'Hardware Engineering',
    icon: 'chip',
    word: 'javier',
    anchor: {x: 990, y: 513},
    side: 'right',
    labelY: 330,
  },
];
type Pt = {x: number; y: number};

// Source photo px -> screen px at zoom 1.
const K = F.w / TEAM_CROP.w;
const onScreen = (p: Pt): Pt => ({
  x: F.x + (p.x - TEAM_CROP.x) * K,
  y: F.y + (p.y - TEAM_CROP.y) * K,
});

// Point along the frame outline (clockwise from the top-left corner) for a 0..1 fraction.
const perimeterPoint = (k: number): Pt => {
  const total = 2 * (F.w + F.h);
  let d = k * total;
  if (d <= F.w) return {x: F.x + d, y: F.y};
  d -= F.w;
  if (d <= F.h) return {x: F.x + F.w, y: F.y + d};
  d -= F.h;
  if (d <= F.w) return {x: F.x + F.w - d, y: F.y + F.h};
  d -= F.w;
  return {x: F.x, y: F.y + F.h - d};
};

export const TeamScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // The point runs from the centre to the frame's top-left corner, then draws the frame.
  const run = interpolate(t, [T.pen, T.draw], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const draw = interpolate(t, [T.draw, T.drawEnd], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const pen =
    draw > 0
      ? perimeterPoint(draw)
      : {
          x: TEAM_DOT.x + (F.x - TEAM_DOT.x) * run,
          y: TEAM_DOT.y + (F.y - TEAM_DOT.y) * run,
        };
  const penR = TEAM_DOT.r * interpolate(draw, [0.85, 1], [1, 0], clamp) * (1 - 0.35 * Math.sin(run * Math.PI));
  // The photo is revealed left to right behind the pen.
  const wipe = interpolate(t, [T.draw + 0.1, T.drawEnd + 0.1], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const zoom = interpolate(t, [T.draw, scene.seconds], [PHOTO_ZOOM.from, PHOTO_ZOOM.to], clamp);
  const zoomed = (src: Pt): Pt => {
    const p = onScreen(src);
    return {
      x: CENTER.x + (p.x - CENTER.x) * zoom,
      y: CENTER.y + (p.y - CENTER.y) * zoom,
    };
  };

  // Each callout lands on its name.
  const at = PEOPLE.map((p) => vo(p.word));
  const out = interpolate(t, [T.out, scene.seconds - 1 / fps], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });

  return (
    <AbsoluteFill>
      <BrandBackground />

      {/* Photo */}
      {wipe > 0.002 && (
        <FrameBox style={{clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`}}>
          <TeamPhoto zoom={zoom} />
        </FrameBox>
      )}

      {/* Frame, pen, lines and person dots */}
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {draw > 0 && (
          <rect
            x={F.x}
            y={F.y}
            width={F.w}
            height={F.h}
            rx={F.radius}
            fill="none"
            stroke={COLORS.coral}
            strokeWidth={F.stroke}
            pathLength={1}
            strokeDasharray={`${draw} 1`}
          />
        )}
        {penR > 0.2 && <circle cx={pen.x} cy={pen.y} r={penR} fill={COLORS.coral} />}

        {PEOPLE.map((p, i) => (
          <CalloutLine key={p.name} t={t} at={at[i]} from={zoomed(p.anchor)} side={p.side} labelY={p.labelY} out={out} />
        ))}
      </svg>

      <FrameBox>
        <Tab t={t} />
        <Place t={t} />
      </FrameBox>
      {PEOPLE.map((p, i) => (
        <CalloutLabel key={p.name} side={p.side} y={p.labelY} title={p.name} sub={p.role} icon={p.icon} t={t} at={at[i]} out={out} />
      ))}

      <VoiceOver scene={scene} />
      <Sfx name="shimmer" at={T.draw + 0.1} volume={0.25} />
      <Sfx name="hit" at={T.tab} volume={0.35} />
      {at.map((a, i) => (
        <Sfx key={i} name="blip" at={a + 0.05} volume={0.3} />
      ))}
    </AbsoluteFill>
  );
};

// Coral tab on the frame's top-left corner with the team name.
const Tab: React.FC<{t: number}> = ({t}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - T.tab) * fps, fps, config: {damping: 13, stiffness: 240, mass: 0.6}});
  return <FrameTab {...TEAM_TAB} scale={s} />;
};

// Where the photo was taken: our first market, in a small pill inside the frame.
const Place: React.FC<{t: number}> = ({t}) => {
  const k = interpolate(t, [T.place, T.place + 0.4], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return <FramePill text={TEAM_PLACE} opacity={k} lift={(1 - k) * 12} />;
};
