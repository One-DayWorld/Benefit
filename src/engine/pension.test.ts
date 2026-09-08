import { describe, it, expect } from 'vitest';
import { calculatePension, getPayMonths } from './pension';

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

  it('keeps the two parts summing exactly to the total (界面要展示占比)', () => {
    // 取一组两部分都带小数的参数：若先求和再取整，分项之和会与合计差 1 元
    const result = calculatePension({
      avgSalaryAtRetire: 19353.47,
      avgPayIndex: 0.8209,
      totalPaidYears: 32.5833,
      personalAccountBalanceAtRetire: 186049.31,
      retireAge: 61.5,
    });
    expect(result.basicPension + result.personalPension).toBe(result.totalPension);
  });
});

describe('minimum-contribution-years gate (社会保险法第十六条)', () => {
  const base = {
    avgSalaryAtRetire: 10000,
    avgPayIndex: 1.0,
    personalAccountBalanceAtRetire: 139000,
    retireAge: 60,
  };

  it('pays no monthly pension when contributions total under 15 years', () => {
    const result = calculatePension({ ...base, totalPaidYears: 14.5 });
    expect(result.isEligible).toBe(false);
    expect(result.totalPension).toBe(0);
    expect(result.basicPension).toBe(0);
    expect(result.personalPension).toBe(0);
    expect(result.yearsShortOfMinimum).toBe(0.5);
    // 不符合按月领取条件时，个人账户可一次性支付
    expect(result.lumpSumIfIneligible).toBe(139000);
  });

  it('pays a monthly pension right at the 15-year threshold', () => {
    const result = calculatePension({ ...base, totalPaidYears: 15 });
    expect(result.isEligible).toBe(true);
    expect(result.totalPension).toBeGreaterThan(0);
    expect(result.yearsShortOfMinimum).toBe(0);
    expect(result.lumpSumIfIneligible).toBe(0);
  });
});

describe('getPayMonths', () => {
  it('matches the official table for standard integer ages', () => {
    expect(getPayMonths(50)).toBe(195);
    expect(getPayMonths(55)).toBe(170);
    expect(getPayMonths(60)).toBe(139);
    expect(getPayMonths(65)).toBe(101);
  });

  it('takes the completed-year value for delayed-retirement fractional ages', () => {
    // 经办口径按周岁向下取整：61岁10个月 / 61.5岁 均按 61 岁的 132 个月，
    // 关键是不能像修复前那样被错误归入 65 岁的 101 个月
    expect(getPayMonths(61.5)).toBe(132);
    expect(getPayMonths(61)).toBe(132);
    expect(getPayMonths(60 + 10 / 12)).toBe(139);
    expect(getPayMonths(62.9)).toBe(125);
  });

  it('clamps ages outside the 40-70 table range', () => {
    expect(getPayMonths(35)).toBe(233);
    expect(getPayMonths(75)).toBe(56);
  });
});
