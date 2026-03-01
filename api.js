import axios from 'axios';
import { logger } from './logger';
const prodURL = 'https://goal-tracker-zeta-five.vercel.app/api';
const devURL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: prodURL,
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
        logger.error('Error fetching metrics', { error: String(error) });
      throw error;
    }
  },

  // Get single metric
  getById: async (id) => {
    try {
      const response = await api.get(`/metrics/${id}`);
      return response.data.metric;
    } catch (error) {
      logger.error('Error fetching metric', { id, error: String(error) });
      throw error;
    }
  },

  // Create new metric
  create: async (metric) => {
    try {
      const response = await api.post('/metrics', metric);
      return response.data.metric;
    } catch (error) {
      logger.error('Error creating metric', { error: String(error) });
      throw error;
    }
  },

  // Update metric
  update: async (id, metric) => {
    try {
      const response = await api.put(`/metrics/${id}`, metric);
      return response.data;
    } catch (error) {
      logger.error('Error updating metric', { id, error: String(error) });
      throw error;
    }
  },

  // Archive metric
  archive: async (id) => {
    try {
      const response = await api.delete(`/metrics/${id}`);
      return response.data;
    } catch (error) {
      logger.error('Error archiving metric', { id, error: String(error) });
      throw error;
    }
  },

  // Increment metric value
  increment: async (id, value = 1) => {
    try {
      const response = await api.post(`/metrics/${id}/increment`, { value });
      return response.data.metric;
    } catch (error) {
      logger.error('Error incrementing metric', { id, error: String(error) });
      throw error;
    }
  },

  // Reset metric value
  reset: async (id) => {
    try {
      const response = await api.post(`/metrics/${id}/reset`);
      return response.data.metric;
    } catch (error) {
      logger.error('Error resetting metric', { id, error: String(error) });
      throw error;
    }
  },

  // Get metric logs
  getLogs: async (id) => {
    try {
      const response = await api.get(`/metrics/${id}/logs`);
      return response.data.logs;
    } catch (error) {
      logger.error('Error fetching metric logs', { id, error: String(error) });
      throw error;
    }
  },

  // Sync all metrics
  sync: async (metrics) => {
    try {
      const response = await api.post('/sync', { metrics });
      return response.data;
    } catch (error) {
      logger.error('Error syncing metrics', { error: String(error) });
      throw error;
    }
  },
};

export default api;
