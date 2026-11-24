import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-50 bg-red-600 text-white px-4 py-3 shadow-md"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-center gap-2.5 text-sm font-semibold">
        <WifiOff className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>
          No Internet Connection — IsipAgham requires an active internet connection to load and sync your Physics study tools.
        </span>
      </div>
    </div>
  );
};
