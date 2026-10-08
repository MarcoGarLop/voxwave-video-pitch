import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COLORS} from '../brand/tokens';
import {Grain} from './Grain';

// Default backdrop: flat matte off-white paper (or deep ink for "lights down" moments).
// No gradients, just fibre texture and a whisper of grain.
export const BrandBackground: React.FC<{grain?: number; tone?: 'paper' | 'ink'}> = ({grain, tone = 'paper'}) => (
  <AbsoluteFill style={{backgroundColor: tone === 'paper' ? COLORS.paper : COLORS.ink}}>
    <Grain opacity={grain ?? (tone === 'paper' ? 0.1 : 0.22)} animated={tone === 'paper' ? 0.05 : 0.08} />
  </AbsoluteFill>
);
