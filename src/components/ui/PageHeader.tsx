import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-900/10 dark:border-white/10">
      <div className="space-y-1 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white text-balance">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-600 dark:text-slate-300/80">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
