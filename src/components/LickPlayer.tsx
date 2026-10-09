import { useEffect, useMemo, useRef, useState } from 'react';
import { click, getContext, playPluck, unlockAudio } from '../audio/engine';
import { lickBeats, TECHNIQUE_LABEL, type Lick } from '../data/licks';
import { ALL_KEYS, STANDARD_TUNING, comfortableRootFret, keyShortName, mod12, parseKey, type Key } from '../music/theory';
import Fretboard from './Fretboard';

interface Props {
  lick: Lick;
  initialKey?: string;
  showFretboard?: boolean;
  targetBpm?: number; // start at this tempo (e.g. to match an external backing track)
}

export interface PlacedNote {
  s: number;
  fret: number;
  start: number; // beats
  d: number;
  t?: string;
  extra: Array<{ s: number; fret: number }>;
  rest?: boolean;
}

export function placeLick(lick: Lick, key: Key, octaveDown = false): { notes: PlacedNote[]; rootFret: number } {
  const minorRoot = lick.tonality === 'major' ? mod12(key.root - 3) : key.root;
  let r = comfortableRootFret(minorRoot);
  if (octaveDown && r - 12 >= 0) r -= 12;
  let t = 0;
  const notes = lick.notes.map((n) => {
    const p: PlacedNote = { s: n.s, fret: r + n.f, start: t, d: n.d, t: n.t, extra: (n.x ?? []).map(([s, f]) => ({ s, fret: r + f })), rest: n.rest };
    t += n.d;
    return p;
  });
  return { notes, rootFret: r };
}

export interface TabLabel {
  beat: number;
  text: string;
}

interface TabViewProps {
  notes: PlacedNote[];
  current: number; // index into notes, -1 for none
  beats: number;
  minBeats?: number; // draw at least this many beats (keeps rows equal width)
  labels?: TabLabel[]; // text above the staff (e.g. phrase names)
  firstBar?: number; // bar number of the first bar (shows bar numbers when set)
  fit?: boolean; // scale to the container width instead of a fixed zoom
}

