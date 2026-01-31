import { Platform } from 'react-native';
import AppleHealthKit from 'react-native-health';
import { storage } from './storage';
import { metricsApi } from './api';

const mockMetricsApi = {
  increment: (id, value) => {
    console.log(`Mock incrementing metric ${id} with value ${value}`);
    return Promise.resolve({ id, value });
  }  
};

const mockStorage = {
  getLastHealthSyncTime: () => Promise.resolve(new Date('2026-01-01T00:00:00Z')),
  setLastHealthSyncTime: () => Promise.resolve(),
};

const mockGetRunningWorkouts = () => {
  return Promise.resolve([
    { start: '2026-01-28T20:02:25.950+0000',
      calories: 337.25721945316656,
      activityId: 37,
      metadata: 
      { HKElevationAscended: null,
        HKTimeZone: 'Europe/London',
        HKIndoorWorkout: 0,
        HKAverageMETs: null },
        id: '0C79FEEE-F999-4691-8F1D-F973E4AB93EA',
        end: '2026-01-28T21:00:45.687+0000',
        tracked: true,
        sourceName: 'Danny’s Apple Watch',
        sourceId: 'com.apple.health.AE3522E6-AF74-4D08-BD51-616C1518FE72',
        activityName: 'Running',
        distance: 2.8888971234048606,
        device: 'Watch6,15' }
      ]);
    };
    
// const storage = mockStorage;
// const metricsApi = mockMetricsApi;

const RUNNING_METRIC_ID = 32;

// HealthKit permissions needed for reading workout data
const healthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.MindfulSession,
      AppleHealthKit.Constants.Permissions.vo2MaxTest,
      AppleHealthKit.Constants.Permissions.Steps,
    ],
  },
};

/**
 * Initialize HealthKit and request permissions
 * @returns {Promise<boolean>} true if permissions granted, false otherwise
 */
export const initHealthKit = () => {
  return new Promise((resolve) => {
    if (Platform.OS !== 'ios') {
      console.log('HealthKit is only available on iOS');
      resolve(false);
      return;
    }

    AppleHealthKit.initHealthKit(healthKitPermissions, (error) => {
      if (error) {
        console.log('HealthKit initialization error:', error);
        resolve(false);
        return;
      }
      console.log('HealthKit initialized successfully');
      resolve(true);
    });
  });
};

/**
 * Get running workouts from HealthKit since a given date
 * @param {Date} startDate - Start date for the query
 * @param {Date} endDate - End date for the query (defaults to now)
 * @returns {Promise<Array>} Array of workout objects with distance in meters
 */
export const getRunningWorkouts = (startDate, endDate = new Date()) => {
  // return mockGetRunningWorkouts();
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios') {
      resolve([]);
      return;
    }

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      type: 'Workout',
    };

    AppleHealthKit.getSamples(options, (error, results) => {
      if (error) {
        console.log('Error fetching workouts:', error);
        reject(error);
        return;
      }

      // Filter for running workouts only (includes both indoor and outdoor)
      const runningWorkouts = (results || []).filter(
        (workout) => workout.activityName === 'Running'
      );

      console.log(`Found ${runningWorkouts.length} running workouts`);
      resolve(runningWorkouts);
    });
  });
};

/**
 * Find the Apple Health "KM" metric in the metrics array
 * @param {Array} metrics - Array of metric objects
 * @returns {Object|null} The KM metric with source='apple_health' or null if not found
 */
export const findRunningMetric = (metrics) => {
  return metrics?.find((m) => m.id === RUNNING_METRIC_ID && m.source === 'apple_health') || null;
};

/**
 * Sync running workouts from HealthKit to the KM metric
 * Logs each workout individually with external_id for deduplication
 * @param {Array} metrics - Current metrics array
 * @returns {Promise<{synced: boolean, workoutsLogged: number, distanceKm: number}>}
 */
export const syncRunningWorkouts = async (metrics) => {
  // 1. Check if Apple Health "KM" metric exists
  const runningMetric = findRunningMetric(metrics);
  if (!runningMetric) {
    console.log('No Apple Health "KM" metric found, skipping health sync');
    return { synced: false, workoutsLogged: 0, distanceKm: 0 };
  }

  // 2. Initialize HealthKit (requests permission if needed)
  const initialized = await initHealthKit();
  if (!initialized) {
    console.log('HealthKit not initialized or permission denied');
    return { synced: false, workoutsLogged: 0, distanceKm: 0 };
  }

  // 3. Determine the start date for the query
  // Use lastHealthSyncTime if available, otherwise use lastReset
  const lastHealthSync =  await storage.getLastHealthSyncTime();
  let startDate;

  if (lastHealthSync) {
    startDate = new Date(lastHealthSync);
  } else if (runningMetric.lastReset) {
    startDate = new Date(runningMetric.lastReset);
  } else {
    // Default to 30 days ago if no lastReset
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
  }

  console.log(`Querying workouts since: ${startDate.toISOString()}`);

  // 4. Query HealthKit for running workouts
  try {
    const workouts = await getRunningWorkouts(startDate, new Date());

    if (workouts.length === 0) {
      console.log('No new running workouts found');
      await storage.setLastHealthSyncTime();
      return { synced: true, workoutsLogged: 0, distanceKm: 0 };
    }

    // 5. Log each workout individually using the API
    let workoutsLogged = 0;
    let totalDistanceKm = 0;

    for (const workout of workouts) {
      // Get workout UUID for deduplication
      const workoutId = workout.id || workout.uuid;
      if (!workoutId) {
        console.log('Workout missing ID, skipping:', workout);
        continue;
      }

      const distanceMiles = workout.distance || 0;
      const distanceKm = Math.round(distanceMiles * 1.60934);

      if (distanceKm <= 0) {
        console.log(`Workout ${workoutId} has no distance, skipping`);
        continue;
      }

      try {
        await metricsApi.increment(runningMetric.id, distanceKm);
        console.log(`Logged workout ${workoutId}: ${distanceKm} km`);
        workoutsLogged++;
        totalDistanceKm += distanceKm;
      } catch (error) {
        console.error(`Failed to log workout ${workoutId}:`, error);
        // Continue with other workouts
      }
    }

    // 6. Update last health sync time
    await storage.setLastHealthSyncTime();

    console.log(`Health sync complete: ${workoutsLogged} new workouts, ${totalDistanceKm} km total`);
    return { synced: true, workoutsLogged, distanceKm: totalDistanceKm };
  } catch (error) {
    console.error('Error syncing running workouts:', error);
    return { synced: false, workoutsLogged: 0, distanceKm: 0 };
  }
};

export default {
  initHealthKit,
  getRunningWorkouts,
  findRunningMetric,
  syncRunningWorkouts,
};
