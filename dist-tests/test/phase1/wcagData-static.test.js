/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
/**
 * Phase 1 Test Suite: WCAG Static Analysis
 *
 * Tests for static (Cheerio-based) WCAG data collection functions:
 * - extractAriaLiveRegions()
 * - analyzeFocusOrder()
 * - analyzeFormAutocomplete()
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import * as cheerio from "cheerio";
import { extractAriaLiveRegions, analyzeFocusOrder, analyzeFormAutocomplete, } from "../../src/core/extractors/wcagData.js";
// =============================================================================
// ARIA LIVE REGIONS (WCAG 4.1.3)
// =============================================================================
test("extractAriaLiveRegions - detects explicit aria-live polite", () => {
    const html = `
    <html>
      <body>
        <div aria-live="polite" id="notifications">Updates here</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = extractAriaLiveRegions($);
    assert.equal(result.count, 1);
    assert.equal(result.regions.length, 1);
    assert.equal(result.regions[0].live, "polite");
    assert.equal(result.regions[0].atomic, false); // Default when not specified
});
test("extractAriaLiveRegions - detects explicit aria-live assertive", () => {
    const html = `
    <html>
      <body>
        <div aria-live="assertive" aria-atomic="true" id="alerts">Critical alert</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = extractAriaLiveRegions($);
    assert.equal(result.count, 1);
    assert.equal(result.regions[0].live, "assertive");
    assert.equal(result.regions[0].atomic, true);
});
test("extractAriaLiveRegions - detects aria-live off", () => {
    const html = `
    <html>
      <body>
        <div aria-live="off">No announcements</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = extractAriaLiveRegions($);
    assert.equal(result.count, 1);
    assert.equal(result.regions[0].live, "off");
});
test("extractAriaLiveRegions - detects implicit status role", () => {
    const html = `
    <html>
      <body>
        <div role="status">Status message</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = extractAriaLiveRegions($);
    assert.equal(result.count, 1);
    assert.equal(result.regions[0].live, "polite");
    assert.ok(result.regions[0].selector.includes("status"));
});
test("extractAriaLiveRegions - detects implicit alert role", () => {
    const html = `
    <html>
      <body>
        <div role="alert">Warning!</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = extractAriaLiveRegions($);
    assert.equal(result.count, 1);
    assert.equal(result.regions[0].live, "assertive");
});
test("extractAriaLiveRegions - detects implicit log role", () => {
    const html = `
    <html>
      <body>
        <div role="log">Log entries</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = extractAriaLiveRegions($);
    assert.equal(result.count, 1);
    assert.equal(result.regions[0].live, "polite");
});
test("extractAriaLiveRegions - detects aria-relevant attribute", () => {
    const html = `
    <html>
      <body>
        <div aria-live="polite" aria-relevant="additions text">Updates</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = extractAriaLiveRegions($);
    assert.equal(result.count, 1);
    assert.equal(result.regions[0].relevant, "additions text");
});
test("extractAriaLiveRegions - handles multiple regions", () => {
    const html = `
    <html>
      <body>
        <div aria-live="polite">Region 1</div>
        <div role="alert">Region 2</div>
        <div aria-live="assertive" aria-atomic="true">Region 3</div>
        <div role="status">Region 4</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = extractAriaLiveRegions($);
    assert.equal(result.count, 4);
    assert.equal(result.regions.length, 4);
});
test("extractAriaLiveRegions - enforces 50 region cap", () => {
    let html = '<html><body>';
    for (let i = 0; i < 60; i++) {
        html += `<div aria-live="polite">Region ${i}</div>`;
    }
    html += '</body></html>';
    const $ = cheerio.load(html);
    const result = extractAriaLiveRegions($);
    assert.equal(result.count, 50);
    assert.equal(result.regions.length, 50);
});
test("extractAriaLiveRegions - no regions returns zero", () => {
    const html = `
    <html>
      <body>
        <div>Normal content</div>
        <p>No live regions</p>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = extractAriaLiveRegions($);
    assert.equal(result.count, 0);
    assert.equal(result.regions.length, 0);
});
test("extractAriaLiveRegions - ignores duplicate explicit and implicit", () => {
    const html = `
    <html>
      <body>
        <div aria-live="assertive" role="alert">Alert</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = extractAriaLiveRegions($);
    // Should only count once (explicit takes precedence)
    assert.equal(result.count, 1);
});
test("extractAriaLiveRegions - handles nested regions", () => {
    const html = `
    <html>
      <body>
        <div aria-live="polite">
          <div aria-live="assertive">Nested</div>
        </div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = extractAriaLiveRegions($);
    // Both should be detected
    assert.equal(result.count, 2);
});
// =============================================================================
// FOCUS ORDER ANALYSIS (WCAG 2.4.3)
// =============================================================================
test("analyzeFocusOrder - detects no custom tabindex", () => {
    const html = `
    <html>
      <body>
        <a href="/page">Link</a>
        <button>Button</button>
        <input type="text" />
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFocusOrder($);
    assert.equal(result.customTabIndexCount, 0);
    assert.equal(result.negativeTabIndexCount, 0);
    assert.equal(result.positiveTabIndexElements.length, 0);
});
test("analyzeFocusOrder - counts negative tabindex", () => {
    const html = `
    <html>
      <body>
        <div tabindex="-1">Skip target</div>
        <button tabindex="-1">Hidden button</button>
        <span tabindex="-1">Hidden span</span>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFocusOrder($);
    assert.equal(result.customTabIndexCount, 3);
    assert.equal(result.negativeTabIndexCount, 3);
    assert.equal(result.positiveTabIndexElements.length, 0);
});
test("analyzeFocusOrder - flags positive tabindex (anti-pattern)", () => {
    const html = `
    <html>
      <body>
        <div tabindex="1">First</div>
        <div tabindex="2">Second</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFocusOrder($);
    assert.equal(result.customTabIndexCount, 2);
    assert.equal(result.negativeTabIndexCount, 0);
    assert.equal(result.positiveTabIndexElements.length, 2);
    assert.equal(result.positiveTabIndexElements[0].tabindex, 1);
    assert.equal(result.positiveTabIndexElements[1].tabindex, 2);
});
test("analyzeFocusOrder - tabindex 0 is not flagged as positive", () => {
    const html = `
    <html>
      <body>
        <div tabindex="0">Focusable div</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFocusOrder($);
    assert.equal(result.customTabIndexCount, 1);
    assert.equal(result.negativeTabIndexCount, 0);
    assert.equal(result.positiveTabIndexElements.length, 0);
});
test("analyzeFocusOrder - mixed positive and negative", () => {
    const html = `
    <html>
      <body>
        <div tabindex="1">First</div>
        <div tabindex="-1">Hidden</div>
        <div tabindex="2">Second</div>
        <div tabindex="0">Normal</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFocusOrder($);
    assert.equal(result.customTabIndexCount, 4);
    assert.equal(result.negativeTabIndexCount, 1);
    assert.equal(result.positiveTabIndexElements.length, 2);
});
test("analyzeFocusOrder - enforces 100 element cap on positive tracking", () => {
    let html = '<html><body>';
    for (let i = 1; i <= 120; i++) {
        html += `<div tabindex="${i}">Element ${i}</div>`;
    }
    html += '</body></html>';
    const $ = cheerio.load(html);
    const result = analyzeFocusOrder($);
    assert.equal(result.customTabIndexCount, 120);
    assert.equal(result.positiveTabIndexElements.length, 100); // Capped at 100
});
test("analyzeFocusOrder - handles large negative tabindex values", () => {
    const html = `
    <html>
      <body>
        <div tabindex="-999">Very negative</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFocusOrder($);
    assert.equal(result.customTabIndexCount, 1);
    assert.equal(result.negativeTabIndexCount, 1);
});
test("analyzeFocusOrder - handles large positive tabindex values", () => {
    const html = `
    <html>
      <body>
        <div tabindex="32767">Very positive</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFocusOrder($);
    assert.equal(result.customTabIndexCount, 1);
    assert.equal(result.positiveTabIndexElements.length, 1);
    assert.equal(result.positiveTabIndexElements[0].tabindex, 32767);
});
test("analyzeFocusOrder - includes selector in positive elements", () => {
    const html = `
    <html>
      <body>
        <div id="focus-me" tabindex="1">Positive</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFocusOrder($);
    assert.equal(result.positiveTabIndexElements.length, 1);
    assert.ok(result.positiveTabIndexElements[0].selector.includes("focus-me"));
});
// =============================================================================
// FORM AUTOCOMPLETE (WCAG 1.3.5)
// =============================================================================
test("analyzeFormAutocomplete - no forms returns zero", () => {
    const html = `
    <html>
      <body>
        <div>No forms here</div>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.totalForms, 0);
    assert.equal(result.formsWithAutocomplete, 0);
    assert.equal(result.personalDataInputs.length, 0);
});
test("analyzeFormAutocomplete - counts forms", () => {
    const html = `
    <html>
      <body>
        <form>
          <input type="text" name="username" />
        </form>
        <form>
          <input type="text" name="search" />
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.totalForms, 2);
});
test("analyzeFormAutocomplete - detects email input", () => {
    const html = `
    <html>
      <body>
        <form>
          <input type="email" name="email" />
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.personalDataInputs.length, 1);
    assert.equal(result.personalDataInputs[0].type, "email");
    assert.equal(result.personalDataInputs[0].hasAutocomplete, false);
});
test("analyzeFormAutocomplete - detects tel input", () => {
    const html = `
    <html>
      <body>
        <form>
          <input type="tel" name="phone" />
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.personalDataInputs.length, 1);
    assert.equal(result.personalDataInputs[0].type, "tel");
});
test("analyzeFormAutocomplete - detects autocomplete attribute", () => {
    const html = `
    <html>
      <body>
        <form>
          <input type="email" name="email" autocomplete="email" />
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.personalDataInputs[0].hasAutocomplete, true);
    assert.equal(result.personalDataInputs[0].autocompleteValue, "email");
});
test("analyzeFormAutocomplete - detects name fields by name attribute", () => {
    const html = `
    <html>
      <body>
        <form>
          <input type="text" name="full_name" />
          <input type="text" name="first-name" />
          <input type="text" name="lastName" />
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.personalDataInputs.length, 3);
    assert.ok(result.personalDataInputs.some(i => i.type === "name"));
});
test("analyzeFormAutocomplete - detects address fields", () => {
    const html = `
    <html>
      <body>
        <form>
          <input type="text" name="address" />
          <input type="text" name="street" />
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.personalDataInputs.length, 2);
    assert.ok(result.personalDataInputs.every(i => i.type === "address"));
});
test("analyzeFormAutocomplete - detects postal code fields", () => {
    const html = `
    <html>
      <body>
        <form>
          <input type="text" name="postal_code" />
          <input type="text" name="zip" />
          <input type="text" name="zipcode" />
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.personalDataInputs.length, 3);
    assert.ok(result.personalDataInputs.every(i => i.type === "postal"));
});
test("analyzeFormAutocomplete - detects city and country fields", () => {
    const html = `
    <html>
      <body>
        <form>
          <input type="text" name="city" />
          <input type="text" name="country" />
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.personalDataInputs.length, 2);
    assert.ok(result.personalDataInputs.some(i => i.type === "city"));
    assert.ok(result.personalDataInputs.some(i => i.type === "country"));
});
test("analyzeFormAutocomplete - counts forms with autocomplete", () => {
    const html = `
    <html>
      <body>
        <form autocomplete="on">
          <input type="email" name="email" />
        </form>
        <form>
          <input type="text" name="search" />
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.totalForms, 2);
    assert.equal(result.formsWithAutocomplete, 1);
});
test("analyzeFormAutocomplete - handles complex form", () => {
    const html = `
    <html>
      <body>
        <form autocomplete="on">
          <input type="text" name="first_name" autocomplete="given-name" />
          <input type="text" name="last_name" autocomplete="family-name" />
          <input type="email" name="email" autocomplete="email" />
          <input type="tel" name="phone" autocomplete="tel" />
          <input type="text" name="address" autocomplete="street-address" />
          <input type="text" name="city" autocomplete="address-level2" />
          <input type="text" name="postal_code" autocomplete="postal-code" />
          <input type="text" name="country" autocomplete="country-name" />
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.totalForms, 1);
    assert.equal(result.formsWithAutocomplete, 1);
    assert.equal(result.personalDataInputs.length, 8);
    assert.ok(result.personalDataInputs.every(i => i.hasAutocomplete));
});
test("analyzeFormAutocomplete - includes selectors", () => {
    const html = `
    <html>
      <body>
        <form>
          <input type="email" id="user-email" name="email" />
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.personalDataInputs.length, 1);
    assert.ok(result.personalDataInputs[0].selector.includes("user-email"));
});
test("analyzeFormAutocomplete - enforces 100 input cap", () => {
    let html = '<html><body><form>';
    for (let i = 0; i < 120; i++) {
        html += `<input type="email" name="email${i}" />`;
    }
    html += '</form></body></html>';
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.personalDataInputs.length, 100); // Capped at 100
});
test("analyzeFormAutocomplete - ignores non-personal data inputs", () => {
    const html = `
    <html>
      <body>
        <form>
          <input type="text" name="username" />
          <input type="password" name="password" />
          <input type="text" name="search" />
          <input type="number" name="quantity" />
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.totalForms, 1);
    assert.equal(result.personalDataInputs.length, 0);
});
test("analyzeFormAutocomplete - handles forms without inputs", () => {
    const html = `
    <html>
      <body>
        <form>
          <button type="submit">Submit</button>
        </form>
      </body>
    </html>
  `;
    const $ = cheerio.load(html);
    const result = analyzeFormAutocomplete($);
    assert.equal(result.totalForms, 1);
    assert.equal(result.personalDataInputs.length, 0);
});
//# sourceMappingURL=wcagData-static.test.js.map