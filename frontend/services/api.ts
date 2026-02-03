
import { ApiResponse, AuthResponse, Bucket, FileUploadResponse } from '../types';

const BASE_URL = 'http://localhost:8080/api';

class ApiClient {
  private static instance: ApiClient;
  private accessToken: string | null = localStorage.getItem('access_token');

  private constructor() { }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  clearTokens() {
    this.accessToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers,
      credentials: 'include'
    });

    if (response.status === 401) {
      // Attempt token refresh
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const apiResponse: ApiResponse<AuthResponse> = await refreshRes.json();
          if (apiResponse.result) {
            this.setTokens(apiResponse.result.accessToken, apiResponse.result.refreshToken);

            // Retry original request
            headers.set('Authorization', `Bearer ${this.accessToken}`);
            return fetch(`${BASE_URL}${url}`, { ...options, headers });
          }
        }
      }
      this.clearTokens();
      window.location.hash = '#/login';
    }

    return response;
  }

  // Auth
  async login(credentials: { username: string; password: string }) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (res.ok) {
      const apiResponse: ApiResponse<AuthResponse> = await res.json();
      if (apiResponse.result) {
        this.setTokens(apiResponse.result.accessToken, apiResponse.result.refreshToken);
        localStorage.setItem('username', credentials.username);
      }
    }

    return res;
  }

  async register(data: { username: string; email: string; password: string }) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res;
  }

  async logout() {
    const username = localStorage.getItem('username');
    const res = await this.fetchWithAuth('/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username || '' }),
    });
    this.clearTokens();
    return res;
  }

  // Buckets
  async getBuckets() {
    return this.fetchWithAuth('/buckets');
  }

  async createBucket(data: { name: string; description: string }) {
    return this.fetchWithAuth('/buckets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getBucketById(bucketId: string) {
    return this.fetchWithAuth(`/buckets/${bucketId}`);
  }

  async updateBucket(bucketId: string, data: { name: string; description: string }) {
    return this.fetchWithAuth(`/buckets/${bucketId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async deleteBucket(bucketId: string) {
    return this.fetchWithAuth(`/buckets/${bucketId}`, { method: 'DELETE' });
  }

  // TODO: Future feature - Share bucket functionality
  async shareBucket(bucketId: string) {
    // Placeholder for future implementation
    return this.fetchWithAuth(`/buckets/${bucketId}/share`, { method: 'POST' });
  }

  // Files
  async uploadFile(bucketId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucketId', bucketId);
    return this.fetchWithAuth('/files/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async downloadFile(fileId: string) {
    return this.fetchWithAuth(`/files/download/${fileId}`);
  }

  /**
   * Get preview URL for a file using token-based authentication.
   * This URL can be used in iframes to display PDFs, images, etc.
   * The token is passed as a query parameter to bypass browser extension interference.
   */
  getPreviewUrl(fileId: string): string {
    const token = this.accessToken;
    if (!token) {
      throw new Error('No access token available');
    }
    return `${BASE_URL}/files/preview/${fileId}?token=${encodeURIComponent(token)}`;
  }

  /**
   * Get file preview data as base64.
   * Returns JSON with base64 data and content type.
   * This approach bypasses download managers like IDM.
   */
  async getPreviewData(fileId: string): Promise<{ data: string; contentType: string; fileName: string } | null> {
    try {
      const res = await this.fetchWithAuth(`/files/preview-data/${fileId}`);
      const json = await res.json();
      console.log('Preview data response:', json);
      if (json.code === 200 && json.result) {
        return json.result;
      }
      console.error('Preview data error:', json.message);
      return null;
    } catch (e) {
      console.error('Error fetching preview data:', e);
      return null;
    }
  }

  /**
   * Convert DOCX to PDF and get as base64.
   * Server-side conversion for accurate Word document rendering.
   */
  async getDocxAsPdf(fileId: string): Promise<{ data: string; contentType: string; fileName: string } | null> {
    try {
      const res = await this.fetchWithAuth(`/files/preview-docx-as-pdf/${fileId}`);
      const json = await res.json();
      console.log('DOCX to PDF response:', json);
      if (json.code === 200 && json.result) {
        return json.result;
      }
      console.error('DOCX to PDF error:', json.message);
      return null;
    } catch (e) {
      console.error('Error converting DOCX to PDF:', e);
      return null;
    }
  }

  async deleteFile(fileId: string) {
    return this.fetchWithAuth(`/files/${fileId}`, { method: 'DELETE' });
  }

  async deleteMultipleFiles(fileIds: string[]): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    if (!fileIds || fileIds.length === 0) {
      return results;
    }

    for (const fileId of fileIds) {
      try {
        const res = await this.deleteFile(fileId);
        if (res.ok) {
          results.success.push(fileId);
        } else {
          results.failed.push(fileId);
        }
      } catch (e) {
        results.failed.push(fileId);
      }
    }

    return results;
  }

  async downloadFilesAsZip(fileIds: string[], fileNames: string[]): Promise<void> {
    if (!fileIds || fileIds.length === 0) {
      return;
    }

    try {
      const res = await this.fetchWithAuth('/files/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds })
      });

      if (!res.ok) {
        throw new Error(`Failed to download ZIP: HTTP ${res.status} ${res.statusText}`);
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Received empty ZIP file');
      }

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Extract filename from Content-Disposition header or use default
      const disposition = res.headers.get('Content-Disposition');
      let filename = `files-${new Date().toISOString().slice(0, 10)}.zip`;
      if (disposition) {
        const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log(`ZIP downloaded successfully: ${blob.size} bytes`);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to download ZIP:', error);
      throw new Error(`Failed to download files as ZIP: ${message}`);
    }
  }

  async downloadFilesIndividually(fileIds: string[], fileNames: string[]): Promise<void> {
    if (!fileIds || fileIds.length === 0 || !fileNames || fileNames.length === 0) {
      return;
    }

    if (fileIds.length !== fileNames.length) {
      throw new Error('fileIds and fileNames must have the same length');
    }

    for (let i = 0; i < fileIds.length; i++) {
      try {
        const res = await this.downloadFile(fileIds[i]);
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileNames[i];
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } catch (e) {
        console.error(`Failed to download ${fileNames[i]}:`, e);
      }

      // Add 500ms delay between downloads to prevent browser blocking
      if (i < fileIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
}

export const api = ApiClient.getInstance();
