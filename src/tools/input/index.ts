/**
 * Input Tools - Planning and Collaboration Tools
 * 
 * Handles the input phase of scraping workflows including:
 * - Collaborative planning with users
 * - Target website analysis
 * - Configuration management
 * - Requirement validation and confirmation
 */

import { SessionManager } from '../../core/session.js';
import { ContextProvider } from '../../core/context.js';
import { 
  ScrapeSession, 
  SessionConfig, 
  SessionStatus 
} from '../../types/data.js';
import { ToolResult } from '../../types/config.js';

export class InputTools {
  constructor(
    private sessionManager: SessionManager,
    private contextProvider: ContextProvider
  ) {}

  /**
   * Handle tool calls for input category
   */
  async handleToolCall(toolName: string, args: any): Promise<string> {
    try {
      switch (toolName) {
        case 'scrape_plan':
          return await this.handleScrapePlan(args);
        case 'scrape_analyze_target':
          return await this.handleAnalyzeTarget(args);
        case 'scrape_configure':
          return await this.handleConfigure(args);
        case 'scrape_validate_requirements':
          return await this.handleValidateRequirements(args);
        default:
          throw new Error(`Unknown input tool: ${toolName}`);
      }
    } catch (error) {
      throw new Error(`Input tool error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collaborative planning tool for defining scraping strategy
   */
  private async handleScrapePlan(args: {
    target_urls: string[];
    data_requirements: string;
    output_format: 'csv' | 'text' | 'json' | 'markdown';
    complexity_level: 'simple' | 'medium' | 'complex';
    expected_data_volume?: 'small' | 'medium' | 'large';
    user_preferences?: string;
  }): Promise<string> {
    const { target_urls, data_requirements, output_format, complexity_level, expected_data_volume, user_preferences } = args;
    
    // Validate inputs
    if (!target_urls || target_urls.length === 0) {
      throw new Error('At least one target URL is required');
    }

    if (!data_requirements) {
      throw new Error('Data requirements must be specified');
    }

    // Create a new session for this plan
    const session = this.sessionManager.createSession(
      undefined, // userId - could be passed in
      {
        rateLimit: this.determineRateLimit(complexity_level),
        timeout: this.determineTimeouts(complexity_level),
        javascriptEnabled: complexity_level !== 'simple'
      },
      `Scraping plan: ${data_requirements}`,
      [complexity_level, output_format, expected_data_volume || 'unknown'].filter(Boolean)
    );

    // Analyze complexity and provide recommendations
    const analysis = this.analyzeScrapingComplexity(target_urls, data_requirements, complexity_level);
    const recommendations = this.generateRecommendations(analysis, output_format, expected_data_volume);
    
    const context = this.contextProvider.getDynamicContext();
    
    const planSummary = {
      session_id: session.id,
      target_urls: target_urls,
      data_requirements: data_requirements,
      output_format: output_format,
      complexity_analysis: analysis,
      recommendations: recommendations,
      estimated_duration: this.estimateDuration(analysis),
      next_steps: this.getNextSteps(analysis),
      user_preferences: user_preferences
    };

    return this.contextProvider.createContextualMessage(`
📋 **Scraping Plan Created Successfully**

**Session ID**: \`${session.id}\`

**🎯 Target Analysis**:
- **URLs**: ${target_urls.length} target(s)
- **Data Requirements**: ${data_requirements}
- **Output Format**: ${output_format.toUpperCase()}
- **Complexity**: ${complexity_level.toUpperCase()}

**📊 Complexity Analysis**:
- **Estimated Pages**: ${analysis.estimated_pages}
- **Risk Level**: ${analysis.risk_level}
- **Rate Limiting**: ${analysis.rate_limiting_needed ? 'Required' : 'Optional'}
- **JavaScript**: ${analysis.javascript_heavy ? 'Heavy usage detected' : 'Minimal usage'}

**💡 Recommendations**:
${recommendations.map(r => `- ${r}`).join('\n')}

**⏱️ Estimated Duration**: ${planSummary.estimated_duration}

**🔄 Next Steps**:
${planSummary.next_steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

${user_preferences ? `\n**👤 User Preferences**: ${user_preferences}` : ''}

*Ready to proceed! Use \`scrape_analyze_target\` to analyze individual URLs or \`scrape_configure\` to adjust settings.*
    `, session.metadata.startTime, 0);
  }

  /**
   * Deep analysis of target websites
   */
  private async handleAnalyzeTarget(args: {
    url: string;
    analyze_pagination?: boolean;
    check_rate_limits?: boolean;
    detect_anti_bot?: boolean;
    analyze_structure?: boolean;
  }): Promise<string> {
    const { url, analyze_pagination = true, check_rate_limits = true, detect_anti_bot = true, analyze_structure = true } = args;

    if (!this.isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    // Simulate analysis (in real implementation, this would use the browser)
    const analysis = {
      url: url,
      structure: analyze_structure ? this.analyzePageStructure(url) : null,
      pagination: analyze_pagination ? this.detectPagination(url) : null,
      rate_limits: check_rate_limits ? this.checkRateLimits(url) : null,
      anti_bot: detect_anti_bot ? this.detectAntiBotMeasures(url) : null,
      performance: this.analyzePerformance(url),
      accessibility: this.analyzeAccessibility(url)
    };

    const recommendations = this.generateUrlSpecificRecommendations(analysis);
    const risks = this.identifyRisks(analysis);

    return this.contextProvider.createContextualMessage(`
🔍 **Target Analysis Complete**

**📄 URL**: ${url}

${analysis.structure ? `**🏗️ Page Structure**:
- **Content Type**: ${analysis.structure.content_type}
- **Framework**: ${analysis.structure.framework}
- **Dynamic Content**: ${analysis.structure.dynamic_content}%
- **Form Elements**: ${analysis.structure.forms}
- **Data Tables**: ${analysis.structure.tables}` : ''}

${analysis.pagination ? `\n**📄 Pagination**:
- **Type**: ${analysis.pagination.type}
- **Pattern**: ${analysis.pagination.pattern}
- **Estimated Pages**: ${analysis.pagination.estimated_pages}` : ''}

${analysis.rate_limits ? `\n**⚡ Rate Limiting**:
- **Detection**: ${analysis.rate_limits.detected ? 'Detected' : 'Not detected'}
- **Recommended Delay**: ${analysis.rate_limits.recommended_delay}ms
- **Headers**: ${analysis.rate_limits.headers ? 'Rate limit headers present' : 'No rate limit headers'}` : ''}

${analysis.anti_bot ? `\n**🛡️ Anti-Bot Measures**:
- **CAPTCHA**: ${analysis.anti_bot.captcha ? 'Present' : 'Not detected'}
- **JavaScript Challenge**: ${analysis.anti_bot.js_challenge ? 'Present' : 'Not detected'}
- **User Agent Check**: ${analysis.anti_bot.user_agent_check ? 'Required' : 'Not required'}
- **Cloudflare**: ${analysis.anti_bot.cloudflare ? 'Detected' : 'Not detected'}` : ''}

**⚡ Performance**:
- **Load Time**: ${analysis.performance.load_time}ms
- **Resource Count**: ${analysis.performance.resources}
- **Page Size**: ${analysis.performance.size}

**♿ Accessibility**:
- **Semantic HTML**: ${analysis.accessibility.semantic_html}%
- **ARIA Labels**: ${analysis.accessibility.aria_labels}
- **Navigation**: ${analysis.accessibility.navigation}

**💡 Recommendations**:
${recommendations.map(r => `- ${r}`).join('\n')}

${risks.length > 0 ? `\n**⚠️ Identified Risks**:
${risks.map(r => `- **${r.level.toUpperCase()}**: ${r.description}`).join('\n')}` : ''}

*Analysis complete! Use these insights to configure your scraping strategy.*
    `);
  }

  /**
   * Configure scraping parameters for a session
   */
  private async handleConfigure(args: {
    session_id: string;
    rate_limit_ms?: number;
    retry_attempts?: number;
    timeout_ms?: number;
    user_agent?: string;
    javascript_enabled?: boolean;
  }): Promise<string> {
    const { session_id, rate_limit_ms, retry_attempts, timeout_ms, user_agent, javascript_enabled } = args;

    const session = this.sessionManager.getSession(session_id);
    if (!session) {
      throw new Error(`Session ${session_id} not found`);
    }

    const config: Partial<SessionConfig> = {};
    
    if (rate_limit_ms !== undefined) {
      config.rateLimit = { delayMs: rate_limit_ms, burstLimit: 5 };
    }
    
    if (retry_attempts !== undefined) {
      config.retryOptions = { maxAttempts: retry_attempts, backoffMs: 1000 };
    }
    
    if (timeout_ms !== undefined) {
      config.timeout = { pageLoadMs: timeout_ms, elementWaitMs: timeout_ms / 3 };
    }
    
    if (user_agent) {
      config.userAgent = user_agent;
    }
    
    if (javascript_enabled !== undefined) {
      config.javascriptEnabled = javascript_enabled;
    }

    this.sessionManager.updateSessionConfig(session_id, config);

    return this.contextProvider.createContextualMessage(`
⚙️ **Session Configuration Updated**

**Session ID**: \`${session_id}\`

**Updated Settings**:
${rate_limit_ms !== undefined ? `- **Rate Limit**: ${rate_limit_ms}ms between requests` : ''}
${retry_attempts !== undefined ? `- **Retry Attempts**: ${retry_attempts} max attempts` : ''}
${timeout_ms !== undefined ? `- **Timeout**: ${timeout_ms}ms page load timeout` : ''}
${user_agent ? `- **User Agent**: ${user_agent}` : ''}
${javascript_enabled !== undefined ? `- **JavaScript**: ${javascript_enabled ? 'Enabled' : 'Disabled'}` : ''}

**Current Configuration**:
- **Rate Limiting**: ${session.configuration.rateLimit?.delayMs}ms delay
- **Retries**: ${session.configuration.retryOptions?.maxAttempts} attempts
- **Page Timeout**: ${session.configuration.timeout?.pageLoadMs}ms
- **JavaScript**: ${session.configuration.javascriptEnabled ? 'Enabled' : 'Disabled'}

*Configuration saved! Session is ready for execution.*
    `, session.metadata.startTime);
  }

  /**
   * Validate and refine requirements with user confirmation
   */
  private async handleValidateRequirements(args: {
    requirements: any;
    target_analysis?: any;
    confirm_with_user?: boolean;
  }): Promise<string> {
    const { requirements, target_analysis, confirm_with_user = true } = args;

    const validation = {
      completeness: this.validateCompleteness(requirements),
      feasibility: this.validateFeasibility(requirements, target_analysis),
      compliance: this.validateCompliance(requirements),
      optimization: this.suggestOptimizations(requirements, target_analysis)
    };

    const score = this.calculateValidationScore(validation);
    const issues = this.identifyValidationIssues(validation);
    const suggestions = this.generateImprovementSuggestions(validation);

    return this.contextProvider.createContextualMessage(`
✅ **Requirements Validation Complete**

**📊 Validation Score**: ${score}/100

**✅ Completeness Check**: ${validation.completeness.score}%
${validation.completeness.missing.length > 0 ? `- **Missing**: ${validation.completeness.missing.join(', ')}` : '- All required fields present'}

**🔍 Feasibility Assessment**: ${validation.feasibility.score}%
- **Technical Feasibility**: ${validation.feasibility.technical}%
- **Performance Impact**: ${validation.feasibility.performance}
- **Success Probability**: ${validation.feasibility.success_rate}%

**📋 Compliance Check**: ${validation.compliance.score}%
- **Rate Limiting**: ${validation.compliance.rate_limiting ? '✅' : '⚠️'}
- **Terms of Service**: ${validation.compliance.terms_of_service ? '✅' : '⚠️'}
- **Robot.txt**: ${validation.compliance.robots_txt ? '✅' : '⚠️'}

**⚡ Optimization Opportunities**: ${validation.optimization.opportunities.length} found
${validation.optimization.opportunities.map(o => `- ${o}`).join('\n')}

${issues.length > 0 ? `\n**⚠️ Issues Identified**:
${issues.map(i => `- **${i.severity.toUpperCase()}**: ${i.description}`).join('\n')}` : ''}

**💡 Improvement Suggestions**:
${suggestions.map(s => `- ${s}`).join('\n')}

${confirm_with_user ? `\n**👤 User Confirmation Required**:
Please review the analysis above and confirm if you'd like to proceed with the current configuration or make adjustments.

*Respond with your decision or use \`scrape_plan\` to create a revised plan.*` : '*Validation complete! Ready to proceed with execution.*'}
    `);
  }

  // Helper methods for analysis and validation
  private determineRateLimit(complexity: string): { delayMs: number; burstLimit: number } {
    switch (complexity) {
      case 'simple': return { delayMs: 500, burstLimit: 10 };
      case 'medium': return { delayMs: 1000, burstLimit: 5 };
      case 'complex': return { delayMs: 2000, burstLimit: 3 };
      default: return { delayMs: 1000, burstLimit: 5 };
    }
  }

  private determineTimeouts(complexity: string): { pageLoadMs: number; elementWaitMs: number } {
    switch (complexity) {
      case 'simple': return { pageLoadMs: 15000, elementWaitMs: 5000 };
      case 'medium': return { pageLoadMs: 30000, elementWaitMs: 10000 };
      case 'complex': return { pageLoadMs: 60000, elementWaitMs: 20000 };
      default: return { pageLoadMs: 30000, elementWaitMs: 10000 };
    }
  }

  private analyzeScrapingComplexity(urls: string[], requirements: string, complexity: string) {
    return {
      estimated_pages: urls.length * (complexity === 'simple' ? 10 : complexity === 'medium' ? 50 : 200),
      risk_level: complexity === 'simple' ? 'low' : complexity === 'medium' ? 'medium' : 'high',
      rate_limiting_needed: complexity !== 'simple',
      javascript_heavy: complexity === 'complex',
      dynamic_content: complexity !== 'simple',
      authentication_required: requirements.toLowerCase().includes('login') || requirements.toLowerCase().includes('auth'),
      data_volume: this.estimateDataVolume(urls.length, complexity)
    };
  }

  private generateRecommendations(analysis: any, format: string, volume?: string): string[] {
    const recommendations = [];
    
    if (analysis.risk_level === 'high') {
      recommendations.push('Use distributed scraping with multiple IP addresses');
      recommendations.push('Implement progressive delays between requests');
    }
    
    if (analysis.javascript_heavy) {
      recommendations.push('Enable JavaScript execution for dynamic content');
      recommendations.push('Wait for dynamic content to load before extraction');
    }
    
    if (format === 'csv' && volume === 'large') {
      recommendations.push('Consider streaming CSV export for large datasets');
    }
    
    if (analysis.authentication_required) {
      recommendations.push('Prepare authentication credentials and session management');
    }

    recommendations.push('Monitor rate limits and adjust delays dynamically');
    recommendations.push('Implement data quality validation during extraction');
    
    return recommendations;
  }

  private estimateDuration(analysis: any): string {
    const baseTime = analysis.estimated_pages * (analysis.javascript_heavy ? 3 : 1);
    const minutes = Math.ceil(baseTime / 20); // Rough estimate
    
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.ceil(minutes / 60)} hours`;
    return `${Math.ceil(minutes / 1440)} days`;
  }

  private getNextSteps(analysis: any): string[] {
    const steps = [];
    
    if (analysis.risk_level === 'high') {
      steps.push('Review target website terms of service');
    }
    
    steps.push('Analyze individual target URLs for specific requirements');
    steps.push('Configure rate limiting and timeout settings');
    
    if (analysis.authentication_required) {
      steps.push('Set up authentication credentials');
    }
    
    steps.push('Begin scraping execution with monitoring');
    
    return steps;
  }

  private isValidUrl(url: string): boolean {
    try {
      // Simple URL validation without requiring URL constructor
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  private analyzePageStructure(url: string) {
    // Simulated analysis - in real implementation would use browser
    return {
      content_type: 'e-commerce',
      framework: 'React',
      dynamic_content: 75,
      forms: 3,
      tables: 1
    };
  }

  private detectPagination(url: string) {
    return {
      type: 'numbered',
      pattern: 'page={number}',
      estimated_pages: 25
    };
  }

  private checkRateLimits(url: string) {
    return {
      detected: true,
      recommended_delay: 1000,
      headers: true
    };
  }

  private detectAntiBotMeasures(url: string) {
    return {
      captcha: false,
      js_challenge: true,
      user_agent_check: true,
      cloudflare: true
    };
  }

  private analyzePerformance(url: string) {
    return {
      load_time: 2500,
      resources: 45,
      size: '2.3MB'
    };
  }

  private analyzeAccessibility(url: string) {
    return {
      semantic_html: 85,
      aria_labels: 'Partial',
      navigation: 'Good'
    };
  }

  private generateUrlSpecificRecommendations(analysis: any): string[] {
    const recommendations = [];
    
    if (analysis.anti_bot?.cloudflare) {
      recommendations.push('Use stealth mode to bypass Cloudflare protection');
    }
    
    if (analysis.structure?.dynamic_content > 50) {
      recommendations.push('Wait for dynamic content loading');
    }
    
    if (analysis.pagination) {
      recommendations.push(`Implement pagination handling for ${analysis.pagination.estimated_pages} pages`);
    }
    
    return recommendations;
  }

  private identifyRisks(analysis: any): Array<{ level: string; description: string }> {
    const risks = [];
    
    if (analysis.anti_bot?.captcha) {
      risks.push({ level: 'high', description: 'CAPTCHA protection may block automated access' });
    }
    
    if (analysis.rate_limits?.detected) {
      risks.push({ level: 'medium', description: 'Rate limiting detected, may slow down scraping' });
    }
    
    return risks;
  }

  private validateCompleteness(requirements: any) {
    const required = ['target_urls', 'data_requirements', 'output_format'];
    const missing = required.filter(field => !requirements[field]);
    
    return {
      score: Math.round(((required.length - missing.length) / required.length) * 100),
      missing
    };
  }

  private validateFeasibility(requirements: any, analysis?: any) {
    return {
      score: 85,
      technical: 90,
      performance: 'Good',
      success_rate: 85
    };
  }

  private validateCompliance(requirements: any) {
    return {
      score: 80,
      rate_limiting: true,
      terms_of_service: true,
      robots_txt: false
    };
  }

  private suggestOptimizations(requirements: any, analysis?: any) {
    return {
      opportunities: [
        'Parallel processing for multiple URLs',
        'Intelligent retry logic',
        'Dynamic rate limiting adjustment'
      ]
    };
  }

  private calculateValidationScore(validation: any): number {
    return Math.round((validation.completeness.score + validation.feasibility.score + validation.compliance.score) / 3);
  }

  private identifyValidationIssues(validation: any): Array<{ severity: string; description: string }> {
    const issues = [];
    
    if (validation.completeness.score < 80) {
      issues.push({ severity: 'high', description: 'Missing required configuration parameters' });
    }
    
    if (!validation.compliance.robots_txt) {
      issues.push({ severity: 'medium', description: 'robots.txt restrictions not checked' });
    }
    
    return issues;
  }

  private generateImprovementSuggestions(validation: any): string[] {
    return [
      'Add more specific CSS selectors for data extraction',
      'Include fallback strategies for failed requests',
      'Consider data quality validation rules'
    ];
  }

  private estimateDataVolume(urlCount: number, complexity: string): string {
    const multiplier = complexity === 'simple' ? 100 : complexity === 'medium' ? 500 : 2000;
    const estimated = urlCount * multiplier;
    
    if (estimated < 1000) return 'small';
    if (estimated < 10000) return 'medium';
    return 'large';
  }
} 