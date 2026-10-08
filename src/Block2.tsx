import React from 'react';
import {Series} from 'remotion';
import {SceneById} from './scenes/registry';
import {SCENES, sceneFrames} from './scenes/config';

export const Block2: React.FC = () => {
  return (
    <Series>
      {SCENES.map((scene) => (
        <Series.Sequence key={scene.id} durationInFrames={sceneFrames(scene)} name={`${scene.id} · ${scene.title}`}>
          <SceneById id={scene.id} />
        </Series.Sequence>
      ))}
    </Series>
  );
};
