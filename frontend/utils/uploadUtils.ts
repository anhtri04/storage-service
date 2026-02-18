import { api } from '../services/api';
import { FileUploadProgress } from '../types';

/**
 * Maximum number of files to upload concurrently
 * Prevents overwhelming the server and browser with too many simultaneous requests
 */
const MAX_CONCURRENT = 3;

/**
 * Maximum allowed file size in bytes (500MB)
 * Files exceeding this limit will be rejected during validation
 */
const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Validates a file before upload to ensure it meets size requirements
 *
 * Checks if the file size exceeds the maximum allowed limit (500MB).
 * Returns null if validation passes, or an error message if validation fails.
 *
 * @param file - The File object to validate
 * @returns null if validation passes, error message string if validation fails
 *
 * @example
 * ```ts
 * const error = validateFile(myFile);
 * if (error) {
 *   console.error(error); // "File 'large.mov' (550.23MB) exceeds 500MB limit"
 * }
 * ```
 */
export const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return `File '${file.name}' (${sizeMB}MB) exceeds 500MB limit`;
  }
  return null;
};

/**
 * Upload result interface for single file uploads
 */
interface UploadResult {
  /** Indicates whether the upload was successful */
  success: boolean;
  /** Error message if upload failed */
  error?: string;
}

/**
 * Uploads a single file to the specified bucket with progress tracking
 *
 * This function handles the upload of a single file, including error handling
 * and progress reporting. It uses the API client's uploadFile method which
 * supports XMLHttpRequest-based progress tracking.
 *
 * @param file - The File object to upload
 * @param bucketId - The ID of the bucket to upload the file to
 * @param onProgress - Callback function invoked with progress percentage (0-100)
 * @returns Promise resolving to upload result with success status and optional error
 *
 * @example
 * ```ts
 * const result = await uploadSingleFile(
 *   myFile,
 *   'bucket-123',
 *   (progress) => console.log(`Upload: ${progress}%`)
 * );
 *
 * if (result.success) {
 *   console.log('Upload complete!');
 * } else {
 *   console.error('Upload failed:', result.error);
 * }
 * ```
 */
