/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { extractAccessibility } from "../src/core/extractors/accessibility.js";
test("should count missing alt attributes", () => {
    const html = `
    <html>
      <body>
        <img src="logo.png" alt="Company Logo">
        <img src="banner.jpg">
        <img src="photo.png" alt="">
      </body>
    </html>
  `;
    const result = extractAccessibility({
        domSource: "raw",
        html,
        baseUrl: "https://example.com",
        renderMode: "raw"
    });
    assert.equal(result.missingAltCount, 2); // banner.jpg and photo.png (empty alt)
    assert.equal(result.missingAltSources?.length, 2);
});
test("should build heading order", () => {
    const html = `
    <html>
      <body>
        <h1>Title</h1>
        <h2>Subtitle</h2>
        <h3>Section</h3>
        <h2>Another Subtitle</h2>
      </body>
    </html>
  `;
    const result = extractAccessibility({
        domSource: "raw",
        html,
        baseUrl: "https://example.com",
        renderMode: "raw"
    });
    assert.deepEqual(result.headingOrder, ["H1", "H2", "H3", "H2"]);
});
test("should detect landmarks", () => {
    const html = `
    <html>
      <body>
        <header>Header</header>
        <nav>Nav</nav>
        <main>Main Content</main>
        <footer>Footer</footer>
      </body>
    </html>
  `;
    const result = extractAccessibility({
        domSource: "raw",
        html,
        baseUrl: "https://example.com",
        renderMode: "raw"
    });
    assert.equal(result.landmarks.header, true);
    assert.equal(result.landmarks.nav, true);
    assert.equal(result.landmarks.main, true);
    assert.equal(result.landmarks.aside, false);
    assert.equal(result.landmarks.footer, true);
});
test("should count ARIA roles", () => {
    const html = `
    <html>
      <body>
        <div role="button">Click me</div>
        <div role="button">Click me too</div>
        <div role="alert">Warning!</div>
      </body>
    </html>
  `;
    const result = extractAccessibility({
        domSource: "raw",
        html,
        baseUrl: "https://example.com",
        renderMode: "raw"
    });
    assert.equal(result.roles["button"], 2);
    assert.equal(result.roles["alert"], 1);
});
test("should not include contrastViolations in raw mode", () => {
    const html = `
    <html>
      <body>
        <p style="color: #000; background: #fff;">Text</p>
      </body>
    </html>
  `;
    const result = extractAccessibility({
        domSource: "raw",
        html,
        baseUrl: "https://example.com",
        renderMode: "raw"
    });
    assert.equal(result.contrastViolations, undefined);
});
//# sourceMappingURL=accessibility-extractor.test.js.map