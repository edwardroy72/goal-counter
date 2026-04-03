# Goal Counter Improvement Plan

## Intent

This document compares the current `goal-counter` app with the equivalent tracker feature in `vision-electron`, then proposes a concrete plan to bring the strongest parts of the Vision tracker into Goal Counter without changing Goal Counter's overall visual identity.

Primary user goals:

1. Recreate the well-designed graph from `vision-electron` inside `goal-counter`.
2. Fix the non-scrollable goal detail experience so Recent Activity does not overflow.
3. Group Recent Activity into the right time buckets instead of showing a flat list.
4. Add an optional rolling surplus/deficit feature.
5. Bring in a small set of high-value, low-to-moderate complexity lifecycle and reliability features.
6. Identify broader app-level smells and larger improvement opportunities.

Design constraint:

- Preserve Goal Counter's current mobile-first visual language and interaction model.
- Import feature behavior and data patterns from Vision, not the entire desktop information architecture.

Approved secondary features to include in the forward plan:

- archive / unarchive goals
- duplicate goal
- paginated history / load more
- batched dashboard summaries
- last updated indicators
- archive manager in Settings
- export / import backup
- goal reordering

---

## 1. What Goal Counter Does Today

### Product behavior

`goal-counter` is currently a single-purpose numeric counter app:

- Home screen shows a list of goals as cards.
- Each goal has:
  - title
  - optional unit
  - optional target
  - reset cadence via `resetValue + resetUnit`
  - up to 4 quick-add amounts
- Users can:
  - create a goal
  - edit a goal
  - quick-add entries from the home card
  - open a detail screen
  - manually add, edit, and delete entries
  - view current-period activity and full history
  - choose a timezone in Settings

### Primary pathways

1. `app/index.tsx`
   - Fetches all goals directly from SQLite.
   - Renders `GoalCard` per goal in a `FlatList`.
2. `components/GoalCard.tsx`
   - Calculates current total via `useGoalTotal(goal)`.
   - Shows countdown, current value, remaining amount, and quick-add buttons.
3. `app/goal/[id].tsx`
   - Loads goal detail data.
   - Shows summary card and two tabs:
     - `current`
     - `ledger`
4. `components/goal-detail/CurrentPeriodView.tsx`
   - Manual Add button
   - Quick Add row
   - Recent Activity section
5. `components/goal-detail/HistoryLedgerView.tsx`
   - Full history grouped by period, then by day
6. `app/modal.tsx` and `app/goal/edit/[id].tsx`
   - Create/edit flows
7. `app/settings.tsx`
   - Timezone selection

### Data model

Current persisted tables in `goal-counter`:

- `goals`
- `entries`
- `history_snapshots`

Important observation:

- `history_snapshots` already exists in the schema, but it is not used anywhere in the live app.
- `goals.timezone` also exists in the schema, but the active source of truth is the global settings timezone, not the column on each goal.

### Current logic model

Goal Counter computes almost everything on the client:

- `useGoalTotal`
  - runs a `SUM(entries.amount)` query for the current goal and current period
- `useGoalEntries`
  - fetches current-period entries and groups them by day
- `useGoalHistory`
  - fetches all entries for the goal across its full history and then groups them in memory

### Current strengths

- Clean, focused product scope
- Good timezone awareness
- Flexible reset cadence via `resetValue + resetUnit`
- Fast quick-add workflow
- Nicely restrained mobile UI
- Full local-first behavior

### Current gaps relative to the original design intent

The existing codebase and the design notes do not fully match:

- The design doc mentions a graph, but no graph exists in the shipped detail experience.
- `react-native-gifted-charts` is installed but unused.
- `history_snapshots` is defined but unused.
- Goal archiving exists in schema/type shape but not in user-facing flows.
- Export/import described in docs is not implemented.

---

## 2. How the Equivalent Vision Tracker Works

### Product behavior

The Vision tracker feature is broader and more structured than Goal Counter:

- Trackers live on a dedicated `/tracker` page.
- Users can create either:
  - `counter`
  - `tracker` (measurement-style)
- Trackers open in a detail modal rather than a full screen.
- The detail modal includes:
  - summary metrics
  - quick-add actions
  - manual entry logging
  - graph
  - grouped history
  - edit mode
  - delete flows

### Primary pathways

1. `src/app/tracker/page.tsx`
   - Loads tracker list
   - Opens detail modal for a selected tracker
   - Loads graph and paginated ledger history only for the selected tracker
