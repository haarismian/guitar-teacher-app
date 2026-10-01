// Persistent app state in localStorage, exposed via a tiny subscribe/useSyncExternalStore store.
import { useSyncExternalStore } from 'react';
import type { Song } from '../data/songs';

export type LickStatus = 'new' | 'learning' | 'comfortable' | 'mastered';
export type SongStatus = 'none' | 'learning' | 'can-play' | 'mastered';

export interface SessionLog {
  id: string;
  date: string; // ISO timestamp
  minutes: number;
  plannedMinutes: number;
  items: string[]; // human readable summaries
  lessonId?: string;
  rating?: 1 | 2 | 3;
  note?: string;
}

export interface TempoEntry {
  date: string;
  exercise: string; // e.g. "box1", "lick:descending-run", "changes:G-C"
  value: number; // bpm or changes per minute
}

export interface SoloPlan {
  id: string;
  name: string;
  lickIds: string[];
  key: string; // root note name, e.g. "G"
  scale?: 'minorPent' | 'majorPent' | 'blues';
  source?: 'builtin' | 'external';
  progression?: string;
  bpm?: number;
}

export interface AppState {
  version: 1;
  completedLessons: Record<string, string>; // lessonId -> ISO date
  checklist: Record<string, boolean[]>;
  sessions: SessionLog[];
  lickStatus: Record<string, LickStatus>;
  songStatus: Record<string, SongStatus>;
  customSongs: Song[];
  tempo: TempoEntry[];
  practiceCounts: Record<string, number>; // how many times an item was practised (for rotation)
  settings: {
    defaultMinutes: number;
    weeklyGoalMinutes: number;
    guitarTone: 'acoustic' | 'electric' | 'clean';
  };
  soloPlans: SoloPlan[];
}

const STORAGE_KEY = 'guitar-teacher-state-v1';

function defaultState(): AppState {
  return {
    version: 1,
    completedLessons: {},
    checklist: {},
    sessions: [],
    lickStatus: {},
    songStatus: {},
    customSongs: [],
    tempo: [],
    practiceCounts: {},
    settings: { defaultMinutes: 30, weeklyGoalMinutes: 150, guitarTone: 'acoustic' },
    soloPlans: [],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const d = defaultState();
    return { ...d, ...parsed, settings: { ...d.settings, ...(parsed.settings ?? {}) } };
  } catch {
    return defaultState();
  }
}

let state: AppState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable */
  }
}

export function getState(): AppState {
  return state;
}

export function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

// ---------- Actions ----------

export function toggleChecklist(lessonId: string, index: number, total: number) {
  setState((s) => {
    const arr = [...(s.checklist[lessonId] ?? Array(total).fill(false))];
    while (arr.length < total) arr.push(false);
    arr[index] = !arr[index];
    const completed = { ...s.completedLessons };
    if (arr.every(Boolean)) completed[lessonId] = completed[lessonId] ?? new Date().toISOString();
    else delete completed[lessonId];
    return { ...s, checklist: { ...s.checklist, [lessonId]: arr }, completedLessons: completed };
  });
}

export function setLessonComplete(lessonId: string, done: boolean, total: number) {
  setState((s) => {
    const completed = { ...s.completedLessons };
    if (done) completed[lessonId] = new Date().toISOString();
    else delete completed[lessonId];
    return { ...s, completedLessons: completed, checklist: { ...s.checklist, [lessonId]: Array(total).fill(done) } };
  });
}

export function setLickStatus(id: string, status: LickStatus) {
  setState((s) => ({ ...s, lickStatus: { ...s.lickStatus, [id]: status } }));
}

export function setSongStatus(id: string, status: SongStatus) {
  setState((s) => ({ ...s, songStatus: { ...s.songStatus, [id]: status } }));
}

export function logSession(log: Omit<SessionLog, 'id' | 'date'>) {
  setState((s) => ({
    ...s,
    sessions: [...s.sessions, { ...log, id: Math.random().toString(36).slice(2), date: new Date().toISOString() }],
  }));
}

export function deleteSession(id: string) {
  setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
}

export function logTempo(exercise: string, value: number) {
  setState((s) => ({ ...s, tempo: [...s.tempo, { date: new Date().toISOString(), exercise, value }] }));
}

export function bumpPractice(itemKey: string) {
  setState((s) => ({ ...s, practiceCounts: { ...s.practiceCounts, [itemKey]: (s.practiceCounts[itemKey] ?? 0) + 1 } }));
}

export function saveCustomSong(song: Song) {
  setState((s) => {
    const others = s.customSongs.filter((x) => x.id !== song.id);
    return { ...s, customSongs: [...others, { ...song, custom: true }] };
  });
}

export function deleteCustomSong(id: string) {
  setState((s) => ({ ...s, customSongs: s.customSongs.filter((x) => x.id !== id) }));
}

export function updateSettings(p: Partial<AppState['settings']>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...p } }));
}

export function saveSoloPlan(plan: AppState['soloPlans'][number]) {
  setState((s) => ({ ...s, soloPlans: [...s.soloPlans.filter((p) => p.id !== plan.id), plan] }));
}

export function deleteSoloPlan(id: string) {
  setState((s) => ({ ...s, soloPlans: s.soloPlans.filter((p) => p.id !== id) }));
}

export function exportState(): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || parsed.version !== 1) return false;
    setState(() => ({ ...defaultState(), ...parsed }));
    return true;
  } catch {
    return false;
  }
}

export function resetState() {
  setState(() => defaultState());
}

// ---------- Derived stats ----------

export function localDay(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function minutesByDay(s: AppState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const sess of s.sessions) {
    const k = localDay(sess.date);
    out[k] = (out[k] ?? 0) + sess.minutes;
  }
  return out;
}

export function currentStreak(s: AppState): number {
  const days = minutesByDay(s);
  let streak = 0;
  const d = new Date();
  // today counts if practised, otherwise start from yesterday
  if (!days[localDay(d)]) d.setDate(d.getDate() - 1);
  while (days[localDay(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function minutesThisWeek(s: AppState): number {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
  return s.sessions.filter((x) => new Date(x.date) >= start).reduce((a, x) => a + x.minutes, 0);
}

export function totalMinutes(s: AppState): number {
  return s.sessions.reduce((a, x) => a + x.minutes, 0);
}
