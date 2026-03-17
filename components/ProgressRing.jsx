import { StyleSheet } from 'react-native';
import { Svg, Circle } from 'react-native-svg';

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
        stroke="#1E5C35"
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

const styles = StyleSheet.create({
  progressSvg: {
    position: 'absolute',
  },
});

export default ProgressRing;
