# Goal Counter Implementation Execution Plan

## 1. Purpose

This document turns the high-level improvement plan into an execution plan that is:

- comprehensive
- TDD-first
- sized into meaningful work packages
- explicit about requirements, correctness, robustness, reliability, performance, and testing

It covers the full approved scope:

- graph imported conceptually from Vision
- detail-screen scroll fix
- grouped Recent Activity
- rolling surplus / deficit
- archive / unarchive
- duplicate goal
- paginated history
- batched dashboard summaries
- last updated indicators
- archive manager in Settings
- export / import backup
- goal reordering

This plan is written for incremental delivery. Each work package should be shippable, reviewable, and testable on its own.

---

## 2. Program Goals

The program should leave Goal Counter in a state where:

1. The app still feels like Goal Counter, not a desktop tracker port.
2. Analytics-heavy features do not rely on repeated full-ledger scans in hot UI paths.
3. History remains correct across timezone boundaries, resets, edits, deletes, archive/unarchive, and backup restore.
4. Multi-step mutations are safe and deterministic.
5. Dashboard and detail performance improve as features are added, not degrade.
6. Backups are trustworthy enough for real personal data.

---

## 3. Non-Goals

These are intentionally out of scope for this program:

- adding Vision's measurement-tracker mode
- rebuilding Goal Counter around a server/tRPC architecture
- changing Goal Counter's visual identity
- implementing CSV export in the first backup wave
- shipping cloud sync
- redesigning the home screen information hierarchy from scratch

---

## 4. Engineering Principles

### 4.1 Preserve the existing product shape

Keep:

- mobile-first full-screen navigation
- current home card aesthetic
- current detail summary + tab structure
- current local-first storage model

Do not:

- force desktop modal interaction patterns into the mobile app
- collapse Goal Counter into a generic multi-mode tracking system

### 4.2 Put domain logic outside UI components

The app should move away from embedding query and derivation logic directly inside route files and display hooks.

Target shape:

- repository layer for DB access
- analytics layer for graph, rolling, summary, snapshot, and pagination logic
- UI hooks that consume those layers

### 4.3 Prefer bounded work over full-history work

Hot paths must not depend on loading the full ledger when a bounded query or snapshot can answer the question.

Hot paths include:

- dashboard rendering
- graph range switching
- detail screen open
- current-period refresh after entry logging

### 4.4 Use migrations deliberately

Schema changes must be additive and backward-safe.

Every migration should have:

- a purpose
- tests or validation steps
- explicit rollback thinking, even if local rollback is manual

### 4.5 Use transactions for multi-step mutations

Any operation that creates or updates more than one logical record should be transactional where supported.

Examples:

- duplicate goal
- archive + related metadata changes if added later
- import restore
- snapshot backfill/reconciliation
- reorder persistence across multiple goals

### 4.6 Standardize logging and failure handling

Prefer the existing logger abstraction over scattered `console.log` calls.

The app should:

- surface recoverable failures to users clearly
- log actionable diagnostics in development
- avoid noisy logs in normal operation

---

## 5. Proposed Architecture Direction

## 5.1 Existing code to evolve

Current important touchpoints:

- `app/index.tsx`
- `app/goal/[id].tsx`
- `app/modal.tsx`
- `app/goal/edit/[id].tsx`
- `app/settings.tsx`
- `components/GoalCard.tsx`
- `components/goal-detail/CurrentPeriodView.tsx`
- `components/goal-detail/HistoryLedgerView.tsx`
- `hooks/useGoalTotal.ts`
- `hooks/useGoalEntries.ts`
- `hooks/useGoalHistory.ts`
- `hooks/useGoalActions.ts`
- `hooks/useEntryActions.ts`
- `db/schema.ts`
- `db/query-cache.ts`

## 5.2 New modules to introduce

Recommended new modules:

