export interface RCIDemand {
  residential: number; // -100 to +100
  commercial: number;  // -100 to +100
  industrial: number;  // -100 to +100
}

export interface CityMetrics {
  population: number;
  unemployedWorkers: number;
  commercialCapacity: number;
  industrialCapacity?: number;
}

export class DemandSystem {
  public demand: RCIDemand;
  private listeners: Set<(demand: RCIDemand) => void> = new Set();

  constructor() {
    this.demand = this.calculateDemand({
      population: 0,
      unemployedWorkers: 0,
      commercialCapacity: 0,
    });
  }

  public calculateDemand(metrics: CityMetrics): RCIDemand {
    const pop = Math.max(0, metrics.population);
    const unemployed = Math.max(0, metrics.unemployedWorkers);
    const commercial = Math.max(0, metrics.commercialCapacity);

    // Initial state for founding an empty city
    if (pop === 0) {
      return {
        residential: 60,
        commercial: 10,
        industrial: 70,
      };
    }

    const unemploymentRate = unemployed / Math.max(1, pop);

    // 1. Residential Demand: Driven by low unemployment and job availability
    // At 0% unemployment, R demand is +80.
    // At 40% unemployment, R demand drops to 0.
    // Above 40% unemployment, R demand goes negative.
    const employmentFactor = 1 - unemploymentRate * 2.5;
    let residential = Math.round(employmentFactor * 80);

    // 2. Commercial Demand: Driven by population shopping needs vs existing store capacity
    // Target is roughly 1 commercial capacity per 4 citizens (0.25).
    const targetCommercial = Math.max(1, Math.floor(pop * 0.25));
    let commercialDemand = 0;

    if (commercial < targetCommercial) {
      // Deficit: stores needed
      const deficitRatio = (targetCommercial - commercial) / targetCommercial;
      commercialDemand = Math.round(20 + deficitRatio * 80);
    } else {
      // Surplus: market saturation
      const surplusRatio = (commercial - targetCommercial) / targetCommercial;
      commercialDemand = Math.round(20 - surplusRatio * 100);
    }

    // High unemployment dampens consumer spending
    if (unemploymentRate > 0.15) {
      commercialDemand -= Math.round((unemploymentRate - 0.15) * 60);
    }

    // 3. Industrial Demand: Driven by labor supply (unemployed workers looking for jobs)
    // When workers are looking for jobs, factories want to hire them.
    // When unemployment is 0, labor shortage penalizes industrial expansion.
    let industrial = 0;
    if (unemployed > 0) {
      const laborRatio = Math.min(1.0, unemployed / Math.max(5, pop * 0.4));
      industrial = Math.round(20 + laborRatio * 80);
    } else {
      // Zero unemployed workers -> labor shortage
      industrial = -20;
    }

    // Clamp all demand metrics to [-100, +100]
    return {
      residential: Math.max(-100, Math.min(100, residential)),
      commercial: Math.max(-100, Math.min(100, commercialDemand)),
      industrial: Math.max(-100, Math.min(100, industrial)),
    };
  }

  public update(metrics: CityMetrics): RCIDemand {
    this.demand = this.calculateDemand(metrics);
    this.notify();
    return this.getDemand();
  }

  public getDemand(): RCIDemand {
    return { ...this.demand };
  }

  public subscribe(listener: (demand: RCIDemand) => void): () => void {
    this.listeners.add(listener);
    listener(this.demand);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.demand);
    }
  }
}