export const uploadSingleFile = async (
  file: File,
  bucketId: string,
  onProgress: (progress: number) => void
): Promise<UploadResult> => {
  try {
    const res = await api.uploadFile(bucketId, file, onProgress);
    if (res.ok) {
      return { success: true };
    } else {
      const errorData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Failed to upload ${file.name}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

/**
 * Uploads multiple files with progress tracking and batch processing
 *
 * Processes files in batches to prevent overwhelming the server and browser.
 * Each batch contains up to MAX_CONCURRENT files uploaded simultaneously.
 * Progress updates are reported for each file as it uploads.
 *
 * @param files - Array of File objects to upload
 * @param bucketId - The ID of the bucket to upload files to
 * @param onProgressUpdate - Callback invoked with progress updates for each file
 * @param getIdForFile - Function that returns a unique ID for each file (maps File to progress entry ID)
 * @returns Promise that resolves when all uploads complete (successfully or with errors)
 *
 * @example
 * ```ts
 * await uploadFilesWithProgress(
 *   files,
 *   'bucket-123',
 *   (id, progress, status, error) => {
 *     console.log(`File ${id}: ${status} - ${progress}%`);
 *   },
 *   (file) => file.name // Use filename as ID
 * );
 * ```
 */
export const uploadFilesWithProgress = async (
  files: File[],
  bucketId: string,
  onProgressUpdate: (
    id: string,
    progress: number,
    status: FileUploadProgress['status'],
    error?: string
  ) => void,
  getIdForFile: (file: File) => string
): Promise<void> => {
  // Process in batches of MAX_CONCURRENT to prevent overwhelming server
  for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
    const batch = files.slice(i, i + MAX_CONCURRENT);

    await Promise.all(
      batch.map((file) => {
        const id = getIdForFile(file);
        return uploadSingleFile(file, bucketId, (progress) => {
          onProgressUpdate(id, progress, 'uploading');
        }).then((result) => {
          if (result.success) {
            onProgressUpdate(id, 100, 'success');
          } else {
            onProgressUpdate(id, 0, 'error', result.error);
          }
        });
      })
    );
  }
};

/**
 * File size unit labels for human-readable formatting
 */
const SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

/**
 * Formats a byte count into a human-readable file size string
 *
 * Converts bytes to the most appropriate unit (Bytes, KB, MB, GB, or TB)
 * and formats the result with two decimal places for precision.
 *
 * @param bytes - The number of bytes to format
 * @returns Formatted string with unit (e.g., "1.5 MB", "256 KB")
 *
 * @example
 * ```ts
 * formatFileSize(0);              // "0 Bytes"
 * formatFileSize(1024);           // "1 KB"
 * formatFileSize(1536000);        // "1.46 MB"
 * formatFileSize(2147483648);     // "2 GB"
 * ```
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + SIZE_UNITS[i];
};

/**
 * Validates multiple files and returns validation errors
 *
 * Checks each file against size limits and returns an array of error messages
 * for files that fail validation.
 *
 * @param files - Array of File objects to validate
 * @returns Array of error messages (empty if all files are valid)
 *
 * @example
 * ```ts
 * const errors = validateFiles([file1, file2, file3]);
 * if (errors.length > 0) {
 *   errors.forEach(error => console.error(error));
 * }
 * ```
 */
export const validateFiles = (files: File[]): string[] => {
  const errors: string[] = [];

  files.forEach((file) => {
    const error = validateFile(file);
    if (error) {
      errors.push(error);
    }
  });

  return errors;
};

/**
 * Filters files to only those that pass validation
 *
 * Validates each file and returns a new array containing only valid files.
 * Collects validation errors for invalid files that can be displayed to the user.
 *
 * @param files - Array of File objects to filter
 * @returns Object containing valid files array and errors array
 *
 * @example
 * ```ts
 * const { validFiles, errors } = filterValidFiles([file1, file2, file3]);
 * if (errors.length > 0) {
 *   console.log('Some files were rejected:', errors);
 * }
 * // Only upload validFiles
 * await uploadFilesWithProgress(validFiles, ...);
 * ```
 */
export const filterValidFiles = (
  files: File[]
): { validFiles: File[]; errors: string[] } => {
  const validFiles: File[] = [];
  const errors: string[] = [];

  files.forEach((file) => {
    const error = validateFile(file);
    if (error) {
      errors.push(error);
    } else {
      validFiles.push(file);
    }
  });

  return { validFiles, errors };
};

/**
 * Calculates total size of multiple files
 *
 * Sums the size of all files in the array. Useful for displaying
 * total upload size or checking if combined size exceeds limits.
 *
 * @param files - Array of File objects
 * @returns Total size in bytes
 *
 * @example
 * ```ts
 * const totalBytes = getTotalFileSize([file1, file2]);
 * console.log(`Total: ${formatFileSize(totalBytes)}`);
 * ```
 */
export const getTotalFileSize = (files: File[]): number => {
  return files.reduce((total, file) => total + file.size, 0);
};

/**
 * Checks for duplicate file names against existing files
 *
 * Filters the provided files to identify any that have names matching
 * files already present in the destination. Useful for warning users
 * about potential overwrites before uploading.
 *
 * @param files - Array of File objects to check
 * @param existingFiles - Array of existing file objects with a 'name' property
 * @returns Array of files that would duplicate existing file names
 *
 * @example
 * ```ts
 * const duplicates = checkDuplicates(
 *   [newFile1, newFile2],
 *   [{ name: 'existing.txt' }, { name: 'another.pdf' }]
 * );
 * // Returns files whose names match existing file names
 * ```
 */
export const checkDuplicates = (
  files: File[],
  existingFiles: { name: string }[]
): File[] => {
  const existingNames = new Set(existingFiles.map((f) => f.name));
  return files.filter((file) => existingNames.has(file.name));
};
