import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Default debounce delay for drag state updates (in milliseconds)
 * Prevents flickering when dragging over nested elements
 */
const DRAG_DEBOUNCE_MS = 100;

/**
 * Configuration options for useFileDrop hook
 */
export interface UseFileDropOptions {
  /** Callback invoked when files are dropped */
  onDrop: (files: File[]) => void;
  /** Whether drag & drop functionality is disabled */
  disabled?: boolean;
  /**
   * Accepted file types (MIME types or extensions)
   * Examples: ['image/*', '.pdf', 'application/json']
   */
  acceptedTypes?: string[];
}

/**
 * Drag event handlers returned by useFileDrop hook
 */
export interface DragHandlers {
  /** Handles drag enter events */
  onDragEnter: (e: React.DragEvent) => void;
  /** Handles drag leave events */
  onDragLeave: (e: React.DragEvent) => void;
  /** Handles drag over events */
  onDragOver: (e: React.DragEvent) => void;
  /** Handles drop events */
  onDrop: (e: React.DragEvent) => void;
}

/**
 * Return type for useFileDrop hook
 */
export interface UseFileDropReturn {
  /** Indicates whether files are currently being dragged over the element */
  isDragging: boolean;
  /** Event handlers to attach to drop zone element */
  dragHandlers: DragHandlers;
}

/**
 * Filters files based on accepted types
 * @param files - FileList to filter
 * @param acceptedTypes - Array of accepted MIME types or extensions
 * @returns Filtered array of File objects
 */
const filterFilesByType = (files: FileList, acceptedTypes: string[]): File[] => {
  const fileArray = Array.from(files);

  return fileArray.filter((file) => {
    return acceptedTypes.some((type) => {
      // Handle wildcard MIME types (e.g., 'image/*')
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -2));
      }
      // Handle exact MIME type match
      if (file.type === type) {
        return true;
      }
      // Handle file extension match (e.g., '.pdf', '.jpg')
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return false;
    });
  });
};

/**
 * Custom hook for handling file drag & drop functionality
 *
 * Features:
 * - HTML5 drag & drop API integration
 * - Debounced drag state to prevent flickering
 * - File type filtering support
 * - Proper cleanup of timers
 * - Nested element handling with drag counter
 *
 * @param options - Configuration options for the hook
 * @returns Object containing drag state and event handlers
 *
 * @example
 * ```tsx
 * const { isDragging, dragHandlers } = useFileDrop({
 *   onDrop: (files) => console.log('Dropped files:', files),
 *   acceptedTypes: ['image/*', '.pdf', 'application/json'],
 * });
 *
 * return (
 *   <div {...dragHandlers} className={isDragging ? 'dragging' : ''}>
 *     Drop files here
 *   </div>
 * );
 * ```
 */
export const useFileDrop = (options: UseFileDropOptions): UseFileDropReturn => {
  const { onDrop, disabled = false, acceptedTypes } = options;

  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  /**
   * Cleanup effect: clears any pending debounce timers
   * Ensures no memory leaks or stale state updates
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Processes dropped files, filtering by accepted types if specified
   */
  const processFiles = useCallback(
    (files: FileList | null): File[] => {
      if (!files) return [];

      const fileArray = Array.from(files);

      // Filter by accepted types if specified
      if (acceptedTypes && acceptedTypes.length > 0) {
        return filterFilesByType(files, acceptedTypes);
      }

      return fileArray;
    },
    [acceptedTypes]
  );

  /**
   * Handles drag enter events
   * Increments drag counter to handle nested elements
   * Debounces state update to prevent flickering
   */
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current++;

      // Clear existing timer to prevent state inconsistencies
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce to prevent flickering when dragging over nested elements
      debounceTimerRef.current = setTimeout(() => {
        setIsDragging(true);
      }, DRAG_DEBOUNCE_MS);
    },
    [disabled]
  );

  /**
   * Handles drag leave events
   * Decrements drag counter and resets state when counter reaches zero
   * Ensures all nested elements have been exited before clearing drag state
   */
  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current--;

      // Only reset dragging state when we've exited all nested elements
      if (dragCounterRef.current === 0) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        setIsDragging(false);
      }
    },
    [disabled]
  );

  /**
   * Handles drag over events
   * Prevents default browser behavior (opening files)
   * Required to enable dropping
   */
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();
    },
    [disabled]
  );

  /**
   * Handles drop events
   * Extracts files from drop event, filters by accepted types,
   * and invokes the onDrop callback
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      // Reset drag state
      dragCounterRef.current = 0;
      setIsDragging(false);

      // Clear any pending timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const files: File[] = [];
      const items = e.dataTransfer.items;

      if (items) {
        // Use DataTransferItemList for better file filtering
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
              files.push(file);
            }
          }
        }
      } else {
        // Fallback to files property for older browsers
        const droppedFiles = processFiles(e.dataTransfer.files);
        files.push(...droppedFiles);
      }

      // Apply type filtering if acceptedTypes is specified
      // Convert File[] back to FileList for filtering if needed
      let filteredFiles = files;
      if (acceptedTypes && acceptedTypes.length > 0) {
        // Create a mock FileList object for the filter function
        const mockFileList = {
          length: files.length,
          item: (index: number) => files[index] || null,
          [Symbol.iterator]: function* () {
            for (const file of files) {
              yield file;
            }
          },
        } as FileList;

        filteredFiles = filterFilesByType(mockFileList, acceptedTypes);
      }

      if (filteredFiles.length > 0) {
        onDrop(filteredFiles);
      }
    },
    [disabled, onDrop, processFiles, acceptedTypes]
  );

  return {
    isDragging,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
};
