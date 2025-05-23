# TanukiMCP-Scrape Master Design Document

**Legend:**
- ✅ = Fully implemented to production quality standards (no placeholders)
- (in progress) = Currently being implemented
- (planned) = Not yet implemented

---

## 🎯 Executive Summary

TanukiMCP-Scrape is a flagship Model Context Protocol server that provides intelligent, structured web scraping capabilities to LLMs. Built on Puppeteer with Streamable HTTP transport, it follows a systematic Input→Execution→Output workflow, making web data extraction intuitive, reliable, and powerful.

## 📋 Core Architecture Overview

### Design Principles
1. **Structured Workflow**: Three-phase approach (Input→Execution→Output) ensures consistent, repeatable scraping operations
2. **Dynamic Context Awareness**: Provides current date/time context to ensure LLMs find up-to-date information
3. **Streamable HTTP Transport**: Modern MCP protocol for scalability and reliability
4. **Puppeteer Foundation**: JavaScript-enabled web scraping with full browser capabilities
5. **Multi-Format Output**: Support for CSV, text reports, JSON, and markdown outputs
6. **Free & Easy**: One-command installation via smithery.ai autoinstall

### Technology Stack
- **Protocol**: Model Context Protocol v2025-03-26 (Streamable HTTP)
- **Runtime**: Node.js 18+ with TypeScript
- **Browser Engine**: Puppeteer (Chromium-based)
- **Hosting**: Smithery.ai serverless deployment
- **Transport**: HTTP/SSE with fallback to stdio
- **Data Processing**: Built-in cleaning, aggregation, and formatting tools

## 🛠️ Tool Categories & Specifications

### 1. INPUT TOOLS (Planning & Collaboration)

#### `scrape_plan` (in progress)
**Purpose**: Collaborative planning tool for defining scraping strategy
```typescript
interface ScrapePlanArgs {
  target_urls: string[];
  data_requirements: string;
  output_format: 'csv' | 'text' | 'json' | 'markdown';
  complexity_level: 'simple' | 'medium' | 'complex';
  expected_data_volume: 'small' | 'medium' | 'large';
  user_preferences?: string;
}
```
**Features**:
- Interactive planning with user feedback
- Automatic complexity assessment
- Resource estimation
- Strategy recommendation

#### `scrape_analyze_target`
**Purpose**: Deep analysis of target websites for optimal scraping approach
```typescript
interface AnalyzeTargetArgs {
  url: string;
  analyze_pagination?: boolean;
  check_rate_limits?: boolean;
  detect_anti_bot?: boolean;
  analyze_structure?: boolean;
}
```
**Features**:
- DOM structure analysis
- Anti-bot detection
- Rate limiting identification
- Pagination pattern recognition
- Dynamic content detection

#### `scrape_configure`
**Purpose**: Configure scraping parameters and behavior
```typescript
interface ScrapeConfigArgs {
  session_id: string;
  rate_limit_ms?: number;
  retry_attempts?: number;
  timeout_ms?: number;
  user_agent?: string;
  headers?: Record<string, string>;
  proxy_settings?: ProxyConfig;
  javascript_enabled?: boolean;
}
```

#### `scrape_validate_requirements`
**Purpose**: Validate and refine requirements with user input
```typescript
interface ValidateRequirementsArgs {
  requirements: ScrapingRequirements;
  target_analysis: TargetAnalysis;
  confirm_with_user?: boolean;
}
```

### 2. EXECUTION TOOLS (Scraping & Processing)

#### `scrape_execute`
**Purpose**: Main execution engine for planned scraping operations
```typescript
interface ScrapeExecuteArgs {
  plan_id: string;
  start_urls: string[];
  selectors: SelectorConfig[];
  execution_mode: 'sequential' | 'parallel' | 'adaptive';
  max_pages?: number;
  depth_limit?: number;
}
```
**Features**:
- Planned execution based on prior analysis
- Multiple execution modes
- Real-time progress tracking
- Error handling and recovery

#### `scrape_navigate`
**Purpose**: Advanced navigation with interaction capabilities
```typescript
interface NavigateArgs {
  url: string;
  wait_for?: string | number;
  interactions?: PageInteraction[];
  screenshot?: boolean;
  scroll_to_bottom?: boolean;
}
```
**Features**:
- Smart waiting strategies
- Form filling and clicking
- Screenshot capture
- Scroll handling for infinite scroll

#### `scrape_extract`
**Purpose**: Intelligent data extraction using multiple strategies
```typescript
interface ExtractArgs {
  session_id: string;
  extraction_rules: ExtractionRule[];
  fallback_strategy?: 'ai_vision' | 'text_analysis' | 'pattern_matching';
  validate_data?: boolean;
}
```
**Features**:
- CSS selector extraction
- AI-powered content identification
- Structured data parsing
- Data validation

