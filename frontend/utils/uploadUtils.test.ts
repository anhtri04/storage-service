import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateFile, formatFileSize, getTotalFileSize, checkDuplicates } from './uploadUtils';

// Mock File object for testing
const createMockFile = (name: string, size: number, type = 'application/pdf'): File => {
  const file = {
    name,
    size,
    type,
    lastModified: 0,
  } as File;

  // Mock webkit cast
  Object.defineProperty(file, 'webkitRelativePath', { value: '', writable: false });
  return file;
};

describe('uploadUtils - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should return null for valid file under 500MB (happy path)', () => {
      const file = createMockFile('test.pdf', 100 * 1024 * 1024); // 100MB
      const result = validateFile(file);
      expect(result).toBeNull();
    });

    it('should return error for file exactly 500MB (boundary case)', () => {
      const file = createMockFile('exact500.pdf', 500 * 1024 * 1024);
      const result = validateFile(file);
      expect(result).toBeNull();
    });

    it('should return error for file exceeding 500MB (error case)', () => {
      const file = createMockFile('large.mov', 501 * 1024 * 1024);
      const result = validateFile(file);
      expect(result).toBe("File 'large.mov' (501.00MB) exceeds 500MB limit");
    });

    it('should return error for zero size file (error case)', () => {
      const file = createMockFile('zero.pdf', 0);
      const result = validateFile(file);
      expect(result).toBeNull(); // 0 bytes is allowed
    });

    it('should return error for empty file name (error case)', () => {
      const file = createMockFile('', 100);
      const result = validateFile(file);
      expect(result).toBeNull(); // Empty name is allowed
    });
  });

  describe('formatFileSize', () => {
    it('should format 0 bytes as "0 Bytes" (happy path)', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format 500 bytes as "500 Bytes" (happy path)', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('should format 1024 bytes as "1 KB" (happy path)', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('should format 1536 bytes as "1.5 KB" (happy path)', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format 1 MB correctly (happy path)', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    });

    it('should format 2.5 MB correctly (happy path)', () => {
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });

    it('should format 1 GB correctly (happy path)', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format 5 TB correctly (happy path)', () => {
      expect(formatFileSize(5 * 1024 * 1024 * 1024)).toBe('5 TB');
    });
  });

  describe('getTotalFileSize', () => {
    it('should sum sizes of multiple files (happy path)', () => {
      const file1 = createMockFile('test1.pdf', 1024);
      const file2 = createMockFile('test2.pdf', 2048);
      const file3 = createMockFile('test3.pdf', 512);

      const total = getTotalFileSize([file1, file2, file3]);
      expect(total).toBe(1024 + 2048 + 512);
    });

    it('should return 0 for empty array (boundary case)', () => {
      expect(getTotalFileSize([])).toBe(0);
    });

    it('should return size for single file (happy path)', () => {
      const file = createMockFile('test.pdf', 4096);
      expect(getTotalFileSize([file])).toBe(4096);
    });
  });

  describe('checkDuplicates', () => {
    it('should return empty array when no duplicates (happy path)', () => {
      const newFiles = [
        createMockFile('newfile1.pdf', 1024),
        createMockFile('newfile2.jpg', 2048),
      ];

      const existingFiles = [
        { name: 'existing.pdf' },
        { name: 'existing.jpg' },
      ];

      const duplicates = checkDuplicates(newFiles, existingFiles as any);
      expect(duplicates).toEqual([]);
    });

    it('should find one duplicate (happy path - one match)', () => {
      const newFiles = [
        createMockFile('existing.pdf', 1024),
        createMockFile('newfile.jpg', 2048),
      ];

      const existingFiles = [
        { name: 'existing.pdf' },
        { name: 'other.png' },
      ];

      const duplicates = checkDuplicates(newFiles, existingFiles as any);
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].name).toBe('existing.pdf');
    });

    it('should find multiple duplicates (happy path)', () => {
      const newFiles = [
        createMockFile('file1.pdf', 1024),
        createMockFile('file2.jpg', 2048),
        createMockFile('file3.png', 512),
      ];

      const existingFiles = [
        { name: 'file1.pdf' },
        { name: 'file2.jpg' },
        { name: 'file3.png' },
      ];

      const duplicates = checkDuplicates(newFiles, existingFiles as any);
      expect(duplicates).toHaveLength(3);
    });

    it('should be case sensitive (happy path)', () => {
      const newFiles = [
        createMockFile('FILE.pdf', 1024),
        createMockFile('file.pdf', 2048),
      ];

      const existingFiles = [
        { name: 'file.pdf' },
      ];

      const duplicates = checkDuplicates(newFiles, existingFiles as any);
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].name).toBe('file.pdf');
    });

    it('should handle empty new files array (boundary case)', () => {
      const existingFiles = [
        { name: 'existing.pdf' },
      ];

      const duplicates = checkDuplicates([], existingFiles as any);
      expect(duplicates).toEqual([]);
    });

    it('should handle empty existing files array (boundary case)', () => {
      const newFiles = [
        createMockFile('newfile.pdf', 1024),
      ];

      const duplicates = checkDuplicates(newFiles, []);
      expect(duplicates).toEqual([]);
    });
  });
});
