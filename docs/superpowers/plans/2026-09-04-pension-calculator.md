# 离职退休金测算与社保方案优化工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 React + Vite + TypeScript + Tailwind CSS 的离职退休金测算与社保方案优化工具，能够根据用户输入的离职与社保历史参数，精准计算退休金，并对比断缴、灵活就业、失业金与4050补贴组合等方案的 ROI 与回本年限。

**Architecture:** 采用高内聚的精算与政策计算引擎 (`src/engine/`)，结合预置的城市政策数据 (`src/config/cities.ts`)，以响应式仪表盘 (`src/components/`) 呈现 UI 交互、对比表格、可视化图表及实操指引。

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, Vitest (单元测试).

---

## File Structure

```
.
├── src/
│   ├── types/
│   │   └── index.ts                 # 数据模型与接口定义
│   ├── config/
│   │   └── cities.ts                # 预置城市及社平工资/缴费基数数据
│   ├── engine/
│   │   ├── pension.ts               # 养老金精算引擎 (基础/个人账户/过渡性)
│   │   ├── pension.test.ts          # 养老金精算单元测试
│   │   ├── policy.ts                # 失业金与4050补贴策略计算器
│   │   └── policy.test.ts           # 策略引擎单元测试
│   ├── components/
│   │   ├── InputsPanel.tsx          # 用户输入表单与滑动条组件
│   │   ├── KPICards.tsx             # 核心对比指标卡片
│   │   ├── StrategyTable.tsx        # 4种社保策略对比表格
│   │   ├── CashFlowChart.tsx        # Recharts 现金流与收益曲线图
│   │   └── ActionPlan.tsx           # 实操指引与时间线步骤
│   ├── App.tsx                      # 主仪表盘视图与状态聚合
│   ├── main.tsx                     # React 应用入口
│   └── index.css                    # Tailwind CSS 引入
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── docs/superpowers/specs/2026-09-04-pension-calculator-design.md
```

---

### Task 1: Scaffolding Project & Environment Setup

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `index.html`

- [ ] **Step 1: Initialize Vite React TypeScript project with package.json**

```json
{
  "name": "pension-calculator",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "preview": "vite preview"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.380.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create vite.config.ts, tailwind.config.js, and index.html**

Write `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
  },
});
```

Write `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

Write `postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Write `index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>离职退休金测算与社保优化工具</title>
  </head>
  <body class="bg-slate-50 text-slate-800 antialiased min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Write `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Write basic `src/main.tsx` and `src/App.tsx`.

- [ ] **Step 3: Run npm install**

Run: `npm install`
Expected: Dependencies installed with no errors.

- [ ] **Step 4: Commit setup**

```bash
git add package.json vite.config.ts tailwind.config.js postcss.config.js index.html src/
git commit -m "chore: scaffold vite react ts tailwind project setup"
```

---

### Task 2: Data Models & Pre-set City Configurations

**Files:**
- Create: `src/types/index.ts`
- Create: `src/config/cities.ts`

- [ ] **Step 1: Write data models in src/types/index.ts**

```typescript
export interface CityPolicy {
  cityId: string;
  cityName: string;
  avgSalary: number;            // 社平月工资
  baseMin: number;              // 缴费基数下限 (社平 60%)
  baseMax: number;              // 缴费基数上限 (社平 300%)
  medicalMinYearsMale: number;  // 医保最低缴费年限 (男)
  medicalMinYearsFemale: number;// 医保最低缴费年限 (女)
  unemploymentBenefit: number;  // 每月失业金标准
}

export interface UserInputs {
  gender: 'male' | 'female';
  birthYearMonth: string;          // 出生年月 YYYY-MM
  resignYearMonth: string;         // 计划离职年月 YYYY-MM
  retireAge: number;               // 预期退休年龄 (如 50, 55, 60, 65)
  paidYears: number;               // 现已缴年限 (年)
  personalAccountBalance: number;  // 个人账户当前余额 (元)
  avgPayIndex: number;             // 历史平均缴费指数 (0.6 - 3.0)
  cityId: string;                  // 选择的城市 ID
  customAvgSalary?: number;        // 自定义社平工资 (若微调)
  futureSalaryGrowthRate: number;  // 未来社平工资年增长率 (如 0.03)
}

export interface TimelineStep {
  period: string;
  action: string;
  financialImpact: string;
}

export interface StrategyResult {
  id: string;
  name: string;                    // 策略名称
  description: string;             // 策略描述
  totalSelfPaid: number;           // 离职到退休个人总支出
  totalSubsidies: number;          // 获得的失业金与补贴总额
  netCost: number;                 // 净成本 (支出 - 补贴)
  retireMonthlyPension: number;    // 退休首月养老金
  breakEvenYears: number;          // 回本所需年限
  totalReceivedAt80: number;       // 80岁累计领取的养老金
  timeline: TimelineStep[];
}
```

