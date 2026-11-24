import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
      <div className="space-y-1 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-neutral-100 text-balance">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