- `db/repositories/goal-repository.ts`
- `services/goal-analytics.ts`
- `hooks/useGoalGraph.ts`
- `hooks/useGoalSummary.ts`
- `hooks/useGoalSummaryList.ts`
- `hooks/usePaginatedGoalHistory.ts`
- `hooks/useArchivedGoals.ts`
- `components/goal-detail/GoalGraphCard.tsx`
- `components/settings/ArchiveManager.tsx`
- `utils/backup/backup-schema.ts`
- `utils/backup/export-backup.ts`
- `utils/backup/import-backup.ts`

Exact filenames can vary, but the separation of concerns should remain.

## 5.3 Key domain decisions

### Graph

- Use touch-friendly native rendering with `react-native-svg`
- 7d / 30d / 90d ranges
- daily buckets
- zero-fill missing buckets for counters

### Rolling surplus / deficit

- available only when `target !== null`
- unavailable for lifetime goals in v1
- rolling window must match the goal reset unit family in v1
- rolling window must be a whole multiple of the goal reset cadence in v1

### History snapshots

- use `history_snapshots` for closed periods
- preserve target-at-time values to prevent historical drift
- reconcile gaps when needed instead of recomputing the entire past on every render

### Goal lifecycle

- archive uses `status = "archived"`
- duplicate copies configuration, not history
- reorder persists via `sortOrder`

### Backup

- versioned JSON format
- import validates before writing
- import should never partially write corrupt data silently

---

## 6. Definition of Done

Every work package is only complete when all of the following are true:

1. The relevant failing tests were written first.
2. Production code passes those tests.
3. Existing related tests still pass.
4. User-facing edge cases are handled explicitly.
5. Logging and error handling are not ad hoc.
6. Performance impact on hot paths is understood and acceptable.
7. The feature is reflected in docs if it changes architecture, schema, or user-facing behavior.

For UI work, also require:

- mobile usability on a small phone viewport
- no clipped/overflowing critical content
- no nested scroll behavior regressions

For data work, also require:

- deterministic behavior under repeated invalidation
- correctness across timezone boundaries
- no unbounded full-ledger scans on hot paths unless explicitly approved

---

## 7. TDD-First Workflow

Each work package should follow this order:

1. Write or update failing tests for the core behavior.
2. Implement the smallest production change that makes those tests pass.
3. Refactor toward the intended architecture once the safety net exists.
4. Add integration or UI tests for the full user-facing flow.
5. Run targeted manual QA for the changed surface.

Recommended test layers:

- pure unit tests for date math, bucket shaping, rolling calculations, backup schema validation
- repository/data tests for aggregate queries, pagination, snapshots, duplicate/archive/import flows
- hook tests for summary/graph/history hooks
- component tests for tab content, graph card, archive manager, reorder affordances

---

## 8. Quality Gates

## 8.1 Correctness gates

- Graph buckets must be correct for daily, weekly, monthly, and lifetime goal contexts where applicable.
- Rolling delta must remain correct after entry add, edit, delete, and import.
- Archived goals must disappear from home and remain recoverable in Settings.
- Duplicate must never copy entries, history snapshots, or identifiers.
- Reorder must remain stable after app restart.
- Export then import on a clean device/database must round-trip without data loss.

## 8.2 Reliability gates

- Multi-step mutations use transactions where possible.
- Import has validate-before-write behavior.
- Snapshot reconciliation is idempotent.
- Pagination cannot skip or duplicate entries across page boundaries.

## 8.3 Performance gates

- Dashboard should not run one summary query per card after batching lands.
- Graph requests should only inspect the requested range or snapshots needed for it.
- Detail open should not load the full ledger in the final paginated state.

---

## 9. Work Package Overview

Relative size:

- `S`: small, focused change
- `M`: moderate, one solid PR or two small PRs
- `L`: larger work package, may need to be split into A/B but should still feel cohesive

