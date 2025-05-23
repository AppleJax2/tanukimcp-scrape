#!/usr/bin/env node
/**
 * TanukiMCP Scrape - Flagship MCP Server for Intelligent Web Scraping
 * 
 * Provides structured web scraping capabilities through three categories:
 * - Input Tools: Planning and collaboration
 * - Execution Tools: Scraping and processing
 * - Output Tools: Data formatting and export
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
  ListToolsRequest,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";

// Core imports
import { ContextProvider } from "./core/context.js";
import { SessionManager } from "./core/session.js";
import { BrowserManager } from "./core/browser.js";
import { DataPipeline } from "./core/pipeline.js";

// Tool imports
import { InputTools } from "./tools/input/index.js";
import { ExecutionTools } from "./tools/execution/index.js";
import { OutputTools } from "./tools/output/index.js";

// Type imports
import { ServerConfig, ToolCategory, DynamicContext } from "./types/config.js";

class TanukiMcpScrapeServer {
  private server: Server;
  private contextProvider: ContextProvider;
  private sessionManager: SessionManager;
  private browserManager: BrowserManager;
  private dataPipeline: DataPipeline;
  private inputTools: InputTools;
  private executionTools: ExecutionTools;
  private outputTools: OutputTools;
  private config: ServerConfig;

  constructor() {
    this.server = new Server(
      {
        name: "tanukimcp-scrape",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.config = {
      transport: (process.env.MCP_TRANSPORT as 'stdio' | 'streamable-http') || 'stdio',
      port: parseInt(process.env.PORT || '8000'),
      host: process.env.HOST || '0.0.0.0',
      enableCors: process.env.ENABLE_CORS === 'true',
      maxSessions: parseInt(process.env.MAX_SESSIONS || '100'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1800000'), // 30 minutes
    };

    // Initialize core components
    this.contextProvider = new ContextProvider();
    this.sessionManager = new SessionManager(this.config.maxSessions, this.config.sessionTimeout);
    this.browserManager = new BrowserManager();
    this.dataPipeline = new DataPipeline();

    // Initialize tool categories
    this.inputTools = new InputTools(this.sessionManager, this.contextProvider);
    this.executionTools = new ExecutionTools(this.sessionManager, this.browserManager, this.dataPipeline);
    this.outputTools = new OutputTools(this.sessionManager, this.dataPipeline);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const dynamicContext = this.contextProvider.getDynamicContext();
      
      return {
        tools: [
          ...this.getInputToolsDefinitions(),
          ...this.getExecutionToolsDefinitions(),
          ...this.getOutputToolsDefinitions(),
        ].map(tool => ({
          ...tool,
          description: `${tool.description}\n\n🕒 Current context: ${dynamicContext.current_datetime} (${dynamicContext.timezone})`
        }))
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.handleToolCall(request);
    });

    // Health check for HTTP transport
    if (this.config.transport === 'streamable-http') {
      this.setupHealthCheck();
    }
  }

  private getInputToolsDefinitions(): Tool[] {
    return [
      {
        name: "scrape_plan",
        description: "📋 Collaborative planning tool for defining scraping strategy with user input and complexity assessment",
        inputSchema: {
          type: "object",
          properties: {
            target_urls: {
              type: "array",
              items: { type: "string" },
              description: "URLs to scrape"
            },
            data_requirements: {
              type: "string",
              description: "Description of what data to extract"
            },
            output_format: {
              type: "string",
              enum: ["csv", "text", "json", "markdown"],
              description: "Desired output format"
            },
            complexity_level: {
              type: "string",
              enum: ["simple", "medium", "complex"],
              description: "Expected complexity level"
            },
            expected_data_volume: {
              type: "string",
              enum: ["small", "medium", "large"],
              description: "Expected amount of data"
            },
            user_preferences: {
              type: "string",
              description: "Additional user preferences or requirements"
            }
          },
          required: ["target_urls", "data_requirements", "output_format", "complexity_level"]
        }
      },
      {
        name: "scrape_analyze_target",
        description: "🔍 Deep analysis of target websites for optimal scraping approach and anti-bot detection",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL to analyze"
            },
            analyze_pagination: {
              type: "boolean",
              description: "Whether to analyze pagination patterns"
            },
            check_rate_limits: {
              type: "boolean", 
              description: "Whether to check for rate limiting"
            },
            detect_anti_bot: {
              type: "boolean",
              description: "Whether to detect anti-bot measures"
            },
            analyze_structure: {
              type: "boolean",
              description: "Whether to analyze DOM structure"
            }
          },
          required: ["url"]
        }
      },
      {
        name: "scrape_configure",
        description: "⚙️ Configure scraping parameters and behavior for a session",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session identifier"
            },
            rate_limit_ms: {
              type: "number",
              description: "Delay between requests in milliseconds"
            },
            retry_attempts: {
              type: "number",
              description: "Number of retry attempts for failed requests"
            },
            timeout_ms: {
              type: "number",
              description: "Timeout for page loads in milliseconds"
            },
            user_agent: {
              type: "string",
              description: "Custom user agent string"
            },
            javascript_enabled: {
              type: "boolean",
              description: "Whether to enable JavaScript execution"
            }
          },
          required: ["session_id"]
        }
      },
      {
        name: "scrape_validate_requirements",
        description: "✅ Validate and refine requirements with user confirmation",
        inputSchema: {
          type: "object",
          properties: {
            requirements: {
              type: "object",
              description: "Scraping requirements to validate"
            },
            target_analysis: {
              type: "object", 
              description: "Results from target analysis"
            },
            confirm_with_user: {
              type: "boolean",
              description: "Whether to request user confirmation"
            }
          },
          required: ["requirements"]
        }
      }
    ];
  }

  private getExecutionToolsDefinitions(): Tool[] {
    return [
      {
        name: "scrape_execute",
        description: "🚀 Main execution engine for planned scraping operations with progress tracking",
        inputSchema: {
          type: "object",
          properties: {
            plan_id: {
              type: "string",
              description: "ID of the scraping plan to execute"
            },
            start_urls: {
              type: "array",
              items: { type: "string" },
              description: "URLs to start scraping from"
            },
            selectors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  selector: { type: "string" },
                  attribute: { type: "string" },
                  multiple: { type: "boolean" }
                }
              },
              description: "CSS selectors for data extraction"
            },
            execution_mode: {
              type: "string",
              enum: ["sequential", "parallel", "adaptive"],
              description: "How to execute the scraping"
            },
            max_pages: {
              type: "number",
              description: "Maximum number of pages to scrape"
            },
            depth_limit: {
              type: "number",
              description: "Maximum depth for link following"
            }
          },
          required: ["plan_id", "start_urls", "selectors"]
        }
      },
      {
        name: "scrape_navigate",
        description: "🧭 Advanced navigation with interaction capabilities and screenshot capture",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL to navigate to"
            },
            session_id: {
              type: "string",
              description: "Session identifier"
            },
            wait_for: {
              type: "string",
              description: "CSS selector or time to wait for"
            },
            interactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["click", "type", "select"] },
                  selector: { type: "string" },
                  value: { type: "string" }
                }
              },
              description: "Page interactions to perform"
            },
            screenshot: {
              type: "boolean",
              description: "Whether to take a screenshot"
            },
            scroll_to_bottom: {
              type: "boolean",
              description: "Whether to scroll to bottom of page"
            }
          },
          required: ["url", "session_id"]
        }
      },
      {
        name: "scrape_extract",
        description: "📊 Intelligent data extraction using multiple strategies with AI fallback",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session identifier"
            },
            extraction_rules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  selector: { type: "string" },
                  attribute: { type: "string" },
                  transform: { type: "string" },
                  required: { type: "boolean" }
                }
              },
              description: "Rules for extracting data"
            },
            fallback_strategy: {
              type: "string",
              enum: ["ai_vision", "text_analysis", "pattern_matching"],
              description: "Fallback strategy if selectors fail"
            },
            validate_data: {
              type: "boolean",
              description: "Whether to validate extracted data"
            }
          },
          required: ["session_id", "extraction_rules"]
        }
      },
      {
        name: "scrape_clean",
        description: "🧹 Clean and normalize extracted data with configurable rules",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session identifier"
            },
            cleaning_rules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  operation: { type: "string" },
                  parameters: { type: "object" }
                }
              },
              description: "Data cleaning rules to apply"
            },
            normalization_options: {
              type: "object",
              description: "Options for data normalization"
            }
          },
          required: ["session_id"]
        }
      },
      {
        name: "scrape_monitor_progress",
        description: "📈 Track and manage scraping progress with real-time metrics",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session identifier"
            },
            include_metrics: {
              type: "boolean",
              description: "Whether to include performance metrics"
            },
            include_errors: {
              type: "boolean",
              description: "Whether to include error details"
            },
            include_preview: {
              type: "boolean",
              description: "Whether to include data preview"
            }
          },
          required: ["session_id"]
        }
      }
    ];
  }

  private getOutputToolsDefinitions(): Tool[] {
    return [
      {
        name: "scrape_export_csv",
        description: "📄 Export scraped data to CSV format with customizable formatting",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session identifier"
            },
            filename: {
              type: "string",
              description: "Output filename"
            },
            delimiter: {
              type: "string",
              enum: [",", ";", "\t"],
              description: "CSV delimiter"
            },
            include_headers: {
              type: "boolean",
              description: "Whether to include column headers"
            },
            encoding: {
              type: "string",
              enum: ["utf-8", "utf-16", "ascii"],
              description: "File encoding"
            },
            file_path: {
              type: "string",
              description: "Local file path to save to"
            }
          },
          required: ["session_id", "filename"]
        }
      },
      {
        name: "scrape_export_text",
        description: "📝 Generate structured text reports in various formats",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session identifier"
            },
            filename: {
              type: "string",
              description: "Output filename"
            },
            report_format: {
              type: "string",
              enum: ["summary", "detailed", "structured", "narrative"],
              description: "Report format style"
            },
            include_metadata: {
              type: "boolean",
              description: "Whether to include scraping metadata"
            },
            file_path: {
              type: "string",
              description: "Local file path to save to"
            }
          },
          required: ["session_id", "filename"]
        }
      },
      {
        name: "scrape_export_json",
        description: "🔧 Export structured JSON data with schema support",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session identifier"
            },
            filename: {
              type: "string",
              description: "Output filename"
            },
            format_style: {
              type: "string",
              enum: ["compact", "pretty", "hierarchical"],
              description: "JSON formatting style"
            },
            include_schema: {
              type: "boolean",
              description: "Whether to include JSON schema"
            },
            file_path: {
              type: "string",
              description: "Local file path to save to"
            }
          },
          required: ["session_id", "filename"]
        }
      },
      {
        name: "scrape_export_markdown",
        description: "📋 Generate markdown reports with tables and formatting",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session identifier"
            },
            filename: {
              type: "string",
              description: "Output filename"
            },
            include_toc: {
              type: "boolean",
              description: "Whether to include table of contents"
            },
            include_images: {
              type: "boolean",
              description: "Whether to include screenshots"
            },
            template_style: {
              type: "string",
              enum: ["github", "technical", "presentation"],
              description: "Markdown template style"
            },
            file_path: {
              type: "string",
              description: "Local file path to save to"
            }
          },
          required: ["session_id", "filename"]
        }
      },
      {
        name: "scrape_summarize",
        description: "📊 Generate intelligent summaries of scraped data with insights",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session identifier"
            },
            summary_type: {
              type: "string",
              enum: ["executive", "technical", "statistical", "insights"],
              description: "Type of summary to generate"
            },
            include_charts: {
              type: "boolean",
              description: "Whether to include data visualizations"
            },
            highlight_patterns: {
              type: "boolean",
              description: "Whether to highlight data patterns"
            }
          },
          required: ["session_id", "summary_type"]
        }
      },
      {
        name: "scrape_compare",
        description: "🔍 Compare results across multiple scraping sessions",
        inputSchema: {
          type: "object",
          properties: {
            session_ids: {
              type: "array",
              items: { type: "string" },
              description: "Session IDs to compare"
            },
            comparison_metrics: {
              type: "array",
              items: { type: "string" },
              description: "Metrics to compare"
            },
            output_format: {
              type: "string",
              enum: ["table", "chart", "narrative"],
              description: "Comparison output format"
            },
            highlight_differences: {
              type: "boolean",
              description: "Whether to highlight differences"
            }
          },
          required: ["session_ids"]
        }
      }
    ];
  }

  private async handleToolCall(request: CallToolRequest) {
    const { name: toolName, arguments: args } = request.params;
    const dynamicContext = this.contextProvider.getDynamicContext();

    try {
      let result;

      // Route to appropriate tool category
      if (toolName.startsWith('scrape_plan') || toolName.startsWith('scrape_analyze') || 
          toolName.startsWith('scrape_configure') || toolName.startsWith('scrape_validate')) {
        result = await this.inputTools.handleToolCall(toolName, args);
      } else if (toolName.startsWith('scrape_execute') || toolName.startsWith('scrape_navigate') || 
                 toolName.startsWith('scrape_extract') || toolName.startsWith('scrape_clean') ||
                 toolName.startsWith('scrape_monitor')) {
        result = await this.executionTools.handleToolCall(toolName, args);
      } else if (toolName.startsWith('scrape_export') || toolName.startsWith('scrape_summarize') || 
                 toolName.startsWith('scrape_compare')) {
        result = await this.outputTools.handleToolCall(toolName, args);
      } else {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      // Inject dynamic context into all responses
      return {
        content: [
          {
            type: "text",
            text: `${result}\n\n🕒 Context: ${dynamicContext.current_datetime} | Session: ${this.sessionManager.getActiveSessionCount()} active`
          }
        ]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: ${errorMessage}\n\n🕒 Context: ${dynamicContext.current_datetime}`
          }
        ],
        isError: true
      };
    }
  }

  private setupHealthCheck(): void {
    const app = express();
    
    if (this.config.enableCors) {
      app.use(cors());
    }

    app.get('/health', (req, res) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        sessions: {
          active: this.sessionManager.getActiveSessionCount(),
          max: this.config.maxSessions
        },
        memory: process.memoryUsage(),
        version: '1.0.0'
      };
      res.json(health);
    });

    app.listen(this.config.port, this.config.host, () => {
      console.log(`Health check server running on ${this.config.host}:${this.config.port}`);
    });
  }

  async start(): Promise<void> {
    console.log('🚀 Starting TanukiMCP Scrape Server...');
    
    if (this.config.transport === 'streamable-http') {
      console.log('📡 Using Streamable HTTP transport');
      const transport = new SSEServerTransport("/message", this.server);
      await this.server.connect(transport);
    } else {
      console.log('📟 Using STDIO transport');
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
    }
    
    console.log('✅ TanukiMCP Scrape Server is running!');
    console.log(`📊 Max sessions: ${this.config.maxSessions}`);
    console.log(`⏱️  Session timeout: ${this.config.sessionTimeout / 1000}s`);
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping TanukiMCP Scrape Server...');
    await this.sessionManager.cleanup();
    await this.browserManager.cleanup();
    console.log('✅ Server stopped gracefully');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📡 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📡 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
const server = new TanukiMcpScrapeServer();
server.start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}); 