// Builds a structured practice session for a chosen amount of time,
// based on where the player is in the curriculum.
import { ALL_LESSONS, CURRICULUM, type Activity, type Lesson } from './curriculum';
import { LICKS, type Lick } from './licks';
import { SONGS, type Song } from './songs';
import type { AppState } from '../store/store';

export type SegmentKind = 'warmup' | 'lesson' | 'rhythm' | 'lick' | 'improv' | 'review';

export interface Segment {
  kind: SegmentKind;
  title: string;
  minutes: number;
  instructions: string[];
  activity?: Activity;
  lessonId?: string;
  lickId?: string;
  songId?: string;
}

export interface SessionPlan {
  minutes: number;
  focus: string;
  segments: Segment[];
  lessonId?: string;
}

export type Emphasis = 'balanced' | 'rhythm' | 'lead';

export function nextLesson(s: AppState): Lesson {
  return ALL_LESSONS.find((l) => !s.completedLessons[l.id]) ?? ALL_LESSONS[ALL_LESSONS.length - 1];
}

export function currentLevel(s: AppState) {
  const l = nextLesson(s);
  return CURRICULUM.find((lv) => lv.lessons.includes(l))!;
}

/** Licks unlocked by lessons already reached */
function unlockedLicks(s: AppState): Lick[] {
  const idx = ALL_LESSONS.indexOf(nextLesson(s));
  const reached = ALL_LESSONS.slice(0, idx + 1);
  const ids = new Set<string>();
  for (const l of reached) for (const a of l.activities) if (a.type === 'lick') ids.add(a.lickId);
  for (const [id, st] of Object.entries(s.lickStatus)) if (st !== 'new') ids.add(id);
  return LICKS.filter((l) => ids.has(l.id));
}

function unlockedSongs(s: AppState): Song[] {
  const idx = ALL_LESSONS.indexOf(nextLesson(s));
  const reached = ALL_LESSONS.slice(0, idx + 1);
  const ids = new Set<string>();
  for (const l of reached) for (const a of l.activities) if (a.type === 'song') ids.add(a.songId);
  for (const [id, st] of Object.entries(s.songStatus)) if (st !== 'none') ids.add(id);
  const lvl = currentLevel(s).id;
  return [...SONGS.filter((x) => ids.has(x.id) || x.level <= Math.min(2, lvl)), ...s.customSongs];
}

function leastPracticed<T>(items: T[], key: (t: T) => string, s: AppState, exclude: string[] = []): T | undefined {
  const pool = items.filter((i) => !exclude.includes(key(i)));
  if (!pool.length) return items[0];
  return [...pool].sort((a, b) => (s.practiceCounts[key(a)] ?? 0) - (s.practiceCounts[key(b)] ?? 0))[0];
}

function lickPriority(s: AppState, lick: Lick) {
  const st = s.lickStatus[lick.id] ?? 'new';
  return { new: 1, learning: 0, comfortable: 2, mastered: 3 }[st];
}

const MINOR_KEYS = ['Am', 'Em', 'Gm', 'Dm', 'Bm', 'Cm'];
const MAJOR_KEYS = ['G', 'D', 'C', 'A', 'E'];

