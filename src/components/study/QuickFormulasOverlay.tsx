import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Maximize2, X } from 'lucide-react';
import { FormulasGraphicIcon } from '../ui/PhysicsIcons';
import { QuickFormulasView } from './QuickFormulasView';

interface QuickFormulasOverlayProps {
  open: boolean;
  onClose: () => void;
}

export const QuickFormulasOverlay: React.FC<QuickFormulasOverlayProps> = ({
  open,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-formulas-overlay-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="liquid-glass-strong w-full sm:max-w-4xl h-[90dvh] sm:h-auto sm:max-h-[88dvh] rounded-t-[28px] sm:rounded-[28px] flex flex-col overflow-hidden shadow-2xl">
        {/* Sticky Overlay Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-900/10 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FormulasGraphicIcon className="h-8 w-8 shrink-0" />
            <div className="min-w-0">
              <h2
                id="quick-formulas-overlay-title"
                className="font-display text-base sm:text-lg font-bold text-slate-950 dark:text-white truncate"
              >
                Quick Formulas Reference
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                Physics 1, 2 &amp; 3 equations organized by topic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/formulas"
              onClick={onClose}
              className="hidden sm:inline-flex min-h-[38px] px-3.5 rounded-full border border-slate-900/10 dark:border-white/15 bg-white/75 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#007AFF] dark:hover:text-sky-400 items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Full Page</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Quick Formulas"
              className="h-9 w-9 rounded-full bg-white/75 dark:bg-white/10 border border-slate-900/10 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <QuickFormulasView compact onNavigateLesson={onClose} />
        </div>
      </div>
    </div>,
    document.body
  );
};
