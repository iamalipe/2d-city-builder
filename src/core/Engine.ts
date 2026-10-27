import { Grid } from './Grid';
import { Economy } from './Economy';
import { RoadSystem } from './RoadSystem';
import { ToolManager } from './ToolManager';

export class SimulationEngine {
  public ticks: number = 0;
  public grid: Grid;
  public economy: Economy;
  public roadSystem: RoadSystem;
  public toolManager: ToolManager;

  constructor(grid?: Grid, economy?: Economy, roadSystem?: RoadSystem) {
    this.grid = grid ?? new Grid();
    this.economy = economy ?? new Economy();
    this.roadSystem = roadSystem ?? new RoadSystem(this.grid);
    this.toolManager = new ToolManager(this.grid, this.economy, this.roadSystem);
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
