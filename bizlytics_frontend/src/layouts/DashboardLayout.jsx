import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Button from '../components/common/Button';
import FileList from '../components/analytics/FileList';
import AIChat from '../components/AI/AIChat';
import ChangePasswordForm from '../components/auth/ChangePasswordForm';
import { Lock, MessageSquare, X, Bot, ShieldAlert, Activity, LayoutDashboard, Database, Settings, LogOut, Search } from 'lucide-react';

const DashboardLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const handleLogout = async () => {
        navigate('/');
        await logout();
    };

    if (!user) return null;

    return (
        <div className="flex flex-col h-screen bg-[#08080d] overflow-hidden text-white selection:bg-violet-500 selection:text-white">
            {/* ═══ TOP HEADER ═══ */}
            <header className="h-14 border-b border-white/[0.05] bg-[#0a0a0f]/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-10">
                    <Link to="/" className="flex items-center gap-2.5 no-underline group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-all">
                            <Activity size={16} className="text-white" />
                        </div>
                        <span className="text-lg font-black tracking-tight text-white">Bizlytics</span>
                        <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-widest">{user.role}</span>
                    </Link>

                </div>

                <div className="flex items-center gap-4">
                    
                    <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block"></div>
                    
                    <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">Current User</span>
                        <span className="text-[11px] font-bold text-gray-400">{user.email.split('@')[0]}</span>
                    </div>

                    <button 
                        onClick={handleLogout}
                        className="p-2 rounded-xl text-gray-500 hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* ═══ WORKBENCH BODY ═══ */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar (Explorer) */}
                <aside className="w-64 border-r border-white/[0.05] bg-[#08080d] shrink-0 hidden md:flex flex-col">
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                        <FileList />
                    </div>
                    
                    {/* Sidebar Footer - Settings */}
                    <div className="p-4 border-t border-white/[0.05] bg-[#0a0a0f]">
                        <button 
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-widest hover:text-white hover:bg-white/[0.03] rounded-xl transition-all border border-transparent hover:border-white/[0.05] group"
                        >
                            <Lock size={14} className="text-gray-600 group-hover:text-violet-400 transition-colors" />
                            <span>Security Settings</span>
                        </button>
                    </div>
                </aside>

                {/* Main Workspace (Editor) */}
                <main className="flex-1 overflow-y-auto bg-[#0a0a0f] scrollbar-thin relative p-8">
                    {/* Background Ambient Glow */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-600/5 blur-[120px] pointer-events-none" />
                    
                    <div className="max-w-[1400px] mx-auto">
                        <div className="mb-10 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-violet-500 mb-2">
                                    <LayoutDashboard size={12} /> Analytical Workbench
                                </div>
                                <h1 className="text-3xl font-black text-white tracking-tight">Executive Control Panel</h1>
                            </div>
                        </div>
                        {children}
                    </div>
                </main>

            </div>

            {/* Password Change Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-[#0a0a0f]/80 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)}></div>
                    <div className="bg-[#12121a] rounded-[2rem] border border-white/[0.08] shadow-2xl w-full max-w-md relative z-[210] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 bg-white/[0.02] border-b border-white/[0.05] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-violet-600/10 rounded-xl text-violet-500 border border-violet-500/20">
                                    <ShieldAlert size={20} />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-widest text-white">Security Update</h2>
                            </div>
                            <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-10">
                            <ChangePasswordForm onCancel={() => setIsPasswordModalOpen(false)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardLayout;
