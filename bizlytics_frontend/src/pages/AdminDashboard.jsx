import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../layouts/DashboardLayout';
import authService from '../services/authService';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';
import ChangePasswordForm from '../components/auth/ChangePasswordForm';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [pendingCompanies, setPendingCompanies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchPendingCompanies();
    }, []);

    const fetchPendingCompanies = async () => {
        setLoading(true);
        try {
            const data = await authService.getPendingCompanies();
            setPendingCompanies(data);
        } catch (error) {
            toast.error('Failed to load pending companies');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        setActionLoading(id);
        try {
            await authService.approveCompany(id);
            toast.success('Company approved!');
            fetchPendingCompanies();
        } catch (error) {
            toast.error('Failed to approve company');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id) => {
        setActionLoading(id);
        try {
            await authService.rejectCompany(id);
            toast.success('Company rejected');
            fetchPendingCompanies();
        } catch (error) {
            toast.error('Failed to reject company');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-10">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-violet-500 mb-2">
                    <Building2 size={12} /> Platform Governance
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">Admin Control Center</h1>
                <p className="text-gray-500 font-bold text-xs mt-2 flex items-center gap-2">
                    Global oversight of company registrations and platform security.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Pending Companies */}
                <div className="xl:col-span-2 relative group">
                    <div className="absolute -inset-px bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-3xl opacity-50 blur-[2px] shadow-2xl" />
                    <div className="relative bg-[#12121a] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl h-full">
                        <div className="px-8 py-6 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-violet-600/10 rounded-xl text-violet-400 border border-violet-500/20">
                                    <Building2 size={20} />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-widest text-white">Pending Registrations</h2>
                                {pendingCompanies.length > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                        {pendingCompanies.length}
                                    </span>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-20 text-center text-gray-600">
                                <Clock className="h-10 w-10 mx-auto mb-4 animate-spin text-violet-500/40" />
                                <p className="text-xs font-bold uppercase tracking-widest">Accessing global registry...</p>
                            </div>
                        ) : pendingCompanies.length === 0 ? (
                            <div className="p-20 text-center">
                                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="h-10 w-10 text-emerald-400" />
                                </div>
                                <p className="text-lg font-black text-white">Registry Synchronized</p>
                                <p className="text-xs text-gray-500 font-bold mt-2 uppercase tracking-widest">All company applications processed</p>
                            </div>
                        ) : (
                            <div className="p-4">
                                <div className="space-y-3">
                                    {pendingCompanies.map((company) => (
                                        <div key={company.id} className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-center justify-between hover:bg-white/[0.04] hover:scale-[1.01] transition-all group/item">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 flex items-center justify-center text-white border border-white/10">
                                                    {company.company_name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white">{company.company_name}</p>
                                                    <p className="text-xs text-gray-500 font-medium">{company.company_email}</p>
                                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">
                                                        Registered {new Date(company.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleApprove(company.id)}
                                                    disabled={actionLoading === company.id}
                                                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(company.id)}
                                                    disabled={actionLoading === company.id}
                                                    className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-red-500/10 hover:border-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Security Settings */}
                <div className="relative group">
                    <div className="absolute -inset-px bg-gradient-to-b from-violet-500/10 to-transparent rounded-3xl pointer-events-none" />
                    <div className="relative bg-[#12121a] border border-white/[0.08] rounded-3xl p-8 shadow-2xl h-full">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-cyan-600/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                                <ShieldAlert size={20} />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-white">System Security</h2>
                        </div>
                        
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-10 leading-relaxed">
                            Maintain administrative authority by updating credentials regularly.
                        </p>
                        
                        <div className="p-1 space-y-6">
                            <ChangePasswordForm />
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;
