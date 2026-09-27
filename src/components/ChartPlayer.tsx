import { useEffect, useMemo, useRef, useState } from 'react';
import { BackingPlayer, STYLES, type ChartBar, type Instruments, type Position, type StyleId } from '../audio/player';
import { transposeChordSymbol } from '../music/theory';
import ChordDiagram from './ChordDiagram';

interface Props {
  bars: ChartBar[];
  bpm: number;
  style: StyleId;
  beatsPerBar?: number;
  strum?: string | null;
  transpose?: number; // semitones to shift the audio (capo)
  instruments?: Partial<Instruments>;
  showDiagrams?: boolean;
  onChord?: (chord: string | null) => void; // concert-pitch chord currently playing
  allowStyleChange?: boolean;
}

const DEFAULT_INST: Instruments = { drums: true, bass: true, guitar: true, click: false };

export default function ChartPlayer({
  bars,
  bpm,
  style: initialStyle,
  beatsPerBar = 4,
  strum,
  transpose = 0,
  instruments,
  showDiagrams = true,
  onChord,
  allowStyleChange = true,
}: Props) {
  const player = useRef<BackingPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const [tempoPct, setTempoPct] = useState(100);
  const [style, setStyle] = useState<StyleId>(initialStyle);
  const [inst, setInst] = useState<Instruments>({ ...DEFAULT_INST, ...instruments });
  const [loopMode, setLoopMode] = useState(false);
  const [loopRange, setLoopRange] = useState<[number, number] | null>(null);
  const [pendingLoopStart, setPendingLoopStart] = useState<number | null>(null);
  const onChordRef = useRef(onChord);
  onChordRef.current = onChord;

  useEffect(() => setStyle(initialStyle), [initialStyle]);

  const audioBars = useMemo(
    () => (transpose ? bars.map((b) => ({ ...b, chords: b.chords.map((c) => transposeChordSymbol(c, transpose)) })) : bars),
    [bars, transpose],
  );
  const effectiveBpm = Math.round((bpm * tempoPct) / 100);

  useEffect(() => () => player.current?.stop(), []);

  // stop if the chart itself changes
  useEffect(() => {
    player.current?.stop();
    player.current = null;
    setPlaying(false);
    setPos(null);
    setLoopRange(null);
    onChordRef.current?.(null);
  }, [audioBars, beatsPerBar]);

  useEffect(() => {
    player.current?.update({ bpm: effectiveBpm, instruments: inst, loopRange, strumOverride: style === initialStyle ? strum : null });
  }, [effectiveBpm, inst, loopRange, strum, style, initialStyle]);

  const start = async (fromBar = 0) => {
    player.current?.stop();
    const p = new BackingPlayer({
      bars: audioBars,
      bpm: effectiveBpm,
      style,
      beatsPerBar,
      instruments: inst,
      countIn: true,
      loop: true,
      loopRange,
      strumOverride: style === initialStyle ? strum : null,
      onPosition: (ps) => {
        setPos(ps);
        if (ps.bar >= 0) onChordRef.current?.(audioBars[ps.bar]?.chords[ps.chordIndex] ?? null);
      },
    });
    player.current = p;
    await p.start(fromBar);
    setPlaying(true);
  };

  const stop = () => {
    player.current?.stop();
    player.current = null;
    setPlaying(false);
    setPos(null);
    onChordRef.current?.(null);
  };

  const changeStyle = (s: StyleId) => {
    setStyle(s);
    if (playing) {
      stop();
      setTimeout(() => startWithStyle(s), 50);
    }
  };
  const startWithStyle = async (s: StyleId) => {
    const p = new BackingPlayer({
      bars: audioBars,
      bpm: effectiveBpm,
      style: s,
      beatsPerBar,
      instruments: inst,
      countIn: true,
      loopRange,
      strumOverride: s === initialStyle ? strum : null,
      onPosition: (ps) => {
        setPos(ps);
        if (ps.bar >= 0) onChordRef.current?.(audioBars[ps.bar]?.chords[ps.chordIndex] ?? null);
      },
    });
    player.current = p;
    await p.start(0);
    setPlaying(true);
  };

  const tapBar = (i: number) => {
    if (loopMode) {
      if (pendingLoopStart === null) {
        setPendingLoopStart(i);
        setLoopRange([i, i]);
      } else {
        const r: [number, number] = [Math.min(pendingLoopStart, i), Math.max(pendingLoopStart, i)];
        setLoopRange(r);
        setPendingLoopStart(null);
        setLoopMode(false);
      }
      return;
    }
    if (playing) start(i);
  };

  const current = pos && pos.bar >= 0 ? bars[pos.bar]?.chords[pos.chordIndex] : null;
  const next = useMemo(() => {
    if (!pos) return bars[0]?.chords[0] ?? null;
    if (pos.bar < 0) return bars[loopRange ? loopRange[0] : 0]?.chords[0] ?? null;
    const b = bars[pos.bar];
    if (!b) return null;
    if (pos.chordIndex < b.chords.length - 1) return b.chords[pos.chordIndex + 1];
    let nb = pos.bar + 1;
    if (loopRange && nb > loopRange[1]) nb = loopRange[0];
    if (nb >= bars.length) nb = 0;
    return bars[nb]?.chords[0] ?? null;
  }, [pos, bars, loopRange]);

  const unique = useMemo(() => [...new Set(bars.flatMap((b) => b.chords))].filter((c) => c !== 'N.C.'), [bars]);

  return (
    <div className="chart-player">
      <div className="now-next">
        <div className="now">
          <span className="label">{pos?.bar === -1 ? 'Count-in' : 'Now'}</span>
          <span className="chord">{pos?.bar === -1 ? 4 - pos.beat : current ?? '–'}</span>
        </div>
        <div className="next">
          <span className="label">Next</span>
          <span className="chord">{next ?? '–'}</span>
        </div>
        <div className="beats">
          {Array.from({ length: beatsPerBar }, (_, i) => (
            <span key={i} className={`beat-dot ${pos && pos.beat === i ? 'on' : ''} ${i === 0 ? 'first' : ''}`} />
          ))}
        </div>
      </div>

      <div className="controls row wrap gap">
        <button className={`btn big ${playing ? 'danger' : 'primary'}`} onClick={() => (playing ? stop() : start(0))}>
          {playing ? '■ Stop' : '▶ Play'}
        </button>
        <label className="tempo">
          <span>
            Speed {tempoPct}% · {effectiveBpm} BPM
          </span>
          <input type="range" min={40} max={130} step={5} value={tempoPct} onChange={(e) => setTempoPct(+e.target.value)} />
        </label>
        {allowStyleChange && (
          <select value={style} onChange={(e) => changeStyle(e.target.value as StyleId)}>
            {Object.values(STYLES).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="row wrap gap toggles">
        {(Object.keys(inst) as Array<keyof Instruments>).map((k) => (
          <button key={k} className={`chip ${inst[k] ? 'on' : ''}`} onClick={() => setInst({ ...inst, [k]: !inst[k] })}>
            {inst[k] ? '🔊' : '🔇'} {k === 'guitar' ? 'Guitar (chords)' : k[0].toUpperCase() + k.slice(1)}
          </button>
        ))}
        <button
          className={`chip ${loopMode || loopRange ? 'on' : ''}`}
          onClick={() => {
            if (loopRange && !loopMode) {
              setLoopRange(null);
              return;
            }
            setLoopMode(!loopMode);
            setPendingLoopStart(null);
          }}
        >
          🔁 {loopMode ? (pendingLoopStart === null ? 'Tap first bar…' : 'Tap last bar…') : loopRange ? `Looping bars ${loopRange[0] + 1}–${loopRange[1] + 1} (clear)` : 'Loop a section'}
        </button>
      </div>

      <div className="chart-grid" style={{ ['--cols' as string]: beatsPerBar === 3 ? 4 : 4 }}>
        {bars.map((b, i) => {
          const active = pos?.bar === i;
          const inLoop = loopRange && i >= loopRange[0] && i <= loopRange[1];
          return (
            <div key={i} className="bar-wrap">
              {b.section && <div className="section-label">{b.section}</div>}
              <button className={`bar ${active ? 'active' : ''} ${inLoop ? 'looped' : ''}`} onClick={() => tapBar(i)}>
                {b.chords.map((c, j) => (
                  <span key={j} className={`bar-chord ${active && pos?.chordIndex === j ? 'on' : ''}`}>
                    {c}
                  </span>
                ))}
              </button>
            </div>
          );
        })}
      </div>
      {playing && <p className="muted small">Tip: tap a bar to jump there.</p>}

      {showDiagrams && (
        <div className="diagram-row">
          {unique.map((c) => (
            <ChordDiagram key={c} symbol={c} active={c === current} />
          ))}
        </div>
      )}
    </div>
  );
}
