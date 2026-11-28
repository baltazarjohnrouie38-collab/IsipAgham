import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ShieldCheck, Trophy, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AlertBanner } from '../ui/AlertBanner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { UserAvatar } from '../ui/UserAvatar';

interface JoinLeaderboardModalProps {
  open: boolean;
  onClose: () => void;
  onJoined?: () => void;
}

export const JoinLeaderboardModal: React.FC<JoinLeaderboardModalProps> = ({
  open,
  onClose,
  onJoined,
}) => {
  const { profile, joinGlobalLeaderboard } = useAuth();
  const [nickname, setNickname] = useState(profile?.nickname || profile?.username || '');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNickname(profile?.nickname || profile?.username || '');
      setAcceptedPrivacy(false);
      setError(null);
    }
  }, [open, profile?.nickname, profile?.username]);

  if (!open || typeof document === 'undefined') return null;

  const trimmed = nickname.trim();
  const isNameValid = trimmed.length >= 2 && trimmed.length <= 24;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isNameValid) {
      setError('Please enter a leaderboard username between 2 and 24 characters.');
      return;
    }
    if (!acceptedPrivacy) {
      setError('Please confirm that you want to activate your public leaderboard visibility.');
      return;
    }
    setSubmitting(true);
    try {
      await joinGlobalLeaderboard(trimmed);
      onJoined?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join Global Leadership Board.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-leaderboard-modal-title"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <Card
        padding="md"
        className="animate-pop w-full max-w-md max-h-[88dvh] overflow-y-auto space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="join-leaderboard-modal-title"
                className="font-display text-lg font-bold text-slate-950 dark:text-white"
              >
                Join Global Leaderboard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Activate to share your Physics XP &amp; rank worldwide
              </p>
            </div>
          </div>

          {!submitting && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Join Global Leaderboard dialog"
              className="min-h-[36px] min-w-[36px] rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Preview of how the student will appear */}
        <div className="rounded-2xl border border-blue-200/80 dark:border-blue-500/25 bg-blue-50/70 dark:bg-blue-950/35 p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              name={trimmed || 'Student'}
              avatarUrl={profile?.avatarUrl}
              size="md"
              tone="primary"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-950 dark:text-white truncate">
                {trimmed || 'Student'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Preview on Global Leadership Board
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-white/10 text-blue-800 dark:text-blue-300 text-xs font-bold tabular-nums shrink-0">
            {(profile?.xp ?? 0).toLocaleString()} XP
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <AlertBanner tone="error" title="Could not activate">
              {error}
            </AlertBanner>
          )}

          <Input
            label="Public Leaderboard Username"
            placeholder="e.g., NewtonFan12"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            minLength={2}
            maxLength={24}
            required
            hint="2–24 characters. Avoid using your full real name."
          />

          <div className="rounded-xl border border-stone-200/90 dark:border-white/10 bg-[#FAF9F6] dark:bg-white/[0.03] p-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              <span>RA 10173 Privacy Guarantee</span>
            </div>
            <p className="leading-relaxed">
              Only your username, avatar, and XP score appear on the board. Your email address, notes, flashcards, and quizzes always remain private, and you can leave anytime.
            </p>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] cursor-pointer select-none min-h-[44px]">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-blue-700 cursor-pointer shrink-0"
            />
            <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
              Activate my Global Leadership Board entry using this username and current XP.
            </span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={!isNameValid || !acceptedPrivacy}
              icon={<Check className="h-4 w-4" />}
            >
              Activate &amp; Join
            </Button>
          </div>
        </form>
      </Card>
    </div>,
    document.body
  );
};
