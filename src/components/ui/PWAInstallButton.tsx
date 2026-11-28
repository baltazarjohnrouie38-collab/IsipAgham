import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, HardDriveDownload, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Button } from './Button';
import { Card } from './Card';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, isInAppBrowser, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!showGuide) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuide(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGuide]);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  const modal =
    showGuide && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] overscroll-contain"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-guide-title"
            onClick={() => setShowGuide(false)}
          >
            <Card
              padding="md"
              className="animate-pop w-full max-w-md max-h-[88dvh] overflow-y-auto space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <h2
                  id="pwa-guide-title"
                  className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100"
                >
                  Add IsipAgham to Your Phone
                </h2>
                <button
                  type="button"
                  aria-label="Close install guide"
                  onClick={() => setShowGuide(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-stone-100 dark:text-neutral-400 dark:hover:bg-neutral-800 cursor-pointer shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-sm text-slate-700 dark:text-neutral-300">
                {isInAppBrowser && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/90 dark:border-amber-700/70 bg-amber-50/90 dark:bg-amber-950/40 p-3 text-xs text-amber-950 dark:text-amber-100">
                    <ExternalLink className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>In-app browser detected:</strong> Tap the{' '}
                      <strong>&bull;&bull;&bull;</strong> menu in the top corner and choose{' '}
                      <strong>Open in Safari</strong> or <strong>Open in Chrome</strong> first to install IsipAgham.
                    </span>
                  </div>
                )}

                <div
                  className={`rounded-xl border p-3.5 space-y-1.5 ${
                    !isIOS
                      ? 'border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/30'
                      : 'border-stone-200 dark:border-neutral-800'
                  }`}
                >
                  <p className="font-bold text-slate-900 dark:text-neutral-100">
                    Android (Chrome / Edge)
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Tap the 3-dot menu in the top-right corner of Chrome.</li>
                    <li>
                      Select <strong>Add to Home screen</strong> or <strong>Install app</strong>.
                    </li>
                    <li>
                      Tap <strong>Install</strong> to place the IsipAgham icon on your home screen.
                    </li>
                  </ol>
                </div>

                <div
                  className={`rounded-xl border p-3.5 space-y-1.5 ${
                    isIOS
                      ? 'border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/30'
                      : 'border-stone-200 dark:border-neutral-800'
                  }`}
                >
                  <p className="font-bold text-slate-900 dark:text-neutral-100">
                    iPhone &amp; iPad (Safari)
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>
                      Tap the <strong>Share</strong> icon (square with arrow pointing up) in Safari.
                    </li>
                    <li>
                      Scroll down and tap <strong>Add to Home Screen</strong>.
                    </li>
                    <li>
                      Tap <strong>Add</strong> in the top-right corner.
                    </li>
                  </ol>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-stone-100 dark:bg-neutral-900 p-3 text-xs text-slate-600 dark:text-neutral-400">
                  <HardDriveDownload className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    IsipAgham launches like a full-screen app and caches all 66 core Physics 1–3 lessons so you can keep reviewing even offline.
                  </span>
                </div>
              </div>

              <Button fullWidth onClick={() => setShowGuide(false)}>
                Got it
              </Button>
            </Card>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <Button
        variant="outline"
        size={compact ? 'sm' : 'md'}
        icon={
          isInstallable ? (
            <Download className="h-4 w-4 shrink-0" />
          ) : (
            <Smartphone className="h-4 w-4 shrink-0" />
          )
        }
        onClick={() => {
          void handleClick();
        }}
      >
        {compact ? 'Add App' : 'Add to Home Screen'}
      </Button>

      {modal}
    </>
  );
};
