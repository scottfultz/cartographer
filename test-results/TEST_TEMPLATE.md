# Feature Validation Test Results Template
**Feature:** [Feature Name]  
**Test Date:** [YYYY-MM-DD]  
**Tester:** [Name]  
**Build Version:** [Git commit hash]

---

## Feature Information

**Feature ID:** [Unique identifier]  
**Category:** [Command/Option/Dataset/Integration]  
**Priority:** [Critical/High/Medium/Low]  
**Status Before Test:** [✅⚠️❓🚧❌📝]

---

## Test Cases

### Test Case 1: [Description]

**Test ID:** TC-001  
**Objective:** [What are we testing?]  
**Priority:** [Critical/High/Medium/Low]

**Prerequisites:**
- [ ] Build completed successfully
- [ ] Test data/fixtures prepared
- [ ] Environment configured

**Test Steps:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
- [Expected outcome 1]
- [Expected outcome 2]

**Actual Result:**
- [What actually happened]

**Status:** ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

**Evidence:**
```
[Command output, logs, screenshots]
```

**Notes:**
- [Observations]
- [Issues found]
- [Performance notes]

---

### Test Case 2: [Description]

[Repeat structure above]

---

## Edge Cases Tested

- [ ] Empty input
- [ ] Malformed input
- [ ] Maximum values
- [ ] Minimum values
- [ ] Special characters
- [ ] Unicode/international
- [ ] Large datasets
- [ ] Network errors
- [ ] Timeouts

---

## Performance Metrics

| Metric | Value | Acceptable | Status |
|--------|-------|------------|--------|
| Execution Time | [X]s | < [Y]s | ✅/❌ |
| Memory Peak | [X]MB | < [Y]MB | ✅/❌ |
| CPU Usage | [X]% | < [Y]% | ✅/❌ |
| Disk I/O | [X]MB | < [Y]MB | ✅/❌ |

---

## Issues Found

### Issue 1
**Severity:** Critical/High/Medium/Low  
**Description:** [What went wrong]  
**Reproduction Steps:**
1. [Step 1]
2. [Step 2]

**Expected:** [What should happen]  
**Actual:** [What actually happened]  
**Impact:** [Who/what is affected]  
**Workaround:** [If any]  
**Recommendation:** [How to fix]

---

## Overall Assessment

**Status:** ✅ Production Ready / ⚠️ Needs Work / ❌ Broken

**Summary:**
[Brief summary of findings]

**Strengths:**
- [What works well]

**Weaknesses:**
- [What needs improvement]

**Blockers:**
- [Critical issues preventing production use]

**Recommendations:**
1. [Priority 1 fix]
2. [Priority 2 improvement]
3. [Priority 3 enhancement]

---

## Sign-off

**Tested By:** [Name]  
**Reviewed By:** [Name]  
**Date:** [YYYY-MM-DD]  
**Approved for:** Development / Testing / Staging / Production

---

## Appendix

### Test Environment
- Node Version: [X.Y.Z]
- OS: [macOS/Linux/Windows]
- Architecture: [x64/arm64]
- Browser: [Chromium X.Y.Z]

### Test Data
- [Links to test fixtures]
- [Sample inputs used]
- [Expected outputs]

### Evidence Files
- [logs/test-TC-001.jsonl]
- [archives/test-TC-001.atls]
- [screenshots/test-TC-001.png]
