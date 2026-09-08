# 🔮 离职退休金测算与社保方案优化工具

> **Benefit** — A pension & social-insurance strategy calculator for workers facing resignation, career breaks, or early retirement planning.
>
> 离职是中年打工人最大的财务断点。**断缴还是接着交**、**4050 补贴能不能拿**、**延迟到几岁最划算**——这些人生级大问题，摊成可计算的表格再说。

![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ 这是什么

面向**被动离职 / 协商解除 / 灵活就业**的中年规划场景，把官方文件里那些绕来绕去的算法和门槛，翻译成"输入个人档案 → 给出 4 套对比方案 + 时间线 + 风险提示"的浏览器小工具。

**纯前端 SPA，零后端零账号，LocalStorage 自留数据。** 关掉浏览器，数字还在你电脑里；不联网，也跑得动。

## 🎯 核心特性

| 模块 | 干啥用 |
|---|---|
| **退休养老金预测** | 按基础养老金 + 个人账户养老金两段式公式，输出退休首月养老金及 80 岁累计领取总额 |
| **4 套社保策略对比** | 完全断缴 · 灵活就业最低档自缴 · 失业金 + 4050 组合（推荐） · 灵活就业 100% 基数自缴 |
| **回本年限 / 净成本** | 算清楚"投多少、领多少、几年回本"，Infinity 显式表达"回不了本" |
| **延迟退休联动** | 输入出生年月自动推算渐进式延迟退休的目标年龄（男 / 女 / 女干部三档） |
| **实操路线图** | 输出按月的时间线 + 政策申请指引，告诉用户先去办失业登记还是先去领补贴 |
| **多城市政策** | 按所选城市社平工资、缴费基数上下限、失业金标准、补贴比例、医保最低年限分别核算 |
| **静态口径开关** | 一键把所有"社平增长率 / 养老金调增率 / 账户记账利率"按 0 算，方便对比官方演示表 |

## 🧮 算法可靠性

这是这个工具**最较真的部分**——所有金额都能反查到红头文件：

| 关键计算 | 文件依据 |
|---|---|
| 基本养老金公式 `社平 × (1+指数)/2 × 年限 × 1%` | 《社会保险法》第十六条 |
| 个人账户计发月数表（40-70 周岁） | 国办发〔2005〕38 号附表 |
| 失业保险金最长 24 个月、领取条件 | 《社会保险法》第四十五条 |
| 上海"4050"大龄社保补贴比例 50%、最长月数 | 沪人社规〔2022〕8 号 |
| 灵活就业缴费率 养老 20% / 医保 11% | 上海灵活就业人员参保政策 |
| 渐进式延迟退休目标年龄 | 全国人大常委会 2025 年决定 |

> ⚠️ 医保费率阶段性降费文件（沪医保规〔2025〕2 号）已 2026-02-28 到期；补贴政策（沪人社规〔2022〕8 号）有效期至 2026-12-31。**到期前请查阅最新官方文件，或在 `src/config/cities.ts` 校验**。

## 🛠 技术栈

- **构建**：Vite 5 + TypeScript 5
- **UI**：React 18 · Tailwind CSS · Lucide React
- **图表**：Recharts（现金流、方案对比）
- **测试**：Vitest（覆盖 `pension` / `policy` / `delayedRetirement` 三大引擎）
- **部署**：Netlify SPA（`dist/` 输出，全路径重写到 `index.html`）
- **引擎-视图分离**：`src/engine/` 精算逻辑与 `src/components/` UI 严格分层，便于未来移植到微信小程序

## 🚀 快速开始

```bash
# 依赖
npm install

# 开发模式（默认 http://localhost:5173）
npm run dev

# 单元测试
npm run test

# 生产构建（输出到 dist/）
npm run build

# 本地预览构建产物
npm run preview
```

要求 **Node 20+**（与 `netlify.toml` 中 `NODE_VERSION = "20"` 一致）。

## 📁 目录结构

```
src/
├── App.tsx                  # 主入口，串起所有面板与本地存储
├── main.tsx                 # React 挂载点
├── index.css                # Tailwind 入口
├── config/
│   └── cities.ts            # 城市政策参数表（社平/缴费率/补贴/失业金）
├── engine/                  # ★ 精算引擎（与 UI 严格分离）
│   ├── pension.ts           # 基本养老金 + 个人账户养老金 + 最低 15 年判定
│   ├── policy.ts            # 4 套策略对比 + 现金流时间线
│   ├── delayedRetirement.ts # 渐进式延迟退休目标年龄推算
│   └── *.test.ts            # 对应单测
├── components/
│   ├── InputsPanel.tsx      # 左侧输入面板（含场景化默认值）
│   ├── KPICards.tsx         # 顶部关键指标卡
│   ├── StrategyTable.tsx    # 4 套策略对比表
│   ├── CashFlowChart.tsx    # 累计现金流图
│   ├── PensionSplit.tsx     # 基础/个人账户拆分
│   ├── ActionPlan.tsx       # 实操时间线
│   └── ProfileManager.tsx   # 多档案存档 / 加载 / 清空
└── types/
    └── index.ts             # CityPolicy / UserInputs / StrategyResult 类型

docs/
├── superpowers/
│   ├── specs/2026-09-04-pension-calculator-design.md   # 系统设计文档
│   └── plans/                                         # 实施计划与改进清单
└── why-medical-insurance-matters.md                   # 医保为什么必须出现在工具里
```

## 🧪 测试

```bash
npm run test         # 一次性跑全部用例（CI 友好）
```

测试覆盖三个核心引擎：

- **pension.test.ts** — 养老金计算 + 15 年最低门槛 + 计发月数边界
- **policy.test.ts** — 4 套策略净成本 + 4050 补贴资格判定
- **delayedRetirement.test.ts** — 渐进式延迟退休目标年龄（男 / 女 / 女干部）

UI 组件未覆盖单测（纯展示层），靠手动 + 浏览器 LocalStorage 验证。

## 🌐 部署

项目已配置 `netlify.toml`，标准 SPA 重定向：

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

推送到 GitHub 后，在 Netlify 面板直接 **"Add new site → Import existing project"**，授权仓库、保持默认设置即可。

## 🔒 隐私

- **零外发请求**：不向任何后端发送用户输入
- **本地存储**：所有档案、试算参数仅写入浏览器 LocalStorage
- **离线可用**：构建产物是纯静态资源，断网后照常计算

如果你在公共设备上使用，离开前请点 **"清空本地数据"**。

## 📚 延伸阅读

- 📐 [系统设计文档](docs/superpowers/specs/2026-09-04-pension-calculator-design.md) — 设计意图、数据模型、策略推导
- 🩺 [医保为什么必须出现在工具里](docs/why-medical-insurance-matters.md) — 养老与医保的法定分账与三条独立门槛
- 📋 [实施计划与改进清单](docs/superpowers/plans/) — 迭代路线

## 🤝 贡献

欢迎 PR / Issue，但**在动算法前请先看一眼**：

1. 算法改动必须带上政策依据文件号（例：`沪人社规〔2022〕8 号 第二条`）
2. 新增城市：在 `src/config/cities.ts` 加完整 `CityPolicy`，并在 `policy.test.ts` 加对应 case
3. 行为非兼容改动前先开 issue 讨论

## ⚖️ 免责声明

本工具输出仅供参考，不构成任何法律、税务或投资建议。

社保政策时效性强、地区差异大，实际办理请以**当地人社局 / 医保局官方口径**为准。

## 📄 License

[MIT](LICENSE) — 想换个 license 改 `LICENSE` 文件即可。
