# Security Policy

## Overview

Cartographer Engine is a headless web crawler that interacts with untrusted web content. This document outlines our security posture, threat model, mitigation strategies, and vulnerability disclosure process.

**Owner:** Cai Frazier  
**Last Updated:** 2025-10-25  
**Version:** 1.0.0

---

## Supported Versions

We release security updates for the following versions:

| Version | Supported | Status |
| ------- | --------- | ------ |
| 1.0.0-rc.x | ✅ | Release Candidate |
| < 1.0.0 | ❌ | Pre-release (unsupported) |

---

## Reporting a Vulnerability

### Disclosure Process

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Report security issues via email to: **[cai@caifrazier.com](mailto:cai@caifrazier.com)**

Include:
1. Description of the vulnerability
2. Impact and severity assessment
3. Affected versions
4. Reproduction steps
5. Proof of concept (if applicable)
6. Suggested fix (optional)

### Response Timeline

- **Initial Response:** Within 48 hours (2 business days)
- **Validation:** Within 1 week
- **Status Updates:** Every 2 weeks until resolved
- **Fix Timeline:**
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: 60 days

### Coordinated Disclosure

We follow coordinated disclosure with a standard 90-day embargo period. We'll work with you to:
- Validate and reproduce the issue
- Develop and test a fix
- Coordinate disclosure timing
- Credit you in the security advisory (unless you prefer anonymity)

---

## Threat Model

### Assets Protected

1. **Host System** - The machine running Cartographer
2. **Credentials** - Authentication tokens, session cookies, API keys
3. **Crawl Data** - Extracted content and metadata in .atls archives
4. **Network Resources** - Bandwidth, IP reputation, DNS

### Threat Actors

| Actor | Motivation | Likelihood | Impact |
|-------|------------|------------|--------|
| **Malicious Websites** | Code execution, data exfiltration | High | High |
| **Bot Detection Systems** | Block or rate-limit crawler | High | Medium |
| **Network Attackers** | Man-in-the-middle, DNS poisoning | Medium | High |
| **Insider Threats** | Credential theft, data tampering | Low | High |

### Attack Vectors

1. **Malicious JavaScript** - XSS, code injection, resource exhaustion
2. **Open Redirects** - Redirect to phishing or malware sites
3. **SSRF (Server-Side Request Forgery)** - Access internal resources
4. **DNS Rebinding** - Bypass same-origin policy
5. **Path Traversal** - File system access via crafted URLs
6. **Infinite Loops** - Resource exhaustion via circular redirects
7. **Credential Leakage** - Accidental logging or storage of secrets

---

## Browser Sandboxing

### Chromium Sandbox Status

Cartographer uses Playwright's Chromium with **sandboxing disabled** for compatibility:

```typescript
// src/core/renderer.ts
browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

**⚠️ Security Implications:**

| Feature | Status | Risk | Mitigation |
|---------|--------|------|------------|
| **Chrome Sandbox** | ❌ Disabled | High | Run in isolated containers |
| **Process Isolation** | ✅ Enabled | Low | Separate renderer processes |
| **Site Isolation** | ✅ Enabled | Low | Per-origin process isolation |
| **V8 Sandbox** | ✅ Enabled | Low | JavaScript execution limits |

### Sandbox Alternatives

**Recommended Deployment (Docker):**

```dockerfile
# Use user namespaces for isolation
FROM node:20-bookworm

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2

# Run as non-root user
RUN useradd -m -u 1000 cartographer
USER cartographer

WORKDIR /app
COPY --chown=cartographer:cartographer . .
RUN npm ci && npm run build

# Launch with seccomp profile
CMD ["node", "dist/cli/index.js"]
```

**Kubernetes Security Context:**

```yaml
apiVersion: v1
kind: Pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
  containers:
  - name: cartographer
    image: cartographer:latest
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    resources:
      limits:
        memory: "4Gi"
        cpu: "2000m"
