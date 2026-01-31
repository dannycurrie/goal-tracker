import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';

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
    // Basic validation
    if (!unit.trim() || !icon.trim()) {
      return;
    }

    // Goal required for cumulative/timed
    if (metric.type !== 'checkin' && !goal.trim()) {
      return;
    }

    onSave({
      ...metric,
      title: unit.toUpperCase(),
      icon: icon,
      unit: unit,
      timeframe: timeframe,
      goal: metric.type === 'checkin' ? null : parseInt(goal, 10),
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

            {metric?.source !== 'apple_health' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Metric Type</Text>
                <View style={styles.typeDisplay}>
                  <Text style={styles.typeValue}>
                    {metric?.type === 'timed' ? 'TIMED' :
                     metric?.type === 'checkin' ? 'CHECK-IN' : 'CUMULATIVE'}
                  </Text>
                  <Text style={styles.typeHint}>
                    {metric?.type === 'timed' ? 'Tracks time duration' :
                     metric?.type === 'checkin' ? 'Collects 1-5 ratings' : 'Tracks count increments'}
                  </Text>
                </View>
              </View>
            )}

            {metric?.source !== 'apple_health' && (
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
            )}

            {metric?.source !== 'apple_health' && (
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
            )}

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

            {metric?.type !== 'checkin' && (
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
            )}

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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    flexGrow: 1,
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
  typeDisplay: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
  },
  typeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5A4A42',
    marginBottom: 4,
  },
  typeHint: {
    fontSize: 12,
    color: '#999',
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
});

export default EditMetricModal;
