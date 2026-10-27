import { Application, Container } from 'pixi.js';
import { type Grid } from '../core/Grid';
import {
  type CameraState,
  DEFAULT_TILE_SIZE,
  screenToGrid,
} from '../core/Coordinates';
import { TOOL_TO_ZONE, type ToolManager } from '../core/ToolManager';
import { ZoneType } from '../core/ZoneSystem';
import { type RoadSystem } from '../core/RoadSystem';
import { GridRenderer } from './GridRenderer';
import { CameraController, type CameraOptions } from './CameraController';

export interface ViewportOptions extends CameraOptions {
  tileSize?: number;
  toolManager?: ToolManager;
  roadSystem?: RoadSystem;
}

export class Viewport {
  public app!: Application;
  public worldContainer: Container;
  public gridRenderer: GridRenderer;
  public grid: Grid;
  public tileSize: number;
  public toolManager?: ToolManager;
  public roadSystem?: RoadSystem;
  public cameraController: CameraController;

  private isLeftDown: boolean = false;
  private isBoxSelecting: boolean = false;
  private boxStart = { x: 0, y: 0 };
  private boxCurrent = { x: 0, y: 0 };
  private lastAppliedTile: { x: number; y: number } | null = null;
  private lastPointerPos: { x: number; y: number } | null = null;
  private containerElement: HTMLElement | null = null;

  get camera(): CameraState {
    return this.cameraController.camera;
  }
  set camera(c: CameraState) {
    this.cameraController.camera = c;
  }

  constructor(grid: Grid, options: ViewportOptions = {}) {
    this.grid = grid;
    this.toolManager = options.toolManager;
    this.roadSystem = options.roadSystem ?? options.toolManager?.roadSystem;
    this.tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
    this.cameraController = new CameraController(options);

    this.worldContainer = new Container();
    this.gridRenderer = new GridRenderer(this.tileSize);
    this.worldContainer.addChild(this.gridRenderer.container);
  }

  public static async create(
    containerElement: HTMLElement,
    grid: Grid,
    options: ViewportOptions = {}
  ): Promise<Viewport> {
    const viewport = new Viewport(grid, options);
    await viewport.init(containerElement);
    return viewport;
  }

  public setToolManager(toolManager: ToolManager): void {
    this.toolManager = toolManager;
    if (toolManager.roadSystem) {
      this.roadSystem = toolManager.roadSystem;
    }
    toolManager.subscribeTileChange(() => {
      this.gridRenderer.render(this.grid, this.roadSystem);
    });
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

    if (this.toolManager) {
      this.toolManager.subscribeTileChange(() => {
        this.gridRenderer.render(this.grid, this.roadSystem);
      });
    }

    this.gridRenderer.render(this.grid, this.roadSystem);
    this.centerView();
    this.attachEventListeners();
    this.app.ticker.add(this.handleTicker);
  }

  public centerView(): void {
    if (!this.app?.screen) return;
    this.cameraController.centerOn(
      this.app.screen.width,
      this.app.screen.height,
      this.grid.width * this.tileSize,
      this.grid.height * this.tileSize
    );
    this.updateTransform();
  }

  public updateTransform(): void {
    this.cameraController.applyTo(this.worldContainer);
  }

  private handleTicker = (ticker: { deltaTime: number }): void => {
    if (this.cameraController.update(ticker.deltaTime)) {
      this.updateTransform();
      this.refreshHover();
    }
  };

