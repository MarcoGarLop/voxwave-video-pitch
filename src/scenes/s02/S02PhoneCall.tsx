import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {LOGO} from '../../brand/logo';
import {BrandBackground} from '../../components/BrandBackground';
import {HandsetIcon} from '../../components/icons';
import {Sfx} from '../../components/Sfx';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {scrollingBars} from '../../lib/voiceSignal';
import {AVATAR_HANDOFF, LivePanel, PANEL, WAVE_HANDOFF} from '../shared/LivePanel';
import {getScene} from '../config';

const scene = getScene('s02');
const vo = (word: string, n = 0) => scene.voAt + wordTime('s02', word, n);

// Beats (seconds from scene start).
const T = {
  ring1: 0.3,
  ring2: 1.55,
  accept: WAVE_HANDOFF.accept,
  label: vo('we') - 0.05,
  highlight: vo('you', 1),
  pushIn: 6.25,
};

const PHONE = {x: 560, y: 545, w: 380, h: 780};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const S02PhoneCall: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // The phone grows out of the caller avatar that scene 1 left on screen.
  const reveal = interpolate(t, [0.02, 0.55], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const revealR = AVATAR_HANDOFF.r + reveal * 900;
  const phoneScale = interpolate(reveal, [0, 1], [0.94, 1]);
  const panelIn = spring({frame: frame - 6, fps, config: {damping: 16, stiffness: 90}});
  const accepted = t >= T.accept;

  // Vibration while ringing.
  const ringing = (t > T.ring1 && t < T.ring1 + 0.75) || (t > T.ring2 && t < Math.min(T.ring2 + 0.75, T.accept));
  const shake = ringing && !accepted ? Math.sin(t * 95) * 2.2 : 0;

  // Final push into the waveform, leading into scene 3.
  // Scale accelerates into scene 3 (which carries the velocity on); the recentering eases out to rest.
  const pushLin = interpolate(t, [T.pushIn, scene.seconds], [0, 1], clamp);
  const push = Easing.in(Easing.cubic)(pushLin);
  const drift = interpolate(t, [0, T.pushIn], [1, 1.03], clamp);
  const camScale = drift + (WAVE_HANDOFF.scale - drift) * push;
  const camX = WAVE_HANDOFF.translateX * Easing.inOut(Easing.sin)(pushLin);
  // Everything except the bars is gone before the cut, so scene 3 can start inside the waveform.
  const away = interpolate(pushLin, [0, 0.65], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});

  return (
    <AbsoluteFill>
      <BrandBackground />
      <AbsoluteFill
        style={{
          transform: `translateX(${camX}px) scale(${camScale})`,
          transformOrigin: `${PANEL.x}px ${PANEL.y}px`,
        }}
      >
        <SignalFlow t={t} start={T.accept + 0.2} opacity={1 - away} />

        {/* Phone */}
        <div
          style={{
            position: 'absolute',
            left: PHONE.x - PHONE.w / 2,
            top: PHONE.y - PHONE.h / 2,
            width: PHONE.w,
            height: PHONE.h,
            opacity: 1 - away,
            transform: `perspective(1600px) rotateY(8deg) rotateZ(${shake}deg) scale(${phoneScale})`,
            transformOrigin: `${AVATAR_HANDOFF.x - (PHONE.x - PHONE.w / 2)}px ${AVATAR_HANDOFF.y - (PHONE.y - PHONE.h / 2)}px`,
            clipPath: reveal < 1 ? `circle(${revealR}px at ${AVATAR_HANDOFF.x - (PHONE.x - PHONE.w / 2)}px ${AVATAR_HANDOFF.y - (PHONE.y - PHONE.h / 2)}px)` : undefined,
          }}
        >
          <PhoneBody>
            {accepted ? <InCallScreen t={t} since={T.accept} /> : <IncomingScreen t={t} />}
          </PhoneBody>
          {/* Tap ripple on accept */}
          <TapRipple t={t} at={T.accept} x={PHONE.w / 2 + 92} y={PHONE.h - 150} />
        </div>

        <VoxBubble t={t} accept={T.accept} fade={away} />

        <CallLabel t={t} at={T.label} highlightAt={T.highlight} fade={away} />

        {/* Live waveform panel */}
        <div
          style={{
            position: 'absolute',
            left: PANEL.x - PANEL.w / 2,
            top: PANEL.y - PANEL.h / 2,
            width: PANEL.w,
            height: PANEL.h,
            opacity: panelIn,
            transform: `translateX(${(1 - panelIn) * 400}px)`,
          }}
        >
          <LivePanel t={t} start={WAVE_HANDOFF.liveStart} chrome={1 - away} />
        </div>
      </AbsoluteFill>

      <VoiceOver scene={scene} />
      <Sfx name="ring" at={T.ring1} volume={0.45} />
      <Sfx name="ring" at={T.ring2} volume={0.4} />
      <Sfx name="blip" at={T.accept} volume={0.5} />
      <Sfx name="whoosh-short" at={T.label - 0.05} volume={0.3} />
      <Sfx name="whoosh" at={T.pushIn - 0.1} volume={0.45} />
    </AbsoluteFill>
  );
};

