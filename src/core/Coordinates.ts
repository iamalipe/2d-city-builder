export const DEFAULT_TILE_SIZE = 32;

export interface CameraState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: CameraState
): Point2D {
  return {
    x: (screenX - camera.panX) / camera.zoom,
    y: (screenY - camera.panY) / camera.zoom,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: CameraState
): Point2D {
  return {
    x: worldX * camera.zoom + camera.panX,
    y: worldY * camera.zoom + camera.panY,
  };
}

export function worldToGrid(
  worldX: number,
  worldY: number,
  tileSize: number = DEFAULT_TILE_SIZE
): Point2D {
  return {
    x: Math.floor(worldX / tileSize),
    y: Math.floor(worldY / tileSize),
  };
}

export function gridToWorld(
  gridX: number,
  gridY: number,
  tileSize: number = DEFAULT_TILE_SIZE
): Point2D {
  return {
    x: gridX * tileSize,
    y: gridY * tileSize,
  };
}

export function screenToGrid(
  screenX: number,
  screenY: number,
  camera: CameraState,
  tileSize: number = DEFAULT_TILE_SIZE
): Point2D {
  const world = screenToWorld(screenX, screenY, camera);
  return worldToGrid(world.x, world.y, tileSize);
}

export function gridToScreen(
  gridX: number,
  gridY: number,
  camera: CameraState,
  tileSize: number = DEFAULT_TILE_SIZE
): Point2D {
  const world = gridToWorld(gridX, gridY, tileSize);
  return worldToScreen(world.x, world.y, camera);
}

export function zoomAtScreenPoint(
  screenX: number,
  screenY: number,
  currentZoom: number,
  targetZoom: number,
  panX: number,
  panY: number
): CameraState {
  const worldX = (screenX - panX) / currentZoom;
  const worldY = (screenY - panY) / currentZoom;
  return {
    zoom: targetZoom,
    panX: screenX - worldX * targetZoom,
    panY: screenY - worldY * targetZoom,
  };
}
