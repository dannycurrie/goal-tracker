import axios from 'axios';

const api = axios.create({
  baseURL: 'https://goal-tracker-zeta-five.vercel.app/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Metrics API
export const metricsApi = {
  // Get all metrics
  getAll: async () => {
    try {
      const response = await api.get('/metrics');
      return response.data.metrics;
    } catch (error) {
        console.error('Error fetching metrics:', error.request);
      throw error;
    }
  },

  // Get single metric
  getById: async (id) => {
    try {
      const response = await api.get(`/metrics/${id}`);
      return response.data.metric;
    } catch (error) {
      console.error('Error fetching metric:', error);
      throw error;
    }
  },

  // Create new metric
  create: async (metric) => {
    try {
      const response = await api.post('/metrics', metric);
      return response.data.metric;
    } catch (error) {
      console.error('Error creating metric:', error);
      throw error;
    }
  },

  // Update metric
  update: async (id, metric) => {
    try {
      const response = await api.put(`/metrics/${id}`, metric);
      return response.data;
    } catch (error) {
      console.error('Error updating metric:', error);
      throw error;
    }
  },

  // Archive metric
  archive: async (id) => {
    try {
      const response = await api.delete(`/metrics/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error archiving metric:', error);
      throw error;
    }
  },

  // Increment metric value
  increment: async (id) => {
    try {
      const response = await api.post(`/metrics/${id}/increment`);
      return response.data.metric;
    } catch (error) {
      console.error('Error incrementing metric:', error);
      throw error;
    }
  },

  // Reset metric value
  reset: async (id) => {
    try {
      const response = await api.post(`/metrics/${id}/reset`);
      return response.data.metric;
    } catch (error) {
      console.error('Error resetting metric:', error);
      throw error;
    }
  },

  // Get metric logs
  getLogs: async (id) => {
    try {
      const response = await api.get(`/metrics/${id}/logs`);
      return response.data.logs;
    } catch (error) {
      console.error('Error fetching metric logs:', error);
      throw error;
    }
  },

  // Log a new entry with optional externalId for deduplication
  logEntry: async (id, { value, externalId }) => {
    try {
      const response = await api.post(`/metrics/${id}/log`, { value, externalId });
      return response.data;
    } catch (error) {
      console.error('Error logging metric entry:', error);
      throw error;
    }
  },

  // Sync all metrics
  sync: async (metrics) => {
    try {
      const response = await api.post('/sync', { metrics });
      return response.data;
    } catch (error) {
      console.error('Error syncing metrics:', error);
      throw error;
    }
  },
};

export default api;
