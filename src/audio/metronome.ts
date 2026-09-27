import { click, getContext, unlockAudio } from './engine';

export class Metronome {
  bpm = 60;
  beatsPerBar = 4;
  subdivision = 1; // 1 = quarters, 2 = eighths, 3 = triplets
  private timer: number | null = null;
  private raf: number | null = null;
  private nextTime = 0;
  private step = 0;
  private queue: Array<{ time: number; beat: number }> = [];
  onBeat?: (beat: number) => void;
  playing = false;

  async start() {
    const ctx = await unlockAudio();
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.08;
    this.playing = true;
    this.timer = window.setInterval(() => this.schedule(), 25);
    this.schedule();
    const tick = () => {
      const now = getContext().currentTime;
      let beat: number | null = null;
      while (this.queue.length && this.queue[0].time <= now) beat = this.queue.shift()!.beat;
      if (beat !== null) this.onBeat?.(beat);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.playing = false;
    if (this.timer !== null) clearInterval(this.timer);
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.timer = this.raf = null;
    this.queue = [];
  }

  private schedule() {
    const ctx = getContext();
    while (this.nextTime < ctx.currentTime + 0.12) {
      const sub = this.step % this.subdivision;
      const beat = Math.floor(this.step / this.subdivision) % this.beatsPerBar;
      if (sub === 0) {
        click(this.nextTime, beat === 0, 0.9);
        this.queue.push({ time: this.nextTime, beat });
      } else {
        click(this.nextTime, false, 0.35);
      }
      this.step++;
      this.nextTime += 60 / this.bpm / this.subdivision;
    }
  }
}