2. `src/components/tracker/tracker-home-card.tsx`
   - Summary card with quick-add and current/remaining metrics
3. `src/components/tracker/tracker-detail-modal.tsx`
   - Full tracker detail surface
   - Graph section
   - History section
   - Grouped entries
   - Load-more pagination
4. `src/components/tracker/tracker-graph.tsx`
   - Custom SVG chart
   - 7d / 30d / 90d range switching
   - dashed goal line
   - point tooltip interactions

### Data and service model

Vision does not compute tracker behavior directly in React components.

It has a layered flow:

- UI components
- selectors/view models
- tRPC router
- tracker service
- tracker repository
- Prisma / SQLite

Important tracker behaviors:

- Home summaries are derived in the service layer, not card-by-card in the UI.
- History is paginated via `getEntriesPage`.
- Graph data is bounded by explicit ranges via `getGraph`.
- Counter summaries use grouped aggregate queries.
- History grouping is period-aware.
- Graph series are shaped as daily buckets.

### Graph behavior in Vision

The current Vision graph already gives us a good target reference:

- 7 / 30 / 90 day range controls
- zero-filled missing buckets for counters
- dashed target line
- simple, readable axes
- compact but polished card presentation
- interactive point inspection

### History behavior in Vision

Vision groups history entries based on the tracker reset period:

- daily -> by day
- weekly -> by week
- monthly -> by month
- yearly -> by year
- none -> by month

This grouping is already closer to the behavior you want than Goal Counter's current flat Recent Activity list.

---

## 3. Similarities Between the Two Apps

Both features share the same core product idea:

- Track a named numeric entity with an optional unit and target.
- Provide fast logging via quick-add buttons.
- Show current progress and remaining amount.
- Use reset periods to frame the current value.
- Allow detailed history inspection.
- Support edit/delete of both containers and entries.
- Persist data locally in SQLite-backed storage.

This means we should not treat the work as a full rewrite. The domain overlap is strong enough to borrow patterns safely.

---

## 4. Key Differences

| Area | Goal Counter | Vision Tracker | Why it matters |
| --- | --- | --- | --- |
| Product type | Only counter-style goals | Counter + measurement trackers | Goal Counter only needs the counter branch |
| Reset model | `resetValue + resetUnit` (`day/week/month/none`) | fixed `resetPeriod` (`daily/weekly/monthly/yearly/none`) | Goal Counter is more flexible, but harder to graph/cache |
| Quick-add count | Up to 4 | Up to 3 | Minor UI difference |
| Navigation | Mobile full-screen routes | Desktop page + modal detail | We should preserve Goal Counter's full-screen mobile flow |
| Detail structure | Summary + tabs + modal add/edit | Summary + manual log + graph + history in one modal | Vision has richer information density |
| Recent activity | Flat last-5 entries in Current tab | Grouped history sections | Vision grouping is better |
| Graph | Missing | Implemented and polished | Main feature to import |
| History loading | Fetches full ledger every time | Paginated | Goal Counter will struggle as history grows |
| Summary loading | Per-card hook queries | Batched service-derived summaries | Goal Counter currently has N+1-style work on the dashboard |
| Data computation | Mostly UI-hook driven | Service/repository driven | Vision is better prepared for analytics features |
| Cache invalidation | Global "invalidate everything" pub/sub | Query-level invalidation through API utilities | Goal Counter will become noisy as more derived data is added |
| Snapshot support | Schema exists but unused | No period snapshot table, but bounded APIs | Goal Counter can use snapshots to solve rolling/history performance cleanly |
| Timezone control | Explicit user setting | Uses resolved environment timezone in service | Goal Counter is stronger here |

---

## 5. Exact Current Issues Blocking the Requested Work

### 5.1 Detail screen scroll bug

Current detail rendering is asymmetric:

- `HistoryLedgerView` is a `ScrollView`
- `CurrentPeriodView` is just a `View`
- `app/goal/[id].tsx` itself uses a non-scrolling root container

Result:

- When the Current tab contains enough content, the screen overflows instead of scrolling.
- The Recent Activity section is the visible symptom.

### 5.2 Recent Activity grouping is lossy

`CurrentPeriodView` currently does this:

- flatten grouped entries
- take last 5
- render a flat list

That means it throws away the grouping work done in `useGoalEntries`.

### 5.3 Graph feature is absent

Goal Counter currently has:

- no graph data hook
- no graph component
- no graph range control
- no graph caching strategy

### 5.4 Current history strategy will not scale well

`useGoalHistory` currently:

