export class SimulationEngine {
  public ticks: number = 0;

  get tickCount(): number {
    return this.ticks;
  }

  public tick(): void {
    this.ticks++;
  }

  public getTicks(): number {
    return this.ticks;
  }
}
