/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test } from "node:test";
import assert from "node:assert";
import {
  normalizeUrlEnhanced,
  isIDN,
  punycodeToUnicode,
  unicodeToPunycode,
  isPrivateIP,
  isHomographAttack
} from "../src/utils/urlNormalizer.js";

test("normalizeUrlEnhanced - basic normalization", () => {
  const result = normalizeUrlEnhanced("https://Example.COM/Path?b=2&a=1#frag");
  assert.strictEqual(result, "https://example.com/Path?a=1&b=2");
});

test("normalizeUrlEnhanced - fragment removal", () => {
  const result = normalizeUrlEnhanced("https://example.com/page#section", {
    removeFragment: true
  });
  assert.ok(!result.includes("#section"));
});

test("normalizeUrlEnhanced - query param sorting", () => {
  const result = normalizeUrlEnhanced("https://example.com/?z=3&a=1&m=2", {
    sortQueryParams: true
  });
  assert.strictEqual(result, "https://example.com/?a=1&m=2&z=3");
});

test("normalizeUrlEnhanced - scheme upgrade", () => {
  const result = normalizeUrlEnhanced("http://example.com/page", {
    upgradeScheme: true
  });
  assert.strictEqual(result, "https://example.com/page");
});

test("normalizeUrlEnhanced - punycode conversion", () => {
  // Unicode domain (IDN)
  const result = normalizeUrlEnhanced("https://münchen.de/path", {
    punycodeDomains: true
  });
  assert.ok(result.includes("xn--"));
});

test("normalizeUrlEnhanced - trailing slash normalization", () => {
  const result = normalizeUrlEnhanced("https://example.com/blog", {
    normalizeTrailingSlash: true
  });
  assert.strictEqual(result, "https://example.com/blog/");
});

test("normalizeUrlEnhanced - lowercase path", () => {
  const result = normalizeUrlEnhanced("https://example.com/Path/TO/Page", {
    lowercasePath: true
  });
  assert.strictEqual(result, "https://example.com/path/to/page");
});

test("normalizeUrlEnhanced - preserve path case by default", () => {
  const result = normalizeUrlEnhanced("https://example.com/CaseSensitive");
  assert.strictEqual(result, "https://example.com/CaseSensitive");
});

test("normalizeUrlEnhanced - combined options", () => {
  const result = normalizeUrlEnhanced("http://Example.COM/Path?c=3&a=1#frag", {
    upgradeScheme: true,
    removeFragment: true,
    sortQueryParams: true,
    lowercaseDomain: true,
    lowercasePath: false
  });
  assert.strictEqual(result, "https://example.com/Path?a=1&c=3");
});

test("isIDN - detects non-ASCII domains", () => {
  assert.strictEqual(isIDN("münchen.de"), true);
  assert.strictEqual(isIDN("example.com"), false);
  assert.strictEqual(isIDN("xn--mnchen-3ya.de"), false); // Already punycode
});

test("isIDN - detects various unicode scripts", () => {
  assert.strictEqual(isIDN("中国.com"), true); // Chinese
  assert.strictEqual(isIDN("日本.jp"), true); // Japanese
  assert.strictEqual(isIDN("한국.kr"), true); // Korean
  assert.strictEqual(isIDN("مصر.com"), true); // Arabic
  assert.strictEqual(isIDN("россия.ru"), true); // Cyrillic
});

test("punycodeToUnicode - converts punycode to Unicode", () => {
  const result = punycodeToUnicode("xn--mnchen-3ya.de");
  assert.strictEqual(result, "münchen.de");
});

test("unicodeToPunycode - converts Unicode to punycode", () => {
  const result = unicodeToPunycode("münchen.de");
  assert.strictEqual(result, "xn--mnchen-3ya.de");
});

test("unicodeToPunycode - roundtrip conversion", () => {
  const original = "москва.ru"; // Russian
  const punycode = unicodeToPunycode(original);
  const decoded = punycodeToUnicode(punycode);
  assert.strictEqual(decoded, original);
});

test("isPrivateIP - detects localhost", () => {
  assert.strictEqual(isPrivateIP("http://localhost/path"), true);
  assert.strictEqual(isPrivateIP("https://localhost:8080/"), true);
});

test("isPrivateIP - detects 127.0.0.0/8 loopback", () => {
  assert.strictEqual(isPrivateIP("http://127.0.0.1/"), true);
  assert.strictEqual(isPrivateIP("http://127.1.2.3/"), true);
  assert.strictEqual(isPrivateIP("http://127.255.255.255/"), true);
});

test("isPrivateIP - detects 10.0.0.0/8 private range", () => {
  assert.strictEqual(isPrivateIP("http://10.0.0.1/"), true);
  assert.strictEqual(isPrivateIP("http://10.255.255.255/"), true);
  assert.strictEqual(isPrivateIP("http://10.1.2.3/path"), true);
});

test("isPrivateIP - detects 172.16.0.0/12 private range", () => {
  assert.strictEqual(isPrivateIP("http://172.16.0.1/"), true);
  assert.strictEqual(isPrivateIP("http://172.31.255.255/"), true);
  assert.strictEqual(isPrivateIP("http://172.20.0.1/"), true);
});

test("isPrivateIP - detects 192.168.0.0/16 private range", () => {
  assert.strictEqual(isPrivateIP("http://192.168.0.1/"), true);
  assert.strictEqual(isPrivateIP("http://192.168.1.1/"), true);
  assert.strictEqual(isPrivateIP("http://192.168.255.255/"), true);
});

test("isPrivateIP - detects 169.254.0.0/16 link-local", () => {
  assert.strictEqual(isPrivateIP("http://169.254.0.1/"), true);
  assert.strictEqual(isPrivateIP("http://169.254.169.254/"), true); // AWS metadata
});

