import { describe, it, expect } from 'vitest';
import { Grid, TileType } from '../src/core/Grid';

describe('Phase 01: 64x64 Grid & Procedural River Generation', () => {
  describe('Grid bounds & dimensions', () => {
    it('creates a 64x64 grid by default', () => {
      const grid = new Grid();
      expect(grid.width).toBe(64);
      expect(grid.height).toBe(64);
      expect(grid.tiles.length).toBe(64);
      expect(grid.tiles[0].length).toBe(64);
    });

    it('correctly identifies valid and invalid coordinates with isValid()', () => {
      const grid = new Grid();
      expect(grid.isValid(0, 0)).toBe(true);
      expect(grid.isValid(63, 63)).toBe(true);
      expect(grid.isValid(32, 16)).toBe(true);

      // Out of bounds
      expect(grid.isValid(-1, 0)).toBe(false);
      expect(grid.isValid(0, -1)).toBe(false);
      expect(grid.isValid(64, 0)).toBe(false);
      expect(grid.isValid(0, 64)).toBe(false);
      expect(grid.isValid(64, 64)).toBe(false);
      expect(grid.isValid(100, 100)).toBe(false);

      // Non-integers
      expect(grid.isValid(0.5, 0)).toBe(false);
      expect(grid.isValid(0, 1.2)).toBe(false);
    });

    it('returns the tile at valid coordinates and null for out of bounds with getTile()', () => {
      const grid = new Grid();
      const tile = grid.getTile(5, 10);
      expect(tile).not.toBeNull();
      expect(tile?.x).toBe(5);
      expect(tile?.y).toBe(10);

      expect(grid.getTile(-1, 0)).toBeNull();
      expect(grid.getTile(0, 64)).toBeNull();
      expect(grid.getTile(100, 100)).toBeNull();
    });
  });

  describe('Water placement and procedural river', () => {
    it('populates the map with Water and Grass tiles only', () => {
      const grid = new Grid();
      const totalTiles = grid.width * grid.height;
      const waterCount = grid.countTilesByType(TileType.Water);
      const grassCount = grid.countTilesByType(TileType.Grass);

      expect(waterCount).toBeGreaterThan(64);
      expect(grassCount).toBeGreaterThan(3000);
      expect(waterCount + grassCount).toBe(totalTiles);
    });

    it('generates a river that traverses across the entire map from west to east', () => {
      const grid = new Grid();

      // Ensure every single column from x=0 to x=63 contains at least one water tile
      for (let x = 0; x < grid.width; x++) {
        let hasWaterInColumn = false;
        for (let y = 0; y < grid.height; y++) {
          if (grid.getTile(x, y)?.type === TileType.Water) {
            hasWaterInColumn = true;
            break;
          }
        }
        expect(hasWaterInColumn).toBe(true);
      }
    });

    it('ensures the river is connected across adjacent columns without gaps', () => {
      const grid = new Grid();

      for (let x = 0; x < grid.width - 1; x++) {
        // Collect all water y coordinates for column x and x+1
        const waterYCol1: number[] = [];
        const waterYCol2: number[] = [];

        for (let y = 0; y < grid.height; y++) {
          if (grid.getTile(x, y)?.type === TileType.Water) {
            waterYCol1.push(y);
          }
          if (grid.getTile(x + 1, y)?.type === TileType.Water) {
            waterYCol2.push(y);
          }
        }

        // Check that at least one water tile in column x is adjacent (distance <= 1) to a water tile in column x+1
        const isConnected = waterYCol1.some((y1) =>
          waterYCol2.some((y2) => Math.abs(y1 - y2) <= 1)
        );
        expect(isConnected).toBe(true);
      }
    });
  });

  describe('Neighbor lookups with getNeighbors()', () => {
    it('returns 4 orthogonal neighbors for an interior tile by default', () => {
      const grid = new Grid();
      const neighbors = grid.getNeighbors(10, 10);
      expect(neighbors.length).toBe(4);

      const coords = neighbors.map((n) => ({ x: n.x, y: n.y }));
      expect(coords).toContainEqual({ x: 10, y: 9 });  // North
      expect(coords).toContainEqual({ x: 11, y: 10 }); // East
      expect(coords).toContainEqual({ x: 10, y: 11 }); // South
      expect(coords).toContainEqual({ x: 9, y: 10 });  // West
    });

    it('returns 8 neighbors for an interior tile when includeDiagonals is true', () => {
      const grid = new Grid();
      const neighbors = grid.getNeighbors(10, 10, true);
      expect(neighbors.length).toBe(8);

      const coords = neighbors.map((n) => ({ x: n.x, y: n.y }));
      expect(coords).toContainEqual({ x: 10, y: 9 });
      expect(coords).toContainEqual({ x: 11, y: 10 });
      expect(coords).toContainEqual({ x: 10, y: 11 });
      expect(coords).toContainEqual({ x: 9, y: 10 });
      expect(coords).toContainEqual({ x: 9, y: 9 });
      expect(coords).toContainEqual({ x: 11, y: 9 });
      expect(coords).toContainEqual({ x: 9, y: 11 });
      expect(coords).toContainEqual({ x: 11, y: 11 });
    });

    it('handles corners properly without going out of bounds', () => {
      const grid = new Grid();

      // Top-Left corner (0, 0)
      const topLeft = grid.getNeighbors(0, 0);
      expect(topLeft.length).toBe(2);
      expect(topLeft.map((n) => ({ x: n.x, y: n.y }))).toEqual([
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ]);

      const topLeftDiag = grid.getNeighbors(0, 0, true);
      expect(topLeftDiag.length).toBe(3);
      expect(topLeftDiag.map((n) => ({ x: n.x, y: n.y }))).toContainEqual({
        x: 1,
        y: 1,
      });

      // Bottom-Right corner (63, 63)
      const bottomRight = grid.getNeighbors(63, 63);
      expect(bottomRight.length).toBe(2);
      expect(bottomRight.map((n) => ({ x: n.x, y: n.y }))).toContainEqual({
        x: 63,
        y: 62,
      });
      expect(bottomRight.map((n) => ({ x: n.x, y: n.y }))).toContainEqual({
        x: 62,
        y: 63,
      });
    });

    it('handles edges properly without going out of bounds', () => {
      const grid = new Grid();

      // Left edge (0, 10)
      const leftEdge = grid.getNeighbors(0, 10);
      expect(leftEdge.length).toBe(3);

      const leftEdgeDiag = grid.getNeighbors(0, 10, true);
      expect(leftEdgeDiag.length).toBe(5);
    });

    it('returns empty array when called on invalid coordinates', () => {
      const grid = new Grid();
      expect(grid.getNeighbors(-1, -1)).toEqual([]);
      expect(grid.getNeighbors(100, 100)).toEqual([]);
    });
  });
});