- [ ] **Step 2: Write pre-set city policies in src/config/cities.ts**

```typescript
import { CityPolicy } from '../types';

export const CITIES: CityPolicy[] = [
  {
    cityId: 'beijing',
    cityName: '北京',
    avgSalary: 11537,
    baseMin: 6385,
    baseMax: 33891,
    medicalMinYearsMale: 25,
    medicalMinYearsFemale: 20,
    unemploymentBenefit: 2124,
  },
  {
    cityId: 'shanghai',
    cityName: '上海',
    avgSalary: 12183,
    baseMin: 7310,
    baseMax: 36549,
    medicalMinYearsMale: 15,
    medicalMinYearsFemale: 15,
    unemploymentBenefit: 2175,
  },
  {
    cityId: 'guangzhou',
    cityName: '广州',
    avgSalary: 10449,
    baseMin: 5284,
    baseMax: 26421,
    medicalMinYearsMale: 25,
    medicalMinYearsFemale: 20,
    unemploymentBenefit: 2070,
  },
  {
    cityId: 'shenzhen',
    cityName: '深圳',
    avgSalary: 10725,
    baseMin: 6000,
    baseMax: 26421,
    medicalMinYearsMale: 25,
    medicalMinYearsFemale: 25,
    unemploymentBenefit: 2124,
  },
  {
    cityId: 'hangzhou',
    cityName: '杭州',
    avgSalary: 9210,
    baseMin: 4462,
    baseMax: 22311,
    medicalMinYearsMale: 20,
    medicalMinYearsFemale: 20,
    unemploymentBenefit: 1824,
  },
];
```

- [ ] **Step 3: Commit Task 2**

```bash
git add src/types/index.ts src/config/cities.ts
git commit -m "feat: add pension types and pre-set city policy configurations"
```

---

### Task 3: Actuarial Pension Engine Implementation & Tests

**Files:**
- Create: `src/engine/pension.ts`
- Create: `src/engine/pension.test.ts`

- [ ] **Step 1: Write failing test in src/engine/pension.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { calculatePension } from './pension';