- loads all entries for a goal
- calculates all periods from creation until now
- repeatedly filters entries into those periods

This works for smaller ledgers, but it is not the right base for:

- graph range switching
- rolling surplus windows
- large histories
- low-cost detail refreshes

### 5.5 Dashboard summary work is duplicated

The home screen renders `GoalCard` for every goal, and every `GoalCard` runs `useGoalTotal`.

Implication:

- list rendering scales with per-card summary queries and per-card cache subscriptions
- the same invalidation event can trigger many independent fetches

---

## 6. Recommended Product Decisions

These decisions keep the implementation aligned with your stated constraint: preserve Goal Counter's design while importing Vision's stronger mechanics.

### Decision A: Place the graph in the Ledger tab

Recommendation:

- Keep the existing summary card and tabs.
- Add the graph at the top of the `ledger` tab above the grouped history list.

Why:

- Matches Goal Counter's current information hierarchy.
- Avoids bloating the Current tab.
- Aligns with the original design notes that treated graphing as a history/ledger concern.

### Decision B: Fix scrolling at the tab-content level, not the whole screen

Recommendation:

- Keep header + summary card + tab bar fixed.
- Make each tab content area independently scrollable.

Why:

- Better mobile ergonomics
- Preserves the feel of the current detail layout
- Avoids nested-scroll weirdness if we later add sticky graph/history headers

### Decision C: Interpret "group recent activity" as grouped current-period sections

Recommendation:

- Replace the flat Recent Activity list with grouped sections inside the Current tab.
- Use the existing current-period grouping as the basis.
- For v1, group by day within the current active period.

Why:

- It solves the current UX issue with minimal design disruption.
- It reuses data already produced by `useGoalEntries`.
- It aligns with how the Ledger tab already thinks about history.

### Decision D: Scope rolling surplus/deficit carefully for v1

Recommendation:

- Rolling surplus/deficit should only be available when:
  - the goal has a target
  - the goal is not lifetime (`resetUnit !== "none"`)
- The rolling window should be stored as an optional duration aligned with the goal cadence for v1.

Suggested v1 rule:

- `rollingWindowValue + rollingWindowUnit` must match the same unit family as the goal reset unit.
- The rolling window should be a whole multiple of the goal reset cadence.

Examples:

- goal resets every `1 day` -> rolling window can be `7 days`
- goal resets every `1 month` -> rolling window can be `3 months`
- goal resets every `2 weeks` -> rolling window can be `6 weeks`

Why:

- Keeps the math intuitive.
- Avoids ambiguous partial-period target proration.
- Covers the user examples cleanly.

Future enhancement:

- Cross-unit rolling windows can be added later, but they need explicit proration rules and stronger analytics infrastructure.

### Decision E: Add a small lifecycle management layer around goals

Recommendation:

- Add archive / unarchive, duplicate, and manual reordering as first-class goal lifecycle actions.

Why:

- The schema already points in this direction through `status` and `sortOrder`.
- These are high-value features that improve long-term usability without changing Goal Counter's core identity.
- They reduce accidental deletion pressure and make the app feel more complete.

Recommended UX:

- archive from edit/detail flows
- unarchive from a Settings-based archive manager
- duplicate from edit/detail flows
- reorder from the home list

### Decision F: Treat history pagination and dashboard batching as feature work, not just optimization

Recommendation:

- Promote paginated history and batched dashboard summaries into the main roadmap instead of deferring them as cleanup.

Why:

- They directly affect perceived quality once graphing and rolling analytics exist.
- They prevent new features from making the app feel slower over time.
- Vision already demonstrates the value of bounded graph/history loading and aggregated summary computation.

### Decision G: Scope export / import as backup-grade data portability first

Recommendation:

- Implement JSON export / import first.
- Treat CSV export as optional follow-up work rather than part of the first delivery wave.

Why:

- JSON backup/restore solves the highest-value portability and trust problem.
- It is easier to validate and round-trip safely than CSV.
- It keeps the surface area manageable while still materially improving the app.

---

## 7. Proposed Implementation Plan

## Phase 1: Stabilize the detail screen structure

### 1.1 Make the Current tab scrollable

Recommended change:

- Convert `CurrentPeriodView` from a plain `View` to a scrollable container.
- Prefer `SectionList` or `ScrollView` with grouped sections.

Recommendation:

- Use `SectionList` for the Current tab because it naturally fits grouped activity and scales better than a flat stack of views.

### 1.2 Rework Recent Activity into grouped sections

Recommended structure:

