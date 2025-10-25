/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()
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
  expect(result).toBe("https://example.com/Path?a=1&b=2");
});

test("normalizeUrlEnhanced - fragment removal", () => {
  const result = normalizeUrlEnhanced("https://example.com/page#section", {
    removeFragment: true
  });
  expect(!result.includes("#section")).toBeTruthy();
});

test("normalizeUrlEnhanced - query param sorting", () => {
  const result = normalizeUrlEnhanced("https://example.com/?z=3&a=1&m=2", {
    sortQueryParams: true
  });
  expect(result).toBe("https://example.com/?a=1&m=2&z=3");
});

test("normalizeUrlEnhanced - scheme upgrade", () => {
  const result = normalizeUrlEnhanced("http://example.com/page", {
    upgradeScheme: true
  });
  expect(result).toBe("https://example.com/page");
});

test("normalizeUrlEnhanced - punycode conversion", () => {
  // Unicode domain (IDN)
  const result = normalizeUrlEnhanced("https://münchen.de/path", {
    punycodeDomains: true
  });
  expect(result.includes("xn--")).toBeTruthy();
});

test("normalizeUrlEnhanced - trailing slash normalization", () => {
  const result = normalizeUrlEnhanced("https://example.com/blog", {
    normalizeTrailingSlash: true
  });
  expect(result).toBe("https://example.com/blog/");
});

test("normalizeUrlEnhanced - lowercase path", () => {
  const result = normalizeUrlEnhanced("https://example.com/Path/TO/Page", {
    lowercasePath: true
  });
  expect(result).toBe("https://example.com/path/to/page");
});

test("normalizeUrlEnhanced - preserve path case by default", () => {
  const result = normalizeUrlEnhanced("https://example.com/CaseSensitive");
  expect(result).toBe("https://example.com/CaseSensitive");
});

test("normalizeUrlEnhanced - combined options", () => {
  const result = normalizeUrlEnhanced("http://Example.COM/Path?c=3&a=1#frag", {
    upgradeScheme: true,
    removeFragment: true,
    sortQueryParams: true,
    lowercaseDomain: true,
    lowercasePath: false
  });
  expect(result).toBe("https://example.com/Path?a=1&c=3");
});

test("isIDN - detects non-ASCII domains", () => {
  expect(isIDN("münchen.de")).toBe(true);
  expect(isIDN("example.com")).toBe(false);
  expect(isIDN("xn--mnchen-3ya.de")).toBe(false); // Already punycode
});

test("isIDN - detects various unicode scripts", () => {
  expect(isIDN("中国.com")).toBe(true); // Chinese
  expect(isIDN("日本.jp")).toBe(true); // Japanese
  expect(isIDN("한국.kr")).toBe(true); // Korean
  expect(isIDN("مصر.com")).toBe(true); // Arabic
  expect(isIDN("россия.ru")).toBe(true); // Cyrillic
});

test("punycodeToUnicode - converts punycode to Unicode", () => {
  const result = punycodeToUnicode("xn--mnchen-3ya.de");
  expect(result).toBe("münchen.de");
});

test("unicodeToPunycode - converts Unicode to punycode", () => {
  const result = unicodeToPunycode("münchen.de");
  expect(result).toBe("xn--mnchen-3ya.de");
});

test("unicodeToPunycode - roundtrip conversion", () => {
  const original = "москва.ru"; // Russian
  const punycode = unicodeToPunycode(original);
  const decoded = punycodeToUnicode(punycode);
  expect(decoded).toBe(original);
});

test("isPrivateIP - detects localhost", () => {
  expect(isPrivateIP("http://localhost/path")).toBe(true);
  expect(isPrivateIP("https://localhost:8080/")).toBe(true);
});

test("isPrivateIP - detects 127.0.0.0/8 loopback", () => {
  expect(isPrivateIP("http://127.0.0.1/")).toBe(true);
  expect(isPrivateIP("http://127.1.2.3/")).toBe(true);
  expect(isPrivateIP("http://127.255.255.255/")).toBe(true);
});

test("isPrivateIP - detects 10.0.0.0/8 private range", () => {
  expect(isPrivateIP("http://10.0.0.1/")).toBe(true);
  expect(isPrivateIP("http://10.255.255.255/")).toBe(true);
  expect(isPrivateIP("http://10.1.2.3/path")).toBe(true);
});

test("isPrivateIP - detects 172.16.0.0/12 private range", () => {
  expect(isPrivateIP("http://172.16.0.1/")).toBe(true);
  expect(isPrivateIP("http://172.31.255.255/")).toBe(true);
  expect(isPrivateIP("http://172.20.0.1/")).toBe(true);
});

test("isPrivateIP - detects 192.168.0.0/16 private range", () => {
  expect(isPrivateIP("http://192.168.0.1/")).toBe(true);
  expect(isPrivateIP("http://192.168.1.1/")).toBe(true);
  expect(isPrivateIP("http://192.168.255.255/")).toBe(true);
});

test("isPrivateIP - detects 169.254.0.0/16 link-local", () => {
  expect(isPrivateIP("http://169.254.0.1/")).toBe(true);
  expect(isPrivateIP("http://169.254.169.254/")).toBe(true); // AWS metadata
});

