import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CURRICULUM } from '../data/curriculum';
import { LICKS } from '../data/licks';
import { allSongs } from '../data/songLookup';
import {
  currentStreak,
  deleteSession,
  exportState,
  importState,
  localDay,
  minutesByDay,
  minutesThisWeek,
  resetState,
  totalMinutes,
  updateSettings,
  useAppState,
  type TempoEntry,
} from '../store/store';

function exerciseLabel(ex: string) {
  if (ex === 'box1') return 'Pentatonic box / metronome exercise (BPM)';
  if (ex.startsWith('changes:')) return `Chord changes ${ex.slice(8).replace('-', ' ↔ ')} (per minute)`;
  if (ex.startsWith('lick:')) return `Lick: ${LICKS.find((l) => l.id === ex.slice(5))?.name ?? ex}`;
  return ex;
}

function Heatmap({ days }: { days: Record<string, number> }) {
  const weeks = 16;
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7);
  const cells = [];
  const cell = 16;
  const gap = 3;
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      if (date > today) continue;
      const k = localDay(date);
      const m = days[k] ?? 0;
      const lvl = m === 0 ? 0 : m < 10 ? 1 : m < 20 ? 2 : m < 40 ? 3 : 4;
      cells.push(
        <rect key={k} x={w * (cell + gap) + 28} y={d * (cell + gap)} width={cell} height={cell} rx={3} className={`hm hm${lvl}`}>
          <title>
            {date.toDateString()}: {m} min
          </title>
        </rect>,
      );
    }
  }
  return (
    <div className="heatmap-wrap">
      <svg viewBox={`0 0 ${28 + weeks * (cell + gap)} ${7 * (cell + gap)}`} className="heatmap" role="img" aria-label="Practice calendar">
        {['M', '', 'W', '', 'F', '', 'S'].map((l, i) => (
          <text key={i} x={0} y={i * (cell + gap) + cell - 3} className="hm-label">
            {l}
          </text>
        ))}
        {cells}
      </svg>
      <div className="row gap small muted hm-legend">
        Less <span className="hm-swatch hm0" /> <span className="hm-swatch hm1" /> <span className="hm-swatch hm2" /> <span className="hm-swatch hm3" /> <span className="hm-swatch hm4" /> More
      </div>
    </div>
  );
}

