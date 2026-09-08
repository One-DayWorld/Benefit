import { describe, it, expect } from 'vitest';
import {
  calculateStrategies,
  getUnemploymentMonths,
  computeBreakEvenYears,
  isUnemploymentBenefitEligible,
  effectivePayIndex,
  totalReceivedUntil,
  validateCityPolicy,
  unemploymentBenefitAtMonth,
  payBaseRange,
} from './policy';
import { calculatePension } from './pension';
import { UserInputs, CityPolicy } from '../types';
import { CITIES } from '../config/cities';

/** 口径自洽的测试城市：社平 10000，下限 6000 (60%)，上限 30000 (300%) */
const mockCity: CityPolicy = {
  cityId: 'testcity',
  cityName: '测试市',
  avgSalary: 10000,
  baseMin: 6000,
  baseMax: 30000,
  medicalMinYearsMale: 25,
  medicalMinYearsFemale: 20,
  unemploymentBenefitTiers: [
    { throughMonth: 12, monthly: 2000 },
    { throughMonth: 24, monthly: 1600 },
  ],
  unemploymentMonthsPerPaidYear: 2,
  unemploymentMaxMonths: 24,
  flexiblePensionRate: 0.2,
  flexiblePensionAccountRate: 0.08,
  flexibleMedicalRate: 0.11,
  subsidyRatio: 0.5,
  subsidyMaxMonths: 36,
  olderWorkerAgeMale: 45,
  olderWorkerAgeFemale: 40,
  subsidyBridgeYearsBeforeRetirement: 5,
  subsidyMinUnemployedMonths: 6,
  employeePensionAccountRate: 0.08,
  dataVintage: '测试数据',
};

// dataAsOfYearMonth 必须显式给出：缺省值为"当前月"，会让断言随系统时间漂移。
// 此处令基准月 = 离职月，即测算全程只有"离职后"一段，便于校验离职后逻辑。
const mockInputs: UserInputs = {
  gender: 'male',
  birthYearMonth: '1976-01',
  resignYearMonth: '2026-01',
  dataAsOfYearMonth: '2026-01',
  separationType: 'involuntary',
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

  it('每个方案都拆出基础/个人账户两部分，且两部分相加等于合计', () => {
    for (const s of calculateStrategies(mockInputs, mockCity)) {
      expect(s.retireBasicPension).toBeGreaterThan(0);
      expect(s.retirePersonalPension).toBeGreaterThan(0);
      expect(
        s.retireBasicPension + s.retirePersonalPension,
        `${s.id}: 分项之和与合计不符，界面占比会显示矛盾`
      ).toBe(s.retireMonthlyPension);
    }
  });

  it('不满足 15 年时两部分与合计同时归零', () => {
    const strategies = calculateStrategies(
      { ...mockInputs, paidMonths: 12, resignYearMonth: '2036-01', dataAsOfYearMonth: '2036-01' },
      mockCity
    );
    const stop = strategies.find((s) => s.id === 'stop')!;
    expect(stop.isPensionEligible).toBe(false);
    expect(stop.retireMonthlyPension).toBe(0);
    expect(stop.retireBasicPension).toBe(0);
    expect(stop.retirePersonalPension).toBe(0);
  });

  it('self-pay strategies always yield a pension at least as high as the stop strategy', () => {
    const strategies = calculateStrategies(mockInputs, mockCity);
    const stop = strategies.find((s) => s.id === 'stop')!;
    for (const s of strategies) {
      if (s.id === 'stop') continue;
      expect(s.retireMonthlyPension).toBeGreaterThanOrEqual(stop.retireMonthlyPension);
    }
  });
});