test("isPrivateIP - detects IPv6 private ranges", () => {
  expect(isPrivateIP("http://[::1]/")).toBe(true); // Loopback
  expect(isPrivateIP("http://[fe80::1]/")).toBe(true); // Link-local
  expect(isPrivateIP("http://[fc00::1]/")).toBe(true); // Unique local
  expect(isPrivateIP("http://[fd00::1]/")).toBe(true); // Unique local
});

test("isPrivateIP - allows public IPs", () => {
  expect(isPrivateIP("http://8.8.8.8/")).toBe(false); // Google DNS
  expect(isPrivateIP("http://1.1.1.1/")).toBe(false); // Cloudflare DNS
  expect(isPrivateIP("http://93.184.216.34/")).toBe(false); // example.com
  expect(isPrivateIP("https://example.com/")).toBe(false);
});

test("isPrivateIP - edge cases", () => {
  expect(isPrivateIP("http://0.0.0.0/")).toBe(true); // Invalid/default route
  expect(isPrivateIP("http://255.255.255.255/")).toBe(true); // Broadcast
  expect(isPrivateIP("invalid-url")).toBe(false); // Invalid URL returns false
});

test("isHomographAttack - detects Cyrillic lookalikes", () => {
  // "аррӏе.com" uses Cyrillic 'а', 'р', 'ӏ' that look like Latin 'a', 'p', 'l'
  expect(isHomographAttack("https://аррӏе.com")).toBe(true);
});

test("isHomographAttack - detects Greek lookalikes", () => {
  // Greek characters that resemble Latin
  expect(isHomographAttack("https://αpple.com")).toBe(true); // Greek alpha
  expect(isHomographAttack("https://gοοgle.com")).toBe(true); // Greek omicron
});

test("isHomographAttack - detects mixed script attacks", () => {
  // Mix of Latin and Cyrillic (suspicious)
  expect(isHomographAttack("https://gооgle.com")).toBe(true); // Cyrillic 'о'
  expect(isHomographAttack("https://microsоft.com")).toBe(true); // Cyrillic 'о'
});

test("isHomographAttack - allows legitimate Latin domains", () => {
  expect(isHomographAttack("https://apple.com")).toBe(false);
  expect(isHomographAttack("https://google.com")).toBe(false);
  expect(isHomographAttack("https://microsoft.com")).toBe(false);
  expect(isHomographAttack("https://example.com")).toBe(false);
});

test("isHomographAttack - allows legitimate Unicode domains", () => {
  // Legitimate non-Latin domains (all same script)
  expect(isHomographAttack("https://münchen.de")).toBe(false); // German umlaut
  expect(isHomographAttack("https://café.fr")).toBe(false); // French accent
});

test("normalizeUrlEnhanced - handles invalid URLs gracefully", () => {
  const result = normalizeUrlEnhanced("not-a-valid-url");
  expect(result).toBe("not-a-valid-url"); // Returns lowercase original
});

test("normalizeUrlEnhanced - preserves port numbers", () => {
  const result = normalizeUrlEnhanced("https://example.com:8443/path");
  expect(result.includes(":8443")).toBeTruthy();
});

test("normalizeUrlEnhanced - handles empty query params", () => {
  const result = normalizeUrlEnhanced("https://example.com/path?");
  expect(result).toBe("https://example.com/path");
});

test("normalizeUrlEnhanced - handles duplicate query params", () => {
  const result = normalizeUrlEnhanced("https://example.com/?a=1&a=2");
  expect(result.includes("a=1")).toBeTruthy();
  expect(result.includes("a=2")).toBeTruthy();
});

test("normalizeUrlEnhanced - handles encoded characters", () => {
  const result = normalizeUrlEnhanced("https://example.com/path%20with%20spaces");
  expect(result.includes("%20")).toBeTruthy();
});

test("isPrivateIP - handles URLs with authentication", () => {
  expect(isPrivateIP("http://user:pass@127.0.0.1/")).toBe(true);
  expect(isPrivateIP("http://user:pass@example.com/")).toBe(false);
});

test("normalizeUrlEnhanced - handles subdomains", () => {
  const result = normalizeUrlEnhanced("https://subdomain.Example.COM/path");
  expect(result).toBe("https://subdomain.example.com/path");
});

test("normalizeUrlEnhanced - handles www prefix", () => {
  const result = normalizeUrlEnhanced("https://www.example.com/path");
  expect(result.includes("www.example.com")).toBeTruthy();
});

test("unicodeToPunycode - handles domains with hyphens", () => {
  const result = unicodeToPunycode("my-domain.com");
  expect(result).toBe("my-domain.com"); // No conversion needed
});

test("isPrivateIP - handles IPv6 with zone ID", () => {
  expect(isPrivateIP("http://[fe80::1%eth0]/")).toBe(true);
});

test("normalizeUrlEnhanced - handles data URLs", () => {
  const dataUrl = "data:text/html,<h1>Hello</h1>";
  const result = normalizeUrlEnhanced(dataUrl);
  expect(result.startsWith("data:")).toBeTruthy();
});

test("normalizeUrlEnhanced - handles blob URLs", () => {
  const blobUrl = "blob:https://example.com/550e8400-e29b-41d4-a716-446655440000";
  const result = normalizeUrlEnhanced(blobUrl);
  expect(result.startsWith("blob:")).toBeTruthy();
});

test("isPrivateIP - handles file URLs", () => {
  const result = isPrivateIP("file:///path/to/file.html");
  // file:// URLs have no hostname, should return false
  expect(result).toBe(false);
});
