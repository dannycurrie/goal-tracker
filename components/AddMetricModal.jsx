import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';

const AddMetricModal = ({ visible, onClose, onSave }) => {
  const [unit, setUnit] = useState('');
  const [timeframe, setTimeframe] = useState('week');
  const [goal, setGoal] = useState('');
  const [icon, setIcon] = useState('');
  const [type, setType] = useState('cumulative');

  const handleSave = () => {
    // Basic validation
    if (!unit.trim() || !icon.trim()) {
      return;
    }

    // Goal is required for cumulative/timed
    if (type !== 'checkin' && !goal.trim()) {
      return;
    }

    onSave({
      id: Date.now(),
      title: unit.toUpperCase(),
      icon: icon,
      unit: unit,
      timeframe: timeframe,
      goal: type === 'checkin' ? null : parseInt(goal, 10),
      currentValue: 0,
      type: type,
    });

    // Reset form
    setUnit('');
    setGoal('');
    setIcon('');
    setTimeframe('week');
    setType('cumulative');
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
            <Text style={styles.label}>Metric Type</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'cumulative' && styles.typeButtonActive
                ]}
                onPress={() => setType('cumulative')}
              >
                <Text style={[
                  styles.typeText,
                  type === 'cumulative' && styles.typeTextActive
                ]}>
                  CUMULATIVE
                </Text>
                <Text style={styles.typeDescription}>Tap to add +1</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'timed' && styles.typeButtonActive
                ]}
                onPress={() => setType('timed')}
              >
                <Text style={[
                  styles.typeText,
                  type === 'timed' && styles.typeTextActive
                ]}>
                  TIMED
                </Text>
                <Text style={styles.typeDescription}>Start/stop timer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'checkin' && styles.typeButtonActive
                ]}
                onPress={() => setType('checkin')}
              >
                <Text style={[
                  styles.typeText,
                  type === 'checkin' && styles.typeTextActive
                ]}>
                  CHECK-IN
                </Text>
                <Text style={styles.typeDescription}>Rate 1-5</Text>
              </TouchableOpacity>
            </View>
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

          {type !== 'checkin' && (
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

const styles = StyleSheet.create({
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
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#FF7F5C',
  },
  typeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5A4A42',
    letterSpacing: 0.5,
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  typeDescription: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
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

export default AddMetricModal;
