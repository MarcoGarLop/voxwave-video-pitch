// Geometry shared across scene cuts so each scene starts exactly where the previous one ended.

// Logo -> gap: the logo is pressed flat into a short ink line in the middle of a paper frame.
export const GAP_LINE = {x: 960, y: 540, width: 520, stroke: 4};

// Close-up -> "why": the coral "!" tile on the device screen pops out and lands as a coral point
// in the middle of a paper frame; the next scene grows it into the VoxWave card.
export const WHY_DOT = {x: 960, y: 540, r: 24};

// "why" -> radar: the split line of the "We measure | Doctors decide" band becomes the Y axis and the
// band's top edge the X axis; they cross here on an ink background when the radar scene starts.
export const RADAR_AXES = {cx: 960, cy: 540, color: 'rgba(241,237,228,0.42)', width: 2};

// Radar -> market: the camera centers VoxWave's coral point; the next scene opens it into the globe.
export const MARKET_DOT = {x: 960, y: 540, r: 16};

// Pay -> unit: the price tag ends flipped to its coral back ("€480 / year") in the middle of the frame.
export const TAG = {w: 380, h: 300, chamfer: 70, backScale: 1.35, cx: 960, cy: 540};

// Unit -> gate: the margin bars are forged into a coral key, lying horizontally under the gate scene's
// headline (bow center at x, y).
export const KEY = {x: 166, y: 272, len: 330, bow: 46, shaft: 18};

// Coral key: round bow, a shaft and two teeth, drawn around its bow center (draw the hole on top).
export const keyPath = (len: number, bow: number, shaft: number) => {
  const sx = bow * 0.8;
  const h = shaft / 2;
  return [
    `M ${-bow} 0 a ${bow} ${bow} 0 1 0 ${bow * 2} 0 a ${bow} ${bow} 0 1 0 ${-bow * 2} 0 Z`,
    `M ${sx} ${-h} H ${len} V ${h} H ${sx} Z`,
    `M ${len - shaft * 2.4} ${h} V ${h + shaft * 1.6} H ${len - shaft * 1.2} V ${h} Z`,
    `M ${len - shaft * 5} ${h} V ${h + shaft * 1.1} H ${len - shaft * 3.8} V ${h} Z`,
  ].join(' ');
};

// Gate -> payback: the closed CE door ends at the left on the timeline, which becomes the chart's x-axis.
export const DOOR = {w: 230, h: 360};
export const CHART = {axisY: 760, doorX: 220, x1: 1780};

// Payback -> scale: the camera dives into the 1,000-patient pin; its coral head ends centered on paper.
export const SCALE_DOT = {x: 960, y: 540, r: 16};

// Scale -> team: the European rings contract back into a coral point centered on paper.
export const TEAM_DOT = {x: 960, y: 540, r: 16};

// Team -> prototype: the team photo sits in a coral frame (4:3); the prototype photo appears in the same
// frame on the back of a card flip. TEAM_CROP is the 4:3 part of the 1600×1200 team photo that fills it.
export const PHOTO_FRAME = {x: 480, y: 190, w: 960, h: 720, stroke: 6, radius: 10};
export const TEAM_CROP = {x: 280, y: 315, w: 1040};
// Slow push-in on the photo across the team scene (the prototype scene starts at the end value).
export const PHOTO_ZOOM = {from: 1, to: 1.05};

// MVP -> close: the little wave under "Final Weekend." stretches across the screen, greys out and almost
// flattens; the closing scene starts on exactly that line. wavePath() draws both (same 61 points).
export const UNDERLINE = {x0: 120, x1: 820, y: 682, amp: 9};
export const CLOSE_WAVE = {x0: -10, x1: 1930, y: 540, amp: 4, stroke: 5, color: '#9AA2A2'};
export const wavePath = (x0: number, x1: number, y: number, amp: number, phase = 0) =>
  new Array(61)
    .fill(0)
    .map((_, i) => {
      const env = Math.sin((i / 60) * Math.PI);
      return `${i ? 'L' : 'M'} ${x0 + (i / 60) * (x1 - x0)} ${y + Math.sin(i * 0.85 + phase) * amp * env}`;
    })
    .join(' ');
