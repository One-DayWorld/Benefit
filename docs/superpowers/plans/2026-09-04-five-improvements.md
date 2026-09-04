# 离职退休金计算器 6 项体验与功能改进实施计划 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 根据用户反馈实施 6 项体验、精算与档案管理改进：1) 已缴年限改为月数输入；2) 明确个人账户当前余额定义；3) 增加历史平均缴费指数估算辅助；4) 依据 2025 年延迟退休新规自动计算法定退休年龄；5) 修复策略表格选定行的 UI 缩进对齐问题；6) 支持多用户本地档案保存与“导入已有档案/新建全新档案”双模式。

**Architecture:** 新增 `src/engine/delayedRetirement.ts` 计算延迟退休新规政策；更新 `UserInputs` 类型；新建 `src/components/ProfileManager.tsx` 支持多档案 LocalStorage 存储、导入与新建；优化 `InputsPanel.tsx` 与 `StrategyTable.tsx`。

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Vitest.

---

## File Structure

```
.
├── src/
│   ├── types/
│   │   └── index.ts                         # 更新 UserInputs，增加 UserProfile 接口
│   ├── engine/
│   │   ├── delayedRetirement.ts             # 2025 延迟退休新规精算引擎
│   │   └── delayedRetirement.test.ts        # 延迟退休算法测试
│   ├── components/
│   │   ├── ProfileManager.tsx               # 多人员档案保存、导入、新建组件
│   │   ├── InputsPanel.tsx                  # 月数输入、余额解释、缴费指数助手、延迟退休联动
│   │   └── StrategyTable.tsx                # 修复图标对齐样式
│   └── App.tsx                              # 自动计算退休年龄联动与档案状态整合
```

---

### Task 1: Delayed Retirement Calculation Engine & Tests

**Files:**
- Create: `src/engine/delayedRetirement.ts`
- Create: `src/engine/delayedRetirement.test.ts`

- [ ] **Step 1: Write test for 2025 delayed retirement policy**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateDelayedRetirement } from './delayedRetirement';

