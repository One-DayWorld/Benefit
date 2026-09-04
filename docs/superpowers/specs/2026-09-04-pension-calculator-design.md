# 离职退休金测算与社保方案优化工具 - 系统设计文档 (Design Spec)

## 1. 项目概述 (Overview)

本工具旨在帮助广大职工在面临离职、自由职业或提前规划退休时，提供精准的养老金测算以及“离职至退休”过渡期的社保缴费性价比（ROI）优化方案。系统通过结合国家基本养老保险计算公式、失业保险金申领规则以及“4050/4555”大龄灵活就业社保补贴政策，为用户输出最优的社保缴纳与福利申领路线图。

## 2. 核心目标与特性 (Core Goals & Features)

- **退休养老金精准预测**：根据已缴年限、个人账户余额、历史缴费指数及未来社平工资增长率预测退休首月养老金。
- **离职过渡期 4 种社保策略对比**：
  1. **完全断缴策略**：不再自费缴纳社保，测算仅依靠已有年限的退休金收益。
  2. **灵活就业最低档自缴策略**：按 60% 最低基数按月缴纳养老金与医保。
  3. **失业金 + 4050 补贴组合策略**（推荐）：前期申领失业金（免缴医保），后续衔接 4050 社保补贴，降低自费成本。
  4. **灵活就业 100% 基数自缴策略**：按 100% 社平基数缴纳，对比高基数的长远收益。
- **性价比与回本年限分析**：计算净投入成本、80岁累计领取总额及退休后回本年限。
- **实操执行路线图 (Action Roadmap)**：生成按时间线的办理提醒与政策申请指南。

## 3. 技术架构 (System Architecture)

- **框架**：React 18 + TypeScript + Vite
- **样式与 UI 组件**：Tailwind CSS + Lucide React Icons + Radix UI
- **图表库**：Recharts（用于多方案现金流与养老金对比）
- **数据持久化**：LocalStorage (本地保存测算记录与用户微调参数，确保隐私安全)
- **部署模式**：纯前端 SPA，架构上将精算逻辑（`src/engine`）与 UI 组件分离，便于未来无缝移植至微信小程序。

## 4. 详细数据模型 (Data Models)

```typescript
// 城市政策参数模型
export interface CityPolicy {
  cityId: string;
  cityName: string;
  avgSalary: number;            // 当前社平月工资
  baseMin: number;              // 缴费基数下限 (通常社平60%)
  baseMax: number;              // 缴费基数上限 (通常社平300%)
  medicalMinYears: number;      // 医保累计最低缴费年限要求 (男/女平均)
  unemploymentBenefit: number;  // 当地月失业保险金标准
}

// 用户输入测算参数模型
export interface UserInputs {
  gender: 'male' | 'female';
  birthYearMonth: string;          // 出生年月 (YYYY-MM)
  resignYearMonth: string;         // 计划离职年月 (YYYY-MM)
  retireAge: number;               // 预期退休年龄 (50/55/60/65)
  paidYears: number;               // 已缴费年限 (含视同缴费)
  personalAccountBalance: number;  // 当前养老个人账户余额
  avgPayIndex: number;             // 历史平均缴费指数 (0.6 - 3.0)
  cityPolicy: CityPolicy;          // 所选城市及政策参数
  futureSalaryGrowthRate: number;  // 预期未来社平工资年增长率 (默认 0.03)
}

// 单项方案精算结果模型
export interface StrategyResult {
  id: string;
  name: string;                    // 策略名称
  description: string;             // 策略说明
  totalSelfPaid: number;           // 离职到退休个人自费总支出
  totalSubsidies: number;          // 获得的失业金与补贴总额
  netCost: number;                 // 净投入成本 (支出 - 补贴)
  retireMonthlyPension: number;    // 退休首月养老金
  breakEvenYears: number;          // 回本所需年限
  totalReceivedAt80: number;       // 80岁时累计领取的养老金总额
  timeline: TimelineStep[];        // 时间线实操步骤
}

export interface TimelineStep {
  period: string;                  // 时间段 (例如 "2026.10 - 2028.09")
  action: string;                  // 操作事项
  financialImpact: string;         // 财务影响
}
```

## 5. 精算与政策引擎逻辑 (Engine Logic)

1. **养老金计算算法**：
   - `基础养老金` = 退休前社平月工资 $\times (1 + \text{平均缴费指数}) \div 2 \times \text{总缴费年限} \times 1\%$
   - `个人账户养老金` = 退休时个人账户累计余额 $\div$ 计发月数（60岁为139，55岁为170，50岁为195）。
2. **失业金与补贴规则**：
   - 满1年不满5年可领失业金上限 12 个月；满5年不满10年上限 18 个月；满10年以上上限 24 个月。
   - 领失业金期间代缴基本医疗保险，不强制缴纳养老保险。
   - 4050 补贴：距离法定退休年龄不足 5 年的大龄人员可申请灵活就业社保补贴（补贴比例 50%-70%），最长享受至退休。

## 6. UI/UX 界面布局 (Interface Layout)

- **顶栏**：应用名称与全局城市选择器。
- **左侧边栏 (Inputs)**：表单项包含个人信息、已缴情况、预期参数滑动条（退休年龄、工资增长率）。
- **主界面 (Dashboard)**：
  - **卡片区**：最佳策略推荐卡片、退休首月预测金卡片、回本年限对比卡片。
  - **表格区**：四种策略并行对比表（含累计支出、获得补贴、净成本、首月养老金、回本年限）。
  - **图表区**：Recharts 动态现金流与累计收益对比图。
  - **指南区**：针对选定最佳策略生成的月度/年度实操指引。
