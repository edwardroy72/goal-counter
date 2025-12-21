# Test Suite Documentation

## Overview

This test suite provides comprehensive coverage of the Goal Counter application's core functionality, with a focus on **correctness, determinism, and trustworthiness**. The tests are designed so that **failures indicate bugs in implementation, not flaws in tests**.

## Test Organization

### Unit Tests

#### `db/__tests__/query-cache.test.ts`

**Purpose**: Tests the manual cache invalidation system that replaced `useLiveQuery`.

**Coverage**:

- Subscriber registration and unsubscription
- Invalidation notification to all subscribers
- Concurrent subscribers management
- Edge cases (unsubscribe during invalidation, error handling)

**Why Critical**: The entire UI update mechanism depends on this cache invalidation working correctly. If this fails, no data updates will be reflected in the UI.

#### `utils/__tests__/period-calculation.test.ts`

**Purpose**: Tests the pure business logic for calculating period boundaries.

**Coverage**:

- Day/week/month reset intervals
- Lifetime (none) goals
- Multi-unit intervals (e.g., 3-day, 2-week)
- Boundary conditions (same-day, period boundaries)
- Edge cases (future dates, large intervals, invalid units)
- Timestamp normalization (seconds ↔ milliseconds)

**Why Critical**: Incorrect period calculations mean users see wrong totals. This is pure business logic that must be bulletproof.

### Integration Tests

#### `hooks/__tests__/useGoalActions.test.ts`

**Purpose**: Tests the hook that manages entry creation and undo functionality.

**Coverage**:

- Database insert operations
- Haptic feedback triggering
- Query cache invalidation after mutations
- 3-second undo timer mechanics
- State management (`showUndo`)
- Error handling
- Decimal amount precision

**Why Critical**: This is the primary user interaction—adding entries. Must work flawlessly.

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (no watch, with coverage)
npm run test:ci
```

### Test Output

Tests use descriptive names following the pattern:

```
describe('Feature')
  describe('method()')
    it('should behavior under condition')
```

This makes failures immediately obvious:

```
FAIL hooks/__tests__/useGoalActions.test.ts
  useGoalActions Hook
    addEntry()
      ✕ should invalidate query cache after successful insert
```

From this output, you instantly know:

- **What**: `addEntry()` function
- **Expected**: Query cache should be invalidated
- **Where**: `useGoalActions` hook

## Coverage Goals

**Current Targets**:

- Statements: 70%
- Branches: 65%
- Functions: 70%
- Lines: 70%

These thresholds ensure critical paths are tested while allowing for some UI/presentation code to remain untested.

## Test Principles

### 1. Deterministic

Every test produces the same result every time. No flaky tests.

- ✅ Use `jest.useFakeTimers()` for time-dependent tests
- ✅ Mock external dependencies (database, haptics)
- ✅ Control all inputs explicitly

### 2. Isolated

Each test is independent. No shared state.

- ✅ `beforeEach()` resets all mocks
- ✅ Tests don't depend on execution order
- ✅ Each test sets up its own data

### 3. Clear Assertions

Assertions are explicit about what's being tested.

```typescript
// ❌ Bad - unclear what's wrong if this fails
expect(result).toBeTruthy();

// ✅ Good - immediately clear what failed
expect(result.showUndo).toBe(true);
expect(queryCache.invalidate).toHaveBeenCalledTimes(1);
```

### 4. Edge Cases Covered

Tests include:

- Happy path (normal usage)
- Boundary conditions (zero, exact boundaries)
- Error cases (database failures, invalid inputs)
- Concurrent operations (multiple subscribers, rapid actions)

### 5. Mock Verification

Mocks verify **behavior**, not just that code runs.

```typescript
// ✅ Verifies correct database interaction
expect(db.insert).toHaveBeenCalledWith(entries);
expect(mockInsert.values).toHaveBeenCalledWith({
  goalId: "goal-1",
  amount: 250,
  note: "Morning water",
  timestamp: expect.any(Date),
});
```

## Debugging Failed Tests

### Step 1: Read the Test Name

The test name describes what should happen:

```typescript
it("should invalidate query cache after successful insert");
```

### Step 2: Check the Assertion

The failure shows what was expected vs actual:

```
Expected: 1
Received: 0

expect(queryCache.invalidate).toHaveBeenCalledTimes(1);
```

### Step 3: Check Mock Calls

Use `.mock.calls` to see what actually happened:

```typescript
console.log(queryCache.invalidate.mock.calls);
// []  ← never called
```

### Step 4: Verify Implementation

Check if the implementation actually calls the expected function.

## Adding New Tests

### Template for New Test File

```typescript
/**
 * Tests: [Component/Hook/Function Name]
 *
 * [Brief description of what this tests]
 */

import { [imports] } from '[paths]';

// Mock external dependencies
jest.mock('[module]', () => ({
  [exports]: jest.fn()
}));

describe('[Component/Hook/Function]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset state
  });

  describe('[method/feature]()', () => {
    it('should [behavior] when [condition]', () => {
      // Arrange: Set up test data
      const input = ...;

      // Act: Execute the code
      const result = functionUnderTest(input);

      // Assert: Verify behavior
      expect(result).toBe(expected);
    });

    it('should handle [edge case]', () => {
      // Test edge case
    });

    it('should handle [error case] gracefully', () => {
      // Test error handling
    });
  });
});
```

### Checklist for New Tests

- [ ] Test name clearly describes behavior
- [ ] Includes happy path
- [ ] Includes at least 2 edge cases
- [ ] Includes error handling test
- [ ] Uses descriptive variable names
- [ ] Mocks are properly reset in `beforeEach`
- [ ] No hardcoded dates (use Date constructors)
- [ ] Assertions are explicit and specific

## Continuous Integration

Tests are designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm run test:ci

- name: Upload coverage
  run: npx codecov
```

The `test:ci` command:

- Runs once (no watch mode)
- Generates coverage report
- Limits workers for CI environment
- Fails if coverage thresholds not met

## Future Test Additions

### High Priority

- [ ] `useGoalTotal` hook tests (manual fetch behavior)
- [ ] Dashboard component tests (goal list rendering)
- [ ] Modal form validation tests
- [ ] Database schema migration tests

### Medium Priority

- [ ] Date formatting utilities tests
- [ ] Countdown calculation tests
- [ ] Navigation flow integration tests

### Low Priority

- [ ] UI component snapshot tests
- [ ] Accessibility tests
- [ ] Performance benchmarks

## Maintenance

### When to Update Tests

**Always update tests when**:

- Adding new features
- Fixing bugs (add regression test)
- Changing business logic
- Modifying data structures

**Don't update tests when**:

- Refactoring implementation (if behavior unchanged)
- Changing UI styling
- Updating dependencies (unless API changes)

### Test Health Indicators

**Healthy test suite**:

- All tests pass
- Coverage meets thresholds
- Tests run in <10 seconds
- No skipped tests (`.skip`)
- No flaky tests

**Unhealthy test suite**:

- Tests fail intermittently
- Coverage dropping
- Tests take >30 seconds
- Many skipped/commented tests
- Mocks returning `undefined`

## Questions & Support

If tests are failing:

1. **Read the test name** - it describes expected behavior
2. **Check the assertion** - what was expected vs actual
3. **Verify mocks** - are dependencies being called correctly
4. **Check implementation** - does code match test expectations

If tests need updating:

1. **Understand why** - what changed in requirements
2. **Update test first** - make it fail correctly
3. **Fix implementation** - make test pass
4. **Verify coverage** - ensure edge cases still covered
