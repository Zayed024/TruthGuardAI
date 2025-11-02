import { auth } from './firebase';

const API_BASE_URL = (import.meta as any).env?.DEV ? 'http://localhost:8000' : 'https://truthguardai-gateway-3xz6gfx0.an.gateway.dev';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      // Get Firebase ID token
      const user = auth.currentUser;
      if (!user) {
        return { error: 'User not authenticated' };
      }
      const idToken = await user.getIdToken();

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return { error: errorData.detail || `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Analysis endpoints
  async analyzeText(text: string, url?: string) {
    return this.request('/v2/analyze', {
      method: 'POST',
      body: JSON.stringify({ text, url }),
    });
  }

  async analyzeVideo(url: string) {
    return this.request('/v2/analyze_video', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async analyzeImage(imageUrl: string) {
    return this.request('/v2/analyze_image', {
      method: 'POST',
      body: JSON.stringify({ image_url: imageUrl }),
    });
  }

  async uploadAndAnalyzeImage(file: File) {
    try {
      // Get Firebase ID token
      const user = auth.currentUser;
      if (!user) {
        return { error: 'User not authenticated' };
      }
      const idToken = await user.getIdToken();

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/v2/upload_and_analyze_image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          // Don't set Content-Type, let browser set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return { error: errorData.detail || `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Analytics endpoints (these would need to be implemented in backend)
  async getAnalyticsData(timeRange: string = '7days') {
    return this.request(`/analytics/overview?period=${timeRange}`);
  }

  async getMisinformationTrends(timeRange: string = '7days') {
    return this.request(`/analytics/trends?period=${timeRange}`);
  }

  async getEvidenceNetwork(articleId: string) {
    return this.request(`/evidence/${articleId}`);
  }

  async getAnalyzedArticles(filters: {
    status?: string;
    source?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return this.request(`/articles/analyzed?${params.toString()}`);
  }

  async getUserAnalytics(userId: string) {
    return this.request(`/analytics/user/${userId}`);
  }

  async getAdminStats() {
    return this.request('/admin/stats');
  }

  async getWatchlistSubmissions() {
    return this.request('/admin/watchlist');
  }

  async approveWatchlistSubmission(id: string) {
    return this.request(`/admin/watchlist/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectWatchlistSubmission(id: string) {
    return this.request(`/admin/watchlist/${id}/reject`, {
      method: 'POST',
    });
  }

  async getUserManagementData() {
    return this.request('/admin/users');
  }

  async suspendUser(userId: string) {
    return this.request(`/admin/users/${userId}/suspend`, {
      method: 'POST',
    });
  }

  async activateUser(userId: string) {
    return this.request(`/admin/users/${userId}/activate`, {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
