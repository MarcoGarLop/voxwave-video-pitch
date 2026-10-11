import React from 'react';
import {Img, staticFile} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {Grain} from '../../components/Grain';
import {PHOTO_FRAME, TEAM_CROP} from './handoffs';

// Pieces of the framed photo card shared by the team scene and the prototype scene (which flips it).
// Everything here is laid out in frame-local px: place it inside a box at PHOTO_FRAME.
const F = PHOTO_FRAME;
const K = F.w / TEAM_CROP.w;

// A 4:3 photo filling the frame. crop: top-left of the shown area and its width, in source px.
export const FramePhoto: React.FC<{src: string; size: {w: number; h: number}; crop: {x: number; y: number; w: number}; zoom?: number}> = ({
  src,
  size,
  crop,
  zoom = 1,
}) => {
  const k = F.w / crop.w;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: F.radius, boxShadow: '0 30px 60px rgba(9,38,52,0.18)'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: '50% 50%'}}>
        <Img src={staticFile(src)} style={{position: 'absolute', left: -crop.x * k, top: -crop.y * k, width: size.w * k, height: size.h * k}} />
      </div>
      <Grain opacity={0.07} animated={0.04} />
    </div>
  );
};

export const TeamPhoto: React.FC<{zoom: number}> = ({zoom}) => (
  <FramePhoto src="team/team.jpg" size={{w: 1600, h: 1200}} crop={TEAM_CROP} zoom={zoom} />
);
// Source px of the team photo -> frame-local px at zoom 1.
export const teamPhotoPoint = (p: {x: number; y: number}) => ({x: (p.x - TEAM_CROP.x) * K, y: (p.y - TEAM_CROP.y) * K});

export const FrameOutline: React.FC<{draw?: number}> = ({draw = 1}) =>
  draw > 0 ? (
    <svg width={F.w} height={F.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <rect
        x={0}
        y={0}
        width={F.w}
        height={F.h}
        rx={F.radius}
        fill="none"
        stroke={COLORS.coral}
        strokeWidth={F.stroke}
        pathLength={1}
        strokeDasharray={draw < 1 ? `${draw} 1` : undefined}
      />
    </svg>
  ) : null;

// Coral tab sitting on the frame's top-left corner.
export const FrameTab: React.FC<{label: string; title: string; scale?: number}> = ({label, title, scale = 1}) =>
  scale > 0.001 ? (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: -58,
        height: 58,
        padding: '0 26px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        whiteSpace: 'nowrap',
        background: COLORS.coral,
        borderRadius: `${F.radius + 4}px ${F.radius + 4}px 0 0`,
        transform: `scaleY(${scale})`,
        transformOrigin: 'bottom',
      }}
    >
      <span style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 16, letterSpacing: 4, color: 'rgba(251,249,244,0.8)'}}>{label}</span>
      <span style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 30, color: COLORS.card}}>{title}</span>
    </div>
  ) : null;

// Small dark pill in the frame's bottom-right corner (where the photo was taken, what it shows…).
export const FramePill: React.FC<{text: string; opacity?: number; lift?: number}> = ({text, opacity = 1, lift = 0}) =>
  opacity > 0 ? (
    <div
      style={{
        position: 'absolute',
        right: 22,
        bottom: 22,
        height: 40,
        padding: '0 16px 0 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 20,
        background: 'rgba(9,38,52,0.78)',
        fontFamily: FONTS.ui,
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: 3,
        color: COLORS.card,
        whiteSpace: 'nowrap',
        opacity,
        transform: `translateY(${lift}px)`,
      }}
    >
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={COLORS.coral} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" />
        <circle cx={12} cy={10} r={2.3} />
      </svg>
      {text}
    </div>
  ) : null;

export const TEAM_TAB = {label: 'THE TEAM', title: 'FdiProtocol'};
export const TEAM_PLACE = 'VILNIUS, LITHUANIA';

// Box at the frame position; children are laid out in frame-local px.
export const FrameBox: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{position: 'absolute', left: F.x, top: F.y, width: F.w, height: F.h, ...style}}>{children}</div>
);
