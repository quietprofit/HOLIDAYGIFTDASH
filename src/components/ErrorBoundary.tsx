import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && typeof parsed.error === 'string') {
          friendlyMessage = `Cloud sync issue (${parsed.operationType || 'operation'}): ${parsed.error}`;
        }
      } catch {
        // Keep original message
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FFFBF8] dark:bg-[#160E12] p-6">
          <div className="max-w-lg w-full bg-white dark:bg-[#21151A] border border-[#F3D8DF] dark:border-[#3A252D] rounded-2xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#FDF2F4] dark:bg-[#2C1B22] text-[#B91C1C] dark:text-[#FB7185] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-[#2B1A1E] dark:text-[#FAF5F6] mb-2">
              Something interrupted your holiday list
            </h2>
            <p className="text-sm text-[#7A5C63] dark:text-[#C4A7AF] mb-6 leading-relaxed break-words">
              {friendlyMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Planner
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
