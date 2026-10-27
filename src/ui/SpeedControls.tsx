import { useEffect, useState } from 'react';
import type { SimulationClock } from '../core/SimulationClock';

interface SpeedControlsProps {
  clock: SimulationClock;
}

export function SpeedControls({ clock }: SpeedControlsProps) {
  const [speed, setSpeed] = useState(clock.speed);
  const [date, setDate] = useState(clock.formattedDate);

  useEffect(() => {
    return clock.subscribe((c) => {
      setSpeed(c.speed);
      setDate(c.formattedDate);
    });
  }, [clock]);

  return (
    <div className="speed-controls-container">
      <div className="date-display">{date}</div>
      <div className="speed-buttons" role="group" aria-label="Simulation speed">
        <button
          type="button"
          className={`speed-btn ${speed === 0 ? 'active' : ''}`}
          onClick={() => clock.pause()}
          title="Pause simulation"
        >
          ⏸
        </button>
        <button
          type="button"
          className={`speed-btn ${speed === 1 ? 'active' : ''}`}
          onClick={() => clock.setSpeed(1)}
          title="Normal speed (1x)"
        >
          1x
        </button>
        <button
          type="button"
          className={`speed-btn ${speed === 2 ? 'active' : ''}`}
          onClick={() => clock.setSpeed(2)}
          title="Fast speed (2x)"
        >
          2x
        </button>
        <button
          type="button"
          className={`speed-btn ${speed === 4 ? 'active' : ''}`}
          onClick={() => clock.setSpeed(4)}
          title="Ultra speed (4x)"
        >
          4x
        </button>
      </div>
    </div>
  );
}
