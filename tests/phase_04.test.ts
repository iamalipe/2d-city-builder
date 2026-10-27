import { describe, it, expect, beforeEach } from 'vitest';
import { Grid, TileType } from '../src/core/Grid';
import { RoadSystem, RoadDirection } from '../src/core/RoadSystem';
import { ToolManager, Tool } from '../src/core/ToolManager';
import { Economy } from '../src/core/Economy';

describe('Phase 04: RoadSystem 4-Bit Directional Bitmasks', () => {
  let grid: Grid;
  let roadSystem: RoadSystem;
  let economy: Economy;
  let toolManager: ToolManager;

  beforeEach(() => {
    grid = new Grid(64, 64);
    roadSystem = new RoadSystem(grid);
    economy = new Economy(10000);
    toolManager = new ToolManager(grid, economy, roadSystem);
  });

  describe('Directional bitflag constants', () => {
    it('defines correct 4-bit values: N=1, E=2, S=4, W=8', () => {
      expect(RoadDirection.NORTH).toBe(1);
      expect(RoadDirection.EAST).toBe(2);
      expect(RoadDirection.SOUTH).toBe(4);
      expect(RoadDirection.WEST).toBe(8);
    });
  });

  describe('Road placement and bitmask calculations', () => {
    it('calculates bitmask 0 for an isolated road tile', () => {
      grid.setTileType(10, 10, TileType.Road);
      roadSystem.updateTileAndNeighbors(10, 10);

      expect(roadSystem.getBitmask(10, 10)).toBe(0);
      expect(grid.getTile(10, 10)?.roadMask).toBe(0);

      // Orthogonal neighbors are still grass and bitmask 0
      expect(roadSystem.getBitmask(10, 9)).toBe(0);
      expect(roadSystem.getBitmask(11, 10)).toBe(0);
      expect(roadSystem.getBitmask(10, 11)).toBe(0);
      expect(roadSystem.getBitmask(9, 10)).toBe(0);
    });

    it('calculates dead-end bitmasks when two roads connect', () => {
      grid.setTileType(10, 10, TileType.Road);
      roadSystem.updateTileAndNeighbors(10, 10);

      // Place road to the North at (10, 9)
      grid.setTileType(10, 9, TileType.Road);
      roadSystem.updateTileAndNeighbors(10, 9);

      // (10, 10) connects North -> 1
      expect(roadSystem.getBitmask(10, 10)).toBe(RoadDirection.NORTH); // 1
      // (10, 9) connects South -> 4
      expect(roadSystem.getBitmask(10, 9)).toBe(RoadDirection.SOUTH); // 4
    });

    it('calculates straight road bitmasks (N-S = 5, E-W = 10)', () => {
      // Build vertical road: (10, 9), (10, 10), (10, 11)
      grid.setTileType(10, 9, TileType.Road);
      grid.setTileType(10, 10, TileType.Road);
      grid.setTileType(10, 11, TileType.Road);
      roadSystem.updateTileAndNeighbors(10, 9);
      roadSystem.updateTileAndNeighbors(10, 10);
      roadSystem.updateTileAndNeighbors(10, 11);

      expect(roadSystem.getBitmask(10, 10)).toBe(
        RoadDirection.NORTH | RoadDirection.SOUTH
      ); // 1 | 4 = 5
      expect(roadSystem.isStraight(roadSystem.getBitmask(10, 10))).toBe(true);

      // Build horizontal road: (20, 20), (21, 20), (22, 20)
      grid.setTileType(20, 20, TileType.Road);
      grid.setTileType(21, 20, TileType.Road);
      grid.setTileType(22, 20, TileType.Road);
      roadSystem.updateTileAndNeighbors(20, 20);
      roadSystem.updateTileAndNeighbors(21, 20);
      roadSystem.updateTileAndNeighbors(22, 20);

      expect(roadSystem.getBitmask(21, 20)).toBe(
        RoadDirection.EAST | RoadDirection.WEST
      ); // 2 | 8 = 10
      expect(roadSystem.isStraight(roadSystem.getBitmask(21, 20))).toBe(true);
    });

    it('calculates all 4 corner bitmasks: NE (3), ES (6), SW (12), WN (9)', () => {
      // 1. NE Corner (30, 30) with North (30, 29) and East (31, 30)
      grid.setTileType(30, 29, TileType.Road);
      grid.setTileType(30, 30, TileType.Road);
      grid.setTileType(31, 30, TileType.Road);
      roadSystem.updateTileAndNeighbors(30, 30);
      expect(roadSystem.getBitmask(30, 30)).toBe(
        RoadDirection.NORTH | RoadDirection.EAST
      ); // 3
      expect(roadSystem.isCorner(3)).toBe(true);

      // 2. ES Corner (35, 30) with East (36, 30) and South (35, 31)
      grid.setTileType(36, 30, TileType.Road);
      grid.setTileType(35, 30, TileType.Road);
      grid.setTileType(35, 31, TileType.Road);
      roadSystem.updateTileAndNeighbors(35, 30);
      expect(roadSystem.getBitmask(35, 30)).toBe(
        RoadDirection.EAST | RoadDirection.SOUTH
      ); // 6
      expect(roadSystem.isCorner(6)).toBe(true);

      // 3. SW Corner (40, 30) with South (40, 31) and West (39, 30)
      grid.setTileType(40, 31, TileType.Road);
      grid.setTileType(40, 30, TileType.Road);
      grid.setTileType(39, 30, TileType.Road);
      roadSystem.updateTileAndNeighbors(40, 30);
      expect(roadSystem.getBitmask(40, 30)).toBe(
        RoadDirection.SOUTH | RoadDirection.WEST
      ); // 12
      expect(roadSystem.isCorner(12)).toBe(true);

      // 4. WN Corner (45, 30) with West (44, 30) and North (45, 29)
      grid.setTileType(44, 30, TileType.Road);
      grid.setTileType(45, 30, TileType.Road);
      grid.setTileType(45, 29, TileType.Road);
      roadSystem.updateTileAndNeighbors(45, 30);
      expect(roadSystem.getBitmask(45, 30)).toBe(
        RoadDirection.WEST | RoadDirection.NORTH
      ); // 9
      expect(roadSystem.isCorner(9)).toBe(true);
    });

    it('calculates 3-way T-junction bitmasks and identifies them as intersections', () => {
      // (10, 10) connected to North (10, 9), South (10, 11), East (11, 10)
      grid.setTileType(10, 9, TileType.Road);
      grid.setTileType(10, 10, TileType.Road);
      grid.setTileType(10, 11, TileType.Road);
      grid.setTileType(11, 10, TileType.Road);

      roadSystem.updateTileAndNeighbors(10, 9);
      roadSystem.updateTileAndNeighbors(10, 10);
      roadSystem.updateTileAndNeighbors(10, 11);
      roadSystem.updateTileAndNeighbors(11, 10);

      const mask = roadSystem.getBitmask(10, 10);
      expect(mask).toBe(
        RoadDirection.NORTH | RoadDirection.EAST | RoadDirection.SOUTH
      ); // 1 | 2 | 4 = 7
      expect(roadSystem.isIntersection(mask)).toBe(true);
      expect(roadSystem.getBitmask(11, 10)).toBe(RoadDirection.WEST); // 8
    });

    it('calculates 4-way cross intersection bitmask (15)', () => {
      // (10, 10) connected to North, East, South, West
      grid.setTileType(10, 9, TileType.Road);
      grid.setTileType(10, 10, TileType.Road);
      grid.setTileType(10, 11, TileType.Road);
      grid.setTileType(11, 10, TileType.Road);
      grid.setTileType(9, 10, TileType.Road);

      roadSystem.updateTileAndNeighbors(10, 10);
      roadSystem.updateTileAndNeighbors(9, 10);

      const mask = roadSystem.getBitmask(10, 10);
      expect(mask).toBe(15);
      expect(roadSystem.isIntersection(mask)).toBe(true);
      expect(roadSystem.getBitmask(9, 10)).toBe(RoadDirection.EAST); // 2
    });
  });

  describe('Bulldozing and neighbor bitmask propagation', () => {
    beforeEach(() => {
      // Setup a 4-way intersection centered at (10, 10)
      grid.setTileType(10, 9, TileType.Road);
      grid.setTileType(10, 10, TileType.Road);
      grid.setTileType(10, 11, TileType.Road);
      grid.setTileType(11, 10, TileType.Road);
      grid.setTileType(9, 10, TileType.Road);
      roadSystem.updateTileAndNeighbors(10, 10);
    });

    it('updates center tile to 0 and neighbor bitmasks when a neighbor is bulldozed', () => {
      expect(roadSystem.getBitmask(10, 10)).toBe(15);

      // Bulldoze North road at (10, 9)
      grid.setTileType(10, 9, TileType.Grass);
      roadSystem.updateTileAndNeighbors(10, 9);

      // (10, 9) is now grass with bitmask 0
      expect(roadSystem.getBitmask(10, 9)).toBe(0);

      // (10, 10) North bit (1) must be cleared, leaving E (2) | S (4) | W (8) = 14
      expect(roadSystem.getBitmask(10, 10)).toBe(
        RoadDirection.EAST | RoadDirection.SOUTH | RoadDirection.WEST
      ); // 14
      expect(roadSystem.isIntersection(14)).toBe(true);
    });

    it('clears all neighbor bitmasks when the center intersection tile is bulldozed', () => {
      // Bulldoze the center tile (10, 10)
      grid.setTileType(10, 10, TileType.Grass);
      roadSystem.updateTileAndNeighbors(10, 10);

      // Center is 0
      expect(roadSystem.getBitmask(10, 10)).toBe(0);

      // All 4 neighbors lose their connection to (10, 10) and become isolated dead ends (bitmask 0)
      expect(roadSystem.getBitmask(10, 9)).toBe(0);
      expect(roadSystem.getBitmask(11, 10)).toBe(0);
      expect(roadSystem.getBitmask(10, 11)).toBe(0);
      expect(roadSystem.getBitmask(9, 10)).toBe(0);
    });
  });

  describe('ToolManager road and bulldoze actions update bitmasks automatically', () => {
    it('updates bitmasks through toolManager.applyTool()', () => {
      toolManager.setTool(Tool.Road);

      // Place road at (5, 5)
      toolManager.applyTool(5, 5);
      expect(roadSystem.getBitmask(5, 5)).toBe(0);

      // Place road at (6, 5) (East of 5, 5)
      toolManager.applyTool(6, 5);
      expect(roadSystem.getBitmask(5, 5)).toBe(RoadDirection.EAST); // 2
      expect(roadSystem.getBitmask(6, 5)).toBe(RoadDirection.WEST); // 8

      // Bulldoze (6, 5)
      toolManager.setTool(Tool.Bulldoze);
      toolManager.applyTool(6, 5);

      expect(roadSystem.getBitmask(6, 5)).toBe(0);
      expect(roadSystem.getBitmask(5, 5)).toBe(0);
    });
  });
});
