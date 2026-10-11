import {VIDEO} from '../brand/tokens';

export type SceneId =
  | 's01' | 'gap' | 's02' | 's03' | 's04' | 'report' | 's05' | 's06' | 's07' | 'why' | 'radar' | 'market' | 's08'
  | 'pay' | 'value' | 'unit' | 'gate' | 'payback' | 'scale'
  | 'team' | 'proto' | 'close';

export type SceneConfig = {
  id: SceneId;
  // Position in the full pitch (filled in from BLOCK_ORDER; the block starts at 0:55).
  slot: string;
  title: string;
  seconds: number;
  // When the voice-over line starts, in seconds from the scene start.
  voAt: number;
  // Copy that appears on screen (always English).
  onScreen: string[];
  // Internal note for the team, only shown in the animatic.
  visual: string;
};

// Block 2 — Solution + market (merged with the marketing block). s01 picks up from the team's opening. All timing lives here so scenes can be
// retimed without touching animation code. Scenes not in BLOCK_ORDER are kept but not played in the block.
export const SCENES: SceneConfig[] = [
  {
    id: 's01',
    slot: '0:55 – 1:01',
    title: 'Wave → Logo',
    seconds: 5.6,
    voAt: 3.15,
    onScreen: ['VoxWave'],
    visual: 'Arranca en el último fotograma de la apertura: la línea coral quieta en el centro sobre negro. Se estira, se abre en tres ondas (blanca, coral, teal) que crecen y se ordenan hasta formar el símbolo del logo. El fondo se ilumina; "Meet VoxWave" con nuestro locutor. Sale: el símbolo cae en una burbuja de papel que se expande a pantalla completa.',
  },
  {
    id: 'gap',
    slot: '',
    title: 'The silence',
    seconds: 10,
    voAt: 0.4,
    onScreen: ['Nearly 90%', 'Visit 1', 'Visit 2', 'The monitoring gap'],
    visual: 'Papel. La línea plana despierta en onda coral (movida por la voz). Tarjeta "NEARLY 90% · SPEECH IMPAIRMENT". Bajan las agujas VISIT 1 y VISIT 2; la onda pierde color y amplitud: nadie escucha. Caja punteada "THE MONITORING GAP". En "until now" la onda recupera el coral y la caja se vuelve sólida y se convierte en el móvil.',
  },
  {
    id: 's02',
    slot: '1:01 – 1:08',
    title: 'Daily voice session',
    seconds: 9,
    voAt: 0.3,
    onScreen: ['Your daily voice session · 3 min', 'Hold an “aah”', 'Read a line', 'Chat a little', 'Session complete', 'Every day. 3 minutes.', 'A daily habit, for your voice.'],
    visual: 'La caja del hueco es el móvil. Llega la notificación "Your daily voice session · 3 min", se abre la app y las tres actividades (aah sostenida, leer una frase, charlar un poco) se encienden y se marcan al nombrarlas. Sesión completada, racha +1. A la derecha la señal de voz en vivo; la cámara entra en la onda.',
  },
  {
    id: 's03',
    slot: '1:08 – 1:15',
    title: 'Vocal biomarkers',
    seconds: 7,
    voAt: 0.5,
    onScreen: ['Tremor', 'Pitch', 'Rhythm', 'Pauses'],
    visual: 'La onda se acerca a cámara y se divide en 4. Cada etiqueta pulsa al decirse y enciende su indicador numérico.',
  },
  {
    id: 's04',
    slot: '1:15 – 1:23',
    title: 'Trend & alert',
    seconds: 7,
    voAt: 0.6,
    onScreen: ['Personal baseline', 'Trend change detected'],
    visual: 'Las métricas se convierten en una tendencia de varias semanas con la banda base del paciente. Un punto sale de la banda, la línea se tiñe de coral y salta la alerta.',
  },
  {
    id: 's05',
    slot: '1:23 – 1:29',
    title: "We don't diagnose",
    seconds: 6,
    voAt: 0.4,
    onScreen: ["We don't diagnose.", 'We fill the gap.', 'Visit', '3–6 months', 'Visit'],
    visual: 'Tipografía sobre navy. "diagnose" se tacha en coral. Dos marcadores "Visit" con un hueco; decenas de puntos lo rellenan hasta formar una línea. Música casi en silencio.',
  },
  {
    id: 's06',
    slot: '1:29 – 1:36',
    title: 'Device turntable',
    seconds: 7,
    voAt: 0.3,
    onScreen: ['VoxWave device · works offline', 'No smartphone?', 'No internet?', 'We thought of them too.', 'Simple device', 'Same weekly session'],
    visual: 'Render 3D (Blender) del dispositivo blanco girando 360°. La música vuelve a subir.',
  },
  {
    id: 's07',
    slot: '1:36 – 1:43',
    title: 'Device close-up',
    seconds: 7,
    voAt: 0.15,
    onScreen: ['One button.', 'Works offline.', 'Clear advice, on screen.', 'Syncs at every checkup.'],
    visual: 'Primer plano cinematográfico. Tres frases con golpe seco. La pantalla LED muestra "Contact your neurologist".',
  },
  {
    id: 's08',
    slot: '1:43 – 1:50',
    title: 'MVP montage',
    seconds: 5.1,
    voAt: 0.55,
    onScreen: ['What’s next', 'Our MVP', 'live at the', 'Final Weekend.'],
    visual: 'Portátil en 3D: el panel del neurólogo se construye tarjeta a tarjeta. Cierre: "Our MVP will be live at the Final Weekend." (va al final del vídeo, tras el equipo).',
  },
  {
    id: 'report',
    slot: '',
    title: "Neurologist's page",
    seconds: 6.5,
    voAt: 0.5,
    onScreen: ['VoxWave clinical report', '1-page clinician report', 'Quality flags', 'Session context'],
    visual: 'Una hoja vertical entra desde la derecha y la gráfica se acopla a su recuadro con un anillo coral. Mini-tendencias Jitter, Shimmer, HNR. Tarjetas "Quality flags" y "Session context".',
  },
  {
    id: 'why',
    slot: '',
    title: 'Why clinics choose it',
    seconds: 11,
    voAt: 0.5,
    onScreen: ['VoxWave · Frontline care', 'Locally adapted', 'Minimal staff friction', 'EU privacy-by-design', 'We measure', 'Doctors decide'],
    visual: 'Entramos por los píxeles de la pantalla a un plano técnico de la placa (line art sobre navy). La voz recorre las pistas como pulsos coral; cada argumento se enciende en su componente (micro, botón/USB-C, SoC con candado). El dato sale y se bifurca: WE MEASURE | DOCTORS DECIDE; la bifurcación se convierte en los ejes del radar.',
  },
  {
    id: 'radar',
    slot: '',
    title: 'What makes it different',
    seconds: 13.4,
    voAt: 1.5,
    onScreen: ['Local adaptation', 'Deployment friction', 'Heavy cloud & trial space', 'VoxWave'],
    visual: 'Sonar sobre navy: el barrido descubre ejes y rejilla, detecta a los competidores en el cuadrante "heavy cloud & trial" y termina con el ping coral de VoxWave en el cuadrante vacío.',
  },
  {
    id: 'market',
    slot: '',
    title: 'How we get there',
    seconds: 17.4,
    voAt: 1.0,
    onScreen: ['TAM · 10M+ worldwide', 'SAM · ≈16,000 Baltics', 'Lithuania · ≈7,600', 'SOM · 1,000 · our 3-year target', 'Vilnius', 'Kaunas', 'Hospitals'],
    visual: 'Globo girando → zoom a los Bálticos → Lituania. Cada nivel de zoom revela su cifra (TAM / SAM / SOM). Kaunas y Vilna con el corredor y los segmentos de entrada.',
  },
];

