import { UserInputs, CityPolicy, StrategyResult, TimelineStep } from '../types';
import { calculatePension } from './pension';

export function getUnemploymentMonths(paidYears: number): number {
  if (paidYears < 1) return 0;
  if (paidYears < 5) return Math.min(12, Math.floor(paidYears) * 3);
  if (paidYears < 10) return 18;
  return 24;
}

export function calculateAge(birthYM: string, targetYM: string): number {
  const [bYear, bMonth] = birthYM.split('-').map(Number);
  const [tYear, tMonth] = targetYM.split('-').map(Number);
  return (tYear * 12 + tMonth - (bYear * 12 + bMonth)) / 12;
}

export function addMonthsToYM(ymStr: string, addMonths: number): string {
  if (!ymStr) return '';
  const [year, month] = ymStr.split('-').map(Number);
  const totalMonths = (year || 2026) * 12 + ((month || 1) - 1) + addMonths;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  return `${targetYear}年${String(targetMonth).padStart(2, '0')}月`;
}

export function calculateStrategies(
  inputs: UserInputs,
  city: CityPolicy
): StrategyResult[] {
  const paidYears = inputs.paidMonths / 12;
  const currentAge = calculateAge(inputs.birthYearMonth, inputs.resignYearMonth);
  const yearsToRetire = Math.max(0, inputs.retireAge - currentAge);
  const monthsToRetire = Math.round(yearsToRetire * 12);

  const avgSalary = inputs.customAvgSalary || city.avgSalary;
  // 未来退休时社平工资预测
  const futureAvgSalary =
    avgSalary * Math.pow(1 + inputs.futureSalaryGrowthRate, yearsToRetire);

  // 1. 完全断缴策略
  const stopPension = calculatePension({
    avgSalaryAtRetire: futureAvgSalary,
    avgPayIndex: inputs.avgPayIndex,
    totalPaidYears: paidYears,
    personalAccountBalanceAtRetire: inputs.personalAccountBalance,
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
    breakEvenYears: 0,
    totalReceivedAt80: stopPension.totalPension * 12 * (80 - inputs.retireAge),
    timeline: [
      {
        period: `离职后至 ${inputs.retireAge} 岁 (${addMonthsToYM(inputs.resignYearMonth, 1)} - ${addMonthsToYM(inputs.resignYearMonth, monthsToRetire)})`,
        action: '停止自费缴纳养老与医保',
        financialImpact: '个人支出 0 元',
      },
    ],
  };

  // 2. 灵活就业最低档 (60%基数) 按月自缴
  // 养老 20% (其中8%进个人账户), 医保按 8% 测算
  const minBase = city.baseMin;
  const monthlyPayMin = minBase * 0.2 + minBase * 0.08;
  const totalMinPaid = monthlyPayMin * monthsToRetire;
  const addedAccountMin = minBase * 0.08 * monthsToRetire;

  const minPension = calculatePension({
    avgSalaryAtRetire: futureAvgSalary,
    avgPayIndex: (inputs.avgPayIndex * paidYears + 0.6 * yearsToRetire) / (paidYears + yearsToRetire || 1),
    totalPaidYears: paidYears + yearsToRetire,
    personalAccountBalanceAtRetire: inputs.personalAccountBalance + addedAccountMin,
    retireAge: inputs.retireAge,
  });

  const minBreakEven = totalMinPaid / (Math.max(1, minPension.totalPension - stopPension.totalPension) * 12);

  const minStrategy: StrategyResult = {
    id: 'min_self',
    name: '方案二：灵活就业最低 60% 基数自缴',
    description: '按最低基数自费缴纳养老与医保，保障医保连续性，稳步累积工龄。',
    totalSelfPaid: Math.round(totalMinPaid),
    totalSubsidies: 0,
    netCost: Math.round(totalMinPaid),
    retireMonthlyPension: minPension.totalPension,
    breakEvenYears: Number(minBreakEven.toFixed(1)),
    totalReceivedAt80: minPension.totalPension * 12 * (80 - inputs.retireAge),
    timeline: [
      {
        period: `第 1 - ${monthsToRetire} 个月 (${addMonthsToYM(inputs.resignYearMonth, 1)} - ${addMonthsToYM(inputs.resignYearMonth, monthsToRetire)})`,
        action: '以灵活就业身份按 60% 基数全额自缴',
        financialImpact: `月支出约 ¥${Math.round(monthlyPayMin)}`,
      },
    ],
  };

  // 3. 失业金 + 4050/4555 大龄补贴动态逐月规划组合策略
  const unempMonths = Math.min(getUnemploymentMonths(paidYears), monthsToRetire);
  const totalUnempMoney = unempMonths * city.unemploymentBenefit;

  interface MonthStatus {
    monthIndex: number;
    type: 'unemployment' | 'subsidy_4050' | 'subsidy_4555' | 'subsidy_5years' | 'normal';
    label: string;
    monthlyCost: number;
    monthlySubsidy: number;
  }

  const subsidyRatio = 0.5; // 补贴 50% 费率
  let totalStandardSubsidyUsedMonths = 0; // 标准大龄补贴最多 36 个月

  const monthStatuses: MonthStatus[] = [];

  for (let m = 1; m <= monthsToRetire; m++) {
    if (m <= unempMonths) {
      monthStatuses.push({
        monthIndex: m,
        type: 'unemployment',
        label: '申领失业保险金，由失业保险基金代缴基本医疗保险',
        monthlyCost: 0,
        monthlySubsidy: city.unemploymentBenefit,
      });
    } else {
      const ageAtMonth = currentAge + (m - 1) / 12;
      const yearsToRetireAtMonth = inputs.retireAge - ageAtMonth;

      const is4050Age = inputs.gender === 'female' ? ageAtMonth >= 40 : ageAtMonth >= 50;
      const is4555Age = inputs.gender === 'female' ? ageAtMonth >= 45 : ageAtMonth >= 55;
      const isWithin5Years = yearsToRetireAtMonth <= 5.01;

      if (isWithin5Years) {
        // 距退休不足 5 年：可享大龄离退休衔接补贴 (持续至退休，不占标准3年额度)
        monthStatuses.push({
          monthIndex: m,
          type: 'subsidy_5years',
          label: '申请大龄离退休衔接社保补贴（距退休不足 5 年享 50%~70% 费率返还，持续至退休）',
          monthlyCost: Math.round(monthlyPayMin * (1 - subsidyRatio)),
          monthlySubsidy: Math.round(monthlyPayMin * subsidyRatio),
        });
      } else if ((is4050Age || is4555Age) && totalStandardSubsidyUsedMonths < 36) {
        totalStandardSubsidyUsedMonths++;
        const policyName = is4555Age ? '4555' : '4050';
        monthStatuses.push({
          monthIndex: m,
          type: is4555Age ? 'subsidy_4555' : 'subsidy_4050',
          label: `申请 ${policyName} 大龄就业社保补贴（满${policyName}年龄段享最高 3 年社保 50% 补贴返还）`,
          monthlyCost: Math.round(monthlyPayMin * (1 - subsidyRatio)),
          monthlySubsidy: Math.round(monthlyPayMin * subsidyRatio),
        });
      } else {
        monthStatuses.push({
          monthIndex: m,
          type: 'normal',
          label: '灵活就业普通自缴 (60% 最低基数)',
          monthlyCost: Math.round(monthlyPayMin),
          monthlySubsidy: 0,
        });
      }
    }
  }

  // 按连续相同类型合并月份成阶段步骤
  const comboTimeline: TimelineStep[] = [];
  let comboTotalPaid = 0;
  let comboTotalSubsidies = 0;

  let currentBlock: {
    startMonth: number;
    endMonth: number;
    type: MonthStatus['type'];
    label: string;
    monthlyCost: number;
    monthlySubsidy: number;
  } | null = null;

  for (const ms of monthStatuses) {
    comboTotalPaid += ms.monthlyCost;
    comboTotalSubsidies += ms.monthlySubsidy;

    if (!currentBlock) {
      currentBlock = {
        startMonth: ms.monthIndex,
        endMonth: ms.monthIndex,
        type: ms.type,
        label: ms.label,
        monthlyCost: ms.monthlyCost,
        monthlySubsidy: ms.monthlySubsidy,
      };
    } else if (currentBlock.type === ms.type) {
      currentBlock.endMonth = ms.monthIndex;
    } else {
      const monthCount = currentBlock.endMonth - currentBlock.startMonth + 1;
      let impactText = '';
      if (currentBlock.type === 'unemployment') {
        impactText = `月领 ¥${city.unemploymentBenefit}，阶段累计领 ¥${city.unemploymentBenefit * monthCount}`;
      } else if (currentBlock.type.startsWith('subsidy')) {
        impactText = `月自缴仅约 ¥${currentBlock.monthlyCost} (原价 ¥${Math.round(monthlyPayMin)})`;
      } else {
        impactText = `月自缴约 ¥${currentBlock.monthlyCost}`;
      }

      const startYM = addMonthsToYM(inputs.resignYearMonth, currentBlock.startMonth);
      const endYM = addMonthsToYM(inputs.resignYearMonth, currentBlock.endMonth);

      comboTimeline.push({
        period: `第 ${currentBlock.startMonth} - ${currentBlock.endMonth} 个月 (${startYM} - ${endYM})`,
        action: currentBlock.label,
        financialImpact: impactText,
      });

      currentBlock = {
        startMonth: ms.monthIndex,
        endMonth: ms.monthIndex,
        type: ms.type,
        label: ms.label,
        monthlyCost: ms.monthlyCost,
        monthlySubsidy: ms.monthlySubsidy,
      };
    }
  }

  if (currentBlock) {
    const monthCount = currentBlock.endMonth - currentBlock.startMonth + 1;
    let impactText = '';
    if (currentBlock.type === 'unemployment') {
      impactText = `月领 ¥${city.unemploymentBenefit}，阶段累计领 ¥${city.unemploymentBenefit * monthCount}`;
    } else if (currentBlock.type.startsWith('subsidy')) {
      impactText = `月自缴仅约 ¥${currentBlock.monthlyCost} (原价 ¥${Math.round(monthlyPayMin)})`;
    } else {
      impactText = `月自缴约 ¥${currentBlock.monthlyCost}`;
    }

    const startYM = addMonthsToYM(inputs.resignYearMonth, currentBlock.startMonth);
    const endYM = addMonthsToYM(inputs.resignYearMonth, currentBlock.endMonth);

    comboTimeline.push({
      period: `第 ${currentBlock.startMonth} - ${currentBlock.endMonth} 个月 (${startYM} - ${endYM})`,
      action: currentBlock.label,
      financialImpact: impactText,
    });
  }

  const comboPension = calculatePension({
    avgSalaryAtRetire: futureAvgSalary,
    avgPayIndex: (inputs.avgPayIndex * paidYears + 0.6 * (yearsToRetire - unempMonths / 12)) / (paidYears + yearsToRetire - unempMonths / 12 || 1),
    totalPaidYears: paidYears + (monthsToRetire - unempMonths) / 12,
    personalAccountBalanceAtRetire: inputs.personalAccountBalance + minBase * 0.08 * (monthsToRetire - unempMonths),
    retireAge: inputs.retireAge,
  });

  const comboNetCost = comboTotalPaid - totalUnempMoney;
  const comboBreakEven = Math.max(0, comboNetCost) / (Math.max(1, comboPension.totalPension - stopPension.totalPension) * 12);

  const comboStrategy: StrategyResult = {
    id: 'unemployment_4050',
    name: '方案三：失业金 + 4050/4555 补贴组合 (推荐)',
    description: '充分利用失业保险金与“4050/4555”大龄社保补贴政策（女性满40/45岁、男性满50/55岁），大幅降低自费成本，性价比极高。',
    totalSelfPaid: Math.round(comboTotalPaid),
    totalSubsidies: Math.round(comboTotalSubsidies),
    netCost: Math.round(comboNetCost),
    retireMonthlyPension: comboPension.totalPension,
    breakEvenYears: Number(comboBreakEven.toFixed(1)),
    totalReceivedAt80: comboPension.totalPension * 12 * (80 - inputs.retireAge),
    timeline: comboTimeline,
  };

  // 4. 灵活就业 100% 基数自缴
  const fullBase = avgSalary;
  const monthlyPayFull = fullBase * 0.2 + fullBase * 0.08;
  const totalFullPaid = monthlyPayFull * monthsToRetire;
  const addedAccountFull = fullBase * 0.08 * monthsToRetire;

  const fullPension = calculatePension({
    avgSalaryAtRetire: futureAvgSalary,
    avgPayIndex: (inputs.avgPayIndex * paidYears + 1.0 * yearsToRetire) / (paidYears + yearsToRetire || 1),
    totalPaidYears: paidYears + yearsToRetire,
    personalAccountBalanceAtRetire: inputs.personalAccountBalance + addedAccountFull,
    retireAge: inputs.retireAge,
  });

  const fullBreakEven = totalFullPaid / (Math.max(1, fullPension.totalPension - stopPension.totalPension) * 12);

  const fullStrategy: StrategyResult = {
    id: 'full_self',
    name: '方案四：灵活就业 100% 满额基数自缴',
    description: '按当地社平 100% 基数自缴，大幅提升退休基础养老金与个人账户金。',
    totalSelfPaid: Math.round(totalFullPaid),
    totalSubsidies: 0,
    netCost: Math.round(totalFullPaid),
    retireMonthlyPension: fullPension.totalPension,
    breakEvenYears: Number(fullBreakEven.toFixed(1)),
    totalReceivedAt80: fullPension.totalPension * 12 * (80 - inputs.retireAge),
    timeline: [
      {
        period: `第 1 - ${monthsToRetire} 个月 (${addMonthsToYM(inputs.resignYearMonth, 1)} - ${addMonthsToYM(inputs.resignYearMonth, monthsToRetire)})`,
        action: '按 100% 社平工资基数自缴社保',
        financialImpact: `月自缴约 ¥${Math.round(monthlyPayFull)}`,
      },
    ],
  };

  return [stopStrategy, minStrategy, comboStrategy, fullStrategy];
}