/**
 * Data structure type definitions for TanukiMCP Scrape Server
 */

import { PuppeteerConfig, PerformanceMetrics, QualityMetrics, OutputFormat } from './config.js';

export interface ScrapeSession {
  id: string;
  configuration: SessionConfig;
  progress: ProgressTracker;
  data: DataStore;
  metadata: SessionMetadata;
  browser?: BrowserSession;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
  status: SessionStatus;
}

export type SessionStatus = 'created' | 'configuring' | 'running' | 'paused' | 'completed' | 'failed' | 'expired';

export interface SessionConfig {
  rateLimit?: {
    delayMs: number;
    burstLimit: number;
  };
  retryOptions?: {
    maxAttempts: number;
    backoffMs: number;
  };
  timeout?: {
    pageLoadMs: number;
    elementWaitMs: number;
  };
  userAgent?: string;
  headers?: Record<string, string>;
  proxy?: ProxySettings;
  javascriptEnabled: boolean;
  allowRedirects: boolean;
  maxRedirects: number;
  cookiesEnabled: boolean;
  securityPolicy?: SecuritySettings;
}

export interface ProxySettings {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
}

export interface SecuritySettings {
  allowedDomains?: string[];
  blockedDomains?: string[];
  maxFileSize?: number;
  validateCertificates: boolean;
  blockMixedContent: boolean;
}

export interface ProgressTracker {
  totalPages: number;
  pagesProcessed: number;
  pagesSuccessful: number;
  pagesFailed: number;
  dataPointsExtracted: number;
  errorsEncountered: number;
  currentUrl?: string;
  lastUpdate: Date;
  estimatedTimeRemaining?: number;
  avgProcessingTimeMs: number;
  performance: PerformanceMetrics;
  quality: QualityMetrics;
}

export interface DataStore {
  rawData: ExtractedData[];
  cleanedData: ProcessedData[];
  aggregatedData: AggregatedData[];
  metadata: DataMetadata;
  schema?: DataSchema;
  statistics: DataStatistics;
}

export interface ExtractedData {
  id: string;
  url: string;
  timestamp: Date;
  selectors: SelectorResults[];
  metadata: ExtractionMetadata;
  raw: Record<string, any>;
}

export interface SelectorResults {
  name: string;
  selector: string;
  values: any[];
  success: boolean;
  error?: string;
  count: number;
}

export interface ExtractionMetadata {
  pageTitle?: string;
  pageSize: number;
  loadTimeMs: number;
  statusCode: number;
  redirectChain?: string[];
  screenshot?: string;
  responseHeaders?: Record<string, string>;
}

export interface ProcessedData {
  id: string;
  originalId: string;
  processed: Record<string, any>;
  transformations: DataTransformation[];
  quality: DataQuality;
  timestamp: Date;
}

export interface DataTransformation {
  field: string;
  operation: string;
  parameters: Record<string, any>;
  before: any;
  after: any;
  success: boolean;
  error?: string;
}