describe('unemployment benefit eligibility (社会保险法第四十五条)', () => {
  it('denies the benefit for voluntary resignation', () => {
    expect(isUnemploymentBenefitEligible('voluntary', 20)).toBe(false);
  });

  it('grants the benefit for involuntary separation with at least 1 year paid', () => {
    expect(isUnemploymentBenefitEligible('involuntary', 1)).toBe(true);
  });

  it('denies the benefit when contributions are under 1 year', () => {
    expect(isUnemploymentBenefitEligible('involuntary', 0.9)).toBe(false);
  });

  it('zeroes out unemployment income in the combo strategy when resigning voluntarily', () => {
    const involuntary = calculateStrategies(mockInputs, mockCity);
    const voluntary = calculateStrategies(
      { ...mockInputs, separationType: 'voluntary' },
      mockCity
    );

    const comboInvol = involuntary.find((s) => s.id === 'unemployment_4050')!;
    const comboVol = voluntary.find((s) => s.id === 'unemployment_4050')!;

    // 主动辞职拿不到失业金 -> 补贴总额更低、净成本更高
    expect(comboVol.totalSubsidies).toBeLessThan(comboInvol.totalSubsidies);
    expect(comboVol.netCost).toBeGreaterThan(comboInvol.netCost);
    expect(comboVol.warnings.some((w) => w.includes('主动辞职'))).toBe(true);

    // 但主动辞职期间持续缴养老 -> 养老缴费年限更长，养老金不应更低
    expect(comboVol.retireMonthlyPension).toBeGreaterThanOrEqual(
      comboInvol.retireMonthlyPension
    );
  });
});

describe('Shanghai-specific combo-strategy rules', () => {
  const shanghai = CITIES[0];
  const shInputs: UserInputs = {
    ...mockInputs,
    cityId: 'shanghai',
    birthYearMonth: '1980-01',
    resignYearMonth: '2026-10',
    dataAsOfYearMonth: '2026-10',
    retireAge: 63,
    paidMonths: 216,
  };

  it('splits the unemployment timeline where the benefit steps down at month 13', () => {
    const combo = calculateStrategies(shInputs, shanghai).find(
      (s) => s.id === 'unemployment_4050'
    )!;
    const unempSteps = combo.timeline.filter((t) => t.action.includes('失业保险金'));
    expect(unempSteps).toHaveLength(2);
    expect(unempSteps[0].period).toContain('第 1 - 12 个月');
    expect(unempSteps[0].financialImpact).toContain('¥2340');
    expect(unempSteps[1].period).toContain('第 13 - 24 个月');
    expect(unempSteps[1].financialImpact).toContain('¥1872');
    // 前 12 个月累计 12×2340 = 28080
    expect(unempSteps[0].financialImpact).toContain('28080');
  });

  it('caps the standard older-worker subsidy at 36 months', () => {
    const combo = calculateStrategies(shInputs, shanghai).find(
      (s) => s.id === 'unemployment_4050'
    )!;
    const standard = combo.timeline.find((t) => t.action.includes('累计最长 3 年'))!;
    const [, start, end] = standard.period.match(/第 (\d+) - (\d+) 个月/)!;
    expect(Number(end) - Number(start) + 1).toBe(36);
  });

  it('withholds the subsidy until the 6-month unemployment threshold is met', () => {
    // 主动辞职 -> 无失业金月份，补贴不得从第 1 个月就开始
    const combo = calculateStrategies(
      { ...shInputs, separationType: 'voluntary' },
      shanghai
    ).find((s) => s.id === 'unemployment_4050')!;

    const firstSubsidy = combo.timeline.find((t) => t.action.includes('社保补贴'))!;
    const startMonth = Number(firstSubsidy.period.match(/第 (\d+)/)![1]);
    expect(startMonth).toBe(shanghai.subsidyMinUnemployedMonths + 1);
    // 离职后的第一个阶段(第 1 个月起)只能按普通灵活就业自缴
    const firstAfterResign = combo.timeline.find((t) => /第 1 -/.test(t.period))!;
    expect(firstAfterResign.action).toContain('普通自缴');
  });

  it('extends the subsidy through retirement inside the 5-year bridge window', () => {
    const combo = calculateStrategies(shInputs, shanghai).find(
      (s) => s.id === 'unemployment_4050'
    )!;
    const bridge = combo.timeline.find((t) => t.action.includes('可延长至退休'))!;
    const monthsToRetire = Number(
      combo.timeline[combo.timeline.length - 1].period.match(/- (\d+) 个月/)![1]
    );
    const [, start, end] = bridge.period.match(/第 (\d+) - (\d+) 个月/)!;
    // 衔接补贴一直延续到最后一个月
    expect(Number(end)).toBe(monthsToRetire);
    expect(Number(end) - Number(start) + 1).toBe(60);
  });

  it('uses a 31% total contribution rate (20% pension + 11% medical)', () => {
    expect(
      shanghai.flexiblePensionRate + shanghai.flexibleMedicalRate
    ).toBeCloseTo(0.31, 10);
    expect(shanghai.flexiblePensionAccountRate).toBe(0.08);
  });
});

