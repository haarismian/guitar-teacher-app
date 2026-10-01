// Web Audio engine: synthesized guitar (Karplus-Strong), bass, and drums.
import { midiToFreq } from '../music/theory';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
const pluckCache = new Map<string, AudioBuffer>();

export function getContext(): AudioContext {
  if (!ctx) {
    // iPad: play through the speaker even when the ringer switch is on silent
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = 'playback';
    } catch {
      /* not supported */
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor({ latencyHint: 'interactive' });
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(compressor);
    compressor.connect(ctx.destination);
  }
  return ctx;
}

/**
 * On iPad, 'playback' pauses other apps (Spotify) when we make a sound.
 * 'ambient' mixes with them instead (but respects the silent switch).
 */
export function setMixWithOtherAudio(mix: boolean) {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) nav.audioSession.type = mix ? 'ambient' : 'playback';
  } catch {
    /* not supported */
  }
}

/** Must be called from a user gesture (tap) on iOS */
export async function unlockAudio(): Promise<AudioContext> {
  const c = getContext();
  if (c.state !== 'running') {
    try {
      await c.resume();
    } catch {
      /* ignore */
    }
  }
  // play a silent buffer to fully unlock on older iOS
  const b = c.createBuffer(1, 1, c.sampleRate);
  const s = c.createBufferSource();
  s.buffer = b;
  s.connect(c.destination);
  s.start(0);
  return c;
}

export function getMaster(): GainNode {
  getContext();
  return master!;
}

export function setMasterVolume(v: number) {
  getMaster().gain.value = v;
}

function getNoise(): AudioBuffer {
  const c = getContext();
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

export type Tone = 'acoustic' | 'electric' | 'clean';

/** Karplus-Strong plucked string, rendered once per note and cached. */
function pluckBuffer(midi: number, tone: Tone): AudioBuffer {
  const key = `${midi}-${tone}`;
  const cached = pluckCache.get(key);
  if (cached) return cached;
  const c = getContext();
  const sr = c.sampleRate;
  const freq = midiToFreq(midi);
  const seconds = tone === 'electric' ? 3.2 : 2.4;
  const len = Math.floor(sr * seconds);
  const buf = c.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  // The averaging filter adds half a sample of delay, so compensate.
  const N = Math.max(2, Math.round(sr / freq - 0.5));
  const bright = tone === 'acoustic' ? 0.62 : tone === 'clean' ? 0.45 : 0.55;
  // excitation: low-passed noise burst
  const delay = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) {
    const n = Math.random() * 2 - 1;
    prev = bright * n + (1 - bright) * prev;
    delay[i] = prev;
  }
  const decay = tone === 'electric' ? 0.9985 : 0.996 - Math.min(0.006, (midi - 40) * 0.00008);
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const next = idx + 1 === N ? 0 : idx + 1;
    const a = delay[idx];
    out[i] = a;
    delay[idx] = decay * 0.5 * (a + delay[next]);
    idx = next;
  }
  // pick attack shaping
  const atk = Math.floor(sr * 0.002);
  for (let i = 0; i < atk && i < len; i++) out[i] *= i / atk;
  // fade tail
  const fade = Math.floor(sr * 0.08);
  for (let i = 0; i < fade; i++) out[len - 1 - i] *= i / fade;
  pluckCache.set(key, buf);
  return buf;
}

/** Pre-render notes so the first strum doesn't stutter */
export function warmUpPlucks(midis: number[], tone: Tone) {
  for (const m of midis) pluckBuffer(m, tone);
}

export interface PluckOptions {
  tone?: Tone;
  gain?: number;
  duration?: number; // seconds until the note is damped
  bendSemis?: number; // bend target (semitones) reached over bendTime
  bendTime?: number;
  bendFrom?: number; // start bent (for releases)
  slideFrom?: number; // semitones offset to slide from
  vibrato?: boolean;
  destination?: AudioNode;
}

export function playPluck(midi: number, when: number, opts: PluckOptions = {}) {
  const c = getContext();
  const tone = opts.tone ?? 'acoustic';
  const src = c.createBufferSource();
  src.buffer = pluckBuffer(midi, tone);
  const g = c.createGain();
  const gain = opts.gain ?? 0.35;
  g.gain.setValueAtTime(gain, when);
  const dur = opts.duration ?? 2;
  g.gain.setValueAtTime(gain, when + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.08);

  const rate = src.playbackRate;
  const semi = (s: number) => Math.pow(2, s / 12);
  if (opts.slideFrom) {
    rate.setValueAtTime(semi(opts.slideFrom), when);
    rate.linearRampToValueAtTime(1, when + 0.09);
  } else if (opts.bendFrom) {
    rate.setValueAtTime(semi(opts.bendFrom), when);
    rate.linearRampToValueAtTime(1, when + (opts.bendTime ?? 0.18));
  } else {
    rate.setValueAtTime(1, when);
  }
  if (opts.bendSemis) {
    rate.setValueAtTime(1, when + 0.04);
    rate.linearRampToValueAtTime(semi(opts.bendSemis), when + 0.04 + (opts.bendTime ?? 0.18));
  }
  if (opts.vibrato) {
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.setValueAtTime(0, when);
    depth.gain.linearRampToValueAtTime(0.025, when + 0.25);
    lfo.connect(depth);
    depth.connect(rate);
    lfo.start(when);
    lfo.stop(when + dur + 0.1);
  }

  let node: AudioNode = g;
  if (tone === 'electric') {
    // light overdrive + tone filter
    const shaper = c.createWaveShaper();
    shaper.curve = driveCurve();
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3800;
    const post = c.createGain();
    post.gain.value = 0.55;
    g.connect(shaper);
    shaper.connect(lp);
    lp.connect(post);
    node = post;
  }
  src.connect(g);
  node.connect(opts.destination ?? getMaster());
  src.start(when);
  src.stop(when + dur + 0.2);
}

