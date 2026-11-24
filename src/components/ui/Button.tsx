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
  primary:
    'bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 border border-transparent shadow-xs',
  secondary:
    'bg-[#0F172A] text-white hover:bg-[#1E293B] dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white border border-transparent',
  outline:
    'bg-white text-slate-800 hover:bg-stone-50 border border-stone-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800',
  ghost:
    'bg-transparent text-slate-700 hover:bg-stone-100 dark:text-neutral-300 dark:hover:bg-neutral-800 border border-transparent',
  danger:
    'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 border border-transparent',
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
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap shrink-0 transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-out active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  );
};
