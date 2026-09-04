import { describe, it, expect } from 'vitest';
import { calculateDelayedRetirement } from './delayedRetirement';

describe('Delayed Retirement Calculator (2025 Policy)', () => {
  it('calculates no delay for people retiring before Jan 1, 2025', () => {
    const result = calculateDelayedRetirement('1964-12', 'male', false);
    expect(result.originalAge).toBe(60);
    expect(result.targetAge).toBe(60);
    expect(result.delayMonths).toBe(0);
    expect(result.retireYearMonth).toBe('2024-12');
  });

  it('calculates correct delay for male born in 1968', () => {
    const result = calculateDelayedRetirement('1968-01', 'male', false);
    expect(result.originalAge).toBe(60);
    expect(result.delayMonths).toBeGreaterThan(0);
    expect(result.targetAge).toBeGreaterThan(60);
  });

  it('calculates female worker delay (50 to 55 max)', () => {
    const result = calculateDelayedRetirement('1975-01', 'female', false);
    expect(result.originalAge).toBe(50);
    expect(result.delayMonths).toBeGreaterThan(0);
  });
});
