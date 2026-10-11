import React from 'react';
import {AnimaticCard} from '../animatic/AnimaticCard';
import {getScene, type SceneId} from './config';
import {SpeechContext} from '../components/Sfx';
import voTimings from '../data/vo-timings.json';
import {S01WaveToLogo} from './s01/S01WaveToLogo';
import {S02PhoneCall} from './s02/S02PhoneCall';
import {S03Biomarkers} from './s03/S03Biomarkers';
import {S04TrendAlert} from './s04/S04TrendAlert';
import {S05FillTheGap} from './s05/S05FillTheGap';
import {S06DeviceTurntable} from './s06/S06DeviceTurntable';
import {S07DeviceCloseup} from './s07/S07DeviceCloseup';
import {S08MvpMontage} from './s08/S08MvpMontage';
import {GapScene} from './gap/GapScene';
import {ReportScene} from './report/ReportScene';
import {WhyScene} from './why/WhyScene';
import {RadarScene} from './radar/RadarScene';
import {MarketScene} from './market/MarketScene';
import {PayScene} from './pay/PayScene';
import {UnitScene} from './unit/UnitScene';
import {GateScene} from './gate/GateScene';
import {PaybackScene} from './payback/PaybackScene';
import {ScaleScene} from './scale/ScaleScene';
import {TeamScene} from './team/TeamScene';
import {ProtoScene} from './proto/ProtoScene';
import {CloseScene} from './close/CloseScene';

// Finished scenes. Anything missing here falls back to its animatic card.
const BUILT: Partial<Record<SceneId, React.FC>> = {
  s01: S01WaveToLogo,
  s02: S02PhoneCall,
  s03: S03Biomarkers,
  s04: S04TrendAlert,
  s05: S05FillTheGap,
  s06: S06DeviceTurntable,
  s07: S07DeviceCloseup,
  s08: S08MvpMontage,
  gap: GapScene,
  report: ReportScene,
  why: WhyScene,
  radar: RadarScene,
  market: MarketScene,
  pay: PayScene,
  unit: UnitScene,
  gate: GateScene,
  payback: PaybackScene,
  scale: ScaleScene,
  team: TeamScene,
  proto: ProtoScene,
  close: CloseScene,
};

// When the narrator is speaking in a scene (seconds from the scene start). Words closer than 0.4 s are one
// stretch of speech. Sound effects read this to make way for the voice.
const speechOf = (id: SceneId): [number, number][] => {
  const entry = (voTimings as Record<string, {words: {start: number; end: number}[]}>)[id];
  if (!entry) return [];
  const at = getScene(id).voAt;
  const out: [number, number][] = [];
  for (const w of entry.words) {
    const last = out[out.length - 1];
    if (last && at + w.start - last[1] < 0.4) last[1] = at + w.end;
    else out.push([at + w.start, at + w.end]);
  }
  return out;
};

export const SceneById: React.FC<{id: SceneId}> = ({id}) => {
  const Built = BUILT[id];
  return <SpeechContext.Provider value={speechOf(id)}>{Built ? <Built /> : <AnimaticCard scene={getScene(id)} />}</SpeechContext.Provider>;
};