// Block 3 — Finance ("the ledger"): paper, line art and kinetic numbers.
SCENES.push(
  {
    id: 'pay',
    slot: '',
    title: 'Who pays · price',
    seconds: 10.3,
    voAt: 1.2,
    onScreen: ['Who pays?', 'Private clinics · B2B', 'Public health · B2G', '€40 / month · per patient', 'Paid by clinics & public health', '€0 for the patient', 'Device included if needed'],
    visual: 'El punto coral cae como una moneda y enciende el papel. "WHO PAYS?" de golpe. Se construye un hospital planta a planta y la moneda se posa en el tejado como su cruz. Un poste se clava en el suelo (polvo + temblor) y se despliega el cartel €40 / month · PAID BY CLINICS & HOSPITALS; cae un segundo cartel coral: €0 FOR THE PATIENT · DEVICE INCLUDED. El cartel de precio gira: €480 / year.',
  },
  {
    id: 'unit',
    slot: '',
    title: 'One patient',
    seconds: 12.1,
    voAt: 0.4,
    onScreen: ['One patient · one year · 52 sessions', 'Sessions', 'Cloud & database', 'Device · lent', 'Support', '≈€100', '≈80% contribution margin'],
    visual: '€480 = 52 barras de onda (las llamadas del año). Un ticket de caja imprime los costes; cada uno se come unas barras. El resto se vuelve coral: ≈80% CONTRIBUTION MARGIN. Las barras se forjan en una llave.',
  },
  {
    id: 'gate',
    slot: '',
    title: 'The gate',
    seconds: 9.5,
    voAt: 0.4,
    onScreen: ['Pilots', 'Clinical validation', 'CE mark', 'Revenue', 'A one-time investment', 'The barrier that keeps copycats out', '€50–110k · one-time · estimate'],
    visual: 'Línea de tiempo con hitos; en CE MARK se alza una puerta en line art con el símbolo CE. Las copias rebotan; la llave coral abre la puerta.',
  },
  {
    id: 'payback',
    slot: '',
    title: 'After the gate',
    seconds: 13,
    voAt: 0.4,
    onScreen: ['Gate repaid · ≈300 patients · ≈4% of Lithuania', '+€380 / patient / year', 'SOM · 3-year target · ≈€0.38M / year'],
    visual: 'La línea de tiempo se vuelve el eje PATIENTS; curva de contribución acumulada desde bajo cero; banda de repago; pin en 1.000 pacientes (SOM).',
  },
  {
    id: 'scale',
    slot: '',
    title: 'Scale',
    seconds: 10.4,
    voAt: 0.4,
    onScreen: ['16,000 × €480 ≈ €7.7M / year', 'Next · the rest of the EU', 'One language at a time'],
    visual: 'Mapa báltico en line art; la multiplicación en tipografía cinética; anillos por Europa con saludos en cada idioma.',
  },
);

