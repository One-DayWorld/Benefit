import { UserInputs, CityPolicy, StrategyResult, TimelineStep } from '../types';
import { calculatePension, MIN_PENSION_YEARS } from './pension';

/** 个人账户记账利率的缺省假设 (人社部每年公布，近年区间约 2%~4%，取保守中位值) */
export const DEFAULT_PERSONAL_ACCOUNT_INTEREST_RATE = 0.03;

/** 缴费指数法定区间：基数下限为社平 60%、上限为社平 300% */
const MIN_PAY_INDEX = 0.6;
const MAX_PAY_INDEX = 3.0;

/**
 * 领取失业保险金的法定条件 (《社会保险法》第四十五条)：
 * 1) 失业前用人单位和本人已缴纳失业保险费满一年；
 * 2) **非因本人意愿中断就业**；
 * 3) 已办理失业登记并有求职要求。
 * 主动辞职属于"因本人意愿中断就业"，通常不能申领失业保险金。
 */
export function isUnemploymentBenefitEligible(
  separationType: UserInputs['separationType'],
  paidYears: number
): boolean {
  return separationType !== 'voluntary' && paidYears >= 1;
}

/**
 * 失业金可领月数。各地规则不同：上海为"满1年不满2年发2个月，之后每增加1年
 * 缴费年限增加2个月，一次核定最长24个月"；多数城市为每满1年3个月。
 * 故月数系数与上限均由城市配置提供，不再硬编码。
 */
export function getUnemploymentMonths(
  paidYears: number,
  monthsPerPaidYear: number,
  maxMonths: number
): number {
  if (paidYears < 1) return 0;
  return Math.min(maxMonths, Math.floor(paidYears) * monthsPerPaidYear);
}

/**
 * 领取失业金第 monthIndex 个月(从 1 计)的月标准。上海按已领取月份三段递减，
 * 而非按缴费年限分档，故须逐月取值而不能用单一均值。
 */
export function unemploymentBenefitAtMonth(
  tiers: CityPolicy['unemploymentBenefitTiers'],
  monthIndex: number
): number {
  for (const tier of tiers) {
    if (monthIndex <= tier.throughMonth) return tier.monthly;
  }
  return tiers.length ? tiers[tiers.length - 1].monthly : 0;
}

export function calculateAge(birthYM: string, targetYM: string): number {
  const [bYear, bMonth] = birthYM.split('-').map(Number);
  const [tYear, tMonth] = targetYM.split('-').map(Number);
  return (tYear * 12 + tMonth - (bYear * 12 + bMonth)) / 12;
}

/** 两个 YYYY-MM 相差的月数 (toYM - fromYM)，toYM 在前则为负 */
export function monthsBetweenYM(fromYM: string, toYM: string): number {
  const [fYear, fMonth] = fromYM.split('-').map(Number);
  const [tYear, tMonth] = toYM.split('-').map(Number);
  return tYear * 12 + tMonth - (fYear * 12 + fMonth);
}

/** 当前年月 YYYY-MM，作为存量数据基准时点的默认值 */
export function currentYearMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonthsToYM(ymStr: string, addMonths: number): string {
  if (!ymStr) return '';
  const [year, month] = ymStr.split('-').map(Number);
  const totalMonths = (year || 2026) * 12 + ((month || 1) - 1) + addMonths;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  return `${targetYear}年${String(targetMonth).padStart(2, '0')}月`;
}

/**
 * 实际缴费指数 = 缴费基数 / 社平工资，并钳制在法定 [0.6, 3.0] 区间。
 * 不可硬编码为 0.6：多数城市配置的基数下限并非其社平工资的 60%
 * (口径差异，如下限按全省社平、社平按全市统计)，硬编码会高估养老金。
 */
export function effectivePayIndex(base: number, avgSalary: number): number {
  if (!avgSalary) return MIN_PAY_INDEX;
  return Math.min(MAX_PAY_INDEX, Math.max(MIN_PAY_INDEX, base / avgSalary));
}

/**
 * 由社平工资推导法定缴费基数区间 [60%, 300%]。
 *
 * 与官方公布值一致可验证：上海 2025 年度社平 12577 → 下限 round(7546.2)=7546、
 * 上限 37731，与人社局 2026-08-18 公布的数字完全相同。
 * 用户自定义社平工资时必须同步用它重算上下限，否则会拿旧年度的基数去除新社平。
 */
export function payBaseRange(avgSalary: number): { baseMin: number; baseMax: number } {
  return {
    baseMin: Math.round(avgSalary * MIN_PAY_INDEX),
    baseMax: Math.round(avgSalary * MAX_PAY_INDEX),
  };
}

