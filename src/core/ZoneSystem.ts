import { type Grid, TileType, type Tile } from './Grid';

export const ZoneType = {
  None: 'None',
  Residential: 'Residential',
  Commercial: 'Commercial',
  Industrial: 'Industrial',
} as const;

export type ZoneType = (typeof ZoneType)[keyof typeof ZoneType];

export class ZoneSystem {
  public readonly grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
    this.initZones();
  }

  private initZones(): void {
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const tile = this.grid.tiles[y][x];
        if (!tile.zone) {
          tile.zone = ZoneType.None;
        }
      }
    }
  }

  public isWithinRoadDistance(
    x: number,
    y: number,
    maxDistance: number = 2
  ): boolean {
    if (!this.grid.isValid(x, y)) {
      return false;
    }

    for (let dy = -maxDistance; dy <= maxDistance; dy++) {
      for (let dx = -maxDistance; dx <= maxDistance; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          this.grid.isValid(nx, ny) &&
          this.grid.getTile(nx, ny)?.type === TileType.Road
        ) {
          return true;
        }
      }
    }

    return false;
  }

  public canZone(x: number, y: number): boolean {
    if (!this.grid.isValid(x, y)) {
      return false;
    }

    const tile = this.grid.getTile(x, y);
    if (!tile) {
      return false;
    }

    // Only Grass tiles can be zoned (cannot zone on Road or Water)
    if (tile.type !== TileType.Grass) {
      return false;
    }

    // Must be within 2 tiles of an existing Road
    return this.isWithinRoadDistance(x, y, 2);
  }

  public getZone(x: number, y: number): ZoneType {
    if (!this.grid.isValid(x, y)) {
      return ZoneType.None;
    }
    const tile = this.grid.getTile(x, y);
    return tile?.zone ?? ZoneType.None;
  }

  public setZone(x: number, y: number, zone: ZoneType): boolean {
    if (!this.grid.isValid(x, y)) {
      return false;
    }

    const tile = this.grid.getTile(x, y);
    if (!tile) {
      return false;
    }

    // De-zoning
    if (zone === ZoneType.None) {
      tile.zone = ZoneType.None;
      return true;
    }

    // Check zoning rules
    if (!this.canZone(x, y)) {
      return false;
    }

    tile.zone = zone;
    return true;
  }

  public clearZone(x: number, y: number): boolean {
    return this.setZone(x, y, ZoneType.None);
  }

  public zoneRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    zone: ZoneType
  ): { successCount: number; tiles: Tile[] } {
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(this.grid.width - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(this.grid.height - 1, Math.max(y1, y2));

    let successCount = 0;
    const tiles: Tile[] = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (this.canZone(x, y)) {
          const tile = this.grid.getTile(x, y);
          if (tile) {
            tile.zone = zone;
            successCount++;
            tiles.push(tile);
          }
        }
      }
    }

    return { successCount, tiles };
  }
}
