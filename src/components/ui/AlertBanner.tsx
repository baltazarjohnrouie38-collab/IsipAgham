import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

type AlertTone = 'info' | 'success' | 'warning' | 'error';

interface AlertBannerProps {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const TONE_STYLES: Record<AlertTone, string> = {
  info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/50 dark:text-blue-100 dark:border-blue-900',
  success:
    'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-100 dark:border-emerald-900',
  warning:
    'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900',
  error:
    'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/50 dark:text-red-100 dark:border-red-900',
};

const TONE_ICONS: Record<AlertTone, React.ReactNode> = {
  info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />,
  success: (
    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
  ),
  warning: (
    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
  ),
  error: <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />,
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  tone = 'info',
  title,
  children,
  className = '',
}) => {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`animate-pop flex items-start gap-3 rounded-xl border p-4 text-sm ${TONE_STYLES[tone]} ${className}`}
    >
      {TONE_ICONS[tone]}
      <div className="space-y-0.5 min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
