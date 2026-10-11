import React from 'react';
import {COLORS, FONTS} from '../brand/tokens';

// Small honest-labelling tag in the bottom-left corner ("PROTOTYPE", "ILLUSTRATIVE DATA").
export const StageTag: React.FC<{label: string; opacity?: number; tone?: 'paper' | 'ink'}> = ({label, opacity = 1, tone = 'paper'}) => (
  <div
    style={{
      position: 'absolute',
      left: 64,
      bottom: 52,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: FONTS.ui,
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: 4,
      color: tone === 'paper' ? COLORS.inkSoft : 'rgba(241,237,228,0.6)',
      opacity,
    }}
  >
    <span style={{width: 8, height: 8, borderRadius: '50%', background: COLORS.coral}} />
    {label}
  </div>
);