function TempoChart({ entries }: { entries: TempoEntry[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 320;
  const h = 110;
  const pad = { l: 34, r: 10, t: 10, b: 20 };
  const vals = entries.map((e) => e.value);
  const min = Math.min(...vals) * 0.9;
  const max = Math.max(...vals) * 1.05;
  const x = (i: number) => pad.l + (entries.length === 1 ? (w - pad.l - pad.r) / 2 : (i / (entries.length - 1)) * (w - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (h - pad.t - pad.b);
  const path = entries.map((e, i) => `${i ? 'L' : 'M'}${x(i)},${y(e.value)}`).join(' ');
  const last = entries[entries.length - 1];
  const hv = hover !== null ? entries[hover] : null;
  return (
    <div className="tempo-chart">
      <svg viewBox={`0 0 ${w} ${h}`} onMouseLeave={() => setHover(null)}>
        <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className="axis" />
        <text x={pad.l - 4} y={y(Math.max(...vals))} dy="0.35em" textAnchor="end" className="axis-label">
          {Math.max(...vals)}
        </text>
        <text x={pad.l - 4} y={y(Math.min(...vals))} dy="0.35em" textAnchor="end" className="axis-label">
          {Math.min(...vals)}
        </text>
        <path d={path} className="line" />
        {entries.map((e, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(e.value)} r={4} className={`dot ${hover === i ? 'on' : ''}`} />
            <rect
              x={x(i) - 12}
              y={pad.t}
              width={24}
              height={h - pad.t - pad.b}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onTouchStart={() => setHover(i)}
            />
          </g>
        ))}
        <text x={x(entries.length - 1)} y={y(last.value) - 9} textAnchor="end" className="direct-label">
          {last.value}
        </text>
      </svg>
      <div className="muted small tempo-tip">
        {hv ? `${new Date(hv.date).toLocaleDateString()}: ${hv.value}` : `Latest ${last.value} · best ${Math.max(...vals)} · ${entries.length} entries`}
      </div>
    </div>
  );
}

export default function Progress() {
  const s = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);
  const days = minutesByDay(s);
  const byExercise: Record<string, TempoEntry[]> = {};
  for (const t of s.tempo) (byExercise[t.exercise] ??= []).push(t);
  const songs = allSongs(s).filter((x) => (s.songStatus[x.id] ?? 'none') !== 'none');
  const licksTouched = LICKS.filter((l) => (s.lickStatus[l.id] ?? 'new') !== 'new');

  const download = () => {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `guitar-progress-${localDay(new Date())}.json`;
    a.click();
  };

  return (
    <div className="page">
      <h1>Progress</h1>
      <div className="stats-row">
        <div className="stat card">
          <span className="stat-num">🔥 {currentStreak(s)}</span>
          <span className="muted">day streak</span>
        </div>
        <div className="stat card">
          <span className="stat-num">{minutesThisWeek(s)}</span>
          <span className="muted">min this week (goal {s.settings.weeklyGoalMinutes})</span>
        </div>
        <div className="stat card">
          <span className="stat-num">{s.sessions.length}</span>
          <span className="muted">sessions</span>
        </div>
        <div className="stat card">
          <span className="stat-num">{Math.round((totalMinutes(s) / 60) * 10) / 10}h</span>
          <span className="muted">total</span>
        </div>
      </div>

      <div className="card">
        <h3>Practice calendar</h3>
        <Heatmap days={days} />
      </div>

      <div className="card">
        <h3>Curriculum</h3>
        {CURRICULUM.map((lv) => {
          const done = lv.lessons.filter((l) => s.completedLessons[l.id]).length;
          return (
            <div key={lv.id} className="level-progress">
              <div className="row between">
                <span>
                  Level {lv.id}: {lv.title}
                </span>
                <span className="muted">
                  {done}/{lv.lessons.length}
                </span>
              </div>
              <div className="progress">
                <div style={{ width: `${(done / lv.lessons.length) * 100}%` }} />
              </div>
            </div>
          );
        })}
        <Link to="/learn" className="btn small">Open curriculum →</Link>
      </div>

      <div className="card">
        <h3>Speed & skill tracking</h3>
        {Object.keys(byExercise).length === 0 ? (
          <p className="muted">
            Nothing logged yet. Use "Log BPM as my best" on the metronome, or "Save result" after one-minute chord changes, and your improvement shows up here.
          </p>
        ) : (
          <div className="tempo-grid">
            {Object.entries(byExercise).map(([ex, entries]) => (
              <div key={ex} className="card inner">
                <h4>{exerciseLabel(ex)}</h4>
                <TempoChart entries={entries} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Licks</h3>
          {licksTouched.length === 0 && <p className="muted">No licks rated yet.</p>}
          {licksTouched.map((l) => (
            <div key={l.id} className="row between status-row">
              <Link to={`/licks/${l.id}`}>{l.name}</Link>
              <span className={`status ${s.lickStatus[l.id]}`}>{s.lickStatus[l.id]}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Songs</h3>
          {songs.length === 0 && <p className="muted">No songs marked yet.</p>}
          {songs.map((x) => (
            <div key={x.id} className="row between status-row">
              <Link to={`/songs/${x.id}`}>{x.title}</Link>
              <span className={`status ${s.songStatus[x.id]}`}>{s.songStatus[x.id] === 'can-play' ? 'can play' : s.songStatus[x.id]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Session log</h3>
        {s.sessions.length === 0 && <p className="muted">No sessions yet — start one from the home screen.</p>}
        <ul className="session-log">
          {[...s.sessions].reverse().slice(0, 30).map((x) => (
            <li key={x.id}>
              <div className="row between">
                <strong>
                  {new Date(x.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {x.minutes} min
                  {x.rating ? ` · ${['', '😣', '🙂', '🤩'][x.rating]}` : ''}
                </strong>
                <button className="linkish muted" onClick={() => confirm('Delete this session?') && deleteSession(x.id)}>
                  delete
                </button>
              </div>
              <span className="muted small">{x.items.join(' · ')}</span>
              {x.note && <div className="small">📝 {x.note}</div>}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Settings & backup</h3>
        <label>
          Weekly goal (minutes)
          <input type="number" min={10} max={2000} value={s.settings.weeklyGoalMinutes} onChange={(e) => updateSettings({ weeklyGoalMinutes: +e.target.value || 150 })} />
        </label>
        <p className="muted small">Your progress is saved on this device (in the browser). Export a backup to move it to another device.</p>
        <div className="row gap wrap">
          <button className="btn" onClick={download}>Export backup</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import backup</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const ok = importState(await f.text());
              alert(ok ? 'Backup imported!' : 'That file does not look like a backup.');
            }}
          />
          <button className="btn ghost" onClick={() => confirm('Erase ALL progress? This cannot be undone.') && resetState()}>
            Reset everything
          </button>
        </div>
      </div>
    </div>
  );
}
