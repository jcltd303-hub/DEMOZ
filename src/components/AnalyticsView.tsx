import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { DemolitionPermit } from '../types';
import { formatCurrency } from '../services/accelaService';
import { HardHat, TrendingUp, Building, Award, Filter, DollarSign } from 'lucide-react';

interface AnalyticsViewProps {
  permits: DemolitionPermit[];
  onSelectContractor?: (contractor: string) => void;
  onSelectNeighborhood?: (neighborhood: string) => void;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  permits,
  onSelectContractor,
  onSelectNeighborhood,
}) => {
  // Aggregate by neighborhood
  const valuationData = useMemo(() => {
    const neighborhoodMap = permits.reduce((acc, p) => {
      const n = p.attributes.NEIGHBORHOOD || 'Unknown';
      acc[n] = (acc[n] || 0) + (p.attributes.VALUATION || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(neighborhoodMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [permits]);

  // Aggregate by class
  const classData = useMemo(() => {
    const classMap = permits.reduce((acc, p) => {
      const c = p.attributes.CLASS || 'Unknown';
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(classMap).map(([name, value]) => ({ name, value }));
  }, [permits]);

  // Aggregate by issue date
  const trendData = useMemo(() => {
    const trendMap = permits.reduce((acc, p) => {
      const date = p.attributes.DATE_ISSUED
        ? new Date(p.attributes.DATE_ISSUED).toISOString().slice(0, 10)
        : 'Unknown';
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(trendMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (a.name > b.name ? 1 : -1));
  }, [permits]);

  // Contractor Leaderboard Aggregation
  const contractorLeaderboard = useMemo(() => {
    const cMap: Record<
      string,
      { count: number; totalValuation: number; permits: DemolitionPermit[] }
    > = {};

    permits.forEach((p) => {
      const rawName = p.attributes.CONTRACTOR_NAME?.trim();
      const name = rawName && rawName.length > 0 ? rawName : 'Owner / Unlisted';
      if (!cMap[name]) {
        cMap[name] = { count: 0, totalValuation: 0, permits: [] };
      }
      cMap[name].count += 1;
      cMap[name].totalValuation += p.attributes.VALUATION || 0;
      cMap[name].permits.push(p);
    });

    return Object.entries(cMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalValuation: data.totalValuation,
        avgValuation: data.count > 0 ? Math.round(data.totalValuation / data.count) : 0,
      }))
      .sort((a, b) => b.count - a.count || b.totalValuation - a.totalValuation);
  }, [permits]);

  const topContractorChartData = useMemo(() => {
    return contractorLeaderboard.slice(0, 8).map((c) => ({
      name: c.name.length > 18 ? c.name.slice(0, 16) + '…' : c.name,
      fullName: c.name,
      valuation: c.totalValuation,
      count: c.count,
    }));
  }, [contractorLeaderboard]);

  const totalValuation = permits.reduce((sum, p) => sum + (p.attributes.VALUATION || 0), 0);
  const avgValuation = permits.length > 0 ? Math.round(totalValuation / permits.length) : 0;
  const maxValuation = Math.max(0, ...permits.map((p) => p.attributes.VALUATION || 0));

  return (
    <div className="space-y-6">
      {/* Quick Stat Pill Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Average Project Valuation</div>
            <div className="text-lg font-bold text-white">{formatCurrency(avgValuation)}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Highest Single Demolition</div>
            <div className="text-lg font-bold text-white">{formatCurrency(maxValuation)}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Active Contractors</div>
            <div className="text-lg font-bold text-white">
              {contractorLeaderboard.filter((c) => c.name !== 'Owner / Unlisted').length} Companies
            </div>
          </div>
        </div>
      </div>

      {/* Permits Issued Over Time */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white">
              Permits Issued Timeline
            </h3>
            <p className="text-xs text-slate-400">
              Daily frequency of demolition approvals across selected timeframe
            </p>
          </div>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickMargin={8} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px' }}
                formatter={(val: number) => [`${val} permits`, 'Demolitions']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#f59e0b' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column: Neighborhoods & Permit Class */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
            Top Neighborhoods by Total Valuation
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Demolition capital concentration by Denver neighborhood
          </p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valuationData} margin={{ top: 5, right: 15, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={10}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `$${val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${Math.round(val / 1000)}k`}`}
                />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), 'Valuation']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px' }}
                />
                <Bar
                  dataKey="value"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  onClick={(entry) => onSelectNeighborhood?.(entry.name)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
            Permits by Demolition Class
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Ratio of wrecking vs commercial/residential structures
          </p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={classData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={35}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {classData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px' }}
                  formatter={(val: number) => [`${val} permits`, 'Count']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Contractor Leaderboard Section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-base sm:text-lg font-semibold text-white">
                Contractor Leaderboard
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by total permit volume and collective demolition project valuation
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Rank</th>
                <th className="px-5 py-3">Contractor Name</th>
                <th className="px-5 py-3 text-right">Permits</th>
                <th className="px-5 py-3 text-right">Total Valuation</th>
                <th className="px-5 py-3 text-right">Avg / Project</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {contractorLeaderboard.slice(0, 15).map((contractor, idx) => (
                <tr
                  key={contractor.name}
                  className="hover:bg-slate-800/50 transition-colors group"
                >
                  <td className="px-5 py-3.5 font-bold">
                    {idx === 0 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        1
                      </span>
                    ) : idx === 1 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/30">
                        2
                      </span>
                    ) : idx === 2 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/30">
                        3
                      </span>
                    ) : (
                      <span className="text-slate-500 ml-1.5">{idx + 1}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-white flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{contractor.name}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-amber-400">
                    {contractor.count}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-emerald-400">
                    {formatCurrency(contractor.totalValuation)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-400">
                    {formatCurrency(contractor.avgValuation)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {onSelectContractor && contractor.name !== 'Owner / Unlisted' && (
                      <button
                        onClick={() => onSelectContractor(contractor.name)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 border border-slate-700 text-[11px] font-medium transition cursor-pointer flex items-center gap-1 mx-auto"
                      >
                        <Filter className="w-3 h-3" />
                        <span>Filter</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
