import voTimings from './vo-timings.json';
import type {SceneId} from '../scenes/config';

export type VoWord = {word: string; start: number; end: number; display: string};

// Pauses inserted into a voice-over when it is played: the file is split at `at` (seconds into the file)
// and the rest starts `gap` seconds later. In the close, the logo forms in the silence between
// "…someone hears it." and "What if the answer was there all along?".
export const VO_GAPS: Partial<Record<SceneId, {at: number; gap: number}>> = {
  close: {at: 6.45, gap: 1.2},
};

const hasVo = (id: SceneId) => id in (voTimings as Record<string, unknown>);

// Word timings from the TTS (with any pause applied), paired with the original tokens so punctuation survives.
export const getVo = (id: SceneId) => {
  const entry = (voTimings as Record<string, {text: string; words: Omit<VoWord, 'display'>[]}>)[id];
  const tokens = entry.text.split(' ');
  const pause = VO_GAPS[id];
  const shift = (s: number) => (pause && s >= pause.at ? s + pause.gap : s);
  const words: VoWord[] = entry.words.map((w, i) => ({word: w.word, start: shift(w.start), end: shift(w.end), display: tokens[i] ?? w.word}));
  return {text: entry.text, words, end: words[words.length - 1].end};
};

// Word timings of a scene's voice-over, or none if it has no voice-over.
export const voWords = (id: SceneId): VoWord[] => (hasVo(id) ? getVo(id).words : []);

// Seconds (from the VO start) at which a given word is spoken. Used to sync animation beats to the voice.
export const wordTime = (id: SceneId, word: string, occurrence = 0) => {
  const hits = getVo(id).words.filter((w) => w.word.toLowerCase().replace(/[^a-z0-9'-]/g, '') === word.toLowerCase());
  const hit = hits[occurrence];
  if (!hit) throw new Error(`Word "${word}" not found in VO ${id}`);
  return hit.start;
};
