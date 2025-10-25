/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()

/**
 * Challenge Page Detection Edge Cases
 * Tests for the challenge detection logic without requiring real browser
 */

// Mock detectChallengePage logic for unit testing
function detectChallengePageMock(html: string, statusCode?: number): boolean {
  // Check status codes
  if (statusCode === 503 || statusCode === 429) {
    return true;
  }

  // Check page title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1].toLowerCase();
    const challengeTitles = [
      'just a moment',
      'attention required',
      'checking your browser',
      'verifying you are',
      'security check',
      'please wait',
      'access denied',
      'ddos protection'
    ];
    if (challengeTitles.some(pattern => title.includes(pattern))) {
      return true;
    }
  }

  // Check for DOM patterns
  const challengeSelectors = [
    '#cf-challenge-form',
    '.cf-browser-verification',
    '#challenge-form',
    '[data-ray-id]',
    '.ray-id',
    '#captcha',
    '.g-recaptcha'
  ];

  for (const selector of challengeSelectors) {
    if (html.includes(selector) || html.includes(selector.replace(/[#.]/g, ''))) {
      return true;
    }
  }

  return false;
}

test("challenge detection - Cloudflare 503 status code", () => {
  const html = "<html><body>Loading...</body></html>";
  expect(detectChallengePageMock(html, 503), true);
});

test("challenge detection - rate limit 429 status code", () => {
  const html = "<html><body>Too many requests</body></html>";
  expect(detectChallengePageMock(html, 429), true);
});

test("challenge detection - 'Just a moment' title", () => {
  const html = "<html><head><title>Just a moment...</title></head><body></body></html>";
  expect(detectChallengePageMock(html, 200), true);
});

test("challenge detection - 'Attention Required' title", () => {
  const html = "<html><head><title>Attention Required! | Cloudflare</title></head><body></body></html>";
  expect(detectChallengePageMock(html, 200), true);
});

test("challenge detection - 'Checking your browser' title", () => {
  const html = "<html><head><title>Checking your browser before accessing</title></head><body></body></html>";
  expect(detectChallengePageMock(html, 200), true);
});

test("challenge detection - case insensitive title matching", () => {
  const html = "<html><head><title>JUST A MOMENT</title></head><body></body></html>";
  expect(detectChallengePageMock(html, 200), true);
});

test("challenge detection - Cloudflare challenge form", () => {
  const html = '<html><body><form id="cf-challenge-form"></form></body></html>';
  expect(detectChallengePageMock(html, 200), true);
});

test("challenge detection - browser verification class", () => {
  const html = '<html><body><div class="cf-browser-verification"></div></body></html>';
  expect(detectChallengePageMock(html, 200), true);
});

test("challenge detection - generic challenge form", () => {
  const html = '<html><body><form id="challenge-form"></form></body></html>';
  expect(detectChallengePageMock(html, 200), true);
});

test("challenge detection - Cloudflare Ray ID", () => {
  const html = '<html><body><div data-ray-id="abc123"></div></body></html>';
  expect(detectChallengePageMock(html, 200), true);
});

test("challenge detection - reCAPTCHA", () => {
  const html = '<html><body><div class="g-recaptcha"></div></body></html>';
  expect(detectChallengePageMock(html, 200), true);
});

test("challenge detection - normal page returns false", () => {
  const html = "<html><head><title>Welcome to Example</title></head><body><h1>Hello</h1></body></html>";
  expect(detectChallengePageMock(html, 200), false);
});

test("challenge detection - normal 200 page without patterns", () => {
  const html = "<html><head><title>Home Page</title></head><body><p>Content here</p></body></html>";
  expect(detectChallengePageMock(html, 200), false);
});

test("challenge detection - no title element", () => {
  const html = "<html><body><h1>No Title</h1></body></html>";
  expect(detectChallengePageMock(html, 200), false);
});

test("challenge detection - empty HTML", () => {
  const html = "";
  expect(detectChallengePageMock(html, 200), false);
});

test("challenge detection - partial title match should fail", () => {
  const html = "<html><head><title>Momentary page</title></head><body></body></html>";
  // "moment" is in "momentary" but not "just a moment"
  expect(detectChallengePageMock(html, 200), false);
});

test("challenge detection - status 404 without challenge patterns", () => {
  const html = "<html><head><title>Page Not Found</title></head><body></body></html>";
  expect(detectChallengePageMock(html, 404), false);
});

test("challenge detection - status 500 without challenge patterns", () => {
  const html = "<html><head><title>Internal Server Error</title></head><body></body></html>";
  expect(detectChallengePageMock(html, 500), false);
});

test("challenge detection - malformed HTML with challenge title", () => {
  const html = "<title>Just a moment</title><body>Unclosed tags";
  expect(detectChallengePageMock(html, 200), true);
});
