import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { metricsApi } from './api';
import { MetricCircle, AddButton, AddMetricModal, EditMetricModal } from './components';

export default function App() {
  const [metrics, setMetrics] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState(null);

  // Load metrics from API on mount
  useEffect(() => {
    loadMetrics();
  }, []);

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
      }));

      setMetrics(formattedMetrics);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      // Continue with empty metrics on error
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMetric = async (newMetric) => {
    try {
      const createdMetric = await metricsApi.create(newMetric);
      console.log('handle add metric: createdMetric', createdMetric);

      // Format response
      const formattedMetric = {
        id: createdMetric.id,
        title: createdMetric.title,
        icon: createdMetric.icon,
        unit: createdMetric.unit,
        timeframe: createdMetric.timeframe,
        goal: createdMetric.goal,
        currentValue: createdMetric.currentValue,
        archived: createdMetric.archived,
        type: createdMetric.type || 'cumulative',
      };

      console.log('handle add metric: formattedMetric', formattedMetric);

      setMetrics([...metrics, formattedMetric]);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to create metric:', error);
      alert('Failed to create metric. Please try again.');
    }
  };

  const handleIncrementMetric = async (metricId) => {
    // Optimistically update UI
    setMetrics(metrics.map(metric =>
      metric.id === metricId
        ? { ...metric, currentValue: metric.currentValue + 1 }
        : metric
    ));

    try {
      await metricsApi.increment(metricId);
    } catch (error) {
      console.error('Failed to increment metric:', error);
      // Revert on error
      setMetrics(metrics.map(metric =>
        metric.id === metricId
          ? { ...metric, currentValue: metric.currentValue - 1 }
          : metric
      ));
      alert('Failed to update metric. Please try again.');
    }
  };

  const handleEditMetric = (metricId) => {
    const metric = metrics.find(m => m.id === metricId);
    if (metric) {
      setEditingMetric(metric);
    }
  };

  const handleSaveEdit = async (updatedMetric) => {
    try {
      await metricsApi.update(updatedMetric.id, updatedMetric);

      setMetrics(metrics.map(metric =>
        metric.id === updatedMetric.id ? updatedMetric : metric
      ));
      setEditingMetric(null);
    } catch (error) {
      console.error('Failed to update metric:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleArchiveMetric = async (metricId) => {
    try {
      await metricsApi.archive(metricId);

      setMetrics(metrics.map(metric =>
        metric.id === metricId
          ? { ...metric, archived: true }
          : metric
      ));
      setEditingMetric(null);
    } catch (error) {
      console.error('Failed to archive metric:', error);
      alert('Failed to archive metric. Please try again.');
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

    try {
      // Calculate elapsed time
      const elapsedMs = Date.now() - activeTimer.startTime;
      const completeMinutes = Math.floor(elapsedMs / 60000);

      // Clear timer state
      setActiveTimer(null);

      // Only update API if at least 1 minute elapsed
      if (completeMinutes > 0) {
        const metric = metrics.find(m => m.id === metricId);
        const newValue = metric.currentValue + completeMinutes;

        // Optimistic update
        setMetrics(metrics.map(m =>
          m.id === metricId
            ? { ...m, currentValue: newValue }
            : m
        ));

        // Update via API
        await metricsApi.update(metricId, {
          ...metric,
          currentValue: newValue
        });

        console.log(`Logged ${completeMinutes} minutes`);
      }
    } catch (error) {
      console.error('Failed to update metric:', error);
      // Reload metrics to get correct state
      await loadMetrics();
      alert('Failed to update metric. Please try again.');
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
    } else {
      // Cumulative - increment as before
      handleIncrementMetric(metric.id);
    }
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

  // Filter out archived metrics
  const activeMetrics = metrics.filter(m => !m.archived);

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
              onPress={() => handleMetricPress(metric)}
              onDoublePress={() => handleEditMetric(metric.id)}
            />
          ))}
          <AddButton onPress={() => setShowAddModal(true)} />
        </View>
      </ScrollView>
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navIcon}>⚙️</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>STREAKS</Text>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navIcon}>📅</Text>
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
  navTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
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
