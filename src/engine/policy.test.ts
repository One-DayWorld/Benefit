import { describe, it, expect } from 'vitest';
import { calculateStrategies } from './policy';
import { UserInputs, CityPolicy } from '../types';

const mockCity: CityPolicy = {
  cityId: 'beijing',
  cityName: '北京',
  avgSalary: 10000,
  baseMin: 6000,
  baseMax: 30000,
  medicalMinYearsMale: 25,
  medicalMinYearsFemale: 20,
  unemploymentBenefit: 2000,
};

const mockInputs: UserInputs = {
  gender: 'male',
  birthYearMonth: '1976-01',
  resignYearMonth: '2026-01',
  retireAge: 60,
  paidMonths: 240,
  personalAccountBalance: 100000,
  avgPayIndex: 1.0,
  cityId: 'beijing',
  futureSalaryGrowthRate: 0.03,
};

describe('Policy Strategy Engine', () => {
  it('generates 4 strategies for given user inputs', () => {
    const strategies = calculateStrategies(mockInputs, mockCity);
    expect(strategies.length).toBe(4);
    expect(strategies.map((s) => s.id)).toEqual([
      'stop',
      'min_self',
      'unemployment_4050',
      'full_self',
    ]);
  });
});