/**
 * 回归门禁：存量数据基准月 (dataAsOfYearMonth) 与离职时点必须分开。
 *
 * 曾有缺陷：把离职当月当成所有存量数据的基准时点，导致推迟离职被三重低估
 * —— 退休时社平工资少涨几个月、个人账户少滚几个月、离职前仍在职的月份凭空消失。
 * 表象是"离职越晚，测算出的养老金越低"，与常识相反。
 */
describe('存量数据基准月与离职时点分离', () => {
  const shanghai = CITIES[0];
  // 1980-01 生、61.5 岁退休 -> 退休时点固定为 2041-07，与离职月无关
  const baseInputs: UserInputs = {
    ...mockInputs,
    cityId: 'shanghai',
    birthYearMonth: '1980-01',
    dataAsOfYearMonth: '2026-09',
    retireAge: 61.5,
    paidMonths: 216,
    personalAccountBalance: 120000,
  };

  const run = (resignYearMonth: string) =>
    calculateStrategies({ ...baseInputs, resignYearMonth }, shanghai);

  it('推迟离职不会让任何方案的养老金变低', () => {
    const early = run('2026-12');
    const late = run('2027-03');

    for (const e of early) {
      const l = late.find((s) => s.id === e.id)!;
      expect(
        l.retireMonthlyPension,
        `${e.id}: 晚离职 ${l.retireMonthlyPension} < 早离职 ${e.retireMonthlyPension}`
      ).toBeGreaterThanOrEqual(e.retireMonthlyPension);
    }
  });

  it('多在职 3 个月会提高断缴方案的养老金 (多 3 个月单位缴费)', () => {
    const early = run('2026-12').find((s) => s.id === 'stop')!;
    const late = run('2027-03').find((s) => s.id === 'stop')!;
    expect(late.retireMonthlyPension).toBeGreaterThan(early.retireMonthlyPension);
    // 断缴方案个人不掏钱，与离职早晚无关
    expect(early.netCost).toBe(0);
    expect(late.netCost).toBe(0);
  });

  it('推迟离职会降低自缴方案的净成本 (在职期由单位缴，不计入方案成本)', () => {
    const early = run('2026-12').find((s) => s.id === 'min_self')!;
    const late = run('2027-03').find((s) => s.id === 'min_self')!;
    expect(late.netCost).toBeLessThan(early.netCost);
  });

  it('把离职前的在职月份作为前置阶段展示，离职后仍从第 1 个月起编号', () => {
    const combo = run('2026-12').find((s) => s.id === 'unemployment_4050')!;
    expect(combo.timeline[0].period).toContain('离职前 3 个月');
    expect(combo.timeline[0].period).toContain('2026年10月 - 2026年12月');
    expect(combo.timeline[0].action).toContain('单位继续申报缴纳');
    // 离职后的阶段编号不受前置段影响
    expect(combo.timeline[1].period).toContain('第 1 -');
    expect(combo.warnings.some((w) => w.includes('2026-09 为存量数据基准月'))).toBe(true);
  });

  it('基准月 = 离职月时没有在职前置段', () => {
    const combo = calculateStrategies(
      { ...baseInputs, resignYearMonth: '2026-09' },
      shanghai
    ).find((s) => s.id === 'unemployment_4050')!;
    expect(combo.timeline[0].period).toContain('第 1 -');
    expect(combo.warnings.some((w) => w.includes('存量数据基准月'))).toBe(false);
  });

  it('离职月早于基准月时按"已离职"处理并给出提示', () => {
    const strategies = calculateStrategies(
      { ...baseInputs, resignYearMonth: '2026-03' },
      shanghai
    );
    const combo = strategies.find((s) => s.id === 'unemployment_4050')!;
    // 不得把基准月之前的月份计成在职缴费
    expect(combo.timeline[0].period).toContain('第 1 -');
    expect(combo.warnings.some((w) => w.includes('早于存量数据基准月'))).toBe(true);
  });

  it('缺省 dataAsOfYearMonth 时以当前月为基准，不回退到离职月', () => {
    // 离职月远在未来：缺省基准月(当前月)与离职月之间必然存在在职续缴段
    const combo = calculateStrategies(
      { ...baseInputs, dataAsOfYearMonth: undefined, resignYearMonth: '2035-01' },
      shanghai
    ).find((s) => s.id === 'unemployment_4050')!;
    expect(combo.timeline[0].period).toContain('离职前');
  });
});

