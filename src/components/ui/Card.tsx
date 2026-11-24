import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING_CLASSES: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-7',
};

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-[transform,border-color,box-shadow] duration-200 ease-out ${PADDING_CLASSES[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
