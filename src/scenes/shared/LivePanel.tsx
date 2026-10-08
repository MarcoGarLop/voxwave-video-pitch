import React from 'react';
import {COLORS, FONTS} from '../../brand/tokens';
import {scrollingBars, voiceLevel} from '../../lib/voiceSignal';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';

// Geometry shared by scene 2 (where the panel lives) and scene 3 (which starts inside it).
export const PANEL = {x: 1300, y: 540, w: 800, h: 460};

// Scene 2 ends pushed into the waveform; scene 3 picks up from exactly this camera state.
export const WAVE_HANDOFF = {
  scale: 1.6,
  translateX: 960 - PANEL.x,
  // Signal clock offset: scene 3 time + this = scene 2 time, so the waveform keeps scrolling seamlessly.
  clockOffset: 7,
  // Scene 2 time at which the call is accepted and the live waveform starts.
  accept: getScene('s02').voAt + wordTime('s02', 'just') - 0.3,
  liveStart: getScene('s02').voAt + wordTime('s02', 'just') - 0.3 + 0.15,
};

// Scene 1 ends with the logo shrinking into the VoxWave bubble floating by the phone of scene 2 (screen px).
// unitPx: logo units -> px for the symbol at the very first frame of scene 2; symbol: its center in logo units.
export const AVATAR_HANDOFF = {x: 760, y: 236, r: 54, unitPx: 78 / 954, symbol: {x: 634, y: 560}};

// Bars center in unscaled screen coordinates (used to fly copies of the waveform around).
export const BARS_CENTER = {x: PANEL.x - PANEL.w / 2 + 378, y: PANEL.y + 20, width: 725};

// Glass card with a right-to-left scrolling voice waveform.
export const LivePanel: React.FC<{t: number; start: number; chrome: number; id?: string}> = ({t, start, chrome, id = 'lp'}) => {
  const COUNT = 64;
  const SLICE = 0.055;
  const GAP = 11.5;
  const bars = scrollingBars(t, COUNT, SLICE, start, 'patient');
  const live = t >= start;
  const elapsed = Math.max(0, t - start);
  const flatPulse = 0.5 + 0.5 * Math.sin(t * 4);
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 36,
        background: `rgba(251, 249, 244, ${chrome})`,
        border: `1.5px solid rgba(9,38,52,${0.12 * chrome})`,
        boxShadow: `0 30px 60px rgba(9,38,52,${0.1 * chrome})`,
        fontFamily: FONTS.ui,
        color: COLORS.ink,
      }}
    >
      <div style={{position: 'absolute', top: 30, left: 40, right: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 20, letterSpacing: 3.5, fontWeight: 600, opacity: chrome}}>
        <span style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <span style={{width: 14, height: 14, borderRadius: '50%', background: live ? COLORS.coral : COLORS.inkSoft, transform: `scale(${live ? 0.85 + flatPulse * 0.3 : 1})`}} />
          {live ? 'LIVE VOICE SIGNAL' : 'WAITING FOR CALL'}
        </span>
        <span style={{fontVariantNumeric: 'tabular-nums', opacity: 0.8}}>00:{String(Math.floor(elapsed)).padStart(2, '0')}</span>
      </div>

      <svg width={PANEL.w} height={PANEL.h} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id={`${id}-fade`} x1="0" x2="1">
            <stop offset="0" stopColor="white" stopOpacity={0} />
            <stop offset="0.18" stopColor="white" stopOpacity={1} />
          </linearGradient>
          <mask id={`${id}-mask`}>
            <rect width={PANEL.w} height={PANEL.h} fill={`url(#${id}-fade)`} />
          </mask>
        </defs>
        <line x1={40} x2={PANEL.w - 40} y1={PANEL.h / 2 + 20} y2={PANEL.h / 2 + 20} stroke={COLORS.inkFaint} strokeWidth={2} strokeDasharray="4 8" />
        <g mask={`url(#${id}-mask)`}>
          {bars.map((b) => {
            const x = PANEL.w - 60 - b.offset * GAP;
            const h = 4 + b.level * 290;
            return (
              <rect
                key={b.index}
                x={x - 3.5}
                y={PANEL.h / 2 + 20 - h / 2}
                width={7}
                height={h}
                rx={3.5}
                fill={b.index >= COUNT - 9 ? COLORS.coral : COLORS.teal}
              />
            );
          })}
        </g>
        {/* playhead */}
        {live && <circle cx={PANEL.w - 60} cy={PANEL.h / 2 + 20} r={7 + voiceLevel(t, 'patient') * 6} fill={COLORS.coral} />}
      </svg>
    </div>
  );
};

