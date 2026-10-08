import React from 'react';
import {Composition, Folder} from 'remotion';
import {VIDEO} from './brand/tokens';
import {Block2} from './Block2';
import {AnimaticCard} from './animatic/AnimaticCard';
import {LogoGrid} from './debug/LogoGrid';
import {DeviceScreen} from './device/DeviceScreen';
import {LogoDecal} from './device/LogoDecal';
import {DevicePreview} from './device/DevicePreview';
import {TestSheet} from './device/TestSheet';
import {LOGO_CENTERLINES} from './brand/logoCenterlines';
import {SceneById} from './scenes/registry';
import {BLOCK2_FRAMES, SCENES, sceneFrames} from './scenes/config';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Block2" component={Block2} durationInFrames={BLOCK2_FRAMES} {...VIDEO} />
      <Folder name="Block2-Scenes">
        {SCENES.map((scene) => (
          <Composition
            key={scene.id}
            id={`B2-${scene.id}`}
            component={SceneById}
            defaultProps={{id: scene.id}}
            durationInFrames={sceneFrames(scene)}
            {...VIDEO}
          />
        ))}
      </Folder>
      <Folder name="Block2-Animatic">
        {SCENES.map((scene) => (
          <Composition
            key={scene.id}
            id={`Animatic-${scene.id}`}
            component={AnimaticCard}
            defaultProps={{scene}}
            durationInFrames={sceneFrames(scene)}
            {...VIDEO}
          />
        ))}
      </Folder>
      <Folder name="Device">
        <Composition id="DeviceScreen" component={DeviceScreen} defaultProps={{variant: 'ready' as const}} durationInFrames={1} width={512} height={256} fps={30} />
        <Composition id="DevicePreview" component={DevicePreview} durationInFrames={1} {...VIDEO} />
        <Composition id="TestSheet" component={TestSheet} durationInFrames={1} {...VIDEO} defaultProps={{files: [] as string[], tone: "ink" as const}} />
        <Composition id="LogoDecal" component={LogoDecal} durationInFrames={1} width={1000} height={600} fps={30} />
      </Folder>
      <Folder name="Debug">
        <Composition
          id="Debug-LogoGrid"
          component={LogoGrid}
          defaultProps={{lines: Object.fromEntries(Object.entries(LOGO_CENTERLINES).map(([k, v]) => [k, v.points]))}}
          durationInFrames={1}
          {...VIDEO}
        />
      </Folder>
    </>
  );
};
