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
  /** 是否满足按月领取基本养老金的最低缴费年限 (《社会保险法》第十六条: 累计满15年) */
  isEligible: boolean;
  /** 距最低缴费年限还差多少年 (已满足则为 0) */
  yearsShortOfMinimum: number;
  /** 不满足最低年限时，个人账户可一次性支付的金额 */
  lumpSumIfIneligible: number;
}

/** 按月领取基本养老金的最低累计缴费年限 (《社会保险法》第十六条) */
export const MIN_PENSION_YEARS = 15;

/**
 * 个人账户养老金计发月数表 (国办发〔2005〕38号附表，40-70周岁)
 */
const PAY_MONTHS_TABLE: Record<number, number> = {
  40: 233, 41: 230, 42: 226, 43: 223, 44: 220, 45: 216, 46: 212, 47: 208, 48: 204, 49: 199,
  50: 195, 51: 190, 52: 185, 53: 180, 54: 175, 55: 170, 56: 164, 57: 158, 58: 152, 59: 145,
  60: 139, 61: 132, 62: 125, 63: 117, 64: 109, 65: 101, 66: 93, 67: 84, 68: 75, 69: 65, 70: 56,
};

/**
 * 计发月数对照 (国办发〔2005〕38号)。
 *
 * 该表仅按整周岁给出取值。渐进式延迟退休后退休年龄常含零头月份(如 60 岁 10 个月)，
 * 目前人社部未发布按月细化的新表，各地经办普遍按**退休时的周岁**(向下取整)查表，
 * 故此处用 Math.floor 而非线性插值。若日后官方发布细化表，应替换本函数。
 */
export function getPayMonths(retireAge: number): number {
  const clampedAge = Math.min(70, Math.max(40, retireAge));
  return PAY_MONTHS_TABLE[Math.floor(clampedAge)];
}

export function calculatePension(params: PensionCalcParams): PensionCalcResult {
  const {
    avgSalaryAtRetire,
    avgPayIndex,
    totalPaidYears,
    personalAccountBalanceAtRetire,
    retireAge,
  } = params;

  const payMonths = getPayMonths(retireAge);

  // 《社会保险法》第十六条：达到法定退休年龄时累计缴费不足 15 年的，不能按月领取
  // 基本养老金，只能延长缴费至满 15 年、转入城乡居民养老保险，或一次性领取个人账户。
  if (totalPaidYears < MIN_PENSION_YEARS) {
    return {
      basicPension: 0,
      personalPension: 0,
      totalPension: 0,
      isEligible: false,
      yearsShortOfMinimum: Number((MIN_PENSION_YEARS - totalPaidYears).toFixed(1)),
      lumpSumIfIneligible: Math.round(personalAccountBalanceAtRetire),
    };
  }

  // 1. 基础养老金 = 社平月工资 * (1 + 平均缴费指数) / 2 * 缴费年限 * 1%
  const basicPension =
    avgSalaryAtRetire * ((1 + avgPayIndex) / 2) * totalPaidYears * 0.01;

  // 2. 个人账户养老金 = 个人账户累计储存额 / 计发月数
  const personalPension = personalAccountBalanceAtRetire / payMonths;

  // 总额由两个已取整的分项相加，而非对未取整的和取整：界面要展示两部分的占比，
  // 若各自取整后相加与总额差 1 元，会显示成"两项之和 ≠ 合计"的矛盾。
  const roundedBasic = Math.round(basicPension);
  const roundedPersonal = Math.round(personalPension);

  return {
    basicPension: roundedBasic,
    personalPension: roundedPersonal,
    totalPension: roundedBasic + roundedPersonal,
    isEligible: true,
    yearsShortOfMinimum: 0,
    lumpSumIfIneligible: 0,
  };
}
