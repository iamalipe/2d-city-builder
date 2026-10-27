import { describe, it, expect } from 'vitest';
import {
  screenToGrid,
  gridToScreen,
  screenToWorld,
  worldToScreen,
  zoomAtScreenPoint,
  DEFAULT_TILE_SIZE,
} from '../src/core/Coordinates';

describe('Phase 02: Viewport Coordinates & Camera Math', () => {
  describe('Coordinate conversion at 1.0x Zoom', () => {
    const camera = { panX: 0, panY: 0, zoom: 1.0 };

    it('converts grid coordinates to screen coordinates at origin', () => {
      const screenPos = gridToScreen(0, 0, camera);
      expect(screenPos).toEqual({ x: 0, y: 0 });
    });

    it('converts arbitrary grid coordinate (5, 7) to screen position (160, 224)', () => {
      const screenPos = gridToScreen(5, 7, camera);
      expect(screenPos).toEqual({ x: 5 * DEFAULT_TILE_SIZE, y: 7 * DEFAULT_TILE_SIZE });
    });

    it('converts screen coordinate back to exact grid tile', () => {
      const screenX = 5 * DEFAULT_TILE_SIZE;
      const screenY = 7 * DEFAULT_TILE_SIZE;
      const gridPos = screenToGrid(screenX, screenY, camera);
      expect(gridPos).toEqual({ x: 5, y: 7 });
    });

    it('maps interior clicks within the tile boundary to the same grid tile', () => {
      // Offset by half a tile (16px) inside tile (5, 7)
      const gridPos = screenToGrid(160 + 16, 224 + 16, camera);
      expect(gridPos).toEqual({ x: 5, y: 7 });

      // Edge of tile (just before next tile boundary)
      const edgePos = screenToGrid(160 + DEFAULT_TILE_SIZE - 1, 224 + DEFAULT_TILE_SIZE - 1, camera);
      expect(edgePos).toEqual({ x: 5, y: 7 });
    });

    it('respects camera pan offset at 1.0x zoom', () => {
      const pannedCamera = { panX: 120, panY: -40, zoom: 1.0 };
      const screenPos = gridToScreen(3, 4, pannedCamera);
      expect(screenPos).toEqual({
        x: 3 * DEFAULT_TILE_SIZE + 120,
        y: 4 * DEFAULT_TILE_SIZE - 40,
      });

      const gridPos = screenToGrid(screenPos.x, screenPos.y, pannedCamera);
      expect(gridPos).toEqual({ x: 3, y: 4 });
    });
  });

  describe('Coordinate conversion at 2.0x Zoom', () => {
    const camera = { panX: 0, panY: 0, zoom: 2.0 };

    it('doubles the screen dimensions of tiles', () => {
      const screenPos = gridToScreen(2, 3, camera);
      expect(screenPos).toEqual({
        x: 2 * DEFAULT_TILE_SIZE * 2,
        y: 3 * DEFAULT_TILE_SIZE * 2,
      });
    });

    it('correctly maps 2x scaled screen coordinates back to grid coordinates', () => {
      const screenPos = gridToScreen(10, 15, camera);
      const gridPos = screenToGrid(screenPos.x + 30, screenPos.y + 30, camera);
      expect(gridPos).toEqual({ x: 10, y: 15 });
    });

    it('respects camera pan offset under 2.0x zoom', () => {
      const pannedCamera = { panX: 200, panY: 100, zoom: 2.0 };
      const screenPos = gridToScreen(6, 8, pannedCamera);
      expect(screenPos).toEqual({
        x: 6 * DEFAULT_TILE_SIZE * 2 + 200,
        y: 8 * DEFAULT_TILE_SIZE * 2 + 100,
      });

      const gridPos = screenToGrid(screenPos.x + 10, screenPos.y + 10, pannedCamera);
      expect(gridPos).toEqual({ x: 6, y: 8 });
    });
  });

  describe('Coordinate conversion at 0.5x Zoom', () => {
    const camera = { panX: 0, panY: 0, zoom: 0.5 };

    it('halves the screen dimensions of tiles', () => {
      const screenPos = gridToScreen(4, 6, camera);
      expect(screenPos).toEqual({
        x: 4 * DEFAULT_TILE_SIZE * 0.5,
        y: 6 * DEFAULT_TILE_SIZE * 0.5,
      });
    });

    it('correctly maps 0.5x scaled screen coordinates back to grid coordinates', () => {
      const screenPos = gridToScreen(12, 18, camera);
      const gridPos = screenToGrid(screenPos.x + 8, screenPos.y + 8, camera);
      expect(gridPos).toEqual({ x: 12, y: 18 });
    });

    it('respects camera pan offset under 0.5x zoom', () => {
      const pannedCamera = { panX: -50, panY: 80, zoom: 0.5 };
      const screenPos = gridToScreen(7, 9, pannedCamera);
      expect(screenPos).toEqual({
        x: 7 * DEFAULT_TILE_SIZE * 0.5 - 50,
        y: 9 * DEFAULT_TILE_SIZE * 0.5 + 80,
      });

      const gridPos = screenToGrid(screenPos.x, screenPos.y, pannedCamera);
      expect(gridPos).toEqual({ x: 7, y: 9 });
    });
  });

  describe('Cursor-centered zoom invariance', () => {
    it('keeps the world and grid coordinate under the cursor unchanged after zooming', () => {
      const initialCamera = { panX: 150, panY: 80, zoom: 1.0 };
      const cursorScreenX = 400;
      const cursorScreenY = 300;

      // Tile under cursor before zoom
      const beforeGrid = screenToGrid(cursorScreenX, cursorScreenY, initialCamera);
      const beforeWorld = screenToWorld(cursorScreenX, cursorScreenY, initialCamera);

      // Zoom in to 2.0x centered on cursor
      const zoomedCamera = zoomAtScreenPoint(
        cursorScreenX,
        cursorScreenY,
        initialCamera.zoom,
        2.0,
        initialCamera.panX,
        initialCamera.panY
      );

      // Verify new zoom level
      expect(zoomedCamera.zoom).toBe(2.0);

      // Tile under cursor after zoom must be identical
      const afterGrid = screenToGrid(cursorScreenX, cursorScreenY, zoomedCamera);
      const afterWorld = screenToWorld(cursorScreenX, cursorScreenY, zoomedCamera);

      expect(afterGrid).toEqual(beforeGrid);
      expect(afterWorld.x).toBeCloseTo(beforeWorld.x, 5);
      expect(afterWorld.y).toBeCloseTo(beforeWorld.y, 5);

      // Screen conversion of that world position under the new camera must match the cursor screen pos
      const cursorCheck = worldToScreen(afterWorld.x, afterWorld.y, zoomedCamera);
      expect(cursorCheck.x).toBeCloseTo(cursorScreenX, 5);
      expect(cursorCheck.y).toBeCloseTo(cursorScreenY, 5);
    });

    it('works correctly when zooming out from 1.0x to 0.5x', () => {
      const initialCamera = { panX: -100, panY: 250, zoom: 1.0 };
      const cursorScreenX = 550;
      const cursorScreenY = 350;

      const beforeGrid = screenToGrid(cursorScreenX, cursorScreenY, initialCamera);
      const beforeWorld = screenToWorld(cursorScreenX, cursorScreenY, initialCamera);

      const zoomedOutCamera = zoomAtScreenPoint(
        cursorScreenX,
        cursorScreenY,
        initialCamera.zoom,
        0.5,
        initialCamera.panX,
        initialCamera.panY
      );

      expect(zoomedOutCamera.zoom).toBe(0.5);

      const afterGrid = screenToGrid(cursorScreenX, cursorScreenY, zoomedOutCamera);
      const afterWorld = screenToWorld(cursorScreenX, cursorScreenY, zoomedOutCamera);

      expect(afterGrid).toEqual(beforeGrid);
      expect(afterWorld.x).toBeCloseTo(beforeWorld.x, 5);
      expect(afterWorld.y).toBeCloseTo(beforeWorld.y, 5);
    });
  });
});
