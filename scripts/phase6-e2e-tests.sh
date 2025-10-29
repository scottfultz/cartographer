#!/usr/bin/env bash
#
# Phase 6.5 E2E Validation Test Suite
# Tests all combinations of profiles, replay tiers, and privacy settings
#
# Copyright © 2025 Cai Frazier.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 6.5: Comprehensive E2E Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Clean previous E2E test archives
echo -e "${BLUE}Cleaning previous E2E test archives...${NC}"
rm -f tmp/e2e-*.atls
echo ""

# Test matrix
declare -a tests=(
  "prerender:html:Pre render mode + HTML replay tier"
  "prerender:html+css:Prerender mode + HTML+CSS replay tier (default)"
  "prerender:full:Prerender mode + Full replay tier"
  "full:html:Full mode + HTML replay tier"
  "full:html+css:Full mode + HTML+CSS replay tier"
  "full:full:Full mode + Full replay tier (maximum data)"
  "raw:html:Raw mode + HTML replay tier (minimal processing)"
)

test_count=0
pass_count=0
fail_count=0

for test_spec in "${tests[@]}"; do
  IFS=':' read -r mode tier description <<< "$test_spec"
  test_count=$((test_count + 1))
  
  archive_name="tmp/e2e-${mode}-${tier/+/}.atls"
  
  echo -e "${YELLOW}Test $test_count:${NC} $description"
  echo -e "  Mode: $mode, Tier: $tier"
  echo -e "  Archive: $archive_name"
  
  # Run crawl
  if node dist/cli/index.js crawl \
    --seeds https://example.com \
    --out "$archive_name" \
    --mode "$mode" \
    --replayTier "$tier" \
    --maxPages 1 \
    --json --quiet > /dev/null 2>&1; then
    
    # Validate archive
    if node dist/cli/index.js validate --atls "$archive_name" > /dev/null 2>&1; then
      # Check capabilities
      caps=$(unzip -p "$archive_name" capabilities.v1.json 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "{}")
      
      # Get file size
      size=$(ls -lh "$archive_name" | awk '{print $5}')
      
      echo -e "  ${GREEN}✓ PASS${NC} - Archive valid, Size: $size"
      
      # Show capabilities
      replay_caps=$(echo "$caps" | python3 -c "import sys, json; c = json.load(sys.stdin); print(', '.join([x for x in c.get('capabilities', []) if x.startswith('replay.')]))" 2>/dev/null || echo "none")
      echo -e "  Replay capabilities: $replay_caps"
      
      pass_count=$((pass_count + 1))
    else
      echo -e "  ${RED}✗ FAIL${NC} - Validation failed"
      fail_count=$((fail_count + 1))
    fi
  else
    echo -e "  ${RED}✗ FAIL${NC} - Crawl failed"
    fail_count=$((fail_count + 1))
  fi
  
  echo ""
done

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Total:  $test_count tests"
echo -e "${GREEN}Passed: $pass_count${NC}"
if [ $fail_count -gt 0 ]; then
  echo -e "${RED}Failed: $fail_count${NC}"
fi
echo ""

# File size comparison
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Archive Size Comparison"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ls -lh tmp/e2e-*.atls | awk '{print $9 " - " $5}' | sort
echo ""

# Exit with appropriate code
if [ $fail_count -gt 0 ]; then
  exit 1
else
  exit 0
fi
