import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend } from 'recharts';

// Premium high-contrast palette
const COLORS = [
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#d946ef', // Fuchsia
  '#84cc16', // Lime
];

// Smart number formatter
const formatValue = (v) => {
  if (v === null || v === undefined) return '0';
  const num = Number(v);
  if (isNaN(num)) return String(v);
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// Smart currency formatter
const formatCurrency = (v) => {
  const num = Number(v);
  if (isNaN(num)) return String(v);
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}k`;
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

// Custom tooltip for all charts - Premium Dark Glassmorphism
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-[11px] font-bold text-gray-300">{item.name}</span>
            </div>
            <span className="text-[11px] font-black text-white">{formatValue(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Custom Legend for Pie/Donut charts
const CustomPieLegend = ({ payload }) => {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// Truncate long labels
const truncateLabel = (label, maxLen = 12) => {
  if (!label) return '';
  const str = String(label);
  if (/^\d{4}-\d{2}/.test(str)) {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
  }
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
};

const DashboardVisualizer = ({ data, type, title }) => {
  const chartType = type?.toLowerCase() || 'bar';

  const { processedData, seriesKeys } = React.useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { processedData: [], seriesKeys: ['value'] };
    
    const allNumericKeys = new Set();
    data.forEach(item => {
        Object.keys(item).forEach(k => {
            if (typeof item[k] === 'number') allNumericKeys.add(k);
        });
    });

    if (allNumericKeys.size > 1 && Array.from(allNumericKeys).some(k => !['value', 'count', 'total'].includes(k))) {
        ['value', 'count', 'total'].forEach(k => allNumericKeys.delete(k));
    }

    const seriesKeysList = allNumericKeys.size > 0 ? Array.from(allNumericKeys) : ['value'];

    const mappedData = data.map(item => {
      let label = item.label || item.name || item.category || item.type || item.month || item.date;
      if (!label) {
          const keys = Object.keys(item);
          label = item[keys.find(k => typeof item[k] === 'string')] || 'Metric';
      }

      const result = { label: String(label) };
      
      if (seriesKeysList.length === 1 && seriesKeysList[0] === 'value') {
          let val = item.value !== undefined ? item.value : (item.count !== undefined ? item.count : item.total);
          if (val === undefined) {
             const keys = Object.keys(item);
             val = item[keys.find(k => typeof item[k] === 'number')] || 0;
          }
          result.value = Number(val);
      } else {
          seriesKeysList.forEach(k => {
             result[k] = item[k] !== undefined ? Number(item[k]) : 0;
          });
      }
      return result;
    });

    return { processedData: mappedData, seriesKeys: seriesKeysList };
  }, [data]);

  if (chartType === 'kpi') {
    const value = processedData?.[0]?.value || processedData?.[0]?.[seriesKeys[0]];
    const isCurrency = title?.toLowerCase().includes('revenue') || title?.toLowerCase().includes('salary') || title?.toLowerCase().includes('order value') || title?.toLowerCase().includes('profit');
    const formattedValue = typeof value === 'number' ? (isCurrency ? formatCurrency(value) : formatValue(value)) : value;

    return (
      <div className="group relative bg-[#12121a]/50 border border-white/[0.05] p-6 rounded-3xl transition-all duration-300 hover:border-violet-500/30 hover:bg-violet-500/5 flex flex-col justify-center h-[200px] overflow-hidden">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-600/10 rounded-full blur-2xl group-hover:bg-violet-600/20 transition-all" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 group-hover:text-violet-400 transition-colors">{title}</span>
        <h2 className="text-4xl font-black text-white tracking-tight leading-none">{formattedValue}</h2>
        <div className="mt-4 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-500 uppercase">Live Data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#12121a]/30 backdrop-blur-sm border border-white/[0.06] p-8 rounded-[2rem] transition-all duration-500 hover:border-white/10 h-full flex flex-col group">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 border-l-[3px] border-violet-500 pl-4 py-1 leading-none group-hover:text-white transition-colors">{title}</h3>
        <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' || chartType === 'stacked-bar' ? (
            <BarChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="label" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} stroke="#4b5563" dy={15} tickFormatter={(v) => truncateLabel(v)} />
              <YAxis fontSize={10} fontWeight={700} tickLine={false} axisLine={false} stroke="#4b5563" tickFormatter={(v) => formatValue(v)} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} content={<CustomTooltip />} />
              {seriesKeys.map((key, index) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  stackId={seriesKeys.length > 1 || chartType === 'stacked-bar' ? "a" : undefined} 
                  fill={COLORS[index % COLORS.length]} 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                />
              ))}
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="label" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} stroke="#4b5563" dy={15} tickFormatter={(v) => truncateLabel(v)} />
              <YAxis fontSize={10} fontWeight={700} tickLine={false} axisLine={false} stroke="#4b5563" tickFormatter={(v) => formatValue(v)} />
              <Tooltip content={<CustomTooltip />} />
              {seriesKeys.map((key, index) => (
                <Line 
                    key={key} 
                    type="monotone" 
                    dataKey={key} 
                    stroke={COLORS[index % COLORS.length]} 
                    strokeWidth={4} 
                    dot={{ r: 4, strokeWidth: 2, fill: '#12121a' }} 
                    activeDot={{ r: 6, strokeWidth: 0 }} 
                />
              ))}
            </LineChart>
          ) : chartType === 'area' || chartType === 'stacked-area' ? (
            <AreaChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {seriesKeys.map((key, index) => (
                  <linearGradient key={`grad-${key}`} id={`color-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="label" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} stroke="#4b5563" dy={15} tickFormatter={(v) => truncateLabel(v)} />
              <YAxis fontSize={10} fontWeight={700} tickLine={false} axisLine={false} stroke="#4b5563" tickFormatter={(v) => formatValue(v)} />
              <Tooltip content={<CustomTooltip />} />
              {seriesKeys.map((key, index) => (
                <Area 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stackId={seriesKeys.length > 1 || chartType === 'stacked-area' ? "a" : undefined}
                  stroke={COLORS[index % COLORS.length]} 
                  fillOpacity={1} 
                  fill={`url(#color-${index})`} 
                  strokeWidth={3} 
                />
              ))}
            </AreaChart>
          ) : chartType === 'donut' ? (
            <PieChart>
              <Pie 
                data={processedData} 
                dataKey={seriesKeys[0]} 
                nameKey="label" 
                cx="50%" 
                cy="45%" 
                innerRadius={70} 
                outerRadius={100} 
                paddingAngle={6} 
                stroke="none"
              >
                {processedData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomPieLegend />} verticalAlign="bottom" />
            </PieChart>
          ) : (
            <PieChart>
              <Pie 
                data={processedData} 
                dataKey={seriesKeys[0]} 
                nameKey="label" 
                cx="50%" 
                cy="45%" 
                outerRadius={100} 
                stroke="none"
              >
                {processedData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomPieLegend />} verticalAlign="bottom" />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardVisualizer;
