import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({ children, isLoading, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-xl text-sm font-bold tracking-tight focus:outline-none focus:ring-4 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500/10",
    gradient: "text-white bg-gradient-to-r from-violet-600 to-cyan-600 hover:shadow-lg hover:shadow-violet-500/20 focus:ring-violet-500/10",
    secondary: "text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 focus:ring-violet-500/10",
    outline: "text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 focus:ring-white/5"
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

export default Button;
