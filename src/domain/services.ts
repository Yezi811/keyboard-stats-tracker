// Domain services
import { KeystrokeRepository } from '../infrastructure/KeystrokeRepository';
import { DailyStats, MonthlyStats, YearlyStats, KeyStats } from './models';

/**
 * Cache entry with expiration time
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * StatisticsService provides aggregated statistics for keystroke data
 * across different time periods (day, month, year).
 */
export class StatisticsService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private repository: KeystrokeRepository) {}

  /**
   * Generate cache key for a query
   */
  private getCacheKey(type: string, ...params: any[]): string {
    return `${type}:${params.join(':')}`;
  }

  /**
   * Get data from cache if available and not expired
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache with expiration
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.CACHE_TTL_MS
    });
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get daily statistics for a specific date
   * Requirements: 3.1, 3.2, 3.3, 3.5
   */
  async getDailyStats(date: Date): Promise<DailyStats> {
    // Normalize date to start of day in UTC (00:00:00) using UTC methods
    const normalizedDate = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0, 0
    ));

    // Check cache
    const cacheKey = this.getCacheKey('daily', normalizedDate.getTime());
    const cached = this.getFromCache<DailyStats>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get key breakdown for the day
    const keyBreakdown = await this.repository.getStatsByPeriod('day', normalizedDate);

    // Calculate total keystrokes
    const totalKeystrokes = keyBreakdown.reduce((sum, stat) => sum + stat.count, 0);

    const result = {
      date: normalizedDate,
      totalKeystrokes,
      keyBreakdown
    };

    // Store in cache
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * Get monthly statistics for a specific year and month
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  async getMonthlyStats(year: number, month: number): Promise<MonthlyStats> {
    // Validate month (1-12)
    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12');
    }

    // Check cache
    const cacheKey = this.getCacheKey('monthly', year, month);
    const cached = this.getFromCache<MonthlyStats>(cacheKey);
    if (cached) {
      return cached;
    }

    // Create date for the first day of the month
    const monthDate = new Date(year, month - 1, 1);

    // Get key breakdown for the month
    const keyBreakdown = await this.repository.getStatsByPeriod('month', monthDate);

    // Calculate total keystrokes
    const totalKeystrokes = keyBreakdown.reduce((sum, stat) => sum + stat.count, 0);

    // Get daily trend data
    const dailyTrend = await this.getDailyTrendForMonth(year, month);

    const result = {
      year,
      month,
      totalKeystrokes,
      dailyTrend,
      keyBreakdown
    };

    // Store in cache
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * Get yearly statistics for a specific year
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  async getYearlyStats(year: number): Promise<YearlyStats> {
    // Check cache
    const cacheKey = this.getCacheKey('yearly', year);
    const cached = this.getFromCache<YearlyStats>(cacheKey);
    if (cached) {
      return cached;
    }

    // Create date for the first day of the year
    const yearDate = new Date(year, 0, 1);

    // Get key breakdown for the year
    const keyBreakdown = await this.repository.getStatsByPeriod('year', yearDate);

    // Calculate total keystrokes
    const totalKeystrokes = keyBreakdown.reduce((sum, stat) => sum + stat.count, 0);

    // Get monthly trend data
    const monthlyTrend = await this.getMonthlyTrendForYear(year);

    const result = {
      year,
      totalKeystrokes,
      monthlyTrend,
      keyBreakdown
    };

    // Store in cache
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * Get top N keys for a specific period
   * Requirements: 3.5
   */
  async getTopKeys(
    period: 'day' | 'month' | 'year',
    date: Date,
    limit: number
  ): Promise<KeyStats[]> {
    // Get all stats for the period
    const stats = await this.repository.getStatsByPeriod(period, date);

    // Return top N (already sorted by count DESC from repository)
    return stats.slice(0, limit);
  }

  /**
   * Helper method to get daily trend data for a specific month
   * Requirements: 4.4
   */
  private async getDailyTrendForMonth(
    year: number,
    month: number
  ): Promise<{ date: Date; count: number }[]> {
    // Calculate the number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();

    const dailyTrend: { date: Date; count: number }[] = [];

    // Get stats for each day in the month
    for (let day = 1; day <= daysInMonth; day++) {
      // Create date in UTC to match how getDailyStats normalizes dates
      const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const dayStats = await this.repository.getStatsByPeriod('day', date);
      const count = dayStats.reduce((sum, stat) => sum + stat.count, 0);

      dailyTrend.push({ date, count });
    }

    return dailyTrend;
  }

  /**
   * Helper method to get monthly trend data for a specific year
   * Requirements: 5.4
   */
  private async getMonthlyTrendForYear(
    year: number
  ): Promise<{ month: number; count: number }[]> {
    const monthlyTrend: { month: number; count: number }[] = [];

    // Get stats for each month in the year
    for (let month = 1; month <= 12; month++) {
      // Create date in UTC to match how getMonthlyStats normalizes dates
      const date = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const monthStats = await this.repository.getStatsByPeriod('month', date);
      const count = monthStats.reduce((sum, stat) => sum + stat.count, 0);

      monthlyTrend.push({ month, count });
    }

    return monthlyTrend;
  }
}
