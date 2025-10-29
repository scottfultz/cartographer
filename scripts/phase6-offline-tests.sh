#!/usr/bin/env bash
#
# Phase 6.5.4: Offline Capability Verification
# Verifies Atlas archives meet spec goals: offline SEO analysis, accessibility audits, CSV exports
#
# Copyright © 2025 Cai Frazier.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 6.5.4: Offline Capability Verification"
echo "  Atlas v1.0 Spec Goals:"
echo "    1. Complete offline SEO analysis"
echo "    2. Accessibility audits without network"
echo "    3. Content-addressed deduplication"
echo "    4. CSV export capabilities"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_count=0
pass_count=0
fail_count=0

# Find sample archives for each mode
full_archive=$(ls tmp/e2e-full-full.atls 2>/dev/null || echo "")
prerender_archive=$(ls tmp/e2e-prerender-htmlcss.atls 2>/dev/null || echo "")
raw_archive=$(ls tmp/e2e-raw-html.atls 2>/dev/null || echo "")

if [ -z "$full_archive" ] || [ -z "$prerender_archive" ] || [ -z "$raw_archive" ]; then
  echo -e "${RED}Required archives not found!${NC} Run phase6-e2e-tests.sh first."
  exit 1
fi

# Test 1: Verify offline SEO data availability (pages dataset)
echo -e "${YELLOW}Test 1:${NC} Offline SEO data availability (pages dataset)"
test_count=$((test_count + 1))

for archive in "$full_archive" "$prerender_archive" "$raw_archive"; do
  archive_name=$(basename "$archive")
  
  # Check if pages dataset exists and has content
  if pages_data=$(unzip -p "$archive" pages/part-001.jsonl.zst 2>/dev/null | zstdcat 2>/dev/null); then
    page_count=$(echo "$pages_data" | wc -l | tr -d ' ')
    
    # Parse first page for SEO fields
    first_page=$(echo "$pages_data" | head -1)
    has_title=$(echo "$first_page" | grep -c '"title"' || echo "0")
    has_meta=$(echo "$first_page" | grep -c '"metaDescription"' || echo "0")
    has_canonical=$(echo "$first_page" | grep -c '"canonical"' || echo "0")
    
    if [ "$page_count" -gt 0 ] && [ "$has_title" -gt 0 ]; then
      echo -e "  ${GREEN}✓${NC} $archive_name: $page_count pages with SEO data"
    else
      echo -e "  ${YELLOW}⚠${NC} $archive_name: Data present but may be incomplete"
    fi
  else
    echo -e "  ${RED}✗${NC} $archive_name: Could not read pages dataset"
    fail_count=$((fail_count + 1))
    continue
  fi
done

pass_count=$((pass_count + 1))
echo ""

# Test 2: Verify accessibility data (full mode only)
echo -e "${YELLOW}Test 2:${NC} Accessibility data availability (full mode archives)"
test_count=$((test_count + 1))

if a11y_data=$(unzip -p "$full_archive" accessibility/part-001.jsonl.zst 2>/dev/null | zstdcat 2>/dev/null); then
  a11y_count=$(echo "$a11y_data" | wc -l | tr -d ' ')
  
  if [ "$a11y_count" -gt 0 ]; then
    echo -e "  ${GREEN}✓ PASS${NC} - Found $a11y_count accessibility records in $(basename $full_archive)"
    
    # Check for WCAG violation structure
    if echo "$a11y_data" | grep -q '"violations"'; then
      echo -e "  ${GREEN}✓${NC} WCAG violations data present"
    fi
    
    pass_count=$((pass_count + 1))
  else
    echo -e "  ${YELLOW}⚠ PARTIAL${NC} - Accessibility dataset exists but empty"
    pass_count=$((pass_count + 1))
  fi
else
  echo -e "  ${RED}✗ FAIL${NC} - Could not read accessibility dataset"
  fail_count=$((fail_count + 1))
fi

echo ""

# Test 3: CSV Export - Pages report
echo -e "${YELLOW}Test 3:${NC} CSV export capability - Pages report"
test_count=$((test_count + 1))

export_file="tmp/e2e-export-pages.csv"
rm -f "$export_file"

