export interface DelayedRetirementResult {
  originalAge: number;     // 原法定退休年龄 (50/55/60)
  targetAge: number;       // 延迟后退休年龄 (精确值，如 60岁3个月 = 60.25)
  targetAgeLabel: string;  // 延迟后退休年龄的展示文本 (如 "60岁3个月")
  delayMonths: number;     // 延迟月数
  retireYearMonth: string; // 预计退休年月 YYYY-MM
}

/**
 * 依据 2025年1月1日起施行《关于实施渐进式延迟法定退休年龄的决定》：
 * - 男职工：原 60 岁，每 4 个月延迟 1 个月，最高延迟至 63 岁
 * - 女干部/女管理岗位：原 55 岁，每 4 个月延迟 1 个月，最高延迟至 58 岁
 * - 女工人：原 50 岁，每 2 个月延迟 1 个月，最高延迟至 55 岁
 */
export function calculateDelayedRetirement(
  birthYM: string,
  gender: 'male' | 'female',
  isFemaleCadre: boolean = false
): DelayedRetirementResult {
  const [bYear, bMonth] = birthYM.split('-').map(Number);

  let originalAge = 60;
  let delayRate = 4;
  let maxDelayMonths = 36;

  if (gender === 'female') {
    if (isFemaleCadre) {
      originalAge = 55;
      delayRate = 4;
      maxDelayMonths = 36;
    } else {
      originalAge = 50;
      delayRate = 2;
      maxDelayMonths = 60;
    }
  }

  const origRetireYear = bYear + originalAge;
  const origRetireMonth = bMonth;
  const origRetireTotalMonths = origRetireYear * 12 + origRetireMonth;
  const policyStartTotalMonths = 2025 * 12 + 1;

  if (origRetireTotalMonths < policyStartTotalMonths) {
    return {
      originalAge,
      targetAge: originalAge,
      targetAgeLabel: formatAge(originalAge, 0),
      delayMonths: 0,
      retireYearMonth: `${origRetireYear}-${String(origRetireMonth).padStart(2, '0')}`,
    };
  }

  const monthsFromPolicyStart = origRetireTotalMonths - policyStartTotalMonths + 1;
  let delayMonths = Math.ceil(monthsFromPolicyStart / delayRate);
  if (delayMonths > maxDelayMonths) {
    delayMonths = maxDelayMonths;
  }

  const finalRetireTotalMonths = origRetireTotalMonths + delayMonths;
  const finalRetireYear = Math.floor((finalRetireTotalMonths - 1) / 12);
  const finalRetireMonth = ((finalRetireTotalMonths - 1) % 12) + 1;

  // 不可用 toFixed(1) 截断：60岁3个月(60.25) 会被压成 60.3，回算即 60岁3.6个月，
  // 该误差会随 retireAge 传导到 monthsToRetire 与计发月数，故保留精确值，
  // 显示交由 targetAgeLabel 处理。
  const targetAge = originalAge + delayMonths / 12;

  return {
    originalAge,
    targetAge,
    targetAgeLabel: formatAge(originalAge, delayMonths),
    delayMonths,
    retireYearMonth: `${finalRetireYear}-${String(finalRetireMonth).padStart(2, '0')}`,
  };
}

/** 把"整岁 + 延迟月数"格式化为 "60岁3个月" 这类无歧义的展示文本 */
export function formatAge(originalAge: number, delayMonths: number): string {
  const years = originalAge + Math.floor(delayMonths / 12);
  const months = delayMonths % 12;
  return months === 0 ? `${years}岁` : `${years}岁${months}个月`;
}
