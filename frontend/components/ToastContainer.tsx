import React, { useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { Toast, useToast } from '../hooks/useToast';

/**
 * Props for the ToastContainer component
 */
interface ToastContainerProps {
  /**
   * Optional z-index for the toast container
   * @default 100
   */
  zIndex?: number;
  /**
   * Optional position for the toast container
   * @default 'top-right'
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /**
   * Optional maximum number of toasts to display
   * @default 5
   */
  maxToasts?: number;
}

/**
 * Position classes for different toast placements
 */
const POSITION_CLASSES: Record<string, string> = {
  'top-right': 'fixed top-4 right-4',
  'top-left': 'fixed top-4 left-4',
  'bottom-right': 'fixed bottom-4 right-4',
  'bottom-left': 'fixed bottom-4 left-4',
};

/**
 * Toast variant styles for different notification types
 */
const TOAST_VARIANTS: Record<'success' | 'error', string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

/**
 * ToastContainer Component
 *
 * A fixed-position container that displays toast notifications for user feedback.
 * Automatically renders active toasts from the useToast hook context.
 *
 * Features:
 * - Fixed positioning (top-right by default, configurable)
 * - Success and error variants with appropriate icons and colors
 * - Manual dismiss button with keyboard accessibility
 * - Responsive design with max-width constraints
 * - ARIA attributes for screen reader support
 * - Animation support for smooth enter/exit transitions
 *
 * @example
 * ```tsx
 * // In your App.tsx or layout component
 * import { ToastContainer } from './components/ToastContainer';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourAppContent />
 *       <ToastContainer />
 *     </>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom props
 * <ToastContainer
 *   position="bottom-right"
 *   zIndex={200}
 *   maxToasts={3}
 * />
 * ```
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  zIndex = 100,
  position = 'top-right',
  maxToasts = 5,
}) => {
  const { toasts, removeToast } = useToast();

  /**
   * Handle keyboard events for accessibility
   * Allows users to dismiss toasts using Enter or Space key
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, toastId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        removeToast(toastId);
      }
    },
    [removeToast]
  );

  /**
   * Announce new toasts to screen readers
   */
  useEffect(() => {
    if (toasts.length > 0) {
      const latestToast = toasts[toasts.length - 1];
      // Create a live region for screen readers
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.textContent = latestToast.message;
      document.body.appendChild(liveRegion);

      // Clean up the live region after announcement
      const timer = setTimeout(() => {
        document.body.removeChild(liveRegion);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [toasts]);

  // Don't render if there are no toasts
  if (toasts.length === 0) {
    return null;
  }

  // Limit the number of toasts displayed (show most recent)
  const visibleToasts = toasts.slice(-maxToasts);

  return (
    <div
      className={`${POSITION_CLASSES[position]} z-[${zIndex}] flex flex-col gap-2 pointer-events-none`}
      role="region"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Toast notifications"
    >
      {visibleToasts.map((toast: Toast) => {
        const Icon = toast.type === 'success' ? CheckCircle : AlertCircle;
        const variantClass = TOAST_VARIANTS[toast.type];

        return (
          <div
            key={toast.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
              min-w-[300px] max-w-md pointer-events-auto
              border ${variantClass}
              animate-in slide-in-from-top-2 fade-in duration-300
            `}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            {/* Icon */}
            <Icon
              className="w-5 h-5 flex-shrink-0"
              aria-hidden="true"
            />

            {/* Message */}
            <p className="flex-1 text-sm font-medium break-words">
              {toast.message}
            </p>

            {/* Close button */}
            <button
              onClick={() => removeToast(toast.id)}
              onKeyDown={(e) => handleKeyDown(e, toast.id)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-1 rounded"
              aria-label={`Dismiss notification: ${toast.message}`}
              type="button"
              tabIndex={0}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
