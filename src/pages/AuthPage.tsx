import React, { useState } from 'react';
import { ShieldCheck, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import type { PhysicsCourse } from '../types';
import { AlertBanner } from '../components/ui/AlertBanner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Logo } from '../components/ui/Logo';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { PWAInstallButton } from '../components/ui/PWAInstallButton';

export const AuthPage: React.FC = () => {
  const { signInWithAccount, signUpWithAccount, signInWithGoogle, authError, clearAuthError } =
    useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [course, setCourse] = useState<PhysicsCourse>('Physics 1');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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

      <div className="flex items-center justify-between px-4 sm:px-8 py-4 max-w-6xl w-full mx-auto">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full border border-stone-200 dark:border-neutral-800 bg-white dark:bg-[#141416] text-slate-700 dark:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Intro Column */}
          <div className="space-y-5 text-center lg:text-left">
            <div className="inline-flex justify-center lg:justify-start">
              <Logo size="lg" showText={false} />
            </div>
            <div className="space-y-2.5">
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-neutral-100 text-balance">
                IsipAgham
              </h1>
              <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                Aral Physics, libre para sa lahat. Kaya mo &apos;yan!
              </p>
              <p className="text-base text-slate-600 dark:text-neutral-300 leading-relaxed max-w-md mx-auto lg:mx-0">
                A free Grade 12 Academic Track Physics study space with 47 step-by-step lessons, SM-2 spaced repetition flashcards, quizzes, interactive 3D labs, and a friendly AI tutor.
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 p-4 text-left space-y-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-neutral-100">
                <ShieldCheck className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <span>Data Privacy Act of 2012 (RA 10173)</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">
                Sign up with just a username and password (email is optional). We never ask for your full name, address, or phone number, and you can delete your account anytime.
              </p>
            </div>
          </div>

          {/* Right Auth Card */}
          <Card padding="lg" className="space-y-5">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-stone-100 dark:bg-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLocalError(null);
                  clearAuthError();
                }}
                className={`min-h-[44px] rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-[#141416] text-slate-950 dark:text-neutral-100 shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setLocalError(null);
                  clearAuthError();
                }}
                className={`min-h-[44px] rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-[#141416] text-slate-950 dark:text-neutral-100 shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100'
                }`}
              >
                Create Account
              </button>
            </div>

            {displayError && (
              <AlertBanner tone="error" title="Sign-in notice">
                {displayError}
              </AlertBanner>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    hint="Shown on the Global Leadership Board. Avoid using your full real name."
                  />

                  <Input
                    label="Email Address (Optional)"
                    type="email"
                    placeholder="Optional — leave blank if you prefer username-only"
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
                {mode === 'login' ? 'Sign In' : 'Start Learning Free (0 XP)'}
              </Button>
            </form>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-stone-200 dark:border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-[#141416] px-3 text-slate-500 dark:text-neutral-400">
                  or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              fullWidth
              disabled={submitting}
              onClick={() => {
                void handleGoogleSignIn();
              }}
            >
              Sign in with Google
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
