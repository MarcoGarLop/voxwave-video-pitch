import React from 'react';
import {AbsoluteFill} from 'remotion';
import {LOGO} from '../brand/logo';

// Debug helper: logo symbol over a coordinate grid (logo units), plus optional centerline overlays.
export const LogoGrid: React.FC<{lines?: Record<string, [number, number][]>}> = ({lines = {}}) => {
  const grid = [];
  for (let v = 100; v <= 1200; v += 50) {
    grid.push(<line key={`x${v}`} x1={v} y1={300} x2={v} y2={800} stroke={v % 100 ? '#ddd' : '#999'} strokeWidth={1} />);
    if (v % 100 === 0) grid.push(<text key={`tx${v}`} x={v + 2} y={315} fontSize={14}>{v}</text>);
  }
  for (let v = 300; v <= 800; v += 50) {
    grid.push(<line key={`y${v}`} x1={100} y1={v} x2={1200} y2={v} stroke={v % 100 ? '#ddd' : '#999'} strokeWidth={1} />);
    if (v % 100 === 0) grid.push(<text key={`ty${v}`} x={102} y={v - 2} fontSize={14}>{v}</text>);
  }
  return (
    <AbsoluteFill style={{background: 'white'}}>
      <svg viewBox="100 300 1100 500" width={1920} height={873}>
        {grid}
        <path d={LOGO.symbol.navy.join('')} fill="#092634" opacity={0.55} />
        <path d={LOGO.symbol.coral.join('')} fill="#FF6E42" opacity={0.55} />
        <path d={LOGO.symbol.teal.join('')} fill="#004E72" opacity={0.55} />
        {Object.entries(lines).map(([k, pts]) => (
          <polyline key={k} points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="lime" strokeWidth={4} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