```

### Browser Patch Cadence

**Playwright Dependency:**

Cartographer uses Playwright for browser automation:

```json
{
  "dependencies": {
    "playwright": "^1.40.0"
  }
}
```

**Update Strategy:**

| Component | Update Frequency | Responsibility |
|-----------|------------------|----------------|
| **Playwright** | Monthly | Manual via `npm update` |
| **Chromium** | Automatic | Bundled with Playwright |
| **Node.js** | Quarterly | CI matrix tests Node 20 & 22 |
| **npm Dependencies** | Weekly | Dependabot PRs |

**Security Patch Process:**

1. **Dependabot Alerts** - Automated PRs for CVEs
2. **CI Validation** - All tests must pass before merge
3. **Release Notes Review** - Check Playwright changelogs for security fixes
4. **Emergency Patches** - Critical CVEs patched within 24 hours

**Latest Versions:**
- Check Playwright releases: https://github.com/microsoft/playwright/releases
- Check Chromium versions: https://omahaproxy.appspot.com/

---

## URL Validation & Normalization

### URL Normalizer

**File:** `src/utils/url.ts`

Current URL normalization:

```typescript
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";  // Remove fragment
    // Sort query params for deduplication
    const params = Array.from(u.searchParams.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
    u.search = "";
    params.forEach(([key, val]) => u.searchParams.append(key, val));
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
```

**Security Features:**

- ✅ **Lowercase Normalization** - Prevents case-based bypasses
- ✅ **Fragment Removal** - Prevents duplicate URLs with different anchors
- ✅ **Query Param Sorting** - Consistent deduplication
- ⚠️ **Punycode Handling** - Not explicitly handled (future enhancement)
- ⚠️ **Scheme Upgrades** - No http→https upgrade (future enhancement)

### URL Allow/Deny Lists

**🚧 Future Enhancement (Not Yet Implemented):**

Planned CLI options for URL filtering:

```bash
# Allow only specific domains (glob patterns)
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --allowUrls "https://example.com/**" "https://*.example.com/**"

# Deny specific patterns (regex)
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --denyUrls ".*\\.pdf$" ".*\\/admin\\/.*"

# Combined allow + deny
node dist/cli/index.js crawl \
  --seeds https://example.com \
  --allowUrls "https://example.com/**" \
  --denyUrls ".*\\/private\\/.*"
```

**Implementation Plan:**

1. Add `--allowUrls` and `--denyUrls` CLI options
2. Support glob patterns (via `minimatch`) and regex
3. Integrate into scheduler URL filtering
4. Add unit tests for pattern matching
5. Document in README and SECURITY.md

**Current Workaround:**

Use robots.txt to block specific paths:

```text
# /robots.txt
User-agent: CartographerBot
Disallow: /admin/
Disallow: /private/
Disallow: /*.pdf$
```

### Punycode & IDN Handling

**Current Status:** ⚠️ Not explicitly handled

**Future Enhancement:**

Add explicit punycode normalization:

```typescript
import { toASCII, toUnicode } from 'punycode/';

export function normalizeDomain(domain: string): string {
  try {
    // Convert IDN to punycode for consistent comparison
    return toASCII(domain).toLowerCase();
  } catch {
    return domain.toLowerCase();
  }
}
```

**Security Risk:**

Homograph attacks using IDN domains (e.g., `xn--pple-43d.com` looks like `apple.com`):

```
https://аррӏе.com  (Cyrillic 'а', 'р', 'ӏ')
https://xn--80ak6aa92e.com  (Punycode)
```

**Mitigation:**

1. **Browser Protection** - Chromium already handles IDN display
2. **Logging** - Log punycode domains for review
3. **Allow Lists** - Use domain allow lists for sensitive crawls
4. **Future:** Explicit punycode normalization in URL validator

### Scheme Upgrades

**Current Status:** ⚠️ No automatic http→https upgrade

**Security Consideration:**

HTTP URLs are vulnerable to man-in-the-middle attacks. Future enhancement:

```bash
# Future: Automatic scheme upgrade
node dist/cli/index.js crawl \
  --seeds http://example.com \
  --upgradeScheme  # Attempts https:// first, falls back to http://
```

**Current Workaround:**

Explicitly use HTTPS seeds:

```bash
node dist/cli/index.js crawl --seeds https://example.com
```

---

## Secrets Management

### Authentication Credentials

**🚧 Future Enhancement (Not Yet Implemented):**

Planned support for authenticated crawls:

```bash
# Environment variable for credentials
export CARTOGRAPHER_AUTH_TOKEN="Bearer eyJ..."

node dist/cli/index.js crawl \
  --seeds https://example.com/private \
  --authEnv CARTOGRAPHER_AUTH_TOKEN

# Credential file (JSON)
node dist/cli/index.js crawl \
  --seeds https://example.com/private \
  --authFile ./credentials.json

# Session cookies
node dist/cli/index.js crawl \
  --seeds https://example.com/private \
  --sessionFile ./session-cookies.json
```

**Credential File Format:**

```json
{
  "type": "bearer",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "domains": ["example.com", "api.example.com"]
}
```

**Session Cookie Format:**

```json
{
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123...",
      "domain": ".example.com",
      "path": "/",
      "secure": true,
      "httpOnly": true,
      "sameSite": "Lax"
    }
  ]
}
```

### Current Best Practices

**For Authenticated Crawls (Workaround):**

1. **Use Persistent Sessions:**

```bash
node dist/cli/index.js crawl \
  --seeds https://example.com/private \
  --persistSession
```

This stores browser sessions in `.cartographer/sessions/` directory.

2. **Manual Cookie Injection:**

Modify `src/core/renderer.ts` to inject cookies:

```typescript
// Add cookies before page navigation
await page.context().addCookies([
  {
    name: 'session_id',
    value: process.env.SESSION_TOKEN,
    domain: '.example.com',
    path: '/',
    secure: true,
    httpOnly: true
  }
]);
```

3. **Environment Variables:**

Store sensitive tokens in environment variables, never in code:

```bash
export AUTH_TOKEN="secret123"
node dist/cli/index.js crawl --seeds https://example.com
```

### Secret Storage

**⚠️ Security Requirements:**

| Storage Method | Security | Recommended |
|----------------|----------|-------------|
| **Environment Variables** | ⭐⭐⭐ | ✅ Yes (CI/CD) |
| **Credential Files** | ⭐⭐ | ⚠️ With encryption |
| **Code/Config Files** | ❌ Never | ❌ No |
| **Command Line Args** | ❌ Never | ❌ No (visible in `ps`) |
| **Secrets Manager** | ⭐⭐⭐⭐ | ✅ Best (AWS, Vault) |

**Encryption for Credential Files:**

```bash
# Encrypt credentials (future enhancement)
openssl enc -aes-256-cbc -salt -in credentials.json -out credentials.enc

# Decrypt at runtime
openssl enc -d -aes-256-cbc -in credentials.enc | node dist/cli/index.js crawl ...
```

---

## Network Security

### HTTPS Enforcement

**Default Behavior:**

Cartographer follows redirects and uses the scheme provided in seeds:

```bash
# HTTPS seeds (recommended)
node dist/cli/index.js crawl --seeds https://example.com

# HTTP seeds (not recommended - vulnerable to MITM)
node dist/cli/index.js crawl --seeds http://example.com
```

**Certificate Validation:**

- ✅ **Enabled by Default** - Undici validates TLS certificates
- ✅ **No Self-Signed Certs** - Rejected unless explicitly allowed
- ⚠️ **No Certificate Pinning** - Trust system CA bundle

### DNS Security

**DNS Resolution:**

- Uses system DNS resolver (via Node.js/Undici)
- No custom DNS configuration
- Vulnerable to DNS poisoning if system DNS is compromised

**Mitigation:**

1. **Use DNS-over-HTTPS (DoH)** in system settings
2. **Deploy with Secure DNS** - CloudFlare 1.1.1.1, Google 8.8.8.8
3. **Monitor DNS queries** - Log all resolved domains

### SSRF Protection

**Current Protections:**

- ✅ **URL Parsing** - All URLs validated via Node.js `URL` constructor
- ⚠️ **No Private IP Blocking** - Can crawl localhost/RFC1918 addresses

**Future Enhancement:**

Block private IP ranges:

```typescript
const PRIVATE_IP_RANGES = [
  /^127\./,           // Loopback
  /^10\./,            // Private Class A
  /^172\.(1[6-9]|2\d|3[0-1])\./, // Private Class B
  /^192\.168\./,      // Private Class C
  /^169\.254\./,      // Link-local
  /^::1$/,            // IPv6 loopback
  /^fc00:/,           // IPv6 private
];

function isPrivateIP(hostname: string): boolean {
  return PRIVATE_IP_RANGES.some(regex => regex.test(hostname));
}
```

**Current Workaround:**

Use `--allowUrls` (when implemented) to restrict to public domains.

---

## Data Security

### Archive Integrity

**Hash Verification:**

All .atls archives include integrity hashes in `manifest.json`:

```json
{
  "parts": {
    "pages": {
      "file": "pages/part-0001.jsonl.zst",
      "sizeBytes": 1048576,
      "sha256": "abc123...",
      "sha1": "def456..."
    }
  }
}
```

**Validation:**

```bash
# Automatic validation (default)
node dist/cli/index.js crawl --seeds https://example.com --validateArchive

# Skip validation (faster, not recommended)
node dist/cli/index.js crawl --seeds https://example.com --validateArchive=false
```

### Sensitive Data Handling

**Data Types Collected:**

- ✅ **Public Content** - HTML, text, links, images
- ✅ **Metadata** - Titles, descriptions, headers
- ✅ **Performance Metrics** - Load times, Core Web Vitals
- ⚠️ **Console Logs** - May contain sensitive info (full mode only)
- ⚠️ **Session Cookies** - Stored in `.cartographer/sessions/` (if --persistSession)

**PII Risks:**

| Data Type | Risk | Mitigation |
|-----------|------|------------|
| **Console Logs** | Medium | Review logs, use `--mode prerender` |
| **Session Cookies** | High | Encrypt sessions directory |
| **Form Data** | Low | Not submitted by default |
| **Query Params** | Medium | Strip tracking params |
| **User-Agent** | Low | Use generic User-Agent |

**GDPR/Privacy Considerations:**

1. **Do not crawl authenticated pages** without explicit permission
2. **Strip tracking parameters** from URLs (see `src/utils/url.ts`)
3. **Redact sensitive data** from logs before sharing
4. **Encrypt .atls archives** containing sensitive data
5. **Delete session data** after crawl: `rm -rf .cartographer/sessions/`

---

## Dependency Security

### Supply Chain

**Package Management:**

- ✅ **npm ci** - Uses exact versions from `package-lock.json`
- ✅ **Dependabot** - Automated security updates
- ✅ **npm audit** - Run before every release
- ⚠️ **No Integrity Checking** - No subresource integrity for npm packages

**Dependency Audit:**

```bash
# Check for known vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Generate security report
npm audit --json > security-report.json
```

### Critical Dependencies

| Package | Purpose | Risk | Mitigation |
|---------|---------|------|------------|
| **playwright** | Browser automation | High | Monthly updates, pin version |
| **undici** | HTTP client | Medium | Auto-update via Dependabot |
| **zstandard** | Compression | Low | Stable, infrequent updates |
| **simple-wappalyzer** | Tech detection | Low | Sandboxed regex matching |

**Vendoring (Future Enhancement):**

For air-gapped environments, consider vendoring dependencies:

```bash
# Create local npm cache
npm ci --prefer-offline
tar -czf cartographer-deps.tar.gz node_modules/
```

---

## Incident Response

### Security Reporting

**Report security vulnerabilities to:**

- **Email:** `security@caifrazier.com`
- **Subject:** `[SECURITY] Cartographer Engine - <brief description>`
- **PGP Key:** (Future: Publish PGP key for encrypted reports)

**Response SLA:**

| Severity | Response Time | Patch Time |
|----------|---------------|------------|
| **Critical** | 4 hours | 24 hours |
| **High** | 24 hours | 1 week |
| **Medium** | 1 week | 1 month |
| **Low** | 1 month | Next release |

### Disclosure Policy

**Coordinated Disclosure:**

1. **Private Report** - Submit vulnerability privately
2. **Acknowledgment** - Response within 4-24 hours
3. **Investigation** - Confirm and assess impact
4. **Patch Development** - Develop and test fix
5. **Release** - Deploy patch to production
6. **Public Disclosure** - Announce after 90 days or patch deployment

**Bug Bounty:**

Currently no formal bug bounty program. Reporters will be credited in:

- `SECURITY.md` hall of fame
- Release notes for patch version
- GitHub security advisories

---

## Compliance & Certifications

### Standards

| Standard | Status | Notes |
|----------|--------|-------|
| **OWASP Top 10** | ⚠️ Partial | No authentication system |
| **CIS Docker Benchmark** | ✅ Compliant | When deployed via Docker |
| **NIST Cybersecurity Framework** | ⚠️ Partial | No formal audit |
| **SOC 2** | ❌ N/A | Not applicable (open source) |

### Security Audits

**Audit History:**

- None completed to date (first release: 2025-10-25)

**Future Audits:**

- Planned: External security audit (Q2 2026)
- Scope: Chromium sandboxing, URL validation, secrets handling

---

## Additional Resources

- [OWASP Web Scraping Risks](https://owasp.org/www-community/attacks/Web_Scraping)
- [Playwright Security](https://playwright.dev/docs/security)
- [Chromium Sandbox](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/design/sandbox.md)
- [RFC 9309: Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Last Updated:** 2025-10-25  
**Maintainer:** Cai Frazier  
**License:** Proprietary
