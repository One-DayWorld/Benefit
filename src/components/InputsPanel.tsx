import React from 'react';
import { UserInputs } from '../types';
import { CITIES } from '../config/cities';
import { calculateDelayedRetirement } from '../engine/delayedRetirement';
import {
  currentYearMonth,
  monthsBetweenYM,
  payBaseRange,
  DEFAULT_PERSONAL_ACCOUNT_INTEREST_RATE,
} from '../engine/policy';
import { Sliders, User, Briefcase, MapPin, Sparkles, ExternalLink } from 'lucide-react';

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

  // 存量数据基准年月：未设置时取当前月，与引擎的缺省口径一致
  const dataAsOfYMStr = inputs.dataAsOfYearMonth || currentYearMonth();
  const dataAsOfYM = (() => {
    const [y, m] = dataAsOfYMStr.split('-').map(Number);
    return { year: y, month: m };
  })();
  /** 基准月之后仍在职的月数：>0 时这几个月由单位继续缴费，不计入方案成本 */
  const employedMonthsBeforeResign = Math.max(
    0,
    monthsBetweenYM(dataAsOfYMStr, inputs.resignYearMonth)
  );

  /** 静态口径：社平增长率、养老金调增率、个人账户记账利率一并按 0 */
  const isStatic = inputs.staticBasis === true;
  const selectedCity = CITIES.find((c) => c.cityId === inputs.cityId);
  const displayAvgSalary = inputs.customAvgSalary || selectedCity?.avgSalary || 0;
  /** 社平工资被手动覆盖：此时缴费基数上下限须按法定比例重算，与引擎口径一致 */
  const isCustomAvgSalary =
    Boolean(inputs.customAvgSalary) && inputs.customAvgSalary !== selectedCity?.avgSalary;
  const derivedBaseRange = isCustomAvgSalary
    ? payBaseRange(displayAvgSalary)
    : { baseMin: selectedCity?.baseMin ?? 0, baseMax: selectedCity?.baseMax ?? 0 };

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

        {/* 离职性质：决定能否申领失业保险金 */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            离职性质（决定能否领失业金）
          </label>
          <select
            value={inputs.separationType}
            onChange={(e) => handleChange('separationType', e.target.value)}
            className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="involuntary">被动离职：裁员 / 协商解除 / 合同到期不续签</option>
            <option value="voluntary">主动辞职（本人提出）</option>
          </select>
          {inputs.separationType === 'voluntary' && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-1.5 mt-1.5 leading-relaxed">
              依《社会保险法》第四十五条，主动辞职属“因本人意愿中断就业”，通常
              <strong>无法申领失业保险金</strong>，方案三已按 0 个月失业金测算。
            </p>
          )}
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
            <span>预测新退休年龄：{delayedResult.targetAgeLabel}</span>
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
              min={delayedResult.targetAge}
              max={70}
              value={inputs.retireAge}
              onChange={(e) => handleChange('retireAge', Number(e.target.value))}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
            />
            <span className="text-xs text-slate-500 font-medium">岁</span>
          </div>
          {inputs.retireAge < delayedResult.targetAge && (
            <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-1.5 mt-1.5 leading-relaxed">
              设定的 {inputs.retireAge.toFixed(2)} 岁<strong>早于法定退休年龄 {delayedResult.targetAgeLabel}</strong>。
              除特殊工种、因病完全丧失劳动能力等法定情形外不得提前退休，测算结果不具参考性。
            </p>
          )}
        </div>
      </div>

      {/* 3. 社保历史数据卡片 */}
      <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/80 space-y-3">
        <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-100 pb-2">
          <Briefcase className="w-4 h-4 text-emerald-600" /> 2. 社保历史与账户数据
        </h3>

        {/* 存量数据基准年月：本卡片各项数值"截至哪个月"，与离职年月是两件事 */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            以下数据截至（存量数据基准年月）
          </label>
          <div className="flex space-x-1.5">
            <select
              value={dataAsOfYM.year}
              onChange={(e) =>
                handleChange(
                  'dataAsOfYearMonth',
                  `${e.target.value}-${String(dataAsOfYM.month).padStart(2, '0')}`
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
              value={dataAsOfYM.month}
              onChange={(e) =>
                handleChange(
                  'dataAsOfYearMonth',
                  `${dataAsOfYM.year}-${String(e.target.value).padStart(2, '0')}`
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
          {employedMonthsBeforeResign > 0 ? (
            <p className="text-[11px] text-slate-600 bg-white/70 border border-emerald-200 rounded-md p-1.5 mt-1.5 leading-relaxed">
              基准月至离职还有 <strong>{employedMonthsBeforeResign} 个月在职</strong>，
              测算已按单位继续申报缴费处理（个人部分从工资代扣，不计入方案成本）。
              若下方"已累计缴费月数"其实已包含这几个月，请把基准月调到相应月份，否则会重复计算。
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              指下方缴费月数与账户余额的截止月份。它决定社平工资与个人账户的预测起点，
              与"计划离职年月"是两件事：离职早晚只影响之后由谁缴费。
            </p>
          )}
        </div>

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

        {/* 职工医保已缴月数 */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            职工医保已累计缴费月数（留空则按养老月数近似）
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min={0}
              value={inputs.medicalPaidMonths ?? ''}
              placeholder={String(inputs.paidMonths)}
              onChange={(e) =>
                handleChange(
                  'medicalPaidMonths',
                  e.target.value === '' ? undefined : Math.max(0, Number(e.target.value))
                )
              }
              className="w-28 text-xs bg-white border border-slate-200 rounded-lg p-1.5 font-medium"
            />
            <span className="text-xs text-slate-500">
              个月 (折合 {((inputs.medicalPaidMonths ?? inputs.paidMonths) / 12).toFixed(1)} 年)
            </span>
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

        {/* 社平工资：可直接覆盖官方值；缴费基数上下限按法定 60%/300% 同步重算 */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-medium text-slate-600">
              社平月工资（缴费基数基准）
            </label>
            {isCustomAvgSalary && (
              <button
                type="button"
                onClick={() => handleChange('customAvgSalary', undefined)}
                className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 underline"
              >
                恢复官方值
              </button>
            )}
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 font-bold">¥</span>
            <input
              type="number"
              min={0}
              step={1}
              value={inputs.customAvgSalary ?? ''}
              placeholder={String(selectedCity?.avgSalary ?? '')}
              onChange={(e) =>
                handleChange(
                  'customAvgSalary',
                  e.target.value === '' ? undefined : Number(e.target.value)
                )
              }
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-1.5 font-bold text-slate-800"
            />
            <span className="text-xs text-slate-500 whitespace-nowrap">/月</span>
          </div>

          <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            按法定 60% / 300% 推算：缴费基数下限{' '}
            <strong className="text-slate-700">¥{derivedBaseRange.baseMin.toLocaleString()}</strong>
            {' · '}上限{' '}
            <strong className="text-slate-700">¥{derivedBaseRange.baseMax.toLocaleString()}</strong>
          </p>

          {isCustomAvgSalary ? (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-1.5 mt-1.5 leading-relaxed">
              已覆盖内置值 ¥{selectedCity?.avgSalary.toLocaleString()}，缴费基数上下限已按
              60%/300% 同步重算。请核对上述推算值与官方公布的上下限是否一致。
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed" title={selectedCity?.dataVintage}>
              内置值来源：{selectedCity?.dataVintage?.split(' / ')[0]}。
              每年年中公布上年度数据、当年 7 月 1 日起适用，届时在此直接改写即可。
            </p>
          )}

          <a
            href="https://rsj.sh.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 mt-1.5"
          >
            <ExternalLink className="w-3 h-3" />
            打开上海市人社局官网核对
          </a>
        </div>

        {/* 三项增长假设：均可独立调到 0；下方开关只是"一并归零"的快捷方式 */}
        <div className="rounded-lg border border-sky-200 bg-white/80 p-2.5 space-y-2.5">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isStatic}
              onChange={(e) => handleChange('staticBasis', e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 accent-sky-600 flex-shrink-0"
            />
            <span className="text-xs font-bold text-sky-900 leading-snug">
              静态口径测算（下列三项一并按 0）
            </span>
          </label>
          <p className="text-[11px] text-slate-600 leading-relaxed pl-[22px]">
            {isStatic ? (
              <>
                已按当前社平工资 <strong>¥{displayAvgSalary.toLocaleString()}</strong> 计算：
                社平不增长、退休后不调增、个人账户不计息。结果可与官方退休金演示表逐格对照，
                也可直接与您现在的收入比较。<strong>实际到手的名义金额会高于此数</strong>。
                取消勾选即恢复下方原值。
              </>
            ) : (
              <>
                默认口径算出的是退休当年的名义金额，含十几年增长复利，数值偏大且无法与当下物价比较。
                三项也可单独拉到 0，逐项观察各自的影响。
              </>
            )}
          </p>
        </div>

        <div className={isStatic ? 'opacity-40 pointer-events-none' : undefined}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 font-medium">① 未来社平工资年化增长率</span>
            <span className="font-bold text-sky-700">
              {isStatic
                ? '0.0% (静态口径)'
                : `${(inputs.futureSalaryGrowthRate * 100).toFixed(1)}%`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={0.08}
            step={0.005}
            disabled={isStatic}
            value={inputs.futureSalaryGrowthRate}
            onChange={(e) => handleChange('futureSalaryGrowthRate', Number(e.target.value))}
            className="w-full accent-sky-600"
          />
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            同时驱动退休时社平工资与缴费基数的逐年上调，故养老金与自缴成本会一起变化。拉到 0 即按当前社平测算。
          </p>
        </div>

        <div className={isStatic ? 'opacity-40 pointer-events-none' : undefined}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 font-medium">② 退休后养老金年均调增率</span>
            <span className="font-bold text-sky-700">
              {isStatic
                ? '0.0% (静态口径)'
                : `${((inputs.pensionIndexationRate ?? 0.02) * 100).toFixed(1)}%`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={0.05}
            step={0.005}
            disabled={isStatic}
            value={inputs.pensionIndexationRate ?? 0.02}
            onChange={(e) => handleChange('pensionIndexationRate', Number(e.target.value))}
            className="w-full accent-sky-600"
          />
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            只影响“80岁累计领取”，不影响退休首月养老金。全国养老金已连续多年上调，近年幅度约 2%~3%，非法定承诺。
          </p>
        </div>

        <div className={isStatic ? 'opacity-40 pointer-events-none' : undefined}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 font-medium">③ 个人账户记账利率</span>
            <span className="font-bold text-sky-700">
              {isStatic
                ? '0.0% (静态口径)'
                : `${(
                    (inputs.personalAccountInterestRate ??
                      DEFAULT_PERSONAL_ACCOUNT_INTEREST_RATE) * 100
                  ).toFixed(1)}%`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={0.06}
            step={0.005}
            disabled={isStatic}
            value={
              inputs.personalAccountInterestRate ?? DEFAULT_PERSONAL_ACCOUNT_INTEREST_RATE
            }
            onChange={(e) =>
              handleChange('personalAccountInterestRate', Number(e.target.value))
            }
            className="w-full accent-sky-600"
          />
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            个人账户余额按此利率逐月滚存，只影响养老金中的个人账户部分。人社部每年统一公布，近年区间约 2%~4%。
          </p>
        </div>
      </div>
    </div>
  );
};
