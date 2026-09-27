import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChordGrid } from '../components/ActivityView';
import Metronome from '../components/Metronome';
import Tuner from '../components/Tuner';
import { detectKey, diatonicChords, keyName, keyShortName, soloAdvice } from '../music/theory';

export default function Tools() {
  const [tab, setTab] = useState<'tuner' | 'metronome' | 'key' | 'chords'>('tuner');
  return (
    <div className="page">
      <h1>Tools</h1>
      <div className="seg">
        <button className={tab === 'tuner' ? 'on' : ''} onClick={() => setTab('tuner')}>Tuner</button>
        <button className={tab === 'metronome' ? 'on' : ''} onClick={() => setTab('metronome')}>Metronome</button>
        <button className={tab === 'key' ? 'on' : ''} onClick={() => setTab('key')}>Key finder</button>
        <button className={tab === 'chords' ? 'on' : ''} onClick={() => setTab('chords')}>Chord library</button>
      </div>
      {tab === 'tuner' && <Tuner />}
      {tab === 'metronome' && <Metronome exercise="box1" />}
      {tab === 'key' && <KeyFinder />}
      {tab === 'chords' && <ChordLibrary />}
    </div>
  );
}

function KeyFinder() {
  const [text, setText] = useState('Em C G D');
  const chords = useMemo(() => text.split(/[\s,|]+/).filter(Boolean), [text]);
  const guesses = useMemo(() => detectKey(chords), [chords]);
  const best = guesses[0];
  const alt = guesses.find((g, i) => i > 0 && !g.isBlues && (g.key.root !== best?.key.root || g.key.tonality !== best?.key.tonality));
  return (
    <div className="card">
      <h3>Key finder</h3>
      <p className="muted small">Type the chords of a song (from Chordify, for example). I'll tell you the key and what to solo with.</p>
      <input className="full big-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. G D Em C" />
      {best ? (
        <div className="key-result">
          <h2>
            {keyName(best.key)}
            {best.isBlues ? ' blues' : ''}
          </h2>
          {alt && <p className="muted small">Could also be {keyName(alt.key)} — trust your ear: which chord feels like "home"?</p>}
          <ul>
            {soloAdvice(best.key, best.isBlues).map((a) => (
              <li key={a.label}>
                <strong>{a.label}</strong> — {a.tips.join(' ')}
              </li>
            ))}
          </ul>
          <p className="small">
            Chords in {keyShortName(best.key)}: {diatonicChords(best.key).map((c) => `${c.symbol} (${c.roman})`).join(' · ')}
          </p>
          <Link className="btn primary" to={`/jam?key=${encodeURIComponent(keyShortName(best.key))}`}>
            Jam in {keyShortName(best.key)} →
          </Link>
        </div>
      ) : (
        <p className="muted">Enter some chords above.</p>
      )}
    </div>
  );
}

const QUALITIES = [
  { q: '', label: 'major' },
  { q: 'm', label: 'minor' },
  { q: '7', label: '7' },
  { q: 'm7', label: 'm7' },
  { q: 'maj7', label: 'maj7' },
  { q: 'sus2', label: 'sus2' },
  { q: 'sus4', label: 'sus4' },
  { q: '5', label: 'power (5)' },
];

function ChordLibrary() {
  const [root, setRoot] = useState('G');
  const [custom, setCustom] = useState('');
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return (
    <div className="card">
      <h3>Chord library</h3>
      <div className="seg wrap">
        {names.map((n) => (
          <button key={n} className={root === n ? 'on' : ''} onClick={() => setRoot(n)}>
            {n}
          </button>
        ))}
      </div>
      <ChordGrid chords={QUALITIES.map((q) => root + q.q)} />
      <h4>Look up any chord</h4>
      <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. F#m7, Cadd9, D/F#" />
      {custom.trim() && <ChordGrid chords={[custom.trim()]} />}
      <p className="muted small">Tap a diagram to hear it. Unknown chord types fall back to a simpler shape that still fits.</p>
    </div>
  );
}
