import React from 'react';
import { UserInputs } from '../types';
import { CITIES } from '../config/cities';
import { calculateDelayedRetirement } from '../engine/delayedRetirement';
import { Sliders, User, Briefcase, MapPin, Sparkles } from 'lucide-react';

interface InputsPanelProps {
  inputs: UserInputs;
  onChange: (updated: UserInputs) => void;
}

export const InputsPanel: React.FC<InputsPanelProps> = ({ inputs, onChange }) => {
  const handleChange = (key: keyof UserInputs, value: any) => {
    onChange({ ...inputs, [key]: value });
  };

  // 延迟退休预测结果
  const delayedResult = calculateDelayedRetirement(
    inputs.birthYearMonth,
    inputs.gender,
    inputs.isFemaleCadre
  );

  const handleApplyDelayedAge = () => {
    handleChange('retireAge', delayedResult.targetAge);
  };

  const birthYM = (() => {
    const [y, m] = (inputs.birthYearMonth || '1980-01').split('-').map(Number);
    return { year: y || 1980, month: m || 1 };
  })();

  const resignYM = (() => {
    const [y, m] = (inputs.resignYearMonth || '2026-06').split('-').map(Number);
    return { year: y || 2026, month: m || 6 };
  })();

  const birthYears = Array.from({ length: 61 }, (_, i) => 1950 + i); // 1950 - 2010
  const resignYears = Array.from({ length: 21 }, (_, i) => 2020 + i); // 2020 - 2040
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
        <Sliders className="w-5 h-5 text-indigo-600" />
        <h2 className="text-base font-bold text-slate-800">测算参数设置</h2>
      </div>

      {/* 1. 个人属性卡片 */}
      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
        <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
          <User className="w-4 h-4 text-indigo-600" /> 1. 个人基础属性
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">性别</label>
            <div className="flex rounded-lg border border-slate-200 p-1 bg-white">
              <button
                type="button"
                className={`flex-1 py-1 text-xs font-semibold rounded-md transition ${
                  inputs.gender === 'male'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => handleChange('gender', 'male')}
              >
                男
              </button>
              <button
                type="button"
                className={`flex-1 py-1 text-xs font-semibold rounded-md transition ${
                  inputs.gender === 'female'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => handleChange('gender', 'female')}
              >
                女
              </button>
            </div>
          </div>

          {inputs.gender === 'female' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">岗位类型</label>
              <select
                value={inputs.isFemaleCadre ? 'cadre' : 'worker'}
                onChange={(e) => handleChange('isFemaleCadre', e.target.value === 'cadre')}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="worker">女工人 (原50岁退休)</option>
                <option value="cadre">女干部/管理岗 (原55岁退休)</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 出生年月下拉 */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">出生年月</label>
            <div className="flex space-x-1.5">
              <select
                value={birthYM.year}
                onChange={(e) =>
                  handleChange(
                    'birthYearMonth',
                    `${e.target.value}-${String(birthYM.month).padStart(2, '0')}`
                  )
                }
                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-1.5 font-medium"
              >
                {birthYears.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
              <select
                value={birthYM.month}
                onChange={(e) =>
                  handleChange(
                    'birthYearMonth',
                    `${birthYM.year}-${String(e.target.value).padStart(2, '0')}`
                  )
                }
                className="w-20 text-xs bg-white border border-slate-200 rounded-lg p-1.5 font-medium"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 计划离职年月下拉 */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">计划离职年月</label>
            <div className="flex space-x-1.5">
              <select
                value={resignYM.year}
                onChange={(e) =>
                  handleChange(
                    'resignYearMonth',
                    `${e.target.value}-${String(resignYM.month).padStart(2, '0')}`
                  )
                }
                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-1.5 font-medium"
              >
                {resignYears.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
              <select
                value={resignYM.month}
                onChange={(e) =>
                  handleChange(
                    'resignYearMonth',
                    `${resignYM.year}-${String(e.target.value).padStart(2, '0')}`
                  )
                }
                className="w-20 text-xs bg-white border border-slate-200 rounded-lg p-1.5 font-medium"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 延迟退休政策测算卡片 */}
      <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-100/90 space-y-2">
        <div className="flex justify-between items-center flex-wrap gap-1 border-b border-indigo-100 pb-2">
          <span className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
            <Sparkles className="w-4 h-4 text-indigo-600" /> 2025 渐进式延迟退休新规
          </span>
          <button
            type="button"
            onClick={handleApplyDelayedAge}
            className="text-[11px] bg-indigo-600 text-white font-semibold px-2 py-0.5 rounded hover:bg-indigo-700 transition"
          >
            采用建议退休年龄
          </button>
        </div>

        <div className="text-xs text-slate-700 space-y-1">
          <p className="flex justify-between">
            <span>原法定退休年龄：<strong className="text-slate-900">{delayedResult.originalAge} 岁</strong></span>
            <span>改革延迟：<strong className="text-indigo-700">+{delayedResult.delayMonths} 个月</strong></span>
          </p>
          <p className="pt-1 border-t border-indigo-100/60 font-semibold text-indigo-900 flex justify-between">
            <span>预测新退休年龄：{delayedResult.targetAge} 岁</span>
            <span>退休时间：{delayedResult.retireYearMonth}</span>
          </p>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            测算设定退休年龄 (可自定义调整)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              step="0.1"
              value={inputs.retireAge}
              onChange={(e) => handleChange('retireAge', Number(e.target.value))}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
            />
            <span className="text-xs text-slate-500 font-medium">岁</span>
          </div>
        </div>
      </div>

      {/* 3. 社保历史数据卡片 */}
      <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/80 space-y-3">
        <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-100 pb-2">
          <Briefcase className="w-4 h-4 text-emerald-600" /> 2. 社保历史与账户数据
        </h3>

        {/* 已累计缴费 */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 font-medium">已累计缴费月数</span>
            <span className="font-bold text-emerald-700">
              {inputs.paidMonths} 个月 (折合 {(inputs.paidMonths / 12).toFixed(1)} 年)
            </span>
          </div>
          <input
            type="range"
            min={12}
            max={480}
            step={1}
            value={inputs.paidMonths}
            onChange={(e) => handleChange('paidMonths', Number(e.target.value))}
            className="w-full accent-emerald-600"
          />
          <div className="flex space-x-2 mt-1 items-center">
            <input
              type="number"
              value={inputs.paidMonths}
              onChange={(e) => handleChange('paidMonths', Math.max(0, Number(e.target.value)))}
              className="w-24 text-xs bg-white border border-slate-200 rounded-lg p-1 font-medium"
              placeholder="月数"
            />
            <span className="text-xs text-slate-500">个月</span>
          </div>
        </div>

        {/* 个人账户储存额 */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            养老个人账户累计储存额 (本息合计)
          </label>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 font-bold">¥</span>
            <input
              type="number"
              value={inputs.personalAccountBalance}
              onChange={(e) => handleChange('personalAccountBalance', Number(e.target.value))}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
            />
          </div>
        </div>

        {/* 历史平均缴费指数选择 */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-700 font-medium">历史平均缴费指数</span>
            <span className="font-bold text-emerald-700">{inputs.avgPayIndex}</span>
          </div>

          <div className="flex space-x-1.5 my-1.5">
            <button
              type="button"
              onClick={() => handleChange('avgPayIndex', 0.6)}
              className={`flex-1 py-1 border rounded-md text-[11px] font-medium transition ${
                inputs.avgPayIndex === 0.6
                  ? 'bg-emerald-600 text-white font-bold border-emerald-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              0.6 (最低)
            </button>
            <button
              type="button"
              onClick={() => handleChange('avgPayIndex', 1.0)}
              className={`flex-1 py-1 border rounded-md text-[11px] font-medium transition ${
                inputs.avgPayIndex === 1.0
                  ? 'bg-emerald-600 text-white font-bold border-emerald-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              1.0 (平均)
            </button>
            <button
              type="button"
              onClick={() => handleChange('avgPayIndex', 3.0)}
              className={`flex-1 py-1 border rounded-md text-[11px] font-medium transition ${
                inputs.avgPayIndex === 3.0
                  ? 'bg-emerald-600 text-white font-bold border-emerald-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              3.0 (顶格)
            </button>
          </div>

          <input
            type="range"
            min={0.6}
            max={3.0}
            step={0.05}
            value={inputs.avgPayIndex}
            onChange={(e) => handleChange('avgPayIndex', Number(e.target.value))}
            className="w-full accent-emerald-600"
          />
        </div>
      </div>

      {/* 4. 城市与政策卡片 */}
      <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-100/80 space-y-3">
        <h3 className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-sky-100 pb-2">
          <MapPin className="w-4 h-4 text-sky-600" /> 3. 目标城市与社平预估
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">目标城市</label>
          <select
            value={inputs.cityId}
            onChange={(e) => handleChange('cityId', e.target.value)}
            className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg p-1.5"
          >
            {CITIES.map((c) => (
              <option key={c.cityId} value={c.cityId}>
                {c.cityName} (社平工资: ¥{c.avgSalary}/月)
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 font-medium">未来社平工资年化增长率</span>
            <span className="font-bold text-sky-700">
              {(inputs.futureSalaryGrowthRate * 100).toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.08}
            step={0.005}
            value={inputs.futureSalaryGrowthRate}
            onChange={(e) => handleChange('futureSalaryGrowthRate', Number(e.target.value))}
            className="w-full accent-sky-600"
          />
        </div>
      </div>
    </div>
  );
};
