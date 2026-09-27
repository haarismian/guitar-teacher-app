import { voicingFor } from '../music/chords';

interface Props {
  symbol: string;
  label?: string;
  size?: number;
  active?: boolean;
}

export default function ChordDiagram({ symbol, label, size = 1, active }: Props) {
  const v = voicingFor(symbol);
  const w = 100 * size;
  const h = 124 * size;
  if (!v) {
    return (
      <div className={`chord-diagram ${active ? 'active' : ''}`} style={{ width: w }}>
        <div className="chord-name">{label ?? symbol}</div>
        <div className="chord-missing">no diagram</div>
      </div>
    );
  }
  const frets = 4;
  const x0 = 18;
  const y0 = 22;
  const sw = 64 / 5;
  const fh = 80 / frets;
  const sx = (s: number) => x0 + s * sw;
  const fy = (f: number) => y0 + (f - v.baseFret + 0.5) * fh;
  return (
    <div className={`chord-diagram ${active ? 'active' : ''}`} style={{ width: w }}>
      <div className="chord-name">{label ?? symbol}</div>
      <svg viewBox="0 0 100 110" width={w} height={h * 0.88}>
        {v.baseFret === 1 ? (
          <rect x={x0 - 1} y={y0 - 4} width={64 + 2} height={4} className="cd-nut" />
        ) : (
          <text x={x0 - 6} y={y0 + fh * 0.6} textAnchor="end" className="cd-basefret">
            {v.baseFret}
          </text>
        )}
        {Array.from({ length: frets + 1 }, (_, i) => (
          <line key={`f${i}`} x1={x0} x2={x0 + 64} y1={y0 + i * fh} y2={y0 + i * fh} className="cd-line" />
        ))}
        {Array.from({ length: 6 }, (_, s) => (
          <line key={`s${s}`} x1={sx(s)} x2={sx(s)} y1={y0} y2={y0 + frets * fh} className="cd-line" />
        ))}
        {v.barre && (
          <rect
            x={sx(v.barre.from) - 5}
            y={fy(v.barre.fret) - 5}
            width={sx(v.barre.to) - sx(v.barre.from) + 10}
            height={10}
            rx={5}
            className="cd-dot"
          />
        )}
        {v.frets.map((f, s) => {
          if (f < 0)
            return (
              <text key={s} x={sx(s)} y={y0 - 8} textAnchor="middle" className="cd-mark">
                ×
              </text>
            );
          if (f === 0)
            return <circle key={s} cx={sx(s)} cy={y0 - 11} r={3.6} className="cd-open" />;
          if (v.barre && f === v.barre.fret && s >= v.barre.from && s <= v.barre.to) return null;
          return <circle key={s} cx={sx(s)} cy={fy(f)} r={5.2} className="cd-dot" />;
        })}
      </svg>
    </div>
  );
}
