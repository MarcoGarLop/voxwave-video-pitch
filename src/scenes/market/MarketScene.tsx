import React from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {geoGraticule10, geoOrthographic, geoPath} from 'd3-geo';
import {feature} from 'topojson-client';
import type {Feature, FeatureCollection, Geometry} from 'geojson';
import world from 'world-atlas/countries-50m.json';
import {COLORS, FONTS} from '../../brand/tokens';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {StageTag} from '../../components/StageTag';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {getScene} from '../config';
import {MARKET_DOT} from '../shared/handoffs';

// Scene 9 — market size and go-to-market. VoxWave's coral point opens into a spinning line-art globe;
// each zoom (world -> Baltics -> Lithuania) reveals its number as TAM / SAM / SOM, then the camera
// lands on the Kaunas–Vilnius corridor where the first customers and partners are.

const scene = getScene('market');
const vo = (word: string, n = 0) => scene.voAt + wordTime('market', word, n);

const T = {
  open: 0,
  tam: vo('ten'),
  baltZoom: vo('sixteen') - 0.3,
  sam: vo('sixteen'),
  ltZoom: vo('start'),
  som: vo('lithuania'),
  // The 1,000 is our target, not Lithuania's total: it lands on its own, after the Lithuania figure.
  target: vo('lithuania') + 0.9,
  clinics: vo('neuro-rehab'),
  homes: vo('hospitals'),
  corridorZoom: vo('hospitals') + 0.45,
  vilnius: vo('vilnius'),
  kaunas: vo('kaunas'),
  assoc: vo('patient'),
  univ: vo('university'),
  doors: vo('opening'),
  exit: scene.seconds - 0.9,
};

type FC = FeatureCollection<Geometry, {name: string}>;
const COUNTRIES = (feature(world as never, (world as never as {objects: {countries: never}}).objects.countries) as unknown as FC).features;
const BALTIC = new Set(['440', '428', '233']);
const LT = COUNTRIES.find((f) => String(f.id) === '440') as Feature<Geometry, {name: string}>;
const GRATICULE = geoGraticule10();

const VILNIUS: [number, number] = [25.28, 54.687];
const KAUNAS: [number, number] = [23.903, 54.898];

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const PAPER = (a: number) => `rgba(241,237,228,${a})`;
const TEAL = (a: number) => `rgba(47,155,203,${a})`;
const CORAL = (a: number) => `rgba(255,110,66,${a})`;

// Camera: globe center (lon, lat), orthographic scale (px per radian) and where the center sits on screen.
type Cam = {lon: number; lat: number; s: number; cx: number; cy: number};
const KEYS: {t: number; c: Cam; ease?: (x: number) => number}[] = [
  {t: 0, c: {lon: -110, lat: 12, s: MARKET_DOT.r, cx: 960, cy: 540}},
  {t: 0.9, c: {lon: -60, lat: 22, s: 360, cx: 1180, cy: 560}, ease: Easing.out(Easing.cubic)},
  {t: 3.9, c: {lon: 22, lat: 50, s: 380, cx: 1180, cy: 560}, ease: Easing.out(Easing.cubic)},
  {t: 0, c: {lon: 24.6, lat: 57.2, s: 5400, cx: 1180, cy: 560}},
  {t: 0, c: {lon: 23.9, lat: 55.25, s: 13500, cx: 1180, cy: 560}},
  {t: 0, c: {lon: 24.6, lat: 54.82, s: 25000, cx: 1100, cy: 560}},
];
KEYS[3].t = T.sam + 0.2;
KEYS[3].ease = Easing.inOut(Easing.cubic);
KEYS[4].t = T.som + 0.3;
KEYS[4].ease = Easing.inOut(Easing.cubic);
KEYS[5].t = T.vilnius - 0.05;
KEYS[5].ease = Easing.inOut(Easing.cubic);
// Segment start times (each zoom begins a little before its number lands).
const STARTS = [0, 0, 0.9, T.baltZoom, T.ltZoom, T.corridorZoom];

