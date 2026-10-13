import { useSearchParams } from 'react-router-dom';
import JamPanel from '../components/JamPanel';
import { PROGRESSIONS } from '../data/progressions';

export default function Jam() {
  const [params] = useSearchParams();
  const key = params.get('key') ?? 'Am';
  const prog = params.get('prog') ?? undefined;
  const initialProgression = PROGRESSIONS.some((p) => p.id === prog) ? prog : undefined;
  return (
    <div className="page">
      <h1>Jam & solo</h1>
      <p className="muted">Pick a key and a progression, hit play, and improvise using the highlighted scale. R = root.</p>
      <JamPanel key={`${key}-${initialProgression ?? ''}`} initialKey={key} initialProgression={initialProgression} />
    </div>
  );
}
