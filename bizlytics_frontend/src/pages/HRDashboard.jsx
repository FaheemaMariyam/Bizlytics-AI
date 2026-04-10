import React, { useState } from 'react';
import { BarChart3, ShieldAlert } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import FileUpload from '../components/analytics/FileUpload';
import FileList from '../components/analytics/FileList';
import useAuth from '../hooks/useAuth';
import ChangePasswordForm from '../components/auth/ChangePasswordForm';
import AIChat from '../components/AI/AIChat';

const HRDashboard = () => {
    const { user } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleUploadSuccess = () => {
        // Increment trigger to cause FileList to re-fetch
        setRefreshTrigger((prev) => prev + 1);
    };

    return (
        <DashboardLayout>
            {/* Workbench Header */}
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4 bg-white/50 px-6 -mx-6 -mt-4 sticky top-0 backdrop-blur-md z-10">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 tracking-tight">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        Analytical Workspace
                    </h1>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter">
                        Active Database Profile: <span className="text-indigo-500">{user?.schema_name || 'Global'}</span>
                    </p>
                </div>

                <div className="flex gap-2">
                    <FileUpload onUploadSuccess={handleUploadSuccess} variant="compact" />
                </div>
            </div>

            <div className="space-y-6">
                {/* Main Workspace Notification */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-indigo-100 shrink-0">
                        <span className="text-xl">📊</span>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-indigo-900">Dashboard Workspace Active</h4>
                        <p className="text-xs text-indigo-700 leading-relaxed max-w-lg mt-1 opacity-80">
                            Upload your datasets via the action bar or select an asset from the explorer sidebar.
                            Use the **AI Assistant** to automatically generate complex visualizations.
                        </p>
                    </div>
                </div>

                {/* Security Section (Small Card) */}
                <div className="max-w-md bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-gray-400" />
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-800">Security Settings</h2>
                    </div>
                    <div className="p-6">
                        <ChangePasswordForm />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default HRDashboard;
