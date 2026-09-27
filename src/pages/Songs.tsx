import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { STYLES, parseChart, uniqueChords, type StyleId } from '../audio/player';
import ChartPlayer from '../components/ChartPlayer';
import Fretboard from '../components/Fretboard';
import { chordifySearchUrl, type Song } from '../data/songs';
import { allSongs, findSong, songKey } from '../data/songLookup';
import { chordToneClasses } from '../music/chords';
import { detectKey, keyName, keyShortName, relativeMinor, soloAdvice, transposeChordSymbol, usesFlats } from '../music/theory';
import { deleteCustomSong, saveCustomSong, setSongStatus, useAppState, type SongStatus } from '../store/store';

type Filter = 'all' | 'strum' | 'solo' | 'mine' | 'learning';

const STATUS_LABEL: Record<SongStatus, string> = { none: '', learning: 'Learning', 'can-play': 'Can play', mastered: 'Mastered' };

export function SongList() {
  const s = useAppState();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [chordifyQ, setChordifyQ] = useState('');
  const songs = allSongs(s)
    .filter((x) => {
      if (filter === 'strum') return x.goal !== 'solo';
      if (filter === 'solo') return x.goal !== 'strum';
      if (filter === 'mine') return x.custom;
      if (filter === 'learning') return (s.songStatus[x.id] ?? 'none') !== 'none';
      return true;
    })
    .filter((x) => !q || `${x.title} ${x.artist}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));

  return (
    <div className="page">
      <h1>Songs</h1>
      <div className="card chordify">
        <h3>🔎 Look up a song on Chordify</h3>
        <p className="muted small">Search Chordify (opens in a new tab), then come back and add the chords to get a backing track and solo scale.</p>
        <form
          className="row gap wrap"
          onSubmit={(e) => {
            e.preventDefault();
            if (chordifyQ.trim()) window.open(chordifySearchUrl(chordifyQ.trim()), '_blank');
          }}
        >
          <input className="grow" placeholder="Song title and artist…" value={chordifyQ} onChange={(e) => setChordifyQ(e.target.value)} />
          <button className="btn" type="submit">Search Chordify ↗</button>
          <Link className="btn primary" to={`/songs/new${chordifyQ ? `?title=${encodeURIComponent(chordifyQ)}` : ''}`}>+ Add song</Link>
        </form>
      </div>

      <div className="row wrap gap">
        <div className="seg">
          {(['all', 'strum', 'solo', 'learning', 'mine'] as Filter[]).map((f) => (
            <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'strum' ? 'Strum-along' : f === 'solo' ? 'Solo over' : f === 'learning' ? 'My progress' : 'My songs'}
            </button>
          ))}
        </div>
        <input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="song-grid">
        {songs.map((song) => {
          const st = s.songStatus[song.id] ?? 'none';
          return (
            <Link key={song.id} to={`/songs/${song.id}`} className="song-card card">
              <div className="row between">
                <span className="level-badge">L{song.level}</span>
                {st !== 'none' && <span className={`status ${st}`}>{STATUS_LABEL[st]}</span>}
              </div>
              <strong>{song.title}</strong>
              <span className="muted">{song.artist}</span>
              <span className="song-meta">
                Key {song.key} · {song.bpm} BPM{song.capo ? ` · capo ${song.capo}` : ''}
              </span>
              <span className="song-goal">{song.goal === 'strum' ? '🎵 Strum' : song.goal === 'solo' ? '🎸 Solo' : '🎵🎸 Strum + solo'}</span>
            </Link>
          );
        })}
        {songs.length === 0 && <p className="muted">No songs here yet.</p>}
      </div>
    </div>
  );
}

export function SongPage() {
  const { id } = useParams();
  const s = useAppState();
  const nav = useNavigate();
  const song = id ? findSong(s, id) : undefined;
  const [chord, setChord] = useState<string | null>(null);
  const [box, setBox] = useState(1);
  const [showTones, setShowTones] = useState(true);
  const bars = useMemo(() => (song ? parseChart(song.chart) : []), [song]);
  if (!song) return <div className="page">Song not found. <Link to="/songs">Back</Link></div>;

  const { key, isBlues } = songKey(song);
  const advice = soloAdvice(key, isBlues);
  const scale = advice[0].scale;
  const st = s.songStatus[song.id] ?? 'none';
  const capo = song.capo ?? 0;

  return (
    <div className="page">
      <Link to="/songs" className="back">← Songs</Link>
      <div className="row between wrap">
        <div>
          <h1>{song.title}</h1>
          <p className="muted">
            {song.artist} · Key of {keyName(key)} · {song.bpm} BPM{capo ? ` · Capo ${capo}` : ''}
          </p>
        </div>
        <div className="row gap wrap">
          <a className="btn" href={chordifySearchUrl(song.title, song.artist)} target="_blank" rel="noreferrer">
            Open in Chordify ↗
          </a>
          {song.custom && (
            <>
              <Link className="btn" to={`/songs/${song.id}/edit`}>Edit</Link>
              <button
                className="btn ghost"
                onClick={() => {
                  if (confirm('Delete this song?')) {
                    deleteCustomSong(song.id);
                    nav('/songs');
                  }
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="seg">
        {(['learning', 'can-play', 'mastered'] as SongStatus[]).map((x) => (
          <button key={x} className={st === x ? 'on' : ''} onClick={() => setSongStatus(song.id, st === x ? 'none' : x)}>
            {STATUS_LABEL[x]}
          </button>
        ))}
      </div>

      {song.notes && <p className="note">💡 {song.notes}</p>}
      {capo > 0 && (
        <p className="note">
          🎯 Capo on fret {capo}. The chart shows the <strong>shapes</strong> you play; the backing track sounds at concert pitch (
          {uniqueChords(bars).map((c) => transposeChordSymbol(c, capo)).join(', ')}).
        </p>
      )}

      <div className="card">
        <h3>Play along</h3>
        <p className="muted small">
          Strumming? Turn <em>Guitar</em> off and be the guitarist. Soloing? Leave it on. Strum pattern:{' '}
          <code>{song.strum ?? STYLES[song.style].strum}</code> (D = down, U = up, x = mute, - = miss)
        </p>
        <ChartPlayer bars={bars} bpm={song.bpm} style={song.style} strum={song.strum} beatsPerBar={song.beatsPerBar} transpose={capo} onChord={setChord} />
      </div>

      <div className="card">
        <h3>Solo over it</h3>
        <ul>
          {advice.map((a) => (
            <li key={a.label}>
              <strong>{a.label}</strong> — {a.tips.join(' ')}
            </li>
          ))}
        </ul>
        {song.soloTip && <p className="note">🎸 {song.soloTip}</p>}
        <div className="row wrap gap">
          <div className="seg">
            {[1, 2, 3, 4, 5, 0].map((b) => (
              <button key={b} className={box === b ? 'on' : ''} onClick={() => setBox(b)}>
                {b === 0 ? 'All' : `Box ${b}`}
              </button>
            ))}
          </div>
          <button className={`chip ${showTones ? 'on' : ''}`} onClick={() => setShowTones(!showTones)}>
            ✨ Chord tones
          </button>
          {key.tonality === 'major' && <span className="muted small">Shapes = {keyShortName(relativeMinor(key))} minor pentatonic</span>}
        </div>
        <Fretboard root={key.root} scale={scale} box={box || undefined} flats={usesFlats(key)} chordTones={showTones && chord ? chordToneClasses(chord) : undefined} />
        <Link className="btn" to={`/jam?key=${encodeURIComponent(keyShortName(key))}`}>
          Jam in {keyShortName(key)} with other progressions →
        </Link>
      </div>
    </div>
  );
}

const STRUM_PRESETS: Array<{ label: string; style: StyleId; pattern: string | null }> = [
  { label: 'Old faithful  D-DU-UDU', style: 'folk', pattern: 'D-DU-UDU' },
  { label: 'All downs  D-D-D-D-', style: 'folk', pattern: 'D-D-D-D-' },
  { label: 'Eighth downs  DDDDDDDD', style: 'rock', pattern: null },
  { label: 'Pop 16ths', style: 'pop', pattern: null },
  { label: 'Off-beat (reggae)  -D-D-D-D', style: 'folk', pattern: '-D-D-D-D' },
  { label: 'Ballad arpeggio', style: 'ballad', pattern: null },
  { label: 'Blues shuffle', style: 'shuffle', pattern: null },
  { label: 'Slow blues', style: 'slowblues', pattern: null },
  { label: 'Funk / Latin', style: 'funk', pattern: null },
];

export function SongEditor() {
  const { id } = useParams();
  const s = useAppState();
  const nav = useNavigate();
  const existing = id ? findSong(s, id) : undefined;
  const [params] = useSearchParams();
  const [title, setTitle] = useState(existing?.title ?? params.get('title') ?? '');
  const [artist, setArtist] = useState(existing?.artist ?? '');
  const [key, setKey] = useState(existing?.key ?? '');
  const [bpm, setBpm] = useState(existing?.bpm ?? 100);
  const [capo, setCapo] = useState(existing?.capo ?? 0);
  const [beatsPerBar, setBeatsPerBar] = useState(existing?.beatsPerBar ?? 4);
  const initialPreset = Math.max(0, STRUM_PRESETS.findIndex((p) => p.style === existing?.style && p.pattern === (existing?.strum ?? null)));
  const [preset, setPreset] = useState(initialPreset);
  const [goal, setGoal] = useState<Song['goal']>(existing?.goal ?? 'both');
  const [chart, setChart] = useState(existing?.chart ?? 'Verse: | G | D | Em | C |\nChorus: | C | G | D | D |');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const bars = useMemo(() => parseChart(chart), [chart]);
  const concert = useMemo(() => bars.flatMap((b) => b.chords).map((c) => transposeChordSymbol(c, capo)), [bars, capo]);
  const guesses = useMemo(() => detectKey(concert), [concert]);
  const guess = guesses[0];
  const invalid = uniqueChords(bars).filter((c) => !/^[A-G]/.test(c) && c !== 'N.C.');

  const save = () => {
    const p = STRUM_PRESETS[preset];
    const song: Song = {
      id: existing?.id ?? `custom-${Date.now().toString(36)}`,
      title: title.trim() || 'Untitled',
      artist: artist.trim(),
      key: key.trim() || (guess ? keyShortName(guess.key) : 'C'),
      bpm,
      capo: capo || undefined,
      beatsPerBar,
      style: p.style,
      strum: p.pattern ?? undefined,
      goal,
      level: existing?.level ?? 2,
      chart,
      notes: notes || undefined,
      custom: true,
    };
    saveCustomSong(song);
    nav(`/songs/${song.id}`);
  };

  return (
    <div className="page">
      <Link to="/songs" className="back">← Songs</Link>
      <h1>{existing ? 'Edit song' : 'Add a song'}</h1>
      <div className="card">
        <ol className="steps small">
          <li>
            Find the song on{' '}
            <a href={chordifySearchUrl(title || 'song', artist)} target="_blank" rel="noreferrer">
              Chordify ↗
            </a>
            . Use the <em>Simplify</em> option if the chords look complicated.
          </li>
          <li>Type each section's chords, one bar per slot: <code>Verse: | G | D | Em | C |</code></li>
          <li>Two chords in one bar: <code>G.C</code> or <code>(G C)</code>. Repeat a line: add <code>x2</code> at the end. Repeat a bar: <code>%</code></li>
          <li>Enter the BPM and key from Chordify's song info (or let the app detect the key).</li>
        </ol>
      </div>
      <div className="card form">
        <div className="grid-controls">
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Artist
            <input value={artist} onChange={(e) => setArtist(e.target.value)} />
          </label>
          <label>
            Key {guess && <span className="muted small">(detected: {keyShortName(guess.key)}{guess.isBlues ? ' blues' : ''})</span>}
            <input value={key} placeholder={guess ? keyShortName(guess.key) : 'e.g. G or Em'} onChange={(e) => setKey(e.target.value)} />
          </label>
          <label>
            BPM
            <input type="number" min={40} max={240} value={bpm} onChange={(e) => setBpm(+e.target.value || 100)} />
          </label>
          <label>
            Capo
            <select value={capo} onChange={(e) => setCapo(+e.target.value)}>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={i}>{i === 0 ? 'None' : `Fret ${i}`}</option>
              ))}
            </select>
          </label>
          <label>
            Time
            <select value={beatsPerBar} onChange={(e) => setBeatsPerBar(+e.target.value)}>
              <option value={4}>4/4</option>
              <option value={3}>3/4</option>
            </select>
          </label>
          <label>
            Feel / strum
            <select value={preset} onChange={(e) => setPreset(+e.target.value)}>
              {STRUM_PRESETS.map((p, i) => (
                <option key={i} value={i}>{p.label}</option>
              ))}
            </select>
          </label>
          <label>
            Goal
            <select value={goal} onChange={(e) => setGoal(e.target.value as Song['goal'])}>
              <option value="strum">Strum along</option>
              <option value="solo">Solo over</option>
              <option value="both">Both</option>
            </select>
          </label>
        </div>
        <label>
          Chords {capo ? '(as shapes, with capo)' : ''}
          <textarea className="mono" rows={8} value={chart} onChange={(e) => setChart(e.target.value)} />
        </label>
        {invalid.length > 0 && <p className="warn">Couldn't read: {invalid.join(', ')}</p>}
        <label>
          Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember (strum pattern, riff, etc.)" />
        </label>
        <p className="muted small">
          {bars.length} bars · chords: {uniqueChords(bars).join(', ')}
          {guess && ` · sounds like ${keyName(guess.key)}${guess.isBlues ? ' (blues)' : ''}`}
        </p>
        <div className="row gap">
          <button className="btn primary big" onClick={save} disabled={!bars.length}>
            Save song
          </button>
        </div>
      </div>
      {bars.length > 0 && (
        <div className="card">
          <h3>Preview</h3>
          <ChartPlayer bars={bars} bpm={bpm} style={STRUM_PRESETS[preset].style} strum={STRUM_PRESETS[preset].pattern} beatsPerBar={beatsPerBar} transpose={capo} />
        </div>
      )}
    </div>
  );
}
