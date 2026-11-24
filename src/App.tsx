import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { PageSkeleton } from './components/ui/Skeleton';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthPage } from './pages/AuthPage';

const HomePage = lazy(() => import('./pages/HomePage'));
const LessonsPage = lazy(() => import('./pages/LessonsPage'));
const LessonDetailPage = lazy(() => import('./pages/LessonDetailPage'));
const StudyPage = lazy(() => import('./pages/StudyPage'));
const VisualizerPage = lazy(() => import('./pages/VisualizerPage'));
const AiTutorPage = lazy(() => import('./pages/AiTutorPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ChecklistPage = lazy(() => import('./pages/ChecklistPage'));

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0B0B0C] p-6 max-w-5xl mx-auto">
        <PageSkeleton />
      </div>
    );
  }

  if (!user) {
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      </Routes>
    </NotificationProvider>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
