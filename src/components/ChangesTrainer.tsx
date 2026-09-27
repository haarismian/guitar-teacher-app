import { useEffect, useMemo, useRef, useState } from 'react';
import { logTempo } from '../store/store';
import ChartPlayer from './ChartPlayer';

export default function ChangesTrainer({ chords, bpm }: { chords: string[]; bpm: number }) {
  const bars = useMemo(() => chords.map((c) => ({ chords: [c] })), [chords]);
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(60);
  const [count, setCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const start = () => {
    setCount(0);
    setLeft(60);
    setSaved(false);
    setRunning(true);
    timer.current = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(timer.current!);
          setRunning(false);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
  };

  const name = chords.join('-');
  return (
    <div className="changes">
      <div className="card inner">
        <h4>One-minute changes: {chords.join(' ↔ ')}</h4>
        <p className="muted small">Strum each chord once and switch. Tap the big button every time you land a clean change.</p>
        <div className="row wrap gap center">
          {!running && left === 60 && (
            <button className="btn primary big" onClick={start}>Start 60s</button>
          )}
          {running && (
            <>
              <span className="timer-big">{left}s</span>
              <button className="btn primary huge" onClick={() => setCount((c) => c + 1)}>
                Change! ({count})
              </button>
            </>
          )}
          {!running && left === 0 && (
            <>
              <span className="timer-big">{count} changes</span>
              <button
                className="btn"
                disabled={saved}
                onClick={() => {
                  logTempo(`changes:${name}`, count);
                  setSaved(true);
                }}
              >
                {saved ? '✓ Saved to progress' : 'Save result'}
              </button>
              <button className="btn" onClick={() => setLeft(60)}>Again</button>
            </>
          )}
        </div>
      </div>
      <h4>Then play the changes in time</h4>
      <ChartPlayer bars={bars} bpm={bpm} style="folk" strum="D-D-D-D-" instruments={{ guitar: false, click: true }} />
    </div>
  );
}