// Block 4 — Team and close.
SCENES.push({
  id: 'team',
  slot: '',
  title: 'The team',
  seconds: 9.8,
  voAt: 0.75,
  onScreen: ['FdiProtocol', 'Martin · Voice AI & Machine Learning', 'Marco · Product Design & Finance', 'Victor · Marketing & Go-to-Market', 'Javier · Hardware Engineering', 'Vilnius, Lithuania'],
  visual: 'El punto coral de las finanzas viaja a la esquina de un marco coral que se dibuja; dentro, la foto del equipo (Vilnius) con un leve acercamiento. Pestaña "FdiProtocol". Un foco recorre a cada persona al decir su nombre: punto en la persona, línea navy hasta su etiqueta (nombre, rol, icono). Al final las etiquetas se recogen y queda el marco.',
});

SCENES.push({
  id: 'proto',
  slot: '',
  title: 'Built before',
  seconds: 6.4,
  voAt: 0.3,
  onScreen: ['Motion sensors', 'Biosignals', 'Clinical report', 'Stroke screening · from upper-limb movement', 'Prototype · Harvard HSIL Hackathon 2026'],
  visual: 'La tarjeta con la foto del equipo gira: detrás, el guante de detección de ictus del Harvard HSIL Hackathon con flechas a sus piezas. Sale: la cámara se mete en la pantalla del portátil de la foto, que se oscurece y llena el plano (así empieza la escena del MVP).',
});