test("isPrivateIP - detects IPv6 private ranges", () => {
  assert.strictEqual(isPrivateIP("http://[::1]/"), true); // Loopback
  assert.strictEqual(isPrivateIP("http://[fe80::1]/"), true); // Link-local
  assert.strictEqual(isPrivateIP("http://[fc00::1]/"), true); // Unique local
  assert.strictEqual(isPrivateIP("http://[fd00::1]/"), true); // Unique local
});

test("isPrivateIP - allows public IPs", () => {
  assert.strictEqual(isPrivateIP("http://8.8.8.8/"), false); // Google DNS
  assert.strictEqual(isPrivateIP("http://1.1.1.1/"), false); // Cloudflare DNS
  assert.strictEqual(isPrivateIP("http://93.184.216.34/"), false); // example.com
  assert.strictEqual(isPrivateIP("https://example.com/"), false);
});

test("isPrivateIP - edge cases", () => {
  assert.strictEqual(isPrivateIP("http://0.0.0.0/"), true); // Invalid/default route
  assert.strictEqual(isPrivateIP("http://255.255.255.255/"), true); // Broadcast
  assert.strictEqual(isPrivateIP("invalid-url"), false); // Invalid URL returns false
});

test("isHomographAttack - detects Cyrillic lookalikes", () => {
  // "аррӏе.com" uses Cyrillic 'а', 'р', 'ӏ' that look like Latin 'a', 'p', 'l'
  assert.strictEqual(isHomographAttack("https://аррӏе.com"), true);
});

test("isHomographAttack - detects Greek lookalikes", () => {
  // Greek characters that resemble Latin
  assert.strictEqual(isHomographAttack("https://αpple.com"), true); // Greek alpha
  assert.strictEqual(isHomographAttack("https://gοοgle.com"), true); // Greek omicron
});

test("isHomographAttack - detects mixed script attacks", () => {
  // Mix of Latin and Cyrillic (suspicious)
  assert.strictEqual(isHomographAttack("https://gооgle.com"), true); // Cyrillic 'о'
  assert.strictEqual(isHomographAttack("https://microsоft.com"), true); // Cyrillic 'о'
});

test("isHomographAttack - allows legitimate Latin domains", () => {
  assert.strictEqual(isHomographAttack("https://apple.com"), false);
  assert.strictEqual(isHomographAttack("https://google.com"), false);
  assert.strictEqual(isHomographAttack("https://microsoft.com"), false);
  assert.strictEqual(isHomographAttack("https://example.com"), false);
});

test("isHomographAttack - allows legitimate Unicode domains", () => {
  // Legitimate non-Latin domains (all same script)
  assert.strictEqual(isHomographAttack("https://münchen.de"), false); // German umlaut
  assert.strictEqual(isHomographAttack("https://café.fr"), false); // French accent
});

test("normalizeUrlEnhanced - handles invalid URLs gracefully", () => {
  const result = normalizeUrlEnhanced("not-a-valid-url");
  assert.strictEqual(result, "not-a-valid-url"); // Returns lowercase original
});

test("normalizeUrlEnhanced - preserves port numbers", () => {
  const result = normalizeUrlEnhanced("https://example.com:8443/path");
  assert.ok(result.includes(":8443"));
});

test("normalizeUrlEnhanced - handles empty query params", () => {
  const result = normalizeUrlEnhanced("https://example.com/path?");
  assert.strictEqual(result, "https://example.com/path");
});

test("normalizeUrlEnhanced - handles duplicate query params", () => {
  const result = normalizeUrlEnhanced("https://example.com/?a=1&a=2");
  assert.ok(result.includes("a=1"));
  assert.ok(result.includes("a=2"));
});

test("normalizeUrlEnhanced - handles encoded characters", () => {
  const result = normalizeUrlEnhanced("https://example.com/path%20with%20spaces");
  assert.ok(result.includes("%20"));
});

test("isPrivateIP - handles URLs with authentication", () => {
  assert.strictEqual(isPrivateIP("http://user:pass@127.0.0.1/"), true);
  assert.strictEqual(isPrivateIP("http://user:pass@example.com/"), false);
});

test("normalizeUrlEnhanced - handles subdomains", () => {
  const result = normalizeUrlEnhanced("https://subdomain.Example.COM/path");
  assert.strictEqual(result, "https://subdomain.example.com/path");
});

test("normalizeUrlEnhanced - handles www prefix", () => {
  const result = normalizeUrlEnhanced("https://www.example.com/path");
  assert.ok(result.includes("www.example.com"));
});

test("unicodeToPunycode - handles domains with hyphens", () => {
  const result = unicodeToPunycode("my-domain.com");
  assert.strictEqual(result, "my-domain.com"); // No conversion needed
});

test("isPrivateIP - handles IPv6 with zone ID", () => {
  assert.strictEqual(isPrivateIP("http://[fe80::1%eth0]/"), true);
});

test("normalizeUrlEnhanced - handles data URLs", () => {
  const dataUrl = "data:text/html,<h1>Hello</h1>";
  const result = normalizeUrlEnhanced(dataUrl);
  assert.ok(result.startsWith("data:"));
});

test("normalizeUrlEnhanced - handles blob URLs", () => {
  const blobUrl = "blob:https://example.com/550e8400-e29b-41d4-a716-446655440000";
  const result = normalizeUrlEnhanced(blobUrl);
  assert.ok(result.startsWith("blob:"));
});

test("isPrivateIP - handles file URLs", () => {
  const result = isPrivateIP("file:///path/to/file.html");
  // file:// URLs have no hostname, should return false
  assert.strictEqual(result, false);
});
