import voTimings from './vo-timings.json';
import type {SceneId} from '../scenes/config';

export type VoWord = {word: string; start: number; end: number; display: string};

// Word timings from the TTS, paired with the original tokens so punctuation survives.
export const getVo = (id: SceneId) => {
  const entry = (voTimings as Record<string, {text: string; words: Omit<VoWord, 'display'>[]}>)[id];
  const tokens = entry.text.split(' ');
  const words: VoWord[] = entry.words.map((w, i) => ({...w, display: tokens[i] ?? w.word}));
  return {text: entry.text, words, end: words[words.length - 1].end};
};

// Seconds (from the VO start) at which a given word is spoken. Used to sync animation beats to the voice.
export const wordTime = (id: SceneId, word: string, occurrence = 0) => {
  const hits = getVo(id).words.filter((w) => w.word.toLowerCase().replace(/[^a-z0-9'-]/g, '') === word.toLowerCase());
  const hit = hits[occurrence];
  if (!hit) throw new Error(`Word "${word}" not found in VO ${id}`);
  return hit.start;
};
