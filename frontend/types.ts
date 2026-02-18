// API Response wrapper from backend
export interface ApiResponse<T> {
  code: number;
  message: string;
  result?: T;
}

export interface User {
  id: number;
  email: string;
  username: string;
}

export interface FileEntry {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
  bucketId: string;
  bucketName: string;
}

export interface SelectedFileEntry extends FileEntry {
  selected: boolean;
}

export interface Bucket {
  bucketId: string;
  name: string;
  description?: string;
  createdAt: string;
  fileCount: number;
  totalSize: number;
  files?: FileEntry[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  username: string;
  email: string;
}

export interface FileUploadResponse {
  fileId: string;
  originalFileName: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
  bucketId: string;
  bucketName: string;
}

/**
 * Upload progress status for a file being uploaded.
 * - pending: File is queued and waiting to be uploaded
 * - uploading: File is currently being uploaded
 * - success: File was uploaded successfully
 * - error: File upload failed with an error
 */
export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

/**
 * Tracks the progress and status of an individual file upload.
 * Used for managing multi-file uploads with real-time progress tracking.
 */
export interface FileUploadProgress {
  /** Unique identifier for this upload operation */
  id: string;
  /** The file being uploaded */
  file: File;
  /** Current upload status */
  status: UploadStatus;
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Error message if status is 'error' */
  error?: string;
}
