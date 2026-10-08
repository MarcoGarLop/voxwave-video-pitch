// Hand-traced centerlines of the three logo strokes (logo units, viewBox 0 0 1254 1254).
// The intro waves morph onto these before the real filled shapes take over.
type Pt = [number, number];

export const LOGO_CENTERLINES: Record<'navy' | 'coral' | 'teal', {points: Pt[]; width: number}> = {
  navy: {
    width: 104,
    points: [[218, 420], [263, 500], [319, 600], [350, 652], [372, 676], [398, 662], [443, 600], [481, 550], [512, 508], [548, 480]],
  },
  coral: {
    width: 92,
    points: [[440, 522], [475, 468], [510, 425], [545, 400], [578, 396], [612, 418], [630, 470], [645, 535], [662, 600], [682, 656], [706, 684], [732, 672], [760, 638], [785, 602]],
  },
  teal: {
    width: 100,
    points: [[712, 612], [745, 568], [780, 532], [813, 522], [850, 558], [880, 612], [905, 655], [930, 664], [960, 625], [1000, 555], [1040, 482], [1068, 428]],
  },
};