let curve: Float32Array<ArrayBuffer> | null = null;
function driveCurve() {
  if (!curve) {
    const n = 1024;
    curve = new Float32Array(new ArrayBuffer(n * 4));
    const k = 6;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
  }
  return curve;
}

/** Strum a set of notes. direction 'down' = low to high. */
export function strum(
  notes: number[],
  when: number,
  opts: { direction?: 'down' | 'up'; gain?: number; duration?: number; tone?: Tone; spread?: number; muted?: boolean; destination?: AudioNode } = {},
) {
  const dir = opts.direction ?? 'down';
  const ordered = dir === 'down' ? notes : [...notes].reverse();
  const spread = opts.spread ?? (dir === 'down' ? 0.012 : 0.009);
  // upstrokes usually only catch the top strings
  const use = dir === 'up' ? ordered.slice(0, Math.max(3, Math.ceil(ordered.length * 0.6))) : ordered;
  use.forEach((n, i) => {
    const g = (opts.gain ?? 0.22) * (dir === 'up' ? 0.75 : 1) * (1 - i * 0.03);
    playPluck(n, when + i * spread, {
      tone: opts.tone,
      gain: g,
      duration: opts.muted ? 0.05 : opts.duration ?? 1.5,
      destination: opts.destination,
    });
  });
}

/** Percussive muted strum ("chuck") */
export function chuck(when: number, gain = 0.25, destination?: AudioNode) {
  const c = getContext();
  const src = c.createBufferSource();
  src.buffer = getNoise();
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
  src.connect(bp);
  bp.connect(g);
  g.connect(destination ?? getMaster());
  src.start(when, Math.random() * 0.5);
  src.stop(when + 0.08);
}

export function playBass(midi: number, when: number, duration: number, gain = 0.4, destination?: AudioNode) {
  const c = getContext();
  const f = midiToFreq(midi);
  const o1 = c.createOscillator();
  o1.type = 'triangle';
  o1.frequency.value = f;
  const o2 = c.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = f;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, when);
  lp.frequency.exponentialRampToValueAtTime(300, when + 0.25);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.01);
  g.gain.setValueAtTime(gain * 0.8, when + Math.max(0.02, duration - 0.05));
  g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  o1.connect(lp);
  o2.connect(lp);
  lp.connect(g);
  g.connect(destination ?? getMaster());
  o1.start(when);
  o2.start(when);
  o1.stop(when + duration + 0.05);
  o2.stop(when + duration + 0.05);
}

export function kick(when: number, gain = 0.9, destination?: AudioNode) {
  const c = getContext();
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(140, when);
  o.frequency.exponentialRampToValueAtTime(45, when + 0.12);
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.35);
  o.connect(g);
  g.connect(destination ?? getMaster());
  o.start(when);
  o.stop(when + 0.4);
}

export function snare(when: number, gain = 0.5, destination?: AudioNode) {
  const c = getContext();
  const src = c.createBufferSource();
  src.buffer = getNoise();
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1200;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
  src.connect(hp);
  hp.connect(g);
  g.connect(destination ?? getMaster());
  src.start(when, Math.random() * 0.5);
  src.stop(when + 0.2);
  const o = c.createOscillator();
  const og = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(220, when);
  o.frequency.exponentialRampToValueAtTime(160, when + 0.08);
  og.gain.setValueAtTime(gain * 0.6, when);
  og.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
  o.connect(og);
  og.connect(destination ?? getMaster());
  o.start(when);
  o.stop(when + 0.12);
}

export function hat(when: number, gain = 0.15, open = false, destination?: AudioNode) {
  const c = getContext();
  const src = c.createBufferSource();
  src.buffer = getNoise();
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const g = c.createGain();
  const len = open ? 0.25 : 0.05;
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + len);
  src.connect(hp);
  hp.connect(g);
  g.connect(destination ?? getMaster());
  src.start(when, Math.random() * 0.5);
  src.stop(when + len + 0.02);
}

export function click(when: number, accent: boolean, gain = 0.5, destination?: AudioNode) {
  const c = getContext();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.value = accent ? 1760 : 1175;
  g.gain.setValueAtTime(gain * (accent ? 0.5 : 0.3), when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
  o.connect(g);
  g.connect(destination ?? getMaster());
  o.start(when);
  o.stop(when + 0.05);
}

/** Create a channel (gain node) connected to master, for per-instrument volume/mute. */
export function createChannel(volume = 1): GainNode {
  const c = getContext();
  const g = c.createGain();
  g.gain.value = volume;
  g.connect(getMaster());
  return g;
}
