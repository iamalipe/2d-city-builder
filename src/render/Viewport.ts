import { Application, Container } from 'pixi.js';
import { Grid } from '../core/Grid';
import {
  type CameraState,
  DEFAULT_TILE_SIZE,
  screenToGrid,
  zoomAtScreenPoint,
} from '../core/Coordinates';
import { GridRenderer } from './GridRenderer';

export interface ViewportOptions {
  tileSize?: number;
  minZoom?: number;
  maxZoom?: number;
  panSpeed?: number;
}

export class Viewport {
  public app!: Application;
  public worldContainer: Container;
  public gridRenderer: GridRenderer;
  public grid: Grid;
  public camera: CameraState;
  public tileSize: number;

  public minZoom: number;
  public maxZoom: number;
  public panSpeed: number;

  private isRightDragging: boolean = false;
  private dragStartPointer = { x: 0, y: 0 };
  private dragStartPan = { x: 0, y: 0 };
  private activeKeys: Set<string> = new Set();
  private lastPointerPos: { x: number; y: number } | null = null;
  private containerElement: HTMLElement | null = null;

  // Bound event handlers for clean removal
  private handleKeyDownBound = this.handleKeyDown.bind(this);
  private handleKeyUpBound = this.handleKeyUp.bind(this);
  private handlePointerDownBound = this.handlePointerDown.bind(this);
  private handlePointerMoveBound = this.handlePointerMove.bind(this);
  private handlePointerUpBound = this.handlePointerUp.bind(this);
  private handleWheelBound = this.handleWheel.bind(this);
  private handleContextMenuBound = this.handleContextMenu.bind(this);
  private handlePointerLeaveBound = this.handlePointerLeave.bind(this);
  private tickerUpdateBound = this.update.bind(this);

  constructor(grid: Grid = new Grid(), options: ViewportOptions = {}) {
    this.grid = grid;
    this.tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
    this.minZoom = options.minZoom ?? 0.25;
    this.maxZoom = options.maxZoom ?? 3.5;
    this.panSpeed = options.panSpeed ?? 600;

    this.camera = {
      panX: 0,
      panY: 0,
      zoom: 1.0,
    };

    this.worldContainer = new Container();
    this.gridRenderer = new GridRenderer(this.tileSize);
    this.worldContainer.addChild(this.gridRenderer.container);
  }

  public static async create(
    containerElement: HTMLElement,
    grid: Grid = new Grid(),
    options: ViewportOptions = {}
  ): Promise<Viewport> {
    const viewport = new Viewport(grid, options);
    await viewport.init(containerElement);
    return viewport;
  }