| ID | Work Package | Size | Depends On | Primary Outcome |
| --- | --- | --- | --- | --- |
| WP01 | Characterization and guardrail tests | M | none | Create a safety net before refactors |
| WP02 | Goal analytics/repository boundary | M | WP01 | Move domain/query logic out of UI surfaces |
| WP03 | Schema and index migrations | M | WP01 | Add rolling fields and performance indexes |
| WP04 | Keyed invalidation and logging baseline | M | WP01 | Reduce global refetch noise and standardize logs |
| WP05 | Current tab scroll + grouped Recent Activity | M | WP01 | Fix overflow and improve current-period UX |
| WP06 | Graph domain math | M | WP02, WP03 | Produce bounded graph data correctly |
| WP07 | Graph UI component + ledger integration | M | WP05, WP06 | Ship the new graph visibly |
| WP08 | Rolling window form + validation | M | WP03 | Add rolling-window configuration safely |
| WP09 | Rolling surplus / deficit computation + UI | M | WP02, WP08 | Ship rolling analytics visibly |
| WP10 | Snapshot reconciliation for closed periods | L | WP02, WP03 | Make history/rolling scale safely |
| WP11 | Paginated history data layer | M | WP02, WP04, WP10 | Avoid full-ledger loads in detail |
| WP12 | Load more history UI + grouping continuity | S | WP11 | Make pagination usable |
| WP13 | Archive / unarchive behavior + home filtering | M | WP01, WP04 | Safer lifecycle management |
| WP14 | Archive manager in Settings | S | WP13 | Restore or permanently delete archived goals |
| WP15 | Duplicate goal | S | WP01, WP03 | Fast creation from existing setups |
| WP16 | Goal reordering | M | WP01, WP04, WP13 | Personalize dashboard order |
| WP17 | Batched dashboard summaries + last updated | M | WP02, WP04, WP13 | Faster home screen and freshness cues |
| WP18 | JSON backup export | M | WP03, WP10, WP13 | Safe backup creation |
| WP19 | JSON backup import | L | WP03, WP10, WP13, WP18 | Safe restore with validation |
| WP20 | Cleanup, hardening, and dead-code removal | M | all core work | Stabilize and reduce tech debt |

---

## 10. Detailed Work Packages

## WP01: Characterization and Guardrail Tests

### Objective

Add tests that lock in the current intended behavior before the larger refactor program begins.

### Requirements

- Cover current create/edit/add/delete flows that must not regress.
- Add baseline tests for the detail screen tab structure and home list rendering.
- Add failing tests for the known Current-tab overflow/grouping gap if practical at the component level.

### Tests to Write First

- `__tests__/components/goal-detail/CurrentPeriodView.test.tsx`
- `__tests__/components/goal-detail/HistoryLedgerView.test.tsx`
- `__tests__/components/GoalCard.test.tsx` updates where needed
- `__tests__/hooks/useGoalActions.test.ts` updates where needed
- `__tests__/hooks/useEntryActions.test.ts` updates where needed

### Implementation Notes

- Do not refactor production code first.
- Add fixtures/helpers if existing ones are too limited.
- Focus on the user-facing behavior that later work packages will rely on.

### Acceptance Criteria

- Existing core flows are covered well enough that later work can refactor confidently.
- At least one failing test exists for the current-tab grouping/scroll problem before WP05 implementation starts.

---

## WP02: Goal Analytics/Repository Boundary

### Objective

Extract domain/data responsibilities out of the current UI-hook pattern into reusable modules.

### Requirements

- Introduce a repository layer for direct goal/entry queries.
- Introduce an analytics layer for:
  - current summary
  - graph shaping
  - rolling calculations
  - history grouping/pagination helpers
  - snapshot reconciliation hooks
- Preserve current behavior while changing internal structure.

### Tests to Write First

- unit tests for analytics helpers
- repository tests for:
  - current period totals
  - latest entry per goal
  - ranged entry reads
  - archived vs active filtering

### Implementation Notes

- Start by moving existing logic, not rewriting it all at once.
- Keep UI hooks as thin adapters temporarily.
- Avoid changing UI output in this package except where needed for extraction.

### Acceptance Criteria

- Summary/history/graph/rolling computations have a clear non-UI home.
- New feature packages can build on this layer instead of adding more logic to route files and components.

---

## WP03: Schema and Index Migrations

### Objective

Prepare the schema for rolling analytics and scale-sensitive reads.

### Requirements

- Add nullable goal fields:
  - `rolling_window_value`
  - `rolling_window_unit`
