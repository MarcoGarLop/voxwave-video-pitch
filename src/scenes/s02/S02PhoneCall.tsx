import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../../brand/tokens';
import {LOGO} from '../../brand/logo';
import {BrandBackground} from '../../components/BrandBackground';
import {Sfx} from '../../components/Sfx';
import {StageTag} from '../../components/StageTag';
import {VoiceOver} from '../../components/VoiceOver';
import {wordTime} from '../../data/vo';
import {scrollingBars} from '../../lib/voiceSignal';
import {LivePanel, PANEL, WAVE_HANDOFF} from '../shared/LivePanel';
import {getScene} from '../config';
import {PHONE, PhoneBody} from '../shared/Phone';

const scene = getScene('s02');
const vo = (word: string, n = 0) => scene.voAt + wordTime('s02', word, n);

// Scene 2 — the weekly voice session. The monitoring-gap box has become the phone: a notification
// arrives ("Your weekly voice session · 3 min"), the app opens and walks through three short activities
// as the narrator names them (hold an "aah", read a line, chat a little), then the session completes and
// the streak goes up: a small weekly habit for your voice. The live voice signal runs on the panel beside it and the
// camera finally pushes into that waveform, where scene 3 starts.
const T = {
  uiIn: 0.05,
  notify: 0.35,
  open: vo('session') + 0.1,
  hold: vo('hold'),
  read: vo('read'),
  chat: vo('chat'),
  done: vo('small') - 0.1,
  week: vo('week'),
  minutes: vo('three-minute'),
  habit: vo('small') - 0.05,
  forVoice: vo('for'),
  pushIn: scene.seconds - 0.75,
};

const ACTIVITIES = [
  {at: T.hold, title: 'Hold an “aah”', sub: 'Steady voice · 5 seconds', icon: 'hold' as const},
  {at: T.read, title: 'Read a line', sub: '“The river runs past the old mill.”', icon: 'read' as const},
  {at: T.chat, title: 'Chat a little', sub: 'Practice call · your morning', icon: 'chat' as const},
];

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const S02PhoneCall: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // The phone is already on screen (the monitoring-gap box became it); its screen lights up.
  const ui = interpolate(t, [T.uiIn, T.uiIn + 0.3], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const panelIn = spring({frame: frame - 6, fps, config: {damping: 16, stiffness: 90}});
  const opened = spring({frame: (t - T.open) * fps, fps, config: {damping: 16, stiffness: 140}});
  // A small buzz when the notification lands.
  const buzz = t > T.notify && t < T.notify + 0.35 ? Math.sin(t * 95) * 1.6 : 0;

  // Final push into the waveform, leading into scene 3.
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
        <SignalFlow t={t} start={WAVE_HANDOFF.liveStart} opacity={1 - away} />

        {/* Phone */}
        <div
          style={{
            position: 'absolute',
            left: PHONE.x - PHONE.w / 2,
            top: PHONE.y - PHONE.h / 2,
            width: PHONE.w,
            height: PHONE.h,
            opacity: 1 - away,
            transform: `perspective(1600px) rotateY(${PHONE.tiltY}deg) rotateZ(${buzz}deg)`,
            transformOrigin: 'center center',
          }}
        >
          <PhoneBody>
            <div style={{position: 'absolute', inset: 0, opacity: ui}}>
              <LockScreen t={t} open={opened} />
              {opened > 0.001 && <SessionScreen t={t} open={opened} />}
            </div>
          </PhoneBody>
          {/* Tap on the notification */}
          <TapRipple t={t} at={T.open - 0.05} x={PHONE.w / 2} y={262} />
        </div>

        <SessionLabel t={t} fade={away} />

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

      <StageTag label="PROTOTYPE" opacity={interpolate(t, [0.3, 0.7], [0, 1], clamp) * (1 - away)} />

      <VoiceOver scene={scene} />
      <Sfx name="blip" at={T.notify} volume={0.4} />
      <Sfx name="whoosh-short" at={T.open} volume={0.25} />
      <Sfx name="shimmer" at={T.done + 0.1} volume={0.25} />
      <Sfx name="whoosh" at={T.pushIn - 0.1} volume={0.35} />
    </AbsoluteFill>
  );
};

// VoxWave app icon: white rounded square with the logo symbol.
const AppMark: React.FC<{size: number; round?: boolean}> = ({size, round}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: round ? '50%' : size * 0.26,
      background: COLORS.white,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
    }}
  >
    <svg viewBox="140 330 990 460" width={size * 0.72}>
      <path d={LOGO.symbol.navy.join('')} fill={COLORS.navy} />
      <path d={LOGO.symbol.teal.join('')} fill={COLORS.teal} />
      <path d={LOGO.symbol.coral.join('')} fill={COLORS.coral} />
    </svg>
  </div>
);

