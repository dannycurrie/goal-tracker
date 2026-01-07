import { StatusBar } from 'expo-status-bar';
import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { metricsApi } from './api';

const ProgressRing = ({ progress, size = 140, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <Svg width={size} height={size} style={styles.progressSvg}>
      {/* Background circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#5A4A42"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {/* Progress circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#FFFFFF"
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
};

const MetricCircle = ({ title, icon, currentValue, goal, onPress, onDoublePress, timeframe = 'week' }) => {
  const progress = goal > 0 ? Math.min(currentValue / goal, 1) : 0;
  const lastTap = useRef(null);

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
      console.log('Double tap detected');
      // Double tap detected
      lastTap.current = null;
      if (onDoublePress) {
        onDoublePress();
      }
    } else {
      console.log('Single tap detected');
      // Single tap
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now && onPress) {
          onPress();
        }
        lastTap.current = null;
      }, DOUBLE_PRESS_DELAY);
    }
  };

  const progressText = `${currentValue} / ${goal} this ${timeframe}`;

  return (
    <TouchableOpacity style={styles.metricContainer} onPress={handlePress}>
      <View style={styles.circle}>
        <ProgressRing progress={progress} />
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      </View>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricProgress}>{progressText}</Text>
    </TouchableOpacity>
  );
};

const AddButton = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.metricContainer} onPress={onPress}>
      <View style={styles.circle}>
        <View style={styles.progressRing}>
          <View style={styles.iconContainer}>
            <Text style={styles.addIcon}>+</Text>
          </View>
        </View>
      </View>
      <Text style={styles.metricTitle}>ADD A TASK</Text>
    </TouchableOpacity>
  );
};

const EditMetricModal = ({ visible, onClose, onSave, onArchive, metric }) => {
  const [unit, setUnit] = useState('');
  const [timeframe, setTimeframe] = useState('week');
  const [goal, setGoal] = useState('');
  const [icon, setIcon] = useState('');
  const [currentValue, setCurrentValue] = useState('');

  // Pre-populate form when metric changes
  useEffect(() => {
    if (metric) {
      setUnit(metric.unit || '');
      setTimeframe(metric.timeframe || 'week');
      setGoal(metric.goal?.toString() || '');
      setIcon(metric.icon || '');
      setCurrentValue(metric.currentValue?.toString() || '0');
    } else {
      // Reset form when modal closes
      setUnit('');
      setTimeframe('week');
      setGoal('');
      setIcon('');
      setCurrentValue('');
    }
  }, [metric]);

  const handleSave = () => {
    if (!unit.trim() || !goal.trim() || !icon.trim()) {
      return;
    }

    onSave({
      ...metric,
      title: unit.toUpperCase(),
      icon: icon,
      unit: unit,
      timeframe: timeframe,
      goal: parseInt(goal, 10),
      currentValue: parseInt(currentValue, 10),
    });
  };

  const handleArchive = () => {
    if (onArchive && metric) {
      onArchive(metric.id);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <ScrollView contentContainerStyle={styles.modalScrollContent}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>EDIT METRIC</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Icon (emoji)</Text>
              <TextInput
                style={styles.input}
                value={icon}
                onChangeText={setIcon}
                placeholder="e.g., 🏃 📚 🎸"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Unit</Text>
              <TextInput
                style={styles.input}
                value={unit}
                onChangeText={setUnit}
                placeholder="e.g., KMs, Pages, Minutes"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Value</Text>
              <TextInput
                style={styles.input}
                value={currentValue}
                onChangeText={setCurrentValue}
                placeholder="e.g., 5"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Timeframe</Text>
              <View style={styles.timeframeButtons}>
                {['week', 'month', 'year'].map((tf) => (
                  <TouchableOpacity
                    key={tf}
                    style={[
                      styles.timeframeButton,
                      timeframe === tf && styles.timeframeButtonActive
                    ]}
                    onPress={() => setTimeframe(tf)}
                  >
                    <Text style={[
                      styles.timeframeText,
                      timeframe === tf && styles.timeframeTextActive
                    ]}>
                      {tf.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Goal (per {timeframe})</Text>
              <TextInput
                style={styles.input}
                value={goal}
                onChangeText={setGoal}
                placeholder="e.g., 10"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={styles.archiveButton} onPress={handleArchive}>
              <Text style={styles.archiveButtonText}>ARCHIVE METRIC</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const AddMetricModal = ({ visible, onClose, onSave }) => {
  const [unit, setUnit] = useState('');
  const [timeframe, setTimeframe] = useState('week');
  const [goal, setGoal] = useState('');
  const [icon, setIcon] = useState('');

  const handleSave = () => {
    if (!unit.trim() || !goal.trim() || !icon.trim()) {
      return;
    }

    onSave({
      id: Date.now(),
      title: unit.toUpperCase(),
      icon: icon,
      unit: unit,
      timeframe: timeframe,
      goal: parseInt(goal, 10),
      currentValue: 0,
    });

    // Reset form
    setUnit('');
    setGoal('');
    setIcon('');
    setTimeframe('week');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>ADD NEW METRIC</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Icon (emoji)</Text>
            <TextInput
              style={styles.input}
              value={icon}
              onChangeText={setIcon}
              placeholder="e.g., 🏃 📚 🎸"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Unit</Text>
            <TextInput
              style={styles.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="e.g., KMs, Pages, Minutes"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Timeframe</Text>
            <View style={styles.timeframeButtons}>
              {['week', 'month', 'year'].map((tf) => (
                <TouchableOpacity
                  key={tf}
                  style={[
                    styles.timeframeButton,
                    timeframe === tf && styles.timeframeButtonActive
                  ]}
                  onPress={() => setTimeframe(tf)}
                >
                  <Text style={[
                    styles.timeframeText,
                    timeframe === tf && styles.timeframeTextActive
                  ]}>
                    {tf.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Goal (per {timeframe})</Text>
            <TextInput
              style={styles.input}
              value={goal}
              onChangeText={setGoal}
              placeholder="e.g., 10"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>SAVE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default function App() {
  const [metrics, setMetrics] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [loading, setLoading] = useState(true);

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
      };

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
              title={metric.title}
              icon={metric.icon}
              currentValue={metric.currentValue}
              goal={metric.goal}
              onPress={() => handleIncrementMetric(metric.id)}
              onDoublePress={() => handleEditMetric(metric.id)}
              timeframe={metric.timeframe}
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
  metricContainer: {
    width: '45%',
    alignItems: 'center',
    marginBottom: 40,
  },
  circle: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressSvg: {
    position: 'absolute',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF9D85',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 50,
  },
  addIcon: {
    fontSize: 70,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  metricTitle: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  metricProgress: {
    marginTop: 5,
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.9,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 30,
    paddingBottom: 50,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5A4A42',
    marginBottom: 30,
    textAlign: 'center',
    letterSpacing: 1,
  },
  formGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5A4A42',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  timeframeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeframeButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: '#FF7F5C',
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5A4A42',
    letterSpacing: 0.5,
  },
  timeframeTextActive: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5A4A42',
    letterSpacing: 0.5,
  },
  saveButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#FF7F5C',
    borderRadius: 10,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  archiveButton: {
    padding: 15,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  archiveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