- Add indexes:
  - `entries(goal_id, timestamp)`
  - `history_snapshots(goal_id, period_end)`
  - `goals(status, sort_order)`
- Update TypeScript domain types and DB schema accordingly.

### Tests to Write First

- migration smoke test or schema assertion tests
- tests that new fields round-trip correctly
- tests that old goals without rolling config still behave normally

### Implementation Notes

- Keep rolling fields nullable and backward-compatible.
- Do not add speculative columns unless clearly required.
- If migration testing is weak today, at minimum add deterministic startup validation.

### Acceptance Criteria

- App boots cleanly on existing data.
- New columns are available in create/edit flows after later packages.
- Indexes exist for the intended hot queries.

---

## WP04: Keyed Invalidation and Logging Baseline

### Objective

Replace "invalidate everything" behavior with scoped invalidation primitives and standardize logging usage.

### Requirements

- Add topic/key-based invalidation support.
- Keep a compatibility fallback if full invalidation is temporarily needed.
- Route new code through keyed invalidation.
- Replace the noisiest ad hoc `console.log` usage with the logger abstraction.

### Tests to Write First

- `db/query-cache` tests for key scoping
- hook tests proving only relevant subscribers refetch
- logger usage tests only where practical; otherwise lint/code review rule

### Implementation Notes

- Start with a simple keyed pub/sub model.
- Avoid overengineering a full query library.
- Preserve determinism in tests.

### Acceptance Criteria

- New analytics hooks do not rely on global full invalidation.
- Home/detail refresh behavior remains correct after entry and goal mutations.

---

## WP05: Current Tab Scroll + Grouped Recent Activity

### Objective

Fix the current detail-tab overflow and replace flat recent entries with grouped current-period sections.

### Requirements

- Current tab content must scroll.
- Header, summary card, and tab bar should remain stable.
- Recent Activity should use grouped current-period sections, not a flat `last 5` list.
- Empty/loading states must still be clear.

### Tests to Write First

- component tests for grouped current-period rendering
- tests for section headers and totals
- tests that more than five entries no longer truncate the primary activity view incorrectly

### Implementation Notes

- Prefer `SectionList` over `ScrollView` for grouped current-period entries.
- Reuse existing `groupedEntries` data from `useGoalEntries`.
- Consider whether the existing unused `LedgerView` can be adapted or superseded.

### Acceptance Criteria

- No content overflow on the Current tab.
- Current-period activity is grouped and readable.
- Manual Add and Quick Add remain prominent.

---

## WP06: Graph Domain Math

### Objective

Create the bounded graph computation layer modeled on Vision's strongest behavior.

### Requirements

- Support `7d`, `30d`, `90d`
- bucket by local day in the selected timezone
- sum counter entries per bucket
- zero-fill missing buckets
- return target alongside points

### Tests to Write First

- graph bucket-shaping unit tests similar to Vision's:
  - zero-filled missing days
  - multiple entries on same day
  - empty range
  - timezone boundary behavior
  - range length correctness

### Implementation Notes

- Keep graph data domain-only first; no UI yet.
- Make the graph function pure if possible.
- Avoid cumulative-series semantics in v1.

### Acceptance Criteria

- Graph points are correct and bounded for each requested range.
- Tests explicitly cover timezone-sensitive boundaries.

---

## WP07: Graph UI Component + Ledger Integration

### Objective

Ship the new graph visibly in Goal Counter.

### Requirements

- Create a touch-friendly graph card for Goal Counter.
- Place it at the top of the Ledger tab.
- Provide range switching.
- Show target line when a target exists.
- Provide point inspection on tap.

### Tests to Write First

- component tests for:
  - range switching
  - empty graph state
  - loading state
  - target line presence
  - point detail visibility after interaction

### Implementation Notes

- Use `react-native-svg`.
- Match Goal Counter styling rather than Vision's exact desktop card styling.
- Keep accessibility labels for range controls and points.

### Acceptance Criteria

- Ledger tab now contains a polished graph.
- Graph remains responsive and readable on phone-sized screens.

