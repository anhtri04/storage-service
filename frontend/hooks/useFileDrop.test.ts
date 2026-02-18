import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileDrop } from './useFileDrop';

// Mock File for testing
const createMockFile = (name: string = 'test.pdf', type: string = 'application/pdf'): File => {
  const file = {
    name,
    size: 1024,
    type,
  } as File;
  Object.defineProperty(file, 'webkitRelativePath', { value: '', writable: false });
  return file;
};

// Mock DataTransferItemList for testing
const createMockDataTransferItemList = (files: File[]): DataTransferItemList => {
  const items: DataTransferItem[] = [];

  for (const file of files) {
    items.push({
      kind: 'file',
      getAsFile: () => file,
    } as DataTransferItem);
  }

  return {
    length: files.length,
    item: (index: number) => items[index] || null,
    [Symbol.iterator]: function* () {
      for (const item of items) {
        yield item;
      }
    }
  } as DataTransferItemList;
};

describe('useFileDrop Hook - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe('Basic functionality', () => {
    it('should initialize with isDragging false and drag handlers (happy path)', () => {
      const onDrop = vi.fn();
      const { result } = renderHook(() => useFileDrop({ onDrop }));

      expect(result.current.isDragging).toBe(false);
      expect(result.current.dragHandlers).toBeTruthy();
      expect(result.current.dragHandlers.onDragEnter).toBeTypeOf('function');
      expect(result.current.dragHandlers.onDragLeave).toBeTypeOf('function');
      expect(result.current.dragHandlers.onDragOver).toBeTypeOf('function');
      expect(result.current.dragHandlers.onDrop).toBeTypeOf('function');
    });

    it('should accept custom onDrop callback (happy path)', () => {
      const onDrop = vi.fn();
      const { result } = renderHook(() => useFileDrop({ onDrop }));

      expect(result.current.dragHandlers.onDrop).toBeTypeOf('function');
    });

    it('should support disabled option (happy path)', () => {
      const onDrop = vi.fn();
      const { result } = renderHook(() => useFileDrop({ onDrop, disabled: true }));

      expect(result.current.isDragging).toBe(false);
    });
  });

  describe('Drag state management', () => {
    it('should set isDragging to true after drag enter (happy path)', async () => {
      const onDrop = vi.fn();
      const { result } = renderHook(() => useFileDrop({ onDrop }));

      const dragEvent = new Event('dragenter', {
        bubbles: true,
        cancelable: true,
      }) as unknown as React.DragEvent;

      await act(async () => {
        result.current.dragHandlers.onDragEnter(dragEvent);
        vi.advanceTimersByTime(100); // DRAG_DEBOUNCE_MS
      });

      expect(result.current.isDragging).toBe(true);
    });

    it('should set isDragging to false after drag leave (happy path)', async () => {
      const onDrop = vi.fn();
      const { result } = renderHook(() => useFileDrop({ onDrop }));

      // First enter
      const dragEnterEvent = new Event('dragenter', {
        bubbles: true,
        cancelable: true,
      }) as unknown as React.DragEvent;

      await act(async () => {
        result.current.dragHandlers.onDragEnter(dragEnterEvent);
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isDragging).toBe(true);

      // Then leave
      const dragLeaveEvent = new Event('dragleave', {
        bubbles: true,
        cancelable: true,
      }) as unknown as React.DragEvent;

      act(() => {
        result.current.dragHandlers.onDragLeave(dragLeaveEvent);
      });

      expect(result.current.isDragging).toBe(false);
    });

    it('should not set isDragging when disabled (error case)', async () => {
      const onDrop = vi.fn();
      const { result } = renderHook(() => useFileDrop({ onDrop, disabled: true }));

      const dragEnterEvent = new Event('dragenter', {
        bubbles: true,
        cancelable: true,
      }) as unknown as React.DragEvent;

      await act(async () => {
        result.current.dragHandlers.onDragEnter(dragEnterEvent);
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isDragging).toBe(false);
    });
  });

  describe('Drop handling', () => {
    it('should handle empty file list (error case)', async () => {
      const onDropSpy = vi.fn();
      const { result } = renderHook(() => useFileDrop({ onDrop: onDropSpy }));

      const dropEvent = new Event('drop', {
        bubbles: true,
        cancelable: true,
      }) as unknown as React.DragEvent;

      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          items: createMockDataTransferItemList([]),
        },
        writable: false,
      });

      await act(async () => {
        result.current.dragHandlers.onDrop(dropEvent);
      });

      expect(onDropSpy).not.toHaveBeenCalled();
      expect(result.current.isDragging).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined dataTransfer (error case)', async () => {
      const onDropSpy = vi.fn();
      const { result } = renderHook(() => useFileDrop({ onDrop: onDropSpy }));

      const dropEvent = new Event('drop', {
        bubbles: true,
        cancelable: true,
      }) as unknown as React.DragEvent;

      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: undefined,
        writable: false,
      });

      await act(async () => {
        result.current.dragHandlers.onDrop(dropEvent);
      });

      // Should not throw
      expect(result.current.isDragging).toBe(false);
    });

    it('should handle null items in dataTransfer (error case)', async () => {
      const onDropSpy = vi.fn();
      const { result } = renderHook(() => useFileDrop({ onDrop: onDropSpy }));

      const dropEvent = new Event('drop', {
        bubbles: true,
        cancelable: true,
      }) as unknown as React.DragEvent;

      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          items: null,
        },
        writable: false,
      });

      await act(async () => {
        result.current.dragHandlers.onDrop(dropEvent);
      });

      // Should not throw
      expect(onDropSpy).not.toHaveBeenCalled();
    });

    it('should handle rapid enter/leave events (error case)', async () => {
      const onDrop = vi.fn();
      const { result } = renderHook(() => useFileDrop({ onDrop }));

      const dragEnterEvent = new Event('dragenter', {
        bubbles: true,
        cancelable: true,
      }) as unknown as React.DragEvent;

      const dragLeaveEvent = new Event('dragleave', {
        bubbles: true,
        cancelable: true,
      }) as unknown as React.DragEvent;

      await act(async () => {
        // Enter
        result.current.dragHandlers.onDragEnter(dragEnterEvent);
        // Leave immediately (before debounce)
        result.current.dragHandlers.onDragLeave(dragLeaveEvent);
      });

      // Should not throw
      expect(result.current.isDragging).toBe(false);
    });
  });

  describe('Cleanup and memory leaks', () => {
    it('should clean up timers on unmount (happy path)', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() => useFileDrop({ onDrop: vi.fn() }));

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });
});
