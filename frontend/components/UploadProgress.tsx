import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { FileUploadProgress, UploadStatus } from '../types';

/**
 * Props for the UploadProgress component
 */
interface UploadProgressProps {
  /**
   * Array of file uploads to display progress for
   */
  uploads: FileUploadProgress[];
  /**
   * Optional callback when the component is closed
   */
  onClose?: () => void;
  /**
   * Optional z-index for the upload progress container
   * @default 90
   */
  zIndex?: number;
  /**
   * Optional auto-dismiss delay in milliseconds after all uploads complete
   * @default 3000
   */
  autoDismissDelay?: number;
}

/**
 * Status icon configuration for different upload states
 */
const STATUS_ICONS: Record<
  UploadStatus,
  {
    icon: React.ElementType;
    className: string;
    ariaLabel: string;
  }
> = {
  pending: {
    icon: Clock,
    className: 'w-5 h-5 text-gray-400',
    ariaLabel: 'Pending upload',
  },
  uploading: {
    icon: Loader2,
    className: 'w-5 h-5 text-blue-500 animate-spin',
    ariaLabel: 'Uploading',
  },
  success: {
    icon: CheckCircle,
    className: 'w-5 h-5 text-green-500',
    ariaLabel: 'Upload successful',
  },
  error: {
    icon: AlertCircle,
    className: 'w-5 h-5 text-red-500',
    ariaLabel: 'Upload failed',
  },
};

/**
 * UploadProgress Component
 *
 * Displays real-time progress for multiple file uploads with individual status
 * tracking, progress bars, and automatic dismissal upon completion.
 *
 * Features:
 * - Real-time progress display for multiple simultaneous uploads
 * - Individual status icons and animated progress bars for each file
 * - Auto-dismisses after configurable delay when all uploads complete
 * - Fixed positioning at bottom-right with max-height scrollable list
 * - ARIA live region for screen reader announcements
 * - Keyboard accessibility for close button
 * - Responsive design with proper overflow handling
 *
 * Accessibility:
 * - Uses role="region" with aria-live for screen reader support
 * - Status icons include aria-label for context
 * - Close button has proper aria-label and keyboard support
 *
 * @example
 * ```tsx
 * import { UploadProgress } from './components/UploadProgress';
 * import { useFileDrop } from './hooks/useFileDrop';
 *
 * function FileUploader() {
 *   const { uploads, uploadFiles } = useFileDrop();
 *
 *   return (
 *     <>
 *       <input type="file" onChange={(e) => uploadFiles(e.target.files)} />
 *       <UploadProgress uploads={uploads} />
 *     </>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom props
 * <UploadProgress
 *   uploads={uploads}
 *   onClose={() => console.log('Closed')}
 *   zIndex={200}
 *   autoDismissDelay={5000}
 * />
 * ```
 */
export const UploadProgress: React.FC<UploadProgressProps> = ({
  uploads,
  onClose,
  zIndex = 90,
  autoDismissDelay = 3000,
}) => {
  const [shouldDismiss, setShouldDismiss] = useState(false);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Cleans up any pending timers when component unmounts
   */
  useEffect(() => {
    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, []);

  /**
   * Auto-dismiss when all uploads complete
   * Waits for all uploads to be either success or error before starting timer
   */
  useEffect(() => {
    // Clear any existing timer when uploads change
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }

    const allComplete =
      uploads.length > 0 &&
      uploads.every((u) => u.status === 'success' || u.status === 'error');

    if (allComplete) {
      // Start auto-dismiss timer only if all uploads are complete
      autoDismissTimerRef.current = setTimeout(() => {
        setShouldDismiss(true);
        onClose?.();
      }, autoDismissDelay);
    }

    // Reset shouldDismiss if new uploads are added
    if (!allComplete && shouldDismiss) {
      setShouldDismiss(false);
    }
  }, [uploads, onClose, autoDismissDelay, shouldDismiss]);

  /**
   * Announces upload progress changes to screen readers
   */
  useEffect(() => {
    if (uploads.length > 0) {
      const completedCount = uploads.filter(
        (u) => u.status === 'success' || u.status === 'error'
      ).length;
      const totalCount = uploads.length;

      if (completedCount === totalCount && totalCount > 0) {
        // All uploads complete
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        // Use inline styles for screen reader-only content to avoid Tailwind dependency
        liveRegion.style.cssText = `
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        `;
        liveRegion.textContent = `All ${totalCount} file upload(s) complete.`;
        document.body.appendChild(liveRegion);

        return () => {
          // Clean up the live region when effect cleanup runs
          if (document.body.contains(liveRegion)) {
            document.body.removeChild(liveRegion);
          }
        };
      }
    }
  }, [uploads]);

  /**
   * Handle keyboard events for accessibility
   * Allows users to close the panel using Enter or Space key
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setShouldDismiss(true);
        onClose?.();
      }
    },
    [onClose]
  );

  /**
   * Handle close button click
   */
  const handleClose = useCallback(() => {
    setShouldDismiss(true);
    onClose?.();
  }, [onClose]);

  // Don't render if there are no uploads or if dismissed
  if (uploads.length === 0 || shouldDismiss) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 w-full max-w-md"
      role="region"
      aria-label="File upload progress"
      style={{ zIndex }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">
              📤
            </span>
            <h2 className="font-semibold text-gray-900">Uploading Files...</h2>
          </div>
          {onClose && (
            <button
              onClick={handleClose}
              onKeyDown={handleKeyDown}
              className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1 rounded"
              aria-label="Close upload progress"
              type="button"
              tabIndex={0}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Upload List */}
        <div className="max-h-80 overflow-y-auto" role="list" aria-label="Upload files">
          {uploads.map((upload) => {
            const StatusIcon = STATUS_ICONS[upload.status].icon;

            return (
              <div
                key={upload.id}
                className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                role="listitem"
                aria-label={`${upload.file.name} - ${upload.status}`}
              >
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  <StatusIcon
                    className={STATUS_ICONS[upload.status].className}
                    aria-label={STATUS_ICONS[upload.status].ariaLabel}
                    aria-hidden="true"
                  />

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {upload.file.name}
                    </p>

                    {/* Progress/Status Display */}
                    <div className="flex items-center gap-2 mt-1">
                      {upload.status === 'uploading' && (
                        <>
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${upload.progress}%` }}
                              role="progressbar"
                              aria-valuenow={upload.progress}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${upload.file.name} upload progress`}
                            />
                          </div>
                          <span className="text-xs text-gray-500" aria-live="polite">
                            {upload.progress}%
                          </span>
                        </>
                      )}

                      {upload.status === 'success' && (
                        <span className="text-xs text-green-600 font-medium">
                          Complete
                        </span>
                      )}

                      {upload.status === 'error' && upload.error && (
                        <span
                          className="text-xs text-red-600 truncate"
                          role="alert"
                          aria-live="assertive"
                        >
                          {upload.error}
                        </span>
                      )}

                      {upload.status === 'pending' && (
                        <span className="text-xs text-gray-400">Queued</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with summary */}
        {uploads.length > 1 && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {uploads.filter((u) => u.status === 'success').length} of{' '}
              {uploads.length} files uploaded
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadProgress;