/**
 * 静态口径 (staticBasis)：三项增长假设一并归零，使全部金额以当前社平工资为基准。
 * 门禁重点是"三项"缺一不可 —— 只关掉社平增长而漏掉记账利率或调增率，
 * 结果就仍是混合口径，无法与官方演示表对照。
 */
describe('静态口径 staticBasis', () => {
  const shanghai = CITIES[0];
  const dynamicInputs: UserInputs = {
    ...mockInputs,
    cityId: 'shanghai',
    birthYearMonth: '1980-01',
    resignYearMonth: '2026-12',
    dataAsOfYearMonth: '2026-09',
    retireAge: 61.5,
    paidMonths: 216,
    personalAccountBalance: 120000,
    futureSalaryGrowthRate: 0.03,
    pensionIndexationRate: 0.02,
  };
  const staticInputs: UserInputs = { ...dynamicInputs, staticBasis: true };

  it('三项增长率全部归零后金额显著低于默认口径', () => {
    const dynamic = calculateStrategies(dynamicInputs, shanghai);
    const stat = calculateStrategies(staticInputs, shanghai);

    for (const d of dynamic) {
      const s = stat.find((x) => x.id === d.id)!;
      expect(s.retireMonthlyPension).toBeLessThan(d.retireMonthlyPension);
      expect(s.totalReceivedAt80).toBeLessThan(d.totalReceivedAt80);
    }
  });

  it('基础养老金以当前社平工资为基准，不含增长复利', () => {
    const stat = calculateStrategies(staticInputs, shanghai).find((s) => s.id === 'min_self')!;
    // 基础养老金 = 当前社平 × (1+加权指数)/2 × 缴费年限 × 1%
    // 加权指数 = (1.0×18 + 1.0×0.25 + 0.6×14.5833) / 32.8333
    const years = 216 / 12 + 3 / 12 + 175 / 12;
    const index = (1.0 * (216 / 12) + 1.0 * (3 / 12) + 0.6 * (175 / 12)) / years;
    const expected = shanghai.avgSalary * ((1 + index) / 2) * years * 0.01;
    expect(stat.retireBasicPension).toBe(Math.round(expected));
  });

  it('个人账户不计息：余额等于本金加各期缴费的简单累加', () => {
    // 断缴方案在静态口径下账户完全不动 -> 个人账户养老金 = 期初余额 / 计发月数
    const stat = calculateStrategies(
      { ...staticInputs, resignYearMonth: '2026-09' },
      shanghai
    ).find((s) => s.id === 'stop')!;
    expect(stat.retirePersonalPension).toBe(Math.round(120000 / 132));
  });

  it('退休后不调增：80 岁累计领取等于月养老金 × 12 × 年数', () => {
    const stat = calculateStrategies(staticInputs, shanghai).find((s) => s.id === 'min_self')!;
    expect(stat.totalReceivedAt80).toBe(
      Math.round(stat.retireMonthlyPension * 12 * (80 - 61.5))
    );
  });

  it('静态口径下成本也不含基数增长 (每月自缴额恒定)', () => {
    const stat = calculateStrategies(staticInputs, shanghai).find((s) => s.id === 'min_self')!;
    // 175 个月 × 下限 7546 × (20% + 11%)
    expect(stat.netCost).toBe(Math.round(175 * shanghai.baseMin * 0.31));
  });

  it('在提示中说明当前处于静态口径', () => {
    const stat = calculateStrategies(staticInputs, shanghai);
    for (const s of stat) {
      expect(s.warnings.some((w) => w.includes('静态口径'))).toBe(true);
    }
    const dynamic = calculateStrategies(dynamicInputs, shanghai);
    for (const d of dynamic) {
      expect(d.warnings.some((w) => w.includes('静态口径'))).toBe(false);
    }
  });

  it('手动把三项都拉到 0 与勾选静态口径完全等价', () => {
    const manual = calculateStrategies(
      {
        ...dynamicInputs,
        futureSalaryGrowthRate: 0,
        pensionIndexationRate: 0,
        personalAccountInterestRate: 0,
      },
      shanghai
    );
    const flagged = calculateStrategies(staticInputs, shanghai);

    for (const m of manual) {
      const f = flagged.find((s) => s.id === m.id)!;
      expect(m.retireMonthlyPension).toBe(f.retireMonthlyPension);
      expect(m.retireBasicPension).toBe(f.retireBasicPension);
      expect(m.retirePersonalPension).toBe(f.retirePersonalPension);
      expect(m.netCost).toBe(f.netCost);
      expect(m.totalReceivedAt80).toBe(f.totalReceivedAt80);
    }
  });

  it('勾选静态口径不改动用户填写的三项原值', () => {
    const inputs = { ...dynamicInputs, staticBasis: true };
    calculateStrategies(inputs, shanghai);
    expect(inputs.futureSalaryGrowthRate).toBe(0.03);
    expect(inputs.pensionIndexationRate).toBe(0.02);
    expect(inputs.personalAccountInterestRate).toBeUndefined();
  });

  it('复现上海官方演示表：男 60 岁、社平 100% 基数缴 30 年', () => {
    // 演示表口径 = 静态口径：社平 12307 恒定、账户不计息、不含过渡性养老金
    // 表值 6,242 = 基础 3,692 + 个人账户 2,550
    const avgSalary = 12307;
    const result = calculatePension({
      avgSalaryAtRetire: avgSalary,
      avgPayIndex: 1.0,
      totalPaidYears: 30,
      personalAccountBalanceAtRetire: avgSalary * 0.08 * 30 * 12,
      retireAge: 60,
    });
    expect(result.basicPension).toBe(3692);
    expect(result.personalPension).toBe(2550);
    expect(result.totalPension).toBe(6242);
  });
});

