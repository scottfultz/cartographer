/**
 * Pretty logging utilities with colors, borders, and formatting
 * 
 * Requirements:
 * - No boxes, only top/bottom borders
 * - [LEVEL] first, timestamp second
 * - Indent ordinary logs by 4 spaces
 * - High importance: no indent, wrapped by empty lines
 * - ASCII art headers using figlet
 * - Working terminal bell/chime
 * 
 * @author Cai Frazier
 * @license MIT
 */
import pc from "picocolors";
import figlet from "figlet";

export type OutputMode = "compact" | "verbose" | "minimal";

interface PrettyLogConfig {
  mode: OutputMode;
  colors: boolean;
  maxUrlLength: number;
  chime: boolean;
}

export class PrettyLogger {
  private config: PrettyLogConfig;
  
  // Border characters (simple lines, no boxes)
  private static BORDER = {
    horizontal: "─",
    double: "═",
  };
  
  // Icons
  private static ICONS = {
    success: "✓",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    timer: "⏱",
    link: "→",
    bullet: "•",
  };
  
  constructor(config: Partial<PrettyLogConfig> = {}) {
    this.config = {
      mode: config.mode || "compact",
      colors: config.colors ?? process.stderr.isTTY,
      maxUrlLength: config.maxUrlLength || 80,
      chime: config.chime || false,
    };
  }
  
