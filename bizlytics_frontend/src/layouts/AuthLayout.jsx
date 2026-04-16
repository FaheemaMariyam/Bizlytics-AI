import React from 'react';
import { Activity, Sparkles, Database, BarChart3 } from 'lucide-react';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex bg-[#0a0a0f] overflow-hidden selection:bg-violet-500 selection:text-white">
      {/* Left Panel - Hidden on mobile, shows premium dark aesthetic on desktop */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-[#08080d] border-r border-white/5">
        {/* Animated Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[120px]" />
        
        {/* Abstract Pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '30px 30px'
        }} />

        <div className="relative z-10 w-full flex flex-col justify-between px-16 py-16 text-white text-left h-full">
          <div>
            <div className="flex items-center space-x-3 mb-24 cursor-pointer" onClick={() => window.location.href = '/'}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Activity size={18} className="text-white" />
              </div>
              <span className="text-xl font-black tracking-tight">Bizlytics</span>
              <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-widest">AI</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-black mb-8 leading-[1.1] tracking-tight">
              Intelligence <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400">
                reimagined
              </span> for business.
            </h1>
            <p className="text-lg text-gray-400 max-w-sm font-medium leading-relaxed">
              Connect your data sources once. Ask questions forever. Bizlytics uses agentic AI to transform raw spreadsheets into enterprise-grade insights instantly.
            </p>
          </div>
          
          <div className="space-y-8">
            <div className="flex items-center gap-4 group cursor-default">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/10 transition-colors">
                    <Database size={18} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white">Universal Data Processing</h4>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Automated cleaning & classification for any data source.</p>
                </div>
            </div>
            <div className="flex items-center gap-4 group cursor-default">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/10 transition-colors">
                    <BarChart3 size={18} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white">Agentic Dashboards</h4>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Real-time aggregation with sub-second latency.</p>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Container */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20 xl:px-32 relative bg-[#0a0a0f]">
        {/* Glow behind the form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-600/5 blur-[100px] pointer-events-none" />

        <div className="mx-auto w-full max-w-md relative">
          {/* Mobile Logo Logo */}
          <div className="flex items-center lg:hidden mb-12 cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mr-3">
              <Activity size={18} className="text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">Bizlytics</span>
          </div>
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-4xl font-black tracking-tight text-white leading-tight">
              {title}
            </h2>
            {subtitle && (
              <div className="mt-4 text-gray-500 font-medium">
                {subtitle}
              </div>
            )}
          </div>

          <div className="relative group">
            <div className="absolute -inset-px bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-[1px]" />
            <div className="relative bg-[#12121a]/50 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8 shadow-2xl">
              {children}
            </div>
          </div>

          <div className="mt-10 text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest">
            Bizlytics Enterprise Analytics Platform &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
