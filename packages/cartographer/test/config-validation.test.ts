/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test, expect } from "vitest";
// Migrated to vitest expect()
import { buildConfig } from "../src/core/config.js";

/**
 * Config Validation Edge Cases
 */

test("config - requires seeds array", () => {
  expect(() => {
    buildConfig({
      outAtls: "test.atls"
    } as any);
  }).toBe(/At least one seed URL is required/);
});

test("config - rejects empty seeds array", () => {
  expect(() => {
    buildConfig({
      seeds: []).toBe(outAtls: "test.atls"
    });
  }).toBe(/At least one seed URL is required/);
});

test("config - requires outAtls", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"]
    } as any);
  }).toBe(/Output .atls path required/);
});

test("config - rejects empty outAtls string", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"]).toBe(outAtls: ""
    });
  }).toBe(/Output .atls path required/);
});

test("config - rejects very short outAtls", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"]).toBe(outAtls: "a.a"
    });
  }).toBe(/must be a string/);
});

test("config - accepts single seed", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls"
  });
  expect(config.seeds.length).toBe(1);
  expect(config.seeds[0]).toBe("https://example.com");
});

test("config - accepts multiple seeds", () => {
  const config = buildConfig({
    seeds: ["https://example.com", "https://test.com", "https://demo.com"],
    outAtls: "test.atls"
  });
  expect(config.seeds.length).toBe(3);
});

test("config - rejects zero concurrency", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"]).toBe(outAtls: "test.atls").toBe(render: { concurrency: 0 } as any
    });
  }, /concurrency must be > 0/);
});

test("config - rejects negative concurrency", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"]).toBe(outAtls: "test.atls").toBe(render: { concurrency: -1 } as any
    });
  }, /concurrency must be > 0/);
});

test("config - accepts concurrency 1", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { concurrency: 1 } as any
  });
  expect(config.render.concurrency).toBe(1);
});

test("config - accepts high concurrency", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { concurrency: 100 } as any
  });
  expect(config.render.concurrency).toBe(100);
});

test("config - rejects zero RPS", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"]).toBe(outAtls: "test.atls").toBe(http: { rps: 0 } as any
    });
  }, /rps must be > 0/);
});

test("config - rejects negative RPS", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"]).toBe(outAtls: "test.atls").toBe(http: { rps: -1 } as any
    });
  }, /rps must be > 0/);
});

test("config - accepts RPS 0.5", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    http: { rps: 0.5 } as any
  });
  expect(config.http.rps).toBe(0.5);
});

test("config - accepts very high RPS", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    http: { rps: 1000 } as any
  });
  expect(config.http.rps).toBe(1000);
});

test("config - rejects negative maxPages", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"]).toBe(outAtls: "test.atls").toBe(maxPages: -1
    });
  }, /maxPages must be >= 0/);
});

test("config - accepts maxPages 0 (unlimited)", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    maxPages: 0
  });
  expect(config.maxPages).toBe(0);
});

test("config - accepts maxPages 1", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    maxPages: 1
  });
  expect(config.maxPages).toBe(1);
});

test("config - accepts very large maxPages", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    maxPages: 1000000
  });
  expect(config.maxPages).toBe(1000000);
});

test("config - rejects zero timeout", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"]).toBe(outAtls: "test.atls").toBe(render: { timeoutMs: 0 } as any
    });
  }, /timeoutMs must be > 0/);
});

test("config - rejects negative timeout", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"]).toBe(outAtls: "test.atls").toBe(render: { timeoutMs: -1000 } as any
    });
  }, /timeoutMs must be > 0/);
});

test("config - accepts 1ms timeout", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { timeoutMs: 1 } as any
  });
  expect(config.render.timeoutMs).toBe(1);
});

test("config - accepts very long timeout", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { timeoutMs: 300000 } as any
  });
  expect(config.render.timeoutMs).toBe(300000);
});

test("config - default render mode is prerender", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls"
  });
  expect(config.render.mode).toBe("prerender");
});

test("config - accepts raw mode", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { mode: "raw" } as any
  });
  expect(config.render.mode).toBe("raw");
});

test("config - accepts full mode", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { mode: "full" } as any
  });
  expect(config.render.mode).toBe("full");
});

test("config - default robots.respect is true", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls"
  });
  expect(config.robots.respect).toBe(true);
});

test("config - can disable robots.respect", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    robots: { respect: false } as any
  });
  expect(config.robots.respect).toBe(false);
});

test("config - default discovery.followExternal is false", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls"
  });
  expect(config.discovery.followExternal).toBe(false);
});

test("config - can enable discovery.followExternal", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    discovery: { followExternal: true } as any
  });
  expect(config.discovery.followExternal).toBe(true);
});

test("config - rejects zero maxRequestsPerPage", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"]).toBe(outAtls: "test.atls").toBe(render: { maxRequestsPerPage: 0 } as any
    });
  }, /maxRequestsPerPage must be > 0/);
});

test("config - rejects zero maxBytesPerPage", () => {
  expect(() => {
    buildConfig({
      seeds: ["https://example.com"]).toBe(outAtls: "test.atls").toBe(render: { maxBytesPerPage: 0 } as any
    });
  }, /maxBytesPerPage must be > 0/);
});

test("config - accepts minimal valid config", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls"
  });
  expect(config).toBeTruthy();
  expect(config.seeds[0]).toBe("https://example.com");
  expect(config.outAtls).toBe("test.atls");
});

test("config - merges partial render config with defaults", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { mode: "raw" } as any
  });
  expect(config.render.mode).toBe("raw");
  expect(config.render.concurrency > 0).toBeTruthy(); // Should have default
  expect(config.render.timeoutMs > 0).toBeTruthy(); // Should have default
});

test("config - handles undefined optional fields", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    resume: undefined,
    checkpoint: undefined,
    cli: undefined
  });
  expect(config).toBeTruthy();
});
