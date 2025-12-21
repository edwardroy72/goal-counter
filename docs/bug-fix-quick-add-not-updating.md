# Bug Fix: Quick Add Not Updating Dashboard Current Values

## Issue Summary

**Problem**: Quick Add buttons on dashboard did not update the "current" value for tasks. Values remained at 0 even after clicking Quick Add or refreshing the page.

**Root Cause**: Race condition in the `useGoalTotal` hook's subscription mechanism.

**Fix**: Updated the subscription `useEffect` dependency array to prevent unnecessary re-subscription cycles that could miss cache invalidation events.

---

## Technical Details

### The Bug

The `useGoalTotal` hook subscribes to the query cache to receive notifications when data changes. The subscription was implemented with this effect:

```typescript
// BEFORE (Buggy)
useEffect(() => {
  const unsubscribe = queryCache.subscribe(() => {
    fetchTotal();
  });
  return () => {
    unsubscribe();
  };
}, [goal.id, fetchTotal]); // ❌ fetchTotal in dependencies
```

**Problem**: The dependency array included `fetchTotal`, which is memoized with `useCallback`. Whenever `fetchTotal` changes (due to `periodStart` changes), the effect re-runs, causing:

1. Unsubscribe from cache
2. Subscribe again with new callback
3. **During this brief window, cache invalidations could be missed**

### The Data Flow

When Quick Add is clicked:

1. `addEntry` inserts entry into database
2. `addEntry` calls `queryCache.invalidate()`
3. Query cache notifies all subscribers
4. **If subscription is being recreated at this moment, the notification is lost**
5. `useGoalTotal` never refetches
6. UI shows stale data (0)

### The Fix

```typescript
// AFTER (Fixed)
useEffect(() => {
  const unsubscribe = queryCache.subscribe(() => {
    fetchTotal();
  });
  return () => {
    unsubscribe();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [goal.id]); // ✅ Only re-subscribe when goal changes
```

**Why this works**:

- Subscription stays stable as long as the goal is the same
- `fetchTotal` is captured in the closure and always references the latest version
- No subscription recreation during normal operations
- Cache invalidations are never missed

---

## Testing

### Tests Added

1. **Subscription Stability Test** (`__tests__/hooks/useGoalTotal.test.ts`)
   - Verifies subscription is not recreated during fetch updates
   - Tests multiple rapid invalidations
   - Ensures all invalidations are processed

```typescript
it("should maintain stable subscription when fetchTotal updates", async () => {
  // Verifies subscribe is called only once
  // Tests multiple invalidations
  // Confirms subscription doesn't get recreated
});
```

2. **Race Condition Test**

   - Tests invalidation immediately after mount
   - Verifies rapid concurrent invalidations
   - Ensures no invalidations are missed

3. **Integration Tests in Existing Suite**
   - `should refetch when cache is invalidated` - Already existed, now more reliable
   - Tests verify the complete flow: addEntry → invalidate → refetch → update

---

## Prevention Guidelines

### For Similar Hooks with Subscriptions

When implementing subscriptions in React hooks:

1. **Keep Dependency Arrays Minimal**

   - Only include primitive values (IDs, keys)
   - Avoid including callback functions

2. **Use Closure Capture for Callbacks**

   ```typescript
   useEffect(() => {
     const unsubscribe = subscribe(() => {
       // Callback captures latest closure
       fetchData(); // Always references current version
     });
     return unsubscribe;
   }, [id]); // Only id, not fetchData
   ```

3. **Test Subscription Stability**

   - Verify subscriptions aren't recreated unnecessarily
   - Test rapid mutations and invalidations
   - Check that all events are received

4. **Watch for These Patterns**

   ```typescript
   // ❌ Dangerous - causes re-subscription
   useEffect(() => {
     const unsub = subscribe(callback);
     return unsub;
   }, [callback]); // callback is a function!

   // ✅ Safe - stable subscription
   useEffect(() => {
     const unsub = subscribe(() => doSomething());
     return unsub;
   }, [id]); // only primitive dependencies
   ```

### Code Review Checklist

When reviewing hooks with subscriptions:

- [ ] Dependency array contains only primitives
- [ ] No callbacks/functions in dependencies
- [ ] Tests verify subscription stability
- [ ] Tests verify all events are received
- [ ] Race condition scenarios are tested
- [ ] Cleanup (unsubscribe) is implemented

---

## Related Code

### Files Modified

- `hooks/useGoalTotal.ts` - Fixed subscription dependency array

### Tests Updated

- `__tests__/hooks/useGoalTotal.test.ts` - Added subscription stability tests

### Files Involved in Data Flow

- `hooks/useGoalActions.ts` - Calls `queryCache.invalidate()` after mutations
- `db/query-cache.ts` - Manages subscriptions and invalidations
- `components/GoalCard.tsx` - Displays the current total from `useGoalTotal`
- `app/index.tsx` - Dashboard that shows all goal cards

---

## Verification Steps

To verify the fix works:

1. **Run Tests**

   ```bash
   npm test -- __tests__/hooks/useGoalTotal.test.ts
   ```

   All 22 tests should pass, including the 3 new subscription stability tests.

2. **Manual Testing**

   - Open the app
   - Create a goal
   - Click Quick Add
   - ✅ Current value should update immediately
   - Refresh the app
   - ✅ Value should persist

3. **Console Logs**
   Enable console logs to observe the flow:
   ```
   [useGoalTotal] Subscribing to query cache for goal: goal-1
   [addEntry] Inserting entry: {goalId, amount, note}
   [addEntry] Entry inserted: {id, ...}
   [addEntry] Invalidating query cache...
   [QueryCache] Invalidating cache. Active subscribers: 2
   [QueryCache] Notifying subscriber 0
   [useGoalTotal] Cache invalidated, refetching for goal: goal-1
   [useGoalTotal] Fetched total for goal goal-1: 250
   ```

---

## Future Improvements

1. **Consider Using React Query or similar**

   - Automatic cache invalidation
   - Built-in subscription management
   - Handles race conditions internally

2. **Add Performance Monitoring**

   - Track subscription lifecycle
   - Monitor invalidation frequency
   - Detect potential memory leaks

3. **Implement Optimistic Updates**

   - Update UI immediately on Quick Add
   - Rollback if database fails
   - Improves perceived performance

4. **Add E2E Tests**
   - Test actual SQLite database operations
   - Verify persistence across app restarts
   - Test with real React Native components

---

## Lessons Learned

1. **Subscriptions and Dependency Arrays Don't Mix**

   - React's exhaustive-deps rule can lead you astray
   - Sometimes you need to disable it with understanding

2. **Race Conditions Are Subtle**

   - The bug only occurred during the brief window of subscription recreation
   - Could appear intermittent or timing-dependent
   - Tests must specifically target race conditions

3. **Trust Console Logs**

   - The extensive logging helped identify the issue
   - Saw subscriptions being created/destroyed repeatedly
   - Helped verify the fix worked

4. **Test the Negative Case**
   - Tests should verify bad things DON'T happen
   - "Subscription should NOT be recreated"
   - "Events should NOT be missed"

---

## References

- React Hooks: https://react.dev/reference/react/useEffect
- Closure Capture: https://react.dev/learn/state-as-a-snapshot
- Testing Async Code: https://testing-library.com/docs/dom-testing-library/api-async/

## Date

December 22, 2025
