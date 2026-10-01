// Links out to real backing tracks on Spotify / YouTube.
import { SCALES, noteName, type ScaleId } from '../music/theory';

export type SoloScale = Extract<ScaleId, 'minorPent' | 'majorPent' | 'blues'>;

export function scaleLabel(root: number, scale: SoloScale, flats = false) {
  return `${noteName(root, flats)} ${SCALES[scale].name.toLowerCase()}`;
}

/** What people actually call these tracks, so the search finds good results */
export function backingQuery(root: number, scale: SoloScale, flats = false) {
  const n = noteName(root, flats);
  if (scale === 'majorPent') return `${n} major backing track`;
  if (scale === 'blues') return `${n} blues backing track`;
  return `${n} minor backing track`;
}

export function spotifySearchUrl(q: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(q)}`;
}

export function youtubeSearchUrl(q: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
