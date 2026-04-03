# Measurement Goal Design

## Purpose

Add a second goal type, `measurement`, alongside the existing `counter` type.

This should preserve the current Goal Counter experience for counters while
adding a clean measurement-tracking flow inspired by the tracker surface in
`vision-electron`.

## Product Decisions

### Goal types

- `counter`
  - existing Goal Counter behavior
  - resets by period
  - quick-add increment buttons
  - graph shows aggregated values by day
  - rolling surplus / deficit remains available

- `measurement`
  - tracks point-in-time values over time
  - never resets
  - no quick-add increment buttons
  - uses a numeric quick-log input instead
  - graph shows recorded measurement points spaced by actual timestamp
  - no rolling surplus / deficit

### Create flow

- The create screen gets a two-tab segmented control:
  - `Counter`
  - `Measurement`
- Tapping a tab switches form content.
- The content area is swipeable between the two forms.
- `Counter` stays visually and behaviorally equivalent to the current create flow.
- `Measurement` only asks for:
  - name
  - optional target
  - optional unit

### Edit flow

- Goal type is immutable after creation.
- Edit screen renders fields based on the stored goal type.
- Counter edit keeps current controls.
- Measurement edit only exposes:
  - name
  - optional target
  - optional unit

### Detail flow

- Counter detail remains the same product shape:
  - summary card
  - `Tracking` tab with manual add + quick adds + graph
  - `History` tab

- Measurement detail uses the same overall page shell, but different content:
  - summary card shows latest value, target distance, and freshness
  - `Tracking` tab shows:
    - quick-log numeric input
    - log button
    - measurement graph
  - `History` tab stays entry history only

### Dashboard cards

- Counter cards remain unchanged.
- Measurement cards show:
  - latest value as the primary metric
  - distance to target when target exists
  - a numeric quick-log input instead of quick-add buttons

## Data Model

### Schema

Add a `type` column to `goals`:

- `counter`
- `measurement`

Default existing rows to `counter`.

### Compatibility choice

To avoid a broad nullable quick-add migration, measurement rows will continue to
store compatibility values in the existing quick-add columns, but the UI and
behavior will ignore them when `type === "measurement"`.

This keeps the migration additive and lowers regression risk.

## Graph Model

### Ranges

Expand graph ranges for all goal types:

- `7d`
- `30d`
- `90d`
- `6m`
- `1y`
- `max`

### Counter graph

- keep current aggregated daily behavior
- keep zero-filled buckets
- keep target line behavior
- `max` spans from goal creation to now

### Measurement graph

- use actual entry timestamps as plotted points
- do not aggregate multiple days together
- do not zero-fill missing days
- use time-scaled x positions
- use the same visual card component, but with measurement-specific point labels

## Summary Semantics

### Counter

- primary value: current period total
- secondary value: remaining
- period start and countdown remain visible
- rolling summary remains visible when configured

### Measurement

- primary value: latest recorded measurement
- secondary value:
  - `To target` when target exists
  - otherwise no target-distance metric
- show `Last updated` style freshness info
- no period countdown
- no rolling summary

## History Grouping

- Counter history keeps current period grouping behavior.
- Measurement history reuses the lifetime history path.
- The single lifetime section should read as all-time measurement history rather
  than a “current period”.

## Implementation Notes

### Shared code changes

- extend domain type definitions with `goal.type`
- branch summary and graph behavior by goal type
- keep mutation helpers explicit rather than hiding type rules inside UI files

### New UI pieces

- create-form type tabs / swipe container
- measurement form fields
- measurement tracking input row

### Testing

Add focused coverage for:

- create/edit type-specific validation
- graph shaping for counter vs measurement
- new graph ranges
- measurement detail tracking UI
- measurement dashboard card
- compatibility of existing counter behavior
