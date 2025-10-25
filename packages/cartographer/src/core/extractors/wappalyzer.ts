/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Wappalyzer-powered Technology Detection
 * 
 * Uses the industry-standard Wappalyzer library to detect technologies on web pages.
 * This provides comprehensive detection of frameworks, CMS, analytics, CDNs, etc.
 * 
 * @module core/extractors/wappalyzer
 */

import wappalyzer from 'simple-wappalyzer';

/**
 * Options for Wappalyzer detection
 */
export interface WappalyzerDetectorOptions {
  html: string;
  url: string;
  headers?: Record<string, string>;
  scripts?: string[]; // List of script src URLs
  robotsTxt?: string; // Optional robots.txt content
}

/**
 * Detected technology with metadata
 */
export interface DetectedTechnology {
  name: string;
  categories: string[];
  version?: string;
  confidence: number; // 0-100
  website?: string;
  icon?: string;
}

/**
 * Wappalyzer detection result
 */
export interface WappalyzerResult {
  technologies: DetectedTechnology[];
  detectionTime: number; // milliseconds
}

/**
 * Detect technologies using Wappalyzer
 * 
 * @param options - Detection options including HTML, URL, headers, scripts
 * @returns Detected technologies with metadata
 */
export async function detectTechnologies(options: WappalyzerDetectorOptions): Promise<WappalyzerResult> {
  const startTime = performance.now();
  
  try {
    // Prepare data for Wappalyzer
    const wappalyzerData: any = {
      url: options.url,
      html: options.html,
      headers: options.headers || {},
    };
    
    // Call wappalyzer function directly (it's not a class)
    const result = await wappalyzer(wappalyzerData);
    
    // Result is already an array of technologies
    const technologies: DetectedTechnology[] = result.map((tech: any) => ({
      name: tech.name,
      categories: tech.categories ? tech.categories.map((cat: any) => cat.name || cat) : [],
      version: tech.version || undefined,
      confidence: tech.confidence || 100,
      website: tech.website || undefined,
      icon: tech.icon || undefined,
    }));
    
    const detectionTime = Math.round(performance.now() - startTime);
    
    return {
      technologies,
      detectionTime,
    };
  } catch (error: any) {
    // Return empty result on error
    console.error(`Wappalyzer detection failed: ${error.message}`);
    return {
      technologies: [],
      detectionTime: Math.round(performance.now() - startTime),
    };
  }
}

/**
 * Extract script URLs from HTML
 * Helper function to get all script src attributes
 * 
 * @param html - HTML content
 * @returns Array of script URLs
 */
export function extractScriptUrls(html: string): string[] {
  const scriptUrls: string[] = [];
  
  // Match all <script src="..."> tags
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    scriptUrls.push(match[1]);
  }
  
  return scriptUrls;
}

/**
 * Legacy API: Simple string array of technology names
 * For backward compatibility with existing code
 * 
 * @param options - Detection options
 * @returns Array of technology names
 */
export async function detectTechStack(options: WappalyzerDetectorOptions): Promise<string[]> {
  const result = await detectTechnologies(options);
  return result.technologies.map(tech => tech.name);
}