- Manual Add button
- Quick Add row
- Recent Activity
  - section header per day
  - entries under each day
  - optional section total

This can likely reuse the existing unused `LedgerView` ideas, but adapted for the Current tab rather than keeping an isolated flat "last 5 entries" list.

### 1.3 Keep the Ledger tab as the long-form history tab

Recommended short-term behavior:

- Leave the full grouped-history structure in place
- add graph above it
- later migrate ledger loading to a paginated model

---

## Phase 2: Import the Vision-style graph into Goal Counter

### 2.1 Graph behavior to preserve from Vision

Bring over these behaviors:

- range controls: `7d`, `30d`, `90d`
- target line
- bounded daily buckets
- zero-filled missing days for counters
- small tooltip/selection interaction
- clean axis/grid treatment

### 2.2 Recommended placement

- Add a `GoalGraphCard` at the top of the Ledger tab.

### 2.3 Recommended rendering approach

Recommendation:

- Implement a native Goal Counter graph with `react-native-svg`, using Vision's chart behavior as the reference.

Why not directly transplant Vision's graph component:

- Vision's graph is DOM/SVG/web-interaction oriented.
- Goal Counter needs touch-first interaction, not hover-first interaction.
- A native component lets us keep Goal Counter's spacing, typography, and card proportions intact.

Mobile-specific interaction recommendation:

- tap a point to show the value/date
- tap outside to clear selection
- no hover dependency

### 2.4 Recommended graph data contract

Create a bounded graph hook/service, for example:

- `useGoalGraph(goalId, range)`

Return shape:

- `points: { bucketStart: Date; value: number }[]`
- `target: number | null`
- `range: "7d" | "30d" | "90d"`

For counters:

- bucket by local day in the selected timezone
- sum entries per day
- zero-fill missing days

### 2.5 Keep graph semantics intentionally simple

For v1, the graph should represent daily movement, not cumulative lifetime accumulation.

Why:

- This matches Vision's graph behavior.
- It is easier to read at a glance.
- It works well with recent rolling analysis.

---

## Phase 3: Add rolling surplus/deficit

## Desired product behavior

If a goal has:

- a target
- a resetting cadence
- an optional rolling window

then the detail screen should show a rolling status such as:

- `150 under over the last 7 days`
- `80 over over the last 30 days`

### 3.1 Proposed schema changes

Add nullable fields to `goals`:

- `rollingWindowValue`
- `rollingWindowUnit`

Optional alternative:

- `rollingWindowPeriods`

Recommendation:

- Use `rollingWindowValue + rollingWindowUnit` because it matches how the user thinks about the feature.

### 3.2 Recommended validation rules

For v1:

- require `target !== null`
- require `resetUnit !== "none"`
- require rolling unit to match the goal reset unit family
- require rolling value to be a whole multiple of the goal reset cadence

Examples:

- `goal reset: 1 day`, `rolling: 7 days` -> valid
- `goal reset: 1 month`, `rolling: 3 months` -> valid
- `goal reset: 2 weeks`, `rolling: 5 weeks` -> invalid for v1

### 3.3 Recommended calculation model

At time `now`:

- `actualWindowTotal = sum(entries.amount in rolling window)`
- `expectedWindowTotal = target * numberOfGoalPeriodsInWindow`
- `rollingDelta = actualWindowTotal - expectedWindowTotal`

Display:

- positive -> surplus / over
- negative -> deficit / under
- zero -> on pace

### 3.4 Where to show it

Recommended placements:

- summary/detail screen under the main summary metrics
- optional smaller indicator on the home card later, but not required in phase 1

Recommendation:

- Detail screen first
- home-card version only after the analytics layer is efficient enough

---

## Phase 4: Make the data layer support the new features properly

This is the most important technical recommendation in the document.

If we bolt graphing and rolling windows onto the current hook-only data flow, Goal Counter will work for a while but become expensive and noisy.

### 4.1 Introduce an analytics boundary for goals

Recommendation:

- Add a small goal analytics layer between UI hooks and raw DB calls.

Possible shape:

- `goal-repository.ts`
- `goal-analytics.ts`
- hooks that call those modules rather than embedding all query logic inside components

This does not need a full tRPC/server architecture like Vision. It just needs one place for summary/graph/history math.

### 4.2 Use `history_snapshots` for closed periods

This is the cleanest existing asset in the codebase that is currently unused.

Recommendation:

- Use `history_snapshots` to store closed-period totals and target snapshots.
- Reconcile/backfill missing snapshots whenever a goal is loaded or mutated.

