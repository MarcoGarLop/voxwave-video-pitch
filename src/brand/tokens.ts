import {loadFont as loadSora} from '@remotion/google-fonts/Sora';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';

// Brand palette. Everything on screen is built from these values.
export const COLORS = {
  navy: '#092634',
  teal: '#004E72',
  coral: '#FF6E42',
  // Derived tints, same hues, used where the base colors lack contrast on dark backgrounds.
  navyDeep: '#04141C',
  tealBright: '#2F9BCB',
  coralSoft: '#FF9A7A',
  white: '#F4F8FA',
  // Matte paper base (off-white) and ink tones used on it.
  paper: '#F1EDE4',
  paperShade: '#E4DED2',
  card: '#FBF9F4',
  ink: '#092634',
  inkSoft: 'rgba(9,38,52,0.55)',
  inkFaint: 'rgba(9,38,52,0.12)',
  black: '#000000',
} as const;

export const FONTS = {
  display: loadSora('normal', {weights: ['400', '600', '700', '800'], subsets: ['latin']}).fontFamily,
  ui: loadInter('normal', {weights: ['400', '500', '600', '700'], subsets: ['latin']}).fontFamily,
} as const;

export const VIDEO = {width: 1920, height: 1080, fps: 30} as const;
