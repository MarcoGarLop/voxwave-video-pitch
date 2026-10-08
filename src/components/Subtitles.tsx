import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../brand/tokens';
import type {SceneConfig} from '../scenes/config';
import {getVo} from '../data/vo';
// Karaoke-style captions driven by the TTS word timings.
export const Subtitles: React.FC<{scene: SceneConfig; bottom?: number}> = ({scene, bottom = 70}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entry = getVo(scene.id);

  const t = frame / fps - scene.voAt;
  const last = entry.words[entry.words.length - 1];
  const opacity = interpolate(t, [-0.2, 0, last.end + 0.3, last.end + 0.6], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        textAlign: 'center',
        fontFamily: FONTS.ui,
        fontWeight: 600,
        fontSize: 38,
        lineHeight: 1.35,
        opacity,
        padding: '0 220px',
      }}
    >
      {entry.words.map((w, i) => {
        const active = t >= w.start;
        return (
          <span key={i} style={{color: active ? COLORS.ink : 'rgba(9,38,52,0.3)'}}>
            {w.display}
            {i < entry.words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </div>
  );
};
