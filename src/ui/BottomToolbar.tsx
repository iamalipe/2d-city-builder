import { useEffect, useState } from 'react';
import { Tool, type ToolManager } from '../core/ToolManager';

interface BottomToolbarProps {
  toolManager: ToolManager;
}

export function BottomToolbar({ toolManager }: BottomToolbarProps) {
  const [activeTool, setActiveTool] = useState<Tool>(toolManager.currentTool);

  useEffect(() => {
    const unsubscribe = toolManager.subscribeToolChange((tool) => {
      setActiveTool(tool);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' || e.key === 'i' || e.key === 'I') {
        toolManager.setTool(Tool.Inspect);
      } else if (e.key === '2' || e.key === 'r' || e.key === 'R') {
        toolManager.setTool(Tool.Road);
      } else if (e.key === '3' || e.key === 'z' || e.key === 'Z') {
        toolManager.setTool(Tool.Residential);
      } else if (e.key === '4' || e.key === 'c' || e.key === 'C') {
        toolManager.setTool(Tool.Commercial);
      } else if (e.key === '5' || e.key === 'x' || e.key === 'X') {
        toolManager.setTool(Tool.Industrial);
      } else if (e.key === '6' || e.key === 'b' || e.key === 'B') {
        toolManager.setTool(Tool.Bulldoze);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toolManager]);

  return (
    <nav className="bottom-toolbar" aria-label="City construction tools">
      <button
        type="button"
        className={`tool-button ${activeTool === Tool.Inspect ? 'active' : ''}`}
        onClick={() => toolManager.setTool(Tool.Inspect)}
        title="Inspect tile [1]"
      >
        <span className="tool-icon">🔍</span>
        <span className="tool-label">Inspect</span>
      </button>

      <button
        type="button"
        className={`tool-button ${activeTool === Tool.Road ? 'active' : ''}`}
        onClick={() => toolManager.setTool(Tool.Road)}
        title="Build Road ($20) [2]"
      >
        <span className="tool-icon">🛣️</span>
        <span className="tool-label">Road ($20)</span>
      </button>

      <button
        type="button"
        className={`tool-button tool-residential ${activeTool === Tool.Residential ? 'active' : ''}`}
        onClick={() => toolManager.setTool(Tool.Residential)}
        title="Residential Zone ($100) [3]"
      >
        <span className="tool-icon">🟢</span>
        <span className="tool-label">Residential ($100)</span>
      </button>

      <button
        type="button"
        className={`tool-button tool-commercial ${activeTool === Tool.Commercial ? 'active' : ''}`}
        onClick={() => toolManager.setTool(Tool.Commercial)}
        title="Commercial Zone ($100) [4]"
      >
        <span className="tool-icon">🔵</span>
        <span className="tool-label">Commercial ($100)</span>
      </button>

      <button
        type="button"
        className={`tool-button tool-industrial ${activeTool === Tool.Industrial ? 'active' : ''}`}
        onClick={() => toolManager.setTool(Tool.Industrial)}
        title="Industrial Zone ($100) [5]"
      >
        <span className="tool-icon">🟡</span>
        <span className="tool-label">Industrial ($100)</span>
      </button>

      <button
        type="button"
        className={`tool-button ${activeTool === Tool.Bulldoze ? 'active' : ''}`}
        onClick={() => toolManager.setTool(Tool.Bulldoze)}
        title="Bulldoze ($5) [6]"
      >
        <span className="tool-icon">🚜</span>
        <span className="tool-label">Bulldoze ($5)</span>
      </button>
    </nav>
  );
}
