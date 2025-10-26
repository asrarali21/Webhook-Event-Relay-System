import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1/admin';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface SystemStats {
  events: {
    total: number;
  };
  subscriptions: {
    total: number;
    active: number;
    inactive: number;
  };
  deliveries: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    successRate: number;
  };
  queue: {
    pending: number;
    processing: number;
  };
}

export interface DeliveryLog {
  id: string;
  status: 'success' | 'failed' | 'pending';
  attemptCount: number;
  attemptedAt: string;
  responseStatusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  event: {
    id: string;
    event_type: string;
    received_at: string;
  };
  subscription: {
    id: string;
    event_type: string;
    target_url: string;
    is_active: boolean;
  };
}

export interface Subscription {
  id: string;
  eventType: string;
  targetUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deliveryCount: number;
}

export interface CreateSubscriptionData {
  eventType: string;
  targetUrl: string;
  description?: string;
}

// API functions
export const apiService = {
  // Get system statistics
  async getStats(): Promise<SystemStats> {
    const response = await api.get('/stats');
    return response.data.stats;
  },

  // Get delivery logs
  async getDeliveryLogs(params?: {
    page?: number;
    limit?: number;
    status?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ logs: DeliveryLog[]; pagination: any }> {
    const response = await api.get('/delivery-logs', { params });
    return response.data;
  },

  // Retry failed delivery
  async retryDelivery(logId: string): Promise<void> {
    await api.post(`/delivery-logs/${logId}/retry`);
  },

  // Get subscriptions
  async getSubscriptions(params?: {
    page?: number;
    limit?: number;
    eventType?: string;
    isActive?: boolean;
  }): Promise<{ subscriptions: Subscription[]; pagination: any }> {
    const response = await api.get('/subscriptions', { params });
    return response.data;
  },

  // Create subscription
  async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
    const response = await api.post('/subscriptions', data);
    return response.data.subscription;
  },

  // Update subscription
  async updateSubscription(subscriptionId: string, data: Partial<Subscription>): Promise<Subscription> {
    const response = await api.put(`/subscriptions/${subscriptionId}`, data);
    return response.data.subscription;
  },

  // Delete subscription
  async deleteSubscription(subscriptionId: string): Promise<void> {
    await api.delete(`/subscriptions/${subscriptionId}`);
  },
};

export default api;
