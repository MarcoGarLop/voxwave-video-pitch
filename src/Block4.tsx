import React from 'react';
import {Series} from 'remotion';
import {SceneById} from './scenes/registry';
import {CLOSE_SCENES, sceneFrames} from './scenes/config';

// Block 4 — Team and close.
export const Block4: React.FC = () => (
  <Series>
    {CLOSE_SCENES.map((scene) => (
      <Series.Sequence key={scene.id} durationInFrames={sceneFrames(scene)} name={`${scene.id} · ${scene.title}`}>
        <SceneById id={scene.id} />
      </Series.Sequence>
    ))}
  </Series>
);
