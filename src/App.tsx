import { useEffect, useRef } from 'react';
import { Viewport } from './render/Viewport';
import { Grid } from './core/Grid';
import './App.css';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<Viewport | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const grid = new Grid(64, 64);
    let isMounted = true;

    Viewport.create(containerRef.current, grid).then((viewport) => {
      if (!isMounted) {
        viewport.destroy();
        return;
      }
      viewportRef.current = viewport;
    });

    return () => {
      isMounted = false;
      if (viewportRef.current) {
        viewportRef.current.destroy();
        viewportRef.current = null;
      }
    };
  }, []);

  return (
    <div className="game-container">
      <div ref={containerRef} className="canvas-container" />
      <div className="ui-overlay">
        <div className="hud-panel">
          <h1 className="hud-title">2D City Builder</h1>
          <p className="hud-controls">
            <span className="hud-badge">WASD</span> or <span className="hud-badge">Right-Drag</span> to pan
            <br />
            <span className="hud-badge">Mouse Wheel</span> to zoom
            <br />
            <span className="hud-badge">Hover</span> to highlight tile
          </p>
        </div>
      </div>
    </div>
  );
}
