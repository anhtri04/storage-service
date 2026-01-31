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
