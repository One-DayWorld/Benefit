import React from 'react';
import { StrategyResult } from '../types';
import { PensionSplit } from './PensionSplit';
import { CheckCircle2 } from 'lucide-react';

interface StrategyTableProps {
  strategies: StrategyResult[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const StrategyTable: React.FC<StrategyTableProps> = ({
  strategies,
  selectedId,
  onSelect,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-base">4 种社保缴纳策略精算对比</h3>
        <span className="text-xs text-slate-500">点击任意行查看操作指引与明细</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs md:text-sm">
          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-xs border-b border-slate-100">
            <tr>
              <th className="px-2.5 py-3 whitespace-nowrap">方案名称</th>
              <th className="px-2.5 py-3 whitespace-nowrap">自费总支出</th>
              <th className="px-2.5 py-3 whitespace-nowrap">补贴/失业金收益</th>
              <th className="px-2.5 py-3 whitespace-nowrap">净投入成本</th>
              <th className="px-2.5 py-3 whitespace-nowrap min-w-[150px]">
                退休首月养老金
                <span className="block text-[10px] font-medium normal-case text-slate-400">
                  基础 / 个人账户 构成
                </span>
              </th>
              <th className="px-2.5 py-3 whitespace-nowrap">回本年限</th>
              <th className="px-2.5 py-3 whitespace-nowrap">80岁累计领取</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {strategies.map((s) => {
              const isSelected = s.id === selectedId;
              const isCombo = s.id === 'unemployment_4050';

              return (
                <tr
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`cursor-pointer transition ${
                    isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-2.5 py-3 flex items-center space-x-1.5 min-w-[170px]">
                    <span className="w-4 flex-shrink-0 flex items-center justify-center">
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      )}
                    </span>
                    <div>
                      <span className="font-bold text-slate-800 block text-xs md:text-sm">{s.name}</span>
                      {isCombo && (
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded mt-0.5">
                          最推荐
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2.5 py-3 text-slate-600 whitespace-nowrap">
                    ¥{s.totalSelfPaid.toLocaleString()}
                  </td>
                  <td className="px-2.5 py-3 text-emerald-600 font-bold whitespace-nowrap">
                    +¥{s.totalSubsidies.toLocaleString()}
                  </td>
                  <td className="px-2.5 py-3 font-bold text-slate-800 whitespace-nowrap">
                    ¥{s.netCost.toLocaleString()}
                  </td>
                  <td className="px-2.5 py-3 text-indigo-600 font-extrabold text-xs md:text-sm">
                    {s.isPensionEligible ? (
                      <>
                        <span className="whitespace-nowrap">
                          ¥{s.retireMonthlyPension.toLocaleString()}
                          <span className="text-[11px] font-semibold text-indigo-500 ml-0.5">
                            /月
                          </span>
                        </span>
                        <PensionSplit
                          basic={s.retireBasicPension}
                          personal={s.retirePersonalPension}
                          compact
                        />
                      </>
                    ) : (
                      <span className="text-rose-600 font-bold text-xs">不足15年·无法按月领取</span>
                    )}
                  </td>
                  <td className="px-2.5 py-3 font-bold text-slate-800 whitespace-nowrap">
                    {!Number.isFinite(s.breakEvenYears)
                      ? '不划算'
                      : s.breakEvenYears > 0
                      ? `${s.breakEvenYears} 年`
                      : '-'}
                  </td>
                  <td className="px-2.5 py-3 text-slate-800 font-bold whitespace-nowrap">
                    ¥{s.totalReceivedAt80.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
