import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import RegisterCompanyForm from '../../components/auth/RegisterCompanyForm';
import RegisterHRForm from '../../components/auth/RegisterHRForm';

const Register = () => {
  // 'company' or 'hr'
  const [activeTab, setActiveTab] = useState('company');

  return (
    <AuthLayout 
      title="Create your account" 
      subtitle={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </span>
      }
    >
      {/* Segmented Control / Toggle */}
      <div className="bg-slate-50/80 backdrop-blur border border-slate-200/60 p-1.5 rounded-2xl flex gap-1 mb-10 w-full relative shadow-inner">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl text-sm font-bold transition-all relative z-10 ${
            activeTab === 'company' 
              ? 'text-indigo-900 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)]' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
          }`}
        >
          <Building2 size={24} className={activeTab === 'company' ? 'text-indigo-600' : 'text-slate-400'} />
          COMPANY ADMIN
        </button>

        <button
          onClick={() => setActiveTab('hr')}
          className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl text-sm font-bold transition-all relative z-10 ${
            activeTab === 'hr' 
              ? 'text-indigo-900 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)]' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
          }`}
        >
          <Users size={24} className={activeTab === 'hr' ? 'text-indigo-600' : 'text-slate-400'} />
          HR EMPLOYEE
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'company' ? <RegisterCompanyForm /> : <RegisterHRForm />}
      </div>
    </AuthLayout>
  );
};

export default Register;
