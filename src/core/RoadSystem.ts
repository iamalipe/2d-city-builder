import { type Grid, TileType } from './Grid';

export const RoadDirection = {
  NORTH: 1,
  EAST: 2,
  SOUTH: 4,
  WEST: 8,
} as const;

export type RoadDirection = (typeof RoadDirection)[keyof typeof RoadDirection];

export class RoadSystem {
  public readonly grid: Grid;
  private bitmasks: number[][];

  constructor(grid: Grid) {
    this.grid = grid;
    this.bitmasks = [];
    this.initBitmasks();
  }

  private initBitmasks(): void {
    this.bitmasks = [];
    for (let y = 0; y < this.grid.height; y++) {
      this.bitmasks.push(new Array(this.grid.width).fill(0));
    }
    this.updateAll();
  }

  public getBitmask(x: number, y: number): number {
    if (!this.grid.isValid(x, y)) {
      return 0;
    }
    return this.bitmasks[y][x];
  }

  public computeBitmask(x: number, y: number): number {
    if (!this.grid.isValid(x, y)) {
      return 0;
    }

    const tile = this.grid.getTile(x, y);
    if (!tile || tile.type !== TileType.Road) {
      return 0;
    }

    let mask = 0;

    // North (N = 1, dy = -1)
    if (
      this.grid.isValid(x, y - 1) &&
      this.grid.getTile(x, y - 1)?.type === TileType.Road
    ) {
      mask |= RoadDirection.NORTH;
    }

    // East (E = 2, dx = +1)
    if (
      this.grid.isValid(x + 1, y) &&
      this.grid.getTile(x + 1, y)?.type === TileType.Road
    ) {
      mask |= RoadDirection.EAST;
    }

    // South (S = 4, dy = +1)
    if (
      this.grid.isValid(x, y + 1) &&
      this.grid.getTile(x, y + 1)?.type === TileType.Road
    ) {
      mask |= RoadDirection.SOUTH;
    }

    // West (W = 8, dx = -1)
    if (
      this.grid.isValid(x - 1, y) &&
      this.grid.getTile(x - 1, y)?.type === TileType.Road
    ) {
      mask |= RoadDirection.WEST;
    }

    return mask;
  }

  public updateTile(x: number, y: number): number {
    if (!this.grid.isValid(x, y)) {
      return 0;
    }
    const mask = this.computeBitmask(x, y);
    this.bitmasks[y][x] = mask;
    const tile = this.grid.getTile(x, y);
    if (tile) {
      tile.roadMask = mask;
    }
    return mask;
  }

  public updateTileAndNeighbors(x: number, y: number): void {
    if (!this.grid.isValid(x, y)) {
      return;
    }

    // Update target tile
    this.updateTile(x, y);

    // Update orthogonal neighbors: North, East, South, West
    const neighbors = [
      { x, y: y - 1 },
      { x: x + 1, y },
      { x, y: y + 1 },
      { x: x - 1, y },
    ];

    for (const n of neighbors) {
      if (this.grid.isValid(n.x, n.y)) {
        this.updateTile(n.x, n.y);
      }
    }
  }

  public updateAll(): void {
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        this.updateTile(x, y);
      }
    }
  }

  public isIntersection(mask: number): boolean {
    return mask === 7 || mask === 11 || mask === 13 || mask === 14 || mask === 15;
  }

  public isCorner(mask: number): boolean {
    return mask === 3 || mask === 6 || mask === 9 || mask === 12;
  }

  public isStraight(mask: number): boolean {
    return mask === 5 || mask === 10;
  }

  public isDeadEnd(mask: number): boolean {
    return mask === 1 || mask === 2 || mask === 4 || mask === 8;
  }

  public isIsolated(mask: number): boolean {
    return mask === 0;
  }
}