  /**
   * Format a URL with truncation and color
   */
  formatUrl(url: string, maxLength?: number): string {
    const max = maxLength || this.config.maxUrlLength;
    let truncated = url;
    
    // Remove protocol for display
    truncated = truncated.replace(/^https?:\/\//, "");
    
    if (truncated.length > max) {
      truncated = truncated.substring(0, max - 3) + "...";
    }
    
    return this.config.colors ? pc.cyan(truncated) : truncated;
  }
  
  /**
   * Format a status code with color
   */
  formatStatus(code: number): string {
    const text = `${code}`;
    if (!this.config.colors) return text;
    
    if (code >= 200 && code < 300) return pc.green(text);
    if (code >= 300 && code < 400) return pc.yellow(text);
    if (code >= 400 && code < 500) return pc.yellow(text);
    if (code >= 500) return pc.red(text);
    return text;
  }
  
  /**
   * Format a timing value
   */
  formatTiming(ms: number): string {
    const text = ms >= 1000 
      ? `${(ms / 1000).toFixed(1)}s`
      : `${ms}ms`;
    return this.config.colors ? pc.magenta(text) : text;
  }
  
  /**
   * Format a count/metric
   */
  formatCount(n: number): string {
    const text = n.toLocaleString();
    return this.config.colors ? pc.blue(text) : text;
  }
  
  /**
   * Format memory size
   */
  formatMemory(mb: number): string {
    const text = `${mb} MB`;
    return this.config.colors ? pc.cyan(text) : text;
  }
  
  /**
   * Format duration
   */
  formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
  
  /**
   * Generate ASCII art header using figlet
   */
  private generateHeader(text: string): string {
    try {
      return figlet.textSync(text, {
        font: 'Future',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        width: 80,
        whitespaceBreak: true
      });
    } catch (err) {
      // Fallback to Standard font if Future not available
      return figlet.textSync(text, {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        width: 80,
        whitespaceBreak: true
      });
    }
  }
  
  /**
   * Log startup banner with ASCII art
   * HIGH IMPORTANCE: No indent, wrapped by empty lines
   */
  logBanner(config: CrawlConfig): void {
    const B = PrettyLogger.BORDER;
    const width = 80;
    
    // Generate ASCII art for "CARTOGRAPHER"
    const asciiArt = this.generateHeader("CARTOGRAPHER");
    const artLines = asciiArt.split('\n');
    
    // Colored decorative line (yellow for info/startup)
    const topBorder = this.config.colors ? pc.yellow(B.double.repeat(width)) : B.double.repeat(width);
    const bottomBorder = this.config.colors ? pc.yellow(B.double.repeat(width)) : B.double.repeat(width);
    
    // High importance output: no indent, wrapped by empty lines
    console.error("");
    console.error(topBorder);
    console.error("");
    
    // Print ASCII art left-justified, uncolored
    for (const line of artLines) {
      if (line.trim()) {
        console.error(line);
      }
    }
    
    console.error("");
    const subtitle = "v1.0.0-beta.1 • Atlas Archive Crawler by Cai Frazier";
    console.error(this.config.colors ? pc.dim(subtitle) : subtitle);
    console.error("");
    console.error(bottomBorder);
    console.error("");
    
    // Ordinary output: indented by 4 spaces
    console.error("    Configuration:");
    console.error(`    • Seeds:        ${config.seeds.join(", ")}`);
    console.error(`    • Mode:         ${config.mode}${config.stealth ? " (Cloudflare stealth)" : ""}`);
    console.error(`    • Concurrency:  ${config.concurrency} browsers`);
    if (config.rps) {
      console.error(`    • Rate Limit:   ${config.rps} req/s per host`);
    }
    console.error(`    • Max Pages:    ${config.maxPages > 0 ? config.maxPages.toLocaleString() : "unlimited"}`);
    console.error(`    • Max Depth:    ${config.maxDepth >= 0 ? config.maxDepth : "unlimited"}`);
    console.error(`    • Output:       ${config.outAtls}`);
    console.error("");
  }
  
  /**
   * Log final summary with ASCII art
   * HIGH IMPORTANCE: No indent, wrapped by empty lines
   */
  logSummary(data: SummaryData): void {
    const B = PrettyLogger.BORDER;
    const width = 80;
    
    // Generate ASCII art for "COMPLETE"
    const asciiArt = this.generateHeader("COMPLETE");
    const artLines = asciiArt.split('\n');
    
    // Colored decorative line (green for success)
    const topBorder = this.config.colors ? pc.green(B.double.repeat(width)) : B.double.repeat(width);
    const bottomBorder = this.config.colors ? pc.green(B.double.repeat(width)) : B.double.repeat(width);
    
    // High importance output: no indent, wrapped by empty lines
    console.error("");
    console.error(topBorder);
    console.error("");
    
    // Print ASCII art left-justified, uncolored
    for (const line of artLines) {
      if (line.trim()) {
        console.error(line);
      }
    }
    
    console.error("");
    
    // Summary data - traffic light colors: green (success), yellow (warnings), red (errors)
    const icon = PrettyLogger.ICONS.success;
    console.error(`${this.config.colors ? pc.green(icon) : icon} Duration:        ${this.formatDuration(data.durationSec)}`);
    console.error(`${this.config.colors ? pc.green(icon) : icon} Pages Crawled:   ${this.formatCount(data.pages)}`);
    console.error(`${this.config.colors ? pc.green(icon) : icon} Edges Found:     ${this.formatCount(data.edges)}`);
    console.error(`${this.config.colors ? pc.green(icon) : icon} Assets:          ${this.formatCount(data.assets)}`);
    
    // Traffic light: red for errors, green otherwise
    const errIcon = data.errors > 0 ? PrettyLogger.ICONS.error : icon;
    const errColor = data.errors > 0 ? (this.config.colors ? pc.red(data.errors.toString()) : data.errors.toString()) : (this.config.colors ? pc.green("0") : "0");
    const errIconColored = data.errors > 0 ? (this.config.colors ? pc.red(errIcon) : errIcon) : (this.config.colors ? pc.green(errIcon) : errIcon);
    console.error(`${errIconColored} Errors:          ${errColor} (budget: ${data.errorBudget})`);
    
    console.error("");
    console.error("Performance:");
    console.error(`  ${this.config.colors ? pc.yellow("•") : "•"} Throughput:    ${data.pagesPerSec.toFixed(2)} pages/sec`);
    console.error(`  ${this.config.colors ? pc.yellow("•") : "•"} Memory:        Peak ${this.formatMemory(data.peakRssMB)}, Avg ${this.formatMemory(data.avgRssMB)}`);
    
    if (data.maxDepthReached !== undefined) {
      console.error(`  ${this.config.colors ? pc.yellow("•") : "•"} Depth:         Max depth-${data.maxDepthReached} reached`);
    }
    
    console.error("");
    console.error("Archive:");
    console.error(`  ${this.config.colors ? pc.green("•") : "•"} File:          ${data.outAtls}`);
    
    if (data.archiveSizeKB) {
      console.error(`  ${this.config.colors ? pc.green("•") : "•"} Size:          ${data.archiveSizeKB} KB (compressed)`);
    }
    
    console.error("");
    console.error(bottomBorder);
    console.error("");
    
    // Play chime if enabled - use multiple methods for better compatibility
    if (this.config.chime) {
      this.playChime();
    }
  }
  
  /**
   * Play a terminal bell/chime sound
   * Uses multiple methods for better cross-platform compatibility
   */
  private playChime(): void {
    // Method 1: Terminal bell character (most compatible)
    process.stderr.write("\x07");
    
    // Method 2: Also try stdout for systems that redirect stderr
    process.stdout.write("\x07");
    
    // Method 3: Visual bell indicator for debugging
    if (this.config.colors) {
      console.error(pc.bold(pc.yellow("🔔 Chime!")));
    }
  }
}

// Type definitions
export interface PageCrawlData {
  url: string;
  status: number;
  statusText?: string;
  renderMs: number;
  extractMs?: number;
  writeMs?: number;
  totalMs?: number;
  edges: number;
  externalLinks?: number;
  assets: number;
  depth: number;
  discoveredFrom?: string;
  mode: string;
  navEndReason: string;
  technologies?: string[];
  schemas?: string[];
}

export interface CrawlConfig {
  seeds: string[];
  mode: string;
  stealth: boolean;
  concurrency: number;
  rps?: number;
  maxPages: number;
  maxDepth: number;
  outAtls: string;
}

export interface SummaryData {
  durationSec: number;
  pages: number;
  edges: number;
  assets: number;
  errors: number;
  errorBudget: number;
  pagesPerSec: number;
  peakRssMB: number;
  avgRssMB: number;
  maxDepthReached?: number;
  outAtls: string;
  archiveSizeKB?: number;
}
