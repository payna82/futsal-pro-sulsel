# Phase D: End-to-End Testing Guide

## Overview

This directory contains automated E2E tests for all 5 major user scenarios with 25 checkpoints total.

```
Scenario 1: Team Registration Journey (6 tests)
Scenario 2: Committee Member Lifecycle (5 tests)
Scenario 3: Permission Denial Scenarios (4 tests)
Scenario 4: Status Transition Enforcement (4 tests)
Scenario 5: Audit Trail & Transparency (4 tests)
───────────────────────────────────────────────
Total: 25 comprehensive E2E test cases
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run E2E Tests
```bash
# Run all tests
npm run test:e2e

# Run with UI (interactive)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

### 3. View Results
Test reports are generated in `test-results/` directory:
- `test-results/index.html` - HTML report with screenshots
- `test-results/results.json` - JSON results for CI/CD integration

## Test Scenarios

### Scenario 1: Full Team Registration Journey
**File**: `scenario-1.spec.ts`
**Duration**: ~10 minutes
**Tests**:
1. ✓ Team account creation works
2. ✓ Document upload UI functional
3. ✓ Player & official records save
4. ✓ Submission creates notification
5. ✓ Admin can approve with note
6. ✓ Team access unlocked after approval

**Coverage**: Public signup → Team registration → Document upload → Submission → Admin approval → Access unlock

---

### Scenario 2: Committee Member Lifecycle
**File**: `scenario-2.spec.ts`
**Duration**: ~8 minutes
**Tests**:
1. ✓ Role request UI visible
2. ✓ Decision note required for rejection
3. ✓ Role binding optional
4. ✓ User role updated after approval
5. ✓ Committee can record match events

**Coverage**: Role request flow → Approval with binding → Role activation → Match control access

---

### Scenario 3: Permission Denial Scenarios
**File**: `scenario-3.spec.ts`
**Duration**: ~6 minutes
**Tests**:
1. ✓ 403 error for cross-tenant access
2. ✓ Permission denied hides actions
3. ✓ Rejected contingent blocks team
4. ✓ Error messages are actionable

**Coverage**: Access control enforcement across all layers

---

### Scenario 4: Status Transition Enforcement
**File**: `scenario-4.spec.ts`
**Duration**: ~7 minutes
**Tests**:
1. ✓ Valid transitions allowed (PENDING → VERIFIED)
2. ✓ Invalid transitions blocked (REJECTED no transitions)
3. ✓ State skipping prevented (PENDING → DEACTIVATED)
4. ✓ Cascading effects applied (rejected contingent blocks teams)

**Coverage**: State machine correctness and data consistency

---

### Scenario 5: Audit Trail & Transparency
**File**: `scenario-5.spec.ts`
**Duration**: ~6 minutes
**Tests**:
1. ✓ All approvals logged in audit trail
2. ✓ Decision notes persisted in database
3. ✓ Audit trail accessible to authorized users
4. ✓ Timestamps are server-side

**Coverage**: Audit logging, decision tracking, compliance

---

## Test Helpers

**File**: `helpers.ts`

Common utilities for browser automation:

```typescript
import { TestHelpers } from './helpers';

// Login
await TestHelpers.loginAsAdmin(page);
await TestHelpers.loginAsTeam(page);
await TestHelpers.loginAsPublic(page);

// Actions
await TestHelpers.approvePendingContingent(page, "Approved");
await TestHelpers.rejectPendingContingent(page, "Rejected");
await TestHelpers.addPlayer(page, "Player Name", "7");

// Verification
await TestHelpers.verifyErrorMessage(page);
await TestHelpers.waitForStatus(page, "Disetujui");
await TestHelpers.verifyAuditLog(page, "APPROVED", "note");
```

## Configuration

**File**: `playwright.config.ts`

- **Base URL**: `http://localhost:8080`
- **Browser**: Chromium
- **Timeout**: 30 seconds per test
- **Global Timeout**: 10 minutes
- **Reports**: HTML + JSON
- **Screenshots**: On failure
- **Traces**: On first retry

## Running Specific Scenarios

```bash
# Run only Scenario 1
npx playwright test scenario-1

# Run only Scenario 3 (Permission Denial)
npx playwright test scenario-3

# Run Scenarios 1 and 2
npx playwright test scenario-1 scenario-2
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: npm run test:e2e
  
- name: Upload Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: test-results/
```

## Troubleshooting

### Tests timing out
- Ensure dev server is running: `npm run dev`
- Check network latency (tests wait max 30s per action)
- Increase timeout in `playwright.config.ts`

### Demo login not working
- Verify demo authentication is enabled in `src/domain/demo-authentication-adapter.ts`
- Check browser console for errors
- Add `.only` to test to debug: `test.only('2.1 Role request UI visible', ...)`

### Selectors not finding elements
- Use `--debug` mode: `npm run test:e2e:debug`
- Update selectors if UI changed (look for `text=`, `aria-label`, etc.)
- Check `test-results/` screenshots for visual debugging

## Best Practices

### Writing New Tests
1. Use `TestHelpers` for common actions
2. Always check element visibility before clicking
3. Wait for navigation: `await page.waitForURL(/pattern/, { timeout: 5000 })`
4. Use descriptive test names matching checkpoints
5. Add comments explaining what's being tested

### Maintaining Tests
- Update selectors when UI changes
- Keep tests focused on one scenario each
- Use data-testid attributes if possible (add to components)
- Review failed screenshots in test-results/

## Phases Reference

- **Phase A**: Authentication & Authorization ✅
- **Phase B**: Admin & Committee Flows ✅
- **Phase C**: Frontend Polish & Consistency ✅
- **Phase D**: End-to-End Testing (Current) 🟡
  - D-1: Scenario 1 - Team Registration
  - D-2: Scenario 2 - Committee Lifecycle
  - D-3: Scenario 3 - Permission Denial
  - D-4: Scenario 4 - Status Transitions
  - D-5: Scenario 5 - Audit Trail

---

## Next Steps

After all tests pass:
1. Fix any failing tests
2. Review test results in `test-results/index.html`
3. Update documentation if UI changed
4. Commit tests to repository
5. Set up CI/CD pipeline

## Support

For issues or questions:
- Check browser console in debug mode
- Review HTML report for screenshots
- Read scenario documentation in `tests/e2e-scenarios.ts`
