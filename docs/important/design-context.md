# Design Document: Goal Counter (Numeric Ledger)

## 1. Executive Summary

Goal Counter is a minimalist, unit-agnostic utility app for tracking numeric progress. It replaces specialized trackers with a single "ledger" architecture. It prioritizes high-speed logging via "Quick Add" buttons and detailed record-keeping via "Manual Add with Notes."

---

## 2. Core Feature Specifications

### A. Goal Architecture

- **Attributes:**
  - **Title:** String (required).
  - **Unit:** String (optional, e.g., "kg", "mL", "kcal").
  - **Target:** Numeric/Float (optional, up to 2 decimal places).
  - **Reset Interval:** Value (Integer) + Unit (Days, Weeks, Months) OR **None**.
    - **Inclusive Reset Logic:** A "1 Week" goal created Wednesday at 2 PM treates Wednesday as "Day 1." It resets at **Midnight at the end of Tuesday** (the start of the following Wednesday).
    - **"None" (Lifetime):** Goals that never reset. History is aggregated by Month.
  - **Quick Add Slots:** 4 total. Index 0 is required. Indices 1-3 are optional.
- **State Management:** - **Manual Sorting:** User-defined order for active goals.
  - **Archiving:** Goals can be archived (hidden from Home but preserved in History).
  - **Deletion:** Option to permanently wipe a goal and its associated entries.

### B. The Logging System

- **Quick Add:**
  - Triggered via Home Card buttons. Creates entry: `{amount, note: null, timestamp: UTC_ISO8601}`.
  - UI: 3-second toast with **Undo** capability.
- **Manual Add (Detail Screen):**
  - **Focus Flow:** 1. Open Modal -> 2. Auto-focus "Amount" (Numeric Keypad) -> 3. "Continue" -> 4. Auto-focus "Note" (Text Keyboard) -> 5. "Done" to Save.
- **Entry Management:**
  - **Precision:** All numeric inputs support up to 2 decimal places.
  - **Editing:** Users can edit **Amount** and **Note**. **Timestamp** remains immutable.
  - **Collision:** Use unique UUIDs for entry IDs to prevent primary key collisions on rapid taps.

---

## 3. UI/UX Design

### A. Home Screen (Dashboard)

- **Visuals:** Minimalist, card-based, Light/Dark mode.
- **Card Content:** Title, Unit, Current Total, Target/Remaining (if exists), and a Countdown (e.g., "Resets in 14h 20m").
- **Interaction Row:** Single row of up to 4 Quick Add buttons. No text wrapping.

### B. Goal Details Screen (Tabbed)

1. **Tab: Current Period**
   - Summary of progress + "Manual Add +" button.
   - **Addition History:** List grouped by **Day** (if interval > 1 day).
   - Format: `[Local HH:MM] | [Amount] | [Note]`.
2. **Tab: History**
   - **Graph:** Blue shaded area for Actuals; Orange line for Target.
   - Target line must stay visible on top of blue area even if Actual > Target.
   - **Zero-Value Continuity:** Graph must plot "0" for periods where no data was entered.
   - **List:** Nested list of past periods/months.

### C. Settings Screen

- **Timezone Control:** Toggle between "System Local" and a "Source of Truth" timezone.
- **Archive Manager:** List of archived goals with the ability to "Unarchive" or "Permanently Delete."
- **Data Portability:** - **Export:** Robust JSON/CSV export of all goals and entries.
  - **Import:** Validated import to restore data from backup.

---

## 4. Technical Logic & Edge Cases

### A. Reset & Continuity

- **Back-filling:** If the app is inactive for multiple intervals, the app must generate empty `HistorySnapshot` records for the gap to ensure graph accuracy.
- **Snapshotting:** History records must store a `targetSnapshot` (the target at the end of that specific period) so changing future targets doesn't alter historical data.

### B. Timezones

- **Storage:** All timestamps stored in **UTC**.
- **Display:** Adapt to the user’s current local timezone dynamically unless a specific timezone is pinned in Settings.

### C. Performance

- **Reactive Recalculations:** Use optimized queries (e.g., SQLite `SUM`) to update history totals when an entry is edited or deleted.