/**
 * 校验城市配置的内部口径一致性。
 *
 * 法定缴费基数区间为社平的 [60%, 300%]，因此 baseMin/avgSalary 必须约等于 0.6、
 * baseMax/avgSalary 必须约等于 3.0。若明显偏离，说明这两个字段取自不同统计口径
 * 或不同年度，会直接导致缴费指数与养老金测算失真——而法定钳制会把偏差"吃掉"，
 * 使错误静默，故必须显式报出。
 */
export function validateCityPolicy(city: CityPolicy): string[] {
  const issues: string[] = [];
  if (!city.avgSalary) return ['社平工资未配置'];

  const minRatio = city.baseMin / city.avgSalary;
  const maxRatio = city.baseMax / city.avgSalary;

  if (Math.abs(minRatio - MIN_PAY_INDEX) > 0.02) {
    issues.push(
      `${city.cityName}配置的缴费基数下限 ¥${city.baseMin} 为社平 ¥${city.avgSalary} 的 ${(minRatio * 100).toFixed(1)}%，` +
        `与法定 60% 不符，两个字段可能取自不同统计口径或年度，最低档养老金测算存在偏差。`
    );
  }
  if (Math.abs(maxRatio - MAX_PAY_INDEX) > 0.05) {
    issues.push(
      `${city.cityName}配置的缴费基数上限 ¥${city.baseMax} 为社平 ¥${city.avgSalary} 的 ${(maxRatio * 100).toFixed(0)}%，与法定 300% 不符。`
    );
  }
  if (city.dataVintage === '待核实' || !city.dataVintage) {
    issues.push(`${city.cityName}的社保参数未标注数据年度与官方来源，测算前请核实。`);
  }
  return issues;
}

/** 缴费基数随社平工资年化增长率同步预测，与退休时点养老金测算口径保持一致 */
function baseAtMonth(base: number, growthRate: number, monthIndex: number): number {
  return base * Math.pow(1 + growthRate, (monthIndex - 1) / 12);
}

/** 个人账户按月记账利率滚存本息 (简化为固定年利率複利) */
function accumulatePersonalAccount(
  initialBalance: number,
  months: number,
  contributionAtMonth: (monthIndex: number) => number,
  annualRate: number = DEFAULT_PERSONAL_ACCOUNT_INTEREST_RATE
): number {
  const monthlyRate = annualRate / 12;
  let balance = initialBalance;
  for (let m = 1; m <= months; m++) {
    balance = (balance + contributionAtMonth(m)) * (1 + monthlyRate);
  }
  return balance;
}

/**
 * 退休后累计领取额。养老金全国已连续多年调增，若按恒定养老金累加会显著低估，
 * 且与成本侧采用增长率的假设不一致，故按年金增长模型折算。
 */
export function totalReceivedUntil(
  monthlyPension: number,
  retireAge: number,
  untilAge: number,
  annualIndexationRate: number
): number {
  const years = untilAge - retireAge;
  if (years <= 0 || monthlyPension <= 0) return 0;
  const annual = monthlyPension * 12;
  if (annualIndexationRate === 0) return Math.round(annual * years);
  const growthFactor =
    (Math.pow(1 + annualIndexationRate, years) - 1) / annualIndexationRate;
  return Math.round(annual * growthFactor);
}

/** 回本年限：养老金增量为零或负时代表永远无法回本 */
export function computeBreakEvenYears(netCost: number, deltaMonthlyPension: number): number {
  if (deltaMonthlyPension <= 0) return Infinity;
  if (netCost <= 0) return 0;
  return Number((netCost / (deltaMonthlyPension * 12)).toFixed(1));
}

function buildImpactText(
  type: string,
  monthCount: number,
  monthlyCost: number,
  originalMonthlyCost: number,
  monthlySubsidy: number
): string {
  if (type === 'unemployment') {
    return `月领 ¥${monthlySubsidy}，阶段累计领 ¥${monthlySubsidy * monthCount}`;
  }
  if (type.startsWith('subsidy')) {
    return `月自缴约 ¥${monthlyCost} (原价 ¥${originalMonthlyCost}，补贴 ¥${monthlySubsidy})`;
  }
  return `月自缴约 ¥${monthlyCost}`;
}

