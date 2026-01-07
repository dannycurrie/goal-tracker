import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
  },
  progressRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    borderColor: '#5A4A42',
    backgroundColor: '#FF7F5C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF9D85',
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default AddButton;
