import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Button from '../components/common/Button';
import FileList from '../components/analytics/FileList';
import AIChat from '../components/AI/AIChat';
import ChangePasswordForm from '../components/auth/ChangePasswordForm';
import { Lock, MessageSquare, X, Bot, ShieldAlert } from 'lucide-react';

const DashboardLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <div className="flex flex-col h-screen bg-[#fcfcfc] overflow-hidden text-[#1a1a1a]">
            {/* Top Minimalist Header */}
            <header className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 z-50">
                <div className="flex items-center gap-6">
                    <span className="text-sm font-bold text-indigo-600 tracking-tight flex items-center gap-2">
                        <span className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white text-[10px]">B</span>
                        BIZLYTICS <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 uppercase tracking-widest">{user.role}</span>
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`p-2 rounded-lg transition-all ${isChatOpen ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'}`}
                        title="AI Assistant"
                    >
                        <Bot size={20} />
                    </button>
                    <div className="h-4 w-[1px] bg-gray-200 mx-1 hidden sm:block"></div>
                    <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-tighter">Current User</span>
                        <span className="text-xs font-medium text-gray-700">{user.email}</span>
                    </div>
                    <Button onClick={handleLogout} variant="outline" className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider border-gray-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50">
                        Logout
                    </Button>
                </div>
            </header>

            {/* Workbench Body */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar (Explorer) */}
                <aside className="w-64 border-r border-gray-200 bg-white shrink-0 hidden md:flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        <FileList />
                    </div>
                    
                    {/* Sidebar Footer - Settings */}
                    <div className="p-4 border-t border-gray-100 bg-[#fafafa]">
                        <button 
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-200 group"
                        >
                            <Lock size={14} className="group-hover:scale-110 transition-transform" />
                            <span>Change Password</span>
                        </button>
                    </div>
                </aside>

                {/* Main Workspace (Editor) */}
                <main className="flex-1 overflow-y-auto bg-gray-50/50 scrollbar-thin relative pt-4 pb-12 px-6">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>

                {/* AI Floating Chat Assistant */}
                {isChatOpen && (
                    <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] z-[100] bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-all transform animate-in slide-in-from-right duration-300">
                        <div className="h-12 bg-[#fafafa] border-b border-gray-100 px-4 flex items-center justify-between shrink-0">
                            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                                <Bot size={16} /> AI Analytical Assistant
                            </h3>
                            <button 
                                onClick={() => setIsChatOpen(false)}
                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <AIChat />
                        </div>
                    </div>
                )}

                {/* Mobile Floating Toggle */}
                {!isChatOpen && (
                    <button 
                        onClick={() => setIsChatOpen(true)}
                        className="md:fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 hover:scale-110 transition-all z-[90] md:hidden"
                    >
                        <MessageSquare size={24} />
                    </button>
                )}

                {/* Desktop FAB Toggle (Alternative to Header) */}
                <button 
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={`fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all z-[90] hidden md:flex ${isChatOpen ? 'bg-white text-indigo-600 border border-indigo-100' : 'bg-indigo-600 text-white'}`}
                >
                    {isChatOpen ? <X size={20} /> : <Bot size={24} />}
                </button>
            </div>

            {/* Password Change Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)}></div>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-[210] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-[#fafafa] border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                                    <ShieldAlert size={20} />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-tighter text-gray-800">Security Update</h2>
                            </div>
                            <button onClick={() => setIsPasswordModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8">
                            <ChangePasswordForm />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardLayout;
