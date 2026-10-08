import React from 'react';
import {AnimaticCard} from '../animatic/AnimaticCard';
import {getScene, type SceneId} from './config';
import {S01WaveToLogo} from './s01/S01WaveToLogo';
import {S02PhoneCall} from './s02/S02PhoneCall';
import {S03Biomarkers} from './s03/S03Biomarkers';
import {S04TrendAlert} from './s04/S04TrendAlert';
import {S05FillTheGap} from './s05/S05FillTheGap';
import {S06DeviceTurntable} from './s06/S06DeviceTurntable';
import {S07DeviceCloseup} from './s07/S07DeviceCloseup';
import {S08MvpMontage} from './s08/S08MvpMontage';

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
};

export const SceneById: React.FC<{id: SceneId}> = ({id}) => {
  const Built = BUILT[id];
  return Built ? <Built /> : <AnimaticCard scene={getScene(id)} />;
};
