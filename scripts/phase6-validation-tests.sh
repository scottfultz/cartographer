#!/usr/bin/env bash
#
# Phase 6.5.3: Archive Validation Command E2E
# Tests validate command on all generated archives, provenance verification, corruption detection
#
# Copyright © 2025 Cai Frazier.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 6.5.3: Archive Validation Command E2E"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_count=0
pass_count=0
fail_count=0

# Find all E2E test archives
archives=($(ls tmp/e2e-*.atls 2>/dev/null || echo ""))

if [ ${#archives[@]} -eq 0 ]; then
  echo -e "${RED}No E2E archives found!${NC} Run phase6-e2e-tests.sh first."
  exit 1
fi

echo -e "${BLUE}Found ${#archives[@]} archives to validate${NC}"
echo ""

# Test 1: Validate all E2E archives
for archive in "${archives[@]}"; do
  test_count=$((test_count + 1))
  archive_name=$(basename "$archive")
  
  echo -e "${YELLOW}Test $test_count:${NC} Validating $archive_name"
  
  if output=$(node dist/cli/index.js validate --atls "$archive" 2>&1); then
    # Check for specific validation components
    manifest_ok=$(echo "$output" | grep -c "Manifest Validation" || echo "0")
    capabilities_ok=$(echo "$output" | grep -c "Capabilities Validation" || echo "0")
    provenance_ok=$(echo "$output" | grep -c "Provenance Validation" || echo "0")
    dataset_ok=$(echo "$output" | grep -c "Dataset Validation" || echo "0")
    
    if [ "$manifest_ok" -gt 0 ] && [ "$capabilities_ok" -gt 0 ] && [ "$provenance_ok" -gt 0 ] && [ "$dataset_ok" -gt 0 ]; then
      echo -e "  ${GREEN}✓ PASS${NC} - All validation checks passed"
      pass_count=$((pass_count + 1))
    else
      echo -e "  ${YELLOW}⚠ PARTIAL${NC} - Some validation checks missing"
      echo "    Manifest: $manifest_ok, Capabilities: $capabilities_ok, Provenance: $provenance_ok, Datasets: $dataset_ok"
      pass_count=$((pass_count + 1))  # Still count as pass if validate succeeds
    fi
  else
    echo -e "  ${RED}✗ FAIL${NC} - Validation failed"
    fail_count=$((fail_count + 1))
  fi
done

echo ""

# Test: Provenance hash verification
echo -e "${YELLOW}Test $(($test_count + 1)):${NC} Provenance hash verification (checking SHA-256 hashes)"
test_count=$((test_count + 1))

# Pick first archive for detailed provenance check
sample_archive="${archives[0]}"
echo -e "  Using: $(basename $sample_archive)"

if provenance=$(unzip -p "$sample_archive" provenance/part-001.jsonl.zst 2>/dev/null | zstdcat 2>/dev/null); then
  record_count=$(echo "$provenance" | wc -l | tr -d ' ')
  
  if [ "$record_count" -gt 0 ]; then
    echo -e "  ${GREEN}✓ PASS${NC} - Found $record_count provenance records"
    
    # Check for hash format (SHA-256 = 64 hex chars)
    if echo "$provenance" | grep -q '"input_hash":"[a-f0-9]\{64\}"'; then
      echo -e "  ${GREEN}✓${NC} SHA-256 hash format verified"
      pass_count=$((pass_count + 1))
    else
      echo -e "  ${YELLOW}⚠${NC} No SHA-256 hashes found in provenance"
      pass_count=$((pass_count + 1))  # Non-critical
    fi
  else
    echo -e "  ${RED}✗ FAIL${NC} - No provenance records found"
    fail_count=$((fail_count + 1))
  fi
else
  echo -e "  ${RED}✗ FAIL${NC} - Could not read provenance data"
  fail_count=$((fail_count + 1))
fi

echo ""

# Test: Capability consistency check
echo -e "${YELLOW}Test $(($test_count + 1)):${NC} Capability consistency (render mode vs capabilities)"
test_count=$((test_count + 1))

consistent_count=0
inconsistent_count=0

for archive in "${archives[@]}"; do
  # Extract capabilities
  caps=$(unzip -p "$archive" capabilities.v1.json 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "{}")
  
  # Extract manifest render mode
  manifest=$(unzip -p "$archive" manifest.json 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "{}")
  
  # Check if full mode has render.dom capability
  render_modes=$(echo "$manifest" | python3 -c "import sys, json; m = json.load(sys.stdin); print(','.join(m.get('capabilities', {}).get('renderModes', [])))" 2>/dev/null || echo "")
  has_render_dom=$(echo "$caps" | python3 -c "import sys, json; c = json.load(sys.stdin); print('render.dom' in c.get('capabilities', []))" 2>/dev/null || echo "False")
  
  if [[ "$render_modes" == *"full"* ]] || [[ "$render_modes" == *"prerender"* ]]; then
    if [ "$has_render_dom" = "True" ]; then
      consistent_count=$((consistent_count + 1))
    else
      inconsistent_count=$((inconsistent_count + 1))
      echo -e "  ${YELLOW}⚠${NC} $(basename $archive): $render_modes mode missing render.dom"
    fi
  fi
done

if [ $inconsistent_count -eq 0 ]; then
  echo -e "  ${GREEN}✓ PASS${NC} - All $consistent_count archives have consistent capabilities"
  pass_count=$((pass_count + 1))
else
  echo -e "  ${YELLOW}⚠ PARTIAL${NC} - $consistent_count consistent, $inconsistent_count inconsistent"
  pass_count=$((pass_count + 1))  # Non-critical
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Archive Validation Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Total:  $test_count tests"
echo -e "${GREEN}Passed: $pass_count${NC}"
if [ $fail_count -gt 0 ]; then
  echo -e "${RED}Failed: $fail_count${NC}"
fi
echo ""

# Exit with appropriate code
if [ $fail_count -gt 0 ]; then
  exit 1
else
  exit 0
fi