export function TabView({ notes, current, beats, minBeats = 0, labels, firstBar, fit }: TabViewProps) {
  const pxBeat = 64;
  const left = 26;
  const gap = 18;
  const top = labels || firstBar !== undefined ? 50 : 26;
  const totalBeats = Math.max(Math.ceil(beats), minBeats);
  const width = left + totalBeats * pxBeat + 20;
  const height = top + gap * 5 + 20;
  const y = (s: number) => top + (5 - s) * gap;
  const sizeProps = fit ? { style: { width: '100%', maxWidth: width * 1.7, height: 'auto' } } : { width: width * 1.7, height: height * 1.7 };
  return (
    <div className="tab-wrap">
      <svg className="tab" viewBox={`0 0 ${width} ${height}`} {...sizeProps}>
        {['e', 'B', 'G', 'D', 'A', 'E'].map((n, i) => (
          <g key={n + i}>
            <text x={6} y={top + i * gap} dy="0.35em" className="tab-str">
              {n}
            </text>
            <line x1={left - 4} x2={width - 10} y1={top + i * gap} y2={top + i * gap} className="tab-line" />
          </g>
        ))}
        {Array.from({ length: totalBeats + 1 }, (_, b) => (
          <line
            key={b}
            x1={left + b * pxBeat}
            x2={left + b * pxBeat}
            y1={top}
            y2={top + gap * 5}
            className={b % 4 === 0 ? 'tab-bar' : 'tab-beat'}
          />
        ))}
        {firstBar !== undefined &&
          Array.from({ length: Math.ceil(totalBeats / 4) }, (_, b) => (
            <text key={`bn${b}`} x={left + b * 4 * pxBeat + 3} y={top - 26} className="tab-barnum">
              {firstBar + b}
            </text>
          ))}
        {labels?.map((l, i) => (
          <text key={`lb${i}`} x={left + l.beat * pxBeat + 16} y={top - 26} className="tab-phrase">
            {l.text}
          </text>
        ))}
        {notes.map((n, i) => {
          if (n.rest) return null;
          const x = left + n.start * pxBeat + 16;
          let label = String(n.fret);
          if (n.t === 'b') label = `${n.fret}b`;
          if (n.t === 'hb') label = `${n.fret}b`;
          if (n.t === 'r') label = `(${n.fret + 2})r${n.fret}`;
          if (n.t === 'h') label = `h${n.fret}`;
          if (n.t === 'p') label = `p${n.fret}`;
          if (n.t === 's') label = `/${n.fret}`;
          if (n.t === 'v') label = `${n.fret}~`;
          const on = i === current;
          return (
            <g key={i} className={on ? 'tab-note on' : 'tab-note'}>
              {[{ s: n.s, fret: n.fret, main: true }, ...n.extra.map((e) => ({ ...e, main: false }))].map((p, k) => {
                const text = p.main ? label : String(p.fret);
                const w = text.length * 8 + 6;
                return (
                  <g key={k}>
                    <rect x={x - w / 2} y={y(p.s) - 9} width={w} height={18} rx={4} className="tab-bg" />
                    <text x={x} y={y(p.s)} dy="0.35em" textAnchor="middle">
                      {text}
                    </text>
                  </g>
                );
              })}
              {(n.t === 'b' || n.t === 'hb') && (
                <text x={x + 10} y={y(n.s) - 12} className="tab-bendlabel">
                  {n.t === 'b' ? 'full' : '½'}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Schedule a list of placed notes on the audio clock. onNote(i) fires (via setTimeout)
 * as each note sounds; the returned timer ids let the caller cancel the highlights.
 */
export function scheduleNotes(notes: PlacedNote[], t0: number, spb: number, onNote: (i: number) => void): number[] {
  const ctx = getContext();
  const timers: number[] = [];
  let prevMidi: number | null = null;
  notes.forEach((n, i) => {
    const when = t0 + n.start * spb;
    const dur = n.d * spb;
    timers.push(window.setTimeout(() => onNote(i), Math.max(0, (when - ctx.currentTime) * 1000)));
    if (n.rest) return;
    const midi = STANDARD_TUNING[n.s] + n.fret;
    const legato = n.t === 'h' || n.t === 'p' || n.t === 's' || n.t === 'r';
    playPluck(midi, when, {
      tone: 'electric',
      gain: legato ? 0.28 : 0.38,
      duration: dur + 0.05,
      bendSemis: n.t === 'b' ? 2 : n.t === 'hb' ? 1 : undefined,
      bendFrom: n.t === 'r' ? 2 : undefined,
      bendTime: Math.min(0.22, dur * 0.5),
      // only slide from a note that's close by (not from the previous phrase)
      slideFrom: n.t === 's' && prevMidi !== null && Math.abs(prevMidi - midi) <= 5 ? prevMidi - midi : undefined,
      vibrato: n.t === 'v',
    });
    n.extra.forEach((e) => playPluck(STANDARD_TUNING[e.s] + e.fret, when, { tone: 'electric', gain: 0.3, duration: dur + 0.05 }));
    prevMidi = midi;
  });
  return timers;
}

export default function LickPlayer({ lick, initialKey = 'Am', showFretboard = true, targetBpm }: Props) {
  const defaultKey = lick.tonality === 'major' && /m$/.test(initialKey) ? 'G' : lick.tonality === 'minor' && !/m$/.test(initialKey) ? 'Am' : initialKey;
  const [keyStr, setKeyStr] = useState(() => {
    const k = parseKey(defaultKey);
    return k ? keyShortName(k) : defaultKey;
  });
  const [speed, setSpeed] = useState(() => (targetBpm ? Math.max(30, Math.min(130, Math.round((targetBpm / lick.bpm) * 100))) : 70));
  const [loop, setLoop] = useState(true);
  const [clickOn, setClickOn] = useState(true);
  const [octaveDown, setOctaveDown] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(-1);
  const timers = useRef<number[]>([]);
  const stopFlag = useRef(false);

  const key = parseKey(keyStr) ?? { root: 9, tonality: 'minor' as const };
  const { notes, rootFret } = useMemo(() => placeLick(lick, key, octaveDown), [lick, key.root, key.tonality, octaveDown]); // eslint-disable-line
  const beats = lickBeats(lick);
  const bpm = Math.round((lick.bpm * speed) / 100);

  useEffect(() => () => stop(), []); // eslint-disable-line
  useEffect(() => stop(), [lick.id]); // eslint-disable-line

  const stop = () => {
    stopFlag.current = true;
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    setPlaying(false);
    setCurrent(-1);
  };

  const scheduleOnce = (t0: number) => {
    const spb = 60 / bpm;
    const barBeats = Math.max(4, Math.ceil(beats / 4) * 4);
    if (clickOn) for (let b = 0; b < barBeats; b++) click(t0 + b * spb, b % 4 === 0, 0.4);
    timers.current.push(...scheduleNotes(notes, t0, spb, setCurrent));
    return barBeats * spb;
  };

  const play = async () => {
    stop();
    stopFlag.current = false;
    const ctx = await unlockAudio();
    setPlaying(true);
    const spb = 60 / bpm;
    // count-in
    let t = ctx.currentTime + 0.1;
    for (let b = 0; b < 4; b++) click(t + b * spb, b === 0, 0.7);
    t += 4 * spb;
    const runLoop = (start: number) => {
      if (stopFlag.current) return;
      const len = scheduleOnce(start);
      const next = start + len;
      const ms = (next - getContext().currentTime - 0.3) * 1000;
      timers.current.push(
        window.setTimeout(() => {
          if (!loop) {
            setPlaying(false);
            setCurrent(-1);
            return;
          }
          runLoop(next);
        }, Math.max(0, ms)),
      );
    };
    runLoop(t);
  };

  const cur = current >= 0 ? notes[current] : null;
  const techniques = [...new Set(lick.notes.map((n) => n.t).filter(Boolean))] as Array<keyof typeof TECHNIQUE_LABEL>;

  return (
    <div className="lick-player">
      <div className="row wrap gap">
        <label>
          Key{' '}
          <select value={keyStr} onChange={(e) => setKeyStr(e.target.value)}>
            {ALL_KEYS.filter((k) => k.tonality === lick.tonality).map((k) => (
              <option key={keyShortName(k)} value={keyShortName(k)}>
                {keyShortName(k)}
              </option>
            ))}
          </select>
        </label>
        <span className="pill">Root fret {lick.tonality === 'major' ? `(rel. minor box) ${rootFret}` : rootFret}</span>
        {comfortableRootFret(lick.tonality === 'major' ? mod12(key.root - 3) : key.root) >= 12 && (
          <button className={`chip ${octaveDown ? 'on' : ''}`} onClick={() => setOctaveDown(!octaveDown)}>
            Octave down
          </button>
        )}
      </div>
      <TabView notes={notes} current={current} beats={beats} />
      {techniques.length > 0 && (
        <p className="muted small">
          {techniques.map((t) => `${t === 'b' || t === 'hb' ? 'b' : t === 'r' ? 'r' : t === 's' ? '/' : t === 'v' ? '~' : t} = ${TECHNIQUE_LABEL[t]}`).join(' · ')}
        </p>
      )}
      <div className="row wrap gap">
        <button className={`btn big ${playing ? 'danger' : 'primary'}`} onClick={playing ? stop : play}>
          {playing ? '■ Stop' : '▶ Play lick'}
        </button>
        <label className="tempo">
          <span>
            Speed {speed}% · {bpm} BPM
          </span>
          <input type="range" min={30} max={130} step={5} value={speed} onChange={(e) => setSpeed(+e.target.value)} disabled={playing} />
        </label>
        <button className={`chip ${loop ? 'on' : ''}`} onClick={() => setLoop(!loop)} disabled={playing}>
          🔁 Loop
        </button>
        <button className={`chip ${clickOn ? 'on' : ''}`} onClick={() => setClickOn(!clickOn)} disabled={playing}>
          Click
        </button>
      </div>
      {showFretboard && (
        <Fretboard
          root={key.root}
          scale={lick.tonality === 'major' ? 'majorPent' : 'minorPent'}
          box={lick.box || undefined}
          highlight={cur && !cur.rest ? [{ string: cur.s, fret: cur.fret }, ...cur.extra.map((e) => ({ string: e.s, fret: e.fret }))] : []}
          compact
          preferHigh={rootFret >= 12}
          maxFret={rootFret >= 12 ? 20 : 17}
        />
      )}
    </div>
  );
}
