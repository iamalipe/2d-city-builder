import { describe, it, expect, beforeEach } from 'vitest';
import { Grid, TileType } from '../src/core/Grid';
import { Economy } from '../src/core/Economy';
import { ToolManager, Tool, TOOL_COSTS } from '../src/core/ToolManager';

describe('Phase 03: Economy & ToolManager Pipeline', () => {
  let grid: Grid;
  let economy: Economy;
  let toolManager: ToolManager;

  beforeEach(() => {
    grid = new Grid(64, 64);
    economy = new Economy(1000);
    toolManager = new ToolManager(grid, economy);
  });

  describe('Economy basic operations', () => {
    it('initializes with default or specified funds', () => {
      const defaultEconomy = new Economy();
      expect(defaultEconomy.funds).toBe(10000);
      expect(economy.funds).toBe(1000);
    });

    it('checks funds availability with hasFunds()', () => {
      expect(economy.hasFunds(500)).toBe(true);
      expect(economy.hasFunds(1000)).toBe(true);
      expect(economy.hasFunds(1001)).toBe(false);
    });

    it('spends money properly and notifies listeners', () => {
      let notifiedFunds = 0;
      economy.subscribe((funds) => {
        notifiedFunds = funds;
      });

      const spent = economy.spend(200);
      expect(spent).toBe(true);
      expect(economy.funds).toBe(800);
      expect(notifiedFunds).toBe(800);
    });

    it('refuses to spend when funds are insufficient', () => {
      const spent = economy.spend(1500);
      expect(spent).toBe(false);
      expect(economy.funds).toBe(1000);
    });

    it('earns money correctly', () => {
      economy.earn(500);
      expect(economy.funds).toBe(1500);
    });
  });

  describe('ToolManager tool application & costs', () => {
    it('starts with Inspect as default tool', () => {
      expect(toolManager.currentTool).toBe(Tool.Inspect);
    });

    it('switches active tools and provides costs', () => {
      toolManager.setTool(Tool.Road);
      expect(toolManager.currentTool).toBe(Tool.Road);
      expect(toolManager.getCost()).toBe(20);

      toolManager.setTool(Tool.Bulldoze);
      expect(toolManager.currentTool).toBe(Tool.Bulldoze);
      expect(toolManager.getCost()).toBe(5);

      toolManager.setTool(Tool.Inspect);
      expect(toolManager.currentTool).toBe(Tool.Inspect);
      expect(toolManager.getCost()).toBe(0);
    });

    it('inspects a tile without altering type or deducting funds', () => {
      toolManager.setTool(Tool.Inspect);
      const initialFunds = economy.funds;

      const success = toolManager.applyTool(0, 0);
      expect(success).toBe(true);
      expect(economy.funds).toBe(initialFunds);
      expect(toolManager.lastInspectedTile?.x).toBe(0);
      expect(toolManager.lastInspectedTile?.y).toBe(0);
    });

    it('places a Road on Grass, changing tile type and deducting $20', () => {
      // Find a grass tile
      let grassX = -1;
      let grassY = -1;
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (grid.getTile(x, y)?.type === TileType.Grass) {
            grassX = x;
            grassY = y;
            break;
          }
        }
        if (grassX !== -1) break;
      }

      toolManager.setTool(Tool.Road);
      const initialFunds = economy.funds;

      const success = toolManager.applyTool(grassX, grassY);
      expect(success).toBe(true);
      expect(grid.getTile(grassX, grassY)?.type).toBe(TileType.Road);
      expect(economy.funds).toBe(initialFunds - TOOL_COSTS[Tool.Road]);
    });

    it('does not re-charge or re-apply Road if tile is already a Road', () => {
      toolManager.setTool(Tool.Road);
      toolManager.applyTool(5, 5); // Assuming (5, 5) was grass
      const fundsAfterFirstRoad = economy.funds;

      const successAgain = toolManager.applyTool(5, 5);
      expect(successAgain).toBe(false);
      expect(economy.funds).toBe(fundsAfterFirstRoad);
    });
  });

  describe('Water rejection', () => {
    let waterX = -1;
    let waterY = -1;

    beforeEach(() => {
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (grid.getTile(x, y)?.type === TileType.Water) {
            waterX = x;
            waterY = y;
            break;
          }
        }
        if (waterX !== -1) break;
      }
    });

    it('prevents building Road on Water tiles and does not deduct funds', () => {
      expect(waterX).toBeGreaterThanOrEqual(0);
      toolManager.setTool(Tool.Road);
      const initialFunds = economy.funds;

      const success = toolManager.applyTool(waterX, waterY);
      expect(success).toBe(false);
      expect(grid.getTile(waterX, waterY)?.type).toBe(TileType.Water);
      expect(economy.funds).toBe(initialFunds);
    });

    it('prevents bulldozing Water tiles and does not deduct funds', () => {
      toolManager.setTool(Tool.Bulldoze);
      const initialFunds = economy.funds;

      const success = toolManager.applyTool(waterX, waterY);
      expect(success).toBe(false);
      expect(grid.getTile(waterX, waterY)?.type).toBe(TileType.Water);
      expect(economy.funds).toBe(initialFunds);
    });
  });

  describe('Bulldozer tool', () => {
    it('bulldozes a Road back to Grass and deducts $5', () => {
      // First place a road
      toolManager.setTool(Tool.Road);
      toolManager.applyTool(8, 8);
      expect(grid.getTile(8, 8)?.type).toBe(TileType.Road);

      const fundsBeforeBulldoze = economy.funds;

      // Now bulldoze it
      toolManager.setTool(Tool.Bulldoze);
      const success = toolManager.applyTool(8, 8);

      expect(success).toBe(true);
      expect(grid.getTile(8, 8)?.type).toBe(TileType.Grass);
      expect(economy.funds).toBe(fundsBeforeBulldoze - TOOL_COSTS[Tool.Bulldoze]);
    });

    it('refuses to bulldoze Grass and does not deduct funds', () => {
      toolManager.setTool(Tool.Bulldoze);
      const initialFunds = economy.funds;

      // (0, 0) is grass
      expect(grid.getTile(0, 0)?.type).toBe(TileType.Grass);
      const success = toolManager.applyTool(0, 0);

      expect(success).toBe(false);
      expect(grid.getTile(0, 0)?.type).toBe(TileType.Grass);
      expect(economy.funds).toBe(initialFunds);
    });
  });

  describe('Insufficient funds rejection', () => {
    it('refuses to build Road if funds are below $20', () => {
      economy.setFunds(15);
      toolManager.setTool(Tool.Road);

      const success = toolManager.applyTool(12, 12);
      expect(success).toBe(false);
      expect(grid.getTile(12, 12)?.type).toBe(TileType.Grass);
      expect(economy.funds).toBe(15);
    });

    it('refuses to Bulldoze if funds are below $5', () => {
      // Place road with enough money first
      economy.setFunds(100);
      toolManager.setTool(Tool.Road);
      toolManager.applyTool(14, 14);

      // Lower funds to $3
      economy.setFunds(3);
      toolManager.setTool(Tool.Bulldoze);

      const success = toolManager.applyTool(14, 14);
      expect(success).toBe(false);
      expect(grid.getTile(14, 14)?.type).toBe(TileType.Road);
      expect(economy.funds).toBe(3);
    });
  });
});
