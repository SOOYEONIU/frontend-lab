export interface PlaybackState {
  cursor: number;
  lastIndex: number;
  playing: boolean;
}

/** Owns playback timing and navigation; has no dependency on the DOM or scenarios. */
export class Playback {
  private cursor = 0;
  private lastIndex = 0;
  private playing = false;
  private speed = 1;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly onChange: (state: PlaybackState) => void) {}

  get state(): PlaybackState {
    return { cursor: this.cursor, lastIndex: this.lastIndex, playing: this.playing };
  }

  load(length: number): void {
    this.lastIndex = Math.max(0, length - 1);
    this.seek(0);
  }

  seek(index: number): void {
    if (!Number.isFinite(index)) return;
    this.stop();
    this.cursor = Math.max(0, Math.min(Math.trunc(index), this.lastIndex));
    this.notify();
  }

  step(direction: -1 | 1): void {
    this.seek(this.cursor + direction);
  }

  toggle(): void {
    if (this.playing) {
      this.stop();
    } else if (this.lastIndex > 0) {
      if (this.cursor === this.lastIndex) this.cursor = 0;
      this.playing = true;
      this.scheduleNext();
    }
    this.notify();
  }

  setSpeed(speed: number): void {
    if (!Number.isFinite(speed) || speed <= 0) return;
    this.speed = speed;
    if (this.playing) this.scheduleNext();
  }

  dispose(): void {
    this.stop();
  }

  private stop(): void {
    this.playing = false;
    clearTimeout(this.timer);
  }

  private notify(): void {
    this.onChange(this.state);
  }

  private scheduleNext(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.cursor += 1;
      if (this.cursor === this.lastIndex) this.stop();
      this.notify();
      if (this.playing) this.scheduleNext();
    }, 1100 / this.speed);
  }
}