describe('个人账户记账利率可调 (原为硬编码 3%)', () => {
  const shanghai = CITIES[0];
  const base: UserInputs = {
    ...mockInputs,
    cityId: 'shanghai',
    birthYearMonth: '1980-01',
    resignYearMonth: '2026-09',
    dataAsOfYearMonth: '2026-09',
    retireAge: 61.5,
    paidMonths: 216,
    personalAccountBalance: 120000,
  };

  const personalPartAt = (rate: number | undefined) =>
    calculateStrategies({ ...base, personalAccountInterestRate: rate }, shanghai).find(
      (s) => s.id === 'stop'
    )!.retirePersonalPension;

  it('利率为 0 时账户完全不滚存', () => {
    // 断缴方案无新增缴费：账户 = 期初余额，个人账户养老金 = 120000 / 132 (61 岁计发月数)
    expect(personalPartAt(0)).toBe(Math.round(120000 / 132));
  });

  it('利率越高个人账户部分越高，且缺省值仍为 3%', () => {
    expect(personalPartAt(0.05)).toBeGreaterThan(personalPartAt(0.03));
    expect(personalPartAt(0.03)).toBeGreaterThan(personalPartAt(0));
    // 未填写时沿用缺省 3%，行为与改造前一致
    expect(personalPartAt(undefined)).toBe(personalPartAt(0.03));
  });

  it('只影响个人账户部分，不影响基础养老金', () => {
    const low = calculateStrategies({ ...base, personalAccountInterestRate: 0 }, shanghai).find(
      (s) => s.id === 'stop'
    )!;
    const high = calculateStrategies(
      { ...base, personalAccountInterestRate: 0.06 },
      shanghai
    ).find((s) => s.id === 'stop')!;
    expect(high.retireBasicPension).toBe(low.retireBasicPension);
    expect(high.retirePersonalPension).toBeGreaterThan(low.retirePersonalPension);
  });
});

