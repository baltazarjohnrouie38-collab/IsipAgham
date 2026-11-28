import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { ArrowLeft, Moon, Sigma, Sun } from 'lucide-react';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { IosAuthTransition } from './components/ui/IosAuthTransition';
import { IosDynamicIsland } from './components/ui/IosDynamicIsland';
import { IosLaunchEffect } from './components/ui/IosLaunchEffect';
import { Logo } from './components/ui/Logo';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { PageSkeleton } from './components/ui/Skeleton';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useIosInteractiveEffects } from './lib/iosEffects';
import { useGlobalClickSound } from './lib/sound';
import { AuthPage } from './pages/AuthPage';

const loadLessonsPage = () => import('./pages/LessonsPage');
const loadLessonDetailPage = () => import('./pages/LessonDetailPage');
const loadFormulasPage = () => import('./pages/FormulasPage');

const HomePage = lazy(() => import('./pages/HomePage'));
const LessonsPage = lazy(loadLessonsPage);
const LessonDetailPage = lazy(loadLessonDetailPage);
const FormulasPage = lazy(loadFormulasPage);
const StudyPage = lazy(() => import('./pages/StudyPage'));
const VisualizerPage = lazy(() => import('./pages/VisualizerPage'));
const AiTutorPage = lazy(() => import('./pages/AiTutorPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ChecklistPage = lazy(() => import('./pages/ChecklistPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

const OfflineGuestLessonShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className="relative min-h-dvh text-slate-950 dark:text-slate-50 flex flex-col">
      <div
        className="fixed inset-0 z-0 pointer-events-none select-none ios-app-canvas"
        aria-hidden="true"
      />
      <OfflineBanner />
      <header className="relative z-20 mx-3 sm:mx-6 md:mx-auto md:w-[calc(100%-3rem)] max-w-5xl mt-3 h-13 liquid-glass rounded-full px-3 sm:px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#007AFF] dark:text-sky-400 hover:underline px-2 py-1.5 rounded-full"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Sign In</span>
          </Link>
          <Logo size="sm" />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            to="/formulas"
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-white/10 border border-white/70 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#007AFF] dark:hover:text-sky-400 transition-colors shrink-0"
          >
            <Sigma className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Formulas</span>
          </Link>
          <button
            type="button"
            data-sound="toggle"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light glass' : 'Switch to dark glass'}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-white/60 dark:bg-white/10 border border-white/70 dark:border-white/15 text-slate-700 dark:text-slate-200 transition-transform active:scale-90 cursor-pointer shrink-0"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 pb-12">
        {children}
      </main>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  const isOnline = useOnlineStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#000000] p-6 max-w-5xl mx-auto">
        <PageSkeleton />
      </div>
    );
  }

  if (!user) {
    if (!isOnline) {
      return (
        <Routes>
          <Route
            path="/lessons"
            element={
              <OfflineGuestLessonShell>
                <Suspense fallback={<PageSkeleton />}>
                  <LessonsPage />
                </Suspense>
              </OfflineGuestLessonShell>
            }
          />
          <Route
            path="/lessons/:lessonId"
            element={
              <OfflineGuestLessonShell>
                <Suspense fallback={<PageSkeleton />}>
                  <LessonDetailPage />
                </Suspense>
              </OfflineGuestLessonShell>
            }
          />
          <Route
            path="/formulas"
            element={
              <OfflineGuestLessonShell>
                <Suspense fallback={<PageSkeleton />}>
                  <FormulasPage />
                </Suspense>
              </OfflineGuestLessonShell>
            }
          />
          <Route path="*" element={<AuthPage />} />
        </Routes>
      );
    }
    return <AuthPage />;
  }

  return (
    <NotificationProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <HomePage />
              </Suspense>
            }
          />
          <Route
            path="/lessons"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <LessonsPage />
              </Suspense>
            }
          />
          <Route
            path="/lessons/:lessonId"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <LessonDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/formulas"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <FormulasPage />
              </Suspense>
            }
          />
          <Route
            path="/study"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <StudyPage />
              </Suspense>
            }
          />
          <Route
            path="/visualizer"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <VisualizerPage />
              </Suspense>
            }
          />
          <Route
            path="/ai"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <AiTutorPage />
              </Suspense>
            }
          />
          <Route
            path="/profile"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ProfilePage />
              </Suspense>
            }
          />
          <Route
            path="/checklist"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ChecklistPage />
              </Suspense>
            }
          />
          <Route
            path="/notifications"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <NotificationsPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </NotificationProvider>
  );
};

export default function App() {
  useGlobalClickSound();
  useIosInteractiveEffects();

  useEffect(() => {
    document.title = 'IsipAgham';

    // Warm the core lesson chunks while online so offline lesson & formula review works immediately
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const timer = window.setTimeout(() => {
        void loadLessonsPage().catch(() => undefined);
        void loadLessonDetailPage().catch(() => undefined);
        void loadFormulasPage().catch(() => undefined);
      }, 1200);
      return () => window.clearTimeout(timer);
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <IosLaunchEffect />
          <IosAuthTransition />
          <IosDynamicIsland />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
