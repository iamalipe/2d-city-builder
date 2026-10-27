import { Container, Graphics } from 'pixi.js';
import { type Grid, TileType } from '../core/Grid';
import { DEFAULT_TILE_SIZE } from '../core/Coordinates';

export class GridRenderer {
  public readonly container: Container;
  private terrainGraphics: Graphics;
  private roadMarkingsGraphics: Graphics;
  private gridLinesGraphics: Graphics;
  private highlightGraphics: Graphics;
  private tileSize: number;

  constructor(tileSize: number = DEFAULT_TILE_SIZE) {
    this.tileSize = tileSize;
    this.container = new Container();

    this.terrainGraphics = new Graphics();
    this.roadMarkingsGraphics = new Graphics();
    this.gridLinesGraphics = new Graphics();
    this.highlightGraphics = new Graphics();

    this.container.addChild(this.terrainGraphics);
    this.container.addChild(this.roadMarkingsGraphics);
    this.container.addChild(this.gridLinesGraphics);
    this.container.addChild(this.highlightGraphics);
  }

  public render(grid: Grid): void {
    this.renderTerrainAndRoads(grid);
    this.renderGridLines(grid);
  }

  private renderTerrainAndRoads(grid: Grid): void {
    this.terrainGraphics.clear();
    this.roadMarkingsGraphics.clear();

    const grassTiles: { x: number; y: number }[] = [];
    const waterTiles: { x: number; y: number }[] = [];
    const roadTiles: { x: number; y: number }[] = [];

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.tiles[y][x];
        if (tile.type === TileType.Water) {
          waterTiles.push({ x, y });
        } else if (tile.type === TileType.Road) {
          roadTiles.push({ x, y });
        } else {
          grassTiles.push({ x, y });
        }
      }
    }

    // Procedural green grass
    for (const t of grassTiles) {
      this.terrainGraphics.rect(
        t.x * this.tileSize,
        t.y * this.tileSize,
        this.tileSize,
        this.tileSize
      );
    }
    this.terrainGraphics.fill({ color: 0x48a860 });

    // Procedural blue water
    for (const t of waterTiles) {
      this.terrainGraphics.rect(
        t.x * this.tileSize,
        t.y * this.tileSize,
        this.tileSize,
        this.tileSize
      );
    }
    this.terrainGraphics.fill({ color: 0x3b82f6 });

    // Procedural dark slate asphalt for roads
    for (const t of roadTiles) {
      this.terrainGraphics.rect(
        t.x * this.tileSize,
        t.y * this.tileSize,
        this.tileSize,
        this.tileSize
      );
    }
    this.terrainGraphics.fill({ color: 0x334155 });

    // Road lane markings connecting to neighboring roads
    const half = this.tileSize / 2;
    for (const t of roadTiles) {
      const cx = t.x * this.tileSize + half;
      const cy = t.y * this.tileSize + half;

      const isNorthRoad = t.y > 0 && grid.tiles[t.y - 1][t.x].type === TileType.Road;
      const isSouthRoad = t.y < grid.height - 1 && grid.tiles[t.y + 1][t.x].type === TileType.Road;
      const isWestRoad = t.x > 0 && grid.tiles[t.y][t.x - 1].type === TileType.Road;
      const isEastRoad = t.x < grid.width - 1 && grid.tiles[t.y][t.x + 1].type === TileType.Road;

      let hasConnection = false;
      if (isNorthRoad) {
        this.roadMarkingsGraphics.moveTo(cx, cy).lineTo(cx, cy - half);
        hasConnection = true;
      }
      if (isSouthRoad) {
        this.roadMarkingsGraphics.moveTo(cx, cy).lineTo(cx, cy + half);
        hasConnection = true;
      }
      if (isWestRoad) {
        this.roadMarkingsGraphics.moveTo(cx, cy).lineTo(cx - half, cy);
        hasConnection = true;
      }
      if (isEastRoad) {
        this.roadMarkingsGraphics.moveTo(cx, cy).lineTo(cx + half, cy);
        hasConnection = true;
      }

      if (!hasConnection) {
        this.roadMarkingsGraphics
          .rect(cx - 2, cy - 2, 4, 4)
          .fill({ color: 0xfbbf24, alpha: 0.9 });
      }
    }

    this.roadMarkingsGraphics.stroke({
      width: 2,
      color: 0xfbbf24,
      alpha: 0.85,
    });
  }

  private renderGridLines(grid: Grid): void {
    this.gridLinesGraphics.clear();

    const widthPx = grid.width * this.tileSize;
    const heightPx = grid.height * this.tileSize;

    // Subtle vertical grid lines
    for (let x = 0; x <= grid.width; x++) {
      const px = x * this.tileSize;
      this.gridLinesGraphics.moveTo(px, 0).lineTo(px, heightPx);
    }

    // Subtle horizontal grid lines
    for (let y = 0; y <= grid.height; y++) {
      const py = y * this.tileSize;
      this.gridLinesGraphics.moveTo(0, py).lineTo(widthPx, py);
    }

    this.gridLinesGraphics.stroke({
      width: 1,
      color: 0x000000,
      alpha: 0.12,
    });
  }

  public updateHover(
    gridX: number | null,
    gridY: number | null,
    grid?: Grid
  ): void {
    this.highlightGraphics.clear();

    if (
      gridX === null ||
      gridY === null ||
      (grid && !grid.isValid(gridX, gridY))
    ) {
      return;
    }

    const px = gridX * this.tileSize;
    const py = gridY * this.tileSize;

    this.highlightGraphics
      .rect(px, py, this.tileSize, this.tileSize)
      .fill({ color: 0xffffff, alpha: 0.25 })
      .stroke({ width: 2, color: 0xffffff, alpha: 0.95 });
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}
