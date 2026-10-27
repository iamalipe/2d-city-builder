import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationClock } from '../src/core/SimulationClock';
import { DemandSystem } from '../src/core/DemandSystem';
import { SimulationEngine } from '../src/core/Engine';

describe('Phase 06: SimulationClock & DemandSystem (RCI)', () => {
  describe('SimulationClock speed controls and calendar', () => {
    let clock: SimulationClock;

    beforeEach(() => {
      clock = new SimulationClock(0, 1000); // 1000ms per tick
    });

    it('initializes with default speed 1x and unpaused', () => {
      expect(clock.ticks).toBe(0);
      expect(clock.speed).toBe(1);
      expect(clock.isPaused).toBe(false);
      expect(clock.formattedDate).toBe('Jan 2000');
    });

    it('pauses and resumes correctly', () => {
      clock.setSpeed(2);
      expect(clock.speed).toBe(2);

      clock.pause();
      expect(clock.isPaused).toBe(true);
      expect(clock.speed).toBe(0);

      clock.resume();
      expect(clock.isPaused).toBe(false);
      expect(clock.speed).toBe(2); // Restored previous speed
    });

    it('toggles pause on and off', () => {
      expect(clock.isPaused).toBe(false);
      clock.togglePause();
      expect(clock.isPaused).toBe(true);
      clock.togglePause();
      expect(clock.isPaused).toBe(false);
    });

    it('switches speeds between 0x, 1x, 2x, and 4x', () => {
      clock.setSpeed(0);
      expect(clock.speed).toBe(0);

      clock.setSpeed(1);
      expect(clock.speed).toBe(1);

      clock.setSpeed(2);
      expect(clock.speed).toBe(2);

      clock.setSpeed(4);
      expect(clock.speed).toBe(4);
    });

    it('steps simulation according to speed multipliers', () => {
      // 1x: 1000ms = 1 tick
      expect(clock.step(500)).toBe(0);
      expect(clock.step(500)).toBe(1);
      expect(clock.ticks).toBe(1);

      // 2x: 500ms * 2 = 1000ms = 1 tick
      clock.setSpeed(2);
      expect(clock.step(500)).toBe(1);
      expect(clock.ticks).toBe(2);

      // 4x: 1000ms * 4 = 4000ms = 4 ticks
      clock.setSpeed(4);
      expect(clock.step(1000)).toBe(4);
      expect(clock.ticks).toBe(6);

      // Paused: no ticks run regardless of time passed
      clock.pause();
      expect(clock.step(5000)).toBe(0);
      expect(clock.ticks).toBe(6);
    });

    it('advances calendar months and years properly', () => {
      for (let i = 0; i < 11; i++) {
        clock.tick();
      }
      expect(clock.ticks).toBe(11);
      expect(clock.monthName).toBe('Dec');
      expect(clock.year).toBe(2000);
      expect(clock.formattedDate).toBe('Dec 2000');

      // Next tick rolls into Jan 2001
      clock.tick();
      expect(clock.ticks).toBe(12);
      expect(clock.monthName).toBe('Jan');
      expect(clock.year).toBe(2001);
      expect(clock.formattedDate).toBe('Jan 2001');
    });
  });

  describe('DemandSystem RCI Mathematical Behavior', () => {
    let demandSystem: DemandSystem;

    beforeEach(() => {
      demandSystem = new DemandSystem();
    });

    it('provides positive initial founding demand for an empty city', () => {
      const demand = demandSystem.calculateDemand({
        population: 0,
        unemployedWorkers: 0,
        commercialCapacity: 0,
      });

      // Pioneers need homes and factories
      expect(demand.residential).toBeGreaterThan(0);
      expect(demand.industrial).toBeGreaterThan(0);
      expect(demand.commercial).toBeGreaterThanOrEqual(0);
    });

    it('shifts R demand down and I demand up as unemployment increases', () => {
      const pop = 200;

      // Low unemployment: 10 out of 200 (5%)
      const lowUnemployment = demandSystem.calculateDemand({
        population: pop,
        unemployedWorkers: 10,
        commercialCapacity: 50,
      });

      // High unemployment: 120 out of 200 (60%)
      const highUnemployment = demandSystem.calculateDemand({
        population: pop,
        unemployedWorkers: 120,
        commercialCapacity: 50,
      });

      // Residential demand falls when unemployment is high
      expect(highUnemployment.residential).toBeLessThan(lowUnemployment.residential);
      expect(highUnemployment.residential).toBeLessThan(0); // Negative demand

      // Industrial demand surges when abundant unemployed workers are looking for jobs
      expect(highUnemployment.industrial).toBeGreaterThan(lowUnemployment.industrial);
      expect(highUnemployment.industrial).toBeGreaterThan(50);
    });

    it('creates high Residential demand and negative Industrial demand when unemployment is 0', () => {
      const demand = demandSystem.calculateDemand({
        population: 200,
        unemployedWorkers: 0,
        commercialCapacity: 50,
      });

      // Plentiful jobs: citizens want to move in!
      expect(demand.residential).toBe(80);

      // Severe labor shortage: factories cannot staff new jobs
      expect(demand.industrial).toBeLessThan(0);
    });

    it('shifts Commercial demand based on population vs commercial capacity', () => {
      const pop = 200; // Target commercial capacity = 50 (200 * 0.25)

      // 1. High shortage of stores (capacity = 5 vs target 50)
      const storeShortage = demandSystem.calculateDemand({
        population: pop,
        unemployedWorkers: 10,
        commercialCapacity: 5,
      });

      // 2. Balanced market (capacity = 50)
      const balancedMarket = demandSystem.calculateDemand({
        population: pop,
        unemployedWorkers: 10,
        commercialCapacity: 50,
      });

      // 3. Oversupply / saturated market (capacity = 120 vs target 50)
      const oversuppliedMarket = demandSystem.calculateDemand({
        population: pop,
        unemployedWorkers: 10,
        commercialCapacity: 120,
      });

      // Commercial demand is highest during shortages and drops as stores are built
      expect(storeShortage.commercial).toBeGreaterThan(balancedMarket.commercial);
      expect(balancedMarket.commercial).toBeGreaterThan(oversuppliedMarket.commercial);
      expect(oversuppliedMarket.commercial).toBeLessThan(0); // Glut turns demand negative
    });

    it('dampens Commercial demand when citizen unemployment rate is high', () => {
      const pop = 200;
      const capacity = 20; // Shortage of stores

      // Wealthy citizens (low unemployment: 5%)
      const wealthyDemand = demandSystem.calculateDemand({
        population: pop,
        unemployedWorkers: 10,
        commercialCapacity: capacity,
      });

      // Struggling citizens (high unemployment: 60%)
      const poorDemand = demandSystem.calculateDemand({
        population: pop,
        unemployedWorkers: 120,
        commercialCapacity: capacity,
      });

      // Less disposable income reduces commercial demand
      expect(poorDemand.commercial).toBeLessThan(wealthyDemand.commercial);
    });

    it('strictly clamps all R, C, and I values between -100 and +100', () => {
      // Extreme values test
      const extremeShortage = demandSystem.calculateDemand({
        population: 50000,
        unemployedWorkers: 50000,
        commercialCapacity: 0,
      });

      expect(extremeShortage.residential).toBeGreaterThanOrEqual(-100);
      expect(extremeShortage.residential).toBeLessThanOrEqual(100);
      expect(extremeShortage.commercial).toBeGreaterThanOrEqual(-100);
      expect(extremeShortage.commercial).toBeLessThanOrEqual(100);
      expect(extremeShortage.industrial).toBeGreaterThanOrEqual(-100);
      expect(extremeShortage.industrial).toBeLessThanOrEqual(100);

      const extremeSurplus = demandSystem.calculateDemand({
        population: 10,
        unemployedWorkers: 0,
        commercialCapacity: 10000,
      });

      expect(extremeSurplus.residential).toBeGreaterThanOrEqual(-100);
      expect(extremeSurplus.residential).toBeLessThanOrEqual(100);
      expect(extremeSurplus.commercial).toBeGreaterThanOrEqual(-100);
      expect(extremeSurplus.commercial).toBeLessThanOrEqual(100);
      expect(extremeSurplus.industrial).toBeGreaterThanOrEqual(-100);
      expect(extremeSurplus.industrial).toBeLessThanOrEqual(100);
    });
  });

  describe('SimulationEngine Integration', () => {
    it('integrates SimulationClock and DemandSystem into SimulationEngine', () => {
      const engine = new SimulationEngine();

      expect(engine.clock.speed).toBe(1);
      expect(engine.clock.ticks).toBe(0);

      const initialDemand = engine.getDemand();
      expect(initialDemand.residential).toBe(60);
      expect(initialDemand.industrial).toBe(70);

      // Adjust demographics
      engine.setDemographics({
        population: 300,
        unemployedWorkers: 10,
        commercialCapacity: 20,
      });

      const updatedDemand = engine.getDemand();
      expect(updatedDemand.residential).toBeGreaterThan(0);

      // Engine tick advances clock and updates demand
      engine.tick();
      expect(engine.ticks).toBe(1);
      expect(engine.clock.ticks).toBe(1);
    });
  });
});