describe('Delayed Retirement Calculator (2025 Policy)', () => {
  it('calculates no delay for people retiring before Jan 1, 2025', () => {
    const result = calculateDelayedRetirement('1964-12', 'male', false);
    expect(result.originalAge).toBe(60);
    expect(result.targetAge).toBe(60);
    expect(result.delayMonths).toBe(0);
    expect(result.retireYearMonth).toBe('2024-12');
  });

  it('calculates correct delay for male born in 1968', () => {
    const result = calculateDelayedRetirement('1968-01', 'male', false);
    expect(result.originalAge).toBe(60);
    expect(result.delayMonths).toBeGreaterThan(0);
    expect(result.targetAge).toBeGreaterThan(60);
  });

  it('calculates female worker delay (50 to 55 max)', () => {
    const result = calculateDelayedRetirement('1975-01', 'female', false);
    expect(result.originalAge).toBe(50);
    expect(result.delayMonths).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement delayed retirement calculation in src/engine/delayedRetirement.ts**

```typescript
export interface DelayedRetirementResult {
  originalAge: number;     // 原法定退休年龄 (50/55/60)
  targetAge: number;       // 延迟后退休年龄
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

  const targetAge = Number((originalAge + delayMonths / 12).toFixed(1));

  return {
    originalAge,
    targetAge,
    delayMonths,
    retireYearMonth: `${finalRetireYear}-${String(finalRetireMonth).padStart(2, '0')}`,
  };
}
```

- [ ] **Step 3: Run tests to verify pass**

Run: `npm run test`
Expected: PASS

- [ ] **Step 4: Commit Task 1**

```bash
git add src/engine/delayedRetirement.ts src/engine/delayedRetirement.test.ts
git commit -m "feat: implement 2025 delayed retirement engine with tests"
```

---

### Task 2: Data Models Update (paidMonths, workerType, UserProfile)

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/engine/policy.ts`

- [ ] **Step 1: Update src/types/index.ts**

```typescript
export interface UserInputs {
  profileName?: string;            // 档案别名 (如 "张三 (北京)")
  gender: 'male' | 'female';
  isFemaleCadre?: boolean;         // 女干部/管理技术岗位
  birthYearMonth: string;          // 出生年月 YYYY-MM
  resignYearMonth: string;         // 计划离职年月 YYYY-MM
  retireAge: number;               // 预期退休年龄
  paidMonths: number;              // 已累计缴费月数
  personalAccountBalance: number;  // 个人账户累计储存额 (元)
  avgPayIndex: number;             // 历史平均缴费指数 (0.6 - 3.0)
  lastMonthlySalary?: number;      // 离职前最近月薪 (辅助估算)
  cityId: string;                  // 选择的城市 ID
  customAvgSalary?: number;        // 自定义社平工资
  futureSalaryGrowthRate: number;  // 未来社平工资年增长率
}

export interface UserProfile {
  id: string;
  name: string;
  updatedAt: string;
  inputs: UserInputs;
}
```

- [ ] **Step 2: Update src/engine/policy.ts to handle paidMonths**

Convert `inputs.paidMonths / 12` to calculate paid years in pension equations.

- [ ] **Step 3: Commit Task 2**

```bash
git add src/types/index.ts src/engine/policy.ts
git commit -m "refactor: update UserInputs with paidMonths and UserProfile type"
```

---

### Task 3: ProfileManager Component (Multi-Person Import / Save)

**Files:**
- Create: `src/components/ProfileManager.tsx`

- [ ] **Step 1: Write ProfileManager component for saving/importing profiles**

```tsx
import React, { useState, useEffect } from 'react';
import { UserInputs, UserProfile } from '../types';
import { Users, FolderPlus, Download, Trash2, CheckCircle } from 'lucide-react';

interface ProfileManagerProps {
  currentInputs: UserInputs;
  onLoadProfile: (inputs: UserInputs) => void;
  onNewProfile: () => void;
}

const STORAGE_KEY = 'pension_user_profiles';

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  currentInputs,
  onLoadProfile,
  onNewProfile,
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setProfiles(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveProfilesToStorage = (updated: UserProfile[]) => {
    setProfiles(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleSaveCurrent = () => {
    const name = profileNameInput.trim() || `${currentInputs.gender === 'male' ? '男' : '女'}_${currentInputs.birthYearMonth}`;
    const newProfile: UserProfile = {
      id: Date.now().toString(),
      name,
      updatedAt: new Date().toLocaleDateString('zh-CN'),
      inputs: { ...currentInputs, profileName: name },
    };
    const updated = [newProfile, ...profiles.filter((p) => p.name !== name)];
    saveProfilesToStorage(updated);
    setSelectedProfileId(newProfile.id);
    setProfileNameInput('');
  };

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    if (!id) {
      onNewProfile();
      return;
    }
    const target = profiles.find((p) => p.id === id);
    if (target) {
      onLoadProfile(target.inputs);
    }
  };

  const handleDeleteProfile = (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    saveProfilesToStorage(updated);
    if (selectedProfileId === id) {
      setSelectedProfileId('');
      onNewProfile();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">人员测算档案管理</h3>
        </div>
        <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
          已存 {profiles.length} 份档案
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 模式一：导入已有档案 */}
        <div>
          <label className="block text-xs text-slate-500 mb-1 font-medium">
            选择/导入已有测算档案
          </label>
          <div className="flex space-x-2">
            <select
              value={selectedProfileId}
              onChange={(e) => handleSelectProfile(e.target.value)}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">+ 新建全新人员档案</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name} ({p.updatedAt})
                </option>
              ))}
            </select>
            {selectedProfileId && (
              <button
                type="button"
                onClick={() => handleDeleteProfile(selectedProfileId)}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200"
                title="删除当前选中的档案"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 保存当前数据为档案 */}
        <div>
          <label className="block text-xs text-slate-500 mb-1 font-medium">
            将当前输入保存为新档案
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="例如：张三 (北京)"
              value={profileNameInput}
              onChange={(e) => setProfileNameInput(e.target.value)}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
            />
            <button
              type="button"
              onClick={handleSaveCurrent}
              className="px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 flex items-center space-x-1"
            >
              <FolderPlus className="w-4 h-4" />
              <span>保存档案</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit Task 3**

```bash
git add src/components/ProfileManager.tsx
git commit -m "feat: add ProfileManager component for multi-person profile saving and importing"
```

---

### Task 4: InputsPanel UI Enhancements (Months, Help Tooltips, Index Estimator)

**Files:**
- Modify: `src/components/InputsPanel.tsx`

- [ ] **Step 1: Enhance InputsPanel.tsx**

1. **已缴月数转换**：支持 `paidMonths` 输入，显示 `216 个月 (18.0 年)`。
2. **余额概念解释 Tooltip**：清晰注解“个人账户本息累计总额”。
3. **缴费指数估算辅助器**：支持通过离职前月薪自动算得平均缴费指数。
4. **延迟退休新规推荐提示**。

- [ ] **Step 2: Commit Task 4**

```bash
git add src/components/InputsPanel.tsx
git commit -m "feat: update InputsPanel with monthly inputs, balance explanations, and pay index helper"
```

---

### Task 5: StrategyTable UI Alignment Fix

**Files:**
- Modify: `src/components/StrategyTable.tsx`

- [ ] **Step 1: Fix column alignment in StrategyTable.tsx**

Use fixed-width `<span className="w-5 flex-shrink-0">` for checkmarks to ensure text in all rows strictly aligns on the left.

- [ ] **Step 2: Commit Task 5**

```bash
git add src/components/StrategyTable.tsx
git commit -m "fix: align strategy table column text neatly regardless of row selection"
```

---

### Task 6: App Dashboard Integration & Verification

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Integrate ProfileManager and auto-delayed retirement in src/App.tsx**

- [ ] **Step 2: Run tests and build check**

Run: `npm run test && npm run build`
Expected: PASS and build succeeds.

- [ ] **Step 3: Commit Task 6**

```bash
git commit --allow-empty -m "build: verify all 6 feature enhancements pass tests and build"
```
