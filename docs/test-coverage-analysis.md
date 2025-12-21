# Test Coverage Analysis & Gaps

## ✅ Fully Tested (100% coverage)

### 1. Query Cache (`db/query-cache.ts`)

- ✅ Subscribe/unsubscribe
- ✅ Multiple subscribers
- ✅ Invalidation notifies all
- ✅ Error handling in listeners
- ✅ Unsubscribe during invalidation
- ✅ Subscribe during invalidation
- ✅ Cleanup (clearAllSubscribers)

### 2. useGoalActions Hook (`hooks/useGoalActions.ts`)

- ✅ Add entry with all params
- ✅ Add entry without note
- ✅ Haptic feedback on add
- ✅ Cache invalidation on add
- ✅ 3-second undo timer
- ✅ showUndo state transitions
- ✅ Undo within window
- ✅ Undo after timeout
- ✅ Undo haptic feedback
- ✅ Multiple entries (timer reset)
- ✅ Database errors on add
- ✅ Database errors on undo
- ✅ Decimal amounts

### 3. Period Calculation (extracted from useGoalTotal)

- ✅ Lifetime goals (none)
- ✅ Daily resets (1-day, multi-day)
- ✅ Weekly resets (1-week, multi-week)
- ✅ Monthly resets (1-month, multi-month)
- ✅ Period boundaries
- ✅ Edge cases (future date, large intervals, zero, invalid unit)
- ✅ Month-end dates
- ✅ Timestamp normalization (seconds vs ms)

## ❌ Critical Gaps (0% coverage)

### 1. useGoalTotal Hook (`hooks/useGoalTotal.ts`) - **CRITICAL**

Missing tests for:

- [ ] Initial total fetch on mount
- [ ] Period calculation integration
- [ ] Cache subscription/unsubscription
- [ ] Refetch on cache invalidation
- [ ] Database query with correct filters (goalId, timestamp >= periodStart)
- [ ] Null/undefined totals (no entries)
- [ ] Multiple entries aggregation
- [ ] Error handling on fetch failure
- [ ] Period start recalculation on goal changes
- [ ] Timestamp normalization (seconds vs milliseconds)

**Impact**: This hook calculates displayed totals - if broken, core app functionality fails

### 2. Date Logic Utilities (`utils/date-logic.ts`) - **HIGH**

Missing tests for:

- [ ] calculateNextReset() for all reset units
- [ ] calculateNextReset() edge cases (none, invalid unit)
- [ ] calculateNextReset() with various intervals
- [ ] getCountdownText() with days remaining
- [ ] getCountdownText() with hours remaining
- [ ] getCountdownText() with minutes remaining
- [ ] getCountdownText() with negative time (past reset)
- [ ] getCountdownText() with null reset

**Impact**: Affects countdown display and reset timing accuracy

### 3. Dashboard Integration (`app/index.tsx`) - **HIGH**

Missing tests for:

- [ ] Initial goals fetch on mount
- [ ] Cache subscription for live updates
- [ ] Focus effect triggers refetch
- [ ] Empty state display
- [ ] Goal list rendering
- [ ] Navigation to create goal
- [ ] Navigation to goal detail
- [ ] Error handling on fetch failure
- [ ] Loading states

**Impact**: Main screen - if broken, entire app is unusable

### 4. Create Goal Modal (`app/modal.tsx`) - **MEDIUM**

Missing tests for:

- [ ] Form field validation
- [ ] Save with valid data
- [ ] Save with missing required fields
- [ ] Database insertion
- [ ] Cache invalidation after save
- [ ] Navigation back after save
- [ ] Error handling on save failure
- [ ] Default values
- [ ] Quick add button configuration

**Impact**: Cannot create new goals if broken

### 5. GoalCard Component (`components/GoalCard.tsx`) - **MEDIUM**

Missing tests for:

- [ ] Renders goal data correctly
- [ ] Displays current total from useGoalTotal
- [ ] Displays countdown from date-logic
- [ ] Calculates remaining correctly
- [ ] Quick add button triggers addEntry
- [ ] Navigation to goal detail on press
- [ ] Handles goals without target
- [ ] Handles goals without countdown

**Impact**: Main UI component - display issues affect UX

## 📊 Coverage Priority

### Priority 1 (Implement Now)

1. **useGoalTotal** - Core calculation logic
2. **date-logic.ts** - Critical utility functions

### Priority 2 (Implement Next)

3. **Dashboard** - Main screen integration
4. **Create Goal Modal** - Goal creation flow

### Priority 3 (Nice to Have)

5. **GoalCard** - Component integration tests
6. **Goal Detail Page** - Individual goal view

## Test Strategy

### Unit Tests (Fast, Isolated)

- Pure functions (date-logic, period calculation)
- Query cache
- Mocked hooks (useGoalActions with mocked DB)

### Integration Tests (Hook + DB)

- useGoalTotal with mocked database
- useGoalActions (already done)

### Component Tests (React Testing Library)

- GoalCard with mocked hooks
- Dashboard with mocked queries
- Modal with mocked database

### E2E Tests (Future - Detox/Maestro)

- Full user flows
- Not in scope for current work
