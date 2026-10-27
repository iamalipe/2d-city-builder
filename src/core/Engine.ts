import { Grid } from './Grid';

export class SimulationEngine {
  public ticks: number = 0;
  public grid: Grid;

  constructor(grid?: Grid) {
    this.grid = grid ?? new Grid();
  }

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
