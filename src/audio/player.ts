// Backing-track sequencer: turns a chord chart into drums + bass + strummed guitar.
import { chordBassNote, chordMidiNotes } from '../music/chords';
import { parseChord } from '../music/theory';
import {
  chuck,
  click,
  createChannel,
  getContext,
  hat,
  kick,
  playBass,
  playPluck,
  snare,
  strum,
  unlockAudio,
  warmUpPlucks,
  type Tone,
} from './engine';

export type StyleId = 'folk' | 'pop' | 'rock' | 'shuffle' | 'ballad' | 'slowblues' | 'funk';

interface DrumHit {
  k?: number[];
  s?: number[];
  h?: number[];
  o?: number[]; // open hat
}

export interface StyleDef {
  id: StyleId;
  name: string;
  stepsPerBeat: number;
  strum: string; // per 4/4 bar, one char per step: D U x -  (A = arpeggio pick)
  drums: DrumHit; // step indices within a 4/4 bar
  bass: Array<[number, number, number]>; // [step, interval semitones, length in steps]
  tone: Tone;
  description: string;
}

export const STYLES: Record<StyleId, StyleDef> = {
  folk: {
    id: 'folk',
    name: 'Acoustic strum',
    stepsPerBeat: 2,
    strum: 'D-DU-UDU',
    drums: { k: [0, 4], s: [2, 6], h: [0, 1, 2, 3, 4, 5, 6, 7] },
    bass: [
      [0, 0, 3],
      [4, 7, 3],
    ],
    tone: 'acoustic',
    description: 'The "old faithful" D-DU-UDU pattern. Works for most pop/folk songs.',
  },
  pop: {
    id: 'pop',
    name: 'Pop 16ths',
    stepsPerBeat: 4,
    strum: 'D-D-D-DUD-DUD-DU',
    drums: { k: [0, 6, 8], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
    bass: [
      [0, 0, 5],
      [6, 0, 2],
      [8, 0, 4],
      [12, 7, 4],
    ],
    tone: 'acoustic',
    description: 'Driving sixteenth-note pop feel.',
  },
  rock: {
    id: 'rock',
    name: 'Rock 8ths',
    stepsPerBeat: 2,
    strum: 'DDDDDDDD',
    drums: { k: [0, 3, 4], s: [2, 6], h: [0, 1, 2, 3, 4, 5, 6, 7] },
    bass: [
      [0, 0, 1],
      [1, 0, 1],
      [2, 0, 1],
      [3, 0, 1],
      [4, 0, 1],
      [5, 0, 1],
      [6, 0, 1],
      [7, 0, 1],
    ],
    tone: 'electric',
    description: 'Straight eighth-note downstrokes. Great for pentatonic rock solos.',
  },
  shuffle: {
    id: 'shuffle',
    name: 'Blues shuffle',
    stepsPerBeat: 3,
    strum: 'B-bB-bB-bB-b',
    drums: { k: [0, 6], s: [3, 9], h: [0, 2, 3, 5, 6, 8, 9, 11] },
    bass: [
      [0, 0, 2],
      [2, 4, 1],
      [3, 7, 2],
      [5, 9, 1],
      [6, 10, 2],
      [8, 9, 1],
      [9, 7, 2],
      [11, 4, 1],
    ],
    tone: 'electric',
    description: 'Swung triplet feel with a boogie riff. The classic 12-bar blues groove.',
  },
  slowblues: {
    id: 'slowblues',
    name: 'Slow blues (12/8)',
    stepsPerBeat: 3,
    strum: 'D-----D-----',
    drums: { k: [0, 5, 6], s: [3, 9], h: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    bass: [
      [0, 0, 3],
      [3, 7, 3],
      [6, 12, 3],
      [9, 7, 3],
    ],
    tone: 'clean',
    description: 'Slow 12/8 feel — lots of space for bends and vibrato.',
  },
  ballad: {
    id: 'ballad',
    name: 'Ballad arpeggio',
    stepsPerBeat: 2,
    strum: 'AAAAAAAA',
    drums: { k: [0], s: [4], h: [0, 2, 4, 6] },
    bass: [[0, 0, 8]],
    tone: 'clean',
    description: 'Fingerpicked arpeggios with a laid-back half-time beat.',
  },
  funk: {
    id: 'funk',
    name: 'Funk / Latin',
    stepsPerBeat: 4,
    strum: 'D-xUD-xU-UxUD-xU',
    drums: { k: [0, 3, 8, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14], o: [14] },
    bass: [
      [0, 0, 2],
      [3, 0, 1],
      [6, 12, 1],
      [8, 7, 2],
      [11, 10, 1],
      [14, 12, 2],
    ],
    tone: 'clean',
    description: 'Syncopated 16th-note groove (think Santana "Evil Ways").',
  },
};

export interface ChartBar {
  chords: string[]; // evenly split across the bar
  section?: string;
}

export interface Instruments {
  drums: boolean;
  bass: boolean;
  guitar: boolean;
  click: boolean;
}

export interface PlayerOptions {
  bars: ChartBar[];
  bpm: number;
  style: StyleId;
  beatsPerBar?: number;
  instruments: Instruments;
  countIn?: boolean;
  loop?: boolean;
  loopRange?: [number, number] | null; // inclusive bar indices
  strumOverride?: string | null;
  onPosition?: (pos: Position) => void;
  onEnd?: () => void;
}

export interface Position {
  bar: number; // -1 during count-in
  beat: number; // 0-based
  chordIndex: number; // index into bar.chords
}

export class BackingPlayer {
  private opts: PlayerOptions;
  private timer: number | null = null;
  private raf: number | null = null;
  private nextTime = 0;
  private bar = 0;
  private step = 0;
  private countingIn = false;
  private queue: Array<{ time: number; pos: Position }> = [];
  private channels: Record<keyof Instruments, GainNode> | null = null;
  playing = false;

  constructor(opts: PlayerOptions) {
    this.opts = { beatsPerBar: 4, countIn: true, loop: true, ...opts };
  }

  update(partial: Partial<PlayerOptions>) {
    this.opts = { ...this.opts, ...partial };
    if (partial.instruments && this.channels) this.applyMutes();
    if (partial.bars && this.bar >= this.opts.bars.length) this.bar = 0;
  }

  private applyMutes() {
    if (!this.channels) return;
    const c = getContext();
    (Object.keys(this.channels) as Array<keyof Instruments>).forEach((k) => {
      this.channels![k].gain.setTargetAtTime(this.opts.instruments[k] ? 1 : 0, c.currentTime, 0.02);
    });
  }

  private get style(): StyleDef {
    return STYLES[this.opts.style];
  }

  private get stepsPerBar(): number {
    return this.style.stepsPerBeat * (this.opts.beatsPerBar ?? 4);
  }

  private get stepDur(): number {
    return 60 / this.opts.bpm / this.style.stepsPerBeat;
  }

  async start(fromBar = 0) {
    const ctx = await unlockAudio();
    if (!this.channels) {
      this.channels = {
        drums: createChannel(0.8),
        bass: createChannel(0.9),
        guitar: createChannel(1),
        click: createChannel(1),
      };
    }
    this.applyMutes();
    // pre-render the strings we will need
    const allNotes = new Set<number>();
    this.opts.bars.forEach((b) => b.chords.forEach((ch) => chordMidiNotes(ch).forEach((n) => allNotes.add(n))));
    warmUpPlucks([...allNotes], this.style.tone);

    this.bar = this.opts.loopRange ? this.opts.loopRange[0] : fromBar;
    this.step = 0;
    this.countingIn = !!this.opts.countIn;
    this.nextTime = ctx.currentTime + 0.12;
    this.playing = true;
    this.timer = window.setInterval(() => this.schedule(), 25);
    this.schedule();
    const tick = () => {
      const now = getContext().currentTime;
      let latest: Position | null = null;
      while (this.queue.length && this.queue[0].time <= now) latest = this.queue.shift()!.pos;
      if (latest && this.opts.onPosition) this.opts.onPosition(latest);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.playing = false;
    if (this.timer !== null) clearInterval(this.timer);
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.timer = null;
    this.raf = null;
    this.queue = [];
    // quickly fade the channels to cut ringing notes, then restore
    if (this.channels) {
      const c = getContext();
      Object.values(this.channels).forEach((g) => {
        g.gain.cancelScheduledValues(c.currentTime);
        g.gain.setTargetAtTime(0, c.currentTime, 0.03);
      });
      const chans = this.channels;
      this.channels = null;
      setTimeout(() => Object.values(chans).forEach((g) => g.disconnect()), 400);
    }
  }

  private schedule() {
    const ctx = getContext();
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.scheduleStep(this.nextTime);
      this.advance();
      if (!this.playing) return;
      this.nextTime += this.stepDur;
    }
  }

  private advance() {
    this.step++;
    if (this.step >= this.stepsPerBar) {
      this.step = 0;
      if (this.countingIn) {
        this.countingIn = false;
        return;
      }
      this.bar++;
      const range = this.opts.loopRange;
      if (range && this.bar > range[1]) this.bar = range[0];
      if (this.bar >= this.opts.bars.length) {
        if (this.opts.loop) this.bar = range ? range[0] : 0;
        else {
          const endAt = this.nextTime + this.stepDur;
          const delay = Math.max(0, (endAt - getContext().currentTime) * 1000);
          this.playing = false;
          if (this.timer !== null) clearInterval(this.timer);
          this.timer = null;
          setTimeout(() => {
            this.stop();
            this.opts.onEnd?.();
          }, delay + 800);
        }
      }
    }
  }

  private scheduleStep(t: number) {
    const st = this.style;
    const spb = st.stepsPerBeat;
    const beatsPerBar = this.opts.beatsPerBar ?? 4;
    const ch = this.channels!;
    const beat = Math.floor(this.step / spb);
    const onBeat = this.step % spb === 0;

    if (this.countingIn) {
      if (onBeat) {
        click(t, beat === 0, 0.8, ch.click);
        hat(t, 0.25, false, ch.drums);
        this.queue.push({ time: t, pos: { bar: -1, beat, chordIndex: 0 } });
      }
      return;
    }

    const barData = this.opts.bars[this.bar];
    if (!barData) return;
    const nCh = Math.max(1, barData.chords.length);
    const chordIndex = Math.min(nCh - 1, Math.floor((this.step / this.stepsPerBar) * nCh));
    const chord = barData.chords[chordIndex] ?? barData.chords[0];
    if (onBeat) this.queue.push({ time: t, pos: { bar: this.bar, beat, chordIndex } });

    // Map step to position in a 4/4 pattern (3/4 bars just use the first 3 beats)
    const p = this.step;

    // Click
    if (onBeat) click(t, beat === 0, 0.6, ch.click);

    // Drums
    const d = st.drums;
    const isNC = !chord || chord === 'N.C.' || chord === '%';
    if (d.k?.includes(p)) kick(t, 0.9, ch.drums);
    if (d.s?.includes(p)) snare(t, st.id === 'ballad' ? 0.25 : 0.45, ch.drums);
    if (d.h?.includes(p)) hat(t, p % spb === 0 ? 0.14 : 0.08, false, ch.drums);
    if (d.o?.includes(p)) hat(t, 0.1, true, ch.drums);
    // make 3/4 feel natural: kick on 1, snares on 2 & 3
    if (beatsPerBar === 3 && onBeat && beat > 0 && !d.s?.includes(p)) snare(t, 0.2, ch.drums);

    if (isNC || !parseChord(chord)) return;

    // Bass
    const bassRoot = chordBassNote(chord);
    const parsed = parseChord(chord)!;
    if (bassRoot !== null) {
      for (const [bs, interval, len] of st.bass) {
        if (bs !== p) continue;
        let iv = interval;
        // adapt the walking line for minor chords
        if (parsed.quality.startsWith('m') && !parsed.quality.startsWith('maj') && iv === 4) iv = 3;
        playBass(bassRoot + iv, t, len * this.stepDur * 0.95, 0.45, ch.bass);
      }
    }

    // Guitar
    const ov = this.opts.strumOverride;
    const pattern = ov && (ov.length === this.stepsPerBarFor4() || ov.length === this.stepsPerBar) ? ov : st.strum;
    const sym = pattern[p];
    if (!sym || sym === '-') return;
    const notes = chordMidiNotes(chord);
    if (!notes.length) return;
    const nextStrum = this.stepsUntilNextStrum(pattern, p);
    const ring = nextStrum * this.stepDur + 0.03;
    if (sym === 'D' || sym === 'U') {
      strum(notes, t, { direction: sym === 'D' ? 'down' : 'up', tone: st.tone, duration: ring, gain: st.tone === 'electric' ? 0.2 : 0.22, destination: ch.guitar });
    } else if (sym === 'x') {
      chuck(t, 0.18, ch.guitar);
    } else if (sym === 'A') {
      // arpeggio: bass, then cycle upper strings
      const order = [0, 2, 3, 4, 5, 4, 3, 2];
      const i = order[p % order.length];
      const note = i === 0 ? notes[0] : notes[Math.min(notes.length - 1, Math.max(1, i - (6 - notes.length)))];
      playPluck(note, t, { tone: st.tone, gain: i === 0 ? 0.3 : 0.22, duration: this.stepDur * 4, destination: ch.guitar });
    } else if (sym === 'B' || sym === 'b') {
      // boogie shuffle riff on the two lowest strings of the chord's root
      const root = (bassRoot ?? 40) + 12;
      const lowRoot = root < 40 ? root + 12 : root;
      const sixth = beat % 2 === 0 ? 7 : 9;
      playPluck(lowRoot, t, { tone: st.tone, gain: 0.28, duration: this.stepDur * (sym === 'B' ? 2 : 1) * 0.9, destination: ch.guitar });
      playPluck(lowRoot + sixth, t, { tone: st.tone, gain: 0.22, duration: this.stepDur * (sym === 'B' ? 2 : 1) * 0.9, destination: ch.guitar });
    }
  }

  private stepsPerBarFor4() {
    return this.style.stepsPerBeat * 4;
  }

  private stepsUntilNextStrum(pattern: string, p: number) {
    const len = Math.min(pattern.length, this.stepsPerBar);
    for (let i = 1; i <= len; i++) {
      const c = pattern[(p + i) % len];
      if (c !== '-') return i;
    }
    return len;
  }
}

/**
 * Parse a text chord chart. Syntax:
 *   Verse: | G | D | Am | Am |
 *   Chorus: G D C C x2
 * Bars are separated by "|" or whitespace. Multiple chords in a bar: "G.C" or "(G C)".
 * "%" repeats the previous bar. "xN" at end of line repeats the line.
 */
export function parseChart(text: string): ChartBar[] {
  const bars: ChartBar[] = [];
  for (const rawLine of text.split(/\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    let section: string | undefined;
    const lab = /^([A-Za-z][A-Za-z0-9 \-]*?)\s*:\s*(.*)$/.exec(line);
    if (lab && !/^[A-G][#b]?$/.test(lab[1])) {
      section = lab[1];
      line = lab[2];
    }
    let repeat = 1;
    const rep = /\s[x×]\s?(\d+)\s*$/.exec(' ' + line);
    if (rep) {
      repeat = parseInt(rep[1], 10);
      line = line.slice(0, line.length - rep[0].length + 1).trim();
    }
    const lineBars: ChartBar[] = [];
    // group parentheses as single bars
    const tokens: string[] = [];
    const re = /\(([^)]*)\)|([^\s|]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      if (m[1] !== undefined) tokens.push(m[1].trim().split(/\s+/).join('.'));
      else tokens.push(m[2]);
    }
    for (const tok of tokens) {
      if (tok === '%' && (lineBars.length || bars.length)) {
        const prev = lineBars[lineBars.length - 1] ?? bars[bars.length - 1];
        lineBars.push({ chords: [...prev.chords] });
        continue;
      }
      const chords = tok.split('.').filter(Boolean);
      if (!chords.length) continue;
      lineBars.push({ chords });
    }
    for (let r = 0; r < repeat; r++) {
      lineBars.forEach((b, i) => bars.push({ ...b, section: r === 0 && i === 0 ? section : undefined }));
    }
  }
  return bars;
}

export function chartChords(bars: ChartBar[]): string[] {
  return bars.flatMap((b) => b.chords).filter((c) => c !== 'N.C.' && c !== '%');
}

export function uniqueChords(bars: ChartBar[]): string[] {
  return [...new Set(chartChords(bars))];
}
