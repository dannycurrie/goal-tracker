import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { metricsApi } from './api';
import { MetricCircle, AddButton, AddMetricModal, EditMetricModal, CheckInModal, AppleHealthScreen } from './components';
import { needsReset } from './components/utils';
import { storage } from './storage';
import { useNetworkStatus } from './networkStatus';
import { offlineQueue, OP_TYPES } from './offlineQueue';
import { syncRunningWorkouts } from './healthKit';

/**
   *
   * @returns {string} The current date string in the format of DD MMM e.g. 9 Jan, 14 Mar
   */
const getCurrentDateString = () => {
  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.toLocaleString('default', { month: 'short' });
  return `${day} ${month}`;
};
const currentDateString = getCurrentDateString(); 

export default function App() {
  const [metrics, setMetrics] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInMetric, setCheckInMetric] = useState(null);
  const [metricAverages, setMetricAverages] = useState({});
  const [hasCheckedResets, setHasCheckedResets] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAppleHealthScreen, setShowAppleHealthScreen] = useState(false);
  const { isOnline, isInitialized } = useNetworkStatus();
  const wasOnlineRef = useRef(false);

  // Load from cache immediately on mount (don't wait for network status)
  useEffect(() => {
    const loadFromCache = async () => {
      await offlineQueue.init();
      const cachedMetrics = await storage.loadMetrics();
      console.log('Loaded from cache:', cachedMetrics?.length ?? 0, 'metrics');
      if (cachedMetrics && cachedMetrics.length > 0) {
        setMetrics(cachedMetrics);
      }
      setLoading(false);
    };

    loadFromCache();
  }, []);

  // Sync with server when network status is known and online
  useEffect(() => {
    if (!isInitialized) return;

    if (isOnline && !wasOnlineRef.current) {
      console.log('Online, syncing with server...');
      syncWithServer();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, isInitialized]);

  const syncWithServer = async () => {
    setIsSyncing(true);
    try {
      // Process any queued offline operations first
      if (offlineQueue.hasPending()) {
        console.log('Processing offline queue...');
        const result = await offlineQueue.processQueue(metricsApi);
        console.log(`Processed ${result.processed} operations, ${result.failed} failed`);
      }

      // Fetch fresh data from server
      const loadedMetrics = await loadMetrics();
      await storage.saveLastSyncTime();

      // Sync running data from Apple Health (iOS only)
      if (loadedMetrics) {
        await syncHealthData(loadedMetrics);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync running workouts from Apple Health on startup
  const syncHealthData = async (currentMetrics) => {
    try {
      const result = await syncRunningWorkouts(currentMetrics);
      if (result.synced && result.workoutsLogged > 0) {
        console.log(`Synced ${result.workoutsLogged} workouts (${result.distanceKm} km) from Apple Health`);
        // Reload metrics to get updated values
        await loadMetrics();
      }
    } catch (error) {
      console.error('Health sync failed:', error);
      // Fail silently - health sync is not critical
    }
  };

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await metricsApi.getAll();

      // Convert snake_case from API to camelCase for app
      const formattedMetrics = data.map(metric => ({
        id: metric.id,
        title: metric.title,
        icon: metric.icon,
        unit: metric.unit,
        timeframe: metric.timeframe,
        goal: metric.goal,
        currentValue: metric.current_value,
        archived: metric.archived,
        type: metric.type || 'cumulative',
        source: metric.source || 'user',
        lastReset: metric.last_reset,
      }));

      setMetrics(formattedMetrics);
      // Cache the fresh data
      await storage.saveMetrics(formattedMetrics);
      return formattedMetrics;
    } catch (error) {
      console.error('Failed to load metrics:', error);
      // Keep current metrics on error - don't overwrite with empty array
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Helper to update metrics and persist to cache
  const updateMetricsWithCache = async (newMetrics) => {
    setMetrics(newMetrics);
    await storage.saveMetrics(newMetrics);
  };

  const checkAndResetMetrics = async () => {
    const now = new Date();
    const metricsToReset = [];

    for (const metric of metrics) {
      if (needsReset(metric, now)) {
        metricsToReset.push(metric);
      }
    }

    if (metricsToReset.length > 0) {
      console.log(`Resetting ${metricsToReset.length} metrics...`);

      // Update local state immediately
      const updatedMetrics = metrics.map(m => {
        if (metricsToReset.find(r => r.id === m.id)) {
          return { ...m, currentValue: 0, lastReset: now.toISOString() };
        }
        return m;
      });
      await updateMetricsWithCache(updatedMetrics);

      // Reset via API or queue
      for (const metric of metricsToReset) {
        if (isOnline) {
          try {
            await metricsApi.reset(metric.id);
          } catch (error) {
            console.error(`Failed to reset metric ${metric.id}:`, error);
          }
        } else {
          await offlineQueue.add(OP_TYPES.RESET, metric.id);
        }
      }
    }
  };

  const handleAddMetric = async (newMetric) => {
    // Create a temporary local metric
    const tempId = `temp_${Date.now()}`;
    const formattedMetric = {
      id: tempId,
      title: newMetric.title,
      icon: newMetric.icon,
      unit: newMetric.unit,
      timeframe: newMetric.timeframe,
      goal: newMetric.goal,
      currentValue: newMetric.currentValue || 0,
      archived: false,
      type: newMetric.type || 'cumulative',
      lastReset: new Date().toISOString(),
    };

    // Update local state immediately
    const newMetrics = [...metrics, formattedMetric];
    await updateMetricsWithCache(newMetrics);
    setShowAddModal(false);

    if (isOnline) {
      try {
        const createdMetric = await metricsApi.create(newMetric);
        // Replace temp metric with real one from server
        const updatedMetrics = newMetrics.map(m =>
          m.id === tempId
            ? {
                id: createdMetric.id,
                title: createdMetric.title,
                icon: createdMetric.icon,
                unit: createdMetric.unit,
                timeframe: createdMetric.timeframe,
                goal: createdMetric.goal,
                currentValue: createdMetric.currentValue,
                archived: createdMetric.archived,
                type: createdMetric.type || 'cumulative',
                lastReset: createdMetric.lastReset || new Date().toISOString(),
              }
            : m
        );
        await updateMetricsWithCache(updatedMetrics);
      } catch (error) {
        console.error('Failed to create metric:', error);
        // Revert on error
        await updateMetricsWithCache(metrics);
        alert('Failed to create metric. Please try again.');
      }
    } else {
      // Queue for later
      await offlineQueue.add(OP_TYPES.CREATE, tempId, newMetric);
    }
  };

  const handleIncrementMetric = async (metricId) => {
    // Optimistically update UI and cache
    const updatedMetrics = metrics.map(metric =>
      metric.id === metricId
        ? { ...metric, currentValue: metric.currentValue + 1 }
        : metric
    );
    await updateMetricsWithCache(updatedMetrics);

    if (isOnline) {
      try {
        await metricsApi.increment(metricId);
      } catch (error) {
        console.error('Failed to increment metric:', error);
        // Revert on error
        await updateMetricsWithCache(metrics);
        alert('Failed to update metric. Please try again.');
      }
    } else {
      // Queue for later
      await offlineQueue.add(OP_TYPES.INCREMENT, metricId);
    }
  };

  const handleEditMetric = (metricId) => {
    const metric = metrics.find(m => m.id === metricId);
    if (metric) {
      setEditingMetric(metric);
    }
  };

  const handleSaveEdit = async (updatedMetric) => {
    const previousMetrics = metrics;
    const updatedMetrics = metrics.map(metric =>
      metric.id === updatedMetric.id ? updatedMetric : metric
    );
    await updateMetricsWithCache(updatedMetrics);
    setEditingMetric(null);

    if (isOnline) {
      try {
        await metricsApi.update(updatedMetric.id, updatedMetric);
      } catch (error) {
        console.error('Failed to update metric:', error);
        // Revert on error
        await updateMetricsWithCache(previousMetrics);
        alert('Failed to save changes. Please try again.');
      }
    } else {
      // Queue for later
      await offlineQueue.add(OP_TYPES.UPDATE, updatedMetric.id, updatedMetric);
    }
  };

  const handleArchiveMetric = async (metricId) => {
    const previousMetrics = metrics;
    const updatedMetrics = metrics.map(metric =>
      metric.id === metricId
        ? { ...metric, archived: true }
        : metric
    );
    await updateMetricsWithCache(updatedMetrics);
    setEditingMetric(null);

    if (isOnline) {
      try {
        await metricsApi.archive(metricId);
      } catch (error) {
        console.error('Failed to archive metric:', error);
        // Revert on error
        await updateMetricsWithCache(previousMetrics);
        alert('Failed to archive metric. Please try again.');
      }
    } else {
      // Queue for later
      await offlineQueue.add(OP_TYPES.ARCHIVE, metricId);
    }
  };

  const handleStartTimer = (metricId) => {
    // If another timer is running, stop it first
    if (activeTimer && activeTimer.metricId !== metricId) {
      handleStopTimer(activeTimer.metricId);
    }

    // Start new timer (client-side only)
    setActiveTimer({
      metricId,
      startTime: Date.now(),
      elapsed: 0
    });
  };

  const handleStopTimer = async (metricId) => {
    if (!activeTimer || activeTimer.metricId !== metricId) {
      return;
    }

    // Calculate elapsed time
    const elapsedMs = Date.now() - activeTimer.startTime;
    const completeMinutes = Math.floor(elapsedMs / 60000);

    // Clear timer state
    setActiveTimer(null);

    // Only update if at least 1 minute elapsed
    if (completeMinutes > 0) {
      const metric = metrics.find(m => m.id === metricId);
      const newValue = metric.currentValue + completeMinutes;
      const updatedMetric = { ...metric, currentValue: newValue };

      // Optimistic update with cache
      const updatedMetrics = metrics.map(m =>
        m.id === metricId ? updatedMetric : m
      );
      await updateMetricsWithCache(updatedMetrics);

      console.log(`Logged ${completeMinutes} minutes`);

      if (isOnline) {
        try {
          await metricsApi.update(metricId, updatedMetric);
        } catch (error) {
          console.error('Failed to update metric:', error);
          // Keep local changes, will sync later
        }
      } else {
        // Queue for later
        await offlineQueue.add(OP_TYPES.UPDATE, metricId, updatedMetric);
      }
    }
  };

  const handleCheckIn = (metric) => {
    setCheckInMetric(metric);
    setShowCheckInModal(true);
  };

  const handleSaveCheckIn = async (value) => {
    if (!checkInMetric) return;

    const updatedMetric = {
      ...checkInMetric,
      currentValue: value
    };

    // Optimistic update with cache
    const updatedMetrics = metrics.map(m =>
      m.id === checkInMetric.id
        ? { ...m, currentValue: value }
        : m
    );
    await updateMetricsWithCache(updatedMetrics);

    // Close modal
    setShowCheckInModal(false);
    setCheckInMetric(null);

    if (isOnline) {
      try {
        await metricsApi.update(checkInMetric.id, updatedMetric);
        // Recalculate averages
        await calculateCheckInAverages();
      } catch (error) {
        console.error('Failed to save check-in:', error);
        // Keep local changes, will sync later
      }
    } else {
      // Queue for later
      await offlineQueue.add(OP_TYPES.UPDATE, checkInMetric.id, updatedMetric);
    }
  };

  const handleMetricPress = (metric) => {
    console.log('handle metric press: metric', metric);
    if (metric.type === 'timed') {
      // Check if this metric's timer is running
      if (activeTimer?.metricId === metric.id) {
        handleStopTimer(metric.id);
      } else {
        handleStartTimer(metric.id);
      }
    } else if (metric.type === 'checkin') {
      // Open check-in modal
      handleCheckIn(metric);
    } else {
      // Cumulative - increment as before
      handleIncrementMetric(metric.id);
    }
  };

  const calculateCheckInAverages = async () => {
    const checkinMetrics = metrics.filter(m => m.type === 'checkin');
    const averages = {};

    for (const metric of checkinMetrics) {
      try {
        const logs = await metricsApi.getLogs(metric.id);

        // Filter logs by timeframe
        const now = new Date();
        const filteredLogs = logs.filter(log => {
          const logDate = new Date(log.createdAt);
          const diffMs = now - logDate;
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (metric.timeframe === 'week') return diffDays <= 7;
          if (metric.timeframe === 'month') return diffDays <= 30;
          if (metric.timeframe === 'year') return diffDays <= 365;
          return true;
        });

        if (filteredLogs.length > 0) {
          const sum = filteredLogs.reduce((acc, log) => acc + Number(log.value), 0);
          const avg = sum / filteredLogs.length;
          // Ensure average is valid and within expected range for check-ins (1-10)
          averages[metric.id] = (avg > 0 && avg <= 10) ? avg.toFixed(1) : '-';
        } else {
          averages[metric.id] = '-';
        }
      } catch (error) {
        console.error(`Failed to fetch logs for metric ${metric.id}:`, error);
        averages[metric.id] = '-';
      }
    }

    setMetricAverages(averages);
  };

  // Update timer elapsed time every second
  useEffect(() => {
    if (!activeTimer) return;

    const interval = setInterval(() => {
      setActiveTimer(prev => ({
        ...prev,
        elapsed: Math.floor((Date.now() - prev.startTime) / 1000)
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  // Calculate averages when metrics change
  useEffect(() => {
    if (metrics.length > 0) {
      calculateCheckInAverages();
    }
  }, [metrics]);

  // Check and reset metrics on app load (once)
  useEffect(() => {
    if (metrics.length > 0 && !loading && !hasCheckedResets) {
      setHasCheckedResets(true);
      checkAndResetMetrics();
    }
  }, [metrics, loading, hasCheckedResets]);

  // Filter out archived metrics and apple_health source metrics (shown in separate screen)
  const activeMetrics = metrics.filter(m => !m.archived && m.source !== 'apple_health');

  // Get the Apple Health metric
  const appleHealthMetric = metrics.find(m => m.source === 'apple_health' && !m.archived);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading metrics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metricsGrid}>
          {activeMetrics.map((metric) => (
            <MetricCircle
              key={metric.id}
              metric={metric}
              isTimerRunning={activeTimer?.metricId === metric.id}
              timerElapsed={activeTimer?.metricId === metric.id ? activeTimer.elapsed : 0}
              averageValue={metricAverages[metric.id]}
              onPress={() => handleMetricPress(metric)}
              onDoublePress={() => handleEditMetric(metric.id)}
            />
          ))}
          <AddButton onPress={() => setShowAddModal(true)} />
        </View>
      </ScrollView>
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => setShowAppleHealthScreen(true)}>
          <Text style={styles.navIcon}>⚙️</Text>
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>TRACKER</Text>
          {!isOnline && <Text style={styles.offlineIndicator}>OFFLINE</Text>}
          {isSyncing && <Text style={styles.syncingIndicator}>SYNCING...</Text>}
        </View>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navDate}>{currentDateString}</Text>
        </TouchableOpacity>
      </View>

      <AddMetricModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddMetric}
      />

      <EditMetricModal
        visible={editingMetric !== null}
        metric={editingMetric}
        onClose={() => setEditingMetric(null)}
        onSave={handleSaveEdit}
        onArchive={handleArchiveMetric}
      />

      <CheckInModal
        visible={showCheckInModal}
        metric={checkInMetric}
        onClose={() => {
          setShowCheckInModal(false);
          setCheckInMetric(null);
        }}
        onSave={handleSaveCheckIn}
      />

      <AppleHealthScreen
        visible={showAppleHealthScreen}
        onClose={() => setShowAppleHealthScreen(false)}
        metric={appleHealthMetric}
        onEdit={(metric) => {
          setShowAppleHealthScreen(false);
          setEditingMetric(metric);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF7F5C',
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
    backgroundColor: '#FF7F5C',
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 24,
  },
  navDate: {
    fontSize: 16,
    paddingRight: 10,
    width: 100,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  navCenter: {
    alignItems: 'center',
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  offlineIndicator: {
    color: '#FFE4B5',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  syncingIndicator: {
    color: '#90EE90',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