// Lock screen: time, then the session notification drops in; on tap it grows into the app.
const LockScreen: React.FC<{t: number; open: number}> = ({t, open}) => {
  const {fps} = useVideoConfig();
  const drop = spring({frame: (t - T.notify) * fps, fps, config: {damping: 14, stiffness: 170}});
  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: FONTS.ui, color: COLORS.white, opacity: 1 - open}}>
      <div style={{position: 'absolute', top: 92, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{fontSize: 18, fontWeight: 600, opacity: 0.75}}>Tuesday, 14 October</div>
        <div style={{fontFamily: FONTS.display, fontSize: 92, fontWeight: 600, lineHeight: 1.05, letterSpacing: -2}}>9:41</div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 228,
          left: 16,
          right: 16,
          padding: '14px 16px',
          borderRadius: 22,
          background: 'rgba(244,248,250,0.16)',
          border: '1px solid rgba(244,248,250,0.18)',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          opacity: drop,
          transform: `translateY(${(1 - drop) * -60}px) scale(${1 + open * 0.08})`,
        }}
      >
        <AppMark size={46} />
        <div style={{minWidth: 0}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, letterSpacing: 1, opacity: 0.8}}>
            <span>VOXWAVE</span>
            <span style={{fontWeight: 500}}>now</span>
          </div>
          <div style={{fontSize: 18, fontWeight: 700, marginTop: 2}}>Your weekly voice session</div>
          <div style={{fontSize: 15, opacity: 0.75}}>3 minutes · 3 short activities</div>
        </div>
      </div>
    </div>
  );
};

// The app: weekly session with three activities that light up and tick off as they are named.
const SessionScreen: React.FC<{t: number; open: number}> = ({t, open}) => {
  const {fps} = useVideoConfig();
  const done = spring({frame: (t - T.done) * fps, fps, config: {damping: 11, stiffness: 200, mass: 0.7}});
  const progress = ACTIVITIES.reduce((sum, a, i) => {
    const next = i < ACTIVITIES.length - 1 ? ACTIVITIES[i + 1].at : T.done;
    return sum + interpolate(t, [a.at, next], [0, 1], clamp) / ACTIVITIES.length;
  }, 0);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        fontFamily: FONTS.ui,
        color: COLORS.white,
        opacity: open,
        transform: `scale(${0.92 + 0.08 * open})`,
        background: `linear-gradient(180deg, ${COLORS.navy} 0%, #06324A 70%, ${COLORS.navyDeep} 100%)`,
      }}
    >
      {/* Header: app, week and streak */}
      <div style={{position: 'absolute', top: 74, left: 26, right: 26, display: 'flex', alignItems: 'center', gap: 12}}>
        <AppMark size={44} />
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontFamily: FONTS.display, fontSize: 20, fontWeight: 700, whiteSpace: 'nowrap'}}>Weekly session</div>
          <div style={{fontSize: 14, color: COLORS.tealBright, whiteSpace: 'nowrap'}}>Week 12 · about 3 min</div>
        </div>
        <Streak done={done} />
      </div>
      {/* Progress */}
      <div style={{position: 'absolute', top: 146, left: 26, right: 26, height: 10, borderRadius: 5, background: 'rgba(244,248,250,0.14)'}}>
        <div style={{width: `${progress * 100}%`, height: '100%', borderRadius: 5, background: COLORS.coral}} />
      </div>

      <div style={{position: 'absolute', top: 176, left: 18, right: 18, display: 'flex', flexDirection: 'column', gap: 12}}>
        {ACTIVITIES.map((a, i) => (
          <ActivityCard key={a.title} t={t} index={i} />
        ))}
      </div>

      {/* Completion */}
      {done > 0.001 && (
        <div
          style={{
            position: 'absolute',
            left: 26,
            right: 26,
            bottom: 70,
            padding: '16px 18px',
            borderRadius: 22,
            background: COLORS.coral,
            color: COLORS.card,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            opacity: Math.min(1, done * 1.5),
            transform: `translateY(${(1 - done) * 40}px) scale(${0.9 + 0.1 * done})`,
          }}
        >
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={COLORS.card} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5 L10 18 L20 6" />
          </svg>
          <div>
            <div style={{fontFamily: FONTS.display, fontSize: 20, fontWeight: 700}}>Session complete</div>
            <div style={{fontSize: 14, opacity: 0.9}}>See you next week</div>
          </div>
        </div>
      )}
      <div style={{position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 13, color: 'rgba(244,248,250,0.55)'}}>
        ✓ Recorded with your consent
      </div>
    </div>
  );
};

const Streak: React.FC<{done: number}> = ({done}) => {
  const n = done > 0.5 ? 12 : 11;
  const pop = done > 0 ? 1 + 0.25 * Math.sin(Math.min(1, done) * Math.PI) : 1;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 18,
        background: 'rgba(255,110,66,0.18)',
        color: COLORS.coral,
        fontWeight: 800,
        fontSize: 18,
        transform: `scale(${pop})`,
      }}
    >
      <svg width={18} height={18} viewBox="0 0 24 24" fill={COLORS.coral}>
        <path d="M12 2c1.5 3.5-1 5.2-1 7.6 0 1.3.9 2.2 2 2.2 1.6 0 2.4-1.5 2.1-3.4C17.7 10.2 19 12.6 19 15a7 7 0 0 1-14 0c0-4.3 3.6-6.7 7-13z" />
      </svg>
      {n}
    </div>
  );
};

