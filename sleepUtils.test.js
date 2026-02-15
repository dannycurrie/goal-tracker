const { getEarlyRiseDays, getSleepHoursPerNight } = require('./sleepUtils');
const { mockSleepSamples } = require('./mockSleepSamples');

describe('getEarlyRiseDays', () => {
  it('counts 1 early rise day for the mock data (woke at 06:28 UTC)', () => {
    const result = getEarlyRiseDays(mockSleepSamples);
    expect(result).toBe(1);
  });

  it('returns 0 when all wake-up times are after 7am', () => {
    const lateSamples = [
      { startDate: '2026-02-13T06:00:00.000+0000', endDate: '2026-02-13T08:00:00.000+0000', value: 'CORE' },
    ];
    const result = getEarlyRiseDays(lateSamples);
    expect(result).toBe(0);
  });

  it('returns 0 for empty samples', () => {
    expect(getEarlyRiseDays([])).toBe(0);
  });

  it('ignores AWAKE samples when determining wake-up time', () => {
    const samples = [
      { startDate: '2026-02-13T05:00:00.000+0000', endDate: '2026-02-13T06:00:00.000+0000', value: 'CORE' },
      { startDate: '2026-02-13T06:00:00.000+0000', endDate: '2026-02-13T08:00:00.000+0000', value: 'AWAKE' },
    ];
    // Latest non-AWAKE is 06:00 (hour 6 < 7), so should count
    const result = getEarlyRiseDays(samples);
    expect(result).toBe(1);
  });

  it('counts multiple nights independently', () => {
    const samples = [
      // Night 1: wake at 06:30 UTC (< 7)
      { startDate: '2026-02-13T04:00:00.000+0000', endDate: '2026-02-13T06:30:00.000+0000', value: 'CORE' },
      // Night 2: wake at 07:30 UTC (>= 7)
      { startDate: '2026-02-14T05:00:00.000+0000', endDate: '2026-02-14T07:30:00.000+0000', value: 'CORE' },
      // Night 3: wake at 05:00 UTC (< 7)
      { startDate: '2026-02-15T03:00:00.000+0000', endDate: '2026-02-15T05:00:00.000+0000', value: 'REM' },
    ];
    const result = getEarlyRiseDays(samples);
    expect(result).toBe(2);
  });
});

describe('getSleepHoursPerNight', () => {
  it('aggregates mock data into one night with correct hours', () => {
    const result = getSleepHoursPerNight(mockSleepSamples);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-02-13');
    // Total sleep time excluding AWAKE periods should be ~4.8 hours
    expect(result[0].hours).toBeGreaterThan(4);
    expect(result[0].hours).toBeLessThan(6);
  });

  it('excludes AWAKE and INBED samples', () => {
    const samples = [
      { startDate: '2026-02-13T02:00:00.000+0000', endDate: '2026-02-13T03:00:00.000+0000', value: 'AWAKE' },
      { startDate: '2026-02-13T03:00:00.000+0000', endDate: '2026-02-13T04:00:00.000+0000', value: 'INBED' },
      { startDate: '2026-02-13T04:00:00.000+0000', endDate: '2026-02-13T09:00:00.000+0000', value: 'DEEP' },
    ];
    const result = getSleepHoursPerNight(samples);
    expect(result).toHaveLength(1);
    expect(result[0].hours).toBe(5);
  });

  it('returns empty array for no samples', () => {
    expect(getSleepHoursPerNight([])).toEqual([]);
  });
});