Benefits:

- graph generation becomes cheaper for longer views
- rolling windows can use snapshots plus current-period totals
- history no longer needs to derive everything from raw entries forever
- changing targets later does not rewrite historical context

### 4.3 Add proper indexes

Current hot queries need indexes.

Recommended indexes:

- `entries(goal_id, timestamp)`
- `history_snapshots(goal_id, period_end)`
- `goals(status, sort_order)`

Without these, graph/history/rolling queries will degrade as data grows.

### 4.4 Replace global "invalidate everything" with keyed invalidation

Current cache invalidation is broad:

- any write notifies every subscriber

Recommendation:

- move to keyed invalidation such as:
  - `goal:list`
  - `goal:{id}:summary`
  - `goal:{id}:entries:current`
  - `goal:{id}:history`
  - `goal:{id}:graph:{range}`
  - `goal:{id}:rolling`

This will matter a lot once graph + rolling + grouped history all exist.

### 4.5 Batch home-card summaries

Recommendation:

- replace per-card `useGoalTotal` fetching with a single list-level summary fetch for all visible goals

Why:

- current dashboard work scales with number of goals
- a single aggregate pass is closer to Vision's more scalable summary model

---

## Phase 5: Add goal lifecycle quality-of-life features

### 5.1 Archive / unarchive goals

Recommendation:

- Use the existing `status` field to support archiving.
- Filter archived goals out of the home dashboard by default.
- Preserve full history and allow restoration.

Why:

- This is safer than deletion and already aligns with the schema.

### 5.2 Archive manager in Settings

Recommendation:

- Add an archived goals section to Settings.
- Support:
  - unarchive
  - permanently delete

Why:

- Keeps the main dashboard clean while still making archived data recoverable.

### 5.3 Duplicate goal

Recommendation:

- Add a duplicate action that copies:
  - title
  - unit
  - target
  - reset config
  - quick-add amounts
  - rolling settings if present
- Do not copy entries/history.

Why:

- This is cheap to build and very useful for repeated tracking setups.

### 5.4 Goal reordering

Recommendation:

- Add manual reordering on the home screen and persist via `sortOrder`.

Why:

- `sortOrder` already exists.
- This makes the dashboard more personally useful without changing the product model.

---

## Phase 6: Scale the day-to-day experience

### 6.1 Paginated history / load more

Recommendation:

- Replace full-history loading with bounded pages or chunks.
- Start with a simple `load more` model rather than infinite scroll.

Why:

- This keeps the ledger responsive as histories grow.
- It matches one of the most valuable practical ideas from Vision.

### 6.2 Batched dashboard summaries

Recommendation:

- Build a dashboard summary query/hook that returns all active goal summaries in one pass.

Why:

- Prevents per-card duplicated work
- becomes increasingly important once last-updated, rolling, and archive filtering all exist

### 6.3 Last updated indicator

Recommendation:

- Show "last updated" on the home card and/or detail header/summary.

Why:

- Small feature, large trust win
- helps users instantly understand freshness and stale goals

---

## Phase 7: Add backup-grade data portability

### 7.1 Export

Recommendation:

- Support JSON export of goals, entries, settings, and relevant metadata.

### 7.2 Import

Recommendation:

- Support validated JSON import with clear conflict/error handling.

Why:

- Backup/restore meaningfully improves trust in a personal-tracking app.
- It is one of the highest-value "second wave" features even though it is not part of the daily logging loop.

---

## 8. Suggested Final Architecture for the Requested Features

### Detail screen

- Summary card
- Tab bar
- Current tab
  - Manual Add
  - Quick Add
  - Grouped current-period activity
- Ledger tab
  - Graph card
  - Rolling surplus/deficit card or summary row
  - Grouped history
  - Later: pagination/load-more if history grows large

### Goal lifecycle and dashboard

- Home dashboard
  - active goals only
  - manual reordering
  - last updated visibility
  - batched summaries
- Goal detail/edit flows
  - archive
  - duplicate
- Settings
  - archive manager
  - backup / restore entry points

### Data responsibilities

- `useGoalSummary(goalId)`
  - current total
  - remaining
  - next reset
  - rolling delta
- `useGoalCurrentActivity(goalId)`
  - grouped current-period entries
- `useGoalGraph(goalId, range)`
  - bounded daily series
- `useGoalHistoryPage(goalId, cursor?)`
  - paginated grouped history, eventually

---

## 9. Broader Smells and Overhaul Opportunities

