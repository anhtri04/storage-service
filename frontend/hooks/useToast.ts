import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Default auto-dismiss duration for toast notifications (in milliseconds)
 */
const TOAST_AUTO_DISMISS_MS = 3000;

/**
 * Supported toast notification types
 */
export type ToastType = 'success' | 'error';

/**
 * Toast notification interface
 */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

/**
 * Generates a unique ID for toast notifications with fallback for older browsers
 * @returns A unique identifier string
 */
const generateId = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};

/**
 * Custom hook for managing toast notifications
 * @returns Object containing toast state and methods for showing/removing toasts
 *
 * @example
 * const { toasts, showToast, removeToast } = useToast();
 * showToast('success', 'Operation completed successfully');
 */
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  /**
   * Cleans up all active timers when component unmounts
   */
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  /**
   * Shows a toast notification with auto-dismiss functionality
   * @param type - The type of toast to display ('success' or 'error')
   * @param message - The message content to display
   */
  const showToast = useCallback((type: ToastType, message: string) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, type, message }]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(timer);
    }, TOAST_AUTO_DISMISS_MS);

    timersRef.current.add(timer);
  }, []);

  /**
   * Manually removes a toast notification by its ID
   * @param id - The unique identifier of the toast to remove
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
};
