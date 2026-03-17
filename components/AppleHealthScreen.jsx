import { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { colors } from '../theme';

const AppleHealthScreen = ({
  visible,
  onClose,
  metrics = [],
  onEdit,
}) => {
  const lastTapRef = useRef({});

  const handlePress = (metric) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    const lastTap = lastTapRef.current[metric.id];

    if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
      // Double tap - edit
      lastTapRef.current[metric.id] = null;
      if (onEdit) {
        onEdit(metric);
      }
    } else {
      lastTapRef.current[metric.id] = now;
      setTimeout(() => {
        lastTapRef.current[metric.id] = null;
      }, DOUBLE_PRESS_DELAY);
    }
  };

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
          {metrics.map(metric => {
            const progress = metric.goal > 0 ? Math.min(metric.currentValue / metric.goal, 1) : 0;
            const progressPercent = Math.round(progress * 100);
            return (
              <TouchableOpacity
                key={metric.id}
                style={styles.metricSection}
                onPress={() => handlePress(metric)}
              >
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
                  {metric.currentValue || 0} / {metric.goal} {metric.unit}
                </Text>
                <Text style={styles.metricTimeframe}>this {metric.timeframe}</Text>
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.iconCircle,
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
    color: colors.primaryDark,
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
});

export default AppleHealthScreen;
