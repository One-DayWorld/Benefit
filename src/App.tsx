import React, { useState, useEffect } from 'react';
import { UserInputs } from './types';
import { CITIES } from './config/cities';
import { calculateStrategies } from './engine/policy';
import { calculateDelayedRetirement } from './engine/delayedRetirement';
import { InputsPanel } from './components/InputsPanel';
import { KPICards } from './components/KPICards';
import { StrategyTable } from './components/StrategyTable';
import { CashFlowChart } from './components/CashFlowChart';
import { ActionPlan } from './components/ActionPlan';
import { ProfileManager } from './components/ProfileManager';
import { Calculator, Sparkles } from 'lucide-react';

const DEFAULT_INPUTS: UserInputs = {
  gender: 'male',
  birthYearMonth: '1980-01',
  resignYearMonth: '2026-06',
  retireAge: 61.5,
  paidMonths: 216,
  personalAccountBalance: 120000,
  avgPayIndex: 1.0,
  cityId: 'shanghai',
  futureSalaryGrowthRate: 0.03,
};

export const App: React.FC = () => {
  const [inputs, setInputs] = useState<UserInputs>(() => {
    const saved = localStorage.getItem('pension_user_inputs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.paidMonths && parsed.paidYears) {
          parsed.paidMonths = Math.round(parsed.paidYears * 12);
        }
        return parsed;
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_INPUTS;
  });

  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('unemployment_4050');

  useEffect(() => {
    localStorage.setItem('pension_user_inputs', JSON.stringify(inputs));
  }, [inputs]);

  // 联动：出生年月或性别变化时自动重算建议退休年龄
  useEffect(() => {
    const delayedRes = calculateDelayedRetirement(
      inputs.birthYearMonth,
      inputs.gender,
      inputs.isFemaleCadre
    );
    setInputs((prev) => ({ ...prev, retireAge: delayedRes.targetAge }));
  }, [inputs.birthYearMonth, inputs.gender, inputs.isFemaleCadre]);

  const selectedCity = CITIES.find((c) => c.cityId === inputs.cityId) || CITIES[0];
  const strategies = calculateStrategies(inputs, selectedCity);
  const activeStrategy =
    strategies.find((s) => s.id === selectedStrategyId) || strategies[0];

  const handleLoadProfile = (loadedInputs: UserInputs) => {
    setInputs(loadedInputs);
  };

  const handleNewProfile = () => {
    setInputs(DEFAULT_INPUTS);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* 顶部 Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                离职退休金精算与社保优化工具
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                2025 渐进式延迟退休算法 + 4050/失业补贴精算 + 多人员档案管理
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 font-medium">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>智能政策规避与福利规划</span>
          </div>
        </div>
      </header>

      {/* 主体 Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {/* 多人员档案管理模块 */}
        <ProfileManager
          currentInputs={inputs}
          onLoadProfile={handleLoadProfile}
          onNewProfile={handleNewProfile}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左侧控制面板 */}
          <div className="lg:col-span-4">
            <InputsPanel inputs={inputs} onChange={setInputs} />
          </div>

          {/* 右侧数据展示 */}
          <div className="lg:col-span-8 space-y-6">
            <KPICards strategies={strategies} />
            <StrategyTable
              strategies={strategies}
              selectedId={selectedStrategyId}
              onSelect={setSelectedStrategyId}
            />
            <CashFlowChart strategies={strategies} />
            <ActionPlan strategy={activeStrategy} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