SCENES.push({
  id: 'close',
  slot: '',
  title: 'Close',
  seconds: 11.3,
  voAt: 0.3,
  onScreen: ['Visit', 'VoxWave', 'What if the answer was there all along?', 'Creative Shock 2026 · FdiProtocol'],
  visual: 'Como la presentación del logo: la onda gris (marcas VISIT) tiembla con la voz sin que nadie la escuche. En "VoxWave makes sure someone hears it" un punto coral la enciende, se apagan las luces y se abre en las tres ondas brillantes con sus estelas. En la pausa se recogen en el logo, el papel se enciende desde él y sube el wordmark. La pregunta "What if the answer was there all along?", "Creative Shock 2026 · FdiProtocol" y fundido a negro.',
});

SCENES.push({
  id: 'value',
  slot: '',
  title: 'Why pay?',
  seconds: 10.9,
  voAt: 0.5,
  onScreen: ['Why pay?', 'TIME · Neurologist time', 'TRIAGE · The right patient, seen first', '€4,400 · 1 avoided hospital stay', '= covers 9 patients for a year'],
  visual: 'La etiqueta coral de €480 cae en el platillo izquierdo de una balanza en line art y se convierte en una pesa. En el derecho se apilan pesas, una encima de otra, al nombrarlas: TIME (tiempo del neurólogo), TRIAGE (el paciente adecuado, antes) y €4,400 (un ingreso hospitalario evitado), que vuelca la balanza. "= covers 9 patients for a year". La pesa vuelve a ser la etiqueta y regresa al centro (así empieza la escena de costes).',
});

// The order the scenes play in the block (0:55 onwards).
export const BLOCK_ORDER: SceneId[] = ['s01', 'gap', 's02', 's03', 's04', 'report', 's06', 's07', 'why', 'radar', 'market'];
// The block starts where the team's cinematic opening is cut (src/opening/Opening.tsx).
const BLOCK_START = 57.5;
export const FINANCE_ORDER: SceneId[] = ['pay', 'value', 'unit', 'gate', 'payback', 'scale'];
export const CLOSE_ORDER: SceneId[] = ['team', 'proto', 's08', 'close'];

export const sceneFrames = (scene: SceneConfig) => Math.round(scene.seconds * VIDEO.fps);

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
for (const s of SCENES) s.slot = '—';
const fillSlots = (order: SceneId[], start: number) => {
  let at = start;
  for (const id of order) {
    const s = SCENES.find((x) => x.id === id)!;
    s.slot = `${mmss(at)} – ${mmss(at + s.seconds)}`;
    at += s.seconds;
  }
  return at;
};
const BLOCK_END = fillSlots(BLOCK_ORDER, BLOCK_START);
const FINANCE_END = fillSlots(FINANCE_ORDER, BLOCK_END);
fillSlots(CLOSE_ORDER, FINANCE_END);

export const BLOCK_SCENES = BLOCK_ORDER.map((id) => SCENES.find((s) => s.id === id)!);
export const BLOCK2_FRAMES = BLOCK_SCENES.reduce((sum, s) => sum + sceneFrames(s), 0);
export const FINANCE_SCENES = FINANCE_ORDER.map((id) => SCENES.find((s) => s.id === id)!);
export const FINANCE_FRAMES = FINANCE_SCENES.reduce((sum, s) => sum + sceneFrames(s), 0);
export const CLOSE_SCENES = CLOSE_ORDER.map((id) => SCENES.find((s) => s.id === id)!);
export const CLOSE_FRAMES = CLOSE_SCENES.reduce((sum, s) => sum + sceneFrames(s), 0);

export const getScene = (id: SceneId) => {
  const scene = SCENES.find((s) => s.id === id);
  if (!scene) throw new Error(`Unknown scene ${id}`);
  return scene;
};
