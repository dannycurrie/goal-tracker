import { useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ProgressRing from './ProgressRing';

const MetricCircle = ({ metric, isTimerRunning, timerElapsed, onPress, onDoublePress }) => {
  const progress = metric.goal > 0 ? Math.min(metric.currentValue / metric.goal, 1) : 0;
  const lastTap = useRef(null);

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
      // Double tap - edit
      lastTap.current = null;
      if (onDoublePress) {
        onDoublePress();
      }
    } else {
      // Single tap
      lastTap.current = now;

      if (metric.type === 'timed') {
        // For timed metrics, immediate action (no delay)
        if (onPress) {
          onPress();
        }
        // Still track for potential double-tap
        setTimeout(() => {
          lastTap.current = null;
        }, DOUBLE_PRESS_DELAY);
      } else {
        // For cumulative, wait for potential double-tap
        setTimeout(() => {
          if (lastTap.current === now && onPress) {
            onPress();
          }
          lastTap.current = null;
        }, DOUBLE_PRESS_DELAY);
      }
    }
  };

  const progressText = useMemo(() => {
    if (metric.type === 'timed' && isTimerRunning) {
      const minutes = Math.floor(timerElapsed / 60);
      const seconds = timerElapsed % 60;
      return `Running: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${metric.currentValue} / ${metric.goal} this ${metric.timeframe}`;
  }, [metric, isTimerRunning, timerElapsed]);

  return (
    <TouchableOpacity style={styles.metricContainer} onPress={handlePress}>
      <View style={styles.circle}>
        <ProgressRing progress={progress} />
        <View style={[
          styles.iconContainer,
          isTimerRunning && styles.iconContainerActive
        ]}>
          <Text style={styles.icon}>{metric.icon}</Text>
        </View>
      </View>
      <Text style={styles.metricTitle}>{metric.title}</Text>
      <Text style={styles.metricProgress}>{progressText}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF9D85',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  icon: {
    fontSize: 50,
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
});

export default MetricCircle;
