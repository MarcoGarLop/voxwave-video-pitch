import React from 'react';
import {COLORS} from '../brand/tokens';
import {LOGO} from '../brand/logo';

// Full-color logo on a transparent background, cropped to its content. Used as a printed decal in Blender.
export const LogoDecal: React.FC = () => (
  <svg viewBox="135 335 1000 600" width={1000} height={600}>
    <path d={LOGO.symbol.navy.join('')} fill={COLORS.navy} />
    <path d={LOGO.symbol.teal.join('')} fill={COLORS.teal} />
    <path d={LOGO.symbol.coral.join('')} fill={COLORS.coral} />
    <path d={LOGO.wordmark.navy.join('')} fill={COLORS.navy} />
    <path d={LOGO.wordmark.teal.join('')} fill={COLORS.teal} />
  </svg>
);
