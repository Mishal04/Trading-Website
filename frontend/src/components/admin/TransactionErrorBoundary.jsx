import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Error boundary specifically for the transactions section.
 * Catches any rendering errors and displays a user-friendly message.
 */
export default class TransactionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('TransactionErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg bg-red-500/15 border border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-1">
                Failed to load transactions
              </h4>
              <p className="text-xs text-red-400/80 leading-relaxed">
                An unexpected error occurred while rendering transactions. This is likely a temporary issue.
                Please try again or contact support if the problem persists.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <p className="text-xs text-red-400/60 mt-2 font-mono bg-red-950/40 p-2 rounded">
                  {this.state.error.toString()}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