---

## WP08: Rolling Window Form + Validation

### Objective

Add rolling-window configuration to goal create/edit flows safely.

### Requirements

- Add optional rolling window inputs to create and edit flows.
- Only show/enable them when:
  - target exists or can be entered
  - reset is not lifetime
- Enforce v1 validation rules:
  - same unit family as reset cadence
  - whole multiple of goal reset cadence

### Tests to Write First

- validation unit tests for legal/illegal rolling windows
- create/edit form tests covering visibility and error states

### Implementation Notes

- Validation should live in a reusable helper, not inlined in route components.
- Use clear, user-facing validation messages.

### Acceptance Criteria

- Users can configure rolling windows correctly.
- Invalid rolling configurations are blocked before save.

---

## WP09: Rolling Surplus / Deficit Computation + UI

### Objective

Ship rolling surplus/deficit as a visible detail-screen feature.

### Requirements

- Calculate:
  - actual total in rolling window
  - expected total for the same window
  - delta
- Display clear states:
  - under
  - over
  - on pace
- Update correctly after entry add, edit, delete, and goal edit.

### Tests to Write First

- unit tests for rolling math:
  - daily example from the product brief
  - monthly windows
  - window edges
  - zero / exact-match cases
- hook/component tests for display wording and state updates

### Implementation Notes

- Keep display language concise.
- Do not show rolling output when configuration is absent or invalid.
- Start in detail view only.

### Acceptance Criteria

- Rolling status is correct, understandable, and stable after mutations.

---

## WP10: Snapshot Reconciliation for Closed Periods

### Objective

Start actually using `history_snapshots` to support scalable history and analytics.

### Requirements

- Create snapshots for closed periods.
- Store target-at-time with each snapshot.
- Reconcile gaps if the app has been inactive for multiple periods.
- Make reconciliation idempotent.

### Tests to Write First

- snapshot generation tests
- backfill gap tests
- tests for edits/deletes affecting current vs closed periods
- target-change tests proving historical values do not drift

### Implementation Notes

- Keep reconciliation rules explicit and deterministic.
- Avoid regenerating the entire history unnecessarily.
- Consider running reconciliation:
  - on goal load
  - after entry mutations
  - after target/reset changes

### Acceptance Criteria

- Closed-period history can be read from snapshots confidently.
- Re-running reconciliation does not create duplicates or corrupt history.

---

## WP11: Paginated History Data Layer

### Objective

Replace full-history loading in the detail experience with a bounded paginated model.

### Requirements

- Add paginated history reads for goal detail.
- Preserve descending order and grouping continuity.
- Ensure no skipped or duplicated entries across boundaries.

### Tests to Write First

- pagination cursor tests
- multi-page continuity tests
- tests for equal timestamps with stable tiebreaking

### Implementation Notes

- Cursor shape should include timestamp plus id for stable ordering.
- The first version can paginate raw entries and group in-memory per page if needed.
- Later snapshot integration can optimize older ranges further.

### Acceptance Criteria

- Detail open no longer requires loading the full ledger.
- Pagination is stable and deterministic.

---

## WP12: Load More History UI + Grouping Continuity

### Objective

Make the paginated history experience usable and coherent in the Ledger tab.

### Requirements

- Add a `Load more` control.
- Preserve group headings across page boundaries.
- Keep the graph and summary region unaffected.

### Tests to Write First

- component tests for load-more visibility and behavior
- tests that entries do not duplicate visually after loading more

### Implementation Notes

- Prefer a simple explicit load-more action over infinite scroll.
- Merge groups carefully if two pages touch the same visible period/day.

### Acceptance Criteria

- Users can extend history progressively without jarring regrouping.

---

## WP13: Archive / Unarchive Behavior + Home Filtering

### Objective

Introduce archive as the safe alternative to delete.

### Requirements

- Archive action available from goal edit/detail flow.
- Archived goals hidden from home dashboard by default.
- Unarchive supported later through Settings.
- Deletion remains permanent and explicit.

### Tests to Write First

