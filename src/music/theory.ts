// Core music theory helpers: notes, keys, scales, chord parsing, key detection.

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Keys whose names conventionally use flats
const FLAT_MAJOR_KEYS = new Set([5, 10, 3, 8, 1, 6]); // F Bb Eb Ab Db Gb
const FLAT_MINOR_KEYS = new Set([2, 7, 0, 5, 10, 3]); // Dm Gm Cm Fm Bbm Ebm

export type Tonality = 'major' | 'minor';

export interface Key {
  root: number; // pitch class 0-11
  tonality: Tonality;
}

/** Standard tuning, low E to high e, as MIDI note numbers */
export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64];
export const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

export function usesFlats(key: Key): boolean {
  return key.tonality === 'major' ? FLAT_MAJOR_KEYS.has(key.root) : FLAT_MINOR_KEYS.has(key.root);
}

export function noteName(pc: number, flats = false): string {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
}

export function keyName(key: Key): string {
  return `${noteName(key.root, usesFlats(key))} ${key.tonality}`;
}

export function keyShortName(key: Key): string {
  return `${noteName(key.root, usesFlats(key))}${key.tonality === 'minor' ? 'm' : ''}`;
}

export function relativeMinor(key: Key): Key {
  return key.tonality === 'minor' ? key : { root: mod12(key.root - 3), tonality: 'minor' };
}

export function relativeMajor(key: Key): Key {
  return key.tonality === 'major' ? key : { root: mod12(key.root + 3), tonality: 'major' };
}

