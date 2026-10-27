import { type Grid, TileType, type Tile } from './Grid';
import { type Economy } from './Economy';

export const Tool = {
  Inspect: 'Inspect',
  Road: 'Road',
  Bulldoze: 'Bulldoze',
} as const;

export type Tool = (typeof Tool)[keyof typeof Tool];

export const TOOL_COSTS: Record<Tool, number> = {
  [Tool.Inspect]: 0,
  [Tool.Road]: 20,
  [Tool.Bulldoze]: 5,
};

export class ToolManager {
  public readonly grid: Grid;
  public readonly economy: Economy;
  public currentTool: Tool = Tool.Inspect;
  public lastInspectedTile: Tile | null = null;
  private toolListeners: Set<(tool: Tool) => void> = new Set();
  private tileChangeListeners: Set<(tile: Tile) => void> = new Set();

  constructor(grid: Grid, economy: Economy) {
    this.grid = grid;
    this.economy = economy;
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
        this.notifyTileChanged(tile);
        return true;
      }

      case Tool.Bulldoze: {
        // Cannot bulldoze water
        if (tile.type === TileType.Water) {
          return false;
        }

        // Already grass (nothing to bulldoze)
        if (tile.type === TileType.Grass) {
          return false;
        }

        const cost = TOOL_COSTS[Tool.Bulldoze];
        if (!this.economy.hasFunds(cost)) {
          return false;
        }

        if (!this.economy.spend(cost)) {
          return false;
        }

        this.grid.setTileType(tileX, tileY, TileType.Grass);
        this.notifyTileChanged(tile);
        return true;
      }

      default:
        return false;
    }
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
