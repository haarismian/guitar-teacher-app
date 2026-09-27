// Guitar chord voicings (for diagrams and for the synth to strum).
import { parseChord, STANDARD_TUNING, mod12, type ParsedChord } from './theory';

export interface Voicing {
  frets: number[]; // 6 entries, low E -> high e, -1 = muted
  baseFret: number; // first fret shown in diagram
  barre?: { fret: number; from: number; to: number };
  name: string;
}

// Open-position shapes keyed by chord symbol (sharps normalized)
const OPEN: Record<string, number[]> = {
  C: [-1, 3, 2, 0, 1, 0],
  Cmaj7: [-1, 3, 2, 0, 0, 0],
  C7: [-1, 3, 2, 3, 1, 0],
  Cadd9: [-1, 3, 2, 0, 3, 0],
  Csus4: [-1, 3, 3, 0, 1, 1],
  C6: [-1, 3, 2, 2, 1, 0],
  D: [-1, -1, 0, 2, 3, 2],
  Dm: [-1, -1, 0, 2, 3, 1],
  D7: [-1, -1, 0, 2, 1, 2],
  Dm7: [-1, -1, 0, 2, 1, 1],
  Dmaj7: [-1, -1, 0, 2, 2, 2],
  Dsus2: [-1, -1, 0, 2, 3, 0],
  Dsus4: [-1, -1, 0, 2, 3, 3],
  Dadd9: [-1, -1, 0, 2, 3, 0],
  D69: [2, 0, 0, 2, 0, 0],
  D6: [-1, -1, 0, 2, 0, 2],
  E: [0, 2, 2, 1, 0, 0],
  Em: [0, 2, 2, 0, 0, 0],
  E7: [0, 2, 0, 1, 0, 0],
  Em7: [0, 2, 2, 0, 3, 0],
  Emaj7: [0, 2, 1, 1, 0, 0],
  Esus4: [0, 2, 2, 2, 0, 0],
  E5: [0, 2, 2, -1, -1, -1],
  Eadd9: [0, 2, 2, 1, 0, 2],
  Em9: [0, 2, 0, 0, 0, 2],
  F: [1, 3, 3, 2, 1, 1],
  Fmaj7: [-1, -1, 3, 2, 1, 0],
  Fm: [1, 3, 3, 1, 1, 1],
  G: [3, 2, 0, 0, 0, 3],
  G7: [3, 2, 0, 0, 0, 1],
  Gmaj7: [3, 2, 0, 0, 0, 2],
  G6: [3, 2, 0, 0, 0, 0],
  Gsus4: [3, 3, 0, 0, 1, 3],
  G5: [3, -1, 0, 0, 3, 3],
  A: [-1, 0, 2, 2, 2, 0],
  Am: [-1, 0, 2, 2, 1, 0],
  A7: [-1, 0, 2, 0, 2, 0],
  Am7: [-1, 0, 2, 0, 1, 0],
  Amaj7: [-1, 0, 2, 1, 2, 0],
  Asus2: [-1, 0, 2, 2, 0, 0],
  Asus4: [-1, 0, 2, 2, 3, 0],
  A7sus4: [-1, 0, 2, 0, 3, 0],
  A5: [-1, 0, 2, 2, -1, -1],
  Aadd9: [-1, 0, 2, 4, 2, 0],
  B7: [-1, 2, 1, 2, 0, 2],
};

