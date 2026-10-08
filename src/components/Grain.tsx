import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

// Static paper fibres + a light animated film grain, multiplied over the background for a matte, printed feel.
export const Grain: React.FC<{opacity?: number; animated?: number}> = ({opacity = 0.1, animated = 0.05}) => {
  const frame = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{opacity, mixBlendMode: 'multiply', pointerEvents: 'none'}}>
        <svg width="100%" height="100%">
          <filter id="paper-fibres">
            <feTurbulence type="fractalNoise" baseFrequency="0.55 0.9" numOctaves={3} seed={7} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncR type="linear" slope={0.5} intercept={0.55} />
              <feFuncG type="linear" slope={0.5} intercept={0.55} />
              <feFuncB type="linear" slope={0.5} intercept={0.55} />
            </feComponentTransfer>
          </filter>
          <rect width="100%" height="100%" filter="url(#paper-fibres)" />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: animated, mixBlendMode: 'multiply', pointerEvents: 'none'}}>
        <svg width="100%" height="100%">
          <filter id={`film-grain-${frame % 24}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves={1} seed={frame % 24} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#film-grain-${frame % 24})`} />
        </svg>
      </AbsoluteFill>
    </>
  );
};
