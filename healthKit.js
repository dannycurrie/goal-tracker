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
const MINDFUL_METRIC_ID = 33;
const SLEEP_METRIC_ID = 38;

// HealthKit permissions needed for reading workout data
const healthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.MindfulSession,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.vo2MaxTest,
      AppleHealthKit.Constants.Permissions.Steps,
    ],
  },
};

const getMindfulMinutes = (session) => {
  const { startDate, endDate } = session;
  const duration = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.round(duration / (1000 * 60));
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
 * Get mindful sessions from HealthKit since a given date
 * @param {Date} startDate - Start date for the query
 * @param {Date} endDate - End date for the query (defaults to now)
 * @returns {Promise<Array>} Array of mindful session objects
 */
export const getMindfulSessions = (startDate, endDate = new Date()) => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios') {
      resolve([]);
      return;
    }

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    AppleHealthKit.getMindfulSession(options, (error, results) => {
      if (error) {
        console.log('Error fetching mindful sessions:', error);
        reject(error);
        return;
      }
      console.log('Mindful sessions:', results);

      console.log(`Found ${(results || []).length} mindful sessions`);
      resolve(results || []);
    });
  });
};

/**
 * Get sleep samples from HealthKit since a given date
 * @param {Date} startDate - Start date for the query
 * @param {Date} endDate - End date for the query (defaults to now)
 * @returns {Promise<Array>} Array of sleep sample objects
 */
export const getSleepSamples = (startDate, endDate = new Date()) => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios') {
      resolve([]);
      return;
    }

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    AppleHealthKit.getSleepSamples(options, (error, results) => {
      if (error) {
        console.log('Error fetching sleep data:', error);
        reject(error);
        return;
      }
      console.log(`Found ${(results || []).length} sleep samples`);
      resolve(results || []);
    });
  });
};

/**
 * Aggregate sleep samples into total hours asleep per night.
 * Filters for actual sleep stages (ASLEEP, CORE, DEEP, REM) and groups by
 * the calendar date of the endDate (i.e. the morning the person woke up).
 * @param {Array} samples - Raw sleep samples from HealthKit
 * @returns {Array<{date: string, hours: number}>} Hours slept per night
 */
const getSleepHoursPerNight = (samples) => {
  const asleepSamples = samples.filter(s =>
    ['ASLEEP', 'CORE', 'DEEP', 'REM'].includes(s.value)
  );

  const nightMap = {};
  for (const sample of asleepSamples) {
    const endDate = new Date(sample.endDate);
    const nightKey = endDate.toISOString().split('T')[0];
    if (!nightMap[nightKey]) {
      nightMap[nightKey] = 0;
    }
    const durationMs = new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime();
    nightMap[nightKey] += durationMs;
  }

  return Object.entries(nightMap).map(([date, ms]) => ({
    date,
    hours: Math.round((ms / (1000 * 60 * 60)) * 10) / 10,
  }));
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
 * Find the Apple Health mindful minutes metric
 * @param {Array} metrics - Array of metric objects
 * @returns {Object|null} The mindful metric with source='apple_health' or null if not found
 */
export const findMindfulMetric = (metrics) => {
  return metrics?.find((m) => m.id === MINDFUL_METRIC_ID && m.source === 'apple_health') || null;
};

/**
 * Find the Apple Health sleep metric
 * @param {Array} metrics - Array of metric objects
 * @returns {Object|null} The sleep metric with source='apple_health' or null if not found
 */
export const findSleepMetric = (metrics) => {
  return metrics?.find((m) => m.id === SLEEP_METRIC_ID && m.source === 'apple_health') || null;
};

/**
 * Sync Apple Health data to metrics
 * @param {Array} metrics - Current metrics array
 * @returns {Promise<{synced: boolean, results: object}>}
 */
export const syncWorkouts = async (metrics) => {
  // 1. Initialize HealthKit (requests permission if needed)
  const initialized = await initHealthKit();
  if (!initialized) {
    console.log('HealthKit not initialized or permission denied');
    return { synced: false, results: {} };
  }

  // 2. Determine the start date for the query
  const lastHealthSync = await storage.getLastHealthSyncTime();
  let startDate;

  if (lastHealthSync) {
    startDate = new Date(lastHealthSync);
  } else {
    // Default to 30 days ago
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
  }

  console.log(`Querying health data since: ${startDate.toISOString()}`);

  const results = {
    running: { logged: 0, total: 0 },
    mindful: { logged: 0, total: 0 },
    sleep: { nights: 0, avgHours: 0 },
  };

  // 3. Sync running workouts
  const runningMetric = findRunningMetric(metrics);
  if (runningMetric) {
    try {
      const workouts = await getRunningWorkouts(startDate, new Date());
      for (const workout of workouts) {
        const distanceMiles = workout.distance || 0;
        const distanceKm = Math.round(distanceMiles * 1.60934);
        if (distanceKm > 0) {
          await metricsApi.increment(runningMetric.id, distanceKm);
          results.running.logged++;
          results.running.total += distanceKm;
        }
      }
      console.log(`Running: ${results.running.logged} workouts, ${results.running.total} km`);
    } catch (error) {
      console.error('Error syncing running:', error);
    }
  }

  // 4. Sync mindful sessions
  const mindfulMetric = findMindfulMetric(metrics);
  if (mindfulMetric) {
    try {
      const sessions = await getMindfulSessions(startDate, new Date());
      for (const session of sessions) {
        // Duration is in minutes
        const minutes = getMindfulMinutes(session);
        await metricsApi.increment(mindfulMetric.id, minutes);
        results.mindful.logged++;
        results.mindful.total += minutes;
      }
      console.log(`Mindful: ${results.mindful.logged} sessions, ${results.mindful.total} mins`);
    } catch (error) {
      console.error('Error syncing mindful sessions:', error);
    }
  }

  // 5. Sync sleep data - calculate monthly average from HealthKit
  const sleepMetric = findSleepMetric(metrics);
  if (sleepMetric) {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const sleepSamples = await getSleepSamples(monthStart, now);
      const nightSleeps = getSleepHoursPerNight(sleepSamples);

      if (nightSleeps.length > 0) {
        const totalHours = nightSleeps.reduce((sum, n) => sum + n.hours, 0);
        const avgHours = Math.round((totalHours / nightSleeps.length) * 10) / 10;

        await metricsApi.update(sleepMetric.id, {
          title: sleepMetric.title,
          icon: sleepMetric.icon,
          unit: sleepMetric.unit,
          timeframe: sleepMetric.timeframe,
          goal: sleepMetric.goal,
          currentValue: avgHours,
          type: sleepMetric.type,
        });

        results.sleep.nights = nightSleeps.length;
        results.sleep.avgHours = avgHours;
      }
      console.log(`Sleep: ${nightSleeps.length} nights, avg ${results.sleep.avgHours} hrs`);
    } catch (error) {
      console.error('Error syncing sleep:', error);
    }
  }

  // 6. Update last health sync time
  await storage.setLastHealthSyncTime();

  const totalLogged = results.running.logged + results.mindful.logged;
  console.log(`Health sync complete: ${totalLogged} items synced`);

  return { synced: true, workoutsLogged: totalLogged, distanceKm: results.running.total, results };
};

export default {
  initHealthKit,
  getRunningWorkouts,
  getMindfulSessions,
  getSleepSamples,
  findRunningMetric,
  findMindfulMetric,
  findSleepMetric,
  syncWorkouts,
};
