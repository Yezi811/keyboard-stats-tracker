import { StatisticsService } from './services';
import { KeystrokeRepository } from '../infrastructure/KeystrokeRepository';
import { Keystroke } from './models';
import * as fs from 'fs';
import * as fc from 'fast-check';

describe('StatisticsService', () => {
  const testDbPath = './test-stats-service.db';
  let repository: KeystrokeRepository;
  let service: StatisticsService;

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    repository = new KeystrokeRepository(testDbPath);
    await repository.initialize();
    service = new StatisticsService(repository);
  });

  afterEach(async () => {
    await repository.close();

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('getDailyStats', () => {
    it('should return daily statistics for a specific date', async () => {
      // Prepare test data for a specific day
      const testDate = new Date('2024-01-15');
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T11:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-15T12:00:00').getTime() },
        { keyCode: 67, keyName: 'C', timestamp: new Date('2024-01-15T13:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // Get daily stats
      const stats = await service.getDailyStats(testDate);

      // Verify results
      expect(stats.date.toISOString().split('T')[0]).toBe('2024-01-15');
      expect(stats.totalKeystrokes).toBe(4);
      expect(stats.keyBreakdown.length).toBe(3);
      
      // Verify sorted by count DESC
      expect(stats.keyBreakdown[0].keyName).toBe('A');
      expect(stats.keyBreakdown[0].count).toBe(2);
    });

    it('should return zero counts for a day with no data', async () => {
      const testDate = new Date('2024-01-15');

      const stats = await service.getDailyStats(testDate);

      expect(stats.totalKeystrokes).toBe(0);
      expect(stats.keyBreakdown.length).toBe(0);
    });

    it('should only include data from the specified day', async () => {
      // Add data for multiple days
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-16T10:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // Get stats for Jan 15
      const stats = await service.getDailyStats(new Date('2024-01-15'));

      expect(stats.totalKeystrokes).toBe(1);
      expect(stats.keyBreakdown[0].keyName).toBe('A');
    });
  });

  describe('getMonthlyStats', () => {
    it('should return monthly statistics for a specific month', async () => {
      // Prepare test data for January 2024
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-20T11:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-25T12:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // Get monthly stats
      const stats = await service.getMonthlyStats(2024, 1);

      // Verify results
      expect(stats.year).toBe(2024);
      expect(stats.month).toBe(1);
      expect(stats.totalKeystrokes).toBe(3);
      expect(stats.keyBreakdown.length).toBe(2);
      expect(stats.dailyTrend.length).toBe(31); // January has 31 days
    });

    it('should throw error for invalid month', async () => {
      await expect(service.getMonthlyStats(2024, 0)).rejects.toThrow();
      await expect(service.getMonthlyStats(2024, 13)).rejects.toThrow();
    });

    it('should handle leap year February correctly', async () => {
      // 2024 is a leap year
      const stats = await service.getMonthlyStats(2024, 2);

      expect(stats.dailyTrend.length).toBe(29); // February 2024 has 29 days
    });

    it('should handle non-leap year February correctly', async () => {
      // 2023 is not a leap year
      const stats = await service.getMonthlyStats(2023, 2);

      expect(stats.dailyTrend.length).toBe(28); // February 2023 has 28 days
    });

    it('should only include data from the specified month', async () => {
      // Add data for multiple months
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-02-15T10:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // Get stats for January
      const stats = await service.getMonthlyStats(2024, 1);

      expect(stats.totalKeystrokes).toBe(1);
      expect(stats.keyBreakdown[0].keyName).toBe('A');
    });
  });

  describe('getYearlyStats', () => {
    it('should return yearly statistics for a specific year', async () => {
      // Prepare test data for 2024
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-06-20T11:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-12-25T12:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // Get yearly stats
      const stats = await service.getYearlyStats(2024);

      // Verify results
      expect(stats.year).toBe(2024);
      expect(stats.totalKeystrokes).toBe(3);
      expect(stats.keyBreakdown.length).toBe(2);
      expect(stats.monthlyTrend.length).toBe(12); // 12 months
    });

    it('should return zero counts for a year with no data', async () => {
      const stats = await service.getYearlyStats(2024);

      expect(stats.totalKeystrokes).toBe(0);
      expect(stats.keyBreakdown.length).toBe(0);
      expect(stats.monthlyTrend.length).toBe(12);
      
      // All months should have zero count
      stats.monthlyTrend.forEach(trend => {
        expect(trend.count).toBe(0);
      });
    });

    it('should only include data from the specified year', async () => {
      // Add data for multiple years
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2023-01-15T10:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // Get stats for 2024
      const stats = await service.getYearlyStats(2024);

      expect(stats.totalKeystrokes).toBe(1);
      expect(stats.keyBreakdown[0].keyName).toBe('A');
    });
  });

  describe('getTopKeys', () => {
    it('should return top N keys for a day', async () => {
      // Prepare test data
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T11:00:00').getTime() },
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T12:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-15T13:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-15T14:00:00').getTime() },
        { keyCode: 67, keyName: 'C', timestamp: new Date('2024-01-15T15:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // Get top 2 keys
      const topKeys = await service.getTopKeys('day', new Date('2024-01-15'), 2);

      expect(topKeys.length).toBe(2);
      expect(topKeys[0].keyName).toBe('A');
      expect(topKeys[0].count).toBe(3);
      expect(topKeys[1].keyName).toBe('B');
      expect(topKeys[1].count).toBe(2);
    });

    it('should return all keys if limit exceeds total keys', async () => {
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-15T11:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      const topKeys = await service.getTopKeys('day', new Date('2024-01-15'), 10);

      expect(topKeys.length).toBe(2);
    });

    it('should return empty array for period with no data', async () => {
      const topKeys = await service.getTopKeys('day', new Date('2024-01-15'), 5);

      expect(topKeys.length).toBe(0);
    });
  });

  describe('trend data consistency', () => {
    it('should have daily trend sum equal to monthly total', async () => {
      // Prepare test data for January 2024
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-20T11:00:00').getTime() },
        { keyCode: 67, keyName: 'C', timestamp: new Date('2024-01-25T12:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      const stats = await service.getMonthlyStats(2024, 1);

      // Sum of daily trend should equal total keystrokes
      const dailySum = stats.dailyTrend.reduce((sum, trend) => sum + trend.count, 0);
      expect(dailySum).toBe(stats.totalKeystrokes);
    });

    it('should have monthly trend sum equal to yearly total', async () => {
      // Prepare test data for 2024
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-06-20T11:00:00').getTime() },
        { keyCode: 67, keyName: 'C', timestamp: new Date('2024-12-25T12:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      const stats = await service.getYearlyStats(2024);

      // Sum of monthly trend should equal total keystrokes
      const monthlySum = stats.monthlyTrend.reduce((sum, trend) => sum + trend.count, 0);
      expect(monthlySum).toBe(stats.totalKeystrokes);
    });
  });

  // **Feature: keyboard-stats-tracker, Property 7: 趋势数据一致性**
  // **Validates: Requirements 4.4, 5.4**
  describe('Property 7: Trend data consistency', () => {
    it('should have sum of daily trends equal to monthly total for any month', async () => {
      // For any month and any set of keystrokes, the sum of all daily trend counts
      // should equal the monthly total keystrokes
      const yearMonthArbitrary = fc.record({
        year: fc.integer({ min: 2020, max: 2030 }),
        month: fc.integer({ min: 1, max: 12 })
      });

      await fc.assert(
        fc.asyncProperty(
          yearMonthArbitrary,
          fc.array(
            fc.record({
              keyCode: fc.integer({ min: 0, max: 255 }),
              keyName: fc.string({ minLength: 1, maxLength: 20 }),
              day: fc.integer({ min: 1, max: 31 }),
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 }),
              second: fc.integer({ min: 0, max: 59 })
            }),
            { minLength: 0, maxLength: 100 }
          ),
          async (targetPeriod, keystrokes) => {
            // Clean database for this test iteration
            await repository.clear();

            // Normalize all keystrokes to the target month
            const daysInMonth = new Date(targetPeriod.year, targetPeriod.month, 0).getDate();
            const normalizedKeystrokes = keystrokes
              .filter(k => k.day <= daysInMonth) // Only include valid days for this month
              .map(k => ({
                keyCode: k.keyCode,
                keyName: k.keyName,
                timestamp: new Date(
                  targetPeriod.year,
                  targetPeriod.month - 1,
                  k.day,
                  k.hour,
                  k.minute,
                  k.second
                ).getTime()
              }));

            // Save all keystrokes
            if (normalizedKeystrokes.length > 0) {
              await repository.save(normalizedKeystrokes);
            }

            // Get monthly stats
            const stats = await service.getMonthlyStats(targetPeriod.year, targetPeriod.month);

            // Sum of daily trend should equal total keystrokes
            const dailySum = stats.dailyTrend.reduce((sum, trend) => sum + trend.count, 0);

            return dailySum === stats.totalKeystrokes;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for property-based test

    it('should have sum of monthly trends equal to yearly total for any year', async () => {
      // For any year and any set of keystrokes, the sum of all monthly trend counts
      // should equal the yearly total keystrokes
      const yearArbitrary = fc.integer({ min: 2020, max: 2030 });

      await fc.assert(
        fc.asyncProperty(
          yearArbitrary,
          fc.array(
            fc.record({
              keyCode: fc.integer({ min: 0, max: 255 }),
              keyName: fc.string({ minLength: 1, maxLength: 20 }),
              month: fc.integer({ min: 1, max: 12 }),
              day: fc.integer({ min: 1, max: 28 }), // Use 28 to be safe for all months
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 }),
              second: fc.integer({ min: 0, max: 59 })
            }),
            { minLength: 0, maxLength: 100 }
          ),
          async (targetYear, keystrokes) => {
            // Clean database for this test iteration
            await repository.clear();

            // Normalize all keystrokes to the target year
            const normalizedKeystrokes = keystrokes.map(k => ({
              keyCode: k.keyCode,
              keyName: k.keyName,
              timestamp: new Date(
                targetYear,
                k.month - 1,
                k.day,
                k.hour,
                k.minute,
                k.second
              ).getTime()
            }));

            // Save all keystrokes
            if (normalizedKeystrokes.length > 0) {
              await repository.save(normalizedKeystrokes);
            }

            // Get yearly stats
            const stats = await service.getYearlyStats(targetYear);

            // Sum of monthly trend should equal total keystrokes
            const monthlySum = stats.monthlyTrend.reduce((sum, trend) => sum + trend.count, 0);

            return monthlySum === stats.totalKeystrokes;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for property-based test
  });

  // **Feature: keyboard-stats-tracker, Property 5: 统计聚合准确性**
  // **Validates: Requirements 3.1, 3.2, 4.1, 4.2, 5.1, 5.2**
  describe('Property 5: Statistical aggregation accuracy', () => {
    it('should have total keystrokes equal to sum of all key counts for daily stats', async () => {
      // For any set of keystrokes on a given day, the total count should equal
      // the sum of individual key counts
      const dateArbitrary = fc.date({ 
        min: new Date('2020-01-01'), 
        max: new Date('2030-12-31') 
      });

      const keystrokeArbitrary = fc.record({
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 20 }),
        timestamp: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
      });

      await fc.assert(
        fc.asyncProperty(
          dateArbitrary,
          fc.array(keystrokeArbitrary, { minLength: 0, maxLength: 100 }),
          async (targetDate, keystrokes) => {
            // Clean database for this test iteration
            await repository.clear();

            // Save all keystrokes
            if (keystrokes.length > 0) {
              await repository.save(keystrokes);
            }

            // Get daily stats for target date
            const stats = await service.getDailyStats(targetDate);

            // Sum of all key counts should equal total keystrokes
            const sumOfKeyCounts = stats.keyBreakdown.reduce((sum, key) => sum + key.count, 0);

            return stats.totalKeystrokes === sumOfKeyCounts;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have total keystrokes equal to sum of all key counts for monthly stats', async () => {
      // For any set of keystrokes in a given month, the total count should equal
      // the sum of individual key counts
      const yearMonthArbitrary = fc.record({
        year: fc.integer({ min: 2020, max: 2030 }),
        month: fc.integer({ min: 1, max: 12 })
      });

      const keystrokeArbitrary = fc.record({
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 20 }),
        timestamp: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
      });

      await fc.assert(
        fc.asyncProperty(
          yearMonthArbitrary,
          fc.array(keystrokeArbitrary, { minLength: 0, maxLength: 100 }),
          async (targetPeriod, keystrokes) => {
            // Clean database for this test iteration
            await repository.clear();

            // Save all keystrokes
            if (keystrokes.length > 0) {
              await repository.save(keystrokes);
            }

            // Get monthly stats
            const stats = await service.getMonthlyStats(targetPeriod.year, targetPeriod.month);

            // Sum of all key counts should equal total keystrokes
            const sumOfKeyCounts = stats.keyBreakdown.reduce((sum, key) => sum + key.count, 0);

            return stats.totalKeystrokes === sumOfKeyCounts;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have total keystrokes equal to sum of all key counts for yearly stats', async () => {
      // For any set of keystrokes in a given year, the total count should equal
      // the sum of individual key counts
      const yearArbitrary = fc.integer({ min: 2020, max: 2030 });

      const keystrokeArbitrary = fc.record({
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 20 }),
        timestamp: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
      });

      await fc.assert(
        fc.asyncProperty(
          yearArbitrary,
          fc.array(keystrokeArbitrary, { minLength: 0, maxLength: 100 }),
          async (targetYear, keystrokes) => {
            // Clean database for this test iteration
            await repository.clear();

            // Save all keystrokes
            if (keystrokes.length > 0) {
              await repository.save(keystrokes);
            }

            // Get yearly stats
            const stats = await service.getYearlyStats(targetYear);

            // Sum of all key counts should equal total keystrokes
            const sumOfKeyCounts = stats.keyBreakdown.reduce((sum, key) => sum + key.count, 0);

            return stats.totalKeystrokes === sumOfKeyCounts;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: keyboard-stats-tracker, Property 6: 统计结果排序**
  // **Validates: Requirements 3.5**
  describe('Property 6: Statistical result sorting', () => {
    it('should return key breakdown sorted by count in descending order for daily stats', async () => {
      // For any set of keystrokes, the key breakdown should be sorted by count DESC
      const dateArbitrary = fc.date({ 
        min: new Date('2020-01-01'), 
        max: new Date('2030-12-31') 
      });

      const keystrokeArbitrary = fc.record({
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 20 }),
        timestamp: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
      });

      await fc.assert(
        fc.asyncProperty(
          dateArbitrary,
          fc.array(keystrokeArbitrary, { minLength: 1, maxLength: 100 }),
          async (targetDate, keystrokes) => {
            // Clean database for this test iteration
            await repository.clear();

            // Normalize all keystrokes to the target date
            const normalizedKeystrokes = keystrokes.map(k => ({
              ...k,
              timestamp: new Date(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                targetDate.getDate(),
                Math.floor(Math.random() * 24),
                Math.floor(Math.random() * 60),
                Math.floor(Math.random() * 60)
              ).getTime()
            }));

            // Save all keystrokes
            await repository.save(normalizedKeystrokes);

            // Get daily stats
            const stats = await service.getDailyStats(targetDate);

            // Verify sorting: each element should have count >= next element's count
            for (let i = 0; i < stats.keyBreakdown.length - 1; i++) {
              if (stats.keyBreakdown[i].count < stats.keyBreakdown[i + 1].count) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return key breakdown sorted by count in descending order for monthly stats', async () => {
      // For any set of keystrokes, the key breakdown should be sorted by count DESC
      const yearMonthArbitrary = fc.record({
        year: fc.integer({ min: 2020, max: 2030 }),
        month: fc.integer({ min: 1, max: 12 })
      });

      const keystrokeArbitrary = fc.record({
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 20 }),
        timestamp: fc.integer({ min: 0, max: 1000000 })
      });

      await fc.assert(
        fc.asyncProperty(
          yearMonthArbitrary,
          fc.array(keystrokeArbitrary, { minLength: 1, maxLength: 100 }),
          async (targetPeriod, keystrokes) => {
            // Clean database for this test iteration
            await repository.clear();

            // Normalize all keystrokes to the target month
            const daysInMonth = new Date(targetPeriod.year, targetPeriod.month, 0).getDate();
            const normalizedKeystrokes = keystrokes.map(k => ({
              ...k,
              timestamp: new Date(
                targetPeriod.year,
                targetPeriod.month - 1,
                Math.floor(Math.random() * daysInMonth) + 1,
                Math.floor(Math.random() * 24),
                Math.floor(Math.random() * 60),
                Math.floor(Math.random() * 60)
              ).getTime()
            }));

            // Save all keystrokes
            await repository.save(normalizedKeystrokes);

            // Get monthly stats
            const stats = await service.getMonthlyStats(targetPeriod.year, targetPeriod.month);

            // Verify sorting: each element should have count >= next element's count
            for (let i = 0; i < stats.keyBreakdown.length - 1; i++) {
              if (stats.keyBreakdown[i].count < stats.keyBreakdown[i + 1].count) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should return key breakdown sorted by count in descending order for yearly stats', async () => {
      // For any set of keystrokes, the key breakdown should be sorted by count DESC
      const yearArbitrary = fc.integer({ min: 2020, max: 2030 });

      const keystrokeArbitrary = fc.record({
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 20 }),
        timestamp: fc.integer({ min: 0, max: 1000000 })
      });

      await fc.assert(
        fc.asyncProperty(
          yearArbitrary,
          fc.array(keystrokeArbitrary, { minLength: 1, maxLength: 100 }),
          async (targetYear, keystrokes) => {
            // Clean database for this test iteration
            await repository.clear();

            // Normalize all keystrokes to the target year
            const normalizedKeystrokes = keystrokes.map(k => ({
              ...k,
              timestamp: new Date(
                targetYear,
                Math.floor(Math.random() * 12),
                Math.floor(Math.random() * 28) + 1,
                Math.floor(Math.random() * 24),
                Math.floor(Math.random() * 60),
                Math.floor(Math.random() * 60)
              ).getTime()
            }));

            // Save all keystrokes
            await repository.save(normalizedKeystrokes);

            // Get yearly stats
            const stats = await service.getYearlyStats(targetYear);

            // Verify sorting: each element should have count >= next element's count
            for (let i = 0; i < stats.keyBreakdown.length - 1; i++) {
              if (stats.keyBreakdown[i].count < stats.keyBreakdown[i + 1].count) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should return top keys sorted by count in descending order', async () => {
      // For any set of keystrokes, getTopKeys should return results sorted by count DESC
      const dateArbitrary = fc.date({ 
        min: new Date('2020-01-01'), 
        max: new Date('2030-12-31') 
      });

      const keystrokeArbitrary = fc.record({
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 20 }),
        timestamp: fc.integer({ min: 0, max: 1000000 })
      });

      await fc.assert(
        fc.asyncProperty(
          dateArbitrary,
          fc.array(keystrokeArbitrary, { minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 20 }),
          async (targetDate, keystrokes, limit) => {
            // Clean database for this test iteration
            await repository.clear();

            // Normalize all keystrokes to the target date
            const normalizedKeystrokes = keystrokes.map(k => ({
              ...k,
              timestamp: new Date(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                targetDate.getDate(),
                Math.floor(Math.random() * 24),
                Math.floor(Math.random() * 60),
                Math.floor(Math.random() * 60)
              ).getTime()
            }));

            // Save all keystrokes
            await repository.save(normalizedKeystrokes);

            // Get top keys
            const topKeys = await service.getTopKeys('day', targetDate, limit);

            // Verify sorting: each element should have count >= next element's count
            for (let i = 0; i < topKeys.length - 1; i++) {
              if (topKeys[i].count < topKeys[i + 1].count) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Unit tests for edge cases
  // Requirements: 3.4, 4.5, 5.5
  describe('Edge cases', () => {
    it('should return zero counts for empty data', async () => {
      // Test daily stats with no data
      const dailyStats = await service.getDailyStats(new Date('2024-01-15'));
      expect(dailyStats.totalKeystrokes).toBe(0);
      expect(dailyStats.keyBreakdown.length).toBe(0);

      // Test monthly stats with no data
      const monthlyStats = await service.getMonthlyStats(2024, 1);
      expect(monthlyStats.totalKeystrokes).toBe(0);
      expect(monthlyStats.keyBreakdown.length).toBe(0);
      expect(monthlyStats.dailyTrend.every(trend => trend.count === 0)).toBe(true);

      // Test yearly stats with no data
      const yearlyStats = await service.getYearlyStats(2024);
      expect(yearlyStats.totalKeystrokes).toBe(0);
      expect(yearlyStats.keyBreakdown.length).toBe(0);
      expect(yearlyStats.monthlyTrend.every(trend => trend.count === 0)).toBe(true);
    });

    it('should handle leap year February 29th correctly', async () => {
      // 2024 is a leap year
      const leapYearDate = new Date('2024-02-29');
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-02-29T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-02-29T11:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // Get daily stats for Feb 29, 2024
      const dailyStats = await service.getDailyStats(leapYearDate);
      expect(dailyStats.totalKeystrokes).toBe(2);
      expect(dailyStats.keyBreakdown.length).toBe(2);

      // Get monthly stats for February 2024
      const monthlyStats = await service.getMonthlyStats(2024, 2);
      expect(monthlyStats.dailyTrend.length).toBe(29); // Leap year has 29 days
      expect(monthlyStats.totalKeystrokes).toBe(2);

      // Verify Feb 29 is included in the daily trend
      const feb29Trend = monthlyStats.dailyTrend.find(
        trend => trend.date.getUTCDate() === 29
      );
      expect(feb29Trend).toBeDefined();
      expect(feb29Trend!.count).toBe(2);
    });

    it('should handle cross-year month transitions correctly', async () => {
      // Add data spanning December 2023 to January 2024
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: Date.UTC(2023, 11, 31, 23, 0, 0) },
        { keyCode: 66, keyName: 'B', timestamp: Date.UTC(2024, 0, 1, 1, 0, 0) }
      ];

      await repository.save(keystrokes);

      // Get December 2023 stats
      const dec2023Stats = await service.getMonthlyStats(2023, 12);
      expect(dec2023Stats.totalKeystrokes).toBe(1);
      expect(dec2023Stats.keyBreakdown[0].keyName).toBe('A');

      // Get January 2024 stats
      const jan2024Stats = await service.getMonthlyStats(2024, 1);
      expect(jan2024Stats.totalKeystrokes).toBe(1);
      expect(jan2024Stats.keyBreakdown[0].keyName).toBe('B');

      // Get 2023 yearly stats
      const year2023Stats = await service.getYearlyStats(2023);
      expect(year2023Stats.totalKeystrokes).toBe(1);

      // Get 2024 yearly stats
      const year2024Stats = await service.getYearlyStats(2024);
      expect(year2024Stats.totalKeystrokes).toBe(1);

      // Verify December trend in 2023
      const decTrend = year2023Stats.monthlyTrend.find(trend => trend.month === 12);
      expect(decTrend).toBeDefined();
      expect(decTrend!.count).toBe(1);

      // Verify January trend in 2024
      const janTrend = year2024Stats.monthlyTrend.find(trend => trend.month === 1);
      expect(janTrend).toBeDefined();
      expect(janTrend!.count).toBe(1);
    });

    it('should handle non-leap year February correctly', async () => {
      // 2023 is not a leap year
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2023-02-28T10:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // Get monthly stats for February 2023
      const monthlyStats = await service.getMonthlyStats(2023, 2);
      expect(monthlyStats.dailyTrend.length).toBe(28); // Non-leap year has 28 days
      expect(monthlyStats.totalKeystrokes).toBe(1);

      // Verify Feb 28 is the last day
      const lastDay = monthlyStats.dailyTrend[monthlyStats.dailyTrend.length - 1];
      expect(lastDay.date.getUTCDate()).toBe(28);
      expect(lastDay.count).toBe(1);
    });

    it('should handle month boundaries correctly', async () => {
      // Add data at the boundaries of a month
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: Date.UTC(2024, 0, 1, 0, 0, 0) },
        { keyCode: 66, keyName: 'B', timestamp: Date.UTC(2024, 0, 31, 23, 59, 59) },
        { keyCode: 67, keyName: 'C', timestamp: Date.UTC(2024, 1, 1, 0, 0, 0) }
      ];

      await repository.save(keystrokes);

      // Get January stats
      const janStats = await service.getMonthlyStats(2024, 1);
      expect(janStats.totalKeystrokes).toBe(2);

      // Verify first day
      const firstDay = janStats.dailyTrend[0];
      expect(firstDay.date.getUTCDate()).toBe(1);
      expect(firstDay.count).toBe(1);

      // Verify last day
      const lastDay = janStats.dailyTrend[30]; // January has 31 days (index 30)
      expect(lastDay.date.getUTCDate()).toBe(31);
      expect(lastDay.count).toBe(1);

      // Get February stats
      const febStats = await service.getMonthlyStats(2024, 2);
      expect(febStats.totalKeystrokes).toBe(1);
    });

    it('should handle year boundaries correctly', async () => {
      // Add data at the boundaries of a year
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: Date.UTC(2024, 0, 1, 0, 0, 0) },
        { keyCode: 66, keyName: 'B', timestamp: Date.UTC(2024, 11, 31, 23, 59, 59) },
        { keyCode: 67, keyName: 'C', timestamp: Date.UTC(2025, 0, 1, 0, 0, 0) }
      ];

      await repository.save(keystrokes);

      // Get 2024 stats
      const year2024Stats = await service.getYearlyStats(2024);
      expect(year2024Stats.totalKeystrokes).toBe(2);

      // Verify first month
      const firstMonth = year2024Stats.monthlyTrend[0];
      expect(firstMonth.month).toBe(1);
      expect(firstMonth.count).toBe(1);

      // Verify last month
      const lastMonth = year2024Stats.monthlyTrend[11];
      expect(lastMonth.month).toBe(12);
      expect(lastMonth.count).toBe(1);

      // Get 2025 stats
      const year2025Stats = await service.getYearlyStats(2025);
      expect(year2025Stats.totalKeystrokes).toBe(1);
    });
  });

  // **Feature: keyboard-stats-tracker, Property 4: 日期范围过滤准确性**
  // **Validates: Requirements 3.3, 4.3, 5.3**
  describe('Property 4: Date range filtering accuracy', () => {
    it('should only return keystrokes within the specified date for daily stats', async () => {
      // Generate arbitrary date and keystrokes
      const dateArbitrary = fc.date({ 
        min: new Date('2020-01-01'), 
        max: new Date('2030-12-31') 
      });

      const keystrokeArbitrary = fc.record({
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 20 }),
        timestamp: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
      });

      await fc.assert(
        fc.asyncProperty(
          dateArbitrary,
          fc.array(keystrokeArbitrary, { minLength: 0, maxLength: 50 }),
          async (targetDate, keystrokes) => {
            // Clean database and cache for this test iteration
            await repository.clear();
            service.clearCache();

            // Save all keystrokes
            if (keystrokes.length > 0) {
              await repository.save(keystrokes);
            }

            // Get daily stats for target date
            const stats = await service.getDailyStats(targetDate);

            // Normalize target date to start of day (00:00:00) using UTC methods
            const startOfDay = new Date(Date.UTC(
              targetDate.getUTCFullYear(),
              targetDate.getUTCMonth(),
              targetDate.getUTCDate(),
              0, 0, 0, 0
            ));
            const endOfDay = new Date(Date.UTC(
              targetDate.getUTCFullYear(),
              targetDate.getUTCMonth(),
              targetDate.getUTCDate(),
              23, 59, 59, 999
            ));

            // Count keystrokes that should be in this day
            const expectedCount = keystrokes.filter(k => {
              const kDate = new Date(k.timestamp);
              return kDate >= startOfDay && kDate <= endOfDay;
            }).length;

            // Verify total matches expected
            return stats.totalKeystrokes === expectedCount;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should only return keystrokes within the specified month for monthly stats', async () => {
      // Generate arbitrary year and month
      const yearMonthArbitrary = fc.record({
        year: fc.integer({ min: 2020, max: 2030 }),
        month: fc.integer({ min: 1, max: 12 })
      });

      const keystrokeArbitrary = fc.record({
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 20 }),
        timestamp: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
      });

      await fc.assert(
        fc.asyncProperty(
          yearMonthArbitrary,
          fc.array(keystrokeArbitrary, { minLength: 0, maxLength: 50 }),
          async (targetPeriod, keystrokes) => {
            // Clean database and cache for this test iteration
            await repository.clear();
            service.clearCache();

            // Save all keystrokes
            if (keystrokes.length > 0) {
              await repository.save(keystrokes);
            }

            // Get monthly stats
            const stats = await service.getMonthlyStats(targetPeriod.year, targetPeriod.month);

            // Calculate start and end of month in UTC
            const startOfMonth = new Date(Date.UTC(targetPeriod.year, targetPeriod.month - 1, 1, 0, 0, 0, 0));
            const endOfMonth = new Date(Date.UTC(targetPeriod.year, targetPeriod.month, 0, 23, 59, 59, 999));

            // Count keystrokes that should be in this month
            const expectedCount = keystrokes.filter(k => {
              const kDate = new Date(k.timestamp);
              return kDate >= startOfMonth && kDate <= endOfMonth;
            }).length;

            // Verify total matches expected
            return stats.totalKeystrokes === expectedCount;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should only return keystrokes within the specified year for yearly stats', async () => {
      // Generate arbitrary year
      const yearArbitrary = fc.integer({ min: 2020, max: 2030 });

      const keystrokeArbitrary = fc.record({
        keyCode: fc.integer({ min: 0, max: 255 }),
        keyName: fc.string({ minLength: 1, maxLength: 20 }),
        timestamp: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
      });

      await fc.assert(
        fc.asyncProperty(
          yearArbitrary,
          fc.array(keystrokeArbitrary, { minLength: 0, maxLength: 50 }),
          async (targetYear, keystrokes) => {
            // Clean database and cache for this test iteration
            await repository.clear();
            service.clearCache();

            // Save all keystrokes
            if (keystrokes.length > 0) {
              await repository.save(keystrokes);
            }

            // Get yearly stats
            const stats = await service.getYearlyStats(targetYear);

            // Calculate start and end of year in UTC
            const startOfYear = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
            const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

            // Count keystrokes that should be in this year
            const expectedCount = keystrokes.filter(k => {
              const kDate = new Date(k.timestamp);
              return kDate >= startOfYear && kDate <= endOfYear;
            }).length;

            // Verify total matches expected
            return stats.totalKeystrokes === expectedCount;
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for property-based test
  });

  // Cache functionality tests
  // Requirements: 3.1, 4.1, 5.1
  describe('Query caching', () => {
    it('should cache daily stats and return cached result on subsequent calls', async () => {
      const testDate = new Date('2024-01-15');
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-15T11:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // First call - should query database
      const stats1 = await service.getDailyStats(testDate);
      expect(stats1.totalKeystrokes).toBe(2);

      // Add more data
      const moreKeystrokes: Keystroke[] = [
        { keyCode: 67, keyName: 'C', timestamp: new Date('2024-01-15T12:00:00').getTime() }
      ];
      await repository.save(moreKeystrokes);

      // Second call - should return cached result (still 2, not 3)
      const stats2 = await service.getDailyStats(testDate);
      expect(stats2.totalKeystrokes).toBe(2);

      // Clear cache
      service.clearCache();

      // Third call - should query database again (now 3)
      const stats3 = await service.getDailyStats(testDate);
      expect(stats3.totalKeystrokes).toBe(3);
    });

    it('should cache monthly stats and return cached result on subsequent calls', async () => {
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-20T11:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // First call - should query database
      const stats1 = await service.getMonthlyStats(2024, 1);
      expect(stats1.totalKeystrokes).toBe(2);

      // Add more data
      const moreKeystrokes: Keystroke[] = [
        { keyCode: 67, keyName: 'C', timestamp: new Date('2024-01-25T12:00:00').getTime() }
      ];
      await repository.save(moreKeystrokes);

      // Second call - should return cached result (still 2, not 3)
      const stats2 = await service.getMonthlyStats(2024, 1);
      expect(stats2.totalKeystrokes).toBe(2);

      // Clear cache
      service.clearCache();

      // Third call - should query database again (now 3)
      const stats3 = await service.getMonthlyStats(2024, 1);
      expect(stats3.totalKeystrokes).toBe(3);
    });

    it('should cache yearly stats and return cached result on subsequent calls', async () => {
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-06-20T11:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // First call - should query database
      const stats1 = await service.getYearlyStats(2024);
      expect(stats1.totalKeystrokes).toBe(2);

      // Add more data
      const moreKeystrokes: Keystroke[] = [
        { keyCode: 67, keyName: 'C', timestamp: new Date('2024-12-25T12:00:00').getTime() }
      ];
      await repository.save(moreKeystrokes);

      // Second call - should return cached result (still 2, not 3)
      const stats2 = await service.getYearlyStats(2024);
      expect(stats2.totalKeystrokes).toBe(2);

      // Clear cache
      service.clearCache();

      // Third call - should query database again (now 3)
      const stats3 = await service.getYearlyStats(2024);
      expect(stats3.totalKeystrokes).toBe(3);
    });

    it('should maintain separate cache entries for different dates', async () => {
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() },
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-16T10:00:00').getTime() },
        { keyCode: 67, keyName: 'C', timestamp: new Date('2024-01-16T11:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // Get stats for different dates
      const stats15 = await service.getDailyStats(new Date('2024-01-15'));
      const stats16 = await service.getDailyStats(new Date('2024-01-16'));

      expect(stats15.totalKeystrokes).toBe(1);
      expect(stats16.totalKeystrokes).toBe(2);

      // Both should be cached independently
      const stats15Again = await service.getDailyStats(new Date('2024-01-15'));
      const stats16Again = await service.getDailyStats(new Date('2024-01-16'));

      expect(stats15Again.totalKeystrokes).toBe(1);
      expect(stats16Again.totalKeystrokes).toBe(2);
    });

    it('should expire cache entries after 5 minutes', async () => {
      const testDate = new Date('2024-01-15');
      const keystrokes: Keystroke[] = [
        { keyCode: 65, keyName: 'A', timestamp: new Date('2024-01-15T10:00:00').getTime() }
      ];

      await repository.save(keystrokes);

      // First call - should query database
      const stats1 = await service.getDailyStats(testDate);
      expect(stats1.totalKeystrokes).toBe(1);

      // Mock time passing by directly manipulating the cache
      // This is a simplified test - in production, you'd use a time mocking library
      const cacheKey = (service as any).getCacheKey('daily', testDate.getTime());
      const cacheEntry = (service as any).cache.get(cacheKey);
      
      // Set expiration to past
      cacheEntry.expiresAt = Date.now() - 1000;
      (service as any).cache.set(cacheKey, cacheEntry);

      // Add more data
      const moreKeystrokes: Keystroke[] = [
        { keyCode: 66, keyName: 'B', timestamp: new Date('2024-01-15T11:00:00').getTime() }
      ];
      await repository.save(moreKeystrokes);

      // Second call - cache should be expired, should query database again
      const stats2 = await service.getDailyStats(testDate);
      expect(stats2.totalKeystrokes).toBe(2);
    });
  });
});
