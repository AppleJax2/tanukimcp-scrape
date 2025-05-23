/**
 * Configuration and core type definitions for TanukiMCP Scrape Server
 */

export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export interface ServerConfig {
  transport: 'stdio' | 'streamable-http';
  port: number;
  host: string;
  enableCors: boolean;
  maxSessions: number;
  sessionTimeout: number;
}

export interface DynamicContext {
  current_datetime: string; // ISO 8601 format
  timezone: string;
  business_day: boolean;
  date_formatted: {
    human: string; // "May 23, 2025"
    short: string; // "2025-05-23"
    day_of_week: string; // "Friday"
  };
  session_info: {
    session_start: string;
    duration_minutes: number;
    pages_scraped: number;
  };
}

export type ToolCategory = 'input' | 'execution' | 'output';

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  context?: DynamicContext;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  sessions: {
    active: number;
    max: number;
  };
  memory: MemoryUsage;
  version: string;
}

export interface PuppeteerConfig {
  headless?: boolean;
  defaultViewport?: {
    width: number;
    height: number;
  };
  args?: string[];
  executablePath?: string;
  timeout?: number;
  userAgent?: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
  windowSizeMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryCondition?: (error: Error) => boolean;
}

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: any) => boolean;
}

export interface ComparisonMetric {
  name: string;
  type: 'count' | 'percentage' | 'average' | 'sum' | 'custom';
  field?: string;
  aggregator?: (values: any[]) => number;
}

export interface OutputFormat {
  type: 'csv' | 'json' | 'markdown' | 'text' | 'xml' | 'yaml';
  options?: {
    delimiter?: string;
    encoding?: string;
    pretty?: boolean;
    template?: string;
    includeHeaders?: boolean;
    includeMetadata?: boolean;
  };
}

export interface SecurityPolicy {
  allowedDomains?: string[];
  blockedDomains?: string[];
  maxFileSize?: number;
  allowedFileTypes?: string[];
  sanitizeInput?: boolean;
  validateUrls?: boolean;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  pagesProcessed: number;
  dataPointsExtracted: number;
  errorsEncountered: number;
  averagePageLoadTime: number;
  successRate: number;
  throughputPerMinute: number;
  memoryUsage: {
    start: MemoryUsage;
    peak: MemoryUsage;
    current: MemoryUsage;
  };
}

export interface QualityMetrics {
  completeness: number; // 0-1 ratio of successfully extracted fields
  accuracy: number; // 0-1 ratio based on validation rules
  consistency: number; // 0-1 ratio of consistent data formats
  duplicates: number; // Count of duplicate records found
  errors: number; // Count of extraction errors
  score: number; // Overall quality score 0-1
}

export interface LogLevel {
  level: 'debug' | 'info' | 'warn' | 'error';
  timestamp: boolean;
  format: 'json' | 'text';
  destination: 'console' | 'file' | 'both';
  maxSize?: number;
  maxFiles?: number;
}

// Environment variable mappings
export const ENV_MAPPINGS = {
  MCP_TRANSPORT: 'transport',
  PORT: 'port',
  HOST: 'host',
  ENABLE_CORS: 'enableCors',
  MAX_SESSIONS: 'maxSessions',
  SESSION_TIMEOUT: 'sessionTimeout',
  PUPPETEER_HEADLESS: 'puppeteer.headless',
  PUPPETEER_ARGS: 'puppeteer.args',
  RATE_LIMIT_RPM: 'rateLimit.requestsPerMinute',
  MAX_RETRIES: 'retry.maxAttempts',
  LOG_LEVEL: 'logging.level',
} as const;

// Default configurations
export const DEFAULT_CONFIG: ServerConfig = {
  transport: 'stdio',
  port: 8000,
  host: '0.0.0.0',
  enableCors: false,
  maxSessions: 100,
  sessionTimeout: 1800000, // 30 minutes
};

export const DEFAULT_PUPPETEER_CONFIG: PuppeteerConfig = {
  headless: true,
  defaultViewport: { width: 1280, height: 720 },
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1280,720'
  ],
  timeout: 30000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  requestsPerMinute: 60,
  burstLimit: 10,
  windowSizeMs: 60000,
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
};

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedFileTypes: ['csv', 'json', 'txt', 'md', 'xml', 'yaml'],
  sanitizeInput: true,
  validateUrls: true,
};

export const DEFAULT_LOG_CONFIG: LogLevel = {
  level: 'info',
  timestamp: true,
  format: 'text',
  destination: 'console',
}; 