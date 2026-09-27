import { Link } from 'react-router-dom';
import { getContext, strum, unlockAudio } from '../audio/engine';
import type { Activity } from '../data/curriculum';
import { LICKS } from '../data/licks';
import { findSong, songBars } from '../data/songLookup';
import { chordMidiNotes } from '../music/chords';
import { useAppState } from '../store/store';
import ChangesTrainer from './ChangesTrainer';
import ChartPlayer from './ChartPlayer';
import ChordDiagram from './ChordDiagram';
import JamPanel from './JamPanel';
import LickPlayer from './LickPlayer';
import Metronome from './Metronome';
import Tuner from './Tuner';

export async function strumChord(symbol: string) {
  await unlockAudio();
  strum(chordMidiNotes(symbol), getContext().currentTime + 0.02, { duration: 2.5, gain: 0.3 });
}

export function ChordGrid({ chords }: { chords: string[] }) {
  return (
    <div className="diagram-row">
      {chords.map((c) => (
        <button key={c} className="diagram-btn" onClick={() => strumChord(c)} title="Tap to hear">
          <ChordDiagram symbol={c} size={1.2} />
        </button>
      ))}
    </div>
  );
}

export default function ActivityView({ activity }: { activity: Activity }) {
  const state = useAppState();
  switch (activity.type) {
    case 'song': {
      const song = findSong(state, activity.songId);
      if (!song) return <p>Song not found.</p>;
      return (
        <div>
          <div className="row between wrap">
            <h4>
              {song.title} <span className="muted">— {song.artist}</span>
            </h4>
            <Link className="btn small" to={`/songs/${song.id}`}>Open song page →</Link>
          </div>
          {song.capo ? <p className="pill warn">Capo {song.capo} — chords shown are shapes</p> : null}
          <ChartPlayer bars={songBars(song)} bpm={song.bpm} style={song.style} strum={song.strum} beatsPerBar={song.beatsPerBar} transpose={song.capo ?? 0} instruments={{ guitar: false }} />
        </div>
      );
    }
    case 'lick': {
      const lick = LICKS.find((l) => l.id === activity.lickId);
      if (!lick) return <p>Lick not found.</p>;
      return (
        <div>
          <div className="row between wrap">
            <h4>{lick.name}</h4>
            <Link className="btn small" to={`/licks/${lick.id}`}>Open lick page →</Link>
          </div>
          <p className="muted">{lick.description}</p>
          <LickPlayer lick={lick} />
        </div>
      );
    }
    case 'jam':
      return (
        <JamPanel
          key={`${activity.key}-${activity.progression}-${activity.box}-${activity.scale}`}
          initialKey={activity.key}
          initialProgression={activity.progression}
          initialBpm={activity.bpm}
          initialBox={activity.box}
          initialScale={activity.scale}
        />
      );
    case 'metronome':
      return <Metronome initialBpm={activity.bpm} exercise="box1" />;
    case 'chords':
      return (
        <div>
          <p className="muted small">Tap a chord to hear it.</p>
          <ChordGrid chords={activity.chords} />
        </div>
      );
    case 'changes':
      return <ChangesTrainer chords={activity.chords} bpm={activity.bpm} />;
    case 'tuner':
      return <Tuner />;
    case 'addSong':
      return (
        <div className="card inner">
          <p>Find a song on Chordify, then add its chords here.</p>
          <Link className="btn primary" to="/songs/new">+ Add a song</Link>
        </div>
      );
  }
}

export function activityLabel(a: Activity): string {
  switch (a.type) {
    case 'song':
      return 'Play-along';
    case 'lick':
      return 'Lick';
    case 'jam':
      return `Jam in ${a.key}`;
    case 'metronome':
      return 'Metronome';
    case 'chords':
      return 'Chord shapes';
    case 'changes':
      return `Changes ${a.chords.join('↔')}`;
    case 'tuner':
      return 'Tuner';
    case 'addSong':
      return 'Add a song';
  }
}
