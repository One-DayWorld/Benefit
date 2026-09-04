import { describe, it, expect } from 'vitest';
import { calculatePension } from './pension';

describe('Pension Calculator Engine', () => {
  it('calculates pension correctly for standard male at age 60', () => {
    const result = calculatePension({
      avgSalaryAtRetire: 10000,
      avgPayIndex: 1.0,
      totalPaidYears: 30,
      personalAccountBalanceAtRetire: 139000,
      retireAge: 60,
    });

    // 基础养老金 = 10000 * (1 + 1.0) / 2 * 30 * 1% = 3000
    // 个人账户养老金 = 139000 / 139 = 1000
    // 总养老金 = 4000
    expect(result.basicPension).toBeCloseTo(3000, 0);
    expect(result.personalPension).toBeCloseTo(1000, 0);
    expect(result.totalPension).toBeCloseTo(4000, 0);
  });
});
