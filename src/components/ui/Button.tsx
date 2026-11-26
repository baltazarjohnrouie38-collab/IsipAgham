import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'liquid-btn-primary',
  secondary: 'liquid-btn-secondary',
  outline: 'liquid-btn-outline',
  ghost:
    'bg-transparent text-slate-700 hover:bg-white/55 dark:text-slate-200 dark:hover:bg-white/10 border border-transparent',
  danger:
    'bg-gradient-to-b from-[#FF5E57] to-[#E02424] text-white hover:brightness-105 border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_18px_-6px_rgba(224,36,36,0.45)]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-4 py-2 text-xs sm:text-sm',
  md: 'min-h-[44px] px-5 py-2.5 text-sm',
  lg: 'min-h-[48px] px-6 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  disabled,
  children,
  className = '',
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap shrink-0 transition-[transform,filter,background-color,color,border-color,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.22,1.25,0.36,1)] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  );
};
