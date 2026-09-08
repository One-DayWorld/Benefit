/** 失业保险金档次：领取到第 throughMonth 个月为止，每月发放 monthly 元 */
export interface UnemploymentBenefitTier {
  throughMonth: number;
  monthly: number;
}

export interface CityPolicy {
  cityId: string;
  cityName: string;
  avgSalary: number;            // 社平月工资 (全口径城镇单位就业人员平均工资)
  baseMin: number;              // 缴费基数下限 (应为社平 60%)
  baseMax: number;              // 缴费基数上限 (应为社平 300%)
  medicalMinYearsMale: number;  // 退休享受职工医保待遇的最低累计缴费年限 (男)
  medicalMinYearsFemale: number;// 退休享受职工医保待遇的最低累计缴费年限 (女)

  /**
   * 失业保险金按"已领取月份"递减的档次表，须按 throughMonth 升序排列。
   * 上海为 1-12 月全额、13-24 月 80%、延长期按低保线。
   */
  unemploymentBenefitTiers: UnemploymentBenefitTier[];
  /** 每满 1 年缴费年限可领的失业金月数 (上海为 2，多数城市为 3) */
  unemploymentMonthsPerPaidYear: number;
  /** 一次核定的失业金最长领取月数 (法定上限 24) */
  unemploymentMaxMonths: number;

  /** 灵活就业养老保险缴费比例 (自缴全额，无单位分担) */
  flexiblePensionRate: number;
  /** 灵活就业养老缴费计入个人账户的比例 */
  flexiblePensionAccountRate: number;
  /** 灵活就业职工医保缴费比例 */
  flexibleMedicalRate: number;

  /**
   * 企业职工**个人**养老缴费比例 (全额计入个人账户)。
   * 与 flexiblePensionAccountRate 数值常同为 8%，但口径不同：前者是在职期间从工资
   * 代扣的个人部分(单位另缴 16% 进统筹，不进个人账户)，后者是灵活就业自缴总额中
   * 划入个人账户的部分。用于测算"数据基准月至离职"这段在职期的个人账户增长。
   */
  employeePensionAccountRate: number;

  /** 大龄社保补贴返还比例 */
  subsidyRatio: number;
  /** 同一人可享大龄社保补贴的累计最长月数 */
  subsidyMaxMonths: number;
  /** "就业困难人员"认定中的大龄年龄门槛 (上海为男 45 / 女 40) */
  olderWorkerAgeMale: number;
  olderWorkerAgeFemale: number;
  /** 距法定退休年龄不足几年可将补贴延长至退休 */
  subsidyBridgeYearsBeforeRetirement: number;
  /** 认定"就业困难人员"要求的连续失业月数门槛 */
  subsidyMinUnemployedMonths: number;
  /** 大龄社保补贴政策的有效期截止 (YYYY-MM-DD)，到期后需重新核实 */
  subsidyPolicyExpiry?: string;

  /** 数据年度与来源，用于标注可信度 */
  dataVintage?: string;
}

export interface UserInputs {
  profileName?: string;            // 档案别名 (如 "张三 (北京)")
  gender: 'male' | 'female';
  isFemaleCadre?: boolean;         // 女干部/管理技术岗位
  birthYearMonth: string;          // 出生年月 YYYY-MM
  resignYearMonth: string;         // 计划离职年月 YYYY-MM
  /**
   * 存量数据基准年月 YYYY-MM (未填则取当前月)。
   *
   * paidMonths / medicalPaidMonths / personalAccountBalance / 城市社平工资
   * 都是**截至某个时点**的存量值，该时点即本字段，而非离职当月。
   * 二者必须分开：退休时点由出生年月与 retireAge 固定，与离职时点无关；
   * 若把存量数据的基准时点误当成离职时点，推迟离职就会被系统性低估
   * (社平少涨几个月、个人账户少滚几个月、在职续缴的月份凭空消失)。
   */
  dataAsOfYearMonth?: string;
  /**
   * 离职性质。决定是否有资格申领失业保险金：
   * involuntary = 被动离职 (裁员/协商解除/合同到期不续签) → 可申领
   * voluntary   = 主动辞职 → 依《社会保险法》第四十五条通常不可申领
   */
  separationType: 'involuntary' | 'voluntary';
  retireAge: number;               // 预期退休年龄
  paidMonths: number;              // 养老已累计缴费月数
  medicalPaidMonths?: number;      // 职工医保已累计缴费月数 (未填则以养老月数近似)
  personalAccountBalance: number;  // 个人账户累计储存额 (元)
  avgPayIndex: number;             // 历史平均缴费指数 (0.6 - 3.0)
  lastMonthlySalary?: number;      // 离职前最近月薪 (辅助估算)
  cityId: string;                  // 选择的城市 ID
  customAvgSalary?: number;        // 自定义社平工资
  futureSalaryGrowthRate: number;  // 未来社平工资年增长率
  pensionIndexationRate?: number;  // 退休后养老金年均调增率 (默认 2%)
  /**
   * 个人账户记账利率 (默认 3%)。人社部每年统一公布，近年区间约 2%~4%。
   * 三项增长假设中唯一一项过去被硬编码，现已同样开放为可调参数。
   */
  personalAccountInterestRate?: number;
  /**
   * 静态口径：把三项增长假设一律按 0 计算 ——
   * 未来社平工资年化增长率、退休后养老金年均调增率、个人账户记账利率。
   * 等价于把三个滑块都手动拉到 0，只是勾选后原值仍保留、取消即恢复。
   *
   * 用途：默认口径给出的是退休那一年的**名义金额**，含十几年社平增长复利，
   * 无法与当下的工资、物价或各类"退休金演示表"直接比较。勾选后所有金额都以
   * 当前社平工资为基准，可与官方演示表逐格对照，也便于判断方案之间的相对优劣。
   */
  staticBasis?: boolean;
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
  retireMonthlyPension: number;    // 退休首月养老金 (不满足15年时为 0)
  /**
   * 基础养老金部分 = 社平月工资 × (1+平均缴费指数)/2 × 缴费年限 × 1%。
   * 由统筹基金支付，与缴费年限、缴费指数挂钩，且随每年养老金调增而增长。
   */
  retireBasicPension: number;
  /**
   * 个人账户养老金部分 = 个人账户累计储存额 ÷ 计发月数。
   * 与账户余额挂钩；账户领完后仍由统筹基金按同标准继续发放。
   */
  retirePersonalPension: number;
  breakEvenYears: number;          // 回本所需年限 (Infinity 表示无法回本)
  totalReceivedAt80: number;       // 80岁累计领取的养老金 (含年度调增)
  isPensionEligible: boolean;      // 是否满足按月领取养老金的最低缴费年限
  warnings: string[];              // 法定门槛与政策资格提示
  timeline: TimelineStep[];
}