const camAt = (t: number): Cam => {
  let i = KEYS.length - 1;
  while (i > 0 && t < STARTS[i]) i--;
  if (i === 0) return KEYS[0].c;
  const a = KEYS[i - 1].c;
  const b = KEYS[i].c;
  const k = (KEYS[i].ease ?? ((x: number) => x))(interpolate(t, [STARTS[i], KEYS[i].t], [0, 1], clamp));
  return {
    lon: a.lon + (b.lon - a.lon) * k,
    lat: a.lat + (b.lat - a.lat) * k,
    s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * k),
    cx: a.cx + (b.cx - a.cx) * k,
    cy: a.cy + (b.cy - a.cy) * k,
  };
};

export const MarketScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Exit: everything fades and Lithuania collapses back into a coral point in the center.
  const exit = Easing.inOut(Easing.cubic)(interpolate(t, [T.exit, scene.seconds - 1 / fps], [0, 1], clamp));
  let cam = camAt(t);
  if (exit > 0) {
    cam = {
      lon: cam.lon + (23.9 - cam.lon) * exit,
      lat: cam.lat + (55.3 - cam.lat) * exit,
      s: Math.exp(Math.log(cam.s) + (Math.log(250) - Math.log(cam.s)) * exit),
      cx: cam.cx + (960 - cam.cx) * exit,
      cy: cam.cy + (540 - cam.cy) * exit,
    };
  }
  const projection = geoOrthographic().rotate([-cam.lon, -cam.lat]).scale(cam.s).translate([cam.cx, cam.cy]).clipAngle(90);
  const path = geoPath(projection);
  const fade = 1 - interpolate(exit, [0, 0.5], [0, 1], clamp);

  // The globe opens out of the coral point: disc fill goes from coral to a faint teal.
  const born = interpolate(t, [0.05, 0.7], [0, 1], clamp);
  const land = interpolate(t, [0.25, 0.9], [0, 1], clamp);
  const baltic = interpolate(t, [T.sam - 0.1, T.sam + 0.4], [0, 1], clamp);
  const lt = interpolate(t, [T.som - 0.1, T.som + 0.7], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const others = 1 - 0.55 * lt;

  return (
    <AbsoluteFill>
      <BrandBackground tone="ink" />

      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <pattern id="lt-hatch" width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={14} stroke={CORAL(0.32)} strokeWidth={2} />
          </pattern>
        </defs>
        <path d={path({type: 'Sphere'}) ?? ''} fill={TEAL(0.05 * born * fade)} stroke={PAPER(0.3 * born * fade)} strokeWidth={1.5} />
        {born < 1 && <path d={path({type: 'Sphere'}) ?? ''} fill={COLORS.coral} opacity={1 - born} />}
        <path d={path(GRATICULE) ?? ''} fill="none" stroke={PAPER(0.07 * fade)} strokeWidth={1} />
        <g opacity={land * fade}>
          {COUNTRIES.map((f) => {
            const id = String(f.id);
            if (id === '440') return null;
            const isBaltic = BALTIC.has(id);
            return (
              <path
                key={id + f.properties.name}
                d={path(f) ?? ''}
                fill={isBaltic ? TEAL(0.06 + 0.16 * baltic) : PAPER(0.06 * others)}
                stroke={isBaltic ? interpolateColors(baltic, [0, 1], [PAPER(0.3), COLORS.tealBright]) : PAPER(0.26 * others)}
                strokeWidth={isBaltic ? 1 + baltic : 0.9}
                strokeLinejoin="round"
              />
            );
          })}
          {/* Lithuania: drawn on in coral as the first market */}
          <path d={path(LT) ?? ''} fill={COLORS.navyDeep} fillOpacity={0.5 * lt} stroke={PAPER(0.3)} strokeWidth={1} />
          <path d={path(LT) ?? ''} fill="url(#lt-hatch)" opacity={lt} />
          <path d={path(LT) ?? ''} fill="none" stroke={COLORS.coral} strokeWidth={3} strokeLinejoin="round" pathLength={1} strokeDasharray={`${lt} 1`} />
        </g>
        <MarketRings t={t} projection={projection} cam={cam} fade={fade} />
        <Labels3 t={t} projection={projection} fade={fade} />
        <Corridor t={t} projection={projection} fade={fade} />
        {/* The point of the next scene */}
        {exit > 0 && <circle cx={960} cy={540} r={MARKET_DOT.r * interpolate(exit, [0.5, 1], [0, 1], clamp)} fill={COLORS.coral} />}
      </svg>

      <Funnel t={t} fade={fade} />
      <EntryCard t={t} fade={fade} />
      <Badges t={t} projection={projection} fade={fade} />

      <StageTag label="ESTIMATES · GBD 2021 · BALTIC PREVALENCE (BMC 2026)" tone="ink" opacity={interpolate(t, [T.tam, T.tam + 0.5], [0, 1], clamp) * fade} />

      <VoiceOver scene={scene} />
      <Sfx name="shimmer" at={0.3} volume={0.3} />
      <Sfx name="hit" at={T.tam} volume={0.45} />
      <Sfx name="whoosh" at={T.baltZoom} volume={0.35} />
      <Sfx name="hit" at={T.sam} volume={0.45} />
      <Sfx name="impact" at={T.som} volume={0.45} />
      <Sfx name="blip" at={T.clinics} volume={0.3} />
      <Sfx name="blip" at={T.homes} volume={0.3} />
      <Sfx name="sonar-ping" at={T.vilnius} volume={0.4} />
      <Sfx name="sonar-ping" at={T.kaunas} volume={0.4} />
      <Sfx name="blip-low" at={T.assoc} volume={0.3} />
      <Sfx name="blip-low" at={T.univ} volume={0.3} />
      <Sfx name="sonar-hero" at={T.doors} volume={0.55} />
      <Sfx name="whoosh" at={T.exit} volume={0.4} />
    </AbsoluteFill>
  );
};