describe('payBaseRange 与自定义社平工资', () => {
  const shanghai = CITIES[0];

  it('由社平推导的上下限与上海官方公布值一致', () => {
    // 人社局 2026-08-18 公布：2025 年度社平 12577 -> 下限 7546、上限 37731
    expect(payBaseRange(12577)).toEqual({ baseMin: 7546, baseMax: 37731 });
    // 上一年度：社平 12434 -> 下限 7460、上限 37302
    expect(payBaseRange(12434)).toEqual({ baseMin: 7460, baseMax: 37302 });
  });

  it('内置配置的上下限恰好等于按社平推导的值', () => {
    // 门禁：若日后改了 avgSalary 却忘了同步 baseMin/baseMax，此处会失败
    for (const c of CITIES) {
      expect(payBaseRange(c.avgSalary), `${c.cityName} 的基数上下限与社平不自洽`).toEqual({
        baseMin: c.baseMin,
        baseMax: c.baseMax,
      });
    }
  });

  const base: UserInputs = {
    ...mockInputs,
    cityId: 'shanghai',
    birthYearMonth: '1980-01',
    resignYearMonth: '2026-09',
    dataAsOfYearMonth: '2026-09',
    retireAge: 61.5,
    paidMonths: 216,
    personalAccountBalance: 120000,
    staticBasis: true, // 静态口径便于用恒定基数直接反算成本
  };

  it('覆盖社平工资时缴费基数上下限同步重算', () => {
    // 社平提高 10% -> 最低档自缴成本也应提高 10%(基数下限 = 社平 × 60%)
    const official = calculateStrategies(base, shanghai).find((s) => s.id === 'min_self')!;
    const raised = calculateStrategies(
      { ...base, customAvgSalary: Math.round(shanghai.avgSalary * 1.1) },
      shanghai
    ).find((s) => s.id === 'min_self')!;

    const months = 178; // 2026-09 至 61.5 岁(2041-07)
    expect(official.netCost).toBe(Math.round(months * shanghai.baseMin * 0.31));
    expect(raised.netCost).toBe(
      Math.round(months * payBaseRange(Math.round(shanghai.avgSalary * 1.1)).baseMin * 0.31)
    );
  });

  it('覆盖社平后最低档缴费指数仍是法定 0.6，不因新旧基数错配而偏移', () => {
    // 旧缺陷形态：社平换成新值、基数下限仍用旧配置 -> 指数 = 旧下限/新社平 < 0.6，
    // 而 effectivePayIndex 的钳制会把偏差吃掉，养老金被静默低估。
    // 方案二全程按下限自缴，故加权指数应落在 [0.6, 历史指数] 之间且与社平取值无关。
    // 令历史指数也取 0.6，则全程指数恒为 0.6，
    // 基础养老金应严格等于 社平 × (1+0.6)/2 × 年限 × 1%，与社平的绝对值无关。
    const years = 240 / 12 + 178 / 12;
    const at = (avg: number) => {
      const s = calculateStrategies(
        { ...base, customAvgSalary: avg, paidMonths: 240, avgPayIndex: 0.6 },
        shanghai
      ).find((x) => x.id === 'min_self')!;
      return s.retireBasicPension / (avg * 0.8 * years * 0.01);
    };
    expect(at(12577)).toBeCloseTo(1, 3);
    expect(at(20000)).toBeCloseTo(1, 3);
    expect(at(8000)).toBeCloseTo(1, 3);
  });

  it('未覆盖或填入与官方相同的值时沿用内置配置', () => {
    const plain = calculateStrategies(base, shanghai);
    const same = calculateStrategies(
      { ...base, customAvgSalary: shanghai.avgSalary },
      shanghai
    );
    for (const p of plain) {
      const s = same.find((x) => x.id === p.id)!;
      expect(s.retireMonthlyPension).toBe(p.retireMonthlyPension);
      expect(s.netCost).toBe(p.netCost);
    }
  });
});

describe('validateCityPolicy', () => {
  it('flags a base floor that is not 60% of the average wage', () => {
    // 杭州实际配置: 4462 / 9210 = 48.4%
    const issues = validateCityPolicy({
      ...mockCity,
      cityName: '杭州',
      avgSalary: 9210,
      baseMin: 4462,
      baseMax: 22311,
    });
    expect(issues.some((i) => i.includes('与法定 60% 不符'))).toBe(true);
  });

  it('accepts an internally consistent configuration', () => {
    const issues = validateCityPolicy({
      ...mockCity,
      avgSalary: 10000,
      baseMin: 6000,
      baseMax: 30000,
      dataVintage: '2024年度 / 某市人社局',
    });
    expect(issues).toEqual([]);
  });

  it('flags configurations with no documented data vintage', () => {
    const issues = validateCityPolicy({
      ...mockCity,
      avgSalary: 10000,
      baseMin: 6000,
      baseMax: 30000,
      dataVintage: '待核实',
    });
    expect(issues.some((i) => i.includes('未标注数据年度'))).toBe(true);
  });

  it('passes every shipped city configuration', () => {
    // 门禁：新增城市若口径不一致或未标注来源，此测试会失败
    for (const c of CITIES) {
      expect(validateCityPolicy(c), `${c.cityName} 配置未通过校验`).toEqual([]);
    }
  });
});

