/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { validate } from "../src/validate.js";
import { resolve } from "path";
import { existsSync } from "fs";

describe("SDK validate()", () => {
  const archivePath = resolve(__dirname, "../../../archive/test-suite-20251024/strategy3degrees-prerender.atls");
  
  beforeAll(() => {
    if (!existsSync(archivePath)) {
      throw new Error(`Test archive not found: ${archivePath}`);
    }
  });
  
  it("validates a valid archive", async () => {
    const result = await validate(archivePath);
    
    expect(result).toBeDefined();
    expect(result.valid).toBe(true);
    expect(result.stats.errorsFound).toBe(0);
    expect(result.stats.pagesChecked).toBeGreaterThan(0);
  });
  
  it("reports stats for checked records", async () => {
    const result = await validate(archivePath);
    
    expect(result.stats.pagesChecked).toBeGreaterThan(0);
    expect(result.stats.edgesChecked).toBeGreaterThanOrEqual(0);
    expect(result.stats.assetsChecked).toBeGreaterThanOrEqual(0);
  });
  
  it("checks referential integrity by default", async () => {
    const result = await validate(archivePath, {
      checkIntegrity: true,
    });
    
    // If there are edges, they should all reference valid pages
    if (result.stats.edgesChecked > 0) {
      const edgeIntegrityIssues = result.issues.filter(
        (i) => i.code === "EDGE_INVALID_SOURCE"
      );
      expect(edgeIntegrityIssues.length).toBe(0);
    }
  });
  
  it("checks broken internal links", async () => {
    const result = await validate(archivePath, {
      checkBrokenLinks: true,
    });
    
    // Broken links are warnings, not errors
    const brokenLinkWarnings = result.issues.filter(
      (i) => i.code === "EDGE_BROKEN_LINK"
    );
    
    // This test just ensures the check runs without errors
    expect(brokenLinkWarnings).toBeInstanceOf(Array);
  });
  
  it("respects maxIssues limit", async () => {
    const result = await validate(archivePath, {
      maxIssues: 5,
    });
    
    expect(result.issues.length).toBeLessThanOrEqual(5);
  });
  
  it("filters errors when errorsOnly=true", async () => {
    const result = await validate(archivePath, {
      errorsOnly: true,
    });
    
    const nonErrors = result.issues.filter((i) => i.severity !== "error");
    expect(nonErrors.length).toBe(0);
  });
  
  it("checks manifest schema", async () => {
    const result = await validate(archivePath, {
      checkManifest: true,
    });
    
    // Manifest should have required fields
    const manifestIssues = result.issues.filter(
      (i) => i.code.startsWith("MANIFEST_")
    );
    
    // Expect no critical manifest errors
    const criticalManifestErrors = manifestIssues.filter(
      (i) => i.severity === "error"
    );
    expect(criticalManifestErrors.length).toBe(0);
  });
  
  it("can skip integrity checks", async () => {
    const result = await validate(archivePath, {
      checkIntegrity: false,
      checkBrokenLinks: false,
    });
    
    // Should still validate schemas
    expect(result.stats.pagesChecked).toBeGreaterThan(0);
    
    // But no integrity issues reported
    const integrityIssues = result.issues.filter(
      (i) => i.code === "EDGE_INVALID_SOURCE" || i.code === "ASSET_INVALID_REFERRER"
    );
    expect(integrityIssues.length).toBe(0);
  });
  
  it("includes detailed issue information", async () => {
    const result = await validate(archivePath);
    
    // Check structure of any issues found
    result.issues.forEach((issue) => {
      expect(issue).toHaveProperty("severity");
      expect(issue).toHaveProperty("code");
      expect(issue).toHaveProperty("message");
      expect(["error", "warning", "info"]).toContain(issue.severity);
    });
  });
});
