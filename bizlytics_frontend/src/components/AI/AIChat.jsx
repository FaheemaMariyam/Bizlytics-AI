import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, BarChart2, X, Bot, User } from 'lucide-react';
import api from '../../utils/api';
import analyticsService from '../../services/analyticsService';
import toast from 'react-hot-toast';
import DashboardVisualizer from '../analytics/DashboardVisualizer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './AIChat.css';

const AIChat = () => {
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: 'Hello! I am your Bizlytics AI Assistant. How can I help you with your HR data today?' }
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
      // If there's a file, upload it using the existing service
      if (selectedFile) {
        await analyticsService.uploadFile(selectedFile);
      }

      const response = await api.post('/ai/chat', { message: userMessage.text || `Uploaded file: ${selectedFile?.name}` });
      
      let replyText = response.data.reply;
      const charts = [];
      const dashs = [];
      
      // 1. Parse Specific Charts
      const chartRegex = /```chart\s+([\s\S]*?)\s*```/g;
      let chartMatch;
      while ((chartMatch = chartRegex.exec(replyText)) !== null) {
          try {
              charts.push(JSON.parse(chartMatch[1]));
          } catch (e) { console.error("Chart JSON parsing failed", e); }
      }

      // 2. Parse Full Dashboards (Specific format or generic JSON with dashboard key)
      const dashRegex = /```(?:dashboard|json)\s+([\s\S]*?)\s*```/g;
      let dashMatch;
      while ((dashMatch = dashRegex.exec(replyText)) !== null) {
          try {
              const parsed = JSON.parse(dashMatch[1]);
              if (parsed.dashboard || (parsed.title && parsed.charts)) {
                dashs.push(parsed.dashboard || parsed);
              }
          } catch (e) { /* Silently skip non-dashboard JSON */ }
      }

      // Scrub ALL code blocks from the final display text for a cleaner UI
      replyText = replyText.replace(/```[\s\S]*?```/g, '').trim();

      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        text: replyText,
        charts: charts.length > 0 ? charts : null,
        dashboard: dashs.length > 0 ? dashs[0] : null
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: "I'm sorry, I encountered an error. Please try again later.",
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
    <div className="ai-chat-panel border-l border-gray-200 bg-white flex flex-col w-[380px] shrink-0 h-full relative shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">
      <div className="ai-chat-header px-4 h-12 flex items-center justify-between border-b border-gray-100 bg-[#fafafa]">
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2">
          <Bot size={16} /> AI Assistant
        </h3>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-100 uppercase tracking-tighter">Connected</span>
      </div>

      <div className="ai-chat-history" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-message ${msg.type}`}>
            <div className="ai-message-content">
              {msg.type === 'ai' ? (
                <div className="markdown-content">
                   <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                   </ReactMarkdown>
                </div>
              ) : (
                msg.text
              )}
              {(msg.dashboard || /\[SUGGEST_DASHBOARD\]|<SUGGEST_DASHBOARD>/i.test(msg.text)) && (
                <button 
                  className="mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500"
                  onClick={() => handleGenerateDashboard(msg.dashboard)}
                >
                  <BarChart2 size={18} className="animate-pulse" /> ✨ {msg.dashboard ? `View Proposed ${msg.dashboard.title || 'Dashboard'}` : "Generate Visual Dashboard"}
                </button>
              )}
              {msg.charts && msg.charts.map((chart, idx) => (
                <button 
                    key={idx}
                    className="ai-chart-placeholder-btn"
                    onClick={() => {
                        setDashboardData(chart.data || chart);
                        setBiReports([]);
                        setIsFullDashboard(false);
                        setShowDashboard(true);
                    }}
                >
                  <BarChart2 size={16} /> View {chart.title || `Chart ${idx + 1}`}
                </button>
              ))}
              {msg.file && (
                <div className="ai-attachment-preview mt-2">
                  <Paperclip size={14} /> {msg.file}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="ai-message ai">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      <div className="ai-chat-input-area">
        {selectedFile && (
          <div className="ai-attachment-preview">
            <Paperclip size={14} /> {selectedFile.name}
            <button onClick={() => setSelectedFile(null)} style={{background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 'auto'}}>
              <X size={14} />
            </button>
          </div>
        )}
        <div className="ai-input-wrapper">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{display: 'none'}} 
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls,.json"
          />
          <button className="ai-action-btn" onClick={() => fileInputRef.current.click()}>
            <Paperclip size={20} />
          </button>
          <input 
            type="text" 
            placeholder="Ask anything about your data..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button className="ai-action-btn ai-send-btn" onClick={handleSendMessage}>
            <Send size={20} />
          </button>
        </div>
      </div>
      {showDashboard && dashboardData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
            <button 
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition"
              onClick={() => setShowDashboard(false)}
            >
              <X size={24} />
            </button>
            
            <div className="mb-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                {isFullDashboard ? (
                  biReports.some(r => r.type.startsWith('hr_')) ? "Executive HR Overview" : "Executive Business Overview"
                ) : "Targeted AI Analysis"}
              </h2>
              <p className="text-gray-500 font-medium mt-1">
                {isFullDashboard ? (
                   biReports.some(r => r.type.startsWith('hr_')) ? "Workforce demographics and hiring trends" : "High-level performance metrics and trends"
                ) : "Specific data insight based on your query"}
              </p>
            </div>

            {isFullDashboard && (
              <div className="mb-10">
                {/* 1. Official BI Reports (Backend Logic) */}
                {biReports.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                       {biReports.filter(r => r.type.startsWith('kpi')).map((kpi, idx) => (
                         <DashboardVisualizer 
                           key={idx} 
                           data={[{label: kpi.label, value: kpi.value}]} 
                           type="kpi" 
                           title={kpi.label} 
                         />
                       ))}
                    </div>

                    <div className="space-y-12">
                      {/* HR LAYOUT */}
                      {biReports.some(r => r.type.startsWith('hr_')) ? (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                             {biReports.filter(r => r.type === 'hr_kpi_headcount').map((kpi, idx) => (
                               <DashboardVisualizer 
                                 key={idx} 
                                 data={[{label: kpi.label, value: kpi.value}]} 
                                 type="kpi" 
                                 title={kpi.label} 
                               />
                             ))}
                          </div>
                          
                          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {biReports.some(r => r.type === 'hr_dept_count') && (
                              <DashboardVisualizer 
                                data={biReports.filter(r => r.type === 'hr_dept_count')} 
                                type="bar" 
                                title="Headcount by Department" 
                              />
                            )}
                            {biReports.some(r => r.type === 'hr_trend_hiring') && (
                              <DashboardVisualizer 
                                data={biReports.filter(r => r.type === 'hr_trend_hiring')} 
                                type="area" 
                                title="Hiring Growth (MTD)" 
                              />
                            )}
                          </section>
                          
                          {biReports.some(r => r.type === 'hr_status_split') && (
                            <section>
                              <DashboardVisualizer 
                                data={biReports.filter(r => r.type === 'hr_status_split')} 
                                type="donut" 
                                title="Employment Status Distribution" 
                              />
                            </section>
                          )}
                        </>
                      ) : (
                        /* SALES LAYOUT (Existing) */
                        <>
                          {biReports.some(r => r.type === 'trend_revenue') && (
                            <section>
                              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                                Growth Trends
                              </h3>
                              <div className="grid grid-cols-1">
                                <DashboardVisualizer 
                                  data={biReports.filter(r => r.type === 'trend_revenue')} 
                                  type="area" 
                                  title="Revenue Growth Over Time" 
                                />
                              </div>
                            </section>
                          )}

                          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {biReports.some(r => r.type === 'cat_revenue') && (
                              <DashboardVisualizer 
                                data={biReports.filter(r => r.type === 'cat_revenue')} 
                                type="donut" 
                                title="Top Categories by Sales" 
                              />
                            )}
                            {biReports.some(r => r.type === 'reg_revenue') && (
                              <DashboardVisualizer 
                                data={biReports.filter(r => r.type === 'reg_revenue')} 
                                type="bar" 
                                title="Regional Performance" 
                              />
                            )}
                          </section>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  /* 2. AI Prosed Dashboard (Charts Array Logic) */
                  dashboardData?.charts ? (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {dashboardData.charts.map((chart, idx) => (
                                <DashboardVisualizer 
                                    key={idx}
                                    data={chart.data}
                                    type={chart.chart_type}
                                    title={chart.title}
                                />
                            ))}
                        </div>
                    </div>
                  ) : (
                    /* 3. Fallback Stat Summary */
                    <div className="mb-10">
                      <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl mb-8 text-amber-800 text-sm">
                        💡 <strong>Analyst Note:</strong> We've generated a statistical overview of all columns. To see Business KPIs (Revenue, Trends), please ensure your file contains columns like "Sales", "Date", "Profit", or "Category".
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {Array.isArray(dashboardData) && dashboardData.map((item, idx) => (
                              <DashboardVisualizer 
                                  key={idx}
                                  data={[{ label: 'Average', value: item.average }, { label: 'Maximum', value: item.maximum }, { label: 'Minimum', value: item.minimum }]} 
                                  type="bar" 
                                  title={`Statistic: ${item.label || 'Metric'}`} 
                              />
                          ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {!isFullDashboard && (
                <div className="max-w-3xl mx-auto">
                    {Array.isArray(dashboardData) ? (
                        // Check if this is the technical summary (has average/maximum keys)
                        // or simple chart data (has label/value keys)
                        dashboardData[0]?.average !== undefined ? (
                            dashboardData.map((item, idx) => {
                                const label = item.label || 'Metric';
                                const isDateLabel = label.toLowerCase().includes('date') || label.toLowerCase().includes('time');
                                return (
                                    <DashboardVisualizer 
                                        key={idx}
                                        data={[{ label: 'Average', value: item.average }, { label: 'Maximum', value: item.maximum }, { label: 'Minimum', value: item.minimum }]} 
                                        type={isDateLabel ? 'area' : 'bar'} 
                                        title={`Analysis: ${label}`} 
                                    />
                                );
                            })
                        ) : (
                            // Simple chart data from AI (e.g. Top 5 Regions)
                            <DashboardVisualizer 
                                data={dashboardData} 
                                type="bar" 
                                title="Targeted Analysis" 
                            />
                        )
                    ) : (
                        <div className="space-y-4">
                            <DashboardVisualizer 
                                data={dashboardData.data || dashboardData} 
                                type={dashboardData.chart_type || "bar"} 
                                title={dashboardData.title || "Insight"} 
                            />
                            {dashboardData.analysis && (
                                <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-indigo-900 leading-relaxed shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Bot size={18} className="text-indigo-600" />
                                        <span className="font-bold text-xs uppercase tracking-widest text-indigo-600">Analyst Observation</span>
                                    </div>
                                    <p className="italic text-sm">"{dashboardData.analysis}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;
