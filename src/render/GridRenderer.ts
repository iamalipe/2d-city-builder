import { Container, Graphics } from 'pixi.js';
import { type Grid, TileType } from '../core/Grid';
import { RoadSystem } from '../core/RoadSystem';
import { DEFAULT_TILE_SIZE } from '../core/Coordinates';
import { RoadRenderer } from './RoadRenderer';

export class GridRenderer {
  public readonly container: Container;
  public readonly roadRenderer: RoadRenderer;
  private terrainGraphics: Graphics;
  private gridLinesGraphics: Graphics;
  private highlightGraphics: Graphics;
  private tileSize: number;

  constructor(tileSize: number = DEFAULT_TILE_SIZE) {
    this.tileSize = tileSize;
    this.container = new Container();

    this.terrainGraphics = new Graphics();
    this.roadRenderer = new RoadRenderer(this.tileSize);
    this.gridLinesGraphics = new Graphics();
    this.highlightGraphics = new Graphics();

    this.container.addChild(this.terrainGraphics);
    this.container.addChild(this.roadRenderer.container);
    this.container.addChild(this.gridLinesGraphics);
    this.container.addChild(this.highlightGraphics);
  }

  public render(grid: Grid, roadSystem?: RoadSystem): void {
    const rs = roadSystem ?? new RoadSystem(grid);
    this.renderTerrain(grid);
    this.roadRenderer.render(grid, rs);
    this.renderGridLines(grid);
  }

  private renderTerrain(grid: Grid): void {
    this.terrainGraphics.clear();

    const grassTiles: { x: number; y: number }[] = [];
    const waterTiles: { x: number; y: number }[] = [];

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.tiles[y][x];
        if (tile.type === TileType.Water) {
          waterTiles.push({ x, y });
        } else {
          // Grass is rendered under all land (including roads for clean edges)
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

    // White selection box on hover
    this.highlightGraphics
      .rect(px, py, this.tileSize, this.tileSize)
      .fill({ color: 0xffffff, alpha: 0.25 })
      .stroke({ width: 2, color: 0xffffff, alpha: 0.95 });
  }

  public destroy(): void {
    this.roadRenderer.destroy();
    this.container.destroy({ children: true });
  }
}
