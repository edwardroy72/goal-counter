# Implementation Plan

## Phase 1: Stabilize Core Totals and Logging

- Fix `useGoalTotal`: switch to ISO string comparisons, add unitless lifetime path, cover day/week/month inclusive reset.
- Add undo snackbar (3s) for Quick Add with cancel path; ensure haptic feedback alignment.
- Verify UUID generation on fast taps; add collision-safe insertion tests if possible.
- Wire a simple loading/empty state for Dashboard totals to avoid flashing zeros.

## Phase 2: Goal Detail (Current Period + Ledger)

- Build Goal Detail screen tabs: Current Period summary and Ledger.
- Current Period: show total, target/remaining, countdown, Manual Add entry point.
- Ledger: list entries for active period grouped by day; format time/localization per settings.
- Enable entry edit (amount/note) and delete; ensure recalcs propagate via live query.

## Phase 3: Manual Add Flow

- Implement modal with two-step focus: numeric keypad for amount, then text for note.
- Enforce 2-decimal precision and numeric validation; reject empty/NaN.
- Persist via actions hook; reuse undo where sensible for deletes/edits.

## Phase 4: History and Snapshotting

- Implement period snapshot model: store total per period and targetSnapshot.
- Back-fill empty periods on app open/resume to maintain zero-value continuity for graphs.
- Build History tab: graph (blue area for actuals, orange line for target), list of periods/months for lifetime goals.

## Phase 5: Dashboard Enhancements

- Add countdown label ("Resets in Xh Ym") using reset interval math.
- Show target/remaining and progress indicator; handle goals without targets gracefully.
- Support manual sort order persistence and archived state filtering.

## Phase 6: Settings and Data Management

- Timezone toggle: system local vs pinned timezone for display; keep storage in UTC.
- Archive manager: list archived goals, unarchive, permanent delete (with confirmation).
- Export/import: JSON and CSV; validate schema before import; report errors clearly.

## Phase 7: Performance and Integrity

- Optimize recalcs: prefer SQLite SUM/aggregates for totals; index goalId+timestamp.
- Add guarded migrations and migration health check on app start.
- Add input debouncing to avoid duplicate inserts; confirm haptic is once per action.

## Phase 8: Polish and UX Details

- Refine card visuals (Zinc palette), ensure quick add row stays single-line.
- Add graceful empty states and error toasts for DB failures.
- Accessibility: focus order, larger tap targets, and voice-over labels.

## Phase 9: QA and Release Checklist

- Write unit/logic tests for reset math, ISO comparisons, and snapshot back-fill.
- Manual test matrix: day/week/month resets, lifetime goals, timezone toggle, export/import, edits/deletes, undo toast.
- Performance smoke on low-end Android; verify crypto polyfill remains stable.
- App store readiness: icons, splash, permissions audit, versioning, changelog.
