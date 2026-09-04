export interface PensionCalcParams {
  avgSalaryAtRetire: number;
  avgPayIndex: number;
  totalPaidYears: number;
  personalAccountBalanceAtRetire: number;
  retireAge: number;
}

export interface PensionCalcResult {
  basicPension: number;
  personalPension: number;
  totalPension: number;
}

/**
 * 计发月数对照 (国家标准)
 */
export function getPayMonths(retireAge: number): number {
  if (retireAge <= 50) return 195;
  if (retireAge <= 55) return 170;
  if (retireAge <= 60) return 139;
  return 101; // 65岁
}

export function calculatePension(params: PensionCalcParams): PensionCalcResult {
  const {
    avgSalaryAtRetire,
    avgPayIndex,
    totalPaidYears,
    personalAccountBalanceAtRetire,
    retireAge,
  } = params;

  // 1. 基础养老金 = 社平月工资 * (1 + 平均缴费指数) / 2 * 缴费年限 * 1%
  const basicPension =
    avgSalaryAtRetire * ((1 + avgPayIndex) / 2) * totalPaidYears * 0.01;

  // 2. 个人账户养老金 = 个人账户累计储存额 / 计发月数
  const payMonths = getPayMonths(retireAge);
  const personalPension = personalAccountBalanceAtRetire / payMonths;

  const totalPension = basicPension + personalPension;

  return {
    basicPension: Math.round(basicPension),
    personalPension: Math.round(personalPension),
    totalPension: Math.round(totalPension),
  };
}
