import React, { useState } from 'react';
import { ArrowLeft, Mail, Moon, ShieldCheck, Sun, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import type { PhysicsCourse } from '../types';
import { AlertBanner } from '../components/ui/AlertBanner';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { PWAInstallButton } from '../components/ui/PWAInstallButton';
import authHeroLogoUrl from '../assets/images/regenerated_image_1795555562184.jpg';

const GoogleMark: React.FC = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29V6.61H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4-3.1Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4 3.1C6.23 6.87 8.88 4.76 12 4.76Z"
    />
  </svg>
);

export const AuthPage: React.FC = () => {
  const { signInWithAccount, signUpWithAccount, signInWithGoogle, authError, clearAuthError } =
    useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [mode, setMode] = useState<'signup' | 'login'>('login');
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [course, setCourse] = useState<PhysicsCourse>('Physics 1');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleModeSwitch = (nextMode: 'signup' | 'login') => {
    setMode(nextMode);
    setLocalError(null);
    clearAuthError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (mode === 'login') {
      if (!identifier.trim() || !password) {
        setLocalError('Please enter your username (or email) and password.');
        return;
      }
    } else {
      const cleanUser = username.trim();
      if (cleanUser.length < 2 || cleanUser.length > 24) {
        setLocalError('Username must be between 2 and 24 characters.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithAccount({ identifier, password });
      } else {
        await signUpWithAccount({
          username,
          password,
          email: email.trim() || undefined,
          course,
        });
      }
    } catch {
      // authError is already populated in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearAuthError();
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      // handled in context
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0B0B0C] text-slate-900 dark:text-neutral-100 flex flex-col">
      <OfflineBanner />

      <div className="flex items-center justify-end gap-2 px-4 sm:px-8 pt-4 w-full max-w-6xl mx-auto">
        <PWAInstallButton compact />
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-full border border-stone-200 dark:border-neutral-800 bg-white dark:bg-[#141416] text-slate-700 dark:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-800 cursor-pointer"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-[440px] rounded-3xl bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)] p-6 sm:p-9 space-y-6">
          {/* Centered Brand + Headline */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="inline-flex items-center gap-2.5">
              <img
                src={authHeroLogoUrl}
                alt="IsipAgham mascot logo"
                className="h-10 w-10 rounded-xl object-cover shadow-xs"
                referrerPolicy="no-referrer"
              />
              <span className="font-display text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                IsipAgham
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="font-display text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-950 dark:text-white">
                Let&apos;s get started!
              </h1>
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                Free Grade 12 Physics 1–3 lessons, 3D labs &amp; flashcards
              </p>
            </div>

            {/* Centered Pill Switcher */}
            <div
              className="inline-flex items-center p-1 rounded-full bg-stone-100 dark:bg-neutral-800/90 border border-stone-200/70 dark:border-neutral-700/70 mt-1"
              role="tablist"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => handleModeSwitch('signup')}
                className={`min-h-[38px] px-5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-[#141416] text-slate-950 dark:text-white shadow-xs ring-1 ring-slate-900/15 dark:ring-white/20'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100'
                }`}
              >
                Sign up
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => handleModeSwitch('login')}
                className={`min-h-[38px] px-5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-[#141416] text-slate-950 dark:text-white shadow-xs ring-1 ring-slate-900/15 dark:ring-white/20'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100'
                }`}
              >
                Sign in
              </button>
            </div>
          </div>

          {displayError && (
            <AlertBanner tone="error" title="Sign-in notice">
              {displayError}
            </AlertBanner>
          )}

          {!showCredentialsForm ? (
            <div className="space-y-3.5">
              {/* Primary Google Option */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleGoogleSignIn();
                }}
                className={`w-full min-h-[48px] px-5 rounded-full font-semibold text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-50 ${
                  mode === 'login'
                    ? 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500'
                    : 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 border border-stone-200 dark:border-neutral-700 hover:bg-stone-50 dark:hover:bg-neutral-800'
                }`}
              >
                <GoogleMark />
                <span>{mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}</span>
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-stone-200 dark:border-neutral-800" />
                </div>
                <div className="relative flex justify-center text-xs font-semibold">
                  <span className="bg-white dark:bg-[#141416] px-3 text-slate-500 dark:text-neutral-400">
                    Other options
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setLocalError(null);
                  clearAuthError();
                  setShowCredentialsForm(true);
                }}
                className="w-full min-h-[48px] px-5 rounded-full border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 hover:bg-stone-50 dark:hover:bg-neutral-800 text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Mail className="h-4 w-4 text-slate-700 dark:text-neutral-300" aria-hidden="true" />
                <span>
                  {mode === 'login'
                    ? 'Sign in with Email or Username'
                    : 'Sign up with Username or Email'}
                </span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  handleModeSwitch('signup');
                  setShowCredentialsForm(true);
                }}
                className="w-full min-h-[48px] px-5 rounded-full border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 hover:bg-stone-50 dark:hover:bg-neutral-800 text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <User className="h-4 w-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <span>Create Free Username-Only Account</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setShowCredentialsForm(false);
                  setLocalError(null);
                  clearAuthError();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Back to all options</span>
              </button>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'login' ? (
                  <Input
                    label="Username or Email"
                    type="text"
                    placeholder="e.g., NewtonFan12 or student@school.edu.ph"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    required
                  />
                ) : (
                  <>
                    <Input
                      label="Username"
                      placeholder="e.g., NewtonFan12"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={24}
                      required
                      hint="Shown on the Global Leadership Board. Avoid your full real name."
                    />

                    <Input
                      label="Email Address (Optional)"
                      type="email"
                      placeholder="Optional — leave blank for username-only"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />

                    <Select
                      label="Your Physics Course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value as PhysicsCourse)}
                    >
                      <option value="Physics 1">Physics 1 (Kinematics &amp; Dynamics)</option>
                      <option value="Physics 2">Physics 2 (Gravity, Fluids &amp; Thermodynamics)</option>
                      <option value="Physics 3">Physics 3 (Electricity, Magnetism &amp; Optics)</option>
                    </Select>
                  </>
                )}

                <Input
                  label="Password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={6}
                  required
                />

                <Button type="submit" fullWidth size="lg" loading={submitting}>
                  {mode === 'login' ? 'Sign in' : 'Start Learning Free (0 XP)'}
                </Button>
              </form>
            </div>
          )}

          <div className="pt-2 border-t border-stone-200/80 dark:border-neutral-800 flex items-start gap-2 text-left">
            <ShieldCheck
              className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
              RA 10173 Privacy: Email is optional. We never ask for your full name, phone number, or home address, and you can delete your account anytime.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
