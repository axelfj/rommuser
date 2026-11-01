// Plugins gratis de ROMMUSER (repo axelfj/music-plugins). `slug` es el prefijo
// de los tags de release y el nombre de la captura en public/plugins/img/.

export type Category = 'mezcla' | 'dinamica' | 'efectos' | 'voz' | 'instrumentos';

export interface Plugin {
  name: string;
  slug: string;
  category: Category;
  es: string;
  en: string;
}

export const CATEGORIES: { id: Category; es: string; en: string }[] = [
  { id: 'mezcla', es: 'Mezcla', en: 'Mixing' },
  { id: 'dinamica', es: 'Dinámica y master', en: 'Dynamics and mastering' },
  { id: 'efectos', es: 'Efectos', en: 'Effects' },
  { id: 'voz', es: 'Voz', en: 'Vocals' },
  { id: 'instrumentos', es: 'Instrumentos y MIDI', en: 'Instruments and MIDI' },
];

export const PLUGINS: Plugin[] = [
  { name: 'EQ-R', slug: 'shape-eq', category: 'mezcla', es: 'EQ de 12 bandas con analizador y Mid/Side.', en: '12-band EQ with analyzer and Mid/Side.' },
  { name: 'Filter-R', slug: 'filter-ready', category: 'mezcla', es: 'Doble filtro resonante con LFO sincronizado y drive.', en: 'Dual resonant filter with synced LFO and drive.' },
  { name: 'Stereo-R', slug: 'low-mono', category: 'mezcla', es: 'Imagen estéreo con graves en mono y goniómetro.', en: 'Stereo imager with mono lows and goniometer.' },
  { name: 'Resonance-R', slug: 'res-tame', category: 'mezcla', es: 'Doma resonancias molestas de forma dinámica.', en: 'Tames harsh resonances dynamically.' },
  { name: 'Transient-R', slug: 'punch-shape', category: 'mezcla', es: 'Más o menos ataque y cola en drums y bajos.', en: 'More or less attack and sustain on drums and bass.' },
  { name: 'Sidechain-R', slug: 'duck-ready', category: 'mezcla', es: 'Sidechain al tempo, por MIDI o por el bombo.', en: 'Sidechain by tempo, MIDI or the kick.' },
  { name: 'Compressor-R', slug: 'press-ready', category: 'dinamica', es: 'Compresor con tres caracteres: Clean, Punch y Glue.', en: 'Compressor with three characters: Clean, Punch and Glue.' },
  { name: 'Multiband-R', slug: 'band-push', category: 'dinamica', es: 'Compresión de 3 bandas estilo OTT con una perilla.', en: '3-band OTT-style compression with one knob.' },
  { name: 'Gate-R', slug: 'gate-ready', category: 'dinamica', es: 'Gate y expansor para limpiar ruido entre golpes.', en: 'Gate and expander to clean noise between hits.' },
  { name: 'Clipper-R', slug: 'clip-ready', category: 'dinamica', es: 'Clipper suave para drums, bajos y master.', en: 'Soft clipper for drums, bass and master.' },
  { name: 'Limiter-R', slug: 'peak-ready', category: 'dinamica', es: 'Limitador true-peak con medidor LUFS.', en: 'True-peak limiter with LUFS meter.' },
  { name: 'Meter-R', slug: 'master-check-live', category: 'dinamica', es: 'Medidor LUFS y true peak con perfiles de Spotify, Apple y más.', en: 'LUFS and true-peak meter with Spotify, Apple and other profiles.' },
  { name: 'Saturator-R', slug: 'warm-drive', category: 'efectos', es: 'Saturación tape, tube y más, de 1 a 4 bandas.', en: 'Tape, tube and more saturation, 1 to 4 bands.' },
  { name: 'Delay-R', slug: 'echo-ready', category: 'efectos', es: 'Delay estéreo y ping-pong al tempo.', en: 'Tempo-synced stereo and ping-pong delay.' },
  { name: 'Pitch Delay-R', slug: 'shimmer-ready', category: 'efectos', es: 'Delay con cambio de tono y reverb shimmer.', en: 'Pitch-shifting delay with shimmer reverb.' },
  { name: 'Reverb-R', slug: 'space-ready', category: 'efectos', es: 'Reverb Room, Plate, Hall y Ambience con freeze.', en: 'Room, Plate, Hall and Ambience reverb with freeze.' },
  { name: 'Chorus-R', slug: 'wide-ready', category: 'efectos', es: 'Chorus, ensemble y flanger para abrir sonidos.', en: 'Chorus, ensemble and flanger to widen sounds.' },
  { name: 'Phaser-R', slug: 'phase-ready', category: 'efectos', es: 'Phaser de 4 a 12 etapas con LFO al tempo.', en: '4 to 12-stage phaser with tempo-synced LFO.' },
  { name: 'Stutter-R', slug: 'stutter-ready', category: 'efectos', es: 'Stutter y glitch al tempo para builds y transiciones.', en: 'Tempo-synced stutter and glitch for builds and transitions.' },
  { name: 'Pitch-R', slug: 'pitch-r', category: 'efectos', es: 'Cambia el tono de cualquier cosa sin artefactos, ±24 semitonos.', en: 'Shifts the pitch of anything without artifacts, ±24 semitones.' },
  { name: 'Tune-R', slug: 'tune-ready', category: 'voz', es: 'Afinación de voz en tiempo real por escala.', en: 'Real-time vocal tuning to a scale.' },
  { name: 'Vocoder-R', slug: 'vox-synth', category: 'voz', es: 'Armonías, vocoder y voz robot.', en: 'Harmonies, vocoder and robot voice.' },
  { name: 'De-Esser-R', slug: 'ess-clean', category: 'voz', es: 'Baja las eses y sibilancias que lastiman.', en: 'Tames harsh S sounds and sibilance.' },
  { name: 'Synth-R', slug: 'wave-ready', category: 'instrumentos', es: 'Sintetizador wavetable con 13 presets.', en: 'Wavetable synth with 13 presets.' },
  { name: 'Kick-R', slug: 'kick-ready', category: 'instrumentos', es: 'Diseñá tu propio bombo y exportalo a WAV.', en: 'Design your own kick and export it to WAV.' },
  { name: 'Chord-R', slug: 'chord-ready', category: 'instrumentos', es: 'Una tecla, un acorde completo en la escala.', en: 'One key, one full chord in your scale.' },
  { name: 'Arpeggiator-R', slug: 'arp-ready', category: 'instrumentos', es: 'Arpegiador MIDI al tempo con patrón de 16 pasos.', en: 'Tempo-synced MIDI arpeggiator with a 16-step pattern.' },
];

export const REPO_URL = 'https://github.com/axelfj/music-plugins';

/** Manual del plugin (ES/EN) en docs/manuals/ del repo. */
export function manualUrl(slug: string): string {
  return `${REPO_URL}/blob/main/docs/manuals/${slug}.md`;
}

/** Lista de releases de un plugin; sigue sirviendo cuando sale una versión nueva. */
export function downloadUrl(slug: string): string {
  return `${REPO_URL}/releases?q=${encodeURIComponent(`${slug}-v`)}&expanded=true`;
}
