import React from 'react';
import {COLORS, FONTS} from '../../brand/tokens';

// The phone of scene 2. The monitoring-gap box of the previous scene morphs into exactly this body.
export const PHONE = {x: 560, y: 545, w: 380, h: 780, radius: 64, tiltY: 8};

export const PhoneBody: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      borderRadius: 64,
      background: 'linear-gradient(145deg, #2A3A44 0%, #0B141A 45%, #1C2A33 100%)',
      padding: 13,
      boxShadow: '0 40px 70px rgba(9,38,52,0.28), 0 8px 18px rgba(9,38,52,0.18), inset 0 0 0 2px rgba(255,255,255,0.08)',
    }}
  >
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 52,
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${COLORS.navy} 0%, #06324A 60%, ${COLORS.navyDeep} 100%)`,
      }}
    >
      {/* status bar + dynamic island */}
      <div style={{position: 'absolute', top: 18, left: 34, right: 34, display: 'flex', justifyContent: 'space-between', fontFamily: FONTS.ui, fontWeight: 600, fontSize: 17, color: COLORS.white}}>
        <span>9:41</span>
        <span style={{letterSpacing: 2}}>●●● ▮</span>
      </div>
      <div style={{position: 'absolute', top: 14, left: '50%', width: 110, height: 32, marginLeft: -55, borderRadius: 20, background: '#000'}} />
      {children}
    </div>
  </div>
);
