import React, { forwardRef } from 'react';

const Input = forwardRef(({ label, id, error, icon: Icon, theme = 'dark', ...props }, ref) => {
  const isDark = theme === 'dark';

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className={`block text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-200 ${isDark ? 'text-gray-600 group-focus-within:text-violet-500' : 'text-gray-400 group-focus-within:text-indigo-500'}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
        <input
          id={id}
          ref={ref}
          className={`
            block w-full text-sm rounded-xl py-3
            ${Icon ? 'pl-11' : 'pl-4'}
            pr-4
            transition-all duration-300
            outline-none
            ${isDark 
              ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder-gray-600 focus:bg-white/[0.05] focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10' 
              : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'}
            ${error ? 'border-red-500/50 ring-4 ring-red-500/10' : ''}
            border
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider animate-in fade-in slide-in-from-top-1">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
