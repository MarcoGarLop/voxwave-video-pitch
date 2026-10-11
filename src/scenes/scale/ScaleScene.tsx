import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {geoCircle, geoDistance, geoOrthographic, geoPath} from 'd3-geo';
import {feature} from 'topojson-client';
import type {FeatureCollection, Geometry} from 'geojson';
import world from 'world-atlas/countries-50m.json';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {StageTag} from '../../components/StageTag';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';
import {SCALE_DOT, TEAM_DOT} from '../shared/handoffs';

// Scene 14 — scale. The coral point opens into a line-art map of the Baltics (ink on paper): the market
// as a kinetic equation, 16,000 × €480 ≈ €7.7M a year. Public health systems come next; then the
// camera pulls out over Europe and rings ripple out, greeting each country in its own language.

const scene = getScene('scale');
const vo = (word: string, n = 0) => scene.voAt + wordTime('scale', word, n);

const T = {
  map: 0.05,
  baltics: vo('baltics'),
  eq: vo('nearly') - 0.25,
  result: vo('million'),
  next: vo('next'),
  rest: vo('rest'),
  eu: vo('eu') - 0.35,
  rings: vo('eu'),
  language: vo('language'),
  exit: 9.6,
};

type FC = FeatureCollection<Geometry, {name: string}>;
const COUNTRIES = (feature(world as never, (world as never as {objects: {countries: never}}).objects.countries) as unknown as FC).features;
const BALTIC = new Set(['440', '428', '233']);
const EU = new Set(['040', '056', '100', '191', '196', '203', '208', '233', '246', '250', '276', '300', '348', '372', '380', '428', '440', '442', '470', '528', '616', '620', '642', '703', '705', '724', '752']);
const ORIGIN: [number, number] = [24.6, 56.9];

// Greetings, in each country's language, popping as the ring reaches them.
const HELLO: {id: string; word: string; at: [number, number]}[] = [
  {id: '440', word: 'Labas', at: [23.9, 55.3]},
  {id: '428', word: 'Sveiki', at: [25.2, 56.9]},
  {id: '233', word: 'Tere', at: [25.6, 58.7]},
  {id: '616', word: 'Cześć', at: [19.4, 52.1]},
  {id: '246', word: 'Hei', at: [26.0, 63.0]},
  {id: '752', word: 'Hej', at: [16.0, 62.0]},
  {id: '276', word: 'Hallo', at: [10.4, 51.1]},
  {id: '203', word: 'Ahoj', at: [15.4, 49.8]},
  {id: '348', word: 'Szia', at: [19.4, 47.2]},
  {id: '642', word: 'Bună', at: [25.0, 45.9]},
  {id: '528', word: 'Hoi', at: [5.6, 52.3]},
  {id: '380', word: 'Ciao', at: [12.6, 42.9]},
  {id: '250', word: 'Bonjour', at: [2.4, 46.6]},
  {id: '724', word: 'Hola', at: [-3.7, 40.3]},
  {id: '620', word: 'Olá', at: [-8.2, 39.7]},
];

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const INK = (a: number) => `rgba(9,38,52,${a})`;
const CORAL = (a: number) => `rgba(255,110,66,${a})`;

// Ring front: angular radius (degrees) reached over time; countries flash when it passes them.
const RING_SPEED = 9.5; // degrees per second
const ringAt = (t: number) => Math.max(0, (t - T.rings) * RING_SPEED);
const hitTime = (lonlat: [number, number]) => T.rings + (geoDistance(ORIGIN, lonlat) * 180) / Math.PI / RING_SPEED;

