import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import Input from '../common/Input';
import Button from '../common/Button';
import useAuth from '../../hooks/useAuth';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const userData = await login({ email, password });
      toast.success('Login successful!');
      
      // Role-based redirection
      if (userData.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (userData.role === 'company') {
        navigate('/company/dashboard');
      } else if (userData.role === 'hr') {
        navigate('/hr/dashboard');
      } else {
        navigate('/dashboard'); // fallback
      }
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail;
      
      // Specifically handle backend rejection messages exactly as returned by service.py
      if (detail === "Your company registration is pending admin approval.") {
        toast.error("Account pending approval", { 
          description: "Your company has not yet been approved by the Admin.",
          duration: 5000 
        });
      } else if (detail === "Your company registration was rejected.") {
        toast.error("Registration Rejected", { 
          description: "Your company registration request was declined.",
          duration: 5000 
        });
      } else if (detail === "HR account not verified. Please verify OTP first.") {
        toast.error("Email not verified", { 
          description: "Please verify your email OTP before logging in." 
        });
        navigate('/verify-otp', { state: { email } });
      } else {
        toast.error(detail || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Input
        label="Email address"
        id="email"
        type="email"
        autoComplete="email"
        required
        icon={Mail}
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        label="Password"
        id="password"
        type="password"
        autoComplete="current-password"
        required
        icon={Lock}
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-violet-600 focus:ring-violet-500 bg-white/5 border-white/10 rounded"
          />
          <label htmlFor="remember-me" className="ml-2.5 block text-[11px] font-bold text-gray-500 uppercase tracking-widest">
            Remember me
          </label>
        </div>

        <div className="text-xs">
          <Link to="/forgot-password" className="font-bold text-violet-400 hover:text-violet-300 transition-colors">
            Forgot password?
          </Link>
        </div>
      </div>

      <Button type="submit" variant="gradient" isLoading={loading}>
        Sign in to Workspace
      </Button>
    </form>
  );
};

export default LoginForm;
