/**
 * Context Provider - Dynamic context for LLM temporal awareness
 * 
 * Provides real-time context information including current date/time,
 * business hours, session information, and other dynamic data that
 * helps LLMs make informed decisions about data freshness and relevance.
 */

import { DynamicContext } from '../types/config.js';

// Define MemoryUsage interface locally to avoid Node.js type dependency issues
interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export class ContextProvider {
  private timezone: string;
  private businessHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };

  constructor(
    timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
    businessHours: { start: string; end: string } = { start: "09:00", end: "17:00" }
  ) {
    this.timezone = timezone;
    this.businessHours = businessHours;
  }

  /**
   * Get comprehensive dynamic context for the current moment
   */
  getDynamicContext(sessionStartTime?: Date, pagesScraped: number = 0): DynamicContext {
    const now = new Date();
    const sessionStart = sessionStartTime || now;
    const durationMinutes = Math.floor((now.getTime() - sessionStart.getTime()) / 60000);

    return {
      current_datetime: now.toISOString(),
      timezone: this.timezone,
      business_day: this.isBusinessDay(now),
      date_formatted: {
        human: this.formatDate(now, 'human'),
        short: this.formatDate(now, 'short'),
        day_of_week: this.formatDate(now, 'day'),
      },
      session_info: {
        session_start: sessionStart.toISOString(),
        duration_minutes: durationMinutes,
        pages_scraped: pagesScraped,
      },
    };
  }

  /**
   * Format date using native methods instead of date-fns
   */
  private formatDate(date: Date, type: 'human' | 'short' | 'day'): string {
    switch (type) {
      case 'human':
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'short':
        return date.toISOString().split('T')[0];
      case 'day':
        return date.toLocaleDateString('en-US', { weekday: 'long' });
      default:
        return date.toISOString();
    }
  }

  /**
   * Get current date and time in various formats
   */
  getCurrentDateTime(): {
    iso: string;
    human: string;
    short: string;
    timestamp: number;
    timezone: string;
  } {
    const now = new Date();
    return {
      iso: now.toISOString(),
      human: this.formatDate(now, 'human'),
      short: this.formatDate(now, 'short'),
      timestamp: now.getTime(),
      timezone: this.timezone,
    };
  }

  /**
   * Check if current time is during business hours
   */
  isBusinessHours(date?: Date): boolean {
    const checkDate = date || new Date();
    
    if (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
      return false;
    }

    const timeStr = this.formatDate(checkDate, 'short').split('T')[1];
    const start = this.businessHours.start.split(':');
    const end = this.businessHours.end.split(':');
    const startTime = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), parseInt(start[0]), parseInt(start[1]));
    const endTime = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), parseInt(end[0]), parseInt(end[1]));
    return timeStr >= startTime.toISOString().split('T')[1] && timeStr <= endTime.toISOString().split('T')[1];
  }

  /**
   * Check if given date is a business day (weekday)
   */
  isBusinessDay(date?: Date): boolean {
    const checkDate = date || new Date();
    const dayOfWeek = checkDate.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6; // 0 = Sunday, 6 = Saturday
  }

  /**
   * Get time-based context for data freshness assessment
   */
  getDataFreshnessContext(): {
    current_time: string;
    is_recent_data_preferred: boolean;
    freshness_threshold_hours: number;
    business_context: {
      is_business_hours: boolean;
      is_business_day: boolean;
      next_business_day?: string;
    };
  } {
    const now = new Date();
    const isBusinessTime = this.isBusinessHours(now);
    const isBusinessDay = this.isBusinessDay(now);

    return {
      current_time: now.toISOString(),
      is_recent_data_preferred: true,
      freshness_threshold_hours: 24,
      business_context: {
        is_business_hours: isBusinessTime,
        is_business_day: isBusinessDay,
        next_business_day: this.getNextBusinessDay(now),
      },
    };
  }

  /**
   * Get relative time descriptions
   */
  getRelativeTimeContext(fromDate: Date): {
    absolute: string;
    relative: string;
    is_recent: boolean;
    age_category: 'fresh' | 'recent' | 'old' | 'stale';
  } {
    const now = new Date();
    const diffMs = now.getTime() - fromDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    let relative: string;
    let ageCategory: 'fresh' | 'recent' | 'old' | 'stale';

    if (diffHours < 1) {
      relative = 'less than an hour ago';
      ageCategory = 'fresh';
    } else if (diffHours < 24) {
      relative = `${Math.floor(diffHours)} hours ago`;
      ageCategory = 'fresh';
    } else if (diffDays < 7) {
      relative = `${Math.floor(diffDays)} days ago`;
      ageCategory = 'recent';
    } else if (diffDays < 30) {
      relative = `${Math.floor(diffDays / 7)} weeks ago`;
      ageCategory = 'old';
    } else {
      relative = `${Math.floor(diffDays / 30)} months ago`;
      ageCategory = 'stale';
    }

    return {
      absolute: this.formatDate(fromDate, 'human'),
      relative,
      is_recent: diffHours < 48,
      age_category: ageCategory,
    };
  }

  /**
   * Get search optimization context for time-sensitive queries
   */
  getSearchContext(): {
    temporal_keywords: string[];
    date_ranges: {
      today: string;
      this_week: { start: string; end: string };
      this_month: { start: string; end: string };
      this_year: { start: string; end: string };
    };
    urgency_indicators: string[];
  } {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return {
      temporal_keywords: [
        'latest', 'recent', 'current', 'today', 'this week', 'this month',
        '2025', 'now', 'updated', 'fresh', 'real-time', 'live'
      ],
      date_ranges: {
        today: this.formatDate(now, 'short'),
        this_week: {
          start: this.formatDate(startOfWeek, 'short'),
          end: this.formatDate(now, 'short'),
        },
        this_month: {
          start: this.formatDate(startOfMonth, 'short'),
          end: this.formatDate(now, 'short'),
        },
        this_year: {
          start: this.formatDate(startOfYear, 'short'),
          end: this.formatDate(now, 'short'),
        },
      },
      urgency_indicators: [
        'breaking', 'urgent', 'immediate', 'real-time', 'live',
        'current', 'active', 'ongoing', 'developing'
      ],
    };
  }

  /**
   * Get performance timing context
   */
  getPerformanceContext(startTime: Date): {
    elapsed_ms: number;
    elapsed_human: string;
    is_fast: boolean;
    performance_category: 'excellent' | 'good' | 'average' | 'slow' | 'timeout';
  } {
    const now = new Date();
    const elapsedMs = now.getTime() - startTime.getTime();
    const elapsedSeconds = elapsedMs / 1000;

    let elapsedHuman: string;
    let performanceCategory: 'excellent' | 'good' | 'average' | 'slow' | 'timeout';

    if (elapsedMs < 1000) {
      elapsedHuman = `${elapsedMs}ms`;
      performanceCategory = 'excellent';
    } else if (elapsedSeconds < 5) {
      elapsedHuman = `${elapsedSeconds.toFixed(1)}s`;
      performanceCategory = 'good';
    } else if (elapsedSeconds < 15) {
      elapsedHuman = `${Math.round(elapsedSeconds)}s`;
      performanceCategory = 'average';
    } else if (elapsedSeconds < 60) {
      elapsedHuman = `${Math.round(elapsedSeconds)}s`;
      performanceCategory = 'slow';
    } else {
      elapsedHuman = `${Math.round(elapsedSeconds / 60)}m`;
      performanceCategory = 'timeout';
    }

    return {
      elapsed_ms: elapsedMs,
      elapsed_human: elapsedHuman,
      is_fast: elapsedMs < 5000,
      performance_category: performanceCategory,
    };
  }

  /**
   * Create contextual message for LLM responses
   */
  createContextualMessage(
    baseMessage: string,
    sessionStartTime?: Date,
    pagesScraped: number = 0
  ): string {
    const context = this.getDynamicContext(sessionStartTime, pagesScraped);
    const freshness = this.getDataFreshnessContext();
    
    return `${baseMessage}

🕒 **Current Context**: ${context.current_datetime} (${context.timezone})
📅 **Date**: ${context.date_formatted.human} (${context.date_formatted.day_of_week})
${context.business_day ? '💼' : '🏠'} **Business Context**: ${context.business_day ? 'Business day' : 'Weekend'} ${freshness.business_context.is_business_hours ? '(Business hours)' : '(After hours)'}
⚡ **Session**: ${context.session_info.duration_minutes}min active, ${context.session_info.pages_scraped} pages scraped
${freshness.is_recent_data_preferred ? '🔄 **Priority**: Recent data preferred for accuracy' : ''}`;
  }

  /**
   * Get timezone-aware scheduling context
   */
  getSchedulingContext(): {
    current_time: string;
    recommended_times: string[];
    timezone_info: {
      name: string;
      offset: string;
      is_dst: boolean;
    };
    optimal_scraping_window: {
      start: string;
      end: string;
      reason: string;
    };
  } {
    const now = new Date();
    const offsetMinutes = now.getTimezoneOffset();
    const offsetHours = Math.abs(offsetMinutes / 60);
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    
    return {
      current_time: this.formatDate(now, 'short'),
      recommended_times: [
        '02:00 - 06:00 (Low traffic)',
        '10:00 - 11:00 (Business hours start)', 
        '14:00 - 15:00 (Post-lunch)',
        '22:00 - 23:00 (Evening)'
      ],
      timezone_info: {
        name: this.timezone,
        offset: `UTC${offsetSign}${offsetHours}`,
        is_dst: this.isDaylightSavingTime(now),
      },
      optimal_scraping_window: {
        start: '02:00',
        end: '06:00',
        reason: 'Minimal server load and traffic'
      },
    };
  }

  private getNextBusinessDay(date: Date): string {
    let nextDay = new Date(date);
    do {
      nextDay = new Date(nextDay.setDate(nextDay.getDate() + 1));
    } while (nextDay.getDay() === 0 || nextDay.getDay() === 6);
    
    return this.formatDate(nextDay, 'short');
  }

  private isDaylightSavingTime(date: Date): boolean {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset()) !== date.getTimezoneOffset();
  }
} 