  private attachEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);

    const canvas = this.app.canvas;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
  }

  private detachEventListeners(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);

    if (this.app?.canvas) {
      const canvas = this.app.canvas;
      canvas.removeEventListener('pointerdown', this.handlePointerDown);
      canvas.removeEventListener('wheel', this.handleWheel);
      canvas.removeEventListener('contextmenu', this.handleContextMenu);
      canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.cameraController.onKeyDown(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.cameraController.onKeyUp(e.code);
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button === 0) {
      this.isLeftDown = true;
      const rect = this.app?.canvas?.getBoundingClientRect();
      const sx = e.clientX - (rect?.left ?? 0);
      const sy = e.clientY - (rect?.top ?? 0);
      const gridPos = screenToGrid(sx, sy, this.camera, this.tileSize);

      const zone = this.toolManager ? TOOL_TO_ZONE[this.toolManager.currentTool] : undefined;
      if (zone) {
        this.isBoxSelecting = true;
        this.boxStart = gridPos;
        this.boxCurrent = gridPos;
        this.gridRenderer.zoneRenderer.setSelectionBox(gridPos.x, gridPos.y, gridPos.x, gridPos.y, zone);
      } else {
        this.lastAppliedTile = null;
        this.applyToolAtScreen(e.clientX, e.clientY);
      }
    } else if (e.button === 2) {
      this.cameraController.startDrag(e.clientX, e.clientY);
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const canvas = this.app?.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.cameraController.drag(e.clientX, e.clientY)) {
      this.updateTransform();
    }

    if (this.isBoxSelecting && this.toolManager) {
      const zone = TOOL_TO_ZONE[this.toolManager.currentTool] ?? ZoneType.Residential;
      const gridPos = screenToGrid(screenX, screenY, this.camera, this.tileSize);
      this.boxCurrent = gridPos;
      this.gridRenderer.zoneRenderer.setSelectionBox(
        this.boxStart.x,
        this.boxStart.y,
        gridPos.x,
        gridPos.y,
        zone
      );
    } else if (this.isLeftDown) {
      this.applyToolAtScreen(e.clientX, e.clientY);
    }

    const inBounds = screenX >= 0 && screenX <= rect.width && screenY >= 0 && screenY <= rect.height;
    this.lastPointerPos = inBounds ? { x: screenX, y: screenY } : null;
    if (inBounds) this.refreshHover();
    else this.gridRenderer.updateHover(null, null);
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (e.button === 0) {
      if (this.isBoxSelecting && this.toolManager) {
        this.isBoxSelecting = false;
        this.gridRenderer.zoneRenderer.clearSelectionBox();
        const zone = TOOL_TO_ZONE[this.toolManager.currentTool];
        if (zone) {
          this.toolManager.applyZoneRect(
            this.boxStart.x,
            this.boxStart.y,
            this.boxCurrent.x,
            this.boxCurrent.y,
            zone
          );
          this.gridRenderer.render(this.grid, this.roadSystem);
        }
      }
      this.isLeftDown = false;
      this.lastAppliedTile = null;
    } else if (e.button === 2) {
      this.cameraController.endDrag();
    }
  };

  private applyToolAtScreen(clientX: number, clientY: number): void {
    if (!this.toolManager || !this.app?.canvas) return;

    const rect = this.app.canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const gridPos = screenToGrid(screenX, screenY, this.camera, this.tileSize);

    if (
      this.grid.isValid(gridPos.x, gridPos.y) &&
      (gridPos.x !== this.lastAppliedTile?.x || gridPos.y !== this.lastAppliedTile?.y)
    ) {
      this.lastAppliedTile = { x: gridPos.x, y: gridPos.y };
      const applied = this.toolManager.applyTool(gridPos.x, gridPos.y);
      if (applied) {
        this.gridRenderer.render(this.grid, this.roadSystem);
      }
    }
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (!this.app?.canvas) return;

    const rect = this.app.canvas.getBoundingClientRect();
    if (this.cameraController.zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY)) {
      this.updateTransform();
      this.refreshHover();
    }
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private handlePointerLeave = (): void => {
    this.lastPointerPos = null;
    this.gridRenderer.updateHover(null, null);
  };

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
      this.app.ticker.remove(this.handleTicker);
      this.gridRenderer.destroy();
      this.app.destroy(true, { children: true });
    }
    if (this.containerElement && this.app?.canvas) {
      this.containerElement.removeChild(this.app.canvas);
    }
  }
}
