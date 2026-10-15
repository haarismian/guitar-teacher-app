import { describe, expect, it } from 'vitest';
import { parseChart } from '../audio/player';
import { chordMidiNotes, voicingFor } from '../music/chords';
import { detectKey, keyShortName, parseChord, pentatonicBox, transposeChordSymbol, STANDARD_TUNING, mod12 } from '../music/theory';
import { LICKS, VIBES, VIBE_IDS, surpriseSolo } from '../data/licks';
import { PROGRESSIONS } from '../data/progressions';
import { PRESET_SOLOS } from '../data/presetSolos';
import { SONGS } from '../data/songs';
import { ALL_LESSONS } from '../data/curriculum';
import { buildSession } from '../data/sessionPlanner';
import { placeLick } from '../components/LickPlayer';

describe('chords', () => {
  it('parses common symbols', () => {
    expect(parseChord('F#m7')?.quality).toBe('m7');
    expect(parseChord('D6/9')?.quality).toBe('69');
    expect(parseChord('D/F#')?.bass).toBe(6);
    expect(parseChord('Bbmaj7')?.root).toBe(10);
    expect(parseChord('H')).toBeNull();
  });
  it('finds voicings whose notes match the chord', () => {
    for (const sym of ['G', 'C', 'F#m', 'Bb', 'C#m7', 'Ebmaj7', 'A7sus4', 'Cadd9', 'Gm', 'F#7', 'B', 'Eb']) {
      const v = voicingFor(sym);
      expect(v, sym).not.toBeNull();
      const pcs = new Set(chordMidiNotes(sym).map(mod12));
      const c = parseChord(sym)!;
      expect(pcs.has(c.root), sym).toBe(true);
      for (const pc of pcs) expect(c.intervals.map((i) => mod12(c.root + i)), sym).toContain(pc);
    }
  });
  it('transposes', () => {
    expect(transposeChordSymbol('Am', 1)).toBe('A#m');
    expect(transposeChordSymbol('Em7', 2)).toBe('F#m7');
    expect(transposeChordSymbol('D/F#', 2)).toBe('E/G#');
  });
});

describe('key detection', () => {
  const k = (chords: string) => keyShortName(detectKey(chords.split(' '))[0].key);
  it('detects typical keys', () => {
    expect(k('G D Am C')).toBe('G');
    expect(k('Em C G D')).toBe('Em');
    expect(k('Am F C G')).toBe('Am');
    expect(k('C G Am F')).toBe('C');
    expect(k('A F#m D E')).toBe('A');
    expect(k('Bm F# A E G D Em F#')).toBe('Bm');
    expect(detectKey('A7 D7 A7 E7'.split(' '))[0].isBlues).toBe(true);
  });
});

describe('pentatonic boxes', () => {
  it('A minor box 1 is at fret 5-8', () => {
    const box = pentatonicBox(9, 0);
    expect(box.length).toBe(12);
    expect(Math.min(...box.map((p) => p.fret))).toBe(5);
    expect(Math.max(...box.map((p) => p.fret))).toBe(8);
  });
  it('every box contains only scale notes', () => {
    for (let b = 0; b < 5; b++) {
      for (const p of pentatonicBox(4, b)) expect([4, 7, 9, 11, 2]).toContain(mod12(STANDARD_TUNING[p.string] + p.fret));
    }
  });
});

