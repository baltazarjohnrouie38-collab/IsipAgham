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
  info: 'bg-sky-50/80 text-slate-900 border-sky-200/80 dark:bg-sky-950/55 dark:text-sky-100 dark:border-sky-400/25',
  success:
    'bg-emerald-50/80 text-emerald-950 border-emerald-200/80 dark:bg-emerald-950/55 dark:text-emerald-100 dark:border-emerald-400/25',
  warning:
    'bg-amber-50/85 text-amber-950 border-amber-200/80 dark:bg-amber-950/55 dark:text-amber-100 dark:border-amber-400/25',
  error:
    'bg-rose-50/85 text-rose-950 border-rose-200/80 dark:bg-rose-950/55 dark:text-rose-100 dark:border-rose-400/25',
};

const TONE_ICONS: Record<AlertTone, React.ReactNode> = {
  info: <Info className="h-5 w-5 text-[#007AFF] dark:text-sky-400 shrink-0" aria-hidden="true" />,
  success: (
    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
  ),
  warning: (
    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
  ),
  error: <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />,
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
      className={`animate-pop backdrop-blur-xl flex items-start gap-3 rounded-[18px] border p-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_6px_20px_-6px_rgba(15,23,42,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ${TONE_STYLES[tone]} ${className}`}
    >
      {TONE_ICONS[tone]}
      <div className="space-y-0.5 min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