These are not all blockers for the requested feature work, but they are worth calling out.

### 9.1 Direct DB logic is spread across UI hooks and screens

Current state:

- query logic lives in route files and hooks
- business rules are duplicated in multiple places

Impact:

- harder to extend safely
- harder to performance-optimize consistently

Recommendation:

- extract a goal analytics/service layer before or during the graph/rolling work

### 9.2 Global invalidation is too blunt

Current state:

- all writes invalidate everything

Impact:

- noisy refetches
- increasingly wasteful as feature richness grows

### 9.3 Full-history loading is not sustainable

Current state:

- `useGoalHistory` fetches the entire ledger for a goal every time

Impact:

- detail screens get heavier over time
- rolling/graph features would pile more work on top

### 9.4 Unused schema + unused dependency + unused starter code

Current state:

- `history_snapshots` exists but is unused
- `react-native-gifted-charts` is installed but unused
- Expo starter/tab boilerplate still exists under `app/(tabs)` and related template components
- there is an unused `LedgerView` component that already points toward a better grouped-list shape

Impact:

- higher app size / mental overhead
- makes the codebase feel less intentional than the product

Recommendation:

- either use these assets intentionally or remove them

### 9.5 Logging is inconsistent

Current state:

- a centralized logger exists
- much of the app still uses scattered `console.log` / `console.error`

Recommendation:

- standardize logging before release hardening

### 9.6 Schema/app mismatch

Current state:

- `goals.status` and archived semantics exist at the type/schema layer
- `goals.timezone` exists in schema
- current UI mostly ignores both

Recommendation:

- either finish these features or simplify the schema to match the actual app

### 9.7 Missing regression coverage for the new feature set

Before implementation is complete, we should add tests for:

- current-tab scrolling
- grouped recent activity rendering
- graph bucket shaping and zero-fill behavior
- rolling surplus/deficit math
- rolling window validation rules
- snapshot backfill/reconciliation
- archive / unarchive filtering
- duplicate goal correctness
- goal reordering persistence
- paginated history continuity and cursoring
- batched summary accuracy
- backup export / import validation and round-tripping

---

## 10. Recommended Delivery Order

### Option A: Fastest visible wins

1. Fix Current tab scrolling
2. Group Recent Activity by day
3. Add graph component and bounded graph hook
4. Add rolling surplus/deficit
5. Refactor analytics/caching afterward

Pros:

- fastest user-visible progress

Cons:

- higher chance of rework
- performance/caching debt will compound

### Option B: Recommended order

1. Introduce a small goal analytics layer
2. Add indexes and snapshot reconciliation groundwork
3. Fix Current tab scrolling and grouped Recent Activity
4. Build the graph on the new analytics layer
5. Add rolling surplus/deficit on top of the same layer
6. Add paginated history and dashboard summary batching
7. Add archive / unarchive, duplicate, and reordering
8. Add archive manager in Settings
9. Add backup export / import
10. Tighten cache invalidation and final hardening

Pros:

- better long-term foundation
- lower rework risk
- cleaner path for future archive/export/history improvements

Recommendation:

- choose Option B

---

## 11. Final Recommendation

The best path is not to "port Vision into Goal Counter." The best path is to keep Goal Counter's mobile design and import the parts of Vision that are clearly better engineered:

- bounded graph ranges
- grouped history presentation
- summary computation outside the UI surface
- paginated/bounded data loading patterns

Alongside that, the most worthwhile non-graph additions are:

- archive / unarchive
- duplicate goal
- manual reordering
- batched home summaries
- backup-grade export / import

For the new rolling surplus/deficit feature, Goal Counter should lean on its existing but unused `history_snapshots` concept instead of trying to brute-force everything from raw entries forever.

If we do that, the resulting app will:

- still feel like Goal Counter
- gain the best part of the Vision tracker
- remain fast as data grows
- have a clear path toward future history/export/archive improvements

---

## 12. Immediate Next Build Steps

1. Refactor detail-tab content so the Current tab scrolls and Recent Activity is sectioned.
2. Add a goal analytics module for bounded graph series and rolling-window totals.
3. Build a native `GoalGraphCard` modeled on Vision's graph, placed in the Ledger tab.
4. Add rolling window fields to goal creation/edit flows with v1-compatible validation.
5. Activate `history_snapshots` reconciliation and add indexes before rolling history gets large.
6. Follow with paginated history, batched dashboard summaries, and archive / duplicate / reorder support.
7. Finish with archive management in Settings and validated JSON backup / restore.