// Movable shapes as fret offsets from the root fret.
const E_SHAPE: Record<string, number[]> = {
  '': [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  '7': [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  maj7: [0, -1, 1, 1, 0, -1],
  sus4: [0, 2, 2, 2, 0, 0],
  '7sus4': [0, 2, 0, 2, 0, 0],
  '5': [0, 2, 2, -1, -1, -1],
};
const A_SHAPE: Record<string, number[]> = {
  '': [-1, 0, 2, 2, 2, 0],
  m: [-1, 0, 2, 2, 1, 0],
  '7': [-1, 0, 2, 0, 2, 0],
  m7: [-1, 0, 2, 0, 1, 0],
  maj7: [-1, 0, 2, 1, 2, 0],
  sus2: [-1, 0, 2, 2, 0, 0],
  sus4: [-1, 0, 2, 2, 3, 0],
  '7sus4': [-1, 0, 2, 0, 3, 0],
  '5': [-1, 0, 2, 2, -1, -1],
  '9': [-1, 0, -1, 0, 0, 0],
  '6': [-1, 0, 2, 2, 2, 2],
  m6: [-1, 0, 2, 2, 1, 2],
  dim: [-1, 0, 1, 2, 1, -1],
  m7b5: [-1, 0, 1, 0, 1, -1],
};

// If a quality has no shape, fall back to a simpler one that still sounds right
const SIMPLIFY: Record<string, string> = {
  add9: '',
  madd9: 'm',
  '69': '6',
  '6': '',
  m6: 'm',
  '9': '7',
  m9: 'm7',
  maj9: 'maj7',
  '11': '7',
  '13': '7',
  dim7: 'dim',
  m7b5: 'm7',
  dim: 'm',
  aug: '',
  mmaj7: 'm',
  sus2: '',
  '7sus4': '7',
  maj7: '',
  m7: 'm',
  '7': '',
  sus4: '',
  '5': '',
};

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function buildVoicing(frets: number[], name: string): Voicing {
  const played = frets.filter((f) => f > 0);
  const min = played.length ? Math.min(...played) : 1;
  const max = played.length ? Math.max(...played) : 1;
  const baseFret = max <= 4 ? 1 : min;
  let barre: Voicing['barre'];
  if (min > 0 && frets.filter((f) => f === min).length >= 2 && frets[0] !== 0) {
    const idx = frets.map((f, i) => (f === min ? i : -1)).filter((i) => i >= 0);
    const from = idx[0];
    const to = idx[idx.length - 1];
    // A barre makes sense only when no string in between is lower / muted
    if (to - from >= 2 && frets.slice(from, to + 1).every((f) => f >= min)) barre = { fret: min, from, to };
  }
  return { frets, baseFret, barre, name };
}

function shapeFor(root: number, quality: string, name: string): Voicing | null {
  const key = SHARP[root] + quality;
  if (OPEN[key]) return buildVoicing(OPEN[key], name);
  const candidates: number[][] = [];
  if (E_SHAPE[quality]) {
    const r = mod12(root - 4);
    candidates.push(E_SHAPE[quality].map((o) => (o < 0 ? -1 : o + r)));
  }
  if (A_SHAPE[quality]) {
    const r = mod12(root - 9);
    candidates.push(A_SHAPE[quality].map((o) => (o < 0 ? -1 : o + r)));
  }
  if (!candidates.length) return null;
  const lowest = (fr: number[]) => Math.min(...fr.filter((f) => f >= 0));
  candidates.sort((a, b) => lowest(a) - lowest(b));
  return buildVoicing(candidates[0], name);
}

const cache = new Map<string, Voicing | null>();

export function voicingFor(symbol: string): Voicing | null {
  if (cache.has(symbol)) return cache.get(symbol)!;
  const c = parseChord(symbol);
  let v: Voicing | null = null;
  if (c) {
    let q = c.quality;
    for (let i = 0; i < 4 && !v; i++) {
      v = shapeFor(c.root, q, symbol);
      if (!v) {
        if (SIMPLIFY[q] === undefined) break;
        q = SIMPLIFY[q];
      }
    }
    // Slash chords: try to put the bass note on low E if it's a close fret
    if (v && c.bass !== null) {
      const bassFret = mod12(c.bass - 4);
      const f = [...v.frets];
      const played = f.filter((x) => x >= 0);
      const lo = Math.min(...played);
      const hi = Math.max(...played);
      if (bassFret >= lo - 3 && bassFret <= hi + 1 && bassFret <= 5) {
        f[0] = bassFret;
        v = buildVoicing(f, symbol);
      } else if (f[0] >= 0) {
        f[0] = -1;
        v = buildVoicing(f, symbol);
      }
    }
  }
  cache.set(symbol, v);
  return v;
}

/** MIDI notes to sound for a chord symbol, low to high. */
export function chordMidiNotes(symbol: string): number[] {
  const v = voicingFor(symbol);
  if (v) {
    return v.frets.map((f, i) => (f < 0 ? -1 : STANDARD_TUNING[i] + f)).filter((n) => n >= 0);
  }
  const c = parseChord(symbol);
  if (!c) return [];
  return closeVoicing(c);
}

function closeVoicing(c: ParsedChord): number[] {
  const base = 48 + c.root;
  return c.intervals.map((i) => base + i);
}

export function chordBassNote(symbol: string): number | null {
  const c = parseChord(symbol);
  if (!c) return null;
  const pc = c.bass ?? c.root;
  // E1 (28) .. D#2 (39) range
  return 28 + mod12(pc - 4);
}

export function chordToneClasses(symbol: string): number[] {
  const c = parseChord(symbol);
  if (!c) return [];
  return c.intervals.map((i) => mod12(c.root + i));
}
