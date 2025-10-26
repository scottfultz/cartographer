/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { test } from "node:test";
import assert from "node:assert";
import { buildConfig } from "../src/core/config.js";

/**
 * Config Validation Edge Cases
 */

test("config - requires seeds array", () => {
  assert.throws(() => {
    buildConfig({
      outAtls: "test.atls"
    } as any);
  }, /At least one seed URL is required/);
});

test("config - rejects empty seeds array", () => {
  assert.throws(() => {
    buildConfig({
      seeds: [],
      outAtls: "test.atls"
    });
  }, /At least one seed URL is required/);
});

test("config - requires outAtls", () => {
  assert.throws(() => {
    buildConfig({
      seeds: ["https://example.com"]
    } as any);
  }, /Output .atls path required/);
});

test("config - rejects empty outAtls string", () => {
  assert.throws(() => {
    buildConfig({
      seeds: ["https://example.com"],
      outAtls: ""
    });
  }, /Output .atls path required/);
});

test("config - rejects very short outAtls", () => {
  assert.throws(() => {
    buildConfig({
      seeds: ["https://example.com"],
      outAtls: "a.a"
    });
  }, /must be a string/);
});

test("config - accepts single seed", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls"
  });
  assert.strictEqual(config.seeds.length, 1);
  assert.strictEqual(config.seeds[0], "https://example.com");
});

test("config - accepts multiple seeds", () => {
  const config = buildConfig({
    seeds: ["https://example.com", "https://test.com", "https://demo.com"],
    outAtls: "test.atls"
  });
  assert.strictEqual(config.seeds.length, 3);
});

test("config - rejects zero concurrency", () => {
  assert.throws(() => {
    buildConfig({
      seeds: ["https://example.com"],
      outAtls: "test.atls",
      render: { concurrency: 0 } as any
    });
  }, /concurrency must be > 0/);
});

test("config - rejects negative concurrency", () => {
  assert.throws(() => {
    buildConfig({
      seeds: ["https://example.com"],
      outAtls: "test.atls",
      render: { concurrency: -1 } as any
    });
  }, /concurrency must be > 0/);
});

test("config - accepts concurrency 1", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { concurrency: 1 } as any
  });
  assert.strictEqual(config.render.concurrency, 1);
});

test("config - accepts high concurrency", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { concurrency: 100 } as any
  });
  assert.strictEqual(config.render.concurrency, 100);
});

test("config - rejects zero RPS", () => {
  assert.throws(() => {
    buildConfig({
      seeds: ["https://example.com"],
      outAtls: "test.atls",
      http: { rps: 0 } as any
    });
  }, /rps must be > 0/);
});

test("config - rejects negative RPS", () => {
  assert.throws(() => {
    buildConfig({
      seeds: ["https://example.com"],
      outAtls: "test.atls",
      http: { rps: -1 } as any
    });
  }, /rps must be > 0/);
});

test("config - accepts RPS 0.5", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    http: { rps: 0.5 } as any
  });
  assert.strictEqual(config.http.rps, 0.5);
});

test("config - accepts very high RPS", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    http: { rps: 1000 } as any
  });
  assert.strictEqual(config.http.rps, 1000);
});

test("config - rejects negative maxPages", () => {
  assert.throws(() => {
    buildConfig({
      seeds: ["https://example.com"],
      outAtls: "test.atls",
      maxPages: -1
    });
  }, /maxPages must be >= 0/);
});

test("config - accepts maxPages 0 (unlimited)", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    maxPages: 0
  });
  assert.strictEqual(config.maxPages, 0);
});

test("config - accepts maxPages 1", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    maxPages: 1
  });
  assert.strictEqual(config.maxPages, 1);
});

test("config - accepts very large maxPages", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    maxPages: 1000000
  });
  assert.strictEqual(config.maxPages, 1000000);
});

test("config - rejects zero timeout", () => {
  assert.throws(() => {
    buildConfig({
      seeds: ["https://example.com"],
      outAtls: "test.atls",
      render: { timeoutMs: 0 } as any
    });
  }, /timeoutMs must be > 0/);
});

test("config - rejects negative timeout", () => {
  assert.throws(() => {
    buildConfig({
      seeds: ["https://example.com"],
      outAtls: "test.atls",
      render: { timeoutMs: -1000 } as any
    });
  }, /timeoutMs must be > 0/);
});

test("config - accepts 1ms timeout", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { timeoutMs: 1 } as any
  });
  assert.strictEqual(config.render.timeoutMs, 1);
});

test("config - accepts very long timeout", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { timeoutMs: 300000 } as any
  });
  assert.strictEqual(config.render.timeoutMs, 300000);
});

test("config - default render mode is prerender", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls"
  });
  assert.strictEqual(config.render.mode, "prerender");
});

test("config - accepts raw mode", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { mode: "raw" } as any
  });
  assert.strictEqual(config.render.mode, "raw");
});

test("config - accepts full mode", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { mode: "full" } as any
  });
  assert.strictEqual(config.render.mode, "full");
});

test("config - default robots.respect is true", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls"
  });
  assert.strictEqual(config.robots.respect, true);
});

test("config - can disable robots.respect", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    robots: { respect: false } as any
  });
  assert.strictEqual(config.robots.respect, false);
});

test("config - default discovery.followExternal is false", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls"
  });
  assert.strictEqual(config.discovery.followExternal, false);
});

test("config - can enable discovery.followExternal", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    discovery: { followExternal: true } as any
  });
  assert.strictEqual(config.discovery.followExternal, true);
});

test("config - rejects zero maxRequestsPerPage", () => {
  assert.throws(() => {
    buildConfig({
      seeds: ["https://example.com"],
      outAtls: "test.atls",
      render: { maxRequestsPerPage: 0 } as any
    });
  }, /maxRequestsPerPage must be > 0/);
});

test("config - rejects zero maxBytesPerPage", () => {
  assert.throws(() => {
    buildConfig({
      seeds: ["https://example.com"],
      outAtls: "test.atls",
      render: { maxBytesPerPage: 0 } as any
    });
  }, /maxBytesPerPage must be > 0/);
});

test("config - accepts minimal valid config", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls"
  });
  assert.ok(config);
  assert.strictEqual(config.seeds[0], "https://example.com");
  assert.strictEqual(config.outAtls, "test.atls");
});

test("config - merges partial render config with defaults", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    render: { mode: "raw" } as any
  });
  assert.strictEqual(config.render.mode, "raw");
  assert.ok(config.render.concurrency > 0); // Should have default
  assert.ok(config.render.timeoutMs > 0); // Should have default
});

test("config - handles undefined optional fields", () => {
  const config = buildConfig({
    seeds: ["https://example.com"],
    outAtls: "test.atls",
    resume: undefined,
    checkpoint: undefined,
    cli: undefined
  });
  assert.ok(config);
});
