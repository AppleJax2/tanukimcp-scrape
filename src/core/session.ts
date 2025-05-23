/**
 * Session Manager - Session lifecycle and resource management
 * 
 * Manages scraping sessions including creation, configuration, monitoring,
 * cleanup, and resource management. Handles session timeouts, limits,
 * and provides session state tracking for the MCP server.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  ScrapeSession, 
  SessionStatus, 
  SessionConfig, 
  ProgressTracker, 
  DataStore,
  SessionMetadata,
  ScrapingEvent,
  ScrapingEventType,
  EventSubscription
} from '../types/data.js';
import { PerformanceMetrics, QualityMetrics } from '../types/config.js';

export class SessionManager {
  private sessions: Map<string, ScrapeSession> = new Map();
  private eventSubscriptions: Map<string, EventSubscription> = new Map();
  private maxSessions: number;
  private sessionTimeout: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSessions: number = 100, sessionTimeout: number = 1800000) { // 30 minutes default
    this.maxSessions = maxSessions;
    this.sessionTimeout = sessionTimeout;
    
    // Start cleanup routine
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 300000); // Run cleanup every 5 minutes
  }

  /**
   * Create a new scraping session
   */
  createSession(
    userId?: string,
    config?: Partial<SessionConfig>,
    description?: string,
    tags: string[] = []
  ): ScrapeSession {
    // Check session limits
    if (this.sessions.size >= this.maxSessions) {
      throw new Error(`Maximum session limit reached (${this.maxSessions})`);
    }

    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTimeout);

    const session: ScrapeSession = {
      id: sessionId,
      configuration: {
        rateLimit: { delayMs: 1000, burstLimit: 5 },
        retryOptions: { maxAttempts: 3, backoffMs: 1000 },
        timeout: { pageLoadMs: 30000, elementWaitMs: 10000 },
        javascriptEnabled: true,
        allowRedirects: true,
        maxRedirects: 5,
        cookiesEnabled: true,
        ...config
      },
      progress: this.createEmptyProgressTracker(),
      data: this.createEmptyDataStore(),
      metadata: {
        userId,
        userAgent: config?.userAgent || 'TanukiMCP-Scrape/1.0.0',
        startTime: now,
        tags,
        description,
        version: '1.0.0',
        environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development'
      },
      created_at: now,
      updated_at: now,
      expires_at: expiresAt,
      status: 'created'
    };

    this.sessions.set(sessionId, session);
    this.emitEvent('session.created', sessionId, { sessionId });

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ScrapeSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session && this.isSessionExpired(session)) {
      this.expireSession(sessionId);
      return undefined;
    }
    return session;
  }

  /**
   * Update session configuration
   */
  updateSessionConfig(sessionId: string, config: Partial<SessionConfig>): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.configuration = { ...session.configuration, ...config };
    session.updated_at = new Date();
    session.status = 'configuring';
    
    this.sessions.set(sessionId, session);
  }

  /**
   * Update session progress
   */
  updateProgress(
    sessionId: string, 
    updates: Partial<ProgressTracker>
  ): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.progress = { ...session.progress, ...updates };
    session.progress.lastUpdate = new Date();
    session.updated_at = new Date();
    
    // Update performance metrics
    if (updates.pagesProcessed) {
      this.updatePerformanceMetrics(sessionId);
    }

    this.sessions.set(sessionId, session);
    this.emitEvent('progress.updated', sessionId, { progress: session.progress });
  }

  /**
   * Set session status
   */
  setSessionStatus(sessionId: string, status: SessionStatus): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const previousStatus = session.status;
    session.status = status;
    session.updated_at = new Date();

    if (status === 'completed' || status === 'failed') {
      session.metadata.endTime = new Date();
      session.metadata.duration = session.metadata.endTime.getTime() - session.metadata.startTime.getTime();
    }

    this.sessions.set(sessionId, session);

    // Emit appropriate events
    switch (status) {
      case 'running':
        if (previousStatus === 'created' || previousStatus === 'configuring') {
          this.emitEvent('session.started', sessionId, { sessionId });
        }
        break;
      case 'completed':
        this.emitEvent('session.completed', sessionId, { sessionId, duration: session.metadata.duration });
        break;
      case 'failed':
        this.emitEvent('session.failed', sessionId, { sessionId, duration: session.metadata.duration });
        break;
    }
  }

  /**
   * Add data to session
   */
  addExtractedData(sessionId: string, data: any): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.data.rawData.push(data);
    session.progress.dataPointsExtracted += 1;
    session.updated_at = new Date();
    
    this.sessions.set(sessionId, session);
    this.emitEvent('data.extracted', sessionId, { dataCount: session.data.rawData.length });
  }

  /**
   * Record session error
   */
  recordError(sessionId: string, error: string, fatal: boolean = false): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.progress.errorsEncountered += 1;
    if (fatal) {
      session.status = 'failed';
      session.metadata.endTime = new Date();
    }
    session.updated_at = new Date();
    
    this.sessions.set(sessionId, session);
    this.emitEvent('error.occurred', sessionId, { error, fatal });
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ScrapeSession[] {
    const activeSessions: ScrapeSession[] = [];
    
    for (const session of this.sessions.values()) {
      if (!this.isSessionExpired(session) && session.status !== 'completed' && session.status !== 'failed') {
        activeSessions.push(session);
      }
    }
    
    return activeSessions;
  }

  /**
   * Get session count
   */
  getActiveSessionCount(): number {
    return this.getActiveSessions().length;
  }

  /**
   * Get session statistics
   */
  getSessionStatistics(): {
    total: number;
    active: number;
    completed: number;
    failed: number;
    expired: number;
    by_status: Record<SessionStatus, number>;
  } {
    const stats = {
      total: this.sessions.size,
      active: 0,
      completed: 0,
      failed: 0,
      expired: 0,
      by_status: {
        created: 0,
        configuring: 0,
        running: 0,
        paused: 0,
        completed: 0,
        failed: 0,
        expired: 0
      } as Record<SessionStatus, number>
    };

    for (const session of this.sessions.values()) {
      stats.by_status[session.status]++;
      
      if (this.isSessionExpired(session)) {
        stats.expired++;
      } else {
        switch (session.status) {
          case 'completed':
            stats.completed++;
            break;
          case 'failed':
            stats.failed++;
            break;
          default:
            stats.active++;
        }
      }
    }

    return stats;
  }

  /**
   * Expire a session
   */
  expireSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'expired';
      session.updated_at = new Date();
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Delete a session and clean up resources
   */
  deleteSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Clean up browser resources if attached
      if (session.browser?.isActive) {
        // Browser cleanup will be handled by BrowserManager
      }
      
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Subscribe to session events
   */
  subscribe(
    sessionId: string | undefined,
    eventTypes: ScrapingEventType[],
    callback: (event: ScrapingEvent) => void
  ): string {
    const subscriptionId = uuidv4();
    const subscription: EventSubscription = {
      id: subscriptionId,
      sessionId,
      eventTypes,
      callback,
      created: new Date(),
      active: true
    };

    this.eventSubscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    this.eventSubscriptions.delete(subscriptionId);
  }

  /**
   * Perform cleanup of expired sessions
   */
  async cleanup(): Promise<void> {
    const expiredSessions: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session) || 
          (session.status === 'completed' || session.status === 'failed') &&
          (Date.now() - session.updated_at.getTime()) > 86400000) { // 24 hours
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.deleteSession(sessionId);
    }

    console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clean up all sessions
    await this.cleanup();
    
    // Clear all subscriptions
    this.eventSubscriptions.clear();
    
    console.log('📴 SessionManager shutdown complete');
  }

  private createEmptyProgressTracker(): ProgressTracker {
    const now = new Date();
    return {
      totalPages: 0,
      pagesProcessed: 0,
      pagesSuccessful: 0,
      pagesFailed: 0,
      dataPointsExtracted: 0,
      errorsEncountered: 0,
      lastUpdate: now,
      avgProcessingTimeMs: 0,
      performance: {
        startTime: now.getTime(),
        pagesProcessed: 0,
        dataPointsExtracted: 0,
        errorsEncountered: 0,
        averagePageLoadTime: 0,
        successRate: 0,
        throughputPerMinute: 0,
        memoryUsage: {
          start: process.memoryUsage(),
          peak: process.memoryUsage(),
          current: process.memoryUsage()
        }
      },
      quality: {
        completeness: 0,
        accuracy: 0,
        consistency: 0,
        timeliness: 0,
        issues: [],
        duplicates: 0,
        errors: 0,
        score: 0
      }
    };
  }

  private createEmptyDataStore(): DataStore {
    return {
      rawData: [],
      cleanedData: [],
      aggregatedData: [],
      metadata: {
        totalRecords: 0,
        fields: [],
        sources: [],
        created: new Date(),
        lastModified: new Date(),
        version: '1.0.0'
      },
      statistics: {
        recordCount: 0,
        fieldCount: 0,
        duplicateRecords: 0,
        completenessRatio: 0,
        qualityScore: 0,
        processingTime: 0,
        dataSize: 0,
        distribution: {}
      }
    };
  }

  private isSessionExpired(session: ScrapeSession): boolean {
    return Date.now() > session.expires_at.getTime();
  }

  private updatePerformanceMetrics(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const now = Date.now();
    const duration = now - session.progress.performance.startTime;
    const minutes = duration / 60000;

    session.progress.performance.throughputPerMinute = 
      minutes > 0 ? session.progress.pagesProcessed / minutes : 0;
    
    session.progress.performance.successRate = 
      session.progress.pagesProcessed > 0 
        ? session.progress.pagesSuccessful / session.progress.pagesProcessed 
        : 0;

    session.progress.performance.current = process.memoryUsage();
  }

  private performCleanup(): void {
    this.cleanup().catch(error => {
      console.error('❌ Error during session cleanup:', error);
    });
  }

  private emitEvent(type: ScrapingEventType, sessionId: string, data: any): void {
    const event: ScrapingEvent = {
      id: uuidv4(),
      sessionId,
      type,
      data,
      timestamp: new Date(),
      severity: type.includes('error') || type.includes('failed') ? 'error' : 'info'
    };

    // Notify all relevant subscriptions
    for (const subscription of this.eventSubscriptions.values()) {
      if (subscription.active && 
          subscription.eventTypes.includes(type) &&
          (!subscription.sessionId || subscription.sessionId === sessionId)) {
        try {
          subscription.callback(event);
        } catch (error) {
          console.error('❌ Error in event subscription callback:', error);
        }
      }
    }
  }
} 