export const ScaleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Camera: Baltic close-up, then a pull-out over Europe.
  const out = Easing.inOut(Easing.cubic)(interpolate(t, [T.eu, T.eu + 1.3], [0, 1], clamp));
  const exit = Easing.inOut(Easing.cubic)(interpolate(t, [T.exit, scene.seconds - 1 / fps], [0, 1], clamp));
  const lon = 24.6 + (11 - 24.6) * out;
  const lat = 56.9 + (51 - 56.9) * out;
  const s = Math.exp(Math.log(4300) + (Math.log(1350) - Math.log(4300)) * out);
  const cx = 1250 + (1180 - 1250) * out;
  const cy = 560 + (585 - 560) * out;
  const projection = geoOrthographic().rotate([-lon, -lat]).scale(s).translate([cx, cy]).clipAngle(90);
  const path = geoPath(projection);

  // Opening: the coral point bursts into a ring that draws the map.
  const draw = interpolate(t, [T.map, T.map + 1.0], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const burst = interpolate(t, [0, 0.7], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const baltic = interpolate(t, [T.baltics - 0.1, T.baltics + 0.4], [0, 1], clamp);
  const fade = 1 - interpolate(exit, [0, 0.55], [0, 1], clamp);
  const ring = ringAt(t);

  return (
    <AbsoluteFill>
      <BrandBackground />

      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <pattern id="eu-hatch" width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={10} stroke={CORAL(0.45)} strokeWidth={2} />
          </pattern>
        </defs>
        <g opacity={fade}>
          {COUNTRIES.map((f) => {
            const id = String(f.id);
            const d = path(f);
            if (!d) return null;
            const isB = BALTIC.has(id);
            const hello = HELLO.find((h) => h.id === id);
            const hit = hello ? hitTime(hello.at) : 99;
            const flash = EU.has(id) ? interpolate(t, [hit, hit + 0.25, hit + 1.2], [0, 1, 0.45], clamp) : 0;
            return (
              <g key={id + f.properties.name}>
                {(isB || flash > 0) && <path d={d} fill={isB ? 'url(#eu-hatch)' : CORAL(0.1 * flash)} opacity={isB ? baltic : 1} />}
                <path
                  d={d}
                  fill="none"
                  stroke={isB ? (baltic > 0.5 ? COLORS.coral : INK(0.5)) : flash > 0.05 ? CORAL(0.4 + 0.6 * flash) : INK(0.32)}
                  strokeWidth={isB ? 1.4 + 1.8 * baltic : 1.1 + flash}
                  strokeLinejoin="round"
                  pathLength={1}
                  strokeDasharray={`${draw} 1`}
                />
              </g>
            );
          })}
          {/* Rings rippling out from the Baltics across Europe */}
          {[0, 3.2, 6.4].map((lag, i) => {
            const r = ring - lag * 3;
            if (r <= 0.5 || r > 34) return null;
            const d = path(geoCircle().center(ORIGIN).radius(r)());
            return <path key={i} d={d ?? ''} fill="none" stroke={COLORS.coral} strokeWidth={3} opacity={(1 - r / 34) * 0.9} />;
          })}
          <Greetings t={t} projection={projection} />
        </g>
        {/* Opening burst from the coral point */}
        {burst < 1 && <circle cx={SCALE_DOT.x} cy={SCALE_DOT.y} r={SCALE_DOT.r + burst * 700} fill="none" stroke={COLORS.coral} strokeWidth={5 * (1 - burst)} opacity={1 - burst} />}
        {t < 0.35 && <circle cx={SCALE_DOT.x} cy={SCALE_DOT.y} r={SCALE_DOT.r * (1 - t / 0.35)} fill={COLORS.coral} />}
        {/* Closing: everything contracts into the point of the next block */}
        {exit > 0 && <circle cx={TEAM_DOT.x} cy={TEAM_DOT.y} r={interpolate(exit, [0.3, 1], [0, TEAM_DOT.r], clamp)} fill={COLORS.coral} />}
        {exit > 0 && exit < 1 && <circle cx={TEAM_DOT.x} cy={TEAM_DOT.y} r={TEAM_DOT.r + (1 - exit) * 900} fill="none" stroke={COLORS.coral} strokeWidth={4 * exit} opacity={exit} />}
      </svg>

      <Equation t={t} fade={fade} />
      <Next t={t} fade={fade} />
      <OneLanguage t={t} fade={fade} />

      <StageTag label="ESTIMATE · 16,000 BALTIC PATIENTS × €480 / YEAR" opacity={interpolate(t, [T.eq, T.eq + 0.4], [0, 1], clamp) * fade} />

      <VoiceOver scene={scene} />
      <Sfx name="shimmer" at={0.3} volume={0.3} />
      <Sfx name="hit" at={T.baltics} volume={0.4} />
      <Sfx name="blip" at={T.eq + 0.25} volume={0.3} />
      <Sfx name="blip" at={T.eq + 0.55} volume={0.3} />
      <Sfx name="impact" at={T.result} volume={0.5} />
      <Sfx name="blip-low" at={T.rest} volume={0.35} />
      <Sfx name="whoosh" at={T.eu} volume={0.4} />
      <Sfx name="sonar-ping" at={T.rings} volume={0.4} />
      {HELLO.slice(3).map((h, i) => (
        <Sfx key={h.id} name="blip" at={hitTime(h.at)} volume={0.12 + (i % 3) * 0.03} />
      ))}
      <Sfx name="whoosh" at={T.exit} volume={0.35} />
    </AbsoluteFill>
  );
};

// "Hello" in each language, popping where the ring reaches.
const Greetings: React.FC<{t: number; projection: ReturnType<typeof geoOrthographic>}> = ({t, projection}) => {
  const {fps} = useVideoConfig();
  return (
    <g>
      {HELLO.map((h, i) => {
        const at = i < 3 ? T.baltics + i * 0.15 : hitTime(h.at);
        const s = spring({frame: (t - at) * fps, fps, config: {damping: 10, stiffness: 240, mass: 0.6}});
        if (s <= 0.001) return null;
        const p = projection(h.at);
        if (!p) return null;
        const size = i < 3 ? 30 : 26;
        return (
          <g key={h.id} transform={`translate(${p[0]} ${p[1]}) scale(${s})`}>
            <text y={size * 0.35} textAnchor="middle" fontFamily={FONTS.display} fontWeight={800} fontSize={size} fill={i < 3 ? COLORS.coral : COLORS.ink} stroke={COLORS.paper} strokeWidth={6} paintOrder="stroke">
              {h.word}
            </text>
          </g>
        );
      })}
    </g>
  );
};

// 16,000 × €480 ≈ €7.7M / year as kinetic type.
const Equation: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const sp = (at: number) => spring({frame: (t - at) * fps, fps, config: {damping: 12, stiffness: 260, mass: 0.6}});
  const a = sp(T.eq);
  const x = sp(T.eq + 0.25);
  const b = sp(T.eq + 0.45);
  const r = sp(T.result);
  const n = interpolate(t, [T.result, T.result + 0.9], [0, 7.7], {...clamp, easing: Easing.out(Easing.cubic)});
  const shrink = Easing.inOut(Easing.cubic)(interpolate(t, [T.next - 0.2, T.next + 0.4], [0, 1], clamp));
  const slam = (k: number): React.CSSProperties => ({display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * 40}px) scale(${1.3 - 0.3 * k})`});
  return (
    <div style={{position: 'absolute', left: 110, top: 240, opacity: fade, transformOrigin: '0 0', transform: `translateY(${-90 * shrink}px) scale(${1 - 0.3 * shrink})`}}>
      <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 20, letterSpacing: 5, color: COLORS.coral, opacity: interpolate(t, [T.baltics - 0.2, T.baltics + 0.2], [0, 1], clamp)}}>THE BALTIC MARKET</div>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 22, marginTop: 18, fontFamily: FONTS.display, fontWeight: 800, color: COLORS.ink}}>
        <span style={{...slam(a), fontSize: 70}}>16,000</span>
        <span style={{...slam(x), fontSize: 54, color: COLORS.coral}}>×</span>
        <span style={{...slam(b), fontSize: 70}}>€480</span>
      </div>
      <div style={{display: 'flex', gap: 22, fontFamily: FONTS.ui, fontSize: 18, letterSpacing: 2, color: COLORS.inkSoft, marginTop: 4}}>
        <span style={{width: 220, opacity: a}}>patients</span>
        <span style={{opacity: b, marginLeft: 50}}>per patient / year</span>
      </div>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 22, opacity: r, transform: `scale(${1.25 - 0.25 * r})`, transformOrigin: 'left center'}}>
        <span style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 60, color: COLORS.coral}}>≈</span>
        <span style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 150, color: COLORS.coral, lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>€{n.toFixed(1)}M</span>
        <span style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 24, letterSpacing: 4, color: COLORS.ink}}>/ YEAR</span>
      </div>
    </div>
  );
};

// What comes next: the rest of the EU.
const Next: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const pill = (at: number, label: string, icon: 'hospital' | 'eu') => {
    const s = spring({frame: (t - at) * fps, fps, config: {damping: 11, stiffness: 220}});
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '12px 22px 12px 14px', borderRadius: 40, border: `2.5px solid ${COLORS.ink}`, background: COLORS.card, opacity: s, transform: `translateX(${(1 - s) * -50}px) scale(${0.8 + 0.2 * s})`, transformOrigin: 'left center'}}>
        <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={COLORS.coral} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          {icon === 'hospital' ? (
            <>
              <rect x={4} y={4} width={16} height={17} rx={2} />
              <path d="M12 8 V14 M9 11 H15 M9 21 V17 H15 V21" />
            </>
          ) : (
            <>
              {new Array(10).fill(0).map((_, i) => (
                <circle key={i} cx={12 + 7.5 * Math.cos((i / 10) * 2 * Math.PI)} cy={12 + 7.5 * Math.sin((i / 10) * 2 * Math.PI)} r={1.2} fill={COLORS.coral} stroke="none" />
              ))}
            </>
          )}
        </svg>
        <span style={{fontFamily: FONTS.display, fontWeight: 700, fontSize: 28, color: COLORS.ink, whiteSpace: 'nowrap'}}>{label}</span>
      </div>
    );
  };
  const tag = interpolate(t, [T.next - 0.1, T.next + 0.3], [0, 1], clamp);
  const lift = Easing.inOut(Easing.cubic)(interpolate(t, [T.eu - 0.2, T.eu + 0.4], [0, 1], clamp));
  return (
    <div style={{position: 'absolute', left: 110, top: 640 - 120 * lift, opacity: fade * (1 - 0.0 * lift)}}>
      <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 20, letterSpacing: 5, color: COLORS.coral, opacity: tag}}>NEXT</div>
      <div style={{display: 'flex', gap: 14, marginTop: 14}}>
        {pill(T.rest, 'The rest of the EU', 'eu')}
      </div>
    </div>
  );
};

// "One language at a time." — closes the scene.
const OneLanguage: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const words = ['One', 'language', 'at a time.'];
  const ats = [vo('one'), vo('language'), vo('at')];
  return (
    <div style={{position: 'absolute', left: 110, top: 760, display: 'flex', gap: 20, fontFamily: FONTS.display, fontWeight: 800, fontSize: 76, color: COLORS.ink, opacity: fade, whiteSpace: 'nowrap'}}>
      {words.map((w, i) => {
        const s = spring({frame: (t - ats[i]) * fps, fps, config: {damping: 12, stiffness: 260, mass: 0.6}});
        return (
          <span key={w} style={{display: 'inline-block', opacity: s, transform: `translateY(${(1 - s) * 40}px) scale(${1.25 - 0.25 * s})`, transformOrigin: 'left bottom', color: i === 1 ? COLORS.coral : COLORS.ink}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};
