import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getContext, playPluck, unlockAudio } from '../audio/engine';
import ActivityView from '../components/ActivityView';
import { findLesson } from '../data/curriculum';
import { LICKS } from '../data/licks';
import { buildSession, itemKeyForSegment, type Emphasis, type SessionPlan } from '../data/sessionPlanner';
import { findSong } from '../data/songLookup';
import {
  bumpPractice,
  logSession,
  setLickStatus,
  setSongStatus,
  toggleChecklist,
  useAppState,
  type LickStatus,
  type SongStatus,
} from '../store/store';

const ACTIVE_KEY = 'guitar-teacher-active-session';

interface Active {
  plan: SessionPlan;
  index: number;
  elapsed: number[]; // seconds per segment
}

function loadActive(): Active | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as Active) : null;
  } catch {
    return null;
  }
}
function saveActive(a: Active | null) {
  try {
    if (a) localStorage.setItem(ACTIVE_KEY, JSON.stringify(a));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

const KIND_ICON: Record<string, string> = {
  warmup: '🔥',
  lesson: '📘',
  rhythm: '🎵',
  lick: '⚡',
  improv: '🎸',
  review: '😎',
};

function chime() {
  unlockAudio().then((c) => {
    const t = c.currentTime + 0.02;
    [76, 79, 84].forEach((m, i) => playPluck(m, t + i * 0.12, { gain: 0.3, duration: 1.2 }));
  });
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export default function Practice() {
  const s = useAppState();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [minutes, setMinutes] = useState(Number(params.get('min')) || s.settings.defaultMinutes);
  const [emphasis, setEmphasis] = useState<Emphasis>('balanced');
  const [active, setActive] = useState<Active | null>(loadActive);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const chimed = useRef<Set<number>>(new Set());

  const preview = useMemo(() => buildSession(s, minutes, emphasis), [s, minutes, emphasis]);

  useEffect(() => saveActive(active), [active]);

  // timer
  useEffect(() => {
    if (!running || !active) return;
    const id = window.setInterval(() => {
      setActive((a) => {
        if (!a) return a;
        const elapsed = [...a.elapsed];
        elapsed[a.index] = (elapsed[a.index] ?? 0) + 1;
        const seg = a.plan.segments[a.index];
        if (elapsed[a.index] === seg.minutes * 60 && !chimed.current.has(a.index)) {
          chimed.current.add(a.index);
          chime();
        }
        return { ...a, elapsed };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, active?.index]); // eslint-disable-line

  const start = async () => {
    await unlockAudio();
    getContext();
    chimed.current = new Set();
    setActive({ plan: preview, index: 0, elapsed: preview.segments.map(() => 0) });
    setRunning(true);
    setFinished(false);
  };

  const goto = (i: number) => {
    if (!active) return;
    const seg = active.plan.segments[active.index];
    const k = itemKeyForSegment(seg);
    if (k && (active.elapsed[active.index] ?? 0) > 30) bumpPractice(k);
    if (i >= active.plan.segments.length) {
      setRunning(false);
      setFinished(true);
      return;
    }
    setActive({ ...active, index: i });
  };

  if (finished && active) return <Finish active={active} onDone={() => { setActive(null); setFinished(false); nav('/progress'); }} />;

  if (!active) {
    return (
      <div className="page">
        <h1>Build today's session</h1>
        <div className="card">
          <div className="row wrap gap">
            <label>
              Time
              <div className="seg">
                {[10, 15, 20, 30, 45, 60].map((m) => (
                  <button key={m} className={minutes === m ? 'on' : ''} onClick={() => setMinutes(m)}>
                    {m}m
                  </button>
                ))}
              </div>
            </label>
            <label>
              Focus
              <div className="seg">
                {(['balanced', 'rhythm', 'lead'] as Emphasis[]).map((e) => (
                  <button key={e} className={emphasis === e ? 'on' : ''} onClick={() => setEmphasis(e)}>
                    {e === 'balanced' ? 'Balanced' : e === 'rhythm' ? 'Songs & rhythm' : 'Soloing'}
                  </button>
                ))}
              </div>
            </label>
          </div>
        </div>
        <div className="card">
          <h2>
            Your {minutes}-minute plan <span className="muted">· {preview.focus}</span>
          </h2>
          <ol className="plan-list">
            {preview.segments.map((seg, i) => (
              <li key={i}>
                <span className="plan-icon">{KIND_ICON[seg.kind]}</span>
                <span className="plan-title">{seg.title}</span>
                <span className="plan-min">{seg.minutes} min</span>
              </li>
            ))}
          </ol>
          {emphasis === 'lead' && preview.segments.every((x) => x.kind !== 'lick') && (
            <p className="muted small">Soloing blocks unlock at Level 3 — finish the rhythm levels (or mark them done in Learn) to get lead practice.</p>
          )}
          <button className="btn primary big" onClick={start}>
            ▶ Start session
          </button>
        </div>
      </div>
    );
  }

  const seg = active.plan.segments[active.index];
  const el = active.elapsed[active.index] ?? 0;
  const target = seg.minutes * 60;
  const remaining = target - el;
  const totalEl = active.elapsed.reduce((a, b) => a + b, 0);
  const lesson = seg.lessonId ? findLesson(seg.lessonId) : null;

  return (
    <div className="page session">
      <div className="session-top card">
        <div className="seg-progress">
          {active.plan.segments.map((x, i) => (
            <button
              key={i}
              className={`seg-pill ${i === active.index ? 'on' : ''} ${i < active.index ? 'done' : ''}`}
              onClick={() => goto(i)}
              title={x.title}
            >
              {KIND_ICON[x.kind]}
            </button>
          ))}
        </div>
        <div className="row between wrap">
          <div>
            <span className="eyebrow">
              Step {active.index + 1} of {active.plan.segments.length} · {seg.minutes} min
            </span>
            <h2>{seg.title}</h2>
          </div>
          <div className="session-timer">
            <span className={`timer-big ${remaining < 0 ? 'over' : ''}`}>{remaining >= 0 ? fmt(remaining) : `+${fmt(-remaining)}`}</span>
            <span className="muted small">total {fmt(totalEl)}</span>
          </div>
        </div>
        <div className="progress">
          <div style={{ width: `${Math.min(100, (el / target) * 100)}%` }} />
        </div>
        <div className="row wrap gap">
          <button className="btn" onClick={() => setRunning(!running)}>
            {running ? '⏸ Pause timer' : '▶ Resume timer'}
          </button>
          {active.index > 0 && (
            <button className="btn" onClick={() => goto(active.index - 1)}>
              ← Back
            </button>
          )}
          <button className="btn primary" onClick={() => goto(active.index + 1)}>
            {active.index === active.plan.segments.length - 1 ? 'Finish session ✓' : 'Next step →'}
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              if (confirm('End this session? Your time so far will be kept.')) {
                setRunning(false);
                setFinished(true);
              }
            }}
          >
            End early
          </button>
        </div>
      </div>

      <div className="card">
        <h3>What to do</h3>
        <ol className="steps">
          {seg.instructions.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
        {lesson && (
          <p className="small">
            <Link to={`/learn/${lesson.id}`}>Full lesson page →</Link>
          </p>
        )}
      </div>

      {lesson && lesson.activities.length > 1 && (
        <div className="card">
          <h3>Lesson activities</h3>
          {lesson.activities.map((a, i) => (
            <div key={i} className="activity-block">
              <ActivityView activity={a} />
            </div>
          ))}
        </div>
      )}
      {(!lesson || lesson.activities.length <= 1) && seg.activity && (
        <div className="card">
          <ActivityView activity={seg.activity} />
        </div>
      )}
    </div>
  );
}

function Finish({ active, onDone }: { active: Active; onDone: () => void }) {
  const s = useAppState();
  const [rating, setRating] = useState<1 | 2 | 3 | undefined>();
  const [note, setNote] = useState('');
  const totalSec = active.elapsed.reduce((a, b) => a + b, 0);
  const minutes = Math.max(1, Math.round(totalSec / 60));
  const lesson = active.plan.lessonId ? findLesson(active.plan.lessonId) : null;
  const lickIds = active.plan.segments.map((x) => x.lickId ?? (x.activity?.type === 'lick' ? x.activity.lickId : null)).filter(Boolean) as string[];
  if (lesson) lesson.activities.forEach((a) => a.type === 'lick' && !lickIds.includes(a.lickId) && lickIds.push(a.lickId));
  const songIds = active.plan.segments.map((x) => x.songId ?? (x.activity?.type === 'song' ? x.activity.songId : null)).filter(Boolean) as string[];
  if (lesson) lesson.activities.forEach((a) => a.type === 'song' && !songIds.includes(a.songId) && songIds.push(a.songId));

  const save = () => {
    logSession({
      minutes,
      plannedMinutes: active.plan.minutes,
      items: active.plan.segments.filter((_, i) => active.elapsed[i] > 20).map((x) => x.title),
      lessonId: active.plan.lessonId,
      rating,
      note: note || undefined,
    });
    onDone();
  };

  return (
    <div className="page">
      <div className="card hero">
        <h1>🎉 Session complete!</h1>
        <p>
          You practised <strong>{minutes} minutes</strong>. Nice work.
        </p>
      </div>
      {lesson && (
        <div className="card">
          <h3>Lesson check: {lesson.title}</h3>
          <p className="muted small">Tick what you can do now. When everything is ticked, the lesson is complete and you move on.</p>
          {lesson.checklist.map((c, i) => (
            <label key={i} className="check">
              <input type="checkbox" checked={!!s.checklist[lesson.id]?.[i]} onChange={() => toggleChecklist(lesson.id, i, lesson.checklist.length)} />
              {c}
            </label>
          ))}
        </div>
      )}
      {lickIds.length > 0 && (
        <div className="card">
          <h3>How are these licks going?</h3>
          {lickIds.map((id) => {
            const lick = LICKS.find((l) => l.id === id);
            if (!lick) return null;
            return (
              <div key={id} className="row between wrap status-row">
                <span>{lick.name}</span>
                <div className="seg">
                  {(['learning', 'comfortable', 'mastered'] as LickStatus[]).map((st) => (
                    <button key={st} className={s.lickStatus[id] === st ? 'on' : ''} onClick={() => setLickStatus(id, st)}>
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {songIds.length > 0 && (
        <div className="card">
          <h3>Songs</h3>
          {songIds.map((id) => {
            const song = findSong(s, id);
            if (!song) return null;
            return (
              <div key={id} className="row between wrap status-row">
                <span>{song.title}</span>
                <div className="seg">
                  {(['learning', 'can-play', 'mastered'] as SongStatus[]).map((st) => (
                    <button key={st} className={s.songStatus[id] === st ? 'on' : ''} onClick={() => setSongStatus(id, st)}>
                      {st === 'can-play' ? 'can play' : st}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="card">
        <h3>How did it feel?</h3>
        <div className="seg">
          {([1, 2, 3] as const).map((r) => (
            <button key={r} className={rating === r ? 'on' : ''} onClick={() => setRating(r)}>
              {r === 1 ? '😣 Tough' : r === 2 ? '🙂 Good' : '🤩 Great'}
            </button>
          ))}
        </div>
        <textarea placeholder="Notes for next time (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        <button className="btn primary big" onClick={save}>
          Save session
        </button>
      </div>
    </div>
  );
}
