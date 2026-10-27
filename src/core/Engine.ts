import { Grid } from './Grid';
import { Economy } from './Economy';
import { RoadSystem } from './RoadSystem';
import { ZoneSystem } from './ZoneSystem';
import { ToolManager } from './ToolManager';
import { SimulationClock } from './SimulationClock';
import { DemandSystem, type CityMetrics, type RCIDemand } from './DemandSystem';

export class SimulationEngine {
  public grid: Grid;
  public economy: Economy;
  public roadSystem: RoadSystem;
  public zoneSystem: ZoneSystem;
  public toolManager: ToolManager;
  public clock: SimulationClock;
  public demandSystem: DemandSystem;

  public population: number = 0;
  public unemployedWorkers: number = 0;
  public commercialCapacity: number = 0;
  public industrialCapacity: number = 0;

  constructor(
    grid?: Grid,
    economy?: Economy,
    roadSystem?: RoadSystem,
    zoneSystem?: ZoneSystem,
    clock?: SimulationClock,
    demandSystem?: DemandSystem
  ) {
    this.grid = grid ?? new Grid();
    this.economy = economy ?? new Economy();
    this.roadSystem = roadSystem ?? new RoadSystem(this.grid);
    this.zoneSystem = zoneSystem ?? new ZoneSystem(this.grid);
    this.toolManager = new ToolManager(
      this.grid,
      this.economy,
      this.roadSystem,
      this.zoneSystem
    );
    this.clock = clock ?? new SimulationClock();
    this.demandSystem = demandSystem ?? new DemandSystem();
  }

  get ticks(): number {
    return this.clock.ticks;
  }
  set ticks(value: number) {
    this.clock.ticks = value;
  }

  get tickCount(): number {
    return this.clock.ticks;
  }

  public getTicks(): number {
    return this.clock.ticks;
  }

  public getMetrics(): CityMetrics {
    return {
      population: this.population,
      unemployedWorkers: this.unemployedWorkers,
      commercialCapacity: this.commercialCapacity,
      industrialCapacity: this.industrialCapacity,
    };
  }

  public getDemand(): RCIDemand {
    return this.demandSystem.getDemand();
  }

  public tick(): void {
    this.clock.tick();
    this.demandSystem.update(this.getMetrics());
  }

  public setDemographics(metrics: Partial<CityMetrics>): void {
    if (metrics.population !== undefined) this.population = metrics.population;
    if (metrics.unemployedWorkers !== undefined) this.unemployedWorkers = metrics.unemployedWorkers;
    if (metrics.commercialCapacity !== undefined) this.commercialCapacity = metrics.commercialCapacity;
    if (metrics.industrialCapacity !== undefined) this.industrialCapacity = metrics.industrialCapacity;
    this.demandSystem.update(this.getMetrics());
  }
}
