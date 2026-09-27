import { Link, useNavigate } from 'react-router-dom';
import { CURRICULUM } from '../data/curriculum';
import { currentLevel, nextLesson } from '../data/sessionPlanner';
import { currentStreak, minutesThisWeek, totalMinutes, updateSettings, useAppState } from '../store/store';

const DURATIONS = [10, 15, 20, 30, 45, 60];

export default function Home() {
  const s = useAppState();
  const nav = useNavigate();
  const lesson = nextLesson(s);
  const level = currentLevel(s);
  const doneInLevel = level.lessons.filter((l) => s.completedLessons[l.id]).length;
  const totalLessons = CURRICULUM.reduce((a, l) => a + l.lessons.length, 0);
  const done = Object.keys(s.completedLessons).length;
  const week = minutesThisWeek(s);
  const weekPct = Math.min(100, Math.round((week / s.settings.weeklyGoalMinutes) * 100));

  return (
    <div className="page home">
      <section className="hero card">
        <h1>Ready to practise?</h1>
        <p className="muted">Pick how long you have. I'll build a structured lesson from where you are in the curriculum.</p>
        <div className="duration-grid">
          {DURATIONS.map((m) => (
            <button
              key={m}
              className={`duration ${s.settings.defaultMinutes === m ? 'on' : ''}`}
              onClick={() => {
                updateSettings({ defaultMinutes: m });
                nav(`/practice?min=${m}`);
              }}
            >
              <span className="num">{m}</span>
              <span className="unit">min</span>
            </button>
          ))}
        </div>
      </section>

      <div className="stats-row">
        <div className="stat card">
          <span className="stat-num">🔥 {currentStreak(s)}</span>
          <span className="muted">day streak</span>
        </div>
        <div className="stat card">
          <span className="stat-num">{week}</span>
          <span className="muted">min this week</span>
          <div className="progress">
            <div style={{ width: `${weekPct}%` }} />
          </div>
          <span className="muted small">goal {s.settings.weeklyGoalMinutes} min</span>
        </div>
        <div className="stat card">
          <span className="stat-num">
            {done}/{totalLessons}
          </span>
          <span className="muted">lessons done</span>
          <div className="progress">
            <div style={{ width: `${(done / totalLessons) * 100}%` }} />
          </div>
        </div>
        <div className="stat card">
          <span className="stat-num">{Math.round(totalMinutes(s) / 60 * 10) / 10}h</span>
          <span className="muted">total practice</span>
        </div>
      </div>

      <section className="card">
        <div className="row between wrap">
          <div>
            <span className="eyebrow">
              Level {level.id}: {level.title} · {doneInLevel}/{level.lessons.length}
            </span>
            <h2>Up next: {lesson.title}</h2>
            <p className="muted">{lesson.summary}</p>
          </div>
          <Link className="btn primary" to={`/learn/${lesson.id}`}>
            Open lesson →
          </Link>
        </div>
      </section>

      <div className="quick-grid">
        <Link to="/songs" className="quick card">
          <span className="icon">🎵</span>
          <strong>Songs</strong>
          <span className="muted small">Strum along with backing tracks, add songs from Chordify</span>
        </Link>
        <Link to="/jam" className="quick card">
          <span className="icon">🎸</span>
          <strong>Jam & solo</strong>
          <span className="muted small">Backing tracks in any key with the pentatonic on the neck</span>
        </Link>
        <Link to="/licks" className="quick card">
          <span className="icon">⚡</span>
          <strong>Licks</strong>
          <span className="muted small">Learn licks in any key and build solos</span>
        </Link>
        <Link to="/tools" className="quick card">
          <span className="icon">🧰</span>
          <strong>Tools</strong>
          <span className="muted small">Tuner, metronome, key finder, chord library</span>
        </Link>
      </div>
    </div>
  );
}