const ActivityCard: React.FC<{t: number; index: number}> = ({t, index}) => {
  const {fps} = useVideoConfig();
  const a = ACTIVITIES[index];
  const end = index < ACTIVITIES.length - 1 ? ACTIVITIES[index + 1].at : T.done;
  const active = t >= a.at && t < end;
  const finished = t >= end;
  const on = spring({frame: (t - a.at) * fps, fps, config: {damping: 13, stiffness: 220, mass: 0.6}});
  const check = spring({frame: (t - end) * fps, fps, config: {damping: 11, stiffness: 260, mass: 0.6}});
  const bars = scrollingBars(t, 12, 0.07, a.at + 0.1, 'patient');
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 20,
        background: active ? COLORS.card : 'rgba(244,248,250,0.08)',
        color: active ? COLORS.ink : COLORS.white,
        border: `1.5px solid ${active ? COLORS.card : 'rgba(244,248,250,0.14)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transform: `scale(${1 + 0.04 * on * (active ? 1 : 0)})`,
        boxShadow: active ? '0 14px 30px rgba(0,0,0,0.35)' : undefined,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: finished ? COLORS.coral : active ? COLORS.ink : 'rgba(244,248,250,0.12)',
        }}
      >
        {finished ? (
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={COLORS.card} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" style={{transform: `scale(${check})`}}>
            <path d="M4 12.5 L10 18 L20 6" />
          </svg>
        ) : (
          <ActivityIcon kind={a.icon} color={active ? COLORS.card : COLORS.white} />
        )}
      </div>
      <div style={{minWidth: 0, flex: 1}}>
        <div style={{fontFamily: FONTS.display, fontSize: 19, fontWeight: 700, lineHeight: 1.2}}>{a.title}</div>
        <div style={{fontSize: 13, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{a.sub}</div>
        {active && (
          <div style={{display: 'flex', alignItems: 'center', gap: 3, height: 26, marginTop: 4}}>
            {bars.map((b) => (
              <span key={b.index} style={{width: 5, height: 4 + b.level * 20, borderRadius: 3, background: b.index > 8 ? COLORS.coral : COLORS.teal}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityIcon: React.FC<{kind: 'hold' | 'read' | 'chat'; color: string}> = ({kind, color}) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    {kind === 'hold' && <path d="M3 12h3l2-5 3 10 3-8 2 3h5" />}
    {kind === 'read' && <path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" />}
    {kind === 'chat' && <path d="M4 5h16v11H9l-5 4z" />}
  </svg>
);

// Kinetic label under the waveform panel: "Once a week. 3 minutes." slam in word by word, then the pill
// flips over to "A weekly habit, for your voice." with a coral marker on "for your voice."
const SessionLabel: React.FC<{t: number; fade: number}> = ({t, fade}) => {
  const {fps} = useVideoConfig();
  const sp = (at: number) => spring({frame: (t - at) * fps, fps, config: {damping: 12, stiffness: 220, mass: 0.6}});
  const box = spring({frame: (t - T.week + 0.08) * fps, fps, config: {damping: 13, stiffness: 160}});
  const flip = interpolate(t, [T.habit - 0.12, T.habit + 0.16], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const back = flip >= 0.5;
  const angle = back ? (1 - flip) * -180 : flip * 180;
  const hl = interpolate(t, [T.forVoice, T.forVoice + 0.3], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const word = (k: number): React.CSSProperties => ({display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * 28}px) scale(${1.25 - 0.25 * k})`});
  return (
    <div
      style={{
        position: 'absolute',
        left: PANEL.x,
        top: PANEL.y + PANEL.h / 2 + 40,
        transform: `translateX(-50%) perspective(900px) rotate(-2.5deg) rotateX(${angle}deg) scale(${0.6 + 0.4 * box})`,
        opacity: box * (1 - fade),
        background: COLORS.ink,
        borderRadius: 22,
        padding: '18px 34px',
        boxShadow: '0 22px 40px rgba(9,38,52,0.25)',
        whiteSpace: 'nowrap',
        fontFamily: FONTS.display,
        fontWeight: 700,
        fontSize: 50,
        color: COLORS.paper,
        display: 'flex',
        gap: 18,
      }}
    >
      {!back ? (
        <>
          <span style={word(sp(T.week))}>Once a week.</span>
          <span style={word(sp(T.minutes))}>3 minutes.</span>
        </>
      ) : (
        <>
          <span>A weekly habit,</span>
          <span style={{position: 'relative', display: 'inline-block', padding: '0 8px'}}>
            <span style={{position: 'absolute', left: 0, top: 6, bottom: 2, width: `${hl * 100}%`, background: COLORS.coral, borderRadius: 10}} />
            <span style={{position: 'relative'}}>for your voice.</span>
          </span>
        </>
      )}
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

// Data packets travelling from the phone to the panel once the session is live.
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
