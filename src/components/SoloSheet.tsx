import { useEffect, useMemo, useRef, useState } from 'react';
import { click, unlockAudio } from '../audio/engine';
import { BackingPlayer, type ChartBar, type StyleId } from '../audio/player';
import { lickBeats, type Lick } from '../data/licks';
import { parseKey, type ScaleId } from '../music/theory';
import Fretboard from './Fretboard';
import { TabView, placeLick, scheduleNotes, type PlacedNote, type TabLabel } from './LickPlayer';

export interface SoloPhrase {
  lick: Lick;
  keyStr: string; // key the lick is played in, e.g. "Gm"
  label: string;
}

interface Props {
  phrases: SoloPhrase[];
  bpm: number;
  root: number;
  scale: ScaleId;
  backing?: { bars: ChartBar[]; style: StyleId } | null; // built-in track to play along, if any
}

const ROW_BEATS = 8; // two bars of 4/4 per line

export default function SoloSheet({ phrases, bpm, root, scale, backing }: Props) {
  const [barsPerPhrase, setBarsPerPhrase] = useState(2);
  const [speed, setSpeed] = useState(100);
  const [loop, setLoop] = useState(true);
  const [clickOn, setClickOn] = useState(true);
  const [withBacking, setWithBacking] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(-1);
  const timers = useRef<number[]>([]);
  const stopFlag = useRef(false);
  const backingPlayer = useRef<BackingPlayer | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Lay every phrase out on one timeline. Each phrase gets `barsPerPhrase` bars
  // (more if the lick is longer); the leftover beats are rests to breathe.
  const { notes, labels, totalBeats } = useMemo(() => {
    const notes: PlacedNote[] = [];
    const labels: TabLabel[] = [];
    let cursor = 0;
    for (const ph of phrases) {
      const key = parseKey(ph.keyStr) ?? { root: 9, tonality: 'minor' as const };
      const { notes: placed } = placeLick(ph.lick, key);
      labels.push({ beat: cursor, text: ph.label });
      for (const n of placed) if (!n.rest) notes.push({ ...n, start: n.start + cursor });
      cursor += Math.max(barsPerPhrase * 4, Math.ceil(lickBeats(ph.lick) / 4) * 4);
    }
    // with a backing track, round up to whole passes of its progression so the solo
    // always restarts at the top of the chord changes
    const unit = backing && withBacking ? backing.bars.length * 4 : 4;
    const totalBeats = Math.ceil(cursor / unit) * unit;
    return { notes, labels, totalBeats };
  }, [phrases, barsPerPhrase, backing, withBacking]);

  const rows = Math.ceil(totalBeats / ROW_BEATS);
  const effBpm = Math.round((bpm * speed) / 100);
  const currentRow = current >= 0 ? Math.floor(notes[current].start / ROW_BEATS) : -1;
  const cur = current >= 0 ? notes[current] : null;

  const stop = () => {
    stopFlag.current = true;
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    backingPlayer.current?.stop();
    backingPlayer.current = null;
    setPlaying(false);
    setCurrent(-1);
  };

  useEffect(() => () => stop(), []); // eslint-disable-line
  // anything about the solo changes -> stop playback
  useEffect(() => stop(), [notes, effBpm]); // eslint-disable-line

  // keep the line being played in view on the iPad
  useEffect(() => {
    if (currentRow >= 0) rowRefs.current[currentRow]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentRow]);

  const play = async () => {
    stop();
    stopFlag.current = false;
    const ctx = await unlockAudio();
    const spb = 60 / effBpm;
    const t0 = ctx.currentTime + 0.15;
    const useBacking = !!backing && withBacking;
    if (useBacking) {
      const bp = new BackingPlayer({
        bars: backing!.bars,
        bpm: effBpm,
        style: backing!.style,
        instruments: { drums: true, bass: true, guitar: true, click: clickOn },
        countIn: true,
        loop: true,
      });
      backingPlayer.current = bp;
      await bp.start(0, t0);
    } else {
      for (let b = 0; b < 4; b++) click(t0 + b * spb, b === 0, 0.7);
    }
    setPlaying(true);
    const pass = (start: number) => {
      if (stopFlag.current) return;
      if (!useBacking && clickOn) for (let b = 0; b < totalBeats; b++) click(start + b * spb, b % 4 === 0, 0.4);
      timers.current.push(...scheduleNotes(notes, start, spb, setCurrent));
      const next = start + totalBeats * spb;
      timers.current.push(
        window.setTimeout(() => {
          if (stopFlag.current) return;
          if (loop) pass(next);
          else
            timers.current.push(
              window.setTimeout(() => stop(), 600), // let the last note ring
            );
        }, Math.max(0, (next - ctx.currentTime - 0.3) * 1000)),
      );
    };
    pass(t0 + 4 * spb);
  };

  return (
    <div className="solo-sheet">
      <div className="row wrap gap">
        <button className={`btn big ${playing ? 'danger' : 'primary'}`} onClick={playing ? stop : play}>
          {playing ? '■ Stop' : '▶ Play full solo'}
        </button>
        <label className="tempo">
          <span>
            Speed {speed}% · {effBpm} BPM
          </span>
          <input type="range" min={40} max={120} step={5} value={speed} onChange={(e) => setSpeed(+e.target.value)} />
        </label>
      </div>
      <div className="row wrap gap toggles">
        <div className="seg">
          <button className={barsPerPhrase === 2 ? 'on' : ''} onClick={() => setBarsPerPhrase(2)}>
            2 bars per phrase
          </button>
          <button className={barsPerPhrase === 4 ? 'on' : ''} onClick={() => setBarsPerPhrase(4)}>
            4 bars (more space)
          </button>
        </div>
        <button className={`chip ${loop ? 'on' : ''}`} onClick={() => setLoop(!loop)} disabled={playing}>
          🔁 Loop
        </button>
        <button className={`chip ${clickOn ? 'on' : ''}`} onClick={() => setClickOn(!clickOn)} disabled={playing}>
          Click
        </button>
        {backing && (
          <button className={`chip ${withBacking ? 'on' : ''}`} onClick={() => setWithBacking(!withBacking)} disabled={playing}>
            🥁 With backing track
          </button>
        )}
      </div>
      <p className="muted small">
        {totalBeats / 4} bars in total. Each line is 2 bars; the gaps are rests — breathing room between phrases is what makes it sound like a solo instead of a list of licks.
      </p>

      <div className="solo-rows">
        {Array.from({ length: rows }, (_, r) => {
          const lo = r * ROW_BEATS;
          const hi = lo + ROW_BEATS;
          const idx: number[] = [];
          notes.forEach((n, i) => n.start >= lo && n.start < hi && idx.push(i));
          const rowLabels = labels.filter((l) => l.beat >= lo && l.beat < hi).map((l) => ({ ...l, beat: l.beat - lo }));
          const firstBar = r * 2 + 1;
          if (!idx.length && !rowLabels.length) {
            return (
              <div key={r} ref={(el) => void (rowRefs.current[r] = el)} className="solo-rest">
                Bars {firstBar}–{firstBar + 1}: rest — listen to the band, plan your next phrase
              </div>
            );
          }
          const rowNotes = idx.map((i) => ({ ...notes[i], start: notes[i].start - lo }));
          return (
            <div key={r} ref={(el) => void (rowRefs.current[r] = el)} className={`solo-row ${r === currentRow ? 'on' : ''}`}>
              <TabView notes={rowNotes} current={idx.indexOf(current)} beats={ROW_BEATS} minBeats={ROW_BEATS} labels={rowLabels} firstBar={firstBar} fit />
            </div>
          );
        })}
      </div>

      <Fretboard
        root={root}
        scale={scale}
        labels="intervals"
        compact
        maxFret={20}
        highlight={cur ? [{ string: cur.s, fret: cur.fret }, ...cur.extra.map((e) => ({ string: e.s, fret: e.fret }))] : []}
      />
      <p className="muted small">The green dot shows the note being played right now.</p>
    </div>
  );
}