- archive/unarchive repository tests
- dashboard filtering tests
- action-flow tests for archive from edit/detail

### Implementation Notes

- Use `status` rather than introducing a parallel archive model.
- Ensure archived goals do not lose entries or snapshots.

### Acceptance Criteria

- Archiving is safe, reversible, and immediately reflected in the UI.

---

## WP14: Archive Manager in Settings

### Objective

Provide a clear place to manage archived goals.

### Requirements

- Show archived goals list in Settings.
- Support:
  - unarchive
  - permanently delete
- Provide clear empty state and confirmation flows.

### Tests to Write First

- component tests for archived-goal listing
- tests for unarchive and delete actions

### Implementation Notes

- Keep the Settings screen usable and not overloaded.
- If needed, place archive management in its own section or nested screen.

### Acceptance Criteria

- Archived goals are recoverable without cluttering the main dashboard.

---

## WP15: Duplicate Goal

### Objective

Let users create a new goal from an existing configuration.

### Requirements

- Duplicate:
  - title
  - unit
  - target
  - reset config
  - quick adds
  - rolling window config if present
- Do not duplicate:
  - entries
  - snapshots
  - ids
  - status if source is archived unless explicitly intended

### Tests to Write First

- duplicate-goal repository tests
- UI action-flow tests if duplication is triggered from edit/detail

### Implementation Notes

- Consider appending `"Copy"` to the new title by default.
- Insert duplicated goals into a predictable dashboard position.

### Acceptance Criteria

- Duplicate creates a clean new goal setup without carrying over history.

---

## WP16: Goal Reordering

### Objective

Allow users to manually order active goals on the dashboard.

### Requirements

- Reorder from the home list.
- Persist stable order via `sortOrder`.
- Archived goals should not interfere with active goal ordering.

### Tests to Write First

- reorder persistence tests
- dashboard render-order tests
- edge cases for first/last movement and repeated reorder

### Implementation Notes

- Keep interaction simple and mobile-friendly.
- If drag-and-drop feels too heavy initially, use an edit/reorder mode with handles or move actions.
- Reordering logic should update only the affected records.

### Acceptance Criteria

- Goal order persists across app restarts and remains stable after archive/unarchive.

---

## WP17: Batched Dashboard Summaries + Last Updated

### Objective

Make the home dashboard cheaper and more informative.

### Requirements

- Replace per-card summary fetching with a batched list-level summary source.
- Add `last updated` derived from latest entry time.
- Keep current/remaining/countdown behavior correct.

### Tests to Write First

- batched-summary tests across multiple goals
- latest-entry tests
- component tests for last-updated display

### Implementation Notes

- Summary batching belongs in the analytics layer, not the card component.
- Keep cards presentational once the summary is provided.

### Acceptance Criteria

- Home screen does not perform per-card current-total fetching anymore.
- Freshness information is visible and correct.

---

## WP18: JSON Backup Export

### Objective

Allow users to create a portable backup of their data.

### Requirements

- Export versioned JSON containing:
  - goals
  - entries
  - history snapshots
  - settings
  - metadata/version
- User can save/share the backup file.

### Tests to Write First

- backup schema serialization tests
- round-trip serialization tests
- tests that archived goals and rolling config are included

### Implementation Notes

- Likely requires filesystem/share dependencies such as `expo-file-system` and `expo-sharing` if not already present.
- Keep the export schema explicit and versioned.

### Acceptance Criteria

- Exported backup is complete, parseable, and version-tagged.

---

## WP19: JSON Backup Import

### Objective

Allow users to restore from a validated backup safely.

### Requirements

- Select/import a JSON backup file.
- Validate the entire payload before writing.
- Fail safely with clear errors on malformed or unsupported backups.
- Restore should support a clean import flow without silent partial corruption.

### Tests to Write First

- backup validation tests
- unsupported-version tests
- malformed payload tests
- round-trip export/import tests on a clean database
- tests for duplicate ids/conflicts in restore mode

### Implementation Notes

- Likely requires document-picker support such as `expo-document-picker`.
- Prefer import into a transaction.
- Decide explicitly whether import:
  - replaces existing data
  - merges into existing data

