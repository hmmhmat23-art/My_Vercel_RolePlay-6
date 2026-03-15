import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-[4px] font-medium transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs sm:text-sm";
  
  const variants = {
    primary: "bg-gradient-to-r from-orange-700 to-orange-600 text-white border border-orange-500/50 hover:border-orange-400 hover:shadow-glow hover:from-orange-600 hover:to-orange-500",
    secondary: "bg-zinc-900/80 text-zinc-300 border border-zinc-700 hover:bg-zinc-800 hover:text-white hover:border-zinc-500",
    outline: "bg-transparent text-orange-500 border border-orange-900/60 hover:border-orange-500 hover:bg-orange-950/10 hover:text-orange-400 hover:shadow-glow-sm",
    danger: "bg-red-950/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 hover:border-red-700",
    ghost: "bg-transparent text-zinc-500 hover:text-orange-400 hover:bg-white/5"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};