#### `scrape_paginate`
**Purpose**: Handle pagination and multi-page scraping
```typescript
interface PaginateArgs {
  session_id: string;
  pagination_strategy: 'next_button' | 'url_pattern' | 'infinite_scroll' | 'auto_detect';
  max_pages?: number;
  page_delay_ms?: number;
}
```

#### `scrape_wait_and_retry`
**Purpose**: Handle dynamic content and error recovery
```typescript
interface WaitRetryArgs {
  session_id: string;
  wait_conditions: WaitCondition[];
  retry_strategy: RetryStrategy;
  max_retries: number;
}
```

#### `scrape_aggregate`
**Purpose**: Aggregate and deduplicate scraped data
```typescript
interface AggregateArgs {
  session_id: string;
  deduplication_strategy: 'exact' | 'fuzzy' | 'semantic';
  merge_strategy: 'append' | 'merge' | 'replace';
  quality_filters?: QualityFilter[];
}
```

#### `scrape_clean`
**Purpose**: Clean and normalize extracted data
```typescript
interface CleanArgs {
  session_id: string;
  cleaning_rules: CleaningRule[];
  normalization_options: NormalizationOptions;
  data_types: DataTypeConfig[];
}
```

#### `scrape_monitor_progress`
**Purpose**: Track and manage scraping progress
```typescript
interface MonitorArgs {
  session_id: string;
  include_metrics?: boolean;
  include_errors?: boolean;
  include_preview?: boolean;
}
```

### 3. OUTPUT TOOLS (Data Management & Formatting)

#### `scrape_export_csv`
**Purpose**: Export scraped data to CSV format
```typescript
interface ExportCSVArgs {
  session_id: string;
  filename: string;
  delimiter?: ',' | ';' | '\t';
  include_headers?: boolean;
  encoding?: 'utf-8' | 'utf-16' | 'ascii';
  file_path?: string; // User's desired local path
}
```
**Features**:
- Configurable CSV formatting
- Custom delimiters
- Header management
- Local file saving

#### `scrape_export_text`
**Purpose**: Generate structured text reports
```typescript
interface ExportTextArgs {
  session_id: string;
  filename: string;
  report_format: 'summary' | 'detailed' | 'structured' | 'narrative';
  include_metadata?: boolean;
  file_path?: string;
}
```
**Features**:
- Multiple report formats
- Executive summaries
- Detailed data listings
- Metadata inclusion

#### `scrape_export_json`
**Purpose**: Export structured JSON data
```typescript
interface ExportJSONArgs {
  session_id: string;
  filename: string;
  format_style: 'compact' | 'pretty' | 'hierarchical';
  include_schema?: boolean;
  file_path?: string;
}
```

#### `scrape_export_markdown`
**Purpose**: Generate markdown reports
```typescript
interface ExportMarkdownArgs {
  session_id: string;
  filename: string;
  include_toc?: boolean;
  include_images?: boolean;
  template_style?: 'github' | 'technical' | 'presentation';
  file_path?: string;
}
```

#### `scrape_save_results`
**Purpose**: Save results to user's local filesystem
```typescript
interface SaveResultsArgs {
  session_id: string;
  output_directory: string;
  formats: OutputFormat[];
  compress?: boolean;
  create_timestamp_folder?: boolean;
}
```

#### `scrape_summarize`
**Purpose**: Generate intelligent summaries of scraped data
```typescript
interface SummarizeArgs {
  session_id: string;
  summary_type: 'executive' | 'technical' | 'statistical' | 'insights';
  include_charts?: boolean;
  highlight_patterns?: boolean;
}
```

#### `scrape_compare`
**Purpose**: Compare results across multiple scraping sessions
```typescript
interface CompareArgs {
  session_ids: string[];
  comparison_metrics: ComparisonMetric[];
  output_format: 'table' | 'chart' | 'narrative';
  highlight_differences?: boolean;
}
```

## 🏗️ System Architecture

### Core Components

#### 1. Session Management
```typescript
class ScrapeSession {
  id: string;
  configuration: ScrapeConfig;
  progress: ProgressTracker;
  data: DataStore;
  metadata: SessionMetadata;
  created_at: Date;
  updated_at: Date;
}
```

#### 2. Context Provider 
```typescript
class ContextProvider {
  getCurrentDateTime(): string;
  getTimezone(): string;
  getDateFormatted(format: string): string;
  isBusinessHours(): boolean;
  getDaysSince(date: Date): number;
}
```

