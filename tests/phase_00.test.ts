import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/core/Engine';

describe('Phase 00: Simulation Engine Tick Pipeline', () => {
  it('increments tick counter to 10 after calling tick() 10 times', () => {
    const engine = new SimulationEngine();
    expect(engine.ticks).toBe(0);

    for (let i = 0; i < 10; i++) {
      engine.tick();
    }

    expect(engine.ticks).toBe(10);
    expect(engine.tickCount).toBe(10);
    expect(engine.getTicks()).toBe(10);
  });
});
