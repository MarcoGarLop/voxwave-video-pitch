import React from 'react';
import {AbsoluteFill} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Silkscreen';
import {COLORS} from '../brand/tokens';

const {fontFamily: PIXEL} = loadFont('normal', {weights: ['400', '700'], subsets: ['latin']});

export type ScreenVariant = 'ready' | 'listening' | 'alert';

// Content of the device's small OLED screen. Rendered to PNG and used as an emissive texture in Blender.
export const DeviceScreen: React.FC<{variant: ScreenVariant}> = ({variant}) => {
  const bars = [3, 6, 10, 7, 12, 5, 9, 4, 8, 11, 6, 3];
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: PIXEL, color: COLORS.white, padding: 26, imageRendering: 'pixelated'}}>
      {variant === 'ready' && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 18}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 6, height: 56}}>
            {bars.map((h, i) => (
              <div key={i} style={{width: 12, height: h * 4.5, background: i % 3 === 1 ? COLORS.coral : COLORS.white}} />
            ))}
          </div>
          <div style={{fontSize: 40, fontWeight: 700, letterSpacing: 2}}>READY</div>
          <div style={{fontSize: 26, opacity: 0.85}}>PRESS TO SPEAK</div>
        </AbsoluteFill>
      )}
      {variant === 'listening' && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 18}}>
          <div style={{fontSize: 34, fontWeight: 700, color: COLORS.coral}}>● LISTENING</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 6, height: 70}}>
            {[...bars, ...bars.slice(0, 6)].map((h, i) => (
              <div key={i} style={{width: 10, height: h * 5.5, background: COLORS.white}} />
            ))}
          </div>
        </AbsoluteFill>
      )}
      {variant === 'alert' && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center'}}>
          <div style={{width: 64, height: 64, background: COLORS.coral, color: '#000', fontSize: 52, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>!</div>
          <div style={{fontSize: 34, fontWeight: 700, lineHeight: 1.15}}>CONTACT YOUR<br />NEUROLOGIST</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
