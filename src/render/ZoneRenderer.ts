import { Container, Graphics } from 'pixi.js';
import { type Grid } from '../core/Grid';
import { ZoneType } from '../core/ZoneSystem';
import { DEFAULT_TILE_SIZE } from '../core/Coordinates';

export class ZoneRenderer {
  public readonly container: Container;
  private residentialGraphics: Graphics;
  private commercialGraphics: Graphics;
  private industrialGraphics: Graphics;
  private selectionGraphics: Graphics;
  private tileSize: number;

  constructor(tileSize: number = DEFAULT_TILE_SIZE) {
    this.tileSize = tileSize;
    this.container = new Container();

    this.residentialGraphics = new Graphics();
    this.commercialGraphics = new Graphics();
    this.industrialGraphics = new Graphics();
    this.selectionGraphics = new Graphics();

    this.container.addChild(this.residentialGraphics);
    this.container.addChild(this.commercialGraphics);
    this.container.addChild(this.industrialGraphics);
    this.container.addChild(this.selectionGraphics);
  }

  public render(grid: Grid): void {
    this.residentialGraphics.clear();
    this.commercialGraphics.clear();
    this.industrialGraphics.clear();

    const inset = 1;
    const size = this.tileSize - inset * 2;

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.tiles[y][x];
        if (!tile.zone || tile.zone === ZoneType.None) {
          continue;
        }

        const px = x * this.tileSize + inset;
        const py = y * this.tileSize + inset;

        if (tile.zone === ZoneType.Residential) {
          this.residentialGraphics.rect(px, py, size, size);
        } else if (tile.zone === ZoneType.Commercial) {
          this.commercialGraphics.rect(px, py, size, size);
        } else if (tile.zone === ZoneType.Industrial) {
          this.industrialGraphics.rect(px, py, size, size);
        }
      }
    }

    // Semi-transparent Green overlay for Residential
    this.residentialGraphics.fill({ color: 0x22c55e, alpha: 0.45 });
    this.residentialGraphics.stroke({ width: 1, color: 0x15803d, alpha: 0.7 });

    // Semi-transparent Blue overlay for Commercial
    this.commercialGraphics.fill({ color: 0x3b82f6, alpha: 0.45 });
    this.commercialGraphics.stroke({ width: 1, color: 0x1d4ed8, alpha: 0.7 });

    // Semi-transparent Yellow overlay for Industrial
    this.industrialGraphics.fill({ color: 0xeab308, alpha: 0.45 });
    this.industrialGraphics.stroke({ width: 1, color: 0xa16207, alpha: 0.7 });
  }

  public setSelectionBox(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    zone: ZoneType = ZoneType.Residential
  ): void {
    this.selectionGraphics.clear();

    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    const px = minX * this.tileSize;
    const py = minY * this.tileSize;
    const w = (maxX - minX + 1) * this.tileSize;
    const h = (maxY - minY + 1) * this.tileSize;

    let color = 0x22c55e;
    let strokeColor = 0x4ade80;
    if (zone === ZoneType.Commercial) {
      color = 0x3b82f6;
      strokeColor = 0x60a5fa;
    } else if (zone === ZoneType.Industrial) {
      color = 0xeab308;
      strokeColor = 0xfacc15;
    }

    this.selectionGraphics
      .rect(px, py, w, h)
      .fill({ color, alpha: 0.25 })
      .stroke({ width: 2, color: strokeColor, alpha: 0.95 });
  }

  public clearSelectionBox(): void {
    this.selectionGraphics.clear();
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}
