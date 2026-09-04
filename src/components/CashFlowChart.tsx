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

const SHORT_NAMES: Record<string, string> = {
  stop: '方案一：完全断缴',
  min_self: '方案二：60%最低自缴',
  unemployment_4050: '方案三：失业金+补贴(推荐)',
  full_self: '方案四：100%满额自缴',
};

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ strategies }) => {
  const chartData = strategies.map((s) => ({
    name: SHORT_NAMES[s.id] || s.name,
    '净投入成本 (万元)': Number((s.netCost / 10000).toFixed(1)),
    '80岁累计收益 (万元)': Number((s.totalReceivedAt80 / 10000).toFixed(1)),
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-base">各方案净投入成本 vs 80岁累计收益 (单位：万元)</h3>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} interval={0} height={35} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} unit="万" />
            <Tooltip formatter={(value: any) => [`${value} 万元`, '']} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Bar dataKey="净投入成本 (万元)" fill="#F43F5E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="80岁累计收益 (万元)" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