const PhoneBody: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      borderRadius: 64,
      background: 'linear-gradient(145deg, #2A3A44 0%, #0B141A 45%, #1C2A33 100%)',
      padding: 13,
      boxShadow: '0 40px 70px rgba(9,38,52,0.28), 0 8px 18px rgba(9,38,52,0.18), inset 0 0 0 2px rgba(255,255,255,0.08)',
    }}
  >
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 52,
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${COLORS.navy} 0%, #06324A 60%, ${COLORS.navyDeep} 100%)`,
      }}
    >
      {/* status bar + dynamic island */}
      <div style={{position: 'absolute', top: 18, left: 34, right: 34, display: 'flex', justifyContent: 'space-between', fontFamily: FONTS.ui, fontWeight: 600, fontSize: 17, color: COLORS.white}}>
        <span>9:41</span>
        <span style={{letterSpacing: 2}}>●●● ▮</span>
      </div>
      <div style={{position: 'absolute', top: 14, left: '50%', width: 110, height: 32, marginLeft: -55, borderRadius: 20, background: '#000'}} />
      {children}
    </div>
  </div>
);

// Contact photo placeholder: a warm disc with a person glyph, as phones show for saved contacts.
const ContactAvatar: React.FC<{size: number; pulse?: number}> = ({size, pulse}) => (
  <div style={{position: 'relative', width: size, height: size}}>
    {pulse !== undefined &&
      [0, 1].map((k) => {
        const p = (pulse + k * 0.5) % 1;
        return (
          <div
            key={k}
            style={{position: 'absolute', inset: 0, borderRadius: '50%', background: COLORS.coralSoft, opacity: (1 - p) * 0.35, transform: `scale(${1 + p * 0.7})`}}
          />
        );
      })}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: `linear-gradient(160deg, ${COLORS.coralSoft} 0%, ${COLORS.coral} 100%)`,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx={50} cy={40} r={17} fill="rgba(255,255,255,0.92)" />
        <path d="M18 92 C20 68 34 60 50 60 C66 60 80 68 82 92 Z" fill="rgba(255,255,255,0.92)" />
      </svg>
    </div>
  </div>
);

const Heart: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 21 C5 15.5 2 12.3 2 8.5 C2 5.4 4.4 3 7.4 3 C9.3 3 11 4 12 5.6 C13 4 14.7 3 16.6 3 C19.6 3 22 5.4 22 8.5 C22 12.3 19 15.5 12 21 Z" fill={COLORS.coral} />
  </svg>
);

const IncomingScreen: React.FC<{t: number}> = ({t}) => (
  <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONTS.ui, color: COLORS.white}}>
    <div style={{marginTop: 96, fontSize: 17, letterSpacing: 3, opacity: 0.7, fontWeight: 600}}>INCOMING CALL</div>
    <div style={{marginTop: 44}}>
      <ContactAvatar size={150} pulse={t * 1.2} />
    </div>
    <div style={{marginTop: 40, fontFamily: FONTS.display, fontSize: 40, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12}}>
      Daughter <Heart size={28} />
    </div>
    <div style={{marginTop: 8, fontSize: 20, opacity: 0.75, display: 'flex', alignItems: 'center', gap: 8}}>
      <HandsetIcon size={18} color={COLORS.white} /> mobile
    </div>
    <div style={{position: 'absolute', bottom: 90, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '0 40px'}}>
      <CallButton color="#45535C" label="Decline" hangUp />
      <CallButton color={COLORS.tealBright} label="Accept" pulse={0.5 + 0.5 * Math.sin(t * 9)} />
    </div>
  </div>
);

const CallButton: React.FC<{color: string; label: string; hangUp?: boolean; pulse?: number}> = ({color, label, hangUp, pulse = 0}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12}}>
    <div
      style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: pulse ? `0 0 ${20 + pulse * 30}px ${color}` : undefined,
      }}
    >
      <HandsetIcon size={40} color={COLORS.white} hangUp={hangUp} />
    </div>
    <span style={{fontSize: 16, opacity: 0.8}}>{label}</span>
  </div>
);

