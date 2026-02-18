import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast Hook - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with empty toasts array (happy path)', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should have showToast function (happy path)', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.showToast).toBeTypeOf('function');
    });

    it('should have removeToast function (happy path)', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.removeToast).toBeTypeOf('function');
    });
  });

  describe('showToast', () => {
    it('should add success toast (happy path)', async () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('Success message', 'success');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        message: 'Success message',
        type: 'success',
      });
    });

    it('should add error toast (happy path)', async () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('Error message', 'error');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        message: 'Error message',
        type: 'error',
      });
    });

    it('should add multiple toasts (happy path)', async () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('First toast', 'success');
        result.current.showToast('Second toast', 'error');
      });

      expect(result.current.toasts).toHaveLength(2);
    });

    it('should handle invalid toast type gracefully (error case)', async () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('Test message', 'invalid' as 'success' | 'error');
      });

      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('removeToast', () => {
    it('should remove toast by id (happy path)', async () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('Test message', 'success');
      });

      const id = result.current.toasts[0].id;

      act(() => {
        result.current.removeToast(id);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle removing non-existent toast id (error case)', async () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('Test message', 'success');
      });

      const initialLength = result.current.toasts.length;

      act(() => {
        result.current.removeToast('non-existent-id');
      });

      // Should not throw and array should remain same
      expect(result.current.toasts).toHaveLength(initialLength);
    });

    it('should only remove specified toast (happy path)', async () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('First toast', 'success');
        result.current.showToast('Second toast', 'error');
      });

      const idToRemove = result.current.toasts[0].id;

      act(() => {
        result.current.removeToast(idToRemove);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Second toast');
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-remove toast after 3 seconds (happy path)', async () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('Test message', 'success');
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should clear timer on unmount (happy path)', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() => useToast());

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('ID generation', () => {
    it('should generate unique IDs for each toast (happy path)', async () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('First', 'success');
        result.current.showToast('Second', 'success');
      });

      const ids = result.current.toasts.map((t: { id: string }) => t.id);
      expect(new Set(ids).size).toBe(2);
    });

    it('should generate UUID v4 format IDs (happy path)', async () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('Test', 'success');
      });

      const id = result.current.toasts[0].id;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should fallback to timestamp-based ID when crypto.randomUUID fails (error case)', async () => {
      const randomUUIDSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
        throw new Error('Not supported');
      });

      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('Test', 'success');
      });

      const id = result.current.toasts[0].id;
      expect(id).toBeTruthy();

      randomUUIDSpy.mockRestore();
    });
  });
});
