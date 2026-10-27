import { Container, Graphics } from 'pixi.js';
import { type Grid, TileType } from '../core/Grid';
import { type RoadSystem } from '../core/RoadSystem';
import { DEFAULT_TILE_SIZE } from '../core/Coordinates';

export class RoadRenderer {
  public readonly container: Container;
  private sidewalkGraphics: Graphics;
  private asphaltGraphics: Graphics;
  private zebraGraphics: Graphics;
  private centerlineGraphics: Graphics;
  private tileSize: number;

  constructor(tileSize: number = DEFAULT_TILE_SIZE) {
    this.tileSize = tileSize;
    this.container = new Container();

    this.sidewalkGraphics = new Graphics();
    this.asphaltGraphics = new Graphics();
    this.zebraGraphics = new Graphics();
    this.centerlineGraphics = new Graphics();

    this.container.addChild(this.sidewalkGraphics);
    this.container.addChild(this.asphaltGraphics);
    this.container.addChild(this.zebraGraphics);
    this.container.addChild(this.centerlineGraphics);
  }

  public render(grid: Grid, roadSystem: RoadSystem): void {
    this.clear();

    const half = this.tileSize / 2;
    const asphaltR = 9;   // 18px wide asphalt lane
    const sidewalkR = 12; // 24px wide sidewalk (3px border around asphalt)

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.tiles[y][x];
        if (tile.type !== TileType.Road) {
          continue;
        }

        const mask = roadSystem.getBitmask(x, y);
        const tx = x * this.tileSize;
        const ty = y * this.tileSize;
        const cx = tx + half;
        const cy = ty + half;

        this.renderRoadTileBase(mask, tx, ty, cx, cy, half, asphaltR, sidewalkR);
        this.renderCrosswalksAndLines(mask, tx, ty, cx, cy, roadSystem);
      }
    }

    // Apply fills and strokes in batches
    this.sidewalkGraphics.fill({ color: 0x94a3b8 });
    this.asphaltGraphics.fill({ color: 0x1e293b });
    this.zebraGraphics.fill({ color: 0xffffff, alpha: 0.95 });
    this.centerlineGraphics.stroke({
      width: 2,
      color: 0xf59e0b,
      alpha: 0.9,
    });
  }

  private renderRoadTileBase(
    mask: number,
    tx: number,
    ty: number,
    cx: number,
    cy: number,
    half: number,
    asphaltR: number,
    sidewalkR: number
  ): void {
    if (mask === 0) {
      // Isolated road tile
      this.sidewalkGraphics.roundRect(
        cx - sidewalkR,
        cy - sidewalkR,
        sidewalkR * 2,
        sidewalkR * 2,
        4
      );
      this.asphaltGraphics.roundRect(
        cx - asphaltR,
        cy - asphaltR,
        asphaltR * 2,
        asphaltR * 2,
        3
      );
      return;
    }

    // Center hub
    this.sidewalkGraphics.rect(
      cx - sidewalkR,
      cy - sidewalkR,
      sidewalkR * 2,
      sidewalkR * 2
    );
    this.asphaltGraphics.rect(
      cx - asphaltR,
      cy - asphaltR,
      asphaltR * 2,
      asphaltR * 2
    );

    // North arm (N = 1)
    if (mask & 1) {
      this.sidewalkGraphics.rect(cx - sidewalkR, ty, sidewalkR * 2, half);
      this.asphaltGraphics.rect(cx - asphaltR, ty, asphaltR * 2, half);
    }

    // East arm (E = 2)
    if (mask & 2) {
      this.sidewalkGraphics.rect(cx, cy - sidewalkR, half, sidewalkR * 2);
      this.asphaltGraphics.rect(cx, cy - asphaltR, half, asphaltR * 2);
    }

    // South arm (S = 4)
    if (mask & 4) {
      this.sidewalkGraphics.rect(cx - sidewalkR, cy, sidewalkR * 2, half);
      this.asphaltGraphics.rect(cx - asphaltR, cy, asphaltR * 2, half);
    }

    // West arm (W = 8)
    if (mask & 8) {
      this.sidewalkGraphics.rect(tx, cy - sidewalkR, half, sidewalkR * 2);
      this.asphaltGraphics.rect(tx, cy - asphaltR, half, asphaltR * 2);
    }
  }

  private renderCrosswalksAndLines(
    mask: number,
    tx: number,
    ty: number,
    cx: number,
    cy: number,
    roadSystem: RoadSystem
  ): void {
    const isIntersection = roadSystem.isIntersection(mask);

    if (isIntersection) {
      // Draw white zebra crosswalk stripes at each connected intersection arm
      const stripeOffsets = [-6, -2, 2, 6];

      // North crosswalk
      if (mask & 1) {
        for (const ox of stripeOffsets) {
          this.zebraGraphics.rect(cx + ox - 1, ty + 2, 2, 5);
        }
        this.centerlineGraphics.moveTo(cx, ty + 7).lineTo(cx, cy - 4);
      }

      // East crosswalk
      if (mask & 2) {
        for (const oy of stripeOffsets) {
          this.zebraGraphics.rect(tx + this.tileSize - 7, cy + oy - 1, 5, 2);
        }
        this.centerlineGraphics.moveTo(tx + this.tileSize - 7, cy).lineTo(cx + 4, cy);
      }

      // South crosswalk
      if (mask & 4) {
        for (const ox of stripeOffsets) {
          this.zebraGraphics.rect(cx + ox - 1, ty + this.tileSize - 7, 2, 5);
        }
        this.centerlineGraphics.moveTo(cx, ty + this.tileSize - 7).lineTo(cx, cy + 4);
      }

      // West crosswalk
      if (mask & 8) {
        for (const oy of stripeOffsets) {
          this.zebraGraphics.rect(tx + 2, cy + oy - 1, 5, 2);
        }
        this.centerlineGraphics.moveTo(tx + 7, cy).lineTo(cx - 4, cy);
      }

      return;
    }

    // Smooth corners (mask 3: NE, 6: ES, 12: SW, 9: WN)
    if (mask === 3) {
      // North-East corner
      this.centerlineGraphics
        .moveTo(cx, ty)
        .quadraticCurveTo(cx, cy, tx + this.tileSize, cy);
      return;
    }
    if (mask === 6) {
      // East-South corner
      this.centerlineGraphics
        .moveTo(tx + this.tileSize, cy)
        .quadraticCurveTo(cx, cy, cx, ty + this.tileSize);
      return;
    }
    if (mask === 12) {
      // South-West corner
      this.centerlineGraphics
        .moveTo(cx, ty + this.tileSize)
        .quadraticCurveTo(cx, cy, tx, cy);
      return;
    }
    if (mask === 9) {
      // West-North corner
      this.centerlineGraphics
        .moveTo(tx, cy)
        .quadraticCurveTo(cx, cy, cx, ty);
      return;
    }

    // Straight roads (5: N-S, 10: E-W)
    if (mask === 5) {
      this.centerlineGraphics.moveTo(cx, ty).lineTo(cx, ty + this.tileSize);
      return;
    }
    if (mask === 10) {
      this.centerlineGraphics.moveTo(tx, cy).lineTo(tx + this.tileSize, cy);
      return;
    }

    // Dead-end roads (1: N, 2: E, 4: S, 8: W)
    if (mask === 1) {
      this.centerlineGraphics.moveTo(cx, ty).lineTo(cx, cy);
      return;
    }
    if (mask === 2) {
      this.centerlineGraphics.moveTo(tx + this.tileSize, cy).lineTo(cx, cy);
      return;
    }
    if (mask === 4) {
      this.centerlineGraphics.moveTo(cx, ty + this.tileSize).lineTo(cx, cy);
      return;
    }
    if (mask === 8) {
      this.centerlineGraphics.moveTo(tx, cy).lineTo(cx, cy);
      return;
    }

    // Isolated (mask === 0)
    if (mask === 0) {
      this.centerlineGraphics.rect(cx - 2, cy - 2, 4, 4);
    }
  }

  public clear(): void {
    this.sidewalkGraphics.clear();
    this.asphaltGraphics.clear();
    this.zebraGraphics.clear();
    this.centerlineGraphics.clear();
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}
