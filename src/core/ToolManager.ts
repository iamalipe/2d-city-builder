import { type Grid, TileType, type Tile } from './Grid';
import { type Economy } from './Economy';
import { type RoadSystem } from './RoadSystem';
import { ZoneType, type ZoneSystem } from './ZoneSystem';

export const Tool = {
  Inspect: 'Inspect',
  Road: 'Road',
  Bulldoze: 'Bulldoze',
  Residential: 'Residential',
  Commercial: 'Commercial',
  Industrial: 'Industrial',
} as const;

export type Tool = (typeof Tool)[keyof typeof Tool];

export const TOOL_COSTS: Record<Tool, number> = {
  [Tool.Inspect]: 0,
  [Tool.Road]: 20,
  [Tool.Bulldoze]: 5,
  [Tool.Residential]: 100,
  [Tool.Commercial]: 100,
  [Tool.Industrial]: 100,
};

export const TOOL_TO_ZONE: Partial<Record<Tool, ZoneType>> = {
  [Tool.Residential]: ZoneType.Residential,
  [Tool.Commercial]: ZoneType.Commercial,
  [Tool.Industrial]: ZoneType.Industrial,
};

export class ToolManager {
  public readonly grid: Grid;
  public readonly economy: Economy;
  public roadSystem?: RoadSystem;
  public zoneSystem?: ZoneSystem;
  public currentTool: Tool = Tool.Inspect;
  public lastInspectedTile: Tile | null = null;
  private toolListeners: Set<(tool: Tool) => void> = new Set();
  private tileChangeListeners: Set<(tile: Tile) => void> = new Set();

  constructor(
    grid: Grid,
    economy: Economy,
    roadSystem?: RoadSystem,
    zoneSystem?: ZoneSystem
  ) {
    this.grid = grid;
    this.economy = economy;
    this.roadSystem = roadSystem;
    this.zoneSystem = zoneSystem;
  }

  public setTool(tool: Tool): void {
    this.currentTool = tool;
    for (const listener of this.toolListeners) {
      listener(tool);
    }
  }

  public getCost(tool: Tool = this.currentTool): number {
    return TOOL_COSTS[tool];
  }

  public applyTool(tileX: number, tileY: number): boolean {
    if (!this.grid.isValid(tileX, tileY)) {
      return false;
    }

    const tile = this.grid.getTile(tileX, tileY);
    if (!tile) {
      return false;
    }

    switch (this.currentTool) {
      case Tool.Inspect: {
        this.lastInspectedTile = tile;
        return true;
      }

      case Tool.Road: {
        // Prevent building on water
        if (tile.type === TileType.Water) {
          return false;
        }

        // Already a road
        if (tile.type === TileType.Road) {
          return false;
        }

        const cost = TOOL_COSTS[Tool.Road];
        if (!this.economy.hasFunds(cost)) {
          return false;
        }

        if (!this.economy.spend(cost)) {
          return false;
        }

        this.grid.setTileType(tileX, tileY, TileType.Road);
        tile.zone = ZoneType.None;
        this.roadSystem?.updateTileAndNeighbors(tileX, tileY);
        this.notifyTileChanged(tile);
        return true;
      }

      case Tool.Bulldoze: {
        if (tile.type === TileType.Water) {
          return false;
        }

        const hasRoad = tile.type === TileType.Road;
        const hasZone = !!tile.zone && tile.zone !== ZoneType.None;

        // Nothing to bulldoze if plain unzoned grass
        if (!hasRoad && !hasZone) {
          return false;
        }

        const cost = TOOL_COSTS[Tool.Bulldoze];
        if (!this.economy.hasFunds(cost)) {
          return false;
        }

        if (!this.economy.spend(cost)) {
          return false;
        }

        if (hasRoad) {
          this.grid.setTileType(tileX, tileY, TileType.Grass);
          this.roadSystem?.updateTileAndNeighbors(tileX, tileY);
        }

        if (hasZone) {
          tile.zone = ZoneType.None;
          this.zoneSystem?.clearZone(tileX, tileY);
        }

        this.notifyTileChanged(tile);
        return true;
      }

      case Tool.Residential:
      case Tool.Commercial:
      case Tool.Industrial: {
        const targetZone = TOOL_TO_ZONE[this.currentTool];
        if (!targetZone) {
          return false;
        }

        if (this.zoneSystem && !this.zoneSystem.canZone(tileX, tileY)) {
          return false;
        }

        // Already this zone
        if (tile.zone === targetZone) {
          return false;
        }

        const cost = TOOL_COSTS[this.currentTool];
        if (!this.economy.hasFunds(cost)) {
          return false;
        }

        if (!this.economy.spend(cost)) {
          return false;
        }

        if (this.zoneSystem) {
          this.zoneSystem.setZone(tileX, tileY, targetZone);
        } else {
          tile.zone = targetZone;
        }

        this.notifyTileChanged(tile);
        return true;
      }

      default:
        return false;
    }
  }

  public applyZoneRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    zone: ZoneType
  ): { count: number; totalCost: number } {
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(this.grid.width - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(this.grid.height - 1, Math.max(y1, y2));

    let count = 0;
    let totalCost = 0;
    const tool = zone === ZoneType.Residential ? Tool.Residential : zone === ZoneType.Commercial ? Tool.Commercial : zone === ZoneType.Industrial ? Tool.Industrial : null;
    const cost = tool ? TOOL_COSTS[tool] : 0;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const canZ = this.zoneSystem ? this.zoneSystem.canZone(x, y) : this.grid.getTile(x, y)?.type === TileType.Grass;
        if (canZ) {
          const tile = this.grid.getTile(x, y);
          if (tile && tile.zone !== zone) {
            if (this.economy.hasFunds(cost)) {
              if (this.economy.spend(cost)) {
                if (this.zoneSystem) {
                  this.zoneSystem.setZone(x, y, zone);
                } else {
                  tile.zone = zone;
                }
                count++;
                totalCost += cost;
                this.notifyTileChanged(tile);
              }
            }
          }
        }
      }
    }

    return { count, totalCost };
  }

  public subscribeToolChange(listener: (tool: Tool) => void): () => void {
    this.toolListeners.add(listener);
    listener(this.currentTool);
    return () => {
      this.toolListeners.delete(listener);
    };
  }

  public subscribeTileChange(listener: (tile: Tile) => void): () => void {
    this.tileChangeListeners.add(listener);
    return () => {
      this.tileChangeListeners.delete(listener);
    };
  }

  private notifyTileChanged(tile: Tile): void {
    for (const listener of this.tileChangeListeners) {
      listener(tile);
    }
  }
}
