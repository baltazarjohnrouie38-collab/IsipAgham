import React from 'react';
import { BookOpen, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface OfflineBannerProps {
  className?: string;
  onBrowseOffline?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  className = '',
  onBrowseOffline,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative z-40 w-full bg-amber-600 dark:bg-amber-700 text-white px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] shadow-sm ${className}`}
    >
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs sm:text-sm font-semibold text-center">
        <div className="inline-flex items-center gap-2 min-w-0">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Offline Mode — All 66 Physics lessons are cached and ready to review. AI tutor &amp; cloud sync pause until you reconnect.
          </span>
        </div>
        {onBrowseOffline && (
          <button
            type="button"
            onClick={onBrowseOffline}
            className="inline-flex items-center gap-1.5 rounded-full bg-white text-amber-900 px-3 py-1 text-xs font-bold shadow-xs hover:bg-amber-50 transition-colors cursor-pointer shrink-0"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Open Cached Lessons</span>
          </button>
        )}
      </div>
    </div>
  );
};