export function parseNoteName(s: string): number | null {
  const m = /^([A-Ga-g])([#b♯♭]?)$/.exec(s.trim());
  if (!m) return null;
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pc = base[m[1].toUpperCase()];
  if (m[2] === '#' || m[2] === '♯') pc += 1;
  if (m[2] === 'b' || m[2] === '♭') pc -= 1;
  return mod12(pc);
}

export function parseKey(s: string): Key | null {
  const m = /^\s*([A-Ga-g][#b]?)\s*(m|min|minor|maj|major)?\s*$/.exec(s);
  if (!m) return null;
  const root = parseNoteName(m[1]);
  if (root === null) return null;
  const tonality: Tonality = m[2] && m[2].startsWith('m') && !m[2].startsWith('maj') ? 'minor' : 'major';
  return { root, tonality };
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ---------- Scales ----------

export type ScaleId = 'minorPent' | 'majorPent' | 'blues' | 'major' | 'minor' | 'dorian' | 'mixolydian';

export const SCALES: Record<ScaleId, { name: string; intervals: number[]; degreeNames: string[] }> = {
  minorPent: { name: 'Minor pentatonic', intervals: [0, 3, 5, 7, 10], degreeNames: ['R', 'b3', '4', '5', 'b7'] },
  majorPent: { name: 'Major pentatonic', intervals: [0, 2, 4, 7, 9], degreeNames: ['R', '2', '3', '5', '6'] },
  blues: { name: 'Blues scale', intervals: [0, 3, 5, 6, 7, 10], degreeNames: ['R', 'b3', '4', 'b5', '5', 'b7'] },
  major: { name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11], degreeNames: ['R', '2', '3', '4', '5', '6', '7'] },
  minor: { name: 'Natural minor', intervals: [0, 2, 3, 5, 7, 8, 10], degreeNames: ['R', '2', 'b3', '4', '5', 'b6', 'b7'] },
  dorian: { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], degreeNames: ['R', '2', 'b3', '4', '5', '6', 'b7'] },
  mixolydian: { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], degreeNames: ['R', '2', '3', '4', '5', '6', 'b7'] },
};

export function scalePitchClasses(root: number, scale: ScaleId): number[] {
  return SCALES[scale].intervals.map((i) => mod12(root + i));
}

export function intervalName(root: number, pc: number): string {
  return ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'][mod12(pc - root)];
}

// ---------- Chords ----------

export interface ParsedChord {
  symbol: string;
  root: number;
  quality: string; // normalized quality key, e.g. '', 'm', '7', 'm7', 'maj7'
  bass: number | null; // slash bass pitch class
  intervals: number[];
}

const QUALITY_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '5': [0, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '69': [0, 4, 7, 9, 14],
  '9': [0, 4, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 21],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  aug: [0, 4, 8],
  mmaj7: [0, 3, 7, 11],
};

const QUALITY_ALIASES: Record<string, string> = {
  '': '',
  M: '',
  maj: '',
  major: '',
  m: 'm',
  min: 'm',
  minor: 'm',
  '-': 'm',
  '5': '5',
  '7': '7',
  dom7: '7',
  m7: 'm7',
  min7: 'm7',
  '-7': 'm7',
  maj7: 'maj7',
  M7: 'maj7',
  Δ: 'maj7',
  Δ7: 'maj7',
  sus: 'sus4',
  sus2: 'sus2',
  sus4: 'sus4',
  '7sus4': '7sus4',
  '7sus': '7sus4',
  add9: 'add9',
  add2: 'add9',
  '2': 'add9',
  madd9: 'madd9',
  madd2: 'madd9',
  '6': '6',
  m6: 'm6',
  '69': '69',
  '6/9': '69',
  '6add9': '69',
  '9': '9',
  m9: 'm9',
  maj9: 'maj9',
  '11': '11',
  '13': '13',
  dim: 'dim',
  '°': 'dim',
  o: 'dim',
  dim7: 'dim7',
  '°7': 'dim7',
  o7: 'dim7',
  m7b5: 'm7b5',
  ø: 'm7b5',
  aug: 'aug',
  '+': 'aug',
  mmaj7: 'mmaj7',
  mM7: 'mmaj7',
};

export function parseChord(symbol: string): ParsedChord | null {
  const s = symbol.trim().replace('♯', '#').replace('♭', 'b');
  const m = /^([A-G][#b]?)(.*)$/.exec(s);
  if (!m) return null;
  const root = parseNoteName(m[1]);
  if (root === null) return null;
  let rest = m[2];
  let bass: number | null = null;
  // Handle 6/9 before slash-bass parsing
  const sixNine = rest.replace('6/9', '69');
  const slash = /^(.*)\/([A-G][#b]?)$/.exec(sixNine);
  if (slash) {
    rest = slash[1];
    bass = parseNoteName(slash[2]);
  } else {
    rest = sixNine;
  }
  const quality = QUALITY_ALIASES[rest];
  if (quality === undefined) return null;
  return { symbol: s, root, quality, bass, intervals: QUALITY_INTERVALS[quality] };
}

export function isMinorQuality(q: string): boolean {
  return q.startsWith('m') && !q.startsWith('maj');
}

/** Simplified triad quality for diatonic analysis */
function triadType(q: string): 'maj' | 'min' | 'dim' | 'other' {
  if (q === 'dim' || q === 'dim7' || q === 'm7b5') return 'dim';
  if (isMinorQuality(q)) return 'min';
  if (q === '5' || q.startsWith('sus') || q === '7sus4') return 'other';
  return 'maj';
}

export function transposeChordSymbol(symbol: string, semitones: number, flats = false): string {
  const c = parseChord(symbol);
  if (!c) return symbol;
  const m = /^([A-G][#b]?)(.*)$/.exec(c.symbol)!;
  let rest = m[2];
  const slash = /^(.*)\/([A-G][#b]?)$/.exec(rest.replace('6/9', '69'));
  if (slash && c.bass !== null) {
    rest = `${slash[1].replace('69', '6/9')}/${noteName(c.bass + semitones, flats)}`;
  }
  return noteName(c.root + semitones, flats) + rest;
}

// ---------- Key detection ----------

const MAJOR_DIATONIC: Array<[number, 'maj' | 'min' | 'dim', number]> = [
  [0, 'maj', 3],
  [2, 'min', 1.5],
  [4, 'min', 1],
  [5, 'maj', 2],
  [7, 'maj', 2.5],
  [9, 'min', 1.5],
  [11, 'dim', 0.5],
  [10, 'maj', 0.75], // bVII - very common in rock (mixolydian)
];

export interface KeyGuess {
  key: Key;
  score: number;
  isBlues: boolean;
}

/**
 * Guess the key from a list of chord symbols (repeats count as weight).
 * Returns candidates sorted best-first.
 */
export function detectKey(symbols: string[]): KeyGuess[] {
  const chords = symbols.map(parseChord).filter((c): c is ParsedChord => !!c);
  if (chords.length === 0) return [];
  const first = chords[0];
  const last = chords[chords.length - 1];
  const dom7Count = chords.filter((c) => c.quality === '7' || c.quality === '9' || c.quality === '13').length;

  const results: KeyGuess[] = [];
  for (let root = 0; root < 12; root++) {
    for (const tonality of ['major', 'minor'] as Tonality[]) {
      const majRoot = tonality === 'major' ? root : mod12(root + 3);
      let score = 0;
      for (const c of chords) {
        const deg = mod12(c.root - majRoot);
        const t = triadType(c.quality);
        const hit = MAJOR_DIATONIC.find(([d, q]) => d === deg && (q === t || t === 'other'));
        if (hit) score += 1;
        else score -= 1;
        // minor keys commonly borrow a major V (harmonic minor)
        if (!hit && tonality === 'minor' && mod12(c.root - root) === 7 && t === 'maj') score += 1.6;
      }
      if (first.root === root && (triadType(first.quality) === (tonality === 'major' ? 'maj' : 'min') || triadType(first.quality) === 'other')) score += 2;
      if (last.root === root && (triadType(last.quality) === (tonality === 'major' ? 'maj' : 'min') || triadType(last.quality) === 'other')) score += 1.5;
      const tonicCount = chords.filter((c) => c.root === root).length;
      score += (tonicCount / chords.length) * 2;
      results.push({ key: { root, tonality }, score, isBlues: false });
    }
  }

  // Blues detection: mostly dominant 7 chords on I, IV, V
  if (dom7Count >= chords.length * 0.5) {
    const roots = [...new Set(chords.map((c) => c.root))];
    for (const r of roots) {
      const ok = roots.every((x) => [0, 5, 7].includes(mod12(x - r)));
      if (ok) {
        results.push({ key: { root: r, tonality: 'major' }, score: 999, isBlues: true });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

export interface SoloAdvice {
  scale: ScaleId;
  root: number;
  label: string;
  tips: string[];
}

export function soloAdvice(key: Key, isBlues = false): SoloAdvice[] {
  const flats = usesFlats(key);
  const n = (pc: number) => noteName(pc, flats);
  if (isBlues) {
    return [
      {
        scale: 'minorPent',
        root: key.root,
        label: `${n(key.root)} minor pentatonic`,
        tips: ['The classic blues sound — minor pentatonic over dominant 7 chords.', 'Bend the b3 slightly sharp for extra bluesiness.'],
      },
      {
        scale: 'blues',
        root: key.root,
        label: `${n(key.root)} blues scale`,
        tips: ['Add the b5 "blue note" as a passing tone — don\'t sit on it.'],
      },
      {
        scale: 'majorPent',
        root: key.root,
        label: `${n(key.root)} major pentatonic`,
        tips: ['Sweeter, B.B. King / country flavour. Try mixing with minor pentatonic.'],
      },
    ];
  }
  if (key.tonality === 'minor') {
    return [
      {
        scale: 'minorPent',
        root: key.root,
        label: `${n(key.root)} minor pentatonic`,
        tips: ['Your go-to scale. Start in box 1 — the root is under your first finger on the low E string.'],
      },
      {
        scale: 'blues',
        root: key.root,
        label: `${n(key.root)} blues scale`,
        tips: ['Same as minor pentatonic plus the b5 for grit.'],
      },
    ];
  }
  const rel = relativeMinor(key);
  return [
    {
      scale: 'majorPent',
      root: key.root,
      label: `${n(key.root)} major pentatonic`,
      tips: [
        `Uses the exact same shapes as ${n(rel.root)} minor pentatonic — but land on ${n(key.root)} to sound resolved.`,
        'Great for happy, country, and classic-rock sounding solos.',
      ],
    },
    {
      scale: 'major',
      root: key.root,
      label: `${n(key.root)} major scale`,
      tips: ['Adds the 4th and 7th to the pentatonic — more melodic options.'],
    },
  ];
}

// ---------- Fretboard helpers ----------

export interface FretPos {
  string: number; // 0 = low E ... 5 = high e
  fret: number;
}

/** Fret of a pitch class on the low E string within [minFret, minFret+11] */
export function fretOnString(pc: number, stringIndex: number, minFret = 0): number {
  const open = STANDARD_TUNING[stringIndex];
  let f = mod12(pc - open);
  while (f < minFret) f += 12;
  return f;
}

/**
 * The five pentatonic "boxes". Computed from the relative-minor pentatonic so that
 * Box 1 is always the classic minor box (root under first finger on low E).
 * Each box = two notes per string ascending in pitch.
 */
export function pentatonicBox(minorRoot: number, box: number, maxFret = 17): FretPos[] {
  const intervals = SCALES.minorPent.intervals;
  const rE = fretOnString(minorRoot, 0, 0);
  // starting fret on low E for this box
  let start = rE + intervals[box % 5];
  if (start > 12) start -= 12;
  // collect all scale notes (as midi) from start
  const pcs = new Set(scalePitchClasses(minorRoot, 'minorPent'));
  const positions: FretPos[] = [];
  let lastMidi = STANDARD_TUNING[0] + start - 1;
  for (let s = 0; s < 6; s++) {
    let count = 0;
    let midi = lastMidi + 1;
    while (count < 2) {
      if (pcs.has(mod12(midi))) {
        const fret = midi - STANDARD_TUNING[s];
        positions.push({ string: s, fret });
        count++;
        lastMidi = midi;
      }
      midi++;
    }
  }
  // if the box runs past the top of the displayed neck, drop an octave where possible
  const max = Math.max(...positions.map((p) => p.fret));
  const min = Math.min(...positions.map((p) => p.fret));
  if (max > maxFret && min - 12 >= 0) return positions.map((p) => ({ ...p, fret: p.fret - 12 }));
  return positions;
}

export function boxFretRange(positions: FretPos[]): [number, number] {
  const frets = positions.map((p) => p.fret);
  return [Math.min(...frets), Math.max(...frets)];
}

/** Fret of the minor root on the low E string, kept in a comfortable 3–14 range */
export function comfortableRootFret(pc: number): number {
  let f = fretOnString(pc, 0, 0);
  if (f < 3) f += 12;
  return f;
}

export const ALL_KEYS: Key[] = Array.from({ length: 12 }, (_, i) => [
  { root: i, tonality: 'major' as Tonality },
  { root: i, tonality: 'minor' as Tonality },
]).flat();

/** Diatonic chord names for a key (for "chords in this key" display) */
export function diatonicChords(key: Key): { roman: string; symbol: string }[] {
  const flats = usesFlats(key);
  if (key.tonality === 'major') {
    const romans = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    const offs = [0, 2, 4, 5, 7, 9, 11];
    const q = ['', 'm', 'm', '', '', 'm', 'dim'];
    return romans.map((r, i) => ({ roman: r, symbol: noteName(key.root + offs[i], flats) + q[i] }));
  }
  const romans = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
  const offs = [0, 2, 3, 5, 7, 8, 10];
  const q = ['m', 'dim', '', 'm', 'm', '', ''];
  return romans.map((r, i) => ({ roman: r, symbol: noteName(key.root + offs[i], flats) + q[i] }));
}
