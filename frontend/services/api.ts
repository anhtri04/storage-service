
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

    const response = await fetch(`${BASE_URL}${url}`, { ...options, headers });

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

  async deleteFile(fileId: string) {
    return this.fetchWithAuth(`/files/${fileId}`, { method: 'DELETE' });
  }
}

export const api = ApiClient.getInstance();
