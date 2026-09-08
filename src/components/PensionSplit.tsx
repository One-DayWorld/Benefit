import React from 'react';

interface PensionSplitProps {
  /** 基础养老金部分 (统筹基金支付) */
  basic: number;
  /** 个人账户养老金部分 */
  personal: number;
  /** 紧凑模式：用于表格单元格 */
  compact?: boolean;
}

/**
 * 展示养老金的两部分构成与占比。
 *
 * 之所以不能只给合计：两部分的计发规则、增长方式与影响因素完全不同 ——
 * 基础养老金挂钩社平工资、缴费年限与缴费指数，随每年养老金调增而增长；
 * 个人账户养老金 = 账户余额 ÷ 计发月数，只由账户积累与退休年龄决定。
 * 想判断"多缴几年"还是"提高基数"更划算，必须看到占比。
 */
export const PensionSplit: React.FC<PensionSplitProps> = ({
  basic,
  personal,
  compact = false,
}) => {
  const total = basic + personal;
  if (total <= 0) return null;

  // 占比取整后互补，避免两个独立取整导致显示成 49% + 52%
  const basicPct = Math.round((basic / total) * 100);
  const personalPct = 100 - basicPct;

  return (
    <div className={compact ? 'mt-1 space-y-1' : 'mt-3 space-y-1.5'}>
      <div
        className={`flex w-full overflow-hidden rounded-full bg-slate-100 ${
          compact ? 'h-1' : 'h-2'
        }`}
        title={`基础养老金 ${basicPct}% / 个人账户养老金 ${personalPct}%`}
      >
        <div className="bg-indigo-500" style={{ width: `${basicPct}%` }} />
        <div className="bg-emerald-500" style={{ width: `${personalPct}%` }} />
      </div>

      <div
        className={`font-semibold leading-tight ${
          compact ? 'text-[10px] space-y-0.5' : 'text-xs flex justify-between gap-3'
        }`}
      >
        <div className="text-indigo-600 whitespace-nowrap">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1 align-middle" />
          基础 ¥{basic.toLocaleString()}
          <span className="text-slate-400 font-medium ml-1">{basicPct}%</span>
        </div>
        <div className="text-emerald-600 whitespace-nowrap">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 align-middle" />
          账户 ¥{personal.toLocaleString()}
          <span className="text-slate-400 font-medium ml-1">{personalPct}%</span>
        </div>
      </div>
    </div>
  );
};
