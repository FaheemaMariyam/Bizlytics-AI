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
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
                <p className="text-gray-500 mt-1">
                    Upload and manage your company's analytics data.
                    {user?.schema_name && (
                        <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">
                            {user.schema_name}
                        </span>
                    )}
                </p>
            </div>

            <div className="space-y-8">
                {/* Analytics Section */}
                <div className="space-y-6">
                    {/* Upload Section */}
                    <FileUpload onUploadSuccess={handleUploadSuccess} />

                    {/* Files Table */}
                    <FileList refreshTrigger={refreshTrigger} />
                </div>

                {/* Security Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
                    </div>
                    <div className="p-6 max-w-md">
                        <p className="text-sm text-gray-500 mb-6">
                            Update your personal password for secure data access.
                        </p>
                        <ChangePasswordForm />
                    </div>
                </div>
            </div>
            
            {/* AI Insights Chat */}
            <AIChat />
        </DashboardLayout>
    );
};

export default HRDashboard;
