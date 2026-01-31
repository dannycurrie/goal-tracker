import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { storage } from '../storage';

const AppleHealthScreen = ({
  visible,
  onClose,
  metric,
  logs,
  onSync,
  onSaveEdit,
  isSyncing,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [timeframe, setTimeframe] = useState('month');
  const [goal, setGoal] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    if (metric) {
      setTimeframe(metric.timeframe || 'month');
      setGoal(metric.goal?.toString() || '');
    }
  }, [metric]);

  useEffect(() => {
    if (visible) {
      loadLastSyncTime();
    }
  }, [visible]);

  const loadLastSyncTime = async () => {
    const syncTime = await storage.getLastHealthSyncTime();
    setLastSyncTime(syncTime);
  };

  const handleSave = () => {
    if (!goal.trim()) return;

    onSaveEdit({
      ...metric,
      timeframe,
      goal: parseInt(goal, 10),
    });
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatWorkoutDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate progress
  const progress = metric?.goal > 0 ? Math.min(metric.currentValue / metric.goal, 1) : 0;
  const progressPercent = Math.round(progress * 100);

  // Filter logs to only show workouts (those with externalId starting with HK:)
  const workoutLogs = logs?.filter(log => log.externalId?.startsWith('HK:')) || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Text style={styles.backButtonText}>{'<'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>APPLE HEALTH</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Metric Display */}
          {metric && (
            <View style={styles.metricSection}>
              <View style={styles.metricCircle}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>{metric.icon}</Text>
                </View>
                <View style={styles.progressOverlay}>
                  <Text style={styles.progressText}>{progressPercent}%</Text>
                </View>
              </View>
              <Text style={styles.metricTitle}>{metric.title}</Text>
              <Text style={styles.metricValue}>
                {metric.currentValue?.toFixed(1) || 0} / {metric.goal} {metric.unit}
              </Text>
              <Text style={styles.metricTimeframe}>this {metric.timeframe}</Text>
            </View>
          )}

          {/* Edit Section */}
          {isEditing ? (
            <View style={styles.editSection}>
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
                  placeholder="e.g., 100"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.cancelButtonText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>SAVE</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>EDIT GOAL / TIMEFRAME</Text>
            </TouchableOpacity>
          )}

          {/* Sync Section */}
          <View style={styles.syncSection}>
            <Text style={styles.syncLabel}>Last synced: {formatDate(lastSyncTime)}</Text>
            <TouchableOpacity
              style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
              onPress={onSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.syncButtonText}>SYNC NOW</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Recent Workouts */}
          <View style={styles.workoutsSection}>
            <Text style={styles.sectionTitle}>RECENT WORKOUTS</Text>
            {workoutLogs.length === 0 ? (
              <Text style={styles.noWorkouts}>No workouts synced yet</Text>
            ) : (
              workoutLogs.slice(0, 20).map((log) => (
                <View key={log.id} style={styles.workoutItem}>
                  <Text style={styles.workoutDate}>{formatWorkoutDate(log.createdAt)}</Text>
                  <Text style={styles.workoutDistance}>{log.value?.toFixed(2)} km</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF7F5C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 80,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerRight: {
    width: 80,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  metricSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  metricCircle: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF9D85',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 60,
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5A4A42',
  },
  metricTitle: {
    marginTop: 15,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  metricValue: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  metricTimeframe: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  editSection: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
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
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: '#FF7F5C',
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5A4A42',
    letterSpacing: 0.5,
  },
  timeframeTextActive: {
    color: '#FFFFFF',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5A4A42',
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  syncSection: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 25,
    alignItems: 'center',
  },
  syncLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 10,
    opacity: 0.9,
  },
  syncButton: {
    backgroundColor: '#5A4A42',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  workoutsSection: {
    marginTop: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 15,
  },
  noWorkouts: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
    paddingVertical: 20,
  },
  workoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  workoutDate: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  workoutDistance: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AppleHealthScreen;