type Proj = ReturnType<typeof geoOrthographic>;

// The three market "lenses": a ring around the globe (TAM), the Baltics (SAM) and Lithuania (SOM).
const MarketRings: React.FC<{t: number; projection: Proj; cam: Cam; fade: number}> = ({t, projection, cam, fade}) => {
  const ring = (at: number, center: [number, number] | null, r: number, color: string, label: string, i: number) => {
    const k = interpolate(t, [at, at + 0.6], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    if (k <= 0) return null;
    const p = center ? projection(center) : [cam.cx, cam.cy];
    if (!p) return null;
    return (
      <g key={i} opacity={fade}>
        <circle cx={p[0]} cy={p[1]} r={r} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray="3 9" pathLength={undefined} opacity={0.9} transform={`rotate(${t * 12} ${p[0]} ${p[1]})`} style={{strokeDashoffset: 0}} />
        <circle cx={p[0]} cy={p[1]} r={r} fill="none" stroke={color} strokeWidth={4} pathLength={1} strokeDasharray={`${k * 0.25} 1`} transform={`rotate(-90 ${p[0]} ${p[1]})`} />
        <text x={p[0] + r * 0.72} y={p[1] - r * 0.72 - 12} fontFamily={FONTS.ui} fontWeight={800} fontSize={22} letterSpacing={4} fill={color} opacity={k}>
          {label}
        </text>
      </g>
    );
  };
  return (
    <>
      {t < T.baltZoom + 0.4 && ring(T.tam, null, cam.s + 26, COLORS.paper, 'TAM', 0)}
      {t >= T.sam - 0.05 && t < T.ltZoom + 0.6 && ring(T.sam, [24.6, 57.0], 430, COLORS.tealBright, 'SAM', 1)}
      {t >= T.som - 0.05 && t < T.corridorZoom + 0.3 && ring(T.som, [23.9, 55.2], 470, COLORS.coral, 'LITHUANIA', 2)}
    </>
  );
};

// Country names at the Baltic zoom.
const Labels3: React.FC<{t: number; projection: Proj; fade: number}> = ({t, projection, fade}) => {
  const k = interpolate(t, [T.sam + 0.1, T.sam + 0.5], [0, 1], clamp) * (1 - interpolate(t, [T.ltZoom, T.ltZoom + 0.4], [0, 1], clamp));
  if (k <= 0) return null;
  const names: [string, [number, number]][] = [
    ['ESTONIA', [25.8, 58.7]],
    ['LATVIA', [25.2, 56.9]],
    ['LITHUANIA', [24.0, 55.3]],
  ];
  return (
    <g opacity={k * fade}>
      {names.map(([n, c]) => {
        const p = projection(c);
        if (!p) return null;
        return (
          <text key={n} x={p[0]} y={p[1]} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={700} fontSize={22} letterSpacing={6} fill={PAPER(0.85)}>
            {n}
          </text>
        );
      })}
    </g>
  );
};

// TAM / SAM / SOM as a funnel on the left: each tier lands with its number when it is named.
const TIERS = [
  {key: 'TAM', at: () => T.tam, value: 10, fmt: (v: number) => `${Math.round(v)}M+`, label: "people with Parkinson's worldwide", color: COLORS.paper, w: 520},
  {key: 'SAM', at: () => T.sam, value: 16000, fmt: (v: number) => `≈${(Math.round(v / 100) * 100).toLocaleString('en-US')}`, label: 'patients in the Baltic states', color: COLORS.tealBright, w: 380},
  {key: 'LT', at: () => T.som, value: 7600, fmt: (v: number) => `≈${(Math.round(v / 100) * 100).toLocaleString('en-US')}`, label: 'patients in Lithuania', color: COLORS.paper, w: 300},
  {key: 'SOM', at: () => T.target, value: 1000, fmt: (v: number) => (Math.round(v / 50) * 50).toLocaleString('en-US'), label: 'our 3-year target · patients', color: COLORS.coral, w: 160},
];

const Funnel: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const compact = Easing.inOut(Easing.cubic)(interpolate(t, [T.corridorZoom - 0.2, T.corridorZoom + 0.5], [0, 1], clamp));
  return (
    <div style={{position: 'absolute', left: 70, top: 200, transformOrigin: '0 0', transform: `translateY(${-110 * compact}px) scale(${1 - 0.3 * compact})`, opacity: fade}}>
      <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 18, letterSpacing: 5, color: COLORS.coral, opacity: interpolate(t, [T.tam - 0.3, T.tam], [0, 1], clamp), marginBottom: 22}}>MARKET</div>
      {TIERS.map((tier, i) => {
        const at = tier.at();
        const s = spring({frame: (t - at) * fps, fps, config: {damping: 13, stiffness: 190}});
        const count = interpolate(t, [at, at + 0.9], [0, tier.value], {...clamp, easing: Easing.out(Easing.cubic)});
        const current = t >= at && (i === TIERS.length - 1 || t < TIERS[i + 1].at());
        return (
          <div key={tier.key} style={{marginBottom: 26, opacity: s, transform: `translateX(${(1 - s) * -60}px)`}}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 16}}>
              <span style={{fontFamily: FONTS.ui, fontWeight: 800, fontSize: 18, letterSpacing: 3, padding: '5px 10px', borderRadius: 10, background: tier.color, color: COLORS.navy}}>{tier.key}</span>
              <span style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: current ? 76 : 54, color: current ? tier.color : PAPER(0.9), fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>
                {tier.fmt(count)}
              </span>
            </div>
            <div style={{fontFamily: FONTS.ui, fontSize: 20, color: PAPER(0.62), marginTop: 8}}>{tier.label}</div>
            <div style={{marginTop: 10, height: 8, width: tier.w * s, borderRadius: 4, background: tier.color, opacity: 0.85}} />
          </div>
        );
      })}
    </div>
  );
};

