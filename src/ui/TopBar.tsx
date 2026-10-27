import { useEffect, useState } from 'react';
import type { Economy } from '../core/Economy';

interface TopBarProps {
  economy: Economy;
}

export function TopBar({ economy }: TopBarProps) {
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
      <div className="funds-display">
        <span className="funds-label">City Funds:</span>
        <span className="funds-amount">${funds.toLocaleString()}</span>
      </div>
    </header>
  );
}
