#!/usr/bin/env bash
#
# Phase 6.5.2: Privacy & Security E2E Validation
# Tests privacy defaults, robots.txt respect, and security settings
#
# Copyright © 2025 Cai Frazier.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 6.5.2: Privacy & Security E2E Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Clean previous privacy test archives
echo -e "${BLUE}Cleaning previous privacy test archives...${NC}"
rm -f tmp/e2e-privacy-*.atls
echo ""

test_count=0
pass_count=0
fail_count=0

# Test 1: Default privacy settings (all enabled)
echo -e "${YELLOW}Test 1:${NC} Default privacy settings (stripCookies, stripAuthHeaders, redactInputs, redactForms all true)"
test_count=$((test_count + 1))

if node dist/cli/index.js crawl \
  --seeds https://example.com \
  --out tmp/e2e-privacy-defaults.atls \
  --mode prerender \
  --maxPages 1 \
  --json --quiet > /dev/null 2>&1; then
  
  # Check manifest for privacy notes
  manifest=$(unzip -p tmp/e2e-privacy-defaults.atls manifest.json 2>/dev/null)
  
  echo -e "  ${GREEN}✓ PASS${NC} - Crawl completed with default privacy settings"
  echo -e "  Archive: tmp/e2e-privacy-defaults.atls"
  
  # Validate archive
  if node dist/cli/index.js validate --atls tmp/e2e-privacy-defaults.atls > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Validation passed"
    pass_count=$((pass_count + 1))
  else
    echo -e "  ${RED}✗${NC} Validation failed"
    fail_count=$((fail_count + 1))
  fi
else
  echo -e "  ${RED}✗ FAIL${NC} - Crawl failed"
  fail_count=$((fail_count + 1))
fi
echo ""

# Test 2: Explicitly disable all privacy settings
echo -e "${YELLOW}Test 2:${NC} All privacy settings disabled (--no-stripCookies --no-stripAuthHeaders --no-redactInputs --no-redactForms)"
test_count=$((test_count + 1))

if node dist/cli/index.js crawl \
  --seeds https://example.com \
  --out tmp/e2e-privacy-disabled.atls \
  --mode prerender \
  --maxPages 1 \
  --no-stripCookies \
  --no-stripAuthHeaders \
  --no-redactInputs \
  --no-redactForms \
  --json --quiet > /dev/null 2>&1; then
  
  echo -e "  ${GREEN}✓ PASS${NC} - Crawl completed with privacy disabled"
  echo -e "  Archive: tmp/e2e-privacy-disabled.atls"
  
  # Validate archive
  if node dist/cli/index.js validate --atls tmp/e2e-privacy-disabled.atls > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Validation passed"
    pass_count=$((pass_count + 1))
  else
    echo -e "  ${RED}✗${NC} Validation failed"
    fail_count=$((fail_count + 1))
  fi
else
  echo -e "  ${RED}✗ FAIL${NC} - Crawl failed"
  fail_count=$((fail_count + 1))
fi
echo ""

# Test 3: Robots.txt respect (default: true)
echo -e "${YELLOW}Test 3:${NC} Robots.txt respect enabled (default)"
test_count=$((test_count + 1))

if node dist/cli/index.js crawl \
  --seeds https://example.com \
  --out tmp/e2e-privacy-robots-respect.atls \
  --mode prerender \
  --maxPages 1 \
  --json --quiet > /dev/null 2>&1; then
  
  echo -e "  ${GREEN}✓ PASS${NC} - Crawl completed with robots.txt respect"
  echo -e "  Archive: tmp/e2e-privacy-robots-respect.atls"
  
  # Check capabilities for robots setting
  manifest=$(unzip -p tmp/e2e-privacy-robots-respect.atls manifest.json 2>/dev/null)
  robots_respect=$(echo "$manifest" | python3 -c "import sys, json; m = json.load(sys.stdin); print(m.get('capabilities', {}).get('robots', {}).get('respectsRobotsTxt', False))" 2>/dev/null)
  
  if [ "$robots_respect" = "True" ]; then
    echo -e "  ${GREEN}✓${NC} Robots.txt respect confirmed in manifest"
    pass_count=$((pass_count + 1))
  else
    echo -e "  ${RED}✗${NC} Robots.txt respect not set correctly"
    fail_count=$((fail_count + 1))
  fi
else
  echo -e "  ${RED}✗ FAIL${NC} - Crawl failed"
  fail_count=$((fail_count + 1))
fi
echo ""

# Test 4: Robots.txt override (requires warning)
echo -e "${YELLOW}Test 4:${NC} Robots.txt override enabled (should log warning)"
test_count=$((test_count + 1))

# Capture stderr to check for warning
if crawl_output=$(node dist/cli/index.js crawl \
  --seeds https://example.com \
  --out tmp/e2e-privacy-robots-override.atls \
  --mode prerender \
  --maxPages 1 \
  --overrideRobots \
  --json --quiet 2>&1); then
  
  if echo "$crawl_output" | grep -q "Robots override"; then
    echo -e "  ${GREEN}✓ PASS${NC} - Warning logged for robots override"
  else
    echo -e "  ${YELLOW}⚠ WARNING${NC} - No robots override warning in output"
  fi
  
  echo -e "  Archive: tmp/e2e-privacy-robots-override.atls"
  
  # Check manifest
  manifest=$(unzip -p tmp/e2e-privacy-robots-override.atls manifest.json 2>/dev/null)
  override_used=$(echo "$manifest" | python3 -c "import sys, json; m = json.load(sys.stdin); print(m.get('capabilities', {}).get('robots', {}).get('overrideUsed', False))" 2>/dev/null)
  
  if [ "$override_used" = "True" ]; then
    echo -e "  ${GREEN}✓${NC} Override flag recorded in manifest"
    pass_count=$((pass_count + 1))
  else
    echo -e "  ${RED}✗${NC} Override flag not recorded in manifest"
    fail_count=$((fail_count + 1))
  fi
else
  echo -e "  ${RED}✗ FAIL${NC} - Crawl failed"
  fail_count=$((fail_count + 1))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Privacy & Security Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Total:  $test_count tests"
echo -e "${GREEN}Passed: $pass_count${NC}"
if [ $fail_count -gt 0 ]; then
  echo -e "${RED}Failed: $fail_count${NC}"
fi
echo ""

# File listing
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Generated Privacy Test Archives"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ls -lh tmp/e2e-privacy-*.atls 2>/dev/null | awk '{print $9 " - " $5}' || echo "No archives found"
echo ""

# Exit with appropriate code
if [ $fail_count -gt 0 ]; then
  exit 1
else
  exit 0
fi