// Entry segments, listed as they are named.
const EntryCard: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const open = spring({frame: (t - T.clinics + 0.1) * fps, fps, config: {damping: 15, stiffness: 170}});
  if (open <= 0.001) return null;
  const row = (at: number, text: string, icon: 'clinic' | 'home') => {
    const k = spring({frame: (t - at) * fps, fps, config: {damping: 13, stiffness: 220}});
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, opacity: k, transform: `translateX(${(1 - k) * 30}px)`}}>
        <div style={{width: 42, height: 42, borderRadius: 12, background: COLORS.coral, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={COLORS.card} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            {icon === 'clinic' ? (
              <>
                <rect x={4} y={4} width={16} height={16} rx={3} />
                <path d="M12 8 V16 M8 12 H16" />
              </>
            ) : (
              <>
                <rect x={5} y={3} width={14} height={18} rx={2} />
                <path d="M9.5 7.5 V13.5 M14.5 7.5 V13.5 M9.5 10.5 H14.5 M10.5 21 V17.5 H13.5 V21" />
              </>
            )}
          </svg>
        </div>
        <span style={{fontFamily: FONTS.display, fontWeight: 700, fontSize: 26, color: COLORS.paper}}>{text}</span>
      </div>
    );
  };
  return (
    <div
      style={{
        position: 'absolute',
        right: 64,
        bottom: 110,
        width: 470,
        padding: '22px 26px 26px',
        borderRadius: 22,
        background: 'rgba(4,20,28,0.82)',
        border: `1.5px solid ${PAPER(0.2)}`,
        transformOrigin: '100% 100%',
        transform: `scale(${0.85 + 0.15 * open})`,
        opacity: open * fade,
      }}
    >
      <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 17, letterSpacing: 4, color: COLORS.coral}}>ENTRY SEGMENTS</div>
      {row(T.clinics, 'Private neuro-rehab clinics', 'clinic')}
      {row(T.homes, 'Hospitals', 'home')}
    </div>
  );
};

