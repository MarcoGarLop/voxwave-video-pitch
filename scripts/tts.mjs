// Generates the voice-over (one mp3 per scene) plus word timings with Edge neural TTS.
// Usage: npm run tts            -> all lines
//        npm run tts -- s05     -> only one scene
import {MsEdgeTTS, OUTPUT_FORMAT} from 'msedge-tts';
import fs from 'node:fs';
import path from 'node:path';

const VOICE = process.env.VOICE ?? 'en-US-AndrewMultilingualNeural';
const OUT_DIR = path.resolve('public/audio/vo');
const TIMINGS_FILE = path.resolve('src/data/vo-timings.json');

const LINES = {
  s01: "That's why we built VoxWave.",
  s02: 'No clinic visits. No new apps. Just call the people you love. We care while you talk.',
  s03: "Our AI hears what the human ear can't: tremor, pitch, rhythm and pauses.",
  s04: "Week after week, it learns each patient's own baseline, and flags the moment their voice starts to drift.",
  s05: "We don't diagnose. We fill the three-to-six-month gap with data between visits.",
  s06: 'And we designed it for those who need it most: rural areas, and people living alone.',
  s07: 'One button. Works offline. And if something changes, it tells them to call their specialist.',
  s08: 'And this is just the beginning: our MVP will be live at the Final Weekend.',
};

const only = process.argv[2];
fs.mkdirSync(OUT_DIR, {recursive: true});
fs.mkdirSync(path.dirname(TIMINGS_FILE), {recursive: true});
const timings = fs.existsSync(TIMINGS_FILE) ? JSON.parse(fs.readFileSync(TIMINGS_FILE, 'utf8')) : {};

for (const [id, text] of Object.entries(LINES)) {
  if (only && id !== only) continue;
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
    wordBoundaryEnabled: true,
  });
  const tmp = fs.mkdtempSync(path.join(OUT_DIR, '.tmp-'));
  const {audioFilePath, metadataFilePath} = await tts.toFile(tmp, text, {rate: '-4%'});
  fs.renameSync(audioFilePath, path.join(OUT_DIR, `${id}.mp3`));

  // Offsets come in 100ns ticks -> convert to seconds.
  const meta = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
  const words = meta.Metadata.filter((m) => m.Type === 'WordBoundary').map((m) => ({
    word: m.Data.text.Text,
    start: m.Data.Offset / 1e7,
    end: (m.Data.Offset + m.Data.Duration) / 1e7,
  }));
  timings[id] = {text, words};
  fs.rmSync(tmp, {recursive: true, force: true});
  tts.close();
  console.log(`${id}: ${words.at(-1)?.end.toFixed(2)}s  "${text}"`);
}

fs.writeFileSync(TIMINGS_FILE, JSON.stringify(timings, null, 2));
