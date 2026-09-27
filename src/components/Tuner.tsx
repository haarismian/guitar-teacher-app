import { useEffect, useRef, useState } from 'react';
import { getContext, playPluck, unlockAudio } from '../audio/engine';
import { STANDARD_TUNING, noteName } from '../music/theory';

// Autocorrelation pitch detection (good enough for guitar)
function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.01) return null;
  const size = buf.length;
  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.floor(sampleRate / 70);
  let best = -1;
  let bestCorr = 0;
  const corr = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let c = 0;
    for (let i = 0; i < size - lag; i++) c += buf[i] * buf[i + lag];
    corr[lag] = c;
  }
  // first peak that is close to the global max (avoids octave errors)
  let globalMax = 0;
  for (let lag = minLag; lag <= maxLag; lag++) globalMax = Math.max(globalMax, corr[lag]);
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    if (corr[lag] > corr[lag - 1] && corr[lag] >= corr[lag + 1] && corr[lag] > 0.9 * globalMax) {
      best = lag;
      bestCorr = corr[lag];
      break;
    }
  }
  if (best < 0 || bestCorr <= 0) return null;
  // parabolic interpolation
  const a = corr[best - 1];
  const b = corr[best];
  const c = corr[best + 1];
  const shift = (a - c) / (2 * (a - 2 * b + c));
  return sampleRate / (best + (isFinite(shift) ? shift : 0));
}

export default function Tuner() {
  const [on, setOn] = useState(false);
  const [freq, setFreq] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number | null>(null);
  const smooth = useRef<number | null>(null);

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setOn(false);
    setFreq(null);
  };

  useEffect(() => stop, []);

  const start = async () => {
    setErr(null);
    try {
      const ctx = await unlockAudio();
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      stream.current = s;
      const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser();
      an.fftSize = 4096;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);
      setOn(true);
      const loop = () => {
        an.getFloatTimeDomainData(buf);
        const f = detectPitch(buf, ctx.sampleRate);
        if (f) {
          smooth.current = smooth.current && Math.abs(smooth.current - f) / f < 0.05 ? smooth.current * 0.7 + f * 0.3 : f;
          setFreq(smooth.current);
        }
        raf.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      setErr('Microphone not available. Allow mic access in Safari settings, or use the reference tones below.');
      console.error(e);
    }
  };

  let display = null;
  if (freq) {
    const midiF = 69 + 12 * Math.log2(freq / 440);
    const midi = Math.round(midiF);
    const cents = Math.round((midiF - midi) * 100);
    const inTune = Math.abs(cents) <= 5;
    const closest = STANDARD_TUNING.reduce((a, b) => (Math.abs(b - midiF) < Math.abs(a - midiF) ? b : a));
    display = (
      <div className="tuner-display">
        <div className={`tuner-note ${inTune ? 'good' : ''}`}>{noteName(midi)}</div>
        <div className="tuner-meter">
          <div className="tuner-center" />
          <div className="tuner-needle" style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }} />
        </div>
        <div className="muted">
          {cents > 0 ? `+${cents}` : cents} cents · {freq.toFixed(1)} Hz · nearest string: {noteName(closest)}
          {inTune ? ' ✓' : cents < 0 ? ' — tighten ↑' : ' — loosen ↓'}
        </div>
      </div>
    );
  }

  const ref = async (m: number) => {
    await unlockAudio();
    playPluck(m, getContext().currentTime + 0.02, { duration: 2.5, gain: 0.5 });
  };

  return (
    <div className="card tuner">
      <div className="row between">
        <h3>Tuner</h3>
        <button className={`btn ${on ? 'danger' : 'primary'}`} onClick={on ? stop : start}>
          {on ? 'Stop' : '🎤 Start tuner'}
        </button>
      </div>
      {err && <p className="warn">{err}</p>}
      {on && (display ?? <p className="muted">Play a single string…</p>)}
      <div className="row wrap gap">
        <span className="muted">Reference tones:</span>
        {STANDARD_TUNING.map((m, i) => (
          <button key={i} className="btn small" onClick={() => ref(m)}>
            {['E', 'A', 'D', 'G', 'B', 'e'][i]}
          </button>
        ))}
      </div>
    </div>
  );
}
