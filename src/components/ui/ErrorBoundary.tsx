import React from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { AlertBanner } from './AlertBanner';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error) {
    console.error('IsipAgham ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          friendly = `Database access error (${parsed.operationType || 'operation'}): ${parsed.error}`;
        }
      } catch {
        // plain string message
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#EEF3FA] dark:bg-[#060913]">
          <Card className="max-w-md w-full space-y-4">
            <AlertBanner tone="error" title="Something went wrong">
              {friendly}
            </AlertBanner>
            <Button
              fullWidth
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
            >
              Reload IsipAgham
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
