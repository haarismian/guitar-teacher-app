import { useMemo, useState } from 'react';
import { STYLES, type ChartBar, type StyleId } from '../audio/player';
import { PROGRESSIONS, buildProgressionChart, progressionKeyTonality } from '../data/progressions';
import { chordToneClasses } from '../music/chords';
import { ALL_KEYS, SCALES, keyShortName, mod12, noteName, parseKey, soloAdvice, usesFlats, type ScaleId } from '../music/theory';
import ChartPlayer from './ChartPlayer';
import Fretboard from './Fretboard';

interface Props {
  initialKey?: string;
  initialProgression?: string;
  initialBpm?: number;
  initialBox?: number;
  initialScale?: ScaleId;
}

export default function JamPanel({ initialKey = 'Am', initialProgression, initialBpm, initialBox = 1, initialScale }: Props) {
  const initKey = parseKey(initialKey) ?? { root: 9, tonality: 'minor' as const };
  const [root, setRoot] = useState(initKey.root);
  const [progId, setProgId] = useState(
    initialProgression ?? (initKey.tonality === 'minor' ? 'aeolian-rock' : 'pop-axis'),
  );
  const prog = PROGRESSIONS.find((p) => p.id === progId) ?? PROGRESSIONS[0];
  const tonality = progressionKeyTonality(prog);
  const [bpm, setBpm] = useState(initialBpm ?? prog.defaultBpm);
  const [style, setStyle] = useState<StyleId>(prog.defaultStyle);
  const [scale, setScale] = useState<ScaleId>(initialScale ?? (tonality === 'minor' || prog.tonality === 'blues' ? 'minorPent' : 'majorPent'));
  const [box, setBox] = useState(initialBox);
  const [labels, setLabels] = useState<'intervals' | 'names'>('intervals');
  const [showChordTones, setShowChordTones] = useState(false);
  const [chord, setChord] = useState<string | null>(null);

  const key = { root, tonality };
  const flats = usesFlats(key);
  const chart = useMemo(() => buildProgressionChart(prog, key), [prog, root]); // eslint-disable-line
  const bars: ChartBar[] = useMemo(() => chart.map((chords) => ({ chords })), [chart]);

  const selectProg = (id: string) => {
    const p = PROGRESSIONS.find((x) => x.id === id)!;
    setProgId(id);
    setBpm(p.defaultBpm);
    setStyle(p.defaultStyle);
    setScale(p.tonality === 'major' ? 'majorPent' : 'minorPent');
  };

  const advice = soloAdvice(key, prog.tonality === 'blues');
  const minorRootForBox = scale === 'majorPent' ? mod12(root - 3) : root;
  const boxRootFret = (() => {
    let f = mod12(minorRootForBox - 4);
    return f;
  })();

  return (
    <div className="jam">
      <div className="card">
        <div className="grid-controls">
          <label>
            Key
            <select value={root} onChange={(e) => setRoot(+e.target.value)}>
              {ALL_KEYS.filter((k) => k.tonality === tonality).map((k) => (
                <option key={k.root} value={k.root}>
                  {keyShortName(k)}
                  {prog.tonality === 'blues' ? ' blues' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Progression
            <select value={progId} onChange={(e) => selectProg(e.target.value)}>
              <optgroup label="Minor">
                {PROGRESSIONS.filter((p) => p.tonality === 'minor').map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
              <optgroup label="Major">
                {PROGRESSIONS.filter((p) => p.tonality === 'major').map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
              <optgroup label="Blues">
                {PROGRESSIONS.filter((p) => p.tonality === 'blues').map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            </select>
          </label>
          <label>
            Groove
            <select value={style} onChange={(e) => setStyle(e.target.value as StyleId)}>
              {Object.values(STYLES).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label>
            Tempo: {bpm}
            <input type="range" min={50} max={180} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
          </label>
        </div>
        <p className="muted small">{prog.description}</p>
        <ChartPlayer bars={bars} bpm={bpm} style={style} onChord={setChord} showDiagrams={false} allowStyleChange={false} instruments={{ guitar: true }} />
      </div>

      <div className="card">
        <div className="row wrap gap">
          <label>
            Scale
            <select value={scale} onChange={(e) => setScale(e.target.value as ScaleId)}>
              {(['minorPent', 'majorPent', 'blues', 'major', 'minor', 'dorian', 'mixolydian'] as ScaleId[]).map((s) => (
                <option key={s} value={s}>
                  {noteName(root, flats)} {SCALES[s].name}
                </option>
              ))}
            </select>
          </label>
          <div className="seg">
            {[0, 1, 2, 3, 4, 5].map((b) => (
              <button key={b} className={box === b ? 'on' : ''} onClick={() => setBox(b)}>
                {b === 0 ? 'All' : `Box ${b}`}
              </button>
            ))}
          </div>
          <div className="seg">
            <button className={labels === 'intervals' ? 'on' : ''} onClick={() => setLabels('intervals')}>Intervals</button>
            <button className={labels === 'names' ? 'on' : ''} onClick={() => setLabels('names')}>Notes</button>
          </div>
          <button className={`chip ${showChordTones ? 'on' : ''}`} onClick={() => setShowChordTones(!showChordTones)}>
            ✨ Show chord tones
          </button>
        </div>
        <Fretboard
          root={root}
          scale={scale}
          box={box || undefined}
          labels={labels}
          flats={flats}
          chordTones={showChordTones && chord ? chordToneClasses(chord) : undefined}
        />
        <div className="advice">
          <p>
            <strong>Box 1 starts at fret {boxRootFret === 0 ? '0 (open) or 12' : boxRootFret}</strong> on the low E string
            {scale === 'majorPent' && ` (the ${noteName(minorRootForBox, flats)} minor shape — major roots are highlighted)`}.
            {showChordTones && chord && (
              <>
                {' '}Now playing <strong>{chord}</strong> — ringed notes are its chord tones.
              </>
            )}
          </p>
          <ul>
            {advice.map((a) => (
              <li key={a.label}>
                <strong>{a.label}</strong> — {a.tips[0]}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
