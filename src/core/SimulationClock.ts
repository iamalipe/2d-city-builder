export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export class SimulationClock {
  public ticks: number = 0;
  public speed: number = 1; // 0 = Paused, 1 = 1x, 2 = 2x, 4 = 4x
  private previousSpeed: number = 1;
  public tickRateMs: number = 1000;
  private accumulatorMs: number = 0;
  private listeners: Set<(clock: SimulationClock) => void> = new Set();

  constructor(initialTicks: number = 0, tickRateMs: number = 1000) {
    this.ticks = initialTicks;
    this.tickRateMs = tickRateMs;
  }

  get isPaused(): boolean {
    return this.speed === 0;
  }

  get year(): number {
    return 2000 + Math.floor(this.ticks / 12);
  }

  get month(): number {
    return (this.ticks % 12) + 1;
  }

  get monthName(): string {
    return MONTH_NAMES[this.ticks % 12];
  }

  get formattedDate(): string {
    return `${this.monthName} ${this.year}`;
  }

  public setSpeed(speed: number): void {
    if (speed < 0) return;
    if (speed !== 0) {
      this.previousSpeed = speed;
    }
    this.speed = speed;
    this.notify();
  }

  public pause(): void {
    if (this.speed !== 0) {
      this.previousSpeed = this.speed;
      this.speed = 0;
      this.notify();
    }
  }

  public resume(): void {
    if (this.speed === 0) {
      this.speed = this.previousSpeed > 0 ? this.previousSpeed : 1;
      this.notify();
    }
  }

  public togglePause(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  public tick(): void {
    this.ticks++;
    this.notify();
  }

  public step(deltaTimeMs: number): number {
    if (this.speed === 0 || deltaTimeMs <= 0) {
      return 0;
    }

    this.accumulatorMs += deltaTimeMs * this.speed;
    const ticksToRun = Math.floor(this.accumulatorMs / this.tickRateMs);
    this.accumulatorMs %= this.tickRateMs;

    for (let i = 0; i < ticksToRun; i++) {
      this.ticks++;
    }

    if (ticksToRun > 0) {
      this.notify();
    }

    return ticksToRun;
  }

  public subscribe(listener: (clock: SimulationClock) => void): () => void {
    this.listeners.add(listener);
    listener(this);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this);
    }
  }
}
