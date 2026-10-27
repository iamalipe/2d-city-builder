export const TileType = {
  Grass: 'Grass',
  Water: 'Water',
  Road: 'Road',
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

export interface Tile {
  x: number;
  y: number;
  type: TileType;
}

export class Grid {
  public readonly width: number;
  public readonly height: number;
  public readonly tiles: Tile[][];

  constructor(width: number = 64, height: number = 64, seed: number = 42) {
    this.width = width;
    this.height = height;
    this.tiles = [];

    this.initializeTiles();
    this.generateRiver(seed);
  }

  private initializeTiles(): void {
    for (let y = 0; y < this.height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          x,
          y,
          type: TileType.Grass,
        });
      }
      this.tiles.push(row);
    }
  }

  private generateRiver(seed: number): void {
    // Deterministic pseudo-random number generator (LCG)
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    const rng = (): number => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    const startY = Math.floor(this.height * (0.35 + rng() * 0.3));
    const freq1 = 0.04 + rng() * 0.04;
    const freq2 = 0.015 + rng() * 0.02;
    const amp1 = 5 + rng() * 6;
    const amp2 = 3 + rng() * 4;
    const phase1 = rng() * Math.PI * 2;
    const phase2 = rng() * Math.PI * 2;
    const riverWidth = 2;

    let prevY = Math.round(
      startY + Math.sin(phase1) * amp1 + Math.cos(phase2) * amp2
    );
    prevY = Math.max(riverWidth, Math.min(this.height - 1 - riverWidth, prevY));

    for (let x = 0; x < this.width; x++) {
      const rawY = Math.round(
        startY +
          Math.sin(x * freq1 + phase1) * amp1 +
          Math.cos(x * freq2 + phase2) * amp2
      );
      const targetY = Math.max(
        riverWidth,
        Math.min(this.height - 1 - riverWidth, rawY)
      );

      const minY = Math.min(prevY, targetY);
      const maxY = Math.max(prevY, targetY);

      for (let cy = minY; cy <= maxY; cy++) {
        for (let w = 0; w < riverWidth; w++) {
          const wy = cy + w;
          if (this.isValid(x, wy)) {
            this.tiles[wy][x].type = TileType.Water;
          }
        }
      }

      prevY = targetY;
    }
  }

  public isValid(x: number, y: number): boolean {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      x < this.width &&
      y >= 0 &&
      y < this.height
    );
  }

  public getTile(x: number, y: number): Tile | null {
    if (!this.isValid(x, y)) {
      return null;
    }
    return this.tiles[y][x];
  }

  public getNeighbors(
    x: number,
    y: number,
    includeDiagonals: boolean = false
  ): Tile[] {
    const directions = [
      { dx: 0, dy: -1 }, // North
      { dx: 1, dy: 0 },  // East
      { dx: 0, dy: 1 },  // South
      { dx: -1, dy: 0 }, // West
    ];

    if (includeDiagonals) {
      directions.push(
        { dx: -1, dy: -1 }, // North-West
        { dx: 1, dy: -1 },  // North-East
        { dx: -1, dy: 1 },  // South-West
        { dx: 1, dy: 1 }    // South-East
      );
    }

    const neighbors: Tile[] = [];
    for (const { dx, dy } of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.isValid(nx, ny)) {
        const tile = this.getTile(nx, ny);
        if (tile) {
          neighbors.push(tile);
        }
      }
    }
    return neighbors;
  }

  public setTileType(x: number, y: number, type: TileType): boolean {
    const tile = this.getTile(x, y);
    if (!tile) {
      return false;
    }
    tile.type = type;
    return true;
  }

  public countTilesByType(type: TileType): number {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[y][x].type === type) {
          count++;
        }
      }
    }
    return count;
  }
}
