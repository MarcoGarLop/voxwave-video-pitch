import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {BrandBackground} from '../components/BrandBackground';

// Review sheet for Blender test frames, composited over the ink stage.
export const TestSheet: React.FC<{files: string[]; tone?: 'paper' | 'ink'}> = ({files, tone = 'ink'}) => (
  <AbsoluteFill>
    <BrandBackground tone={tone} />
    <AbsoluteFill style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr'}}>
      {files.map((f) => (
        <div key={f} style={{position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)'}}>
          <Img src={staticFile(f)} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
          <span style={{position: 'absolute', left: 8, top: 6, color: '#FF6E42', fontSize: 18, fontFamily: 'monospace'}}>{f.split('/').pop()}</span>
        </div>
      ))}
    </AbsoluteFill>
  </AbsoluteFill>
);
