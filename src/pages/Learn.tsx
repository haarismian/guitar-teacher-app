import { Link, useParams } from 'react-router-dom';
import ActivityView, { activityLabel } from '../components/ActivityView';
import { ALL_LESSONS, CURRICULUM, findLesson, lessonLevel } from '../data/curriculum';
import { nextLesson } from '../data/sessionPlanner';
import { setLessonComplete, toggleChecklist, useAppState } from '../store/store';

export function Curriculum() {
  const s = useAppState();
  const next = nextLesson(s);
  return (
    <div className="page">
      <h1>Curriculum</h1>
      <p className="muted">
        Six levels from rhythm basics to soloing across the neck. Complete a lesson by ticking its checklist. Practice sessions always pick up from your next lesson.
      </p>
      {CURRICULUM.map((level) => {
        const done = level.lessons.filter((l) => s.completedLessons[l.id]).length;
        return (
          <section key={level.id} className="card level">
            <div className="row between wrap">
              <div>
                <span className="eyebrow">Level {level.id}</span>
                <h2>{level.title}</h2>
                <p className="muted">{level.goal}</p>
              </div>
              <div className="level-count">
                {done}/{level.lessons.length}
              </div>
            </div>
            <div className="progress">
              <div style={{ width: `${(done / level.lessons.length) * 100}%` }} />
            </div>
            <ul className="lesson-list">
              {level.lessons.map((l) => {
                const isDone = !!s.completedLessons[l.id];
                const isNext = l.id === next.id && !isDone;
                return (
                  <li key={l.id} className={`${isDone ? 'done' : ''} ${isNext ? 'next' : ''}`}>
                    <Link to={`/learn/${l.id}`}>
                      <span className="lesson-check">{isDone ? '✓' : isNext ? '▶' : '○'}</span>
                      <span className="lesson-title">{l.title}</span>
                      <span className="muted small">
                        {l.focus} · {l.minutes} min
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function LessonPage() {
  const { id } = useParams();
  const s = useAppState();
  const lesson = id ? findLesson(id) : undefined;
  if (!lesson) return <div className="page">Lesson not found.</div>;
  const level = lessonLevel(lesson.id)!;
  const idx = ALL_LESSONS.indexOf(lesson);
  const prev = ALL_LESSONS[idx - 1];
  const next = ALL_LESSONS[idx + 1];
  const checks = s.checklist[lesson.id] ?? [];
  const done = !!s.completedLessons[lesson.id];

  return (
    <div className="page">
      <Link to="/learn" className="back">← Curriculum</Link>
      <span className="eyebrow">
        Level {level.id}: {level.title} · {lesson.focus} · ~{lesson.minutes} min
      </span>
      <h1>{lesson.title}</h1>
      <p className="lead">{lesson.summary}</p>

      <div className="card">
        <h3>Steps</h3>
        <ol className="steps">
          {lesson.steps.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </div>

      {lesson.activities.map((a, i) => (
        <div key={i} className="card">
          <span className="eyebrow">{activityLabel(a)}</span>
          <ActivityView activity={a} />
        </div>
      ))}

      <div className={`card checklist ${done ? 'complete' : ''}`}>
        <h3>{done ? '✓ Lesson complete' : 'Checklist — tick when you can do it'}</h3>
        {lesson.checklist.map((c, i) => (
          <label key={i} className="check">
            <input type="checkbox" checked={!!checks[i]} onChange={() => toggleChecklist(lesson.id, i, lesson.checklist.length)} />
            {c}
          </label>
        ))}
        <div className="row gap wrap">
          {!done && (
            <button className="btn" onClick={() => setLessonComplete(lesson.id, true, lesson.checklist.length)}>
              I already know this — mark complete
            </button>
          )}
          {done && (
            <button className="btn ghost" onClick={() => setLessonComplete(lesson.id, false, lesson.checklist.length)}>
              Mark as not done
            </button>
          )}
        </div>
      </div>

      <div className="row between">
        {prev ? <Link className="btn" to={`/learn/${prev.id}`}>← {prev.title}</Link> : <span />}
        {next ? <Link className="btn" to={`/learn/${next.id}`}>{next.title} →</Link> : <span />}
      </div>
    </div>
  );
}
