// Jam-track progressions written as scale degrees, so they can be built in any key.
import type { StyleId } from '../audio/player';
import { noteName, usesFlats, type Key, type Tonality } from '../music/theory';

export interface Progression {
  id: string;
  name: string;
  tonality: Tonality | 'blues';
  // each bar: list of [semitones above key root, chord quality]
  bars: Array<Array<[number, string]>>;
  defaultStyle: StyleId;
  defaultBpm: number;
  description: string;
}

const b = (...chords: Array<[number, string]>) => chords;

export const PROGRESSIONS: Progression[] = [
  {
    id: 'blues12',
    name: '12-bar blues',
    tonality: 'blues',
    bars: [
      b([0, '7']), b([5, '7']), b([0, '7']), b([0, '7']),
      b([5, '7']), b([5, '7']), b([0, '7']), b([0, '7']),
      b([7, '7']), b([5, '7']), b([0, '7']), b([7, '7']),
    ],
    defaultStyle: 'shuffle',
    defaultBpm: 90,
    description: 'I–IV–V dominant blues (quick change). Solo with minor pentatonic of the key.',
  },
  {
    id: 'minor-blues',
    name: 'Minor blues',
    tonality: 'minor',
    bars: [
      b([0, 'm']), b([0, 'm']), b([0, 'm']), b([0, 'm']),
      b([5, 'm']), b([5, 'm']), b([0, 'm']), b([0, 'm']),
      b([8, '']), b([7, '7']), b([0, 'm']), b([7, '7']),
    ],
    defaultStyle: 'slowblues',
    defaultBpm: 70,
    description: '"The Thrill Is Gone"-style minor blues. Minor pentatonic all the way.',
  },
  {
    id: 'aeolian-rock',
    name: 'i – bVII – bVI – bVII',
    tonality: 'minor',
    bars: [b([0, 'm']), b([10, '']), b([8, '']), b([10, ''])],
    defaultStyle: 'rock',
    defaultBpm: 100,
    description: 'Epic minor rock progression ("All Along the Watchtower" feel).',
  },
  {
    id: 'minor-vamp',
    name: 'i – iv vamp',
    tonality: 'minor',
    bars: [b([0, 'm7']), b([0, 'm7']), b([5, 'm7']), b([5, 'm7'])],
    defaultStyle: 'funk',
    defaultBpm: 96,
    description: 'Two-chord minor groove. Lots of space to experiment.',
  },
  {
    id: 'dorian',
    name: 'i – IV (Dorian)',
    tonality: 'minor',
    bars: [b([0, 'm']), b([5, '']), b([0, 'm']), b([5, ''])],
    defaultStyle: 'funk',
    defaultBpm: 120,
    description: 'Santana "Evil Ways" / "Oye Como Va" vibe.',
  },
  {
    id: 'minor-pop',
    name: 'i – bVI – bIII – bVII',
    tonality: 'minor',
    bars: [b([0, 'm']), b([8, '']), b([3, '']), b([10, ''])],
    defaultStyle: 'pop',
    defaultBpm: 100,
    description: 'Modern minor pop/rock loop.',
  },
  {
    id: 'one-chord-minor',
    name: 'One-chord minor drone',
    tonality: 'minor',
    bars: [b([0, 'm']), b([0, 'm']), b([0, 'm']), b([0, 'm'])],
    defaultStyle: 'rock',
    defaultBpm: 80,
    description: 'Just the tonic — the easiest way to hear how each scale note sounds.',
  },
  {
    id: 'i-iv-v',
    name: 'I – IV – V',
    tonality: 'major',
    bars: [b([0, '']), b([5, '']), b([7, '']), b([5, ''])],
    defaultStyle: 'rock',
    defaultBpm: 100,
    description: 'Three-chord classic rock / country.',
  },
  {
    id: 'pop-axis',
    name: 'I – V – vi – IV',
    tonality: 'major',
    bars: [b([0, '']), b([7, '']), b([9, 'm']), b([5, ''])],
    defaultStyle: 'pop',
    defaultBpm: 96,
    description: 'The "four chord song" progression used in hundreds of hits.',
  },
  {
    id: 'mixolydian',
    name: 'I – bVII – IV',
    tonality: 'major',
    bars: [b([0, '']), b([10, '']), b([5, '']), b([5, ''])],
    defaultStyle: 'rock',
    defaultBpm: 98,
    description: 'Southern rock (Sweet Home Alabama feel). Major pentatonic shines.',
  },
  {
    id: 'doo-wop',
    name: 'I – vi – IV – V',
    tonality: 'major',
    bars: [b([0, '']), b([9, 'm']), b([5, '']), b([7, ''])],
    defaultStyle: 'folk',
    defaultBpm: 110,
    description: '50s progression (Stand By Me).',
  },
  {
    id: 'one-chord-major',
    name: 'One-chord major drone',
    tonality: 'major',
    bars: [b([0, '']), b([0, '']), b([0, '']), b([0, ''])],
    defaultStyle: 'folk',
    defaultBpm: 80,
    description: 'Just the tonic chord — hear how major pentatonic notes sound over it.',
  },
];

export function progressionKeyTonality(p: Progression): Tonality {
  return p.tonality === 'minor' ? 'minor' : 'major';
}

/** Build a text chart for a progression in a key */
export function buildProgressionChart(p: Progression, key: Key): string[][] {
  const flats = usesFlats({ root: key.root, tonality: progressionKeyTonality(p) });
  return p.bars.map((bar) => bar.map(([semi, q]) => noteName(key.root + semi, flats) + q));
}
