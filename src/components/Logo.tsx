import React from 'react';
import {COLORS} from '../brand/tokens';
import {LOGO, LOGO_VIEWBOX} from '../brand/logo';

// Static VoxWave logo. "dark" swaps navy for white and lifts the teal so it reads on navy backgrounds.
export const Logo: React.FC<{
  variant?: 'dark' | 'light';
  width: number;
  showWordmark?: boolean;
  style?: React.CSSProperties;
}> = ({variant = 'dark', width, showWordmark = true, style}) => {
  const fill = {
    navy: variant === 'dark' ? COLORS.white : COLORS.navy,
    teal: variant === 'dark' ? COLORS.tealBright : COLORS.teal,
    coral: COLORS.coral,
  };
  return (
    <svg
      viewBox={`0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}
      width={width}
      height={width}
      style={style}
    >
      {(['navy', 'teal', 'coral'] as const).map((k) => (
        <path key={k} d={LOGO.symbol[k].join('')} fill={fill[k]} />
      ))}
      {showWordmark &&
        (['navy', 'teal'] as const).map((k) => <path key={k} d={LOGO.wordmark[k].join('')} fill={fill[k]} />)}
    </svg>
  );
};
