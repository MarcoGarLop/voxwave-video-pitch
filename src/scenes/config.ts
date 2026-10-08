import {VIDEO} from '../brand/tokens';

export type SceneId = 's01' | 's02' | 's03' | 's04' | 's05' | 's06' | 's07' | 's08';

export type SceneConfig = {
  id: SceneId;
  // Position in the full pitch (block 2 starts at 0:55).
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

// Block 2 — Solution. All timing lives here so scenes can be retimed without touching animation code.
export const SCENES: SceneConfig[] = [
  {
    id: 's01',
    slot: '0:55 – 1:01',
    title: 'Wave → Logo',
    seconds: 6,
    voAt: 3.6,
    onScreen: ['VoxWave'],
    visual: 'Negro. Tres ondas (navy, coral, teal) laten débiles, crecen y se ordenan hasta formar el símbolo del logo. El fondo se ilumina.',
  },
  {
    id: 's02',
    slot: '1:01 – 1:08',
    title: 'Phone call',
    seconds: 7,
    voAt: 0.4,
    onScreen: ['Daughter', 'Listening', 'We care while you talk.'],
    visual: 'Izquierda: llamada normal de "Daughter". El logo de VoxWave es una burbuja junto al móvil que se despliega en "Listening" al descolgar. Derecha: la forma de onda en vivo.',
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
    seconds: 8,
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
    voAt: 1.0,
    onScreen: ['Designed for those who need it most'],
    visual: 'Render 3D (Blender) del dispositivo blanco girando 360°. La música vuelve a subir.',
  },
  {
    id: 's07',
    slot: '1:36 – 1:43',
    title: 'Device close-up',
    seconds: 7,
    voAt: 0.6,
    onScreen: ['One button.', 'Works offline.', 'Clear advice, on screen.'],
    visual: 'Primer plano cinematográfico. Tres frases con golpe seco. La pantalla LED muestra "Contact your neurologist".',
  },
  {
    id: 's08',
    slot: '1:43 – 1:50',
    title: 'MVP montage',
    seconds: 7,
    voAt: 1.0,
    onScreen: ['Our MVP', 'will be live at the', 'Final Weekend.'],
    visual: '4 cortes rápidos de la interfaz: onda entrando, panel de métricas, tendencia y vista del neurólogo (portátil) con alerta.',
  },
];

export const sceneFrames = (scene: SceneConfig) => Math.round(scene.seconds * VIDEO.fps);

export const BLOCK2_FRAMES = SCENES.reduce((sum, s) => sum + sceneFrames(s), 0);

export const getScene = (id: SceneId) => {
  const scene = SCENES.find((s) => s.id === id);
  if (!scene) throw new Error(`Unknown scene ${id}`);
  return scene;
};
