import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Button from '../components/common/Button';
import FileList from '../components/analytics/FileList';
import AIChat from '../components/AI/AIChat';

const DashboardLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (!user) return null;

    const roleBadgeColors = {
        admin: 'bg-red-100 text-red-800',
        company: 'bg-blue-100 text-blue-800',
        hr: 'bg-green-100 text-green-800',
    };

    return (
        <div className="flex flex-col h-screen bg-[#fcfcfc] overflow-hidden text-[#1a1a1a]">
            {/* Top Minimalist Header */}
            <header className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 transition-all duration-300">
                <div className="flex items-center gap-6">
                    <span className="text-sm font-bold text-indigo-600 tracking-tight flex items-center gap-2">
                        <span className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white text-[10px]">B</span>
                        BIZLYTICS <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 uppercase tracking-widest">{user.role}</span>
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end mr-2">
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
                    <FileList />
                </aside>

                {/* Main Workspace (Editor) */}
                <main className="flex-1 overflow-y-auto bg-gray-50/50 scrollbar-thin relative pt-4 pb-12 px-6">
                    {children}
                </main>

                {/* Right Sidebar (AI Panel) */}
                <aside className="w-[380px] shrink-0 hidden lg:block">
                    <AIChat />
                </aside>
            </div>
        </div>
    );
};

export default DashboardLayout;