describe('effectivePayIndex', () => {
  it('derives the index from base/avgSalary rather than assuming 0.6', () => {
    // 杭州口径: 4462 / 9210 = 0.484 -> 钳制到法定下限 0.6
    expect(effectivePayIndex(4462, 9210)).toBe(0.6);
    // 上海口径: 7310 / 12183 = 0.600
    expect(effectivePayIndex(7310, 12183)).toBeCloseTo(0.6, 2);
    // 100% 社平基数 -> 指数 1.0
    expect(effectivePayIndex(12183, 12183)).toBe(1);
  });

  it('clamps to the legal 0.6-3.0 range', () => {
    expect(effectivePayIndex(1000, 10000)).toBe(0.6);
    expect(effectivePayIndex(99999, 10000)).toBe(3.0);
  });
});

describe('totalReceivedUntil', () => {
  it('accounts for annual pension indexation instead of a flat sum', () => {
    const flat = totalReceivedUntil(1000, 60, 80, 0);
    const indexed = totalReceivedUntil(1000, 60, 80, 0.02);
    expect(flat).toBe(1000 * 12 * 20);
    expect(indexed).toBeGreaterThan(flat);
  });

  it('never returns a negative amount when retiring at or past the horizon', () => {
    expect(totalReceivedUntil(5000, 80, 80, 0.02)).toBe(0);
    expect(totalReceivedUntil(5000, 85, 80, 0.02)).toBe(0);
  });

  it('returns 0 when there is no monthly pension to draw', () => {
    expect(totalReceivedUntil(0, 60, 80, 0.02)).toBe(0);
  });
});

describe('getUnemploymentMonths', () => {
  // 上海口径：每满 1 年缴费年限领 2 个月，上限 24 个月
  const SH = { perYear: 2, max: 24 };

  it('returns 0 for less than 1 year of contributions', () => {
    expect(getUnemploymentMonths(0.5, SH.perYear, SH.max)).toBe(0);
  });

  it("grants 2 months per full year under Shanghai's schedule", () => {
    expect(getUnemploymentMonths(1, SH.perYear, SH.max)).toBe(2);
    expect(getUnemploymentMonths(2.9, SH.perYear, SH.max)).toBe(4);
    expect(getUnemploymentMonths(10, SH.perYear, SH.max)).toBe(20);
  });

  it('reaches the 24-month cap at 12 years, not 8', () => {
    expect(getUnemploymentMonths(12, SH.perYear, SH.max)).toBe(24);
    expect(getUnemploymentMonths(30, SH.perYear, SH.max)).toBe(24);
    // 8年在上海只有16个月；按"每年3个月"的通用口径会错算成封顶24个月
    expect(getUnemploymentMonths(8, SH.perYear, SH.max)).toBe(16);
    expect(getUnemploymentMonths(8, 3, 24)).toBe(24);
  });
});

describe('unemploymentBenefitAtMonth', () => {
  const tiers = [
    { throughMonth: 12, monthly: 2340 },
    { throughMonth: 24, monthly: 1872 },
  ];

  it('pays the full standard for the first 12 months', () => {
    expect(unemploymentBenefitAtMonth(tiers, 1)).toBe(2340);
    expect(unemploymentBenefitAtMonth(tiers, 12)).toBe(2340);
  });

  it('steps down to 80% from month 13', () => {
    expect(unemploymentBenefitAtMonth(tiers, 13)).toBe(1872);
    expect(unemploymentBenefitAtMonth(tiers, 24)).toBe(1872);
  });

  it('holds the last tier beyond the table rather than dropping to zero', () => {
    expect(unemploymentBenefitAtMonth(tiers, 30)).toBe(1872);
  });

  it('sums to the correct 24-month total for Shanghai', () => {
    let total = 0;
    for (let m = 1; m <= 24; m++) total += unemploymentBenefitAtMonth(tiers, m);
    // 12×2340 + 12×1872 = 28080 + 22464 = 50544
    expect(total).toBe(50544);
  });
});

describe('computeBreakEvenYears', () => {
  it('computes a finite payback period when the pension gain is positive', () => {
    expect(computeBreakEvenYears(12000, 1000)).toBe(1);
  });

  it('returns Infinity instead of a misleading finite number when the pension gain is not positive', () => {
    expect(computeBreakEvenYears(12000, 0)).toBe(Infinity);
    expect(computeBreakEvenYears(12000, -50)).toBe(Infinity);
  });

  it('returns 0 when there is no net cost to recoup', () => {
    expect(computeBreakEvenYears(0, 500)).toBe(0);
    expect(computeBreakEvenYears(-100, 500)).toBe(0);
  });
});