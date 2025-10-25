/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Runtime Accessibility Analysis (Playwright-only)
 * 
 * Collects accessibility data that requires browser runtime.
 * Pure data collection - no analysis or scoring.
 * 
 * @module core/extractors/runtimeAccessibility
 */

import type { Page } from "playwright";

/**
 * Detect potential keyboard traps (WCAG 2.1.2)
 * 
 * Data collection only - identifies elements that may trap keyboard focus.
 * Does not determine if traps are justified (e.g., modal dialogs).
 */
export async function detectKeyboardTraps(page: Page): Promise<{
  hasPotentialTraps: boolean;
  suspiciousElements: Array<{
    selector: string;
    reason: "no-tabindex-exit" | "focus-locked" | "event-prevent-default";
  }>;
}> {
  try {
    const result = await page.evaluate(() => {
      const traps: Array<{ selector: string; reason: string }> = [];
      
      // Find all focusable elements
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ');
      
      const focusableElements = (globalThis as any).document.querySelectorAll(focusableSelectors);
      
      // Check for elements with positive tabindex but no logical next element
      focusableElements.forEach((el: any, index: number) => {
        const tabindex = el.getAttribute('tabindex');
        if (tabindex && parseInt(tabindex) > 0) {
          // Positive tabindex with no next focusable element is suspicious
          const nextFocusable = Array.from(focusableElements).slice(index + 1);
          const hasNextNaturalFlow = nextFocusable.some((next: any) => {
            const nextTabindex = next.getAttribute('tabindex');
            return !nextTabindex || parseInt(nextTabindex) === 0;
          });
          
          if (!hasNextNaturalFlow) {
            const selector = el.tagName.toLowerCase() + 
              (el.id ? `#${el.id}` : '') +
              (el.className ? `.${Array.from(el.classList).join('.')}` : '');
            
            traps.push({
              selector: selector.substring(0, 100), // Limit length
              reason: "no-tabindex-exit"
            });
          }
        }
      });
      
      // Check for elements with keydown listeners that might prevent tabbing
      const elementsWithKeyListeners = (globalThis as any).document.querySelectorAll('[onkeydown], [onkeyup], [onkeypress]');
      elementsWithKeyListeners.forEach((el: any) => {
        // This is a heuristic - we can't inspect the actual handler
        const selector = el.tagName.toLowerCase() + 
          (el.id ? `#${el.id}` : '') +
          (el.className ? `.${Array.from(el.classList).slice(0, 3).join('.')}` : '');
        
        traps.push({
          selector: selector.substring(0, 100),
          reason: "event-prevent-default"
        });
      });
      
      return {
        hasPotentialTraps: traps.length > 0,
        suspiciousElements: traps.slice(0, 20) // Limit to 20 items
      };
    });
    
    return result as any;
  } catch (error) {
    // Fail silently - runtime analysis is best-effort
    return {
      hasPotentialTraps: false,
      suspiciousElements: []
    };
  }
}

/**
 * Detect skip navigation links (WCAG 2.4.1)
 * 
 * Data collection only - identifies skip links and their properties.
 */
