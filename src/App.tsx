import { useEffect, useRef, useState } from 'react';
import { Viewport } from './render/Viewport';
import { SimulationEngine } from './core/Engine';
import { TopBar } from './ui/TopBar';
import { BottomToolbar } from './ui/BottomToolbar';
import './App.css';
import './ui/ui.css';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const [engine] = useState(() => new SimulationEngine());

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    Viewport.create(containerRef.current, engine.grid, {
      toolManager: engine.toolManager,
      roadSystem: engine.roadSystem,
    }).then((viewport) => {
      if (!isMounted) {
        viewport.destroy();
        return;
      }
      viewportRef.current = viewport;
    });

    // Simulation loop
    let lastTime = performance.now();
    let frameId: number;

    const loop = (currentTime: number) => {
      const deltaMs = currentTime - lastTime;
      lastTime = currentTime;

      const ticks = engine.clock.step(deltaMs);
      for (let i = 0; i < ticks; i++) {
        engine.tick();
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
      if (viewportRef.current) {
        viewportRef.current.destroy();
        viewportRef.current = null;
      }
    };
  }, [engine]);

  return (
    <div className="game-container">
      <div ref={containerRef} className="canvas-container" />
      <TopBar
        economy={engine.economy}
        clock={engine.clock}
        demandSystem={engine.demandSystem}
      />
      <div className="controls-hint">
        WASD / Right-Drag to pan • Scroll to zoom • Drag box to paint zones • Click/Drag for roads
      </div>
      <BottomToolbar toolManager={engine.toolManager} />
    </div>
  );
}
