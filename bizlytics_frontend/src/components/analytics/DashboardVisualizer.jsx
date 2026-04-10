import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const DashboardVisualizer = ({ data, type, title }) => {
  const chartType = type?.toLowerCase() || 'bar';

  // Normalize data keys (Handle ANY variation from AI or Backend)
  const processedData = React.useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    
    return data.map(item => {
      // 1. Try to find a label (first string-like key)
      let label = item.label || item.name || item.category || item.type;
      
      // 2. Try to find a value (first numeric key)
      let value = item.value !== undefined ? item.value : (item.count !== undefined ? item.count : item.total);

      // 3. AGNOSTIC SEARCH: If still missing, pick the first string and first number
      if (!label || value === undefined) {
        const keys = Object.keys(item);
        if (!label) label = item[keys.find(k => typeof item[k] === 'string')] || 'Metric';
        if (value === undefined) value = item[keys.find(k => typeof item[k] === 'number')] || 0;
      }

      return { label: String(label), value: Number(value) };
    });
  }, [data]);

  if (chartType === 'kpi') {
    const value = processedData?.[0]?.value;
    const formattedValue = typeof value === 'number' ? 
      (value > 1000 ? `$${(value/1000).toFixed(1)}k` : value.toLocaleString(undefined, {maximumFractionDigits: 2})) : value;

    return (
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-center items-center text-center h-[180px]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{title}</span>
        <h2 className="text-3xl font-black text-indigo-600 tracking-tight">{formattedValue}</h2>
        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
           <span>+12.5%</span> 
           <span className="text-emerald-300">vs prev</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6 transition-all hover:shadow-md">
      <h3 className="text-sm font-bold uppercase tracking-widest text-[#1e293b] mb-4 border-l-4 border-indigo-500 pl-3">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" />
              <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => v.toLocaleString(undefined, {maximumFractionDigits: 1})} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}} 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} 
                formatter={(v, name) => [v.toLocaleString(undefined, {maximumFractionDigits: 2}), name]}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" />
              <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => v.toLocaleString(undefined, {maximumFractionDigits: 1})} />
              <Tooltip 
                contentStyle={{borderRadius: '8px', border: 'none'}} 
                formatter={(v, name) => [v.toLocaleString(undefined, {maximumFractionDigits: 2}), name]}
              />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
            </LineChart>
          ) : chartType === 'area' ? (
            <AreaChart data={processedData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" />
              <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => v.toLocaleString(undefined, {maximumFractionDigits: 1})} />
              <Tooltip formatter={(v, name) => [v.toLocaleString(undefined, {maximumFractionDigits: 2}), name]} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
            </AreaChart>
          ) : chartType === 'donut' ? (
            <PieChart>
              <Pie 
                data={processedData} 
                dataKey="value" 
                nameKey="label" 
                cx="50%" 
                cy="50%" 
                innerRadius={60} 
                outerRadius={80} 
                paddingAngle={5} 
                label={({ label, value }) => `${label}: ${value.toLocaleString(undefined, {maximumFractionDigits: 1})}`}
              >
                {processedData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, name) => [v.toLocaleString(undefined, {maximumFractionDigits: 2}), name]} />
            </PieChart>
          ) : (
            <PieChart>
              <Pie 
                data={processedData} 
                dataKey="value" 
                nameKey="label" 
                cx="50%" 
                cy="50%" 
                outerRadius={80} 
                label={({ label, value }) => `${label}: ${value.toLocaleString(undefined, {maximumFractionDigits: 1})}`}
              >
                {processedData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, name) => [v.toLocaleString(undefined, {maximumFractionDigits: 2}), name]} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardVisualizer;