export async function detectSkipLinks(page: Page): Promise<{
  hasSkipLinks: boolean;
  links: Array<{
    text: string;
    href: string;
    isVisible: boolean;
    isFirstFocusable: boolean;
    targetExists: boolean;
  }>;
}> {
  try {
    const result = await page.evaluate(() => {
      const skipLinks: Array<{
        text: string;
        href: string;
        isVisible: boolean;
        isFirstFocusable: boolean;
        targetExists: boolean;
      }> = [];
      
      // Find all links in the first part of the document
      const allLinks = (globalThis as any).document.querySelectorAll('a[href^="#"]');
      const bodyLinks = Array.from(allLinks).slice(0, 20); // First 20 links only
      
      // Get first focusable element for comparison
      const firstFocusable = (globalThis as any).document.querySelector(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      
      bodyLinks.forEach((link: any) => {
        const text = (link.textContent || '').trim().toLowerCase();
        const href = link.getAttribute('href') || '';
        
        // Skip link heuristics - look for skip-related keywords
        const isSkipLink = text.includes('skip') || 
                          text.includes('jump') || 
                          text.includes('bypass') || 
                          text.includes('main content') ||
                          text.includes('main-content') ||
                          href.includes('#main') ||
                          href.includes('#content');
        
        if (isSkipLink) {
          // Check if visible
          const computed = (globalThis as any).window.getComputedStyle(link);
          const isVisible = computed.display !== 'none' && 
                           computed.visibility !== 'hidden' &&
                           computed.opacity !== '0' &&
                           !(computed.position === 'absolute' && 
                             (parseInt(computed.left) < -999 || parseInt(computed.top) < -999));
          
          // Check if target exists
          const targetId = href.substring(1);
          const target = targetId ? (globalThis as any).document.getElementById(targetId) : null;
          
          skipLinks.push({
            text: (link.textContent || '').trim().substring(0, 100),
            href: href.substring(0, 100),
            isVisible,
            isFirstFocusable: link === firstFocusable,
            targetExists: !!target
          });
        }
      });
      
      return {
        hasSkipLinks: skipLinks.length > 0,
        links: skipLinks
      };
    });
    
    return result as any;
  } catch (error) {
    return {
      hasSkipLinks: false,
      links: []
    };
  }
}

/**
 * Analyze video and audio elements (WCAG 1.2.x)
 * 
 * Data collection only - checks for captions, subtitles, descriptions, transcripts.
 */
export async function analyzeMediaElements(page: Page): Promise<{
  videos: Array<{
    src?: string;
    hasCaptions: boolean;
    hasSubtitles: boolean;
    hasDescriptions: boolean;
    autoplay: boolean;
    controls: boolean;
    trackCount: number;
  }>;
  audios: Array<{
    src?: string;
    hasTranscript: boolean;
    autoplay: boolean;
    controls: boolean;
  }>;
}> {
  try {
    const result = await page.evaluate(() => {
      const videos: Array<{
        src?: string;
        hasCaptions: boolean;
        hasSubtitles: boolean;
        hasDescriptions: boolean;
        autoplay: boolean;
        controls: boolean;
        trackCount: number;
      }> = [];
      
      const audios: Array<{
        src?: string;
        hasTranscript: boolean;
        autoplay: boolean;
        controls: boolean;
      }> = [];
      
      // Analyze video elements
      const videoElements = (globalThis as any).document.querySelectorAll('video');
      videoElements.forEach((video: any) => {
        const tracks = video.querySelectorAll('track');
        let hasCaptions = false;
        let hasSubtitles = false;
        let hasDescriptions = false;
        
        tracks.forEach((track: any) => {
          const kind = track.getAttribute('kind') || '';
          if (kind === 'captions') hasCaptions = true;
          if (kind === 'subtitles') hasSubtitles = true;
          if (kind === 'descriptions') hasDescriptions = true;
        });
        
        // Extract src: try direct src attribute, then currentSrc, then first source element
        let videoSrc = video.src || video.currentSrc || '';
        if (!videoSrc) {
          const sourceElement = video.querySelector('source[src]');
          if (sourceElement) {
            videoSrc = sourceElement.getAttribute('src') || '';
          }
        }
        
        videos.push({
          src: videoSrc.substring(0, 200),
          hasCaptions,
          hasSubtitles,
          hasDescriptions,
          autoplay: video.hasAttribute('autoplay'),
          controls: video.hasAttribute('controls'),
          trackCount: tracks.length
        });
      });
      
      // Analyze audio elements
      const audioElements = (globalThis as any).document.querySelectorAll('audio');
      audioElements.forEach((audio: any) => {
        // Heuristic: look for nearby transcript links/text
        let hasTranscript = false;
        const parent = audio.parentElement;
        if (parent) {
          const parentText = parent.textContent?.toLowerCase() || '';
          const siblingLinks = parent.querySelectorAll('a');
          
          hasTranscript = parentText.includes('transcript') || 
                         Array.from(siblingLinks).some((link: any) => 
                           (link.textContent?.toLowerCase() || '').includes('transcript')
                         );
        }
        
        // Extract src: try direct src attribute, then currentSrc, then first source element
        let audioSrc = audio.src || audio.currentSrc || '';
        if (!audioSrc) {
          const sourceElement = audio.querySelector('source[src]');
          if (sourceElement) {
            audioSrc = sourceElement.getAttribute('src') || '';
          }
        }
        
        audios.push({
          src: audioSrc.substring(0, 200),
          hasTranscript,
          autoplay: audio.hasAttribute('autoplay'),
          controls: audio.hasAttribute('controls')
        });
      });
      
      return { videos, audios };
    });
    
    return result as any;
  } catch (error) {
    return {
      videos: [],
      audios: []
    };
  }
}
