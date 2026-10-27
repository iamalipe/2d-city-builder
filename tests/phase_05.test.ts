import { describe, it, expect, beforeEach } from 'vitest';
import { Grid, TileType } from '../src/core/Grid';
import { ZoneSystem, ZoneType } from '../src/core/ZoneSystem';
import { RoadSystem } from '../src/core/RoadSystem';
import { ToolManager, Tool } from '../src/core/ToolManager';
import { Economy } from '../src/core/Economy';

describe('Phase 05: ZoneSystem, Rectangular Zoning & 2-Tile Road Restriction', () => {
  let grid: Grid;
  let roadSystem: RoadSystem;
  let zoneSystem: ZoneSystem;
  let economy: Economy;
  let toolManager: ToolManager;

  beforeEach(() => {
    grid = new Grid(64, 64);
    roadSystem = new RoadSystem(grid);
    zoneSystem = new ZoneSystem(grid);
    economy = new Economy(10000);
    toolManager = new ToolManager(grid, economy, roadSystem, zoneSystem);
  });

  describe('Zone basic types and initial state', () => {
    it('defines None, Residential, Commercial, and Industrial zone types', () => {
      expect(ZoneType.None).toBe('None');
      expect(ZoneType.Residential).toBe('Residential');
      expect(ZoneType.Commercial).toBe('Commercial');
      expect(ZoneType.Industrial).toBe('Industrial');
    });

    it('initializes grid tiles with ZoneType.None', () => {
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          expect(zoneSystem.getZone(x, y)).toBe(ZoneType.None);
          expect(grid.getTile(x, y)?.zone).toBe(ZoneType.None);
        }
      }
    });
  });

  describe('2-Tile road distance restriction', () => {
    it('rejects zoning on land far away from any road', () => {
      // (20, 20) has no road nearby
      expect(zoneSystem.isWithinRoadDistance(20, 20, 2)).toBe(false);
      expect(zoneSystem.canZone(20, 20)).toBe(false);

      const success = zoneSystem.setZone(20, 20, ZoneType.Residential);
      expect(success).toBe(false);
      expect(zoneSystem.getZone(20, 20)).toBe(ZoneType.None);
    });

    it('allows zoning within distance 1 and distance 2 from a road', () => {
      // Build an isolated road at (20, 20)
      grid.setTileType(20, 20, TileType.Road);
      roadSystem.updateTileAndNeighbors(20, 20);

      // Distance 1: North (20, 19), South (20, 21), West (19, 20), East (21, 20)
      expect(zoneSystem.canZone(20, 19)).toBe(true);
      expect(zoneSystem.canZone(20, 21)).toBe(true);
      expect(zoneSystem.canZone(19, 20)).toBe(true);
      expect(zoneSystem.canZone(21, 20)).toBe(true);

      // Diagonal distance 1: (21, 19), (21, 21), (19, 19), (19, 21)
      expect(zoneSystem.canZone(21, 21)).toBe(true);

      // Distance 2: North (20, 18), South (20, 22), West (18, 20), East (22, 20)
      expect(zoneSystem.canZone(20, 18)).toBe(true);
      expect(zoneSystem.canZone(20, 22)).toBe(true);
      expect(zoneSystem.canZone(18, 20)).toBe(true);
      expect(zoneSystem.canZone(22, 20)).toBe(true);

      // Diagonal distance 2: (22, 22), (18, 18)
      expect(zoneSystem.canZone(22, 22)).toBe(true);
      expect(zoneSystem.canZone(18, 18)).toBe(true);
    });

    it('strictly forbids zoning at distance 3 or greater', () => {
      // Road at (20, 20)
      grid.setTileType(20, 20, TileType.Road);
      roadSystem.updateTileAndNeighbors(20, 20);

      // Distance 3: (20, 17), (20, 23), (17, 20), (23, 20)
      expect(zoneSystem.isWithinRoadDistance(20, 17, 2)).toBe(false);
      expect(zoneSystem.canZone(20, 17)).toBe(false);

      expect(zoneSystem.isWithinRoadDistance(20, 23, 2)).toBe(false);
      expect(zoneSystem.canZone(20, 23)).toBe(false);

      expect(zoneSystem.isWithinRoadDistance(17, 20, 2)).toBe(false);
      expect(zoneSystem.canZone(17, 20)).toBe(false);

      expect(zoneSystem.isWithinRoadDistance(23, 20, 2)).toBe(false);
      expect(zoneSystem.canZone(23, 20)).toBe(false);
    });

    it('cannot zone on road tiles or water tiles even if road is adjacent', () => {
      // Road at (20, 20)
      grid.setTileType(20, 20, TileType.Road);
      roadSystem.updateTileAndNeighbors(20, 20);

      // Cannot zone the road itself
      expect(zoneSystem.canZone(20, 20)).toBe(false);

      // Make (20, 21) a water tile next to the road
      grid.setTileType(20, 21, TileType.Water);
      expect(zoneSystem.canZone(20, 21)).toBe(false);
    });
  });

  describe('Rectangular zone painting', () => {
    beforeEach(() => {
      // Create a north-south road along column x=10 from y=5 to y=15
      for (let y = 5; y <= 15; y++) {
        grid.setTileType(10, y, TileType.Road);
        roadSystem.updateTileAndNeighbors(10, y);
      }
    });

    it('zones all valid grass tiles in a rectangle within 2 tiles of the road', () => {
      // Paint 5x5 rectangle from (8, 8) to (12, 12) as Residential
      const result = zoneSystem.zoneRect(8, 8, 12, 12, ZoneType.Residential);

      // Column 10 is road, so 5 rows * 5 cols - 5 road tiles = 20 zoneable tiles
      expect(result.successCount).toBe(20);

      // Check grass tiles are now Residential
      expect(zoneSystem.getZone(8, 8)).toBe(ZoneType.Residential);
      expect(zoneSystem.getZone(9, 8)).toBe(ZoneType.Residential);
      expect(zoneSystem.getZone(11, 8)).toBe(ZoneType.Residential);
      expect(zoneSystem.getZone(12, 8)).toBe(ZoneType.Residential);

      // Road tile remains Road and not zoned
      expect(grid.getTile(10, 8)?.type).toBe(TileType.Road);
    });

    it('handles inverted corner coordinates (x1 > x2 or y1 > y2)', () => {
      const result = zoneSystem.zoneRect(12, 12, 8, 8, ZoneType.Commercial);
      expect(result.successCount).toBe(20);
      expect(zoneSystem.getZone(8, 8)).toBe(ZoneType.Commercial);
      expect(zoneSystem.getZone(12, 12)).toBe(ZoneType.Commercial);
    });

    it('skips tiles in the rectangle that exceed the 2-tile road distance', () => {
      // Paint a wide rectangle from x=5 to x=15 at y=10
      // Road is at x=10.
      // x=8, 9, 11, 12 are <= 2 tiles away (4 tiles).
      // x=5, 6, 7 (3 tiles) and x=13, 14, 15 (3 tiles) are > 2 tiles away and must be skipped.
      const result = zoneSystem.zoneRect(5, 10, 15, 10, ZoneType.Industrial);

      expect(result.successCount).toBe(4);
      expect(zoneSystem.getZone(8, 10)).toBe(ZoneType.Industrial);
      expect(zoneSystem.getZone(9, 10)).toBe(ZoneType.Industrial);
      expect(zoneSystem.getZone(11, 10)).toBe(ZoneType.Industrial);
      expect(zoneSystem.getZone(12, 10)).toBe(ZoneType.Industrial);

      // Beyond 2 tiles: untouched
      expect(zoneSystem.getZone(7, 10)).toBe(ZoneType.None);
      expect(zoneSystem.getZone(13, 10)).toBe(ZoneType.None);
    });

    it('allows re-zoning from one zone type to another', () => {
      zoneSystem.setZone(9, 10, ZoneType.Residential);
      expect(zoneSystem.getZone(9, 10)).toBe(ZoneType.Residential);

      zoneSystem.setZone(9, 10, ZoneType.Commercial);
      expect(zoneSystem.getZone(9, 10)).toBe(ZoneType.Commercial);

      zoneSystem.setZone(9, 10, ZoneType.Industrial);
      expect(zoneSystem.getZone(9, 10)).toBe(ZoneType.Industrial);
    });
  });

  describe('ToolManager integration with Economy & Bulldozer', () => {
    beforeEach(() => {
      // Road at (10, 10)
      grid.setTileType(10, 10, TileType.Road);
      roadSystem.updateTileAndNeighbors(10, 10);
    });

    it('charges $100 for zoning and updates tile zone', () => {
      toolManager.setTool(Tool.Residential);
      const initialFunds = economy.funds;

      const success = toolManager.applyTool(10, 9);
      expect(success).toBe(true);
      expect(grid.getTile(10, 9)?.zone).toBe(ZoneType.Residential);
      expect(economy.funds).toBe(initialFunds - 100);
    });

    it('fails to zone if economy has insufficient funds', () => {
      economy.setFunds(50); // Need $100
      toolManager.setTool(Tool.Commercial);

      const success = toolManager.applyTool(10, 9);
      expect(success).toBe(false);
      expect(grid.getTile(10, 9)?.zone).toBe(ZoneType.None);
      expect(economy.funds).toBe(50);
    });

    it('bulldozes a zoned tile, resetting its zone to None and charging $5', () => {
      toolManager.setTool(Tool.Industrial);
      toolManager.applyTool(10, 9);
      expect(grid.getTile(10, 9)?.zone).toBe(ZoneType.Industrial);

      const fundsBeforeBulldoze = economy.funds;
      toolManager.setTool(Tool.Bulldoze);
      const success = toolManager.applyTool(10, 9);

      expect(success).toBe(true);
      expect(grid.getTile(10, 9)?.zone).toBe(ZoneType.None);
      expect(economy.funds).toBe(fundsBeforeBulldoze - 5);
    });

    it('applies rectangular zoning through toolManager and charges total cost', () => {
      const initialFunds = economy.funds;

      // Rectangle covering (9, 9) and (9, 10) next to road at (10, 10)
      const result = toolManager.applyZoneRect(9, 9, 9, 10, ZoneType.Residential);

      expect(result.count).toBe(2);
      expect(result.totalCost).toBe(200);
      expect(economy.funds).toBe(initialFunds - 200);
      expect(grid.getTile(9, 9)?.zone).toBe(ZoneType.Residential);
      expect(grid.getTile(9, 10)?.zone).toBe(ZoneType.Residential);
    });
  });
});
