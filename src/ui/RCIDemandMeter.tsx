import { useEffect, useState } from 'react';
import type { DemandSystem, RCIDemand } from '../core/DemandSystem';

interface RCIDemandMeterProps {
  demandSystem: DemandSystem;
}

export function RCIDemandMeter({ demandSystem }: RCIDemandMeterProps) {
  const [demand, setDemand] = useState<RCIDemand>(demandSystem.getDemand());

  useEffect(() => {
    return demandSystem.subscribe((newDemand) => {
      setDemand(newDemand);
    });
  }, [demandSystem]);

  const getBarStyle = (val: number) => {
    const clamped = Math.max(-100, Math.min(100, val));
    if (clamped >= 0) {
      const heightPercent = (clamped / 100) * 50;
      return {
        top: `${50 - heightPercent}%`,
        height: `${heightPercent}%`,
      };
    } else {
      const heightPercent = (Math.abs(clamped) / 100) * 50;
      return {
        top: '50%',
        height: `${heightPercent}%`,
      };
    }
  };

  return (
    <div
      className="rci-meter"
      title={`RCI Demand — Residential: ${demand.residential > 0 ? '+' : ''}${demand.residential}, Commercial: ${demand.commercial > 0 ? '+' : ''}${demand.commercial}, Industrial: ${demand.industrial > 0 ? '+' : ''}${demand.industrial}`}
      aria-label="RCI Demand Indicator"
    >
      <div className="rci-bar-wrapper">
        <div className="rci-bar-track">
          <div className="rci-zero-line" />
          <div
            className="rci-bar-fill residential"
            style={getBarStyle(demand.residential)}
          />
        </div>
        <span className="rci-label residential">R</span>
      </div>

      <div className="rci-bar-wrapper">
        <div className="rci-bar-track">
          <div className="rci-zero-line" />
          <div
            className="rci-bar-fill commercial"
            style={getBarStyle(demand.commercial)}
          />
        </div>
        <span className="rci-label commercial">C</span>
      </div>

      <div className="rci-bar-wrapper">
        <div className="rci-bar-track">
          <div className="rci-zero-line" />
          <div
            className="rci-bar-fill industrial"
            style={getBarStyle(demand.industrial)}
          />
        </div>
        <span className="rci-label industrial">I</span>
      </div>
    </div>
  );
}
