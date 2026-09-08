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

  it('matches the official schedule for male workers (1 month per 4 months of birth date)', () => {
    // 官方附表：1965年1-4月→60岁1月，5-8月→60岁2月，9-12月→60岁3月
    expect(calculateDelayedRetirement('1965-01', 'male').delayMonths).toBe(1);
    expect(calculateDelayedRetirement('1965-04', 'male').delayMonths).toBe(1);
    expect(calculateDelayedRetirement('1965-05', 'male').delayMonths).toBe(2);
    expect(calculateDelayedRetirement('1965-09', 'male').delayMonths).toBe(3);
    expect(calculateDelayedRetirement('1966-01', 'male').delayMonths).toBe(4);
  });

  it('caps each cohort at its statutory maximum', () => {
    expect(calculateDelayedRetirement('1980-01', 'male').targetAge).toBe(63);
    expect(calculateDelayedRetirement('1990-01', 'female', false).targetAge).toBe(55);
    expect(calculateDelayedRetirement('1990-01', 'female', true).targetAge).toBe(58);
  });

  it('keeps targetAge exact instead of truncating to one decimal', () => {
    // 60岁3个月 = 60.25。修复前 toFixed(1) 会压成 60.3 (= 60岁3.6个月)
    const result = calculateDelayedRetirement('1965-09', 'male');
    expect(result.delayMonths).toBe(3);
    expect(result.targetAge).toBeCloseTo(60.25, 10);
    expect(result.targetAgeLabel).toBe('60岁3个月');
  });

  it('formats a whole-year retirement age without a month suffix', () => {
    expect(calculateDelayedRetirement('1964-12', 'male').targetAgeLabel).toBe('60岁');
    expect(calculateDelayedRetirement('1980-01', 'male').targetAgeLabel).toBe('63岁');
  });
});