Recommendation:

- first wave should be "replace current local data after confirmation"

### Acceptance Criteria

- Users can restore a valid backup reliably.
- Invalid imports never leave the database half-written without explicit recovery handling.

---

## WP20: Cleanup, Hardening, and Dead-Code Removal

### Objective

Stabilize the codebase after feature delivery and remove now-unhelpful scaffolding.

### Requirements

- remove or intentionally retain unused dependencies/components
- clean up Expo starter/tab boilerplate if it is truly unused
- standardize logger usage
- review and reduce noisy logs
- ensure docs reflect the delivered architecture

### Tests to Write First

- mostly regression-oriented targeted tests where cleanup affects behavior
- no broad "test everything" rewrite

### Implementation Notes

- Candidate cleanup targets:
  - `app/(tabs)` starter screens if confirmed unused
  - unused template components
  - now-obsolete hooks/components after analytics migration
  - dead graph or history helpers

### Acceptance Criteria

- The repo more closely reflects the real product.
- There is less unused scaffolding and less mental overhead.

---

## 11. Recommended Milestone Sequence

## Milestone 0: Foundations

- WP01
- WP02
- WP03
- WP04

Exit criteria:

- test guardrails exist
- analytics boundary exists
- schema/index groundwork exists
- scoped invalidation is available

## Milestone 1: Detail Experience and Graph

- WP05
- WP06
- WP07

Exit criteria:

- Current tab is fixed
- graph is visible in Ledger
- graph data is correct and bounded

## Milestone 2: Rolling and History Scale

- WP08
- WP09
- WP10
- WP11
- WP12

Exit criteria:

- rolling windows can be configured and displayed
- snapshots support closed-period correctness
- full-history loading is no longer required for detail growth

## Milestone 3: Goal Lifecycle

- WP13
- WP14
- WP15
- WP16

Exit criteria:

- archive, unarchive, duplicate, and reorder all work reliably

## Milestone 4: Dashboard and Backup

- WP17
- WP18
- WP19

Exit criteria:

- dashboard summaries are batched
- last updated is visible
- backup and restore are trustworthy

## Milestone 5: Hardening

- WP20

Exit criteria:

- codebase is cleaner, quieter, and easier to maintain

---

## 12. Suggested PR Strategy

General rules:

- one work package per PR where possible
- split `L` packages into sub-PRs only if the split is behaviorally clean
- do not combine unrelated UI and data refactors in one PR

Recommended split for larger items:

- WP10A: snapshot domain + tests
- WP10B: snapshot reconciliation integration
- WP19A: import validation + dry run
- WP19B: transactional restore UI flow

---

## 13. Manual QA Checklist by Theme

### Timezone and reset correctness

- create goals in different reset cadences
- log around local midnight
- switch app timezone
- verify current period, graph buckets, history grouping, and rolling delta remain correct

### Mutation correctness

- add/edit/delete entries
- duplicate a goal
- archive/unarchive a goal
- reorder goals repeatedly
- verify summaries and history refresh only where expected

### Backup reliability

- export with active and archived goals
- import into a clean database
- verify totals, history, rolling config, settings, and order match the original state

### Performance sanity

- many goals on home screen
- large history on one goal
- repeated graph range switching
- repeated load-more actions

---

## 14. Highest-Risk Areas

The riskiest parts of the program are:

1. timezone-aware graph and rolling calculations
2. snapshot reconciliation after edits/deletes
3. pagination continuity without duplicates or gaps
4. import safety and transactional restore behavior
5. reordering persistence that remains stable with archived goals

These areas deserve the strongest tests and the smallest PR slices.

---

## 15. Final Delivery Recommendation

If we stay disciplined about order, the safest path is:

1. foundations first
2. visible UX fixes second
3. analytics-heavy features on top of the new foundation
4. lifecycle quality-of-life after the data model is solid
5. backup only after schema and mutation semantics are stable

That gives us the best balance of:

- user-visible progress
- sound engineering
- lower regression risk
- lower long-term maintenance cost