#### 3. Browser Manager
```typescript
class BrowserManager {
  private puppeteer: PuppeteerInstance;
  
  async createSession(): Promise<BrowserSession>;
  async navigate(url: string, options: NavigationOptions): Promise<void>;
  async extract(selectors: SelectorConfig[]): Promise<ExtractedData>;
  async screenshot(options: ScreenshotOptions): Promise<Buffer>;
  async cleanup(): Promise<void>;
}
```

#### 4. Data Pipeline
```typescript
class DataPipeline {
  async extract(rules: ExtractionRule[]): Promise<RawData>;
  async clean(data: RawData, rules: CleaningRule[]): Promise<CleanData>;
  async aggregate(data: CleanData[], strategy: AggregationStrategy): Promise<AggregatedData>;
  async export(data: AggregatedData, format: OutputFormat): Promise<ExportedFile>;
}
```

### Dynamic Context Integration
The server automatically provides current context to the LLM through:

```typescript
interface DynamicContext {
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
```

This context is automatically injected into every tool response, ensuring the LLM is always aware of temporal context for finding current information.

## 🚀 Deployment Architecture

### Smithery.ai Configuration

#### smithery.yaml
```yaml
version: 1
start:
  command: ["node", "dist/server.js"]
  port: 8000
build:
  dockerfile: "Dockerfile"
environment:
  NODE_ENV: "production"
  MCP_TRANSPORT: "streamable-http"
features:
  - streamable-http
  - stdio-fallback
healthcheck:
  path: "/health"
  interval: 30s
  timeout: 10s
  retries: 3
```

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/
COPY src/ ./src/

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["node", "dist/server.js"]
```

#### Project Structure
```
tanukimcp-scrape/
├── src/
│   ├── server.ts              # Main MCP server implementation
│   ├── tools/
│   │   ├── input/             # Input category tools
│   │   ├── execution/         # Execution category tools
│   │   └── output/            # Output category tools
│   ├── core/
│   │   ├── session.ts         # Session management
│   │   ├── browser.ts         # Browser automation
│   │   ├── context.ts         # Dynamic context provider
│   │   └── pipeline.ts        # Data processing pipeline
│   ├── types/
│   │   ├── tools.ts           # Tool interfaces
│   │   ├── config.ts          # Configuration types
│   │   └── data.ts            # Data structures
│   └── utils/
│       ├── validation.ts      # Input validation
│       ├── formatting.ts      # Output formatting
│       └── errors.ts          # Error handling
├── dist/                      # Compiled JavaScript
├── tests/                     # Test suite
├── docs/                      # Documentation
├── examples/                  # Usage examples
├── package.json
├── tsconfig.json
├── smithery.yaml              # Smithery deployment config
├── Dockerfile                 # Container definition
└── README.md                  # User documentation
```

## 📦 Installation & User Journey

### 1. Smithery.ai Auto-Install

Users can install with a single command:

```bash
# For Claude Desktop
npx -y @smithery/cli@latest install tanukimcp/scrape --client claude

# For Cursor
npx -y @smithery/cli@latest install tanukimcp/scrape --client cursor

# For other MCP clients
npx -y @smithery/cli@latest install tanukimcp/scrape --client custom
```

This automatically:
1. Downloads the server configuration
2. Updates the user's MCP client config
3. Provides example usage commands
4. Tests the connection

### 2. Manual Installation (Claude Desktop)

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "tanukimcp-scrape": {
      "url": "https://server.smithery.ai/tanukimcp/scrape",
      "transport": "streamable-http"
    }
  }
}
```

### 3. Manual Installation (Cursor)

Add to Cursor MCP settings:
```json
{
  "mcpServers": {
    "tanukimcp-scrape": {
      "url": "https://server.smithery.ai/tanukimcp/scrape",
      "transport": "streamable-http",
      "autoApprove": ["scrape_plan", "scrape_analyze_target"]
    }
  }
}
```

## 🎯 User Workflows & Journey

### Workflow 1: Simple Data Extraction
```
User: "Scrape product prices from example-store.com and save as CSV"

1. LLM calls: scrape_plan()
   → Creates scraping strategy, asks for confirmation

2. LLM calls: scrape_analyze_target(url: "example-store.com")
   → Analyzes site structure, detects product listings

3. LLM calls: scrape_execute(plan_id, selectors for prices)
   → Extracts product data with prices

4. LLM calls: scrape_clean() 
   → Normalizes price formats, removes duplicates

5. LLM calls: scrape_export_csv(filename: "product_prices.csv")
   → Saves CSV to user's system

Result: User gets clean CSV file with current product prices
```

