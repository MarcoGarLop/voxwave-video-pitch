import React from 'react';
import {Series} from 'remotion';
import {SceneById} from './scenes/registry';
import {FINANCE_SCENES, sceneFrames} from './scenes/config';

// Block 3 — Finance.
export const Block3: React.FC = () => (
  <Series>
    {FINANCE_SCENES.map((scene) => (
      <Series.Sequence key={scene.id} durationInFrames={sceneFrames(scene)} name={`${scene.id} · ${scene.title}`}>
        <SceneById id={scene.id} />
      </Series.Sequence>
    ))}
  </Series>
);
