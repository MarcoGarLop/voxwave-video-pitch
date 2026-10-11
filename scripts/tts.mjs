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
  s01: 'Meet VoxWave.',
  gap: "Nearly ninety percent of people with Parkinson's see their speech change. Yet between visits, nobody is listening. Until now.",
  s02: "Every week, a three-minute voice session: hold an 'aah', read a line, chat a little. A small weekly habit, for your voice.",
  s03: "Our AI listens for what the ear can't: tremor, pitch, rhythm and pauses.",
  s04: "It learns each patient's own baseline, and flags the moment their voice starts to drift.",
  s05: "We don't diagnose. We fill the three-to-six-month gap with data between visits.",
  s06: {text: "Without a smartphone or internet? We thought of them too: a simple device, same session.", rate: "+2%"},
  s07: {text: "One button. Works offline. If something changes, it tells them to call their specialist, and syncs at every checkup.", rate: "+3%"},
  s08: 'Next: our MVP, live at the Final Weekend.',
  // Drafts from Recursos/Nuevo planteamiento.md; final wording is set when each scene is built.
  report: 'Before each checkup, the neurologist gets one clear page.',
  why: "Built for frontline care: locally adapted, minimal staff friction, EU privacy by design. We measure; doctors decide.",
  radar: "Global players like Canary Speech and Linus Health's Aural Analytics are built for heavy cloud platforms and clinical trials. VoxWave is built for the clinic floor.",
  market: "More than ten million people live with Parkinson's. Sixteen thousand in the Baltics. We start in Lithuania: neuro-rehab clinics and hospitals in Vilnius and Kaunas, with patient associations and university hospitals opening doors.",
  // Finance block.
  pay: "We sell to private clinics and public health providers: forty euros a month per patient. Free for the patient, device included.",
  unit: "That's four hundred and eighty euros a year. Sessions, cloud, the lent device and support cost about a hundred: roughly eighty percent contribution margin.",
  gate: 'One gate stands between us and that margin: CE marking. A one-time investment, and the barrier that keeps copycats out.',
  payback: 'About three hundred patients repay it. Then each patient adds nearly four hundred euros a year. A thousand patients, our three-year target, means close to four hundred thousand.',
  scale: "Across the Baltics: nearly eight million euros a year. Next: the rest of the EU, one language at a time.",
  // Block 4 — Team and close.
  // A roll call reads naturally a little quicker than the narration.
  team: {text: "Meet FDI Protocol. Martin leads voice AI, Marco product and finance, Victor go-to-market, Javier hardware.", rate: "+3%"},
  proto: {text: "We've built health hardware before: a stroke-screening glove for the Harvard HSIL Hackathon.", rate: "+3%"},
  close: "Between visits, a voice still has something to say. VoxWave makes sure someone hears it. What if the answer was there all along?",
};

const only = process.argv[2];
fs.mkdirSync(OUT_DIR, {recursive: true});
fs.mkdirSync(path.dirname(TIMINGS_FILE), {recursive: true});
const timings = fs.existsSync(TIMINGS_FILE) ? JSON.parse(fs.readFileSync(TIMINGS_FILE, 'utf8')) : {};

for (const [id, line] of Object.entries(LINES)) {
  const {text, rate} = typeof line === 'string' ? {text: line, rate: '-4%'} : line;
  if (only && id !== only) continue;
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
    wordBoundaryEnabled: true,
  });
  const tmp = fs.mkdtempSync(path.join(OUT_DIR, '.tmp-'));
  // The voice is multilingual and guesses the language of each sentence ("No smartphone, no internet?" came
  // out in Portuguese). The free endpoint rejects <lang> tags, so avoid openings that read as another language.
  const {audioFilePath, metadataFilePath} = await tts.toFile(tmp, text, {rate});
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