### Workflow 2: Competitive Research Report
```
User: "Research competitor pricing across 5 websites and create a markdown report"

1. LLM calls: scrape_plan() with multiple URLs
   → Plans multi-site scraping strategy

2. LLM calls: scrape_analyze_target() for each site
   → Analyzes each competitor site structure

3. LLM calls: scrape_execute() with site-specific configurations
   → Extracts data from all sites

4. LLM calls: scrape_aggregate() 
   → Combines and deduplicates data across sites

5. LLM calls: scrape_compare() 
   → Generates competitive analysis

6. LLM calls: scrape_export_markdown()
   → Creates comprehensive markdown report

Result: Professional competitive analysis report with insights
```

### Workflow 3: Ongoing Monitoring
```
User: "Monitor news site for articles about AI and alert me to trends"

1. LLM calls: scrape_plan() with monitoring parameters
   → Sets up recurring scraping strategy

2. LLM calls: scrape_execute() with date-aware filtering
   → Scrapes recent articles (uses dynamic context)

3. LLM calls: scrape_summarize() 
   → Generates trend analysis

4. LLM calls: scrape_export_text() 
   → Creates summary report

5. LLM calls: scrape_compare() with previous sessions
   → Identifies new trends and changes

Result: Trend analysis showing what's new in AI news
```

## 🔧 Advanced Features

### Smart Rate Limiting
- Automatic detection of site rate limits
- Adaptive delays between requests
- Respectful scraping practices

### Error Recovery
- Automatic retry with exponential backoff
- Multiple fallback strategies
- Session state preservation

### Data Quality Assurance
- Real-time data validation
- Duplicate detection and removal
- Data type inference and correction

### Performance Optimization
- Parallel processing where appropriate
- Smart caching of page resources
- Efficient memory management

### Security & Ethics
- Robots.txt compliance checking
- Rate limiting enforcement
- User-agent identification
- Terms of service awareness

## 📊 Monitoring & Analytics

### Session Metrics
```typescript
interface SessionMetrics {
  pages_scraped: number;
  data_points_extracted: number;
  errors_encountered: number;
  average_response_time: number;
  success_rate: number;
  data_quality_score: number;
}
```

### Performance Tracking
- Real-time progress indicators
- Error rate monitoring
- Resource usage tracking
- Quality metrics

## 🔒 Security & Compliance

### Data Privacy
- No data stored on servers
- Local file system access only
- User-controlled data retention
- Secure transmission protocols

### Rate Limiting & Ethics
- Built-in respect for robots.txt
- Configurable delays between requests
- Anti-detection measures for responsible scraping
- Terms of service compliance checks

### Error Handling
- Graceful failure recovery
- Detailed error reporting
- Session state preservation
- Automatic cleanup

## 📈 Success Metrics

### User Experience Goals
- **Installation Time**: < 30 seconds from discovery to first use
- **First Success**: Users complete their first scrape within 2 minutes
- **Learning Curve**: 90% of users successful on second attempt
- **Reliability**: 99.5% uptime, < 5% error rate

### Technical Performance
- **Response Time**: < 2 seconds for tool responses
- **Throughput**: Support 100+ concurrent scraping sessions
- **Memory Usage**: < 512MB per session
- **Error Recovery**: 95% success rate after failures

## 🚀 Future Roadmap

### Phase 1: Core Foundation (Current)
- Basic Input→Execution→Output workflow
- Puppeteer integration
- CSV/Text export capabilities
- Smithery.ai deployment

### Phase 2: Enhanced Intelligence (Next)
- AI-powered content extraction
- Smart pagination detection
- Advanced data cleaning algorithms
- Real-time monitoring dashboards

### Phase 3: Enterprise Features
- Multi-user collaboration
- Advanced scheduling
- API integrations
- Custom plugin system

### Phase 4: AI Integration
- Computer vision for complex extractions
- Natural language query processing
- Predictive scraping suggestions
- Automated report generation

## 💡 Key Differentiators

1. **Structured Approach**: Unlike ad-hoc scraping tools, provides systematic workflow
2. **Dynamic Context**: Always aware of current date/time for fresh data
3. **Multi-Format Output**: Supports all major data formats out of the box
4. **User Collaboration**: Interactive planning and validation with users
5. **Ethics-First**: Built-in compliance and respectful scraping practices
6. **Zero Setup**: Works immediately after installation
7. **Enterprise Ready**: Scalable, reliable, and maintainable architecture

---

*This document is the single source of truth for the design and implementation of tanukimcp-scrape. All implemented features will be marked with a ✅ when complete.* 