describe('Pension Calculator Engine', () => {
  it('calculates pension correctly for standard male at age 60', () => {
    const result = calculatePension({
      avgSalaryAtRetire: 10000,
      avgPayIndex: 1.0,
      totalPaidYears: 30,
      personalAccountBalanceAtRetire: 139000,
      retireAge: 60,
    });

    // 基础养老金 = 10000 * (1 + 1.0) / 2 * 30 * 1% = 3000
    // 个人账户养老金 = 139000 / 139 = 1000
    // 总养老金 = 4000
    expect(result.basicPension).toBeCloseTo(3000, 0);
    expect(result.personalPension).toBeCloseTo(1000, 0);
    expect(result.totalPension).toBeCloseTo(4000, 0);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test`
Expected: FAIL ("cannot find module pension")

- [ ] **Step 3: Implement pension calculation engine in src/engine/pension.ts**

```typescript
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
```

- [ ] **Step 4: Run test to verify pass**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Commit Task 3**

```bash
git add src/engine/pension.ts src/engine/pension.test.ts
git commit -m "feat: implement actuarial pension calculation engine with tests"
```

---

### Task 4: Policy & Strategy Engine Implementation & Tests

**Files:**
- Create: `src/engine/policy.ts`
- Create: `src/engine/policy.test.ts`

- [ ] **Step 1: Write test for policy strategies in src/engine/policy.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateStrategies } from './policy';
import { UserInputs, CityPolicy } from '../types';

const mockCity: CityPolicy = {
  cityId: 'beijing',
  cityName: '北京',
  avgSalary: 10000,
  baseMin: 6000,
  baseMax: 30000,
  medicalMinYearsMale: 25,
  medicalMinYearsFemale: 20,
  unemploymentBenefit: 2000,
};

const mockInputs: UserInputs = {
  gender: 'male',
  birthYearMonth: '1976-01',
  resignYearMonth: '2026-01',
  retireAge: 60,
  paidYears: 20,
  personalAccountBalance: 100000,
  avgPayIndex: 1.0,
  cityId: 'beijing',
  futureSalaryGrowthRate: 0.03,
};

describe('Policy Strategy Engine', () => {
  it('generates 4 strategies for given user inputs', () => {
    const strategies = calculateStrategies(mockInputs, mockCity);
    expect(strategies.length).toBe(4);
    expect(strategies.map((s) => s.id)).toEqual([
      'stop',
      'min_self',
      'unemployment_4050',
      'full_self',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test`
Expected: FAIL ("cannot find module policy")

- [ ] **Step 3: Implement policy engine in src/engine/policy.ts**

```typescript
import { UserInputs, CityPolicy, StrategyResult, TimelineStep } from '../types';
import { calculatePension } from './pension';

export function getUnemploymentMonths(paidYears: number): number {
  if (paidYears < 1) return 0;
  if (paidYears < 5) return Math.min(12, Math.floor(paidYears) * 3);
  if (paidYears < 10) return 18;
  return 24;
}

export function calculateAge(birthYM: string, targetYM: string): number {
  const [bYear, bMonth] = birthYM.split('-').map(Number);
  const [tYear, tMonth] = targetYM.split('-').map(Number);
  return (tYear * 12 + tMonth - (bYear * 12 + bMonth)) / 12;
}

export function calculateStrategies(
  inputs: UserInputs,
  city: CityPolicy
): StrategyResult[] {
  const currentAge = calculateAge(inputs.birthYearMonth, inputs.resignYearMonth);
  const yearsToRetire = Math.max(0, inputs.retireAge - currentAge);
  const monthsToRetire = Math.round(yearsToRetire * 12);

  const avgSalary = inputs.customAvgSalary || city.avgSalary;
  // 未来退休时社平工资预测
  const futureAvgSalary =
    avgSalary * Math.pow(1 + inputs.futureSalaryGrowthRate, yearsToRetire);

  // 1. 完全断缴策略
  const stopPension = calculatePension({
    avgSalaryAtRetire: futureAvgSalary,
    avgPayIndex: inputs.avgPayIndex,
    totalPaidYears: inputs.paidYears,
    personalAccountBalanceAtRetire: inputs.personalAccountBalance,
    retireAge: inputs.retireAge,
  });

  const stopStrategy: StrategyResult = {
    id: 'stop',
    name: '方案一：离职后完全断缴',
    description: '不再自费缴纳社保，按已有年限测算。注意医保断缴风险。',
    totalSelfPaid: 0,
    totalSubsidies: 0,
    netCost: 0,
    retireMonthlyPension: stopPension.totalPension,
    breakEvenYears: 0,
    totalReceivedAt80: stopPension.totalPension * 12 * (80 - inputs.retireAge),
    timeline: [
      {
        period: `离职后至 ${inputs.retireAge} 岁`,
        action: '停止自费缴纳养老与医保',
        financialImpact: '个人支出 0 元',
      },
    ],
  };

  // 2. 灵活就业最低档 (60%基数) 按月自缴
  // 养老 20% (其中8%进个人账户), 医保按 8% 测算
  const minBase = city.baseMin;
  const monthlyPayMin = minBase * 0.2 + minBase * 0.08;
  const totalMinPaid = monthlyPayMin * monthsToRetire;
  const addedAccountMin = minBase * 0.08 * monthsToRetire;

  const minPension = calculatePension({
    avgSalaryAtRetire: futureAvgSalary,
    avgPayIndex: (inputs.avgPayIndex * inputs.paidYears + 0.6 * yearsToRetire) / (inputs.paidYears + yearsToRetire || 1),
    totalPaidYears: inputs.paidYears + yearsToRetire,
    personalAccountBalanceAtRetire: inputs.personalAccountBalance + addedAccountMin,
    retireAge: inputs.retireAge,
  });

  const minBreakEven = totalMinPaid / (Math.max(1, minPension.totalPension - stopPension.totalPension) * 12);

  const minStrategy: StrategyResult = {
    id: 'min_self',
    name: '方案二：灵活就业 lowest 60% 基数自缴',
    description: '按最低基数自费缴纳养老与医保，保障医保连续性，稳步累积工龄。',
    totalSelfPaid: Math.round(totalMinPaid),
    totalSubsidies: 0,
    netCost: Math.round(totalMinPaid),
    retireMonthlyPension: minPension.totalPension,
    breakEvenYears: Number(minBreakEven.toFixed(1)),
    totalReceivedAt80: minPension.totalPension * 12 * (80 - inputs.retireAge),
    timeline: [
      {
        period: `离职后至 ${inputs.retireAge} 岁 (${monthsToRetire} 个月)`,
        action: '以灵活就业身份按 60% 基数全额自缴',
        financialImpact: `月支出约 ¥${Math.round(monthlyPayMin)}`,
      },
    ],
  };

  // 3. 失业金 + 4050 补贴组合策略
  const unempMonths = Math.min(getUnemploymentMonths(inputs.paidYears), monthsToRetire);
  const totalUnempMoney = unempMonths * city.unemploymentBenefit;
  
  // 4050 补贴：假设离退休不足5年（或满50/40岁）可申请最高60%比例的社保补贴
  const is4050Eligible = currentAge >= (inputs.gender === 'male' ? 50 : 40) || (inputs.retireAge - currentAge <= 5);
  const subsidyMonths = is4050Eligible ? Math.min(monthsToRetire - unempMonths, 36) : 0;
  const subsidyRatio = 0.5; // 补贴 50% 费用
  const normalMonths = monthsToRetire - unempMonths - subsidyMonths;

  const costDuringUnemp = 0; // 失业金期间代缴医保，可选择不缴养老或60%自缴养老
  const costDuringSubsidy = monthlyPayMin * (1 - subsidyRatio) * subsidyMonths;
  const costNormal = monthlyPayMin * normalMonths;
  const comboTotalPaid = costDuringUnemp + costDuringSubsidy + costNormal;

  const comboPension = calculatePension({
    avgSalaryAtRetire: futureAvgSalary,
    avgPayIndex: (inputs.avgPayIndex * inputs.paidYears + 0.6 * (yearsToRetire - unempMonths / 12)) / (inputs.paidYears + yearsToRetire - unempMonths / 12 || 1),
    totalPaidYears: inputs.paidYears + (monthsToRetire - unempMonths) / 12,
    personalAccountBalanceAtRetire: inputs.personalAccountBalance + minBase * 0.08 * (monthsToRetire - unempMonths),
    retireAge: inputs.retireAge,
  });

  const comboNetCost = comboTotalPaid - totalUnempMoney;
  const comboBreakEven = Math.max(0, comboNetCost) / (Math.max(1, comboPension.totalPension - stopPension.totalPension) * 12);

  const comboTimeline: TimelineStep[] = [];
  if (unempMonths > 0) {
    comboTimeline.push({
      period: `第 1 - ${unempMonths} 个月`,
      action: '申领失业保险金，由失业基金代缴基本医保',
      financialImpact: `月领 ¥${city.unemploymentBenefit}，累计领 ¥${totalUnempMoney}`,
    });
  }
  if (subsidyMonths > 0) {
    comboTimeline.push({
      period: `第 ${unempMonths + 1} - ${unempMonths + subsidyMonths} 个月`,
      action: '申请 4050/大龄灵活就业社保补贴（享受 50% 费率返还）',
      financialImpact: `月自缴约 ¥${Math.round(monthlyPayMin * (1 - subsidyRatio))}`,
    });
  }
  if (normalMonths > 0) {
    comboTimeline.push({
      period: `第 ${unempMonths + subsidyMonths + 1} - ${monthsToRetire} 个月`,
      action: '灵活就业普通自缴 (60% 基数)',
      financialImpact: `月自缴约 ¥${Math.round(monthlyPayMin)}`,
    });
  }

  const comboStrategy: StrategyResult = {
    id: 'unemployment_4050',
    name: '方案三：失业金 + 4050 补贴组合 (推荐)',
    description: '充分利用国家失业救济与大龄就业补贴，极大地降低自费成本，性价比极高。',
    totalSelfPaid: Math.round(comboTotalPaid),
    totalSubsidies: Math.round(totalUnempMoney + monthlyPayMin * subsidyRatio * subsidyMonths),
    netCost: Math.round(comboNetCost),
    retireMonthlyPension: comboPension.totalPension,
    breakEvenYears: Number(comboBreakEven.toFixed(1)),
    totalReceivedAt80: comboPension.totalPension * 12 * (80 - inputs.retireAge),
    timeline: comboTimeline,
  };

  // 4. 灵活就业 100% 基数自缴
  const fullBase = avgSalary;
  const monthlyPayFull = fullBase * 0.2 + fullBase * 0.08;
  const totalFullPaid = monthlyPayFull * monthsToRetire;
  const addedAccountFull = fullBase * 0.08 * monthsToRetire;

  const fullPension = calculatePension({
    avgSalaryAtRetire: futureAvgSalary,
    avgPayIndex: (inputs.avgPayIndex * inputs.paidYears + 1.0 * yearsToRetire) / (inputs.paidYears + yearsToRetire || 1),
    totalPaidYears: inputs.paidYears + yearsToRetire,
    personalAccountBalanceAtRetire: inputs.personalAccountBalance + addedAccountFull,
    retireAge: inputs.retireAge,
  });

  const fullBreakEven = totalFullPaid / (Math.max(1, fullPension.totalPension - stopPension.totalPension) * 12);

  const fullStrategy: StrategyResult = {
    id: 'full_self',
    name: '方案四：灵活就业 100% 满额基数自缴',
    description: '按当地社平 100% 基数自缴，大幅提升退休基础养老金与个人账户金。',
    totalSelfPaid: Math.round(totalFullPaid),
    totalSubsidies: 0,
    netCost: Math.round(totalFullPaid),
    retireMonthlyPension: fullPension.totalPension,
    breakEvenYears: Number(fullBreakEven.toFixed(1)),
    totalReceivedAt80: fullPension.totalPension * 12 * (80 - inputs.retireAge),
    timeline: [
      {
        period: `离职后至 ${inputs.retireAge} 岁 (${monthsToRetire} 个月)`,
        action: '按 100% 社平工资基数自缴社保',
        financialImpact: `月自缴约 ¥${Math.round(monthlyPayFull)}`,
      },
    ],
  };

  return [stopStrategy, minStrategy, comboStrategy, fullStrategy];
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Commit Task 4**

```bash
git add src/engine/policy.ts src/engine/policy.test.ts
git commit -m "feat: implement unemployment and 4050 subsidy policy strategies with tests"
```

---

### Task 5: InputsPanel Form Component

**Files:**
- Create: `src/components/InputsPanel.tsx`

- [ ] **Step 1: Create InputsPanel component for user parameter adjustment**

Write `src/components/InputsPanel.tsx`:
```tsx
import React from 'react';
import { UserInputs } from '../types';
import { CITIES } from '../config/cities';
import { Sliders, User, Calendar, Briefcase, MapPin } from 'lucide-react';

interface InputsPanelProps {
  inputs: UserInputs;
  onChange: (updated: UserInputs) => void;
}

export const InputsPanel: React.FC<InputsPanelProps> = ({ inputs, onChange }) => {
  const handleChange = (key: keyof UserInputs, value: any) => {
    onChange({ ...inputs, [key]: value });
  };

  const selectedCity = CITIES.find((c) => c.cityId === inputs.cityId) || CITIES[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
        <Sliders className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-800">测算参数设置</h2>
      </div>

      {/* 基础个人信息 */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <User className="w-4 h-4" /> 个人属性
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">性别</label>
            <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
              <button
                type="button"
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
                  inputs.gender === 'male'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => handleChange('gender', 'male')}
              >
                男
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
                  inputs.gender === 'female'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => handleChange('gender', 'female')}
              >
                女
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">预期退休年龄</label>
            <select
              value={inputs.retireAge}
              onChange={(e) => handleChange('retireAge', Number(e.target.value))}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value={50}>50 岁 (女工人)</option>
              <option value={55}>55 岁 (女干部/灵活)</option>
              <option value={60}>60 岁 (标准男)</option>
              <option value={65}>65 岁 (延迟退休预估)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">出生年月</label>
            <input
              type="month"
              value={inputs.birthYearMonth}
              onChange={(e) => handleChange('birthYearMonth', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">计划离职年月</label>
            <input
              type="month"
              value={inputs.resignYearMonth}
              onChange={(e) => handleChange('resignYearMonth', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
            />
          </div>
        </div>
      </div>

      {/* 社保历史 */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Briefcase className="w-4 h-4" /> 社保历史数据
        </h3>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">已累计缴费年限</span>
            <span className="font-semibold text-indigo-600">{inputs.paidYears} 年</span>
          </div>
          <input
            type="range"
            min={1}
            max={40}
            value={inputs.paidYears}
            onChange={(e) => handleChange('paidYears', Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">养老个人账户当前余额 (元)</label>
          <input
            type="number"
            value={inputs.personalAccountBalance}
            onChange={(e) => handleChange('personalAccountBalance', Number(e.target.value))}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">历史平均缴费指数</span>
            <span className="font-semibold text-indigo-600">{inputs.avgPayIndex}</span>
          </div>
          <input
            type="range"
            min={0.6}
            max={3.0}
            step={0.1}
            value={inputs.avgPayIndex}
            onChange={(e) => handleChange('avgPayIndex', Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <span className="text-[10px] text-slate-400">0.6 为最低基数，1.0 为社平水平，3.0 为顶格</span>
        </div>
      </div>

      {/* 城市与政策选择 */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <MapPin className="w-4 h-4" /> 所在城市与社平数据
        </h3>

        <div>
          <label className="block text-xs text-slate-500 mb-1">目标城市</label>
          <select
            value={inputs.cityId}
            onChange={(e) => handleChange('cityId', e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
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
            <span className="text-slate-500">未来社平工资年化增长率预估</span>
            <span className="font-semibold text-indigo-600">
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
            className="w-full accent-indigo-600"
          />
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit Task 5**

```bash
git add src/components/InputsPanel.tsx
git commit -m "feat: add InputsPanel component with full pension form controls"
```

---

### Task 6: StrategyTable & KPICards Components

**Files:**
- Create: `src/components/KPICards.tsx`
- Create: `src/components/StrategyTable.tsx`
- Create: `src/components/ActionPlan.tsx`

- [ ] **Step 1: Write KPICards component**

Write `src/components/KPICards.tsx`:
```tsx
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 推荐方案 */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide opacity-80">最高性价比推荐</span>
          <Award className="w-5 h-5 text-yellow-300" />
        </div>
        <h3 className="text-lg font-bold">{recommended.name}</h3>
        <p className="text-xs opacity-90 mt-1 line-clamp-2">{recommended.description}</p>
      </div>

      {/* 预计退休月收入 */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">预计退休月养老金</span>
          <DollarSign className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-slate-800">¥{recommended.retireMonthlyPension}</span>
          <span className="text-xs text-emerald-600 font-medium">/ 月</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          对比断缴多领 <span className="font-semibold text-emerald-600">+¥{addedPension}/月</span>
        </p>
      </div>

      {/* 回本年限 */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">自费投入回本年限</span>
          <Clock className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-slate-800">
            {recommended.breakEvenYears > 0 ? `${recommended.breakEvenYears} 年` : '立即极速回本'}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          离职期间净投入仅 <span className="font-semibold text-indigo-600">¥{recommended.netCost}</span>
        </p>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write StrategyTable component**

Write `src/components/StrategyTable.tsx`:
```tsx
import React from 'react';
import { StrategyResult } from '../types';
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
        <h3 className="font-bold text-slate-800">4 种社保缴纳策略精算对比</h3>
        <span className="text-xs text-slate-400">点击任意行查看操作指引与明细</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="p-4">方案名称</th>
              <th className="p-4">离职后自费总支出</th>
              <th className="p-4">补贴与失业金总收益</th>
              <th className="p-4">净投入成本</th>
              <th className="p-4">退休首月养老金</th>
              <th className="p-4">回本年限</th>
              <th className="p-4">80岁累计领取</th>
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
                    isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="p-4 flex items-center space-x-2">
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                    <div>
                      <span className="font-bold text-slate-800 block">{s.name}</span>
                      {isCombo && (
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5">
                          最推荐
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-slate-600">¥{s.totalSelfPaid.toLocaleString()}</td>
                  <td className="p-4 text-emerald-600 font-semibold">
                    +¥{s.totalSubsidies.toLocaleString()}
                  </td>
                  <td className="p-4 font-bold text-slate-800">¥{s.netCost.toLocaleString()}</td>
                  <td className="p-4 text-indigo-600 font-extrabold text-sm">
                    ¥{s.retireMonthlyPension.toLocaleString()}/月
                  </td>
                  <td className="p-4">
                    {s.breakEvenYears > 0 ? `${s.breakEvenYears} 年` : '-'}
                  </td>
                  <td className="p-4 text-slate-800 font-bold">
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
```

- [ ] **Step 3: Write ActionPlan component**

Write `src/components/ActionPlan.tsx`:
```tsx
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
        <h3 className="font-bold text-slate-800">【{strategy.name}】实操时间线指引</h3>
      </div>

      <div className="space-y-3">
        {strategy.timeline.map((step, idx) => (
          <div key={idx} className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {idx + 1}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-indigo-900">{step.period}</span>
                <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                  {step.financialImpact}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{step.action}</p>
            </div>
          </div>
        ))}
      </div>

      {strategy.id === 'stop' && (
        <div className="flex items-center space-x-2 text-xs bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>断缴提示：完全断缴将导致医疗保险断缴失效，突发疾病将无法享受医保报销，建议至少单独缴纳基本医疗保险。</span>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Commit Task 6**

```bash
git add src/components/KPICards.tsx src/components/StrategyTable.tsx src/components/ActionPlan.tsx
git commit -m "feat: add KPICards, StrategyTable, and ActionPlan components"
```

---

### Task 7: Recharts CashFlowChart Component

**Files:**
- Create: `src/components/CashFlowChart.tsx`

- [ ] **Step 1: Implement Recharts CashFlowChart component**

Write `src/components/CashFlowChart.tsx`:
```tsx
import React from 'react';
import { StrategyResult } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface CashFlowChartProps {
  strategies: StrategyResult[];
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ strategies }) => {
  const chartData = strategies.map((s) => ({
    name: s.name.split('：')[1] || s.name,
    净支出成本: s.netCost,
    退休首月养老金: s.retireMonthlyPension,
    '80岁累计收益': Math.round(s.totalReceivedAt80 / 10000), // 万
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <h3 className="font-bold text-slate-800">各方案净成本 vs 退休收益直观对比 (万元)</h3>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="净支出成本" fill="#F43F5E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="80岁累计收益" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit Task 7**

```bash
git add src/components/CashFlowChart.tsx
git commit -m "feat: add Recharts CashFlowChart component"
```

---

### Task 8: Main App Dashboard Integration

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Integrate components and LocalStorage in src/App.tsx**

Write `src/App.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { UserInputs } from './types';
import { CITIES } from './config/cities';
import { calculateStrategies } from './engine/policy';
import { InputsPanel } from './components/InputsPanel';
import { KPICards } from './components/KPICards';
import { StrategyTable } from './components/StrategyTable';
import { CashFlowChart } from './components/CashFlowChart';
import { ActionPlan } from './components/ActionPlan';
import { Calculator, Sparkles } from 'lucide-react';

const DEFAULT_INPUTS: UserInputs = {
  gender: 'male',
  birthYearMonth: '1980-01',
  resignYearMonth: '2026-06',
  retireAge: 60,
  paidYears: 18,
  personalAccountBalance: 120000,
  avgPayIndex: 1.0,
  cityId: 'beijing',
  futureSalaryGrowthRate: 0.03,
};

export const App: React.FC = () => {
  const [inputs, setInputs] = useState<UserInputs>(() => {
    const saved = localStorage.getItem('pension_user_inputs');
    if (saved) {
      try {
        return JSON.parse(saved);
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

  const selectedCity = CITIES.find((c) => c.cityId === inputs.cityId) || CITIES[0];
  const strategies = calculateStrategies(inputs, selectedCity);
  const activeStrategy =
    strategies.find((s) => s.id === selectedStrategyId) || strategies[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* 顶部 Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                离职退休金精算与社保优化工具
              </h1>
              <p className="text-xs text-slate-500">
                国家最新基本养老金公式 + 失业金/4050大龄补贴精算推荐
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 font-medium">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>智能算法规划中</span>
          </div>
        </div>
      </header>

      {/* 主体 Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
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
      </main>
    </div>
  );
};

export default App;
```

- [ ] **Step 2: Commit Task 8**

```bash
git add src/App.tsx
git commit -m "feat: integrate main App dashboard layout and localStorage state"
```

---

### Task 9: Verification & Build Check

**Files:**
- Run test and build scripts to ensure zero compilation or runtime errors.

- [ ] **Step 1: Run vitest test suite**

Run: `npm run test`
Expected: All tests PASS.

- [ ] **Step 2: Run build check**

Run: `npm run build`
Expected: Production build completes without TypeScript or Vite bundle errors.

- [ ] **Step 3: Commit final build status**

```bash
git commit --allow-empty -m "build: verify project builds and all tests pass"
```
