import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {BrandBackground} from '../components/BrandBackground';

// Review sheet: Blender preview renders composited over the brand background.
export const DevicePreview: React.FC = () => (
  <AbsoluteFill>
    <BrandBackground />
    <AbsoluteFill style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr'}}>
      {['hero', 'open', 'top', 'back'].map((n) => (
        <Img key={n} src={staticFile(`device/previews/device-${n}.png`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      ))}
    </AbsoluteFill>
  </AbsoluteFill>
);
