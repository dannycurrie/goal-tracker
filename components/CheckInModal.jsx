import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import Slider from '@react-native-community/slider';

const CheckInModal = ({ visible, metric, onClose, onSave }) => {
  const [value, setValue] = useState(3); // Default to middle value

  const handleSave = () => {
    onSave(value);
    setValue(3); // Reset for next time
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
          <Text style={styles.modalTitle}>CHECK IN: {metric?.title}</Text>
          <Text style={styles.emoji}>{metric?.icon}</Text>

          <View style={styles.sliderContainer}>
            <Text style={styles.valueDisplay}>{value}</Text>

            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={value}
              onValueChange={setValue}
              minimumTrackTintColor="#FF7F5C"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#FF7F5C"
            />

            <View style={styles.labels}>
              <Text style={styles.labelText}>1</Text>
              <Text style={styles.labelText}>2</Text>
              <Text style={styles.labelText}>3</Text>
              <Text style={styles.labelText}>4</Text>
              <Text style={styles.labelText}>5</Text>
            </View>
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
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  emoji: {
    fontSize: 60,
    textAlign: 'center',
    marginBottom: 30,
  },
  sliderContainer: {
    marginBottom: 40,
  },
  valueDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF7F5C',
    textAlign: 'center',
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  labelText: {
    fontSize: 14,
    color: '#999',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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

export default CheckInModal;