export interface DataQuality {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: 'missing' | 'invalid' | 'inconsistent' | 'duplicate' | 'outdated';
  field: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface SessionMetadata {
  planId?: string;
  userId?: string;
  userAgent: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tags: string[];
  description?: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
}

export interface BrowserSession {
  id: string;
  sessionId: string;
  browser: any;
  pages: BrowserPage[];
  config: PuppeteerConfig;
  created: Date;
  lastActivity: Date;
  isActive: boolean;
  metrics: BrowserMetrics;
}

export interface BrowserPage {
  id: string;
  url: string;
  page: any;
  status: PageStatus;
  created: Date;
  lastActivity: Date;
  interactions: PageInteraction[];
  screenshots: Screenshot[];
  errors: PageError[];
}

export type PageStatus = 'loading' | 'ready' | 'interacting' | 'extracting' | 'completed' | 'error';

export interface PageInteraction {
  id: string;
  type: 'navigation' | 'click' | 'type' | 'select' | 'scroll' | 'wait' | 'screenshot';
  target?: string;
  value?: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface Screenshot {
  id: string;
  name: string;
  url: string;
  data: string;
  timestamp: Date;
  fullPage: boolean;
  viewport: { width: number; height: number };
  fileSize: number;
}

export interface PageError {
  id: string;
  type: 'network' | 'javascript' | 'timeout' | 'navigation' | 'extraction';
  message: string;
  url: string;
  timestamp: Date;
  stack?: string;
  fatal: boolean;
  context?: Record<string, any>;
}

export interface BrowserMetrics {
  pagesOpened: number;
  totalNavigations: number;
  totalInteractions: number;
  totalScreenshots: number;
  totalErrors: number;
  avgPageLoadTime: number;
  avgInteractionTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface ExportJob {
  id: string;
  sessionId: string;
  format: OutputFormat;
  filename: string;
  filePath?: string;
  status: ExportStatus;
  progress: number;
  created: Date;
  started?: Date;
  completed?: Date;
  error?: string;
  fileSize?: number;
  recordCount?: number;
  metadata: ExportMetadata;
}

export type ExportStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ExportMetadata {
  includeHeaders: boolean;
  encoding: string;
  compression?: string;
  template?: string;
  filters?: Record<string, any>;
  sorting?: SortOption[];
  grouping?: GroupOption[];
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  priority: number;
}

export interface GroupOption {
  field: string;
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

export interface CleaningRule {
  field: string;
  operation: 'trim' | 'normalize' | 'format' | 'validate' | 'transform' | 'filter' | 'replace';
  parameters: Record<string, any>;
  conditions?: CleaningCondition[];
}

export interface CleaningCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'matches' | 'gt' | 'lt' | 'between';
  value: any;
  negate?: boolean;
}

export interface ScrapingEvent {
  id: string;
  sessionId: string;
  type: ScrapingEventType;
  data: any;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error';
}

export type ScrapingEventType = 
  | 'session.created'
  | 'session.started'
  | 'session.completed'
  | 'session.failed'
  | 'page.loaded'
  | 'page.error'
  | 'data.extracted'
  | 'data.cleaned'
  | 'export.started'
  | 'export.completed'
  | 'progress.updated'
  | 'error.occurred';

export interface EventSubscription {
  id: string;
  sessionId?: string;
  eventTypes: ScrapingEventType[];
  callback: (event: ScrapingEvent) => void;
  created: Date;
  active: boolean;
}

export interface AggregatedData {
  id: string;
  sourceIds: string[];
  aggregated: Record<string, any>;
  aggregationRules: AggregationRule[];
  timestamp: Date;
}

export interface AggregationRule {
  fields: string[];
  operation: 'merge' | 'sum' | 'average' | 'min' | 'max' | 'count' | 'concat' | 'first' | 'last';
  parameters?: Record<string, any>;
}

export interface DataMetadata {
  totalRecords: number;
  schema?: DataSchema;
  fields: FieldInfo[];
  sources: string[];
  created: Date;
  lastModified: Date;
  version: string;
}

export interface DataSchema {
  version: string;
  fields: SchemaField[];
  relationships?: SchemaRelationship[];
  constraints?: SchemaConstraint[];
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'url' | 'email' | 'phone' | 'object' | 'array';
  required: boolean;
  description?: string;
  format?: string;
  example?: any;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'format' | 'range' | 'length' | 'pattern' | 'custom';
  value?: any;
  message?: string;
  validator?: string;
}

export interface SchemaRelationship {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  description?: string;
}

export interface SchemaConstraint {
  type: 'unique' | 'not-null' | 'check';
  fields: string[];
  expression?: string;
  message?: string;
}

export interface FieldInfo {
  name: string;
  type: string;
  count: number;
  uniqueValues: number;
  nullCount: number;
  sampleValues: any[];
  statistics?: FieldStatistics;
}

export interface FieldStatistics {
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  mode?: any;
  standardDeviation?: number;
  distribution?: Record<string, number>;
}

export interface DataStatistics {
  recordCount: number;
  fieldCount: number;
  duplicateRecords: number;
  completenessRatio: number;
  qualityScore: number;
  processingTime: number;
  dataSize: number;
  distribution: Record<string, number>;
} 