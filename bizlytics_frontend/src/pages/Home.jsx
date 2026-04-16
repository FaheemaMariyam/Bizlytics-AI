import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart2, Shield, Zap, MessageSquare, ArrowRight, LayoutDashboard, TrendingUp, Database, Brain, ChevronRight, Activity, PieChart, Layers } from 'lucide-react';
import useAuth from '../hooks/useAuth';

const Home = () => {
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (user?.role === 'admin') return '/admin/dashboard';
    if (user?.role === 'company') return '/company/dashboard';
    if (user?.role === 'hr') return '/hr/dashboard';
    return '/dashboard';
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animated counter hook
  const AnimatedNumber = ({ target, prefix = '', suffix = '' }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      let start = 0;
      const duration = 2000;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        setCount(Math.floor(progress * target));
        if (progress < 1) requestAnimationFrame(step);
      };
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) requestAnimationFrame(step);
      }, { threshold: 0.5 });
      const el = document.getElementById(`stat-${target}`);
      if (el) observer.observe(el);
      return () => observer.disconnect();
    }, [target]);
    return <span id={`stat-${target}`}>{prefix}{count.toLocaleString()}{suffix}</span>;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] font-sans selection:bg-violet-500 selection:text-white overflow-x-hidden">
      
      {/* ═══ NAVIGATION ═══ */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2.5 no-underline group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
              <Activity size={18} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">Bizlytics</span>
            <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-widest hidden sm:inline">AI</span>
          </Link>

          <div className="flex items-center gap-4">
            {!loading && isAuthenticated ? (
              <button 
                onClick={() => navigate(getDashboardPath())}
                className="px-5 py-2.5 rounded-full font-bold text-sm bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-2"
              >
                <LayoutDashboard size={15} />
                Go to Dashboard
              </button>
            ) : (
              <>
                <Link to="/login" className="font-semibold text-sm text-gray-400 hover:text-white transition-colors no-underline hidden sm:block">
                  Sign In
                </Link>
                <Link to="/register" className="px-5 py-2.5 rounded-full font-bold text-sm bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all no-underline flex items-center gap-2">
                  Get Started <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative pt-36 pb-12 lg:pt-44 lg:pb-16 overflow-hidden">
        {/* Ambient glow effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-cyan-500/8 blur-[100px]" />
          <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[80px]" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center gap-16 lg:gap-12">
          {/* Left: Copy */}
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-violet-300 mb-8 tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              POWERED BY AI ANALYTICS ENGINE
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-[68px] font-black text-white tracking-tight leading-[1.05] mb-7">
              Turn the data into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400">
                actionable intelligence
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 font-medium mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Upload any dataset. Ask questions in natural language. Get instant dashboards with KPIs, trends, and distributions — all in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              {!loading && isAuthenticated ? (
                <button 
                  onClick={() => navigate(getDashboardPath())}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-2xl font-black text-lg hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-all flex items-center justify-center gap-3 group"
                >
                  <LayoutDashboard size={22} /> Open Dashboard 
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <>
                  <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-2xl font-black text-lg hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-all flex items-center justify-center gap-2 group no-underline">
                    Start Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all text-center no-underline">
                    Sign into Workspace
                  </Link>
                </>
              )}
            </div>

          </div>

          {/* Right: Live Dashboard Mockup */}
          <div className="w-full lg:w-1/2 relative">
            <div className="relative bg-[#12121a] border border-white/[0.06] rounded-3xl p-1 shadow-2xl shadow-violet-500/5 overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-5 bg-white/5 rounded-lg max-w-[200px] mx-auto flex items-center justify-center">
                    <span className="text-[10px] text-gray-500 font-medium">bizlytics.ai/dashboard</span>
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-4 space-y-3">
                {/* KPI Row */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Revenue', value: '$5.02M', change: '+12.4%', color: 'violet' },
                    { label: 'Orders', value: '1,000', change: '+8.2%', color: 'cyan' },
                    { label: 'Avg Order', value: '$5,019', change: '+3.1%', color: 'emerald' },
                  ].map((kpi, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                      <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">{kpi.label}</p>
                      <p className="text-sm font-black text-white mt-1">{kpi.value}</p>
                      <p className={`text-[9px] font-bold text-emerald-400 mt-0.5`}>{kpi.change}</p>
                    </div>
                  ))}
                </div>

                {/* Chart area */}
                <div className="grid grid-cols-5 gap-2">
                  {/* Area chart mockup */}
                  <div className="col-span-3 bg-white/[0.03] border border-white/5 rounded-xl p-3 h-[120px] relative overflow-hidden">
                    <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider mb-2">Revenue Trend</p>
                    <svg className="w-full h-[80px]" viewBox="0 0 200 60" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path d="M0 50 Q20 45 40 35 T80 25 T120 30 T160 15 T200 20 V60 H0Z" fill="url(#areaGrad)" />
                      <path d="M0 50 Q20 45 40 35 T80 25 T120 30 T160 15 T200 20" fill="none" stroke="#8b5cf6" strokeWidth="2" />
                    </svg>
                  </div>

                  {/* Donut chart mockup */}
                  <div className="col-span-2 bg-white/[0.03] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                    <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider mb-2">Channels</p>
                    <svg width="60" height="60" viewBox="0 0 60 60">
                      <circle cx="30" cy="30" r="22" fill="none" stroke="#8b5cf6" strokeWidth="6" strokeDasharray="70 69" transform="rotate(-90 30 30)" />
                      <circle cx="30" cy="30" r="22" fill="none" stroke="#06b6d4" strokeWidth="6" strokeDasharray="68 71" strokeDashoffset="-70" transform="rotate(-90 30 30)" />
                    </svg>
                    <div className="flex gap-3 mt-2">
                      <span className="text-[8px] text-gray-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" />Retail</span>
                      <span className="text-[8px] text-gray-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />Online</span>
                    </div>
                  </div>
                </div>

                {/* Bar chart row */}
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 h-[70px] relative">
                  <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider mb-2">Top Regions</p>
                  <div className="flex items-end gap-1.5 h-[35px]">
                    {[85, 72, 68, 60].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          style={{ height: `${h}%` }} 
                          className={`w-full rounded-t-sm ${i === 0 ? 'bg-gradient-to-t from-violet-600 to-violet-400' : 'bg-white/10'}`} 
                        />
                        <span className="text-[7px] text-gray-600">{['N', 'E', 'W', 'S'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Glow behind the mockup */}
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 blur-3xl -z-10 rounded-3xl" />
          </div>
        </div>
      </section>


      {/* ═══ FEATURES ═══ */}
      <section className="pt-8 pb-28 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[50%] left-[5%] w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-cyan-400 mb-6 tracking-wide">
              <Layers size={12} /> PLATFORM CAPABILITIES
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-5">
              Everything you need to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                scale analytics
              </span>
            </h2>
            <p className="text-gray-400 font-medium text-lg">From raw CSV to executive dashboards in under 60 seconds. No code. No setup. Just insights.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Brain size={28} />,
                title: 'AI-First Analytics',
                desc: 'Ask questions in plain English. Our LangGraph-powered agent writes SQL, aggregates data, and builds multi-chart dashboards automatically.',
                gradient: 'from-violet-500/20 to-violet-500/0',
                iconBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                tag: 'AGENTIC AI'
              },
              {
                icon: <Zap size={28} />,
                title: 'Sub-Second Processing',
                desc: 'Powered by DuckDB columnar engine with pre-computed aggregations. Millions of rows processed in milliseconds, not minutes.',
                gradient: 'from-cyan-500/20 to-cyan-500/0',
                iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                tag: 'DUCKDB ENGINE'
              },
              {
                icon: <Shield size={28} />,
                title: 'Enterprise Isolation',
                desc: 'Every company gets its own isolated database file. Row-level security, per-tenant schema isolation, and encrypted S3 storage.',
                gradient: 'from-emerald-500/20 to-emerald-500/0',
                iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                tag: 'MULTI-TENANT'
              }
            ].map((feat, i) => (
              <div key={i} className="group relative bg-[#12121a] border border-white/[0.06] rounded-3xl p-8 hover:border-white/[0.12] transition-all duration-500 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-b ${feat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl ${feat.iconBg} border flex items-center justify-center`}>
                      {feat.icon}
                    </div>
                    <span className="text-[9px] font-bold tracking-widest text-gray-600 bg-white/[0.03] px-2 py-1 rounded-full border border-white/5">{feat.tag}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feat.title}</h3>
                  <p className="text-gray-400 leading-relaxed font-medium text-[15px]">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-24 relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-5">
              Three steps to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">insights</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload Dataset', desc: 'Drag & drop any CSV, XLSX, or JSON file. Our ETL pipeline auto-cleans, classifies, and loads it.', icon: <Database size={24} /> },
              { step: '02', title: 'Ask or Explore', desc: 'Chat with the AI to ask specific questions, or click "Generate Dashboard" for a full executive overview.', icon: <MessageSquare size={24} /> },
              { step: '03', title: 'Get Insights', desc: 'KPI cards, trend lines, distributions, and cross-dimensional breakdowns — all auto-generated.', icon: <TrendingUp size={24} /> },
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="bg-[#12121a] border border-white/[0.06] rounded-3xl p-8 hover:border-white/10 transition-all h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-5xl font-black text-white/[0.04] group-hover:text-violet-500/10 transition-colors">{item.step}</span>
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                </div>
                {i < 2 && (
                  <ChevronRight size={20} className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 text-gray-700 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className="py-24 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-[20%] w-[600px] h-[400px] rounded-full bg-violet-600/10 blur-[150px]" />
          <div className="absolute bottom-0 right-[20%] w-[500px] h-[350px] rounded-full bg-cyan-500/8 blur-[120px]" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-6 md:px-12 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
            Ready to unlock your data?
          </h2>
          <p className="text-xl text-gray-400 font-medium mb-10 max-w-2xl mx-auto">
            Stop spending hours building manual reports. Let BizlyticsAI do it in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!loading && isAuthenticated ? (
              <button 
                onClick={() => navigate(getDashboardPath())}
                className="px-10 py-5 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-2xl font-black text-lg hover:shadow-[0_0_60px_rgba(139,92,246,0.4)] transition-all flex items-center gap-3 group"
              >
                Open Dashboard <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <>
                <Link to="/register" className="px-10 py-5 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-2xl font-black text-lg hover:shadow-[0_0_60px_rgba(139,92,246,0.4)] transition-all flex items-center gap-3 group no-underline">
                  Start Analyzing Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/login" className="px-10 py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all no-underline">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 bg-[#08080d]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Activity size={14} className="text-white" />
            </div>
            <span className="text-lg font-black text-white tracking-tight">Bizlytics</span>
          </Link>
          <div className="flex gap-8 text-sm font-medium">
            <Link to="/" className="text-gray-500 hover:text-gray-300 transition-colors no-underline">Privacy</Link>
            <Link to="/" className="text-gray-500 hover:text-gray-300 transition-colors no-underline">Terms</Link>
            <Link to="/" className="text-gray-500 hover:text-gray-300 transition-colors no-underline">Contact</Link>
          </div>
          <div className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} Bizlytics Inc.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