export function calculateStrategies(
  inputs: UserInputs,
  city: CityPolicy
): StrategyResult[] {
  const paidYears = inputs.paidMonths / 12;

  // ── 三项增长假设 ──────────────────────────────────────────────────────────
  // 三项均可独立调节(含 0)；staticBasis 只是"一并归零"的快捷开关，勾选时不改动
  // 用户填写的原值，取消勾选即恢复。全部归零后金额以**当前社平工资**为基准：
  // 默认口径算出的是退休当年的名义金额(含十几年社平增长复利)，数值大但无法与
  // 当下的工资、物价或官方"退休金演示表"直接比较。
  const staticBasis = inputs.staticBasis === true;
  const growthRate = staticBasis ? 0 : inputs.futureSalaryGrowthRate;
  const indexationRate = staticBasis ? 0 : inputs.pensionIndexationRate ?? 0.02;
  const accountInterestRate = staticBasis
    ? 0
    : inputs.personalAccountInterestRate ?? DEFAULT_PERSONAL_ACCOUNT_INTEREST_RATE;

  // ── 时间轴基准 ────────────────────────────────────────────────────────────
  // paidMonths / personalAccountBalance / 城市社平工资都是**存量数据**，基准时点是
  // 数据采集当月 (dataAsOfYM)，不是离职当月；而退休时点由出生年月与 retireAge 固定，
  // 与离职时点无关。因此"到退休还有多久"必须从 dataAsOfYM 起算，再拆成
  // 「在职续缴段」+「离职后段」两截。若误以离职当月为起点，推迟离职会被三重低估：
  // 社平少涨几个月、个人账户少滚几个月、在职续缴的月份凭空消失。
  const dataAsOfYM = inputs.dataAsOfYearMonth || currentYearMonth();
  const ageAtDataAsOf = calculateAge(inputs.birthYearMonth, dataAsOfYM);
  const ageAtResign = calculateAge(inputs.birthYearMonth, inputs.resignYearMonth);

  /** 数据基准月至退休的总月数：所有存量数据的滚存与预测都在这条轴上 */
  const monthsToRetire = Math.max(0, Math.round((inputs.retireAge - ageAtDataAsOf) * 12));
  /** 基准月之后仍在职、由单位继续申报缴费的月数 (离职早于基准月则为 0) */
  const employedMonths = Math.min(
    monthsToRetire,
    Math.max(0, monthsBetweenYM(dataAsOfYM, inputs.resignYearMonth))
  );
  /** 离职后至退休的月数：四个方案的自缴/断缴决策只作用于这一段 */
  const monthsAfterResign = monthsToRetire - employedMonths;
  const employedYears = employedMonths / 12;
  const yearsAfterResign = monthsAfterResign / 12;

  const avgSalary = inputs.customAvgSalary || city.avgSalary;
  // 退休时社平工资预测：增长年限从数据基准月算到退休，与离职时点无关
  const futureAvgSalary =
    avgSalary * Math.pow(1 + growthRate, monthsToRetire / 12);

  // 自定义社平工资时，缴费基数上下限必须按法定 60%/300% 从该值同步重算。
  // 否则会拿旧年度的基数下限去除新社平，最低档缴费指数偏离法定 0.6，
  // 而 effectivePayIndex 的钳制会把偏差静默吃掉，养老金测算就此失真。
  const usesCustomAvgSalary =
    Boolean(inputs.customAvgSalary) && inputs.customAvgSalary !== city.avgSalary;
  const { baseMin: cfgBaseMin, baseMax: cfgBaseMax } = usesCustomAvgSalary
    ? payBaseRange(avgSalary)
    : { baseMin: city.baseMin, baseMax: city.baseMax };

  // 城市配置数据的口径一致性问题会静默扭曲所有方案，附加到每个方案的提示中
  const dataIssues = validateCityPolicy(city);

  // 时间轴基准的口径说明：使用者必须知道存量数据是"截至哪个月"的，否则无法判断
  // "离职前仍在职的这几个月"是否被重复计算或漏算。
  const baselineNotes: string[] = [];
  if (staticBasis) {
    baselineNotes.push(
      `已启用**静态口径**：未来社平工资年化增长率、退休后养老金年均调增率、个人账户记账利率一律按 0 计算。` +
        `所有金额以当前社平工资 ¥${Math.round(avgSalary)} 为基准，可与官方退休金演示表逐格对照，也可直接与您现在的收入比较；` +
        `实际到手的名义金额会因社平工资上涨与养老金逐年调增而高于此处数值。`
    );
  }
  if (employedMonths > 0) {
    baselineNotes.push(
      `测算以 ${dataAsOfYM} 为存量数据基准月：已累计缴费 ${inputs.paidMonths} 个月、` +
        `个人账户 ¥${inputs.personalAccountBalance.toLocaleString()} 均视为截至该月的数值。` +
        `该月至离职的 ${employedMonths} 个月按**在职、由单位继续申报缴费**测算(四个方案相同，` +
        `个人负担从工资代扣故不计入方案成本)。若您填写的已缴月数其实已包含这几个月，请把基准月往后调，否则会重复计算。`
    );
  }
  if (monthsBetweenYM(dataAsOfYM, inputs.resignYearMonth) < 0) {
    baselineNotes.push(
      `计划离职年月 ${inputs.resignYearMonth} 早于存量数据基准月 ${dataAsOfYM}，` +
        `已按"离职已发生"处理：自基准月起全程按各方案的自缴决策测算，不再计入在职缴费月份。`
    );
  }

  // 缴费基数钳制在法定 [下限, 上限] 区间内 (激活 baseMax 封顶)
  const minBase = Math.min(cfgBaseMin, cfgBaseMax);
  const fullBase = Math.min(Math.max(avgSalary, cfgBaseMin), cfgBaseMax);

  // 实际缴费指数按"基数/社平"推导，而非硬编码
  const minPayIndex = effectivePayIndex(minBase, avgSalary);
  const fullPayIndex = effectivePayIndex(fullBase, avgSalary);

  // ── 在职续缴段 (数据基准月 → 离职) ────────────────────────────────────────
  // 这一段四个方案完全相同：单位照常申报，缴费基数按历史缴费指数还原到工资口径，
  // 个人账户按职工个人 8% 增长，个人负担从工资代扣故不计入方案成本。
  const employedBase = Math.min(Math.max(inputs.avgPayIndex * avgSalary, cfgBaseMin), cfgBaseMax);
  const employedPayIndex = effectivePayIndex(employedBase, avgSalary);
  const employedAccountContribution = (m: number) =>
    baseAtMonth(employedBase, growthRate, m) *
    city.employeePensionAccountRate;

  /**
   * 个人账户滚存：统一以数据基准月为第 1 个月。前 employedMonths 个月按在职代扣，
   * 之后交由各方案决定 (afterResign 的入参是**离职后**第几个月，从 1 计)。
   */
  const accountAtRetire = (afterResign: (monthAfterResign: number) => number) =>
    accumulatePersonalAccount(
      inputs.personalAccountBalance,
      monthsToRetire,
      (m) =>
        m <= employedMonths ? employedAccountContribution(m) : afterResign(m - employedMonths),
      accountInterestRate
    );

  /**
   * 加权平均缴费指数 = (历史 + 在职续缴 + 离职后自缴) 按年限加权。
   * 在职段用历史缴费指数(工资口径)，自缴段用所选基数对应的指数。
   */
  const weightedPayIndex = (selfPaidYears: number, selfPayIndex: number) => {
    const years = paidYears + employedYears + selfPaidYears;
    if (!years) return inputs.avgPayIndex;
    return (
      (inputs.avgPayIndex * paidYears +
        employedPayIndex * employedYears +
        selfPayIndex * selfPaidYears) /
      years
    );
  };

  /** 离职前的在职阶段，四个方案共有，作为时间轴的前置步骤展示 */
  const employedStep = (): TimelineStep[] =>
    employedMonths > 0
      ? [
          {
            period: `离职前 ${employedMonths} 个月 (${addMonthsToYM(dataAsOfYM, 1)} - ${addMonthsToYM(dataAsOfYM, employedMonths)})`,
            action: '在职，社保由单位继续申报缴纳',
            financialImpact:
              `个人部分从工资代扣，四个方案相同，不计入方案成本；` +
              `个人账户按基数 ¥${Math.round(employedBase)} 的 ${(city.employeePensionAccountRate * 100).toFixed(0)}% 累积`,
          },
        ]
      : [];

  // 医保缴费年限：未单独填写时以养老缴费月数近似
  const medicalPaidMonths = inputs.medicalPaidMonths ?? inputs.paidMonths;
  const medicalMinYears =
    inputs.gender === 'female' ? city.medicalMinYearsFemale : city.medicalMinYearsMale;

  /** 生成医保年限提示；不足时退休后无法终身享受职工医保待遇，需补缴或延缴 */
  const medicalNote = (addedMedicalMonths: number): string | undefined => {
    const medicalYears = (medicalPaidMonths + addedMedicalMonths) / 12;
    if (medicalYears >= medicalMinYears) return undefined;
    const short = (medicalMinYears - medicalYears).toFixed(1);
    return `退休时职工医保累计缴费约 ${medicalYears.toFixed(1)} 年，低于${city.cityName}要求的 ${medicalMinYears} 年，尚差 ${short} 年。届时需一次性补缴或继续缴费才能终身享受职工医保待遇。`;
  };

  /** 生成养老年限提示 */
  const pensionNote = (
    eligible: boolean,
    yearsShort: number,
    lumpSum: number
  ): string | undefined => {
    if (eligible) return undefined;
    return `退休时养老累计缴费不足 ${MIN_PENSION_YEARS} 年（尚差 ${yearsShort} 年），依《社会保险法》第十六条无法按月领取基本养老金，只能延长缴费至满 15 年、转入城乡居民养老保险，或一次性领取个人账户约 ¥${lumpSum.toLocaleString()}。`;
  };

  // 1. 完全断缴策略：离职后个人账户无新增缴费，仅按记账利率滚存利息
  //    (离职前的在职月份仍照常缴费，故缴费年限为 已缴 + 在职续缴)
  const stopPaidYears = paidYears + employedYears;
  const stopAccountAtRetire = accountAtRetire(() => 0);

  const stopPension = calculatePension({
    avgSalaryAtRetire: futureAvgSalary,
    avgPayIndex: weightedPayIndex(0, 0),
    totalPaidYears: stopPaidYears,
    personalAccountBalanceAtRetire: stopAccountAtRetire,
    retireAge: inputs.retireAge,
  });

  const stopStrategy: StrategyResult = {
    id: 'stop',
    name: '方案一：离职后完全断缴',
    description: '不再自费缴纳社保，按已有年限测算。注意医保断缴风险。',
    totalSelfPaid: 0,
    totalSubsidies: 0,
    netCost: 0,
    retireMonthlyPension: stopPension.totalPension,
    retireBasicPension: stopPension.basicPension,
    retirePersonalPension: stopPension.personalPension,
    breakEvenYears: 0,
    totalReceivedAt80: totalReceivedUntil(
      stopPension.totalPension,
      inputs.retireAge,
      80,
      indexationRate
    ),
    isPensionEligible: stopPension.isEligible,
    warnings: [
      pensionNote(
        stopPension.isEligible,
        stopPension.yearsShortOfMinimum,
        stopPension.lumpSumIfIneligible
      ),
      medicalNote(employedMonths),
    ].filter((w): w is string => Boolean(w)).concat(baselineNotes, dataIssues),
    timeline: [
      ...employedStep(),
      {
        period: `离职后至退休 ${monthsAfterResign} 个月 (${addMonthsToYM(inputs.resignYearMonth, 1)} - ${addMonthsToYM(inputs.resignYearMonth, monthsAfterResign)})`,
        action: '停止自费缴纳养老与医保',
        financialImpact: '个人支出 0 元',
      },
    ],
  };

  // 2. 灵活就业最低档基数按月自缴
  // 养老 20% (其中8%进个人账户) + 医保约 8%；缴费基数随社平工资增长率逐年预测
  // 养老与医保严格分账：
  //   totalRate       -> 只用于"要交多少钱"与补贴基数
  //   pensionAccountRate -> 唯一进入养老个人账户的部分
  // 医保缴费不产生任何养老金，不可混入个人账户或缴费指数。
  const pensionRate = city.flexiblePensionRate;
  const pensionAccountRate = city.flexiblePensionAccountRate;
  const medicalRate = city.flexibleMedicalRate;
  const totalRate = pensionRate + medicalRate;

  // 缴费基数的增长同样从数据基准月起算，故离职后第 k 个月对应基准轴上的
  // 第 (employedMonths + k) 个月。
  let totalMinPaid = 0;
  for (let k = 1; k <= monthsAfterResign; k++) {
    totalMinPaid +=
      baseAtMonth(minBase, growthRate, employedMonths + k) * totalRate;
  }
  const avgMonthlyPayMin = monthsAfterResign > 0 ? totalMinPaid / monthsAfterResign : 0;

  const minAccountAtRetire = accountAtRetire(
    (k) => baseAtMonth(minBase, growthRate, employedMonths + k) * pensionAccountRate
  );

  const minPension = calculatePension({
    avgSalaryAtRetire: futureAvgSalary,
    avgPayIndex: weightedPayIndex(yearsAfterResign, minPayIndex),
    totalPaidYears: paidYears + employedYears + yearsAfterResign,
    personalAccountBalanceAtRetire: minAccountAtRetire,
    retireAge: inputs.retireAge,
  });

  const minBreakEven = computeBreakEvenYears(
    totalMinPaid,
    minPension.totalPension - stopPension.totalPension
  );

  const minStrategy: StrategyResult = {
    id: 'min_self',
    name: `方案二：灵活就业最低基数自缴 (指数 ${minPayIndex.toFixed(2)})`,
    description: '按最低基数自费缴纳养老与医保，保障医保连续性，稳步累积工龄。',
    totalSelfPaid: Math.round(totalMinPaid),
    totalSubsidies: 0,
    netCost: Math.round(totalMinPaid),
    retireMonthlyPension: minPension.totalPension,
    retireBasicPension: minPension.basicPension,
    retirePersonalPension: minPension.personalPension,
    breakEvenYears: minBreakEven,
    totalReceivedAt80: totalReceivedUntil(
      minPension.totalPension,
      inputs.retireAge,
      80,
      indexationRate
    ),
    isPensionEligible: minPension.isEligible,
    warnings: [
      pensionNote(
        minPension.isEligible,
        minPension.yearsShortOfMinimum,
        minPension.lumpSumIfIneligible
      ),
      medicalNote(monthsToRetire),
    ].filter((w): w is string => Boolean(w)).concat(baselineNotes, dataIssues),
    timeline: [
      ...employedStep(),
      {
        period: `第 1 - ${monthsAfterResign} 个月 (${addMonthsToYM(inputs.resignYearMonth, 1)} - ${addMonthsToYM(inputs.resignYearMonth, monthsAfterResign)})`,
        action: '以灵活就业身份按最低基数全额自缴',
        financialImpact: `月均自缴约 ¥${Math.round(avgMonthlyPayMin)}`,
      },
    ],
  };

  // 3. 失业金 + 大龄就业困难人员社保补贴 动态逐月规划组合策略
  // 主动辞职不符合《社会保险法》第四十五条"非因本人意愿中断就业"，不能申领失业金
  // 失业金资格与月数按**离职时点**的累计缴费年限核定 (含离职前的在职续缴月份)
  const paidYearsAtResign = paidYears + employedYears;
  const unempEligible = isUnemploymentBenefitEligible(inputs.separationType, paidYearsAtResign);
  const unempMonths = unempEligible
    ? Math.min(
        getUnemploymentMonths(
          paidYearsAtResign,
          city.unemploymentMonthsPerPaidYear,
          city.unemploymentMaxMonths
        ),
        monthsAfterResign
      )
    : 0;

  interface MonthStatus {
    monthIndex: number;
    type: 'unemployment' | 'subsidy_older' | 'subsidy_bridge' | 'normal';
    /** 同类型内区分档次，用于合并连续阶段时在金额变化处断开 */
    tierKey: string;
    label: string;
    monthlyCost: number;
    monthlySubsidy: number;
    monthlyAccountContribution: number;
  }

  const subsidyRatio = city.subsidyRatio;
  const olderWorkerAge =
    inputs.gender === 'female' ? city.olderWorkerAgeFemale : city.olderWorkerAgeMale;
  let standardSubsidyUsedMonths = 0; // 标准大龄补贴累计上限 city.subsidyMaxMonths

  const monthStatuses: MonthStatus[] = [];
  let totalUnempMoney = 0;

  // m 为**离职后**第几个月 (从 1 计)；换算到基准轴需加 employedMonths
  for (let m = 1; m <= monthsAfterResign; m++) {
    const monthBase = baseAtMonth(minBase, growthRate, employedMonths + m);
    const monthlyPayMin = monthBase * totalRate;
    const monthlyAccountContribution = monthBase * pensionAccountRate;
    // 上海补贴按"缴费基数下限计算的应缴社保费的50%"计，而非按实缴额；
    // 本方案本身按下限缴费，故两者一致——若日后支持按更高基数缴费需分开处理。
    const monthlySubsidyAmount = monthBase * totalRate * subsidyRatio;

    if (m <= unempMonths) {
      // 失业保险基金仅代缴基本医疗保险，不代缴养老保险：
      // 故此期间养老缴费年限与个人账户均不增加
      const benefit = unemploymentBenefitAtMonth(city.unemploymentBenefitTiers, m);
      totalUnempMoney += benefit;
      monthStatuses.push({
        monthIndex: m,
        type: 'unemployment',
        tierKey: `unemp_${benefit}`,
        label: '申领失业保险金，由失业保险基金代缴基本医疗保险（不代缴养老保险）',
        monthlyCost: 0,
        monthlySubsidy: benefit,
        monthlyAccountContribution: 0,
      });
    } else {
      const ageAtMonth = ageAtResign + (m - 1) / 12;
      const yearsToRetireAtMonth = inputs.retireAge - ageAtMonth;

      const isAgeEligible = ageAtMonth >= olderWorkerAge;
      // 认定"就业困难人员"要求连续失业满 N 个月，故补贴最早自第 N+1 个月起
      const isUnemployedLongEnough = m > city.subsidyMinUnemployedMonths;
      const isWithinBridge =
        yearsToRetireAtMonth <= city.subsidyBridgeYearsBeforeRetirement + 0.01;

      if (isAgeEligible && isUnemployedLongEnough && isWithinBridge) {
        // 距退休不足 N 年：补贴可延长至退休，不占标准 3 年额度
        monthStatuses.push({
          monthIndex: m,
          type: 'subsidy_bridge',
          tierKey: 'subsidy_bridge',
          label: `申请大龄就业困难人员社保补贴（距法定退休不足 ${city.subsidyBridgeYearsBeforeRetirement} 年，可延长至退休）`,
          monthlyCost: Math.round(monthlyPayMin - monthlySubsidyAmount),
          monthlySubsidy: Math.round(monthlySubsidyAmount),
          monthlyAccountContribution,
        });
      } else if (
        isAgeEligible &&
        isUnemployedLongEnough &&
        standardSubsidyUsedMonths < city.subsidyMaxMonths
      ) {
        standardSubsidyUsedMonths++;
        monthStatuses.push({
          monthIndex: m,
          type: 'subsidy_older',
          tierKey: 'subsidy_older',
          label: `申请大龄就业困难人员灵活就业社保补贴（男满${city.olderWorkerAgeMale}/女满${city.olderWorkerAgeFemale}周岁，累计最长 ${city.subsidyMaxMonths / 12} 年）`,
          monthlyCost: Math.round(monthlyPayMin - monthlySubsidyAmount),
          monthlySubsidy: Math.round(monthlySubsidyAmount),
          monthlyAccountContribution,
        });
      } else {
        monthStatuses.push({
          monthIndex: m,
          type: 'normal',
          tierKey: 'normal',
          label: '灵活就业普通自缴 (最低基数)',
          monthlyCost: Math.round(monthlyPayMin),
          monthlySubsidy: 0,
          monthlyAccountContribution,
        });
      }
    }
  }

  // 按连续相同类型+相同档次合并月份成阶段步骤
  // (失业金在第13个月降档，必须在此处断开成两段，否则金额会显示错误)
  const comboTimeline: TimelineStep[] = [...employedStep()];
  let comboTotalPaid = 0;
  let comboTotalSubsidies = 0;

  let currentBlock: {
    startMonth: number;
    endMonth: number;
    type: MonthStatus['type'];
    tierKey: string;
    label: string;
    monthlyCost: number;
    monthlySubsidy: number;
  } | null = null;

  const startBlock = (ms: MonthStatus) => ({
    startMonth: ms.monthIndex,
    endMonth: ms.monthIndex,
    type: ms.type,
    tierKey: ms.tierKey,
    label: ms.label,
    monthlyCost: ms.monthlyCost,
    monthlySubsidy: ms.monthlySubsidy,
  });

  const flushBlock = (block: NonNullable<typeof currentBlock>) => {
    const monthCount = block.endMonth - block.startMonth + 1;
    const originalMonthlyCost = Math.round(
      baseAtMonth(minBase, growthRate, employedMonths + block.startMonth) *
        totalRate
    );
    const impactText = buildImpactText(
      block.type,
      monthCount,
      block.monthlyCost,
      originalMonthlyCost,
      block.monthlySubsidy
    );

    const startYM = addMonthsToYM(inputs.resignYearMonth, block.startMonth);
    const endYM = addMonthsToYM(inputs.resignYearMonth, block.endMonth);

    comboTimeline.push({
      period: `第 ${block.startMonth} - ${block.endMonth} 个月 (${startYM} - ${endYM})`,
      action: block.label,
      financialImpact: impactText,
    });
  };

  for (const ms of monthStatuses) {
    comboTotalPaid += ms.monthlyCost;
    comboTotalSubsidies += ms.monthlySubsidy;

    if (!currentBlock) {
      currentBlock = startBlock(ms);
    } else if (currentBlock.tierKey === ms.tierKey) {
      currentBlock.endMonth = ms.monthIndex;
    } else {
      flushBlock(currentBlock);
      currentBlock = startBlock(ms);
    }
  }

  if (currentBlock) {
    flushBlock(currentBlock);
  }

  const comboAccountAtRetire = accountAtRetire(
    (k) => monthStatuses[k - 1].monthlyAccountContribution
  );

  // 领取失业金的月份由基金代缴医保但不代缴养老，故不计入养老缴费年限
  const comboSelfPaidYears = (monthsAfterResign - unempMonths) / 12;
  const comboPensionYears = paidYears + employedYears + comboSelfPaidYears;
  const comboPension = calculatePension({
    avgSalaryAtRetire: futureAvgSalary,
    avgPayIndex: weightedPayIndex(comboSelfPaidYears, minPayIndex),
    totalPaidYears: comboPensionYears,
    personalAccountBalanceAtRetire: comboAccountAtRetire,
    retireAge: inputs.retireAge,
  });

  const comboNetCost = comboTotalPaid - totalUnempMoney;
  const comboBreakEven = computeBreakEvenYears(
    Math.max(0, comboNetCost),
    comboPension.totalPension - stopPension.totalPension
  );

  const comboWarnings = [
    pensionNote(
      comboPension.isEligible,
      comboPension.yearsShortOfMinimum,
      comboPension.lumpSumIfIneligible
    ),
    // 失业期间不计养老缴费年限，是该方案的核心代价
    unempMonths > 0
      ? `领取失业金的 ${unempMonths} 个月由基金代缴医保但**不代缴养老保险**，该期间不累计养老缴费年限，已在测算中扣除。`
      : undefined,
    inputs.separationType === 'voluntary'
      ? '您选择的是主动辞职：依《社会保险法》第四十五条，主动辞职属"因本人意愿中断就业"，通常无法申领失业保险金，本方案已按 0 个月失业金测算。如为协商解除/裁员/合同到期不续签，请改选"被动离职"。'
      : undefined,
    `社保补贴须先经认定为“就业困难人员”方可申领，并非自动发放。${city.cityName}认定条件包括：法定劳动年龄内、有劳动能力与就业意愿、` +
      `**连续处于实际失业状态 ${city.subsidyMinUnemployedMonths} 个月以上**、且属大龄失业人员等规定情形之一（大龄指男满 ${city.olderWorkerAgeMale} / 女满 ${city.olderWorkerAgeFemale} 周岁）；` +
      `还须已实现灵活就业并按时足额缴纳职工养老与医疗保险。担任企业法定代表人、董事、监事、经理等管理人员的不予认定。` +
      `本测算已按“最早自失业第 ${city.subsidyMinUnemployedMonths + 1} 个月起可享补贴”处理。`,
    city.subsidyPolicyExpiry
      ? `补贴政策依据（沪人社规〔2022〕8号）有效期至 ${city.subsidyPolicyExpiry}，之后能否延续、标准是否调整均未知。若您的补贴期跨越该日期，请务必重新核实。`
      : undefined,
    medicalNote(monthsToRetire),
  ].filter((w): w is string => Boolean(w)).concat(baselineNotes, dataIssues);

  const comboStrategy: StrategyResult = {
    id: 'unemployment_4050',
    name: unempEligible
      ? '方案三：失业金 + 大龄社保补贴组合 (推荐)'
      : '方案三：大龄社保补贴组合 (主动辞职无失业金)',
    description: unempEligible
      ? `叠加失业保险金与大龄“就业困难人员”灵活就业社保补贴（男满 ${city.olderWorkerAgeMale} / 女满 ${city.olderWorkerAgeFemale} 周岁），显著降低自费成本。`
      : '主动辞职无法申领失业金，仅测算大龄“就业困难人员”社保补贴部分。',
    totalSelfPaid: Math.round(comboTotalPaid),
    totalSubsidies: Math.round(comboTotalSubsidies),
    netCost: Math.round(comboNetCost),
    retireMonthlyPension: comboPension.totalPension,
    retireBasicPension: comboPension.basicPension,
    retirePersonalPension: comboPension.personalPension,
    breakEvenYears: comboBreakEven,
    totalReceivedAt80: totalReceivedUntil(
      comboPension.totalPension,
      inputs.retireAge,
      80,
      indexationRate
    ),
    isPensionEligible: comboPension.isEligible,
    warnings: comboWarnings,
    timeline: comboTimeline,
  };

  // 4. 灵活就业 100% 基数自缴
  let totalFullPaid = 0;
  for (let k = 1; k <= monthsAfterResign; k++) {
    totalFullPaid +=
      baseAtMonth(fullBase, growthRate, employedMonths + k) * totalRate;
  }
  const avgMonthlyPayFull = monthsAfterResign > 0 ? totalFullPaid / monthsAfterResign : 0;

  const fullAccountAtRetire = accountAtRetire(
    (k) => baseAtMonth(fullBase, growthRate, employedMonths + k) * pensionAccountRate
  );

  const fullPension = calculatePension({
    avgSalaryAtRetire: futureAvgSalary,
    avgPayIndex: weightedPayIndex(yearsAfterResign, fullPayIndex),
    totalPaidYears: paidYears + employedYears + yearsAfterResign,
    personalAccountBalanceAtRetire: fullAccountAtRetire,
    retireAge: inputs.retireAge,
  });

  const fullBreakEven = computeBreakEvenYears(
    totalFullPaid,
    fullPension.totalPension - stopPension.totalPension
  );

  const fullStrategy: StrategyResult = {
    id: 'full_self',
    name: '方案四：灵活就业 100% 满额基数自缴',
    description: '按当地社平 100% 基数自缴，大幅提升退休基础养老金与个人账户金。',
    totalSelfPaid: Math.round(totalFullPaid),
    totalSubsidies: 0,
    netCost: Math.round(totalFullPaid),
    retireMonthlyPension: fullPension.totalPension,
    retireBasicPension: fullPension.basicPension,
    retirePersonalPension: fullPension.personalPension,
    breakEvenYears: fullBreakEven,
    totalReceivedAt80: totalReceivedUntil(
      fullPension.totalPension,
      inputs.retireAge,
      80,
      indexationRate
    ),
    isPensionEligible: fullPension.isEligible,
    warnings: [
      pensionNote(
        fullPension.isEligible,
        fullPension.yearsShortOfMinimum,
        fullPension.lumpSumIfIneligible
      ),
      medicalNote(monthsToRetire),
    ].filter((w): w is string => Boolean(w)).concat(baselineNotes, dataIssues),
    timeline: [
      ...employedStep(),
      {
        period: `第 1 - ${monthsAfterResign} 个月 (${addMonthsToYM(inputs.resignYearMonth, 1)} - ${addMonthsToYM(inputs.resignYearMonth, monthsAfterResign)})`,
        action: '按 100% 社平工资基数自缴社保',
        financialImpact: `月均自缴约 ¥${Math.round(avgMonthlyPayFull)}`,
      },
    ],
  };

  return [stopStrategy, minStrategy, comboStrategy, fullStrategy];
}
