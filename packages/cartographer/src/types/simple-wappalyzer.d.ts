/*
 * Type declarations for simple-wappalyzer
 * Since the package doesn't include TypeScript definitions
 */

declare module 'simple-wappalyzer' {
  export interface WappalyzerOptions {
    url: string;
    html: string;
    headers?: Record<string, string | string[]>;
  }

  export interface WappalyzerCategory {
    id: number;
    slug: string;
    name: string;
  }

  export interface WappalyzerTechnology {
    slug: string;
    name: string;
    confidence: number;
    version?: string;
    icon?: string;
    website?: string;
    description?: string;
    categories: WappalyzerCategory[];
  }

  // The package returns an array of technologies directly
  export default function detect(options: WappalyzerOptions): Promise<WappalyzerTechnology[]>;
}
