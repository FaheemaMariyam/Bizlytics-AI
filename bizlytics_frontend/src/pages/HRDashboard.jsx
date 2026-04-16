import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import useAuth from '../hooks/useAuth';
import AIChat from '../components/AI/AIChat';

const HRDashboard = () => {
    const { user } = useAuth();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-80px)] flex flex-col -mt-4 overflow-hidden">
                <AIChat />
            </div>
        </DashboardLayout>
    );
};

export default HRDashboard;
