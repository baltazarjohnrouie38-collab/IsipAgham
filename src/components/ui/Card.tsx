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
      className={`liquid-glass rounded-[24px] transition-[transform,border-color,box-shadow] duration-250 [transition-timing-function:cubic-bezier(0.22,1.25,0.36,1)] ${PADDING_CLASSES[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