describe('licks', () => {
  it('main notes stay in the pentatonic/blues scale (bend targets aside)', () => {
    for (const lick of LICKS) {
      const key = { root: 9, tonality: lick.tonality } as const;
      const { notes } = placeLick(lick, lick.tonality === 'major' ? { root: 0, tonality: 'major' } : key);
      const minorRoot = lick.tonality === 'major' ? 9 : 9;
      const allowed = [0, 3, 5, 6, 7, 10].map((i) => mod12(minorRoot + i));
      for (const n of notes) if (!n.rest) expect(allowed, `${lick.id}`).toContain(mod12(STANDARD_TUNING[n.s] + n.fret));
    }
  });
  it('bends land on musical targets', () => {
    for (const lick of LICKS) {
      const { notes } = placeLick(lick, lick.tonality === 'major' ? { root: 0, tonality: 'major' } : { root: 9, tonality: 'minor' });
      // minor: blues scale + the 9th and the sad b6; major (written in relative A minor): major pentatonic + its 4th
      const targets = (lick.tonality === 'major' ? [0, 3, 5, 7, 8, 10] : [0, 2, 3, 5, 6, 7, 8, 10]).map((i) => mod12(9 + i));
      for (const n of notes) {
        const semis = n.t === 'b' || n.t === 'bv' || n.t === 'pb' ? 2 : n.t === 'hb' ? 1 : 0;
        if (semis) expect(targets, `${lick.id} bend`).toContain(mod12(STANDARD_TUNING[n.s] + n.fret + semis));
      }
    }
  });
  it('every lick has a vibe, and every vibe has licks and real backing tracks', () => {
    for (const l of LICKS) expect(l.vibes.length, l.id).toBeGreaterThan(0);
    for (const v of VIBE_IDS) {
      expect(LICKS.filter((l) => l.vibes.includes(v)).length, v).toBeGreaterThanOrEqual(6);
      for (const id of Object.values(VIBES[v].backing)) expect(PROGRESSIONS.some((p) => p.id === id), id).toBe(true);
    }
  });
  it('surprise solos stick to the chosen vibe and resolve in major keys', () => {
    const minorPool = LICKS.filter((l) => l.tonality === 'minor');
    const majorPool = [...LICKS.filter((l) => l.tonality === 'major'), ...minorPool];
    for (let seed = 0; seed < 20; seed++) {
      let x = seed + 1;
      const random = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
      for (const v of VIBE_IDS) {
        const major = surpriseSolo(majorPool, 4, { vibe: v, majorEnding: true, random });
        expect(new Set(major).size).toBe(4);
        expect(LICKS.find((l) => l.id === major[3])!.tonality).toBe('major');
        for (const id of major) expect(LICKS.find((l) => l.id === id)!.vibes, `${v} ${id}`).toContain(v);
        if (v === 'sweet') continue; // sweet licks are all major
        const minor = surpriseSolo(minorPool, 3, { vibe: v, random });
        for (const id of minor) expect(LICKS.find((l) => l.id === id)!.vibes, `${v} ${id}`).toContain(v);
      }
    }
  });
  it('preset solos use real licks and backing tracks that fit their scale', () => {
    for (const p of PRESET_SOLOS) {
      const prog = PROGRESSIONS.find((x) => x.id === p.progression);
      expect(prog, p.id).toBeDefined();
      expect(prog!.tonality === 'blues' || prog!.tonality === (p.scale === 'majorPent' ? 'major' : 'minor'), p.id).toBe(true);
      for (const id of p.lickIds) {
        const lick = LICKS.find((l) => l.id === id);
        expect(lick, `${p.id} ${id}`).toBeDefined();
        if (p.scale !== 'majorPent') expect(lick!.tonality, `${p.id} ${id}`).toBe('minor');
      }
      if (p.scale === 'majorPent') expect(LICKS.find((l) => l.id === p.lickIds[p.lickIds.length - 1])!.tonality).toBe('major');
    }
  });
  it('have unique ids and stay on the neck', () => {
    expect(new Set(LICKS.map((l) => l.id)).size).toBe(LICKS.length);
    for (const lick of LICKS)
      for (let root = 0; root < 12; root++) {
        const { notes } = placeLick(lick, { root, tonality: lick.tonality });
        for (const n of notes) if (!n.rest) expect(n.fret, lick.id).toBeGreaterThanOrEqual(0);
        for (const n of notes) if (!n.rest) expect(n.fret, lick.id).toBeLessThanOrEqual(24);
      }
  });
});

describe('content', () => {
  it('all song charts parse to chords with voicings', () => {
    for (const s of SONGS) {
      const bars = parseChart(s.chart);
      expect(bars.length, s.id).toBeGreaterThan(0);
      for (const b of bars) for (const c of b.chords) expect(voicingFor(c), `${s.id} ${c}`).not.toBeNull();
    }
  });
  it('lesson activities reference real songs and licks', () => {
    for (const l of ALL_LESSONS)
      for (const a of l.activities) {
        if (a.type === 'song') expect(SONGS.some((s) => s.id === a.songId), a.songId).toBe(true);
        if (a.type === 'lick') expect(LICKS.some((x) => x.id === a.lickId), a.lickId).toBe(true);
      }
  });
  it('chart parser handles sections, repeats and split bars', () => {
    const bars = parseChart('Verse: | G | D.C | x2\nChorus: (Am F) %');
    expect(bars.map((b) => b.chords.join(' '))).toEqual(['G', 'D C', 'G', 'D C', 'Am F', 'Am F']);
    expect(bars[0].section).toBe('Verse');
    expect(bars[4].section).toBe('Chorus');
  });
});

describe('session planner', () => {
  const empty = {
    version: 1 as const, completedLessons: {}, checklist: {}, sessions: [], lickStatus: {}, songStatus: {}, customSongs: [], tempo: [], practiceCounts: {},
    settings: { defaultMinutes: 30, weeklyGoalMinutes: 150, guitarTone: 'acoustic' as const }, soloPlans: [],
  };
  it('fills the requested time exactly', () => {
    for (const m of [10, 15, 20, 30, 45, 60]) {
      for (const e of ['balanced', 'rhythm', 'lead'] as const) {
        const plan = buildSession(empty, m, e);
        expect(plan.segments.reduce((a, s) => a + s.minutes, 0), `${m} ${e}`).toBe(m);
        expect(plan.segments.every((s) => s.minutes > 0)).toBe(true);
      }
    }
  });
  it('includes lead work once level 3 is reached', () => {
    const done: Record<string, string> = {};
    ALL_LESSONS.slice(0, 13).forEach((l) => (done[l.id] = 'x'));
    const plan = buildSession({ ...empty, completedLessons: done }, 30, 'balanced');
    expect(plan.segments.some((s) => s.kind === 'improv' || s.kind === 'lick')).toBe(true);
  });
});