// Standard in-call controls (24x24 stroke glyphs).
const CONTROLS: {label: string; icon: React.ReactNode}[] = [
  {
    label: 'mute',
    icon: (
      <>
        <rect x={9} y={3} width={6} height={11} rx={3} />
        <path d="M5.5 11 a6.5 6.5 0 0 0 13 0 M12 17.5 V21 M4 4 L20 20" />
      </>
    ),
  },
  {
    label: 'keypad',
    icon: (
      <>
        {[6, 12, 18].flatMap((y) => [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} fill={COLORS.white} stroke="none" />))}
      </>
    ),
  },
  {
    label: 'speaker',
    icon: (
      <>
        <path d="M4 9.5 H8 L13 5 V19 L8 14.5 H4 Z" />
        <path d="M16.5 9 a4 4 0 0 1 0 6 M19 6.5 a7.5 7.5 0 0 1 0 11" />
      </>
    ),
  },
  {label: 'add call', icon: <path d="M12 5 V19 M5 12 H19" />},
  {
    label: 'video',
    icon: (
      <>
        <rect x={3} y={7} width={12} height={10} rx={2} />
        <path d="M15 11 L21 7.5 V16.5 L15 13 Z" />
      </>
    ),
  },
  {
    label: 'contacts',
    icon: (
      <>
        <circle cx={12} cy={8.5} r={3.5} />
        <path d="M5 20 C5 15.5 8 13.5 12 13.5 C16 13.5 19 15.5 19 20" />
      </>
    ),
  },
];

const InCallScreen: React.FC<{t: number; since: number}> = ({t, since}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: (t - since) * fps, fps, config: {damping: 14}});
  const elapsed = Math.max(0, t - since);
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONTS.ui, color: COLORS.white, opacity: s}}>
      <div style={{marginTop: 84, transform: `scale(${0.8 + 0.2 * s})`}}>
        <ContactAvatar size={96} />
      </div>
      <div style={{marginTop: 20, fontFamily: FONTS.display, fontSize: 32, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10}}>
        Daughter <Heart size={22} />
      </div>
      <div style={{marginTop: 6, fontSize: 20, opacity: 0.75, fontVariantNumeric: 'tabular-nums'}}>00:{String(Math.floor(elapsed)).padStart(2, '0')}</div>

      <div style={{marginTop: 60, display: 'grid', gridTemplateColumns: 'repeat(3, 84px)', columnGap: 26, rowGap: 22}}>
        {CONTROLS.map((c, i) => {
          const k = spring({frame: (t - since - 0.05 - i * 0.03) * fps, fps, config: {damping: 13, stiffness: 180}});
          return (
            <div key={c.label} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: k, transform: `scale(${0.7 + 0.3 * k})`}}>
              <div style={{width: 76, height: 76, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={COLORS.white} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  {c.icon}
                </svg>
              </div>
              <span style={{fontSize: 14, opacity: 0.8}}>{c.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{position: 'absolute', bottom: 72}}>
        <div style={{width: 80, height: 80, borderRadius: '50%', background: '#E5484D', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <HandsetIcon size={36} color={COLORS.white} hangUp />
        </div>
      </div>
    </div>
  );
};

// VoxWave runs alongside the call: the logo from scene 1 lands here as a bubble by the phone,
// and unfolds into a "Listening" pill once the call is answered.
const VoxBubble: React.FC<{t: number; accept: number; fade: number}> = ({t, accept, fade}) => {
  const {fps} = useVideoConfig();
  const AV = AVATAR_HANDOFF;
  const open = spring({frame: (t - accept - 0.25) * fps, fps, config: {damping: 15, stiffness: 140}});
  const pillW = 262 * open;
  const pillH = 76;
  const bars = scrollingBars(t, 7, 0.07, accept + 0.3, 'patient');
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity: 1 - fade}}>
      {pillW > 1 && (
        <div
          style={{
            position: 'absolute',
            left: AV.x,
            top: AV.y - pillH / 2,
            width: AV.r + pillW,
            height: pillH,
            borderRadius: pillH / 2,
            background: COLORS.card,
            boxShadow: '0 10px 28px rgba(9,38,52,0.18)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: AV.r + 18,
              top: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontFamily: FONTS.ui,
              fontWeight: 700,
              fontSize: 24,
              color: COLORS.ink,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{width: 12, height: 12, borderRadius: '50%', background: COLORS.coral, opacity: 0.45 + pulse * 0.55}} />
            Listening
            <span style={{display: 'flex', alignItems: 'center', gap: 4, height: 36}}>
              {bars.map((b) => (
                <span key={b.index} style={{width: 5, height: 5 + b.level * 30, borderRadius: 3, background: b.index > 4 ? COLORS.coral : COLORS.teal}} />
              ))}
            </span>
          </div>
        </div>
      )}
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <filter id="s02-bubble-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx={0} dy={10} stdDeviation={14} floodColor={COLORS.ink} floodOpacity={0.22} />
          </filter>
        </defs>
        <circle cx={AV.x} cy={AV.y} r={AV.r} fill={COLORS.white} filter="url(#s02-bubble-shadow)" />
        <g transform={`translate(${AV.x} ${AV.y}) scale(${AV.unitPx}) translate(${-AV.symbol.x} ${-AV.symbol.y})`}>
          <path d={LOGO.symbol.navy.join('')} fill={COLORS.navy} />
          <path d={LOGO.symbol.teal.join('')} fill={COLORS.teal} />
          <path d={LOGO.symbol.coral.join('')} fill={COLORS.coral} />
        </g>
      </svg>
    </div>
  );
};

const TapRipple: React.FC<{t: number; at: number; x: number; y: number}> = ({t, at, x, y}) => {
  const p = (t - at + 0.12) / 0.5;
  if (p < 0 || p > 1) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 60,
        top: y - 60,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.55)',
        opacity: p < 0.25 ? p * 4 : 1 - (p - 0.25) / 0.75,
        transform: `scale(${0.35 + p * 0.9})`,
      }}
    />
  );
};

