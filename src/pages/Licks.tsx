import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ChartPlayer from '../components/ChartPlayer';
import LickPlayer from '../components/LickPlayer';
import { LICKS, type Lick } from '../data/licks';
import { PROGRESSIONS, buildProgressionChart } from '../data/progressions';
import { setMixWithOtherAudio } from '../audio/engine';
import Fretboard from '../components/Fretboard';
import SoloSheet from '../components/SoloSheet';
import { backingQuery, scaleLabel, spotifySearchUrl, youtubeSearchUrl, type SoloScale } from '../data/externalTracks';
import { keyShortName, mod12, noteName, parseNoteName, usesFlats } from '../music/theory';
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

const DEFAULT_SLOTS: Record<SoloScale, string[]> = {
  minorPent: ['high-bend', 'repeating-triplet', 'descending-run'],
  blues: ['low-riff', 'double-stop', 'blue-note'],
  majorPent: ['major-country', 'repeating-triplet', 'major-sweet'],
};

function phraseLabel(i: number, n: number) {
  if (i === 0) return `Phrase 1 · opener`;
  if (i === n - 1) return `Phrase ${i + 1} · ending (land on the root)`;
  return `Phrase ${i + 1} · build`;
}

function SoloBuilder() {
  const s = useAppState();
  const [root, setRoot] = useState(9);
  const [scale, setScale] = useState<SoloScale>('minorPent');
  const [source, setSource] = useState<'builtin' | 'external'>('builtin');
  const [progId, setProgId] = useState('aeolian-rock');
  const [bpm, setBpm] = useState(90);
  const [trackBpm, setTrackBpm] = useState<number | null>(null);
  const [box, setBox] = useState(1);
  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS.minorPent);
  const [name, setName] = useState('My first solo');
  const [savedMsg, setSavedMsg] = useState(false);
  const taps = useRef<number[]>([]);

  const tonality = scale === 'majorPent' ? 'major' : 'minor';
  const key = { root, tonality } as const;
  const flats = usesFlats(key);
  const label = scaleLabel(root, scale, flats);
  const query = backingQuery(root, scale, flats);

  // Licks that fit the chosen scale. Minor licks still work over a major key: they are
  // played in the relative minor (same notes, same box shapes).
  const lickOptions = scale === 'majorPent' ? [...LICKS.filter((l) => l.tonality === 'major'), ...LICKS.filter((l) => l.tonality === 'minor')] : LICKS.filter((l) => l.tonality === 'minor');
  const progOptions = PROGRESSIONS.filter((p) => p.tonality === 'blues' || p.tonality === tonality);
  const prog = progOptions.find((p) => p.id === progId) ?? progOptions[0];
  const bars = useMemo(() => buildProgressionChart(prog, { root, tonality }).map((chords) => ({ chords })), [prog, root, tonality]);

  // Let lick previews mix with Spotify instead of pausing it.
  useEffect(() => {
    setMixWithOtherAudio(source === 'external');
    return () => setMixWithOtherAudio(false);
  }, [source]);

  const changeScale = (sc: SoloScale) => {
    setScale(sc);
    const valid = new Set((sc === 'majorPent' ? LICKS : LICKS.filter((l) => l.tonality === 'minor')).map((l) => l.id));
    if (!slots.every((id) => valid.has(id)) || (sc === 'majorPent') !== (scale === 'majorPent')) setSlots(DEFAULT_SLOTS[sc]);
    const p = PROGRESSIONS.find((x) => x.id === progId);
    if (p && p.tonality !== 'blues' && p.tonality !== (sc === 'majorPent' ? 'major' : 'minor')) {
      const def = sc === 'majorPent' ? 'pop-axis' : sc === 'blues' ? 'blues12' : 'aeolian-rock';
      setProgId(def);
      setBpm(PROGRESSIONS.find((x) => x.id === def)!.defaultBpm);
    }
  };

  const tap = () => {
    const now = performance.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= 3) {
      const d = taps.current.slice(1).map((t, i) => t - taps.current[i]);
      setTrackBpm(Math.round(60000 / (d.reduce((a, b) => a + b, 0) / d.length)));
    }
  };

  const lickKey = (l: Lick) =>
    l.tonality === 'major' ? keyShortName({ root, tonality: 'major' }) : keyShortName({ root: scale === 'majorPent' ? mod12(root - 3) : root, tonality: 'minor' });
  const lickBpm = source === 'external' ? trackBpm ?? undefined : bpm;
  const phrases = useMemo(
    () => slots.map((id, i) => {
      const lick = LICKS.find((l) => l.id === id)!;
      return { lick, keyStr: lickKey(lick), label: `${i + 1}. ${lick.name}` };
    }),
    [slots, root, scale], // eslint-disable-line
  );

  return (
    <div>
      <div className="card">
        <p>
          A great solo can be just <strong>3 licks</strong>: an opener, something that builds, and an ending that lands on the root. Pick a key and scale, choose a backing track — built in, or
          your own from Spotify — then learn each lick and play them back-to-back. Next time, swap one lick: that's how improvising starts.
        </p>
        <div className="grid-controls">
          <label>
            Key
            <select value={root} onChange={(e) => setRoot(+e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {noteName(i, usesFlats({ root: i, tonality }))}
                </option>
              ))}
            </select>
          </label>
          <label>
            Scale
            <select value={scale} onChange={(e) => changeScale(e.target.value as SoloScale)}>
              <option value="minorPent">Minor pentatonic</option>
              <option value="blues">Blues scale</option>
              <option value="majorPent">Major pentatonic</option>
            </select>
          </label>
        </div>
        <h2 className="scale-title">{label}</h2>
        <div className="seg">
          {[1, 2, 3, 4, 5, 0].map((b) => (
            <button key={b} className={box === b ? 'on' : ''} onClick={() => setBox(b)}>
              {b === 0 ? 'Whole neck' : `Box ${b}`}
            </button>
          ))}
        </div>
        <Fretboard root={root} scale={scale} box={box || undefined} flats={flats} />
      </div>

      <div className="card">
        <div className="row between wrap">
          <h3>Backing track</h3>
          <div className="seg">
            <button className={source === 'builtin' ? 'on' : ''} onClick={() => setSource('builtin')}>Built-in</button>
            <button className={source === 'external' ? 'on' : ''} onClick={() => setSource('external')}>Spotify / YouTube</button>
          </div>
        </div>
        {source === 'builtin' ? (
          <>
            <div className="grid-controls">
              <label>
                Progression
                <select
                  value={prog.id}
                  onChange={(e) => {
                    setProgId(e.target.value);
                    setBpm(PROGRESSIONS.find((x) => x.id === e.target.value)!.defaultBpm);
                  }}
                >
                  {progOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Tempo: {bpm} BPM
                <input type="range" min={50} max={160} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
              </label>
            </div>
            <p className="muted small">{prog.description} The licks below start at this tempo.</p>
            <ChartPlayer key={`${prog.id}-${root}`} bars={bars} bpm={bpm} style={prog.defaultStyle} showDiagrams={false} />
          </>
        ) : (
          <>
            <p>
              Search for <strong>“{query}”</strong> — any track labelled with that key works with <strong>{label}</strong>.
            </p>
            <div className="row gap wrap">
              <a className="btn primary big" href={spotifySearchUrl(query)} target="_blank" rel="noreferrer">
                Find on Spotify ↗
              </a>
              <a className="btn big" href={youtubeSearchUrl(query)} target="_blank" rel="noreferrer">
                Find on YouTube ↗
              </a>
            </div>
            <ul className="small">
              {scale === 'majorPent' ? (
                <li>
                  Major pentatonic uses the same shapes as {keyShortName({ root: mod12(root - 3), tonality: 'minor' })} minor pentatonic — so a “{noteName(mod12(root - 3), flats)} minor” track also works, it'll just sound sadder.
                </li>
              ) : (
                <li>
                  “{noteName(root, flats)} minor” and “{noteName(root, flats)} blues” tracks both work with {label}. A “{noteName(mod12(root + 3), flats)} major” track does too (same notes) — but then end your phrases on {noteName(mod12(root + 3), flats)}.
                </li>
              )}
              <li>Start the track in Spotify, then come back here. Lick previews will mix with the music instead of pausing it (on iPad, turn the silent switch off to hear them).</li>
            </ul>
            <div className="row gap wrap">
              <span>Track tempo:</span>
              <button className="btn" onClick={tap}>Tap along to the beat</button>
              <input
                type="number"
                min={40}
                max={220}
                placeholder="BPM"
                value={trackBpm ?? ''}
                onChange={(e) => setTrackBpm(e.target.value ? +e.target.value : null)}
                style={{ width: 100 }}
              />
              <span className="muted small">{trackBpm ? `Licks below will play at ${trackBpm} BPM.` : 'Optional — so the licks play at the track\'s speed.'}</span>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3>Your solo</h3>
        <div className="grid-controls">
          {slots.map((id, i) => (
            <label key={i}>
              {phraseLabel(i, slots.length)}
              <select value={id} onChange={(e) => setSlots(slots.map((x, j) => (j === i ? e.target.value : x)))}>
                {lickOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.function}{scale === 'majorPent' ? (l.tonality === 'major' ? ', major' : ', relative minor') : ''})
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="row gap wrap">
          {slots.length < 6 && (
            <button className="btn" onClick={() => setSlots([...slots.slice(0, -1), lickOptions[0].id, slots[slots.length - 1]])}>
              + Add a phrase
            </button>
          )}
          {slots.length > 2 && (
            <button className="btn ghost" onClick={() => setSlots([...slots.slice(0, -2), slots[slots.length - 1]])}>
              − Remove a phrase
            </button>
          )}
          <button
            className="btn ghost"
            onClick={() => {
              const shuffled = [...lickOptions].sort(() => Math.random() - 0.5);
              const pick = (fn: string, avoid: string[], majorOnly: boolean) =>
                shuffled.find((l) => (l.function === fn || l.function === 'any') && !avoid.includes(l.id) && (!majorOnly || l.tonality === 'major'))?.id ??
                shuffled.find((l) => !avoid.includes(l.id) && (!majorOnly || l.tonality === 'major'))?.id ??
                shuffled[0].id;
              const out: string[] = [];
              slots.forEach((_, i) => {
                const last = i === slots.length - 1;
                // in a major key the ending must resolve to the major root, so use a major lick
                out.push(pick(i === 0 ? 'opener' : last ? 'ending' : 'middle', out, scale === 'majorPent' && last));
              });
              setSlots(out);
            }}
          >
            🎲 Surprise me
          </button>
        </div>
        <div className="row gap wrap">
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button
            className="btn"
            onClick={() => {
              saveSoloPlan({
                id: name.toLowerCase().replace(/\W+/g, '-'),
                name,
                lickIds: slots,
                key: noteName(root, flats),
                scale,
                source,
                progression: prog.id,
                bpm: source === 'external' ? trackBpm ?? undefined : bpm,
              });
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
                <button
                  className="linkish"
                  onClick={() => {
                    setRoot(parseNoteName(p.key) ?? 9);
                    setScale(p.scale ?? 'minorPent');
                    setSource(p.source ?? 'builtin');
                    if (p.progression) setProgId(p.progression);
                    else setProgId('blues12');
                    if (p.source === 'external') setTrackBpm(p.bpm ?? null);
                    else if (p.bpm) setBpm(p.bpm);
                    setSlots(p.lickIds);
                    setName(p.name);
                  }}
                >
                  {p.name} <span className="muted">· {p.key} {p.scale === 'majorPent' ? 'major' : p.scale === 'blues' ? 'blues' : 'minor'}</span>
                </button>
                <button className="linkish" onClick={() => deleteSoloPlan(p.id)} aria-label="delete">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {slots.map((id, i) => {
        const lick = LICKS.find((l) => l.id === id)!;
        return (
          <div key={i} className="card">
            <span className="eyebrow">{phraseLabel(i, slots.length)}</span>
            <h3>
              {lick.name} <span className="muted small">· in {lickKey(lick)}</span>
            </h3>
            <LickPlayer key={`${id}-${root}-${scale}-${lickBpm ?? ''}`} lick={lick} initialKey={lickKey(lick)} showFretboard={false} targetBpm={lickBpm} />
          </div>
        );
      })}

      <div className="card full-solo">
        <span className="eyebrow">Put it all together</span>
        <h2>Your full solo · {label}</h2>
        <p className="muted">
          All {slots.length} phrases in order, as one piece of tab.
          {source === 'builtin'
            ? ' Play it with the built-in backing track, or turn the track off and play along with your own.'
            : ' Start your Spotify track, then play along — tap the track tempo above so it plays at the same speed.'}
        </p>
        <SoloSheet
          phrases={phrases}
          bpm={source === 'external' ? trackBpm ?? 80 : bpm}
          root={root}
          scale={scale}
          backing={source === 'builtin' ? { bars, style: prog.defaultStyle } : null}
        />
      </div>
    </div>
  );
}
