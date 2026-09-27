import { parseChart, uniqueChords } from '../audio/player';
import { detectKey, parseKey, type Key } from '../music/theory';
import type { AppState } from '../store/store';
import { SONGS, type Song } from './songs';

export function allSongs(s: AppState): Song[] {
  return [...SONGS, ...s.customSongs];
}

export function findSong(s: AppState, id: string): Song | undefined {
  return allSongs(s).find((x) => x.id === id);
}

export function songBars(song: Song) {
  return parseChart(song.chart);
}

/** The key to solo in: stated key if parseable, else detected from chords (concert pitch). */
export function songKey(song: Song): { key: Key; isBlues: boolean } {
  const bars = parseChart(song.chart);
  const chords = bars.flatMap((b) => b.chords);
  const guesses = detectKey(chords);
  const isBlues = guesses[0]?.isBlues ?? false;
  const stated = parseKey(song.key);
  if (stated) return { key: stated, isBlues };
  const g = guesses[0]?.key ?? { root: 9, tonality: 'minor' as const };
  return { key: { root: (g.root + (song.capo ?? 0)) % 12, tonality: g.tonality }, isBlues };
}

export { uniqueChords };
