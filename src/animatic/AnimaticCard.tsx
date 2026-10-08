import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../brand/tokens';
import {BrandBackground} from '../components/BrandBackground';
import {Logo} from '../components/Logo';
import {Subtitles} from '../components/Subtitles';
import {VoiceOver} from '../components/VoiceOver';
import {SCENES, sceneFrames, type SceneConfig} from '../scenes/config';

// Placeholder for a scene that has not been built yet: shows timing, on-screen copy, VO and the visual brief.
export const AnimaticCard: React.FC<{scene: SceneConfig}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const index = SCENES.findIndex((s) => s.id === scene.id);

  const items = scene.id === 's01' ? [] : scene.onScreen;
  const span = (scene.seconds - scene.voAt - 0.8) / Math.max(items.length, 1);

  return (
    <AbsoluteFill>
      <BrandBackground />
      <VoiceOver scene={scene} />

      <div style={{position: 'absolute', top: 60, left: 90, right: 90, display: 'flex', justifyContent: 'space-between', fontFamily: FONTS.ui, fontSize: 22, letterSpacing: 4, color: COLORS.teal, fontWeight: 600}}>
        <span>VOXWAVE · BLOCK 2 — SOLUTION · ANIMATIC</span>
        <span style={{color: COLORS.ink}}>{scene.slot}</span>
      </div>

      <div style={{position: 'absolute', top: 120, left: 90, fontFamily: FONTS.display, color: COLORS.ink, display: 'flex', alignItems: 'baseline', gap: 24}}>
        <span style={{fontSize: 96, fontWeight: 800, color: COLORS.coral}}>{String(index + 1).padStart(2, '0')}</span>
        <span style={{fontSize: 44, fontWeight: 600}}>{scene.title}</span>
      </div>

      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 18, top: -40}}>
        {scene.id === 's01' && (
          <div style={{transform: `scale(${spring({frame: frame - scene.voAt * fps + 20, fps, config: {damping: 14}})})`}}>
            <Logo width={520} variant="light" />
          </div>
        )}
        {items.map((text, i) => {
          const at = Math.round((scene.voAt + i * span) * fps);
          const s = spring({frame: frame - at, fps, config: {damping: 12, mass: 0.6}});
          return (
            <div key={text} style={{fontFamily: FONTS.display, fontWeight: 700, fontSize: items.length > 3 ? 60 : 76, color: COLORS.ink, opacity: s, transform: `translateY(${(1 - s) * 40}px) scale(${0.9 + s * 0.1})`}}>
              {text}
            </div>
          );
        })}
      </AbsoluteFill>

      <div style={{position: 'absolute', left: 90, right: 90, bottom: 200, fontFamily: FONTS.ui, color: COLORS.inkSoft, fontSize: 25, lineHeight: 1.45, borderLeft: `4px solid ${COLORS.coral}`, paddingLeft: 24}}>
        <div style={{fontSize: 16, letterSpacing: 4, color: COLORS.coral, fontWeight: 700, marginBottom: 6}}>VISUAL</div>
        {scene.visual}
      </div>

      <Subtitles scene={scene} bottom={110} />

      <div style={{position: 'absolute', left: 90, right: 90, bottom: 50, display: 'flex', gap: 8}}>
        {SCENES.map((s, i) => {
          const progress = i < index ? 1 : i > index ? 0 : frame / durationInFrames;
          return (
            <div key={s.id} style={{flex: sceneFrames(s), height: 8, borderRadius: 4, background: COLORS.inkFaint, overflow: 'hidden'}}>
              <div style={{width: `${interpolate(progress, [0, 1], [0, 100])}%`, height: '100%', background: i === index ? COLORS.coral : COLORS.teal}} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