export function buildSession(s: AppState, minutes: number, emphasis: Emphasis = 'balanced'): SessionPlan {
  const lesson = nextLesson(s);
  const level = currentLevel(s);
  const leadUnlocked = level.id >= 3;
  const segments: Segment[] = [];
  const day = new Date().getDate();

  // --- Time budget ---
  const warm = minutes <= 10 ? 2 : minutes <= 20 ? 3 : 5;
  let remaining = minutes - warm;
  const lessonMin = Math.min(lesson.minutes, Math.max(4, Math.round(remaining * (minutes <= 15 ? 0.6 : 0.4))));
  remaining -= lessonMin;

  // Warm-up
  segments.push(
    leadUnlocked && day % 2 === 0
      ? {
          kind: 'warmup',
          title: 'Warm-up: pentatonic box run',
          minutes: warm,
          instructions: [
            'Tune up first.',
            'Play box 1 of A minor pentatonic up and down with the metronome.',
            'Start at 60 BPM, eighth notes. If it\'s clean twice in a row, go up 5 BPM.',
            'Log your best clean tempo at the end.',
          ],
          activity: { type: 'metronome', bpm: 60 },
        }
      : {
          kind: 'warmup',
          title: 'Warm-up: tune & finger exercise',
          minutes: warm,
          instructions: [
            'Tune up.',
            '1-2-3-4 chromatic exercise: one finger per fret on each string, up and back.',
            'Keep fingers close to the fretboard. Use alternate picking.',
          ],
          activity: { type: 'metronome', bpm: 60 },
        },
  );

  // Main lesson
  segments.push({
    kind: 'lesson',
    title: `Lesson: ${lesson.title}`,
    minutes: lessonMin,
    instructions: [lesson.summary, ...lesson.steps],
    lessonId: lesson.id,
    activity: lesson.activities[0],
  });

  // Distribute the rest
  if (remaining > 0) {
    const wantRhythm = emphasis !== 'lead';
    const wantLead = leadUnlocked && emphasis !== 'rhythm';
    let rhythmMin = 0;
    let lickMin = 0;
    let improvMin = 0;
    if (wantRhythm && wantLead) {
      rhythmMin = Math.round(remaining * 0.4);
      lickMin = Math.round(remaining * 0.3);
      improvMin = remaining - rhythmMin - lickMin;
    } else if (wantLead) {
      lickMin = Math.round(remaining * 0.5);
      improvMin = remaining - lickMin;
    } else {
      rhythmMin = remaining;
    }
    if (minutes <= 15 && wantRhythm && wantLead) {
      // too short for three extra blocks: pick one
      if (day % 2 === 0) {
        improvMin += rhythmMin;
        rhythmMin = 0;
      } else {
        rhythmMin += lickMin + improvMin;
        lickMin = improvMin = 0;
      }
    }

    if (rhythmMin > 0) {
      const lessonSongs = lesson.activities.filter((a) => a.type === 'song').map((a) => (a as { songId: string }).songId);
      const pool = unlockedSongs(s).filter((x) => x.goal !== 'solo');
      const learning = pool.filter((x) => s.songStatus[x.id] === 'learning' && !lessonSongs.includes(x.id));
      const song = learning[0] ?? leastPracticed(pool, (x) => `song:${x.id}`, s, lessonSongs);
      if (song) {
        segments.push({
          kind: 'rhythm',
          title: `Strum-along: ${song.title}`,
          minutes: rhythmMin,
          songId: song.id,
          activity: { type: 'song', songId: song.id },
          instructions: [
            'Mute the guitar in the backing track — you\'re the rhythm player.',
            'Start at a comfortable speed (70–80%). Get through once without stopping, then speed up.',
            song.notes ?? 'Focus on changing chords on time, even if the strum is simple.',
          ],
        });
      }
    }

    if (lickMin > 0) {
      const lessonLicks = lesson.activities.filter((a) => a.type === 'lick').map((a) => (a as { lickId: string }).lickId);
      const pool = unlockedLicks(s).filter((l) => !lessonLicks.includes(l.id) && (s.lickStatus[l.id] ?? 'new') !== 'mastered');
      const sorted = [...pool].sort((a, b) => lickPriority(s, a) - lickPriority(s, b) || (s.practiceCounts[`lick:${a.id}`] ?? 0) - (s.practiceCounts[`lick:${b.id}`] ?? 0));
      const lick = sorted[0] ?? LICKS[0];
      segments.push({
        kind: 'lick',
        title: `Lick of the day: ${lick.name}`,
        minutes: lickMin,
        lickId: lick.id,
        activity: { type: 'lick', lickId: lick.id },
        instructions: [
          lick.description,
          'Listen first, then loop it at 60% speed. Raise the speed when you get 3 clean repeats.',
          'Try it in two different keys.',
          'Update its status (learning → comfortable → mastered) when done.',
        ],
      });
    }

    if (improvMin > 0) {
      const minor = day % 3 !== 0 || level.id < 5;
      const keyPool = minor ? MINOR_KEYS : MAJOR_KEYS;
      const key = keyPool[day % keyPool.length];
      const progs = minor ? ['aeolian-rock', 'minor-blues', 'minor-vamp', 'minor-pop', 'dorian'] : ['pop-axis', 'mixolydian', 'i-iv-v'];
      const prog = level.id >= 3 && day % 4 === 1 ? 'blues12' : progs[day % progs.length];
      const keyForProg = prog === 'blues12' ? key.replace('m', '') : key;
      segments.push({
        kind: 'improv',
        title: `Improvise in ${keyForProg}${prog === 'blues12' ? ' blues' : ''}`,
        minutes: improvMin,
        activity: {
          type: 'jam',
          key: keyForProg,
          progression: prog,
          box: level.id >= 5 && day % 2 === 0 ? 2 : 1,
          scale: minor || prog === 'blues12' ? 'minorPent' : 'majorPent',
        },
        instructions: [
          'Find box 1: the root is on the low E string.',
          'Use your licks — start phrases with one and make up the rest.',
          'Leave space. Play short phrases, rest, respond.',
          level.id >= 5 ? 'Turn on "chord tones" and aim to end phrases on a highlighted note.' : 'End each phrase on the root.',
        ],
      });
    }
  }

  // Short review at the end if there's time
  if (minutes >= 45) {
    const last = segments[segments.length - 1];
    if (last.minutes > 4) {
      last.minutes -= 3;
      segments.push({
        kind: 'review',
        title: 'Cool-down: play for fun',
        minutes: 3,
        instructions: ['Play anything you enjoy — a favourite song, a riff, noodling. Finish on a high!'],
      });
    }
  }

  const focus = lesson.focus === 'lead' ? 'Lead guitar' : lesson.focus === 'rhythm' ? 'Rhythm & songs' : 'Musicianship';
  return { minutes, focus, segments, lessonId: lesson.id };
}

export function itemKeyForSegment(seg: Segment): string | null {
  if (seg.lickId) return `lick:${seg.lickId}`;
  if (seg.songId) return `song:${seg.songId}`;
  if (seg.lessonId) return `lesson:${seg.lessonId}`;
  return null;
}
