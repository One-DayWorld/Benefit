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
