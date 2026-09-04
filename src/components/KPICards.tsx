import React from 'react';
import { StrategyResult } from '../types';
import { Award, DollarSign, Clock } from 'lucide-react';

interface KPICardsProps {
  strategies: StrategyResult[];
}

export const KPICards: React.FC<KPICardsProps> = ({ strategies }) => {
  const recommended = strategies.find((s) => s.id === 'unemployment_4050') || strategies[0];
  const stopStrategy = strategies.find((s) => s.id === 'stop') || strategies[0];

  const addedPension = recommended.retireMonthlyPension - stopStrategy.retireMonthlyPension;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
      {/* 推荐方案 */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide opacity-90">最高性价比推荐</span>
            <Award className="w-5 h-5 text-yellow-300 flex-shrink-0" />
          </div>
          <h3 className="text-base font-bold leading-snug">{recommended.name}</h3>
        </div>
        <p className="text-xs opacity-95 mt-2 leading-relaxed">{recommended.description}</p>
      </div>

      {/* 预计退休月收入 */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">预计退休月养老金</span>
          <DollarSign className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        </div>
        <div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-slate-800">¥{recommended.retireMonthlyPension.toLocaleString()}</span>
            <span className="text-xs text-emerald-600 font-bold">/ 月</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            对比断缴多领 <span className="font-bold text-emerald-600">+¥{addedPension.toLocaleString()}/月</span>
          </p>
        </div>
      </div>

      {/* 回本年限 */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">自费投入回本年限</span>
          <Clock className="w-5 h-5 text-indigo-500 flex-shrink-0" />
        </div>
        <div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-slate-800">
              {recommended.breakEvenYears > 0 ? `${recommended.breakEvenYears} 年` : '极速回本'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            离职期间净投入仅 <span className="font-bold text-indigo-600">¥{recommended.netCost.toLocaleString()}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
