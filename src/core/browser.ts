/**
 * Browser Manager - Puppeteer browser automation and resource management
 * 
 * Manages browser instances, page lifecycle, navigation, interaction,
 * and resource cleanup for web scraping operations. Provides intelligent
 * browser automation with performance optimization and error handling.
 */

import puppeteer from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import { 
  BrowserSession, 
  BrowserPage, 
  PageStatus, 
  PageInteraction, 
  Screenshot, 
  PageError,
  BrowserMetrics 
} from '../types/data.js';
import { PuppeteerConfig, DEFAULT_PUPPETEER_CONFIG } from '../types/config.js';

export class BrowserManager {
  private browserSessions: Map<string, BrowserSession> = new Map();
  private config: PuppeteerConfig;
  private maxConcurrentBrowsers: number;
  private pageTimeout: number;

  constructor(
    config: PuppeteerConfig = DEFAULT_PUPPETEER_CONFIG,
    maxConcurrentBrowsers: number = 5,
    pageTimeout: number = 30000
  ) {
    this.config = config;
    this.maxConcurrentBrowsers = maxConcurrentBrowsers;
    this.pageTimeout = pageTimeout;
  }

  /**
   * Create a new browser session
   */
  async createBrowserSession(
    sessionId: string,
    customConfig?: Partial<PuppeteerConfig>
  ): Promise<BrowserSession> {
    // Check concurrent browser limit
    const activeBrowsers = Array.from(this.browserSessions.values())
      .filter(session => session.isActive).length;
    
    if (activeBrowsers >= this.maxConcurrentBrowsers) {
      throw new Error(`Maximum concurrent browsers limit reached (${this.maxConcurrentBrowsers})`);
    }

    const finalConfig = { ...this.config, ...customConfig };
    
    try {
      const browser = await puppeteer.launch({
        headless: finalConfig.headless,
        defaultViewport: finalConfig.defaultViewport,
        args: finalConfig.args,
        executablePath: finalConfig.executablePath,
        timeout: finalConfig.timeout
      });

      const browserSession: BrowserSession = {
        id: uuidv4(),
        sessionId,
        browser,
        pages: [],
        config: finalConfig,
        created: new Date(),
        lastActivity: new Date(),
        isActive: true,
        metrics: this.createEmptyMetrics()
      };

      this.browserSessions.set(browserSession.id, browserSession);
      
      console.log(`🌐 Created browser session ${browserSession.id} for session ${sessionId}`);
      return browserSession;

    } catch (error) {
      console.error('❌ Failed to create browser session:', error);
      throw new Error(`Failed to create browser session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get browser session by session ID
   */
  getBrowserSession(sessionId: string): BrowserSession | undefined {
    for (const browserSession of this.browserSessions.values()) {
      if (browserSession.sessionId === sessionId && browserSession.isActive) {
        return browserSession;
      }
    }
    return undefined;
  }

  /**
   * Create a new page in the browser session
   */
  async createPage(sessionId: string, url?: string): Promise<BrowserPage> {
    const browserSession = this.getBrowserSession(sessionId);
    if (!browserSession) {
      throw new Error(`No active browser session found for session ${sessionId}`);
    }

    try {
      const page = await browserSession.browser.newPage();
      
      // Set user agent if specified
      if (browserSession.config.userAgent) {
        await page.setUserAgent(browserSession.config.userAgent);
      }

      // Set viewport
      if (browserSession.config.defaultViewport) {
        await page.setViewport(browserSession.config.defaultViewport);
      }

      const browserPage: BrowserPage = {
        id: uuidv4(),
        url: url || 'about:blank',
        page,
        status: 'loading',
        created: new Date(),
        lastActivity: new Date(),
        interactions: [],
        screenshots: [],
        errors: []
      };

      // Set up error handling
      page.on('error', (error) => {
        this.recordPageError(browserPage, 'javascript', error.message, true);
      });

      page.on('pageerror', (error) => {
        this.recordPageError(browserPage, 'javascript', error.message, false);
      });

      page.on('requestfailed', (request) => {
        this.recordPageError(browserPage, 'network', `Failed to load: ${request.url()}`, false);
      });

      browserSession.pages.push(browserPage);
      browserSession.metrics.pagesOpened++;
      browserSession.lastActivity = new Date();

      // Navigate to URL if provided
      if (url) {
        await this.navigateToUrl(browserPage, url);
      } else {
        browserPage.status = 'ready';
      }

      return browserPage;

    } catch (error) {
      console.error('❌ Failed to create page:', error);
      throw new Error(`Failed to create page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Navigate to a URL
   */
  async navigateToUrl(
    browserPage: BrowserPage, 
    url: string,
    waitFor?: string | number,
    timeout?: number
  ): Promise<void> {
    const startTime = new Date();
    browserPage.status = 'loading';
    browserPage.url = url;
    browserPage.lastActivity = new Date();

    try {
      // Navigate to the URL
      await browserPage.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: timeout || this.pageTimeout
      });

      // Wait for additional conditions if specified
      if (waitFor) {
        if (typeof waitFor === 'string') {
          // Wait for CSS selector
          await browserPage.page.waitForSelector(waitFor, { timeout: timeout || this.pageTimeout });
        } else {
          // Wait for time
          await this.delay(waitFor);
        }
      }

      browserPage.status = 'ready';
      
      // Record interaction
      const interaction: PageInteraction = {
        id: uuidv4(),
        type: 'navigation',
        target: url,
        timestamp: startTime,
        duration: Date.now() - startTime.getTime(),
        success: true
      };
      
      browserPage.interactions.push(interaction);
      this.updateBrowserMetrics(browserPage, 'navigation');

    } catch (error) {
      browserPage.status = 'error';
      this.recordPageError(browserPage, 'navigation', error instanceof Error ? error.message : 'Navigation failed', true);
      throw error;
    }
  }

  /**
   * Click an element on the page
   */
  async clickElement(
    browserPage: BrowserPage, 
    selector: string,
    timeout?: number
  ): Promise<void> {
    const startTime = new Date();
    browserPage.status = 'interacting';
    browserPage.lastActivity = new Date();

    try {
      await browserPage.page.waitForSelector(selector, { timeout: timeout || this.pageTimeout });
      await browserPage.page.click(selector);

      const interaction: PageInteraction = {
        id: uuidv4(),
        type: 'click',
        target: selector,
        timestamp: startTime,
        duration: Date.now() - startTime.getTime(),
        success: true
      };

      browserPage.interactions.push(interaction);
      browserPage.status = 'ready';
      this.updateBrowserMetrics(browserPage, 'interaction');

    } catch (error) {
      browserPage.status = 'error';
      this.recordPageError(browserPage, 'extraction', error instanceof Error ? error.message : 'Click failed', false);
      throw error;
    }
  }

  /**
   * Type text into an input field
   */
  async typeText(
    browserPage: BrowserPage, 
    selector: string, 
    text: string,
    timeout?: number
  ): Promise<void> {
    const startTime = new Date();
    browserPage.status = 'interacting';
    browserPage.lastActivity = new Date();

    try {
      await browserPage.page.waitForSelector(selector, { timeout: timeout || this.pageTimeout });
      await browserPage.page.type(selector, text);

      const interaction: PageInteraction = {
        id: uuidv4(),
        type: 'type',
        target: selector,
        value: text,
        timestamp: startTime,
        duration: Date.now() - startTime.getTime(),
        success: true
      };

      browserPage.interactions.push(interaction);
      browserPage.status = 'ready';
      this.updateBrowserMetrics(browserPage, 'interaction');

    } catch (error) {
      browserPage.status = 'error';
      this.recordPageError(browserPage, 'extraction', error instanceof Error ? error.message : 'Type failed', false);
      throw error;
    }
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(
    browserPage: BrowserPage, 
    name: string,
    fullPage: boolean = false,
    quality?: number
  ): Promise<Screenshot> {
    const startTime = new Date();
    browserPage.lastActivity = new Date();

    try {
      const screenshotBuffer = await browserPage.page.screenshot({
        fullPage,
        type: 'png',
        quality: fullPage ? undefined : quality
      });

      const viewport = browserPage.page.viewport() || { width: 1280, height: 720 };
      
      const screenshot: Screenshot = {
        id: uuidv4(),
        name,
        url: browserPage.url,
        data: screenshotBuffer.toString('base64'),
        timestamp: startTime,
        fullPage,
        viewport,
        fileSize: screenshotBuffer.length
      };

      browserPage.screenshots.push(screenshot);
      this.updateBrowserMetrics(browserPage, 'screenshot');

      return screenshot;

    } catch (error) {
      this.recordPageError(browserPage, 'extraction', error instanceof Error ? error.message : 'Screenshot failed', false);
      throw error;
    }
  }

  /**
   * Extract data using CSS selectors
   */
  async extractData(
    browserPage: BrowserPage,
    selectors: { name: string; selector: string; attribute?: string; multiple?: boolean }[]
  ): Promise<Record<string, any>> {
    const startTime = new Date();
    browserPage.status = 'extracting';
    browserPage.lastActivity = new Date();

    try {
      const results: Record<string, any> = {};

      for (const { name, selector, attribute, multiple } of selectors) {
        try {
          if (multiple) {
            const elements = await browserPage.page.$$(selector);
            const values = [];
            
            for (const element of elements) {
              if (attribute) {
                const value = await element.evaluate((el, attr) => el.getAttribute(attr), attribute);
                values.push(value);
              } else {
                const value = await element.evaluate(el => el.textContent);
                values.push(value?.trim());
              }
            }
            results[name] = values;
          } else {
            const element = await browserPage.page.$(selector);
            if (element) {
              if (attribute) {
                results[name] = await element.evaluate((el, attr) => el.getAttribute(attr), attribute);
              } else {
                results[name] = await element.evaluate(el => el.textContent?.trim());
              }
            } else {
              results[name] = null;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to extract ${name}:`, error);
          results[name] = null;
        }
      }

      const interaction: PageInteraction = {
        id: uuidv4(),
        type: 'scroll', // Using 'scroll' as closest available type for extraction
        timestamp: startTime,
        duration: Date.now() - startTime.getTime(),
        success: true,
        metadata: { extractedFields: Object.keys(results).length }
      };

      browserPage.interactions.push(interaction);
      browserPage.status = 'ready';

      return results;

    } catch (error) {
      browserPage.status = 'error';
      this.recordPageError(browserPage, 'extraction', error instanceof Error ? error.message : 'Extraction failed', false);
      throw error;
    }
  }

  /**
   * Scroll to bottom of page
   */
  async scrollToBottom(browserPage: BrowserPage): Promise<void> {
    const startTime = new Date();
    browserPage.status = 'interacting';
    browserPage.lastActivity = new Date();

    try {
      await browserPage.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for potential dynamic content to load
      await this.delay(2000);

      const interaction: PageInteraction = {
        id: uuidv4(),
        type: 'scroll',
        timestamp: startTime,
        duration: Date.now() - startTime.getTime(),
        success: true
      };

      browserPage.interactions.push(interaction);
      browserPage.status = 'ready';
      this.updateBrowserMetrics(browserPage, 'interaction');

    } catch (error) {
      browserPage.status = 'error';
      this.recordPageError(browserPage, 'extraction', error instanceof Error ? error.message : 'Scroll failed', false);
      throw error;
    }
  }

  /**
   * Close a page
   */
  async closePage(browserPage: BrowserPage): Promise<void> {
    try {
      await browserPage.page.close();
      browserPage.status = 'completed';
    } catch (error) {
      console.warn('⚠️ Error closing page:', error);
    }
  }

  /**
   * Close browser session and clean up resources
   */
  async closeBrowserSession(sessionId: string): Promise<void> {
    const browserSession = this.getBrowserSession(sessionId);
    if (!browserSession) {
      return;
    }

    try {
      // Close all pages
      for (const browserPage of browserSession.pages) {
        await this.closePage(browserPage);
      }

      // Close browser
      await browserSession.browser.close();
      browserSession.isActive = false;

      // Remove from sessions
      this.browserSessions.delete(browserSession.id);
      
      console.log(`🚫 Closed browser session ${browserSession.id} for session ${sessionId}`);

    } catch (error) {
      console.error('❌ Error closing browser session:', error);
    }
  }

  /**
   * Clean up all browser sessions
   */
  async cleanup(): Promise<void> {
    const sessions = Array.from(this.browserSessions.keys());
    
    for (const sessionId of sessions) {
      const browserSession = this.browserSessions.get(sessionId);
      if (browserSession) {
        await this.closeBrowserSession(browserSession.sessionId);
      }
    }

    console.log('🧹 Browser cleanup completed');
  }

  /**
   * Get browser statistics
   */
  getBrowserStatistics(): {
    totalSessions: number;
    activeSessions: number;
    totalPages: number;
    totalInteractions: number;
    totalScreenshots: number;
    totalErrors: number;
  } {
    let totalPages = 0;
    let totalInteractions = 0;
    let totalScreenshots = 0;
    let totalErrors = 0;

    for (const session of this.browserSessions.values()) {
      totalPages += session.metrics.pagesOpened;
      totalInteractions += session.metrics.totalInteractions;
      totalScreenshots += session.metrics.totalScreenshots;
      totalErrors += session.metrics.totalErrors;
    }

    return {
      totalSessions: this.browserSessions.size,
      activeSessions: Array.from(this.browserSessions.values()).filter(s => s.isActive).length,
      totalPages,
      totalInteractions,
      totalScreenshots,
      totalErrors
    };
  }

  private createEmptyMetrics(): BrowserMetrics {
    return {
      pagesOpened: 0,
      totalNavigations: 0,
      totalInteractions: 0,
      totalScreenshots: 0,
      totalErrors: 0,
      avgPageLoadTime: 0,
      avgInteractionTime: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
  }

  private recordPageError(
    browserPage: BrowserPage, 
    type: PageError['type'], 
    message: string, 
    fatal: boolean
  ): void {
    const error: PageError = {
      id: uuidv4(),
      type,
      message,
      url: browserPage.url,
      timestamp: new Date(),
      fatal
    };

    browserPage.errors.push(error);
    this.updateBrowserMetrics(browserPage, 'error');
  }

  private updateBrowserMetrics(
    browserPage: BrowserPage, 
    operation: 'navigation' | 'interaction' | 'screenshot' | 'error'
  ): void {
    // Find the browser session
    for (const session of this.browserSessions.values()) {
      if (session.pages.includes(browserPage)) {
        switch (operation) {
          case 'navigation':
            session.metrics.totalNavigations++;
            break;
          case 'interaction':
            session.metrics.totalInteractions++;
            break;
          case 'screenshot':
            session.metrics.totalScreenshots++;
            break;
          case 'error':
            session.metrics.totalErrors++;
            break;
        }
        session.lastActivity = new Date();
        break;
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 