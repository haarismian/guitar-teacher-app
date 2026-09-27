import { useEffect, useRef, useState } from 'react';
import { Metronome as Engine } from '../audio/metronome';
import { logTempo } from '../store/store';

interface Props {
  initialBpm?: number;
  exercise?: string; // if given, offers "log this tempo"
  compact?: boolean;
}

export default function Metronome({ initialBpm = 60, exercise, compact }: Props) {
  const engine = useRef<Engine | null>(null);
  const [bpm, setBpm] = useState(initialBpm);
  const [beats, setBeats] = useState(4);
  const [sub, setSub] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [logged, setLogged] = useState(false);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    return () => engine.current?.stop();
  }, []);

  useEffect(() => {
    if (engine.current) {
      engine.current.bpm = bpm;
      engine.current.beatsPerBar = beats;
      engine.current.subdivision = sub;
    }
  }, [bpm, beats, sub]);

  const toggle = async () => {
    if (playing) {
      engine.current?.stop();
      setPlaying(false);
      setBeat(-1);
      return;
    }
    const e = new Engine();
    e.bpm = bpm;
    e.beatsPerBar = beats;
    e.subdivision = sub;
    e.onBeat = setBeat;
    engine.current = e;
    await e.start();
    setPlaying(true);
  };

  const tap = () => {
    const now = performance.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= 2) {
      const diffs = taps.current.slice(1).map((t, i) => t - taps.current[i]);
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      setBpm(Math.max(30, Math.min(240, Math.round(60000 / avg))));
    }
  };

  const change = (d: number) => setBpm((b) => Math.max(30, Math.min(240, b + d)));

  return (
    <div className={`card metronome ${compact ? 'compact' : ''}`}>
      <div className="row between">
        <h3>Metronome</h3>
        <div className="beat-dots">
          {Array.from({ length: beats }, (_, i) => (
            <span key={i} className={`beat-dot ${beat === i ? 'on' : ''} ${i === 0 ? 'first' : ''}`} />
          ))}
        </div>
      </div>
      <div className="row center metro-bpm">
        <button className="btn round" onClick={() => change(-5)}>−5</button>
        <button className="btn round" onClick={() => change(-1)}>−1</button>
        <div className="bpm-display">
          <span className="bpm-num">{bpm}</span>
          <span className="muted">BPM</span>
        </div>
        <button className="btn round" onClick={() => change(1)}>+1</button>
        <button className="btn round" onClick={() => change(5)}>+5</button>
      </div>
      <input type="range" min={30} max={240} value={bpm} onChange={(e) => setBpm(+e.target.value)} className="full" />
      <div className="row wrap gap">
        <button className={`btn big ${playing ? 'danger' : 'primary'}`} onClick={toggle}>
          {playing ? '■ Stop' : '▶ Start'}
        </button>
        <button className="btn" onClick={tap}>Tap tempo</button>
        <select value={beats} onChange={(e) => setBeats(+e.target.value)}>
          {[2, 3, 4, 6].map((b) => (
            <option key={b} value={b}>{b} beats</option>
          ))}
        </select>
        <select value={sub} onChange={(e) => setSub(+e.target.value)}>
          <option value={1}>Quarter notes</option>
          <option value={2}>Eighth notes</option>
          <option value={3}>Triplets</option>
          <option value={4}>Sixteenths</option>
        </select>
        {exercise && (
          <button
            className="btn"
            onClick={() => {
              logTempo(exercise, bpm);
              setLogged(true);
              setTimeout(() => setLogged(false), 2000);
            }}
          >
            {logged ? '✓ Logged' : `Log ${bpm} BPM as my best`}
          </button>
        )}
      </div>
    </div>
  );
}