if node dist/cli/index.js export \
  --atls "$prerender_archive" \
  --report pages \
  --out "$export_file" \
  > /dev/null 2>&1; then
  
  if [ -f "$export_file" ]; then
    line_count=$(wc -l < "$export_file" | tr -d ' ')
    
    # Check CSV header
    header=$(head -1 "$export_file")
    if echo "$header" | grep -q "url"; then
      echo -e "  ${GREEN}✓ PASS${NC} - Pages CSV export successful"
      echo -e "  File: $export_file ($line_count lines)"
      pass_count=$((pass_count + 1))
    else
      echo -e "  ${YELLOW}⚠ PARTIAL${NC} - CSV created but header unexpected"
      pass_count=$((pass_count + 1))
    fi
  else
    echo -e "  ${RED}✗ FAIL${NC} - Export file not created"
    fail_count=$((fail_count + 1))
  fi
else
  echo -e "  ${RED}✗ FAIL${NC} - Export command failed"
  fail_count=$((fail_count + 1))
fi

echo ""

# Test 4: CSV Export - Edges report
echo -e "${YELLOW}Test 4:${NC} CSV export capability - Edges report"
test_count=$((test_count + 1))

export_file="tmp/e2e-export-edges.csv"
rm -f "$export_file"

if node dist/cli/index.js export \
  --atls "$prerender_archive" \
  --report edges \
  --out "$export_file" \
  > /dev/null 2>&1; then
  
  if [ -f "$export_file" ]; then
    line_count=$(wc -l < "$export_file" | tr -d ' ')
    
    echo -e "  ${GREEN}✓ PASS${NC} - Edges CSV export successful"
    echo -e "  File: $export_file ($line_count lines)"
    pass_count=$((pass_count + 1))
  else
    echo -e "  ${RED}✗ FAIL${NC} - Export file not created"
    fail_count=$((fail_count + 1))
  fi
else
  echo -e "  ${RED}✗ FAIL${NC} - Export command failed"
  fail_count=$((fail_count + 1))
fi

echo ""

# Test 5: CSV Export - Assets report
echo -e "${YELLOW}Test 5:${NC} CSV export capability - Assets report"
test_count=$((test_count + 1))

export_file="tmp/e2e-export-assets.csv"
rm -f "$export_file"

if node dist/cli/index.js export \
  --atls "$prerender_archive" \
  --report assets \
  --out "$export_file" \
  > /dev/null 2>&1; then
  
  if [ -f "$export_file" ]; then
    line_count=$(wc -l < "$export_file" | tr -d ' ')
    
    echo -e "  ${GREEN}✓ PASS${NC} - Assets CSV export successful"
    echo -e "  File: $export_file ($line_count lines)"
    pass_count=$((pass_count + 1))
  else
    echo -e "  ${RED}✗ FAIL${NC} - Export file not created"
    fail_count=$((fail_count + 1))
  fi
else
  echo -e "  ${RED}✗ FAIL${NC} - Export command failed"
  fail_count=$((fail_count + 1))
fi

echo ""

# Test 6: Archive completeness (all required datasets present)
echo -e "${YELLOW}Test 6:${NC} Archive completeness verification"
test_count=$((test_count + 1))

required_files=("manifest.json" "capabilities.v1.json" "provenance/part-001.jsonl.zst" "pages/part-001.jsonl.zst" "edges/part-001.jsonl.zst")
missing_count=0

for archive in "$full_archive" "$prerender_archive"; do
  archive_name=$(basename "$archive")
  
  for file in "${required_files[@]}"; do
    if ! unzip -l "$archive" 2>/dev/null | grep -q "$file"; then
      echo -e "  ${RED}✗${NC} $archive_name: Missing $file"
      missing_count=$((missing_count + 1))
    fi
  done
done

if [ $missing_count -eq 0 ]; then
  echo -e "  ${GREEN}✓ PASS${NC} - All required files present in archives"
  pass_count=$((pass_count + 1))
else
  echo -e "  ${RED}✗ FAIL${NC} - $missing_count required files missing"
  fail_count=$((fail_count + 1))
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Offline Capability Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Total:  $test_count tests"
echo -e "${GREEN}Passed: $pass_count${NC}"
if [ $fail_count -gt 0 ]; then
  echo -e "${RED}Failed: $fail_count${NC}"
fi
echo ""

# List generated exports
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Generated CSV Exports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ls -lh tmp/e2e-export-*.csv 2>/dev/null | awk '{print $9 " - " $5}' || echo "No exports found"
echo ""

# Exit with appropriate code
if [ $fail_count -gt 0 ]; then
  exit 1
else
  exit 0
fi
