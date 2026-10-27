import { type Container } from 'pixi.js';
import { type CameraState, zoomAtScreenPoint } from '../core/Coordinates';

export interface CameraOptions {
  minZoom?: number;
  maxZoom?: number;
  panSpeed?: number;
}

export class CameraController {
  public camera: CameraState;
  public minZoom: number;
  public maxZoom: number;
  public panSpeed: number;

  private isDragging: boolean = false;
  private dragStartPointer = { x: 0, y: 0 };
  private dragStartPan = { x: 0, y: 0 };
  private activeKeys: Set<string> = new Set();

  constructor(options: CameraOptions = {}) {
    this.minZoom = options.minZoom ?? 0.25;
    this.maxZoom = options.maxZoom ?? 3.5;
    this.panSpeed = options.panSpeed ?? 600;
    this.camera = { panX: 0, panY: 0, zoom: 1.0 };
  }

  public centerOn(
    screenWidth: number,
    screenHeight: number,
    worldWidth: number,
    worldHeight: number
  ): void {
    this.camera.panX = (screenWidth - worldWidth * this.camera.zoom) / 2;
    this.camera.panY = (screenHeight - worldHeight * this.camera.zoom) / 2;
  }

  public applyTo(container: Container): void {
    container.position.set(this.camera.panX, this.camera.panY);
    container.scale.set(this.camera.zoom);
  }

  public onKeyDown(code: string): void {
    if (
      [
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'ArrowUp',
        'ArrowLeft',
        'ArrowDown',
        'ArrowRight',
      ].includes(code)
    ) {
      this.activeKeys.add(code);
    }
  }

  public onKeyUp(code: string): void {
    this.activeKeys.delete(code);
  }

  public update(deltaTime: number): boolean {
    let dx = 0;
    let dy = 0;
    if (this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp')) dy += 1;
    if (this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown')) dy -= 1;
    if (this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft')) dx += 1;
    if (this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight')) dx -= 1;

    if (dx !== 0 || dy !== 0) {
      const step = this.panSpeed * (deltaTime / 60);
      this.camera.panX += dx * step;
      this.camera.panY += dy * step;
      return true;
    }
    return false;
  }

  public startDrag(screenX: number, screenY: number): void {
    this.isDragging = true;
    this.dragStartPointer = { x: screenX, y: screenY };
    this.dragStartPan = { x: this.camera.panX, y: this.camera.panY };
  }

  public drag(screenX: number, screenY: number): boolean {
    if (!this.isDragging) return false;
    this.camera.panX = this.dragStartPan.x + (screenX - this.dragStartPointer.x);
    this.camera.panY = this.dragStartPan.y + (screenY - this.dragStartPointer.y);
    return true;
  }

  public endDrag(): void {
    this.isDragging = false;
  }

  public zoomAt(cursorX: number, cursorY: number, deltaY: number): boolean {
    const factor = deltaY < 0 ? 1.15 : 1 / 1.15;
    const targetZoom = Math.min(
      this.maxZoom,
      Math.max(this.minZoom, this.camera.zoom * factor)
    );
    this.camera = zoomAtScreenPoint(
      cursorX,
      cursorY,
      this.camera.zoom,
      targetZoom,
      this.camera.panX,
      this.camera.panY
    );
    return true;
  }
}
