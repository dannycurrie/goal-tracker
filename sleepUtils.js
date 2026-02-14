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
 * Count how many nights the person got out of bed before 7am.
 * Only considers samples ending between 5am–9am to isolate the actual
 * wake-up window and ignore pre-midnight samples.
 * @param {Array} samples - Raw sleep samples from HealthKit
 * @returns {number} Number of days with wake-up before 7:00 AM
 */
const getEarlyRiseDays = (samples) => {
  const sleepSamples = samples.filter(s => {
    if (s.value === 'AWAKE') return false;
    const hour = new Date(s.endDate).getHours();
    return hour >= 5 && hour < 9;
  });

  // Find the latest endDate per morning (= when person got out of bed)
  const nightMap = {};
  for (const sample of sleepSamples) {
    const endDate = new Date(sample.endDate);
    const nightKey = endDate.toISOString().split('T')[0];
    if (!nightMap[nightKey] || endDate > nightMap[nightKey]) {
      nightMap[nightKey] = endDate;
    }
  }


  console.log('Night map', nightMap);
  
  let count = 0;
  for (const wakeUpTime of Object.values(nightMap)) {
    if (wakeUpTime.getHours() < 7) {
      count++;
    }
  }
  return count;
};

module.exports = { getSleepHoursPerNight, getEarlyRiseDays };
