import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';

const ExerciseChecklistScreen = ({
  visible,
  onClose,
  metrics = [],
  onToggleTask,
}) => {
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
          <Text style={styles.title}>EXERCISE</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {metrics.map(metric => {
            const isChecked = metric.currentValue === 1;
            return (
              <TouchableOpacity
                key={metric.id}
                style={styles.taskRow}
                onPress={() => onToggleTask(metric)}
              >
                <Text style={styles.checkbox}>
                  {isChecked ? '☑' : '☐'}
                </Text>
                <Text style={styles.taskIcon}>{metric.icon}</Text>
                <Text style={[
                  styles.taskTitle,
                  isChecked && styles.taskTitleChecked,
                ]}>
                  {metric.title}
                </Text>
              </TouchableOpacity>
            );
          })}
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
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  checkbox: {
    fontSize: 28,
    color: '#FFFFFF',
    marginRight: 14,
  },
  taskIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  taskTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  taskTitleChecked: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});

export default ExerciseChecklistScreen;
