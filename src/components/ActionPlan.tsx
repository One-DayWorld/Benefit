import React from 'react';
import { StrategyResult } from '../types';
import { CalendarCheck, ShieldAlert } from 'lucide-react';

interface ActionPlanProps {
  strategy: StrategyResult;
}

export const ActionPlan: React.FC<ActionPlanProps> = ({ strategy }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
        <CalendarCheck className="w-5 h-5 text-indigo-600" />
        <h3 className="font-bold text-slate-800 text-base">【{strategy.name}】实操时间线指引</h3>
      </div>

      <div className="space-y-3">
        {strategy.timeline.map((step, idx) => (
          <div key={idx} className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {idx + 1}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-indigo-900">{step.period}</span>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-100">
                  {step.financialImpact}
                </span>
              </div>
              <p className="text-sm text-slate-700 mt-1 leading-relaxed">{step.action}</p>
            </div>
          </div>
        ))}
      </div>

      {strategy.id === 'stop' && (
        <div className="flex items-center space-x-2 text-sm bg-amber-50 text-amber-900 p-3.5 rounded-xl border border-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>断缴提示：完全断缴将导致医疗保险断缴失效，突发疾病将无法享受医保报销，建议至少单独缴纳基本医疗保险。</span>
        </div>
      )}
    </div>
  );
};