  public async init(containerElement: HTMLElement): Promise<void> {
    this.containerElement = containerElement;

    this.app = new Application();
    await this.app.init({
      resizeTo: containerElement,
      backgroundColor: 0x1a1e24,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    containerElement.appendChild(this.app.canvas);
    this.app.stage.addChild(this.worldContainer);

    // Initial render of the grid
    this.gridRenderer.render(this.grid);

    // Center map in the viewport
    this.centerView();

    // Attach interaction listeners
    this.attachEventListeners();

    // Start ticker
    this.app.ticker.add(this.tickerUpdateBound);
  }

  public centerView(): void {
    if (!this.app || !this.app.screen) return;
    const worldWidth = this.grid.width * this.tileSize;
    const worldHeight = this.grid.height * this.tileSize;

    this.camera.panX = (this.app.screen.width - worldWidth * this.camera.zoom) / 2;
    this.camera.panY = (this.app.screen.height - worldHeight * this.camera.zoom) / 2;
    this.updateTransform();
  }

  public updateTransform(): void {
    this.worldContainer.position.set(this.camera.panX, this.camera.panY);
    this.worldContainer.scale.set(this.camera.zoom);
  }

  private update(ticker: { deltaTime: number }): void {
    let dx = 0;
    let dy = 0;

    if (this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp')) dy += 1;
    if (this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown')) dy -= 1;
    if (this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft')) dx += 1;
    if (this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight')) dx -= 1;

    if (dx !== 0 || dy !== 0) {
      const step = this.panSpeed * (ticker.deltaTime / 60);
      this.camera.panX += dx * step;
      this.camera.panY += dy * step;
      this.updateTransform();
      this.refreshHover();
    }
  }

  private attachEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);

    const canvas = this.app.canvas;
    canvas.addEventListener('pointerdown', this.handlePointerDownBound);
    window.addEventListener('pointermove', this.handlePointerMoveBound);
    window.addEventListener('pointerup', this.handlePointerUpBound);
    canvas.addEventListener('wheel', this.handleWheelBound, { passive: false });
    canvas.addEventListener('contextmenu', this.handleContextMenuBound);
    canvas.addEventListener('pointerleave', this.handlePointerLeaveBound);
  }

  private detachEventListeners(): void {
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);

    if (this.app && this.app.canvas) {
      const canvas = this.app.canvas;
      canvas.removeEventListener('pointerdown', this.handlePointerDownBound);
      canvas.removeEventListener('wheel', this.handleWheelBound);
      canvas.removeEventListener('contextmenu', this.handleContextMenuBound);
      canvas.removeEventListener('pointerleave', this.handlePointerLeaveBound);
    }
    window.removeEventListener('pointermove', this.handlePointerMoveBound);
    window.removeEventListener('pointerup', this.handlePointerUpBound);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
      this.activeKeys.add(e.code);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.activeKeys.delete(e.code);
  }

  private handlePointerDown(e: PointerEvent): void {
    // Right click is button 2
    if (e.button === 2) {
      this.isRightDragging = true;
      this.dragStartPointer = { x: e.clientX, y: e.clientY };
      this.dragStartPan = { x: this.camera.panX, y: this.camera.panY };
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    const canvas = this.app?.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.isRightDragging) {
      const deltaX = e.clientX - this.dragStartPointer.x;
      const deltaY = e.clientY - this.dragStartPointer.y;
      this.camera.panX = this.dragStartPan.x + deltaX;
      this.camera.panY = this.dragStartPan.y + deltaY;
      this.updateTransform();
    }

    // Only update hover if mouse is inside canvas
    if (
      screenX >= 0 &&
      screenX <= rect.width &&
      screenY >= 0 &&
      screenY <= rect.height
    ) {
      this.lastPointerPos = { x: screenX, y: screenY };
      this.refreshHover();
    } else {
      this.lastPointerPos = null;
      this.gridRenderer.updateHover(null, null);
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    if (e.button === 2) {
      this.isRightDragging = false;
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    if (!this.app?.canvas) return;

    const rect = this.app.canvas.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const zoomMultiplier = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const targetZoom = Math.min(
      this.maxZoom,
      Math.max(this.minZoom, this.camera.zoom * zoomMultiplier)
    );

    const newCamera = zoomAtScreenPoint(
      cursorX,
      cursorY,
      this.camera.zoom,
      targetZoom,
      this.camera.panX,
      this.camera.panY
    );

    this.camera = newCamera;
    this.updateTransform();
    this.refreshHover();
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private handlePointerLeave(): void {
    this.lastPointerPos = null;
    this.gridRenderer.updateHover(null, null);
  }

  private refreshHover(): void {
    if (!this.lastPointerPos) {
      this.gridRenderer.updateHover(null, null);
      return;
    }

    const gridPos = screenToGrid(
      this.lastPointerPos.x,
      this.lastPointerPos.y,
      this.camera,
      this.tileSize
    );

    if (this.grid.isValid(gridPos.x, gridPos.y)) {
      this.gridRenderer.updateHover(gridPos.x, gridPos.y, this.grid);
    } else {
      this.gridRenderer.updateHover(null, null);
    }
  }

  public destroy(): void {
    this.detachEventListeners();
    if (this.app) {
      this.app.ticker.remove(this.tickerUpdateBound);
      this.gridRenderer.destroy();
      this.app.destroy(true, { children: true });
    }
    if (this.containerElement && this.app?.canvas) {
      this.containerElement.removeChild(this.app.canvas);
    }
  }
}
