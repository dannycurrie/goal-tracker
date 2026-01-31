import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  METRICS: '@goal_tracker_metrics',
  OFFLINE_QUEUE: '@goal_tracker_offline_queue',
  LAST_SYNC: '@goal_tracker_last_sync',
  LAST_HEALTH_SYNC: '@goal_tracker_last_health_sync',
};

export const storage = {
  // Metrics
  saveMetrics: async (metrics) => {
    try {
      await AsyncStorage.setItem(KEYS.METRICS, JSON.stringify(metrics));
    } catch (error) {
      console.error('Failed to save metrics to storage:', error);
    }
  },

  loadMetrics: async () => {
    try {
      const data = await AsyncStorage.getItem(KEYS.METRICS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load metrics from storage:', error);
      return null;
    }
  },

  // Offline Queue
  saveOfflineQueue: async (queue) => {
    try {
      await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  },

  loadOfflineQueue: async () => {
    try {
      const data = await AsyncStorage.getItem(KEYS.OFFLINE_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      return [];
    }
  },

  // Last Sync Time
  saveLastSyncTime: async () => {
    try {
      await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('Failed to save last sync time:', error);
    }
  },

  getLastSyncTime: async () => {
    try {
      return await AsyncStorage.getItem(KEYS.LAST_SYNC);
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return null;
    }
  },

  // Health Sync Time
  setLastHealthSyncTime: async () => {
    try {
      await AsyncStorage.setItem(KEYS.LAST_HEALTH_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('Failed to save last health sync time:', error);
    }
  },

  getLastHealthSyncTime: async () => {
    try {
      return await AsyncStorage.getItem(KEYS.LAST_HEALTH_SYNC);
    } catch (error) {
      console.error('Failed to get last health sync time:', error);
      return null;
    }
  },
};
