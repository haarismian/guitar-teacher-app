import { useSearchParams } from 'react-router-dom';
import JamPanel from '../components/JamPanel';

export default function Jam() {
  const [params] = useSearchParams();
  const key = params.get('key') ?? 'Am';
  return (
    <div className="page">
      <h1>Jam & solo</h1>
      <p className="muted">Pick a key and a progression, hit play, and improvise using the highlighted scale. R = root.</p>
      <JamPanel key={key} initialKey={key} />
    </div>
  );
}
