import { Grid } from './Grid';
import { Economy } from './Economy';
import { ToolManager } from './ToolManager';

export class SimulationEngine {
  public ticks: number = 0;
  public grid: Grid;
  public economy: Economy;
  public toolManager: ToolManager;

  constructor(grid?: Grid, economy?: Economy) {
    this.grid = grid ?? new Grid();
    this.economy = economy ?? new Economy();
    this.toolManager = new ToolManager(this.grid, this.economy);
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
