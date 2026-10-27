import { useEffect, useState } from 'react';
import type { Economy } from '../core/Economy';
import type { SimulationClock } from '../core/SimulationClock';
import type { DemandSystem } from '../core/DemandSystem';
import { SpeedControls } from './SpeedControls';
import { RCIDemandMeter } from './RCIDemandMeter';

interface TopBarProps {
  economy: Economy;
  clock: SimulationClock;
  demandSystem: DemandSystem;
}

export function TopBar({ economy, clock, demandSystem }: TopBarProps) {
  const [funds, setFunds] = useState(economy.funds);

  useEffect(() => {
    return economy.subscribe((newFunds) => {
      setFunds(newFunds);
    });
  }, [economy]);

  return (
    <header className="top-bar">
      <div className="city-branding">
        <span className="city-icon">🏙️</span>
        <span className="city-title">2D City Builder</span>
      </div>

      <div className="top-bar-center">
        <SpeedControls clock={clock} />
        <RCIDemandMeter demandSystem={demandSystem} />
      </div>

      <div className="funds-display">
        <span className="funds-label">City Funds:</span>
        <span className="funds-amount">${funds.toLocaleString()}</span>
      </div>
    </header>
  );
}
