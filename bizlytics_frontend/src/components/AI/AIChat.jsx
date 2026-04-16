import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, BarChart2, X, Bot, User, LayoutDashboard, Sparkles, Wand2, Trash2, Maximize2, Minimize2, ChevronRight } from 'lucide-react';
import api from '../../utils/api';
import analyticsService from '../../services/analyticsService';
import toast from 'react-hot-toast';
import DashboardVisualizer from '../analytics/DashboardVisualizer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './AIChat.css';

const AIChat = () => {
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: 'Hello! I am your Bizlytics AI Analytical Engine. Upload a dataset or ask me to generate a full executive overview to get started.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [biReports, setBiReports] = useState([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isFullDashboard, setIsFullDashboard] = useState(false);
  
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedFile) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputText,
      file: selectedFile ? selectedFile.name : null
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSelectedFile(null);
    setIsLoading(true);

    try {
      if (selectedFile) {
        const uploadRes = await analyticsService.uploadFile(selectedFile);
        
        // Wait for asynchronous processing (ETL) to finish
        if (uploadRes && uploadRes.upload_id) {
          let attempts = 0;
          while (attempts < 15) {
            const files = await analyticsService.getFiles();
            const currentFile = files.find(f => f.id === uploadRes.upload_id);
            if (currentFile && currentFile.status === 'completed') {
              break; // File is ready!
            }
            if (currentFile && currentFile.status === 'failed') {
              throw new Error("File processing failed. Please check the dataset.");
            }
            // Wait 2 seconds before checking again
            await new Promise(res => setTimeout(res, 2000));
            attempts++;
          }
        }
      }

      const response = await api.post('/ai/chat', { message: userMessage.text || `Uploaded file: ${selectedFile?.name}` });
      
      let replyText = response.data.reply;
      const charts = [];
      const dashs = [];
      
      const chartRegex = /```chart\s+([\s\S]*?)\s*```/g;
      let chartMatch;
      while ((chartMatch = chartRegex.exec(replyText)) !== null) {
          try {
              charts.push(JSON.parse(chartMatch[1]));
          } catch (e) { console.error("Chart JSON parsing failed", e); }
      }

      const dashRegex = /```(?:dashboard|json)\s+([\s\S]*?)\s*```/g;
      let dashMatch;
      while ((dashMatch = dashRegex.exec(replyText)) !== null) {
          try {
              const parsed = JSON.parse(dashMatch[1]);
              if (parsed.dashboard || (parsed.title && parsed.charts)) {
                dashs.push(parsed.dashboard || parsed);
              }
          } catch (e) { }
      }

      replyText = replyText.replace(/```[\s\S]*?```/g, '').trim();

      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        text: replyText,
        charts: charts.length > 0 ? charts : null,
        dashboard: response.data.dashboard || (dashs.length > 0 ? dashs[0] : null)
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const isRateLimit = error.response?.status === 429 || 
                         error.response?.data?.detail?.toLowerCase().includes('quota') ||
                         error.message?.toLowerCase().includes('429');
      
      const errorText = isRateLimit 
        ? "AI Quota reached. Please try again in a few minutes or upgrade your plan." 
        : "I'm sorry, I encountered an error. Please try again later.";

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: errorText,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleGenerateDashboard = async (localData = null) => {
    if (localData) {
        setDashboardData(localData);
        setBiReports([]);
        setIsFullDashboard(true);
        setShowDashboard(true);
        return;
    }

    setIsLoading(true);
    try {
        const response = await api.get('/analytics/dashboard-summary');
        setDashboardData(response.data.summary);
        setBiReports(response.data.bi_reports || []);
        setIsFullDashboard(true);
        setShowDashboard(true);
    } catch (error) {
        toast.error("Could not generate dashboard charts.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-row w-full h-full relative overflow-hidden bg-[#0a0a0f] border border-white/[0.05] rounded-[2.5rem] shadow-2xl">
      {/* ─── LEFT PANE: AI CHAT SIDEBAR ─── */}
      <div className="w-[420px] shrink-0 flex flex-col h-full bg-[#08080d] border-r border-white/[0.05] z-10 relative">
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto pt-6 pb-24 scrollbar-none" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`ai-message-wrapper animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              <div className={`ai-message ${msg.type === 'ai' ? 'ai' : 'user'}`}>
                {/* Header / Avatar info */}
                <div className={`flex items-center gap-3 mb-1 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`avatar-vibrant ${msg.type === 'ai' ? 'ai' : 'user'}`}>
                    {msg.type === 'ai' ? <Bot size={18} /> : <User size={18} />}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                    {msg.type === 'ai' ? 'Bizlytics AI' : 'You'}
                  </span>
                </div>

                  {/* Bubble */}
                <div className="ai-bubble">
                  {msg.type === 'ai' ? (
                    <div className="markdown-content prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text.replace(/```dashboard[\s\S]*?```/g, '').replace(/```chart[\s\S]*?```/g, '').trim()}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="font-medium text-[15px]">{msg.text}</span>
                  )}

                  {/* Attachment Tag (Inside Bubble) */}
                  {msg.file && (
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-gray-500 uppercase tracking-widest mt-3 w-fit">
                      <Paperclip size={10} strokeWidth={3} /> {msg.file}
                    </div>
                  )}
                </div>

                {/* Actions (Outside Bubble for impact) */}
                {(msg.dashboard || /\[SUGGEST_DASHBOARD\]/i.test(msg.text)) && (
                  <button 
                    className="mt-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-[11px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-violet-600/30 transition-all flex items-center gap-2 active:scale-95 group/btn"
                    onClick={() => handleGenerateDashboard(msg.dashboard)}
                  >
                    <Wand2 size={15} className="group-hover/btn:rotate-12 transition-transform" /> 
                    <span>{msg.dashboard ? `Build ${msg.dashboard.title || 'Analysis'}` : "Generate BI Dashboard"}</span>
                  </button>
                )}

                {/* Specific Charts List */}
                {msg.charts && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.charts.map((chart, idx) => (
                      <button 
                          key={idx}
                          className="px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white hover:border-violet-500/50 transition-all flex items-center gap-2"
                          onClick={() => {
                              setDashboardData(chart.data || chart);
                              setBiReports([]);
                              setIsFullDashboard(false);
                          }}
                      >
                        <BarChart2 size={12} className="text-violet-500" /> {chart.title || 'Plot Data'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-3 px-6 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-700">
                    <Sparkles size={16} />
                </div>
                <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500/50 animate-bounce" style={{animationDelay: '0ms'}} />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500/50 animate-bounce" style={{animationDelay: '150ms'}} />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500/50 animate-bounce" style={{animationDelay: '300ms'}} />
                </div>
            </div>
          )}
        </div>

        {/* Sidebar Input Area */}
        <div className="p-6 border-t border-white/[0.05] bg-[#08080d] relative z-20">
          <div className="ai-input-wrapper flex flex-col p-2">
            {selectedFile && (
              <div className="mx-2 my-1 px-3 py-2 bg-violet-600/10 border border-violet-500/20 text-[10px] font-black text-violet-400 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <Paperclip size={10} />
                  </div>
                  {selectedFile.name.substring(0, 24)}...
                </div>
                <button 
                  onClick={() => setSelectedFile(null)} 
                  className="w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls,.json"
              />
              <button 
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all active:scale-90"
                onClick={() => fileInputRef.current.click()}
                title="Attach Data Source"
              >
                <Paperclip size={20} strokeWidth={2.5} />
              </button>
              <input 
                type="text" 
                placeholder="Talk to Bizlytics..." 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-transparent border-none outline-none text-white text-sm font-semibold px-2 placeholder:text-gray-700 tracking-tight"
              />
              <button 
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${inputText.trim() || selectedFile ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-600/20' : 'text-gray-800 pointer-events-none'}`}
                onClick={handleSendMessage}
              >
                <Send size={20} className={inputText.trim() || selectedFile ? 'animate-in zoom-in duration-300' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANE: ANALYTICAL CANVAS ─── */}
      <div className="flex-1 h-full overflow-y-auto p-12 relative bg-[#0a0a0f] scrollbar-thin">
        {/* Deep ambient glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-600/5 blur-[150px] pointer-events-none" />

        {dashboardData ? (
          <div className="max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-700">
            <div className="mb-12 flex items-end justify-between border-b border-white/[0.05] pb-8">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-violet-500 mb-3">
                   <Sparkles size={12} /> Dynamic Intelligence
                </div>
                <h2 className="text-4xl font-black text-white tracking-tight">
                  {isFullDashboard ? (
                    biReports.some(r => r.type.includes('dept') || r.type.includes('salary')) 
                      ? "Human Resource Analytics" 
                      : "Enterprise Sales Overview"
                  ) : "Ad-Hoc Data Analysis"}
                </h2>
                <p className="text-gray-500 font-bold text-xs mt-3 flex items-center gap-2.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  {isFullDashboard 
                    ? (biReports.length > 0 ? `Aggregating ${biReports.length} key performance indicators` : `Presenting ${dashboardData?.charts?.length || 0} analytical perspectives`) 
                    : "Computing specific visual insight"}
                </p>
              </div>
              
              <div className="flex gap-4">
                 <button 
                    onClick={() => setDashboardData(null)} 
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-gray-500 font-black text-[10px] uppercase tracking-widest hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                 >
                    <Trash2 size={14} /> Clear Canvas
                 </button>
              </div>
            </div>

            {/* DASHBOARD CONTENT GRID */}
            {isFullDashboard && (
              <div className="pb-24">
                {/* Official BI Reports Mapping */}
                {biReports.length > 0 ? (
                  <>
                    {/* KPIs */}
                    {biReports.some(r => r.type.startsWith('kpi')) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {biReports.filter(r => r.type.startsWith('kpi')).map((kpi, idx) => (
                          <DashboardVisualizer 
                            key={`kpi-${idx}`} 
                            data={[{label: kpi.label, value: kpi.value}]} 
                            type="kpi" 
                            title={kpi.label} 
                          />
                        ))}
                      </div>
                    )}

                    {/* Trends */}
                    {(() => {
                      const trendTypes = [...new Set(biReports.filter(r => r.type.startsWith('trend_')).map(r => r.type))];
                      if (trendTypes.length === 0) return null;
                      return (
                        <div className={`grid grid-cols-1 ${trendTypes.length > 1 ? 'xl:grid-cols-2' : ''} gap-8 mb-8`}>
                          {trendTypes.map((tType, idx) => (
                            <DashboardVisualizer 
                              key={`trend-${idx}`}
                              data={biReports.filter(r => r.type === tType)}
                              type="area"
                              title={tType.replace('trend_', '').replace(/_/g, ' ').toUpperCase() + ' PERFORMANCE'}
                            />
                          ))}
                        </div>
                      );
                    })()}

                    {/* Section Header */}
                    <div className="flex items-center gap-4 my-10">
                        <div className="h-[1px] flex-1 bg-white/5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-700">Distribution Analysis</span>
                        <div className="h-[1px] flex-1 bg-white/5" />
                    </div>

                    {/* Distributions & Cross-Dims */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                      {biReports.filter(r => r.type.startsWith('cross_') || r.type.startsWith('dist_')).reduce((acc, current) => {
                          const x = acc.find(item => item.type === current.type);
                          if (!x) acc.push({type: current.type, data: [current]});
                          else x.data.push(current);
                          return acc;
                      }, []).slice(0, 6).map((report, idx) => (
                        <DashboardVisualizer 
                          key={`dist-${idx}`}
                          data={report.data}
                          type={report.data.length <= 5 ? 'donut' : 'bar'}
                          title={report.type.replace(/^(dist_|cross_)/, '').replace(/_/g, ' ').toUpperCase()}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  /* AI Proposed Dashboard (JSON) */
                  dashboardData?.charts ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {dashboardData.charts.map((chart, idx) => (
                            <DashboardVisualizer 
                                key={idx}
                                data={chart.data}
                                type={chart.chart_type}
                                title={chart.title}
                            />
                        ))}
                    </div>
                  ) : null
                )}
              </div>
            )}

            {/* AI Ad-Hoc Analysis View */}
            {!isFullDashboard && (
                <div className="max-w-4xl mx-auto pb-24">
                    <DashboardVisualizer 
                        data={dashboardData.data || dashboardData} 
                        type={dashboardData.chart_type || "bar"} 
                        title={dashboardData.title || "Targeted Diagnostic"} 
                    />
                    {dashboardData.analysis && (
                        <div className="mt-8 relative group">
                            <div className="absolute -inset-px bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-3xl opacity-50 blur-[2px]" />
                            <div className="relative p-8 bg-[#12121a] border border-white/[0.08] rounded-3xl text-gray-300 leading-relaxed shadow-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                                        <Bot size={18} />
                                    </div>
                                    <span className="font-black text-[10px] uppercase tracking-widest text-violet-500">Analyst Observation</span>
                                </div>
                                <p className="text-[15px] font-medium leading-relaxed italic opacity-90">"{dashboardData.analysis}"</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="w-full h-full flex flex-col items-center justify-center">
             <div className="w-32 h-32 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-8 relative group">
                <div className="absolute inset-0 bg-violet-500/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <BarChart2 size={48} className="text-gray-800 group-hover:text-violet-500 transition-all duration-500 group-hover:scale-110" />
             </div>
             <h3 className="text-3xl font-black text-white tracking-tight">Analytical Sandbox</h3>
             <p className="mt-4 text-gray-500 font-bold text-sm max-w-sm text-center leading-relaxed">
               Select a dataset from the explorer or ask the AI to perform a multi-dimensional sweep of your current data.
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChat;