// Vilnius and Kaunas, the corridor between them, and the "door" in its middle.
const Corridor: React.FC<{t: number; projection: Proj; fade: number}> = ({t, projection, fade}) => {
  const v = projection(VILNIUS);
  const k = projection(KAUNAS);
  if (!v || !k || t < T.vilnius - 0.1) return null;
  const vIn = interpolate(t, [T.vilnius, T.vilnius + 0.3], [0, 1], {...clamp, easing: Easing.out(Easing.back(2))});
  const kIn = interpolate(t, [T.kaunas, T.kaunas + 0.3], [0, 1], {...clamp, easing: Easing.out(Easing.back(2))});
  const line = interpolate(t, [T.kaunas + 0.1, T.kaunas + 0.6], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const mid = {x: (v[0] + k[0]) / 2, y: (v[1] + k[1]) / 2};
  const door = interpolate(t, [T.doors, T.doors + 1.1], [0, 1], clamp);
  const node = (p: [number, number], s: number, name: string, ring: number, anchor: 'start' | 'end') => (
    <g>
      {ring > 0 && ring < 1 && <circle cx={p[0]} cy={p[1]} r={14 + ring * 80} fill="none" stroke={COLORS.coral} strokeWidth={3 * (1 - ring)} opacity={1 - ring} />}
      <circle cx={p[0]} cy={p[1]} r={26 * s} fill={CORAL(0.2)} />
      <circle cx={p[0]} cy={p[1]} r={12 * s} fill={COLORS.coral} />
      <text x={p[0] + (anchor === 'start' ? 34 : -34)} y={p[1] + 10} textAnchor={anchor} fontFamily={FONTS.display} fontWeight={800} fontSize={38} fill={COLORS.paper} opacity={s}>
        {name}
      </text>
    </g>
  );
  return (
    <g opacity={fade}>
      <line x1={k[0]} y1={k[1]} x2={k[0] + (v[0] - k[0]) * line} y2={k[1] + (v[1] - k[1]) * line} stroke={COLORS.coral} strokeWidth={4} strokeDasharray="14 10" strokeLinecap="round" />
      {line > 0.6 && (
        <text x={mid.x} y={mid.y - 26} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={800} fontSize={20} letterSpacing={4} fill={COLORS.coral} opacity={(line - 0.6) / 0.4}>
          ≈100 KM
        </text>
      )}
      {node(v, vIn, 'Vilnius', interpolate(t, [T.vilnius, T.vilnius + 0.9], [0, 1], clamp), 'start')}
      {node(k, kIn, 'Kaunas', interpolate(t, [T.kaunas, T.kaunas + 0.9], [0, 1], clamp), 'end')}
      {door > 0 &&
        [0, 0.25, 0.5].map((d, i) => {
          const r = interpolate(door, [d, d + 0.5], [0, 1], clamp);
          if (r <= 0 || r >= 1) return null;
          return <circle key={i} cx={mid.x} cy={mid.y} r={10 + r * 160} fill="none" stroke={COLORS.coral} strokeWidth={4 * (1 - r)} opacity={1 - r} />;
        })}
      {door > 0 && <circle cx={mid.x} cy={mid.y} r={9} fill={COLORS.paper} />}
    </g>
  );
};

// Partners that open doors: two badges drop in, linked to the corridor's midpoint.
const Badges: React.FC<{t: number; projection: Proj; fade: number}> = ({t, projection, fade}) => {
  const {fps} = useVideoConfig();
  const v = projection(VILNIUS);
  const k = projection(KAUNAS);
  if (!v || !k) return null;
  const mid = {x: (v[0] + k[0]) / 2, y: (v[1] + k[1]) / 2};
  const solid = interpolate(t, [T.doors, T.doors + 0.3], [0, 1], clamp);
  const items = [
    {at: T.assoc, x: 760, text: "PARKINSON'S PATIENT ASSOCIATIONS"},
    {at: T.univ, x: 1440, text: 'UNIVERSITY HOSPITAL ECOSYSTEM'},
  ];
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: fade}}>
        {items.map(({at, x}, i) => {
          const d = interpolate(t, [at + 0.2, at + 0.7], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
          if (d <= 0) return null;
          const y0 = 196;
          return (
            <line
              key={i}
              x1={x}
              y1={y0}
              x2={x + (mid.x - x) * d}
              y2={y0 + (mid.y - y0) * d}
              stroke={interpolateColors(solid, [0, 1], [TEAL(0.8), COLORS.coral])}
              strokeWidth={2.5 + solid}
              strokeDasharray={solid > 0.5 ? undefined : '3 8'}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {items.map(({at, x, text}) => {
        const s = spring({frame: (t - at) * fps, fps, config: {damping: 11, stiffness: 170, mass: 0.8}});
        if (s <= 0.001) return null;
        return (
          <div
            key={text}
            style={{
              position: 'absolute',
              left: x,
              top: 150,
              transform: `translate(-50%, ${(1 - s) * -220}px)`,
              padding: '12px 22px',
              borderRadius: 30,
              background: COLORS.navy,
              border: `2px solid ${solid > 0.5 ? COLORS.coral : COLORS.tealBright}`,
              fontFamily: FONTS.ui,
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: 3,
              color: COLORS.paper,
              whiteSpace: 'nowrap',
              opacity: fade,
            }}
          >
            {text}
          </div>
        );
      })}
    </>
  );
};
