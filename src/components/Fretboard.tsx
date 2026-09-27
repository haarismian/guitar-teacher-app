import { useMemo, type ReactElement } from 'react';
import {
  STANDARD_TUNING,
  intervalName,
  mod12,
  noteName,
  pentatonicBox,
  scalePitchClasses,
  type FretPos,
  type ScaleId,
} from '../music/theory';

export interface FretboardProps {
  root: number; // tonic pitch class of the scale
  scale: ScaleId;
  box?: number; // 1-5 highlights a pentatonic box; 0/undefined = whole neck
  labels?: 'names' | 'intervals' | 'none';
  chordTones?: number[]; // pitch classes to ring
  flats?: boolean;
  maxFret?: number;
  highlight?: FretPos[]; // explicit positions (e.g. current lick note)
  compact?: boolean;
  preferHigh?: boolean; // draw low boxes an octave up when they fit
}

const INLAYS = [3, 5, 7, 9, 15, 17];

export default function Fretboard({ root, scale, box, labels = 'intervals', chordTones, flats, maxFret = 17, highlight, compact, preferHigh }: FretboardProps) {
  const pcs = useMemo(() => new Set(scalePitchClasses(root, scale)), [root, scale]);
  const bluePc = scale === 'blues' ? mod12(root + 6) : null;

  // Boxes are defined on the minor pentatonic; for major pentatonic use the relative minor.
  const boxSet = useMemo(() => {
    if (!box) return null;
    const minorRoot = scale === 'majorPent' || scale === 'major' || scale === 'mixolydian' ? mod12(root - 3) : root;
    let positions = pentatonicBox(minorRoot, box - 1, maxFret);
    if (preferHigh && Math.min(...positions.map((p) => p.fret)) < 5 && Math.max(...positions.map((p) => p.fret)) + 12 <= maxFret) {
      positions = positions.map((p) => ({ ...p, fret: p.fret + 12 }));
    }
    const set = new Set(positions.map((p) => `${p.string}:${p.fret}`));
    // include extra scale tones (e.g. blue note) that fall inside the box span
    const lo = Math.min(...positions.map((p) => p.fret));
    const hi = Math.max(...positions.map((p) => p.fret));
    for (let s = 0; s < 6; s++) {
      for (let f = lo; f <= hi; f++) {
        const pc = mod12(STANDARD_TUNING[s] + f);
        if (pcs.has(pc) && !scalePitchClasses(minorRoot, 'minorPent').includes(pc)) set.add(`${s}:${f}`);
      }
    }
    return { set, lo, hi };
  }, [box, root, scale, maxFret, pcs, preferHigh]);

  const hl = new Set((highlight ?? []).map((p) => `${p.string}:${p.fret}`));
  const chordSet = new Set(chordTones ?? []);

  const fretW = compact ? 50 : 56;
  const stringGap = compact ? 32 : 36;
  const left = 52;
  const top = 20;
  const width = left + fretW * (maxFret + 0.5) + 10;
  const height = top + stringGap * 5 + 40;
  const fretX = (f: number) => (f === 0 ? left - 22 : left + (f - 0.5) * fretW);
  const stringY = (s: number) => top + (5 - s) * stringGap;

  const notes: ReactElement[] = [];
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= maxFret; f++) {
      const pc = mod12(STANDARD_TUNING[s] + f);
      const key = `${s}:${f}`;
      const isHl = hl.has(key);
      if (!pcs.has(pc) && !isHl) continue;
      const inBox = !boxSet || boxSet.set.has(key);
      const isRoot = pc === root;
      const isBlue = pc === bluePc;
      const isChord = chordSet.has(pc);
      const cls = ['fb-note', isRoot ? 'root' : '', isBlue ? 'blue' : '', inBox ? '' : 'dim', isChord ? 'chord' : '', isHl ? 'hl' : ''].join(' ');
      const label = labels === 'names' ? noteName(pc, flats) : labels === 'intervals' ? intervalName(root, pc) : '';
      notes.push(
        <g key={key} className={cls} transform={`translate(${fretX(f)},${stringY(s)})`}>
          {isChord && inBox && <circle r={18.5} className="chord-ring" />}
          <circle r={15} />
          {label && (
            <text dy="0.35em" textAnchor="middle">
              {label}
            </text>
          )}
        </g>,
      );
    }
  }

  return (
    <div className="fretboard-wrap">
      <svg className="fretboard" viewBox={`0 0 ${width} ${height}`} style={{ minWidth: compact ? 640 : 760 }} role="img" aria-label="Fretboard">
        {boxSet && (
          <rect
            x={left + (Math.max(boxSet.lo, 1) - 1) * fretW - (boxSet.lo === 0 ? 40 : 0)}
            y={top - 14}
            width={(boxSet.hi - Math.max(boxSet.lo, 1) + 1) * fretW + (boxSet.lo === 0 ? 40 : 0)}
            height={stringGap * 5 + 28}
            rx={10}
            className="fb-box"
          />
        )}
        {/* nut */}
        <rect x={left - 4} y={top} width={5} height={stringGap * 5} className="fb-nut" />
        {Array.from({ length: maxFret }, (_, i) => (
          <line key={i} x1={left + (i + 1) * fretW} x2={left + (i + 1) * fretW} y1={top} y2={top + stringGap * 5} className="fb-fret" />
        ))}
        {INLAYS.filter((f) => f <= maxFret).map((f) => (
          <circle key={f} cx={left + (f - 0.5) * fretW} cy={top + stringGap * 2.5} r={5} className="fb-inlay" />
        ))}
        {maxFret >= 12 && (
          <>
            <circle cx={left + 11.5 * fretW} cy={top + stringGap * 1.5} r={5} className="fb-inlay" />
            <circle cx={left + 11.5 * fretW} cy={top + stringGap * 3.5} r={5} className="fb-inlay" />
          </>
        )}
        {Array.from({ length: 6 }, (_, s) => (
          <line key={s} x1={left} x2={width - 10} y1={stringY(s)} y2={stringY(s)} className="fb-string" strokeWidth={1 + (5 - s) * 0.35} />
        ))}
        {Array.from({ length: maxFret + 1 }, (_, f) =>
          f === 0 ? null : (
            <text key={f} x={left + (f - 0.5) * fretW} y={height - 6} textAnchor="middle" className="fb-fretnum">
              {f}
            </text>
          ),
        )}
        {['E', 'A', 'D', 'G', 'B', 'e'].map((n, s) => (
          <text key={n} x={2} y={stringY(s)} dy="0.35em" className="fb-strname">
            {n}
          </text>
        ))}
        {notes}
      </svg>
    </div>
  );
}
