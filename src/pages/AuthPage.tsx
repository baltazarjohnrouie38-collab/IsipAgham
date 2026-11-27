import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { triggerIosIsland } from '../lib/iosEffects';
import {
  evaluatePasswordStrength,
  validateEmail,
  validateUsername,
} from '../lib/authValidation';
import type { PhysicsCourse } from '../types';
import { AlertBanner } from '../components/ui/AlertBanner';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { PWAInstallButton } from '../components/ui/PWAInstallButton';
import authHeroLogoUrl from '../assets/images/isipagham_blue_logo_1795790996722.jpg';

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
  const {
    signInWithAccount,
    signUpWithAccount,
    signInWithGoogle,
    authError,
    accountDeletedNotice,
    clearAuthError,
    clearAccountDeletedNotice,
  } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [mode, setMode] = useState<'signup' | 'login'>('login');
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);

  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [course, setCourse] = useState<PhysicsCourse>('Physics 1');

  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const usernameResult = validateUsername(username);
  const passwordStrength = evaluatePasswordStrength(password, {
    username,
    email,
  });

  useEffect(() => {
    if (accountDeletedNotice) {
      setMode('login');
      setShowCredentialsForm(false);
    }
  }, [accountDeletedNotice]);

  const handleModeSwitch = (nextMode: 'signup' | 'login') => {
    setMode(nextMode);
    setLocalError(null);
    clearAuthError();
    clearAccountDeletedNotice();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();
    clearAccountDeletedNotice();

    if (mode === 'login') {
      if (!identifier.trim() || !password) {
        setLocalError('Please enter your email address and password.');
        return;
      }

      setSubmitting(true);
      try {
        await signInWithAccount({ identifier, password });
      } catch {
        // authError is populated in context
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const userCheck = validateUsername(username);
    if (!userCheck.valid) {
      setLocalError(userCheck.error || 'Please enter a valid username.');
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setLocalError(emailCheck.error || 'Please enter a valid email address.');
      return;
    }

    if (!passwordStrength.valid) {
      setLocalError(
        passwordStrength.errors[0] || 'Please choose a stronger, authentic password.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      await signUpWithAccount({
        username: userCheck.clean,
        email: emailCheck.normalized,
        password,
        course,
      });
    } catch (err) {
      if (!authError && err instanceof Error) {
        setLocalError(err.message);
      }
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

  const passwordRequirementItems = [
    { label: '8+ characters', met: passwordStrength.checks.minLength },
    { label: 'Uppercase (A-Z)', met: passwordStrength.checks.hasUpper },
    { label: 'Lowercase (a-z)', met: passwordStrength.checks.hasLower },
    { label: 'Number (0-9)', met: passwordStrength.checks.hasNumber },
    { label: 'Symbol (!@#$)', met: passwordStrength.checks.hasSpecial },
    { label: 'Unique phrase', met: passwordStrength.checks.notCommonOrPersonal },
  ];

  return (
    <div className="relative min-h-dvh text-slate-950 dark:text-slate-50 flex flex-col pb-[env(safe-area-inset-bottom)]">
      <div
        className="fixed inset-0 z-0 pointer-events-none select-none ios-app-canvas"
        aria-hidden="true"
      />

      <OfflineBanner />

      <div className="relative z-10 flex items-center justify-end gap-2 px-4 sm:px-8 pt-[max(1rem,env(safe-area-inset-top))] w-full max-w-6xl mx-auto">
        <PWAInstallButton compact />
        <button
          type="button"
          data-sound="toggle"
          onClick={() => {
            const next = !darkMode;
            toggleDarkMode();
            triggerIosIsland({
              title: next ? 'Dark Glass' : 'Light Glass',
              subtitle: 'Appearance updated',
              tone: 'blue',
            });
          }}
          aria-label={darkMode ? 'Switch to light glass' : 'Switch to dark glass'}
          className="liquid-glass min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-full transition-transform active:scale-90 cursor-pointer"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-3.5 sm:px-4 py-5 sm:py-10">
        <div className="ios-card-spring w-full max-w-[460px] liquid-glass-strong rounded-[28px] sm:rounded-[32px] p-5 sm:p-8 space-y-5 sm:space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="inline-flex items-center gap-2.5">
              <img
                src={authHeroLogoUrl}
                alt="IsipAgham mascot logo"
                className="h-11 w-11 rounded-[16px] border border-white/80 dark:border-white/15 object-cover shadow-xs"
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
              <p className="text-sm text-slate-600 dark:text-slate-300/80">
                Free Grade 12 Physics 1–3 lessons, 3D labs &amp; flashcards
              </p>
            </div>

            <div
              className="inline-flex items-center p-1 rounded-full bg-slate-900/5 dark:bg-white/10 border border-white/75 dark:border-white/15 mt-1"
              role="tablist"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => handleModeSwitch('signup')}
                className={`min-h-[38px] px-5 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  mode === 'signup'
                    ? 'liquid-lens-active'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                Sign up
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => handleModeSwitch('login')}
                className={`min-h-[38px] px-5 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  mode === 'login'
                    ? 'liquid-lens-active'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                Sign in
              </button>
            </div>
          </div>

          {accountDeletedNotice && !displayError && (
            <AlertBanner tone="success" title="Account deleted">
              {accountDeletedNotice}
            </AlertBanner>
          )}

          {displayError && (
            <AlertBanner tone="error" title="Sign-in notice">
              {displayError}
            </AlertBanner>
          )}

          {!showCredentialsForm ? (
            <div key={`options-${mode}`} className="animate-enter space-y-3.5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleGoogleSignIn();
                }}
                className={`w-full min-h-[48px] px-5 rounded-full font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 [transition-timing-function:cubic-bezier(0.22,1.25,0.36,1)] active:scale-[0.97] cursor-pointer disabled:opacity-50 ${
                  mode === 'login' ? 'liquid-btn-primary' : 'liquid-btn-outline'
                }`}
              >
                <GoogleMark />
                <span>{mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}</span>
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-900/10 dark:border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs font-semibold">
                  <span className="px-3 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-500 dark:text-slate-300">
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
                className="liquid-btn-outline w-full min-h-[48px] px-5 rounded-full text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 [transition-timing-function:cubic-bezier(0.22,1.25,0.36,1)] active:scale-[0.97] cursor-pointer disabled:opacity-50"
              >
                <Mail className="h-4 w-4 text-[#007AFF] dark:text-sky-400" aria-hidden="true" />
                <span>
                  {mode === 'login'
                    ? 'Sign in with Email & Password'
                    : 'Sign up with Email & Username'}
                </span>
              </button>
            </div>
          ) : (
            <div key={`form-${mode}`} className="animate-enter space-y-4">
              <button
                type="button"
                onClick={() => {
                  setShowCredentialsForm(false);
                  setLocalError(null);
                  clearAuthError();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#007AFF] dark:text-sky-400 hover:underline cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Back to all options</span>
              </button>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'login' ? (
                  <>
                    <Input
                      label="Email Address"
                      type="text"
                      placeholder="student@school.edu.ph"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoComplete="email"
                      hint="Use the verified email address for your account."
                      required
                    />

                    <div className="space-y-1.5">
                      <label
                        htmlFor="login-password"
                        className="block text-sm font-medium text-slate-800 dark:text-neutral-200"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                          className="w-full min-h-[44px] rounded-xl bg-white dark:bg-neutral-950 border border-stone-300 dark:border-neutral-700 px-3.5 pr-11 py-2.5 text-base sm:text-sm text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Input
                      label="Username"
                      placeholder="e.g., NewtonFan12"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={24}
                      autoComplete="username"
                      required
                      error={username.length > 0 && !usernameResult.valid ? usernameResult.error : undefined}
                      hint="3–24 characters (letters, numbers, _, ., -). Shown on the leaderboard."
                    />

                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="student@school.edu.ph"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />

                    <div className="space-y-2">
                      <label
                        htmlFor="signup-password"
                        className="block text-sm font-medium text-slate-800 dark:text-neutral-200"
                      >
                        Authentic Password
                      </label>
                      <div className="relative">
                        <input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a strong password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          minLength={8}
                          required
                          className="w-full min-h-[44px] rounded-xl bg-white dark:bg-neutral-950 border border-stone-300 dark:border-neutral-700 px-3.5 pr-11 py-2.5 text-base sm:text-sm text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-1.5 pt-0.5">
                        {passwordRequirementItems.map((item) => (
                          <div
                            key={item.label}
                            className={`flex items-center gap-1.5 text-[11px] font-medium ${
                              item.met
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-neutral-400'
                            }`}
                          >
                            {item.met ? (
                              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            ) : (
                              <X className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                            )}
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="signup-confirm-password"
                        className="block text-sm font-medium text-slate-800 dark:text-neutral-200"
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          id="signup-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                          className={`w-full min-h-[44px] rounded-xl bg-white dark:bg-neutral-950 border px-3.5 pr-11 py-2.5 text-base sm:text-sm text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 transition-colors ${
                            confirmPassword && confirmPassword !== password
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-stone-300 dark:border-neutral-700 focus:ring-blue-600 focus:border-blue-600'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {confirmPassword && confirmPassword !== password && (
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                          Passwords do not match.
                        </p>
                      )}
                    </div>

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

                <Button type="submit" fullWidth size="lg" loading={submitting}>
                  {mode === 'login' ? 'Sign in' : 'Create Account'}
                </Button>
              </form>
            </div>
          )}

          <div className="pt-2 border-t border-slate-900/10 dark:border-white/10 flex items-start gap-2 text-left">
            <ShieldCheck
              className="h-4 w-4 text-[#007AFF] dark:text-sky-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-[11px] text-slate-600 dark:text-slate-300/80 leading-relaxed">
              RA 10173 Privacy: Your email is used only to verify your account and sign you in. We never ask for your full real name, phone number, or home address, and you can delete your account anytime.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
