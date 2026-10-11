import {staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import type {SceneConfig} from '../scenes/config';

// Loudness (0..1) of the scene's voice-over at the current frame, lightly smoothed over a few frames.
// Lets visuals (waves, kinetic type) move with the narrator's actual voice.
export const useVoAmplitude = (scene: SceneConfig) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const audioData = useAudioData(staticFile(`audio/vo/${scene.id}.mp3`));
  if (!audioData) return 0;
  const local = frame - Math.round(scene.voAt * fps);
  const at = (f: number) => {
    if (f < 0 || f / fps > audioData.durationInSeconds) return 0;
    const bins = visualizeAudio({fps, frame: f, audioData, numberOfSamples: 32});
    // Speech energy lives in the lower bins.
    return bins.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  };
  const raw = (at(local - 2) + 2 * at(local - 1) + 3 * at(local)) / 6;
  return Math.min(1, raw * 4);
};
