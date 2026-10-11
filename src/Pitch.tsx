import React from 'react';
import {Series} from 'remotion';
import {Block2} from './Block2';
import {Block3} from './Block3';
import {Block4} from './Block4';
import {OPENING, OpeningPicture, OpeningSound} from './opening/Opening';
import {MusicBed} from './MusicBed';
import {BLOCK2_FRAMES, CLOSE_FRAMES, FINANCE_FRAMES} from './scenes/config';

// The whole pitch: the team's cinematic opening, Solution + market, Finance, then Team and close.
export const PITCH_FRAMES = OPENING.frames + BLOCK2_FRAMES + FINANCE_FRAMES + CLOSE_FRAMES;

export const Pitch: React.FC = () => (
  <>
    <Series>
      <Series.Sequence durationInFrames={OPENING.frames} name="Opening (v08, team)">
        <OpeningPicture />
      </Series.Sequence>
      <Series.Sequence durationInFrames={BLOCK2_FRAMES} name="Block 2 · Solution + market">
        <Block2 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={FINANCE_FRAMES} name="Block 3 · Finance">
        <Block3 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={CLOSE_FRAMES} name="Block 4 · Team and close">
        <Block4 />
      </Series.Sequence>
    </Series>
    <OpeningSound />
    <MusicBed start={OPENING.frames} />
  </>
);