// Kinetic label under the waveform panel. "you talk." gets a coral marker swipe.
const CallLabel: React.FC<{t: number; at: number; highlightAt: number; fade: number}> = ({t, at, highlightAt, fade}) => {
  const {fps} = useVideoConfig();
  const words = ['We', 'care', 'while'];
  const box = spring({frame: (t - at) * fps, fps, config: {damping: 13, stiffness: 160}});
  const hl = interpolate(t, [highlightAt, highlightAt + 0.28], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <div
      style={{
        position: 'absolute',
        left: PANEL.x,
        top: PANEL.y + PANEL.h / 2 + 40,
        transform: `translateX(-50%) rotate(-2.5deg) scale(${0.6 + 0.4 * box})`,
        opacity: box * (1 - fade),
        background: COLORS.ink,
        borderRadius: 22,
        padding: '18px 34px',
        boxShadow: '0 22px 40px rgba(9,38,52,0.25)',
        whiteSpace: 'nowrap',
        fontFamily: FONTS.display,
        fontWeight: 700,
        fontSize: 54,
        color: COLORS.paper,
        display: 'flex',
        gap: 16,
      }}
    >
      {words.map((w, i) => {
        const s = spring({frame: (t - at - i * 0.1) * fps, fps, config: {damping: 12, stiffness: 200}});
        return (
          <span key={w + i} style={{display: 'inline-block', transform: `translateY(${(1 - s) * 30}px)`, opacity: s}}>
            {w}
          </span>
        );
      })}
      <span style={{position: 'relative', display: 'inline-block', padding: '0 8px'}}>
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 6,
            bottom: 2,
            width: `${hl * 100}%`,
            background: COLORS.coral,
            borderRadius: 10,
          }}
        />
        <span style={{position: 'relative', color: COLORS.paper, opacity: spring({frame: (t - highlightAt + 0.1) * fps, fps})}}>you talk.</span>
      </span>
    </div>
  );
};

// Data packets travelling from the phone to the panel once the call is live.
const SignalFlow: React.FC<{t: number; start: number; opacity: number}> = ({t, start, opacity}) => {
  if (t < start) return null;
  const x0 = PHONE.x + PHONE.w / 2 + 10;
  const x1 = PANEL.x - PANEL.w / 2 - 10;
  const on = interpolate(t, [start, start + 0.3], [0, 1], clamp);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: on * opacity}}>
      <line x1={x0} x2={x1} y1={540} y2={540} stroke={COLORS.inkFaint} strokeWidth={2} strokeDasharray="3 9" />
      {new Array(7).fill(0).map((_, i) => {
        const p = ((t - start) * 0.9 + i / 7) % 1;
        const x = x0 + (x1 - x0) * p;
        const y = 540 + Math.sin(p * Math.PI * 3 + i) * 12 * Math.sin(p * Math.PI);
        return <circle key={i} cx={x} cy={y} r={5} fill={i % 2 ? COLORS.coral : COLORS.teal} opacity={Math.sin(p * Math.PI)} />;
      })}
    </svg>
  );
};
