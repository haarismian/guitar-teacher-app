import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ChartPlayer from '../components/ChartPlayer';
import LickPlayer from '../components/LickPlayer';
import { LICKS, type Lick } from '../data/licks';
import { PROGRESSIONS, buildProgressionChart } from '../data/progressions';
import { ALL_KEYS, keyShortName, parseKey } from '../music/theory';
import { deleteSoloPlan, saveSoloPlan, setLickStatus, useAppState, type LickStatus } from '../store/store';

const STATUSES: LickStatus[] = ['learning', 'comfortable', 'mastered'];

export function LickList() {
  const s = useAppState();
  const [tab, setTab] = useState<'licks' | 'builder'>('licks');
  const counts = STATUSES.map((st) => LICKS.filter((l) => s.lickStatus[l.id] === st).length);
  return (
    <div className="page">
      <h1>Licks</h1>
      <div className="seg">
        <button className={tab === 'licks' ? 'on' : ''} onClick={() => setTab('licks')}>Lick library</button>
        <button className={tab === 'builder' ? 'on' : ''} onClick={() => setTab('builder')}>Solo builder</button>
      </div>
      {tab === 'licks' ? (
        <>
          <p className="muted">
            {counts[0]} learning · {counts[1]} comfortable · {counts[2]} mastered — out of {LICKS.length}. Every lick transposes to any key.
          </p>
          {[1, 2, 3].map((lvl) => (
            <section key={lvl}>
              <h2>{lvl === 1 ? 'Starter licks' : lvl === 2 ? 'Next steps' : 'Advanced'}</h2>
              <div className="song-grid">
                {LICKS.filter((l) => l.level === lvl).map((l) => (
                  <LickCard key={l.id} lick={l} status={s.lickStatus[l.id]} />
                ))}
              </div>
            </section>
          ))}
        </>
      ) : (
        <SoloBuilder />
      )}
    </div>
  );
}

function LickCard({ lick, status }: { lick: Lick; status?: LickStatus }) {
  return (
    <Link to={`/licks/${lick.id}`} className="song-card card">
      <div className="row between">
        <span className="level-badge">{lick.tonality === 'major' ? 'Major' : 'Minor'}</span>
        {status && status !== 'new' && <span className={`status ${status}`}>{status}</span>}
      </div>
      <strong>{lick.name}</strong>
      <span className="muted small">{lick.style} · {lick.function}</span>
      <span className="small">{lick.description}</span>
    </Link>
  );
}

export function LickPage() {
  const { id } = useParams();
  const s = useAppState();
  const lick = LICKS.find((l) => l.id === id);
  if (!lick) return <div className="page">Lick not found.</div>;
  const st = s.lickStatus[lick.id] ?? 'new';
  return (
    <div className="page">
      <Link to="/licks" className="back">← Licks</Link>
      <h1>{lick.name}</h1>
      <p className="muted">
        {lick.style} · {lick.tonality === 'major' ? 'Major pentatonic' : 'Minor pentatonic'} · {lick.box ? `Box ${lick.box}` : 'B.B. King box'} · works as {lick.function === 'any' ? 'any part of a solo' : `an ${lick.function === 'opener' ? 'opener' : lick.function === 'ending' ? 'ending' : 'middle phrase'}`}
      </p>
      <p className="lead">{lick.description}</p>
      <div className="seg">
        {STATUSES.map((x) => (
          <button key={x} className={st === x ? 'on' : ''} onClick={() => setLickStatus(lick.id, x)}>
            {x}
          </button>
        ))}
      </div>
      <div className="card">
        <LickPlayer lick={lick} />
      </div>
      <div className="card">
        <h3>How to practise it</h3>
        <ol className="steps">
          <li>Listen to it at 70% speed a few times. Sing it if you can.</li>
          <li>Play along slowly with the loop. Match the timing, not just the notes.</li>
          {lick.tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
          <li>When it's clean 3× in a row, raise the speed by 10%.</li>
          <li>Change the key and play it somewhere else on the neck.</li>
          <li>Use it in a jam: play the lick, then improvise a response.</li>
        </ol>
        <Link className="btn" to={`/jam?key=${lick.tonality === 'major' ? 'G' : 'Am'}`}>Try it over a backing track →</Link>
      </div>
    </div>
  );
}

function SoloBuilder() {
  const s = useAppState();
  const [keyStr, setKeyStr] = useState('A');
  const [slots, setSlots] = useState<string[]>(['high-bend', 'repeating-triplet', 'descending-run']);
  const [name, setName] = useState('My first solo');
  const [savedMsg, setSavedMsg] = useState(false);
  const key = parseKey(keyStr) ?? { root: 9, tonality: 'major' as const };
  const blues = PROGRESSIONS.find((p) => p.id === 'blues12')!;
  const bars = useMemo(() => buildProgressionChart(blues, key).map((chords) => ({ chords })), [key.root]); // eslint-disable-line
  const minorLicks = LICKS.filter((l) => l.tonality === 'minor');
  const sections = ['Bars 1–4 (opener)', 'Bars 5–8 (build)', 'Bars 9–12 (resolve)'];

  return (
    <div>
      <div className="card">
        <p>
          A great beginner solo is just <strong>3 licks</strong> over a 12-bar blues: an opener, something that builds, and an ending that lands on the root. Pick your licks, learn each one, then play them
          back-to-back over the track. Next time, swap one lick — that's how improvising starts.
        </p>
        <div className="grid-controls">
          <label>
            Key
            <select value={keyStr} onChange={(e) => setKeyStr(e.target.value)}>
              {ALL_KEYS.filter((k) => k.tonality === 'major').map((k) => (
                <option key={k.root} value={keyShortName(k)}>{keyShortName(k)} blues</option>
              ))}
            </select>
          </label>
          {sections.map((label, i) => (
            <label key={i}>
              {label}
              <select value={slots[i]} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? e.target.value : x)))}>
                {minorLicks.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.function})
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="row gap wrap">
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button
            className="btn"
            onClick={() => {
              saveSoloPlan({ id: name.toLowerCase().replace(/\W+/g, '-'), name, lickIds: slots, key: keyStr });
              setSavedMsg(true);
              setTimeout(() => setSavedMsg(false), 2000);
            }}
          >
            {savedMsg ? '✓ Saved' : 'Save solo'}
          </button>
        </div>
        {s.soloPlans.length > 0 && (
          <div className="row wrap gap">
            <span className="muted small">Saved:</span>
            {s.soloPlans.map((p) => (
              <span key={p.id} className="chip on">
                <button className="linkish" onClick={() => { setSlots(p.lickIds); setKeyStr(p.key); setName(p.name); }}>{p.name}</button>
                <button className="linkish" onClick={() => deleteSoloPlan(p.id)} aria-label="delete">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <h3>Backing track: 12-bar blues in {keyStr}</h3>
        <ChartPlayer bars={bars} bpm={80} style="shuffle" showDiagrams={false} />
      </div>
      {slots.map((id, i) => {
        const lick = LICKS.find((l) => l.id === id)!;
        return (
          <div key={i} className="card">
            <span className="eyebrow">{sections[i]}</span>
            <h3>{lick.name}</h3>
            <LickPlayer key={`${id}-${keyStr}`} lick={lick} initialKey={`${keyStr}m`} showFretboard={false} />
          </div>
        );
      })}
    </div>
  );
}
