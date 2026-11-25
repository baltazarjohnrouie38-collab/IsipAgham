import React from 'react';
import logoUrl from '../../assets/images/regenerated_image_1795533932091.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  src?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
};

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  src,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
      <img
        src={src || logoUrl}
        alt="IsipAgham mascot logo"
        className={`${SIZE_CLASSES[size]} rounded-xl object-cover shrink-0`}
        referrerPolicy="no-referrer"
      />
      {showText && (
        <span className="font-bold tracking-tight text-slate-900 dark:text-neutral-100 whitespace-nowrap">
          IsipAgham
        </span>
      )}
    </div>
  );
};
