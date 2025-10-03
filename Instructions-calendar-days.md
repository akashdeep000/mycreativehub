# Monthly Content Calendar V3: Days Persistence Bug Fix Plan

## Problem Statement

Calendar day entries (adding/editing/deleting entries in the grid) sometimes disappear after leaving and returning to the page. The last change is often lost after navigation or refresh. **Colour Keys are already fixed and working correctly.**

---

## 1. Investigation Summary

### Current State

✅ **Working:** Color Key edits persist correctly (add, edit, delete, color changes)  
❌ **Broken:** Calendar day entries sometimes lost (add entry, edit notes)  
✅ **Partially Working:** Delete entry works (saves immediately)

---

## 2. Data Flow Analysis: Calendar Days

### 2.1 Add Entry Flow

**File:** `client/src/pages/monthly-content-calendar-v3.tsx`, lines 204-227

```typescript
const addCalendarEntry = (date: number, colorKeyId: string) => {
  // 1. Create new entry object
  const newEntry: CalendarEntry = {
    id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    colorKeyId,
    notes: ''
  };

  // 2. Find day or create new day
  const dayIndex = days.findIndex(d => d.date === date);
  let updatedDays: CalendarDay[];

  if (dayIndex >= 0) {
    updatedDays = [...days];
    updatedDays[dayIndex] = {
      ...updatedDays[dayIndex],
      entries: [...updatedDays[dayIndex].entries, newEntry]
    };
  } else {
    updatedDays = [...days, { date, entries: [newEntry] }];
  }

  // 3. Update local cache optimistically
  const updatedData = { ...(calendarData as any), days: updatedDays };
  queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
  
  // 4. Schedule debounced save (1000ms delay)
  debouncedSave();  // ⚠️ PROBLEM: Can be lost if user navigates before 1000ms
};
```

**Status:** ⚠️ Uses `debouncedSave()` with 1000ms delay - **vulnerable to data loss on navigation**

---

### 2.2 Edit Entry Notes Flow

**File:** `client/src/pages/monthly-content-calendar-v3.tsx`, lines 229-242

```typescript
const updateEntryNotes = (date: number, entryId: string, notes: string) => {
  // 1. Find the day
  const dayIndex = days.findIndex(d => d.date === date);
  if (dayIndex === -1) return;

  // 2. Find and update the entry
  const updatedDays = [...days];
  const entryIndex = updatedDays[dayIndex].entries.findIndex(e => e.id === entryId);
  if (entryIndex === -1) return;

  updatedDays[dayIndex].entries[entryIndex].notes = notes;

  // 3. Update local cache optimistically
  const updatedData = { ...(calendarData as any), days: updatedDays };
  queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
  
  // 4. Schedule debounced save (1000ms delay)
  debouncedSave();  // ⚠️ PROBLEM: Can be lost if user navigates before 1000ms
};
```

**Called by:** `handleNotesEdit()` (line 387) when user clicks "Save" in notes dialog

**Status:** ⚠️ Uses `debouncedSave()` with 1000ms delay - **vulnerable to data loss on navigation**

---

### 2.3 Delete Entry Flow

**File:** `client/src/pages/monthly-content-calendar-v3.tsx`, lines 244-266

```typescript
const deleteEntry = (date: number, entryId: string) => {
  // 1. Find the day
  const dayIndex = days.findIndex(d => d.date === date);
  if (dayIndex === -1) return;

  // 2. Remove the entry
  const updatedDays = [...days];
  updatedDays[dayIndex].entries = updatedDays[dayIndex].entries.filter(e => e.id !== entryId);

  // 3. Remove day if no entries left
  if (updatedDays[dayIndex].entries.length === 0) {
    updatedDays.splice(dayIndex, 1);
  }

  // 4. Update local cache optimistically
  const updatedData = { ...(calendarData as any), days: updatedDays };
  queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
  
  // 5. Save IMMEDIATELY (no debounce delay)
  saveCalendarData.mutate({
    year,
    month,
    colorKeys: updatedData.colorKeys,
    days: updatedData.days,
  });  // ✅ WORKS: Immediate save, no debounce
};
```

**Status:** ✅ Saves immediately without debounce - **works correctly**

---

## 3. API Endpoint Verification

### 3.1 Save Mutation

**File:** `client/src/pages/monthly-content-calendar-v3.tsx`, lines 150-170

```typescript
const saveCalendarData = useMutation({
  mutationFn: (data: { year: number; month: number; colorKeys: ColorKey[]; days: CalendarDay[] }) => {
    setSaveStatus('saving');
    return apiRequest(`/api/calendar-v3/${data.year}/${data.month}`, {  // ✅ Correct route
      method: 'PUT',
      body: JSON.stringify(data),  // ✅ Includes days
      headers: { 'Content-Type': 'application/json' },
    });
  },
  onSuccess: () => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  },
  onError: (error) => {
    console.error('Save error:', error);
    console.error('Error details:', { year, month, colorKeysCount: colorKeys.length });
    setSaveStatus('idle');
    toast({ title: "Failed to save calendar", variant: "destructive" });
    queryClient.invalidateQueries({ queryKey: ['/api/calendar-v3', year, month] });
  },
});
```

**Request Body Includes:**
- ✅ `year` (number)
- ✅ `month` (number)
- ✅ `colorKeys` (array)
- ✅ `days` (array) - **CONFIRMED: days are in the request**
- ❌ No `version` field (not using optimistic concurrency yet)

**Status:** ✅ Correct endpoint, correct body

---

### 3.2 Backend Route

**File:** `server/routes.ts`, lines 2810-2854

```typescript
app.put('/api/calendar-v3/:year/:month', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const { colorKeys, days } = req.body;  // ✅ Extracts days from body
    
    console.log('Calendar V3 PUT - Received data:', {
      userId, year, month,
      colorKeysCount: Array.isArray(colorKeys) ? colorKeys.length : 0,
      daysCount: Array.isArray(days) ? days.length : 0  // ✅ Logs days count
    });
    
    const calendar = await storage.upsertCalendarV3({
      userId, year, month,
      colorKeys: colorKeys || [],
      days: days || []  // ✅ Saves days to database
    });
    
    res.json({
      userId: calendar.userId,
      year: calendar.year,
      month: calendar.month,
      colorKeys: calendar.colorKeys || [],
      days: calendar.days || []  // ✅ Returns days in response
    });
  } catch (error) {
    console.error('Error saving calendar v3:', error);
    res.status(500).json({ message: 'Failed to save calendar data' });
  }
});
```

**Status:** ✅ Correct - extracts `days`, saves to DB, returns in response

---

### 3.3 Database Storage

**File:** `server/storage.ts`, lines 1885-1918

```typescript
async upsertCalendarV3(data: InsertCalendarV3): Promise<CalendarV3> {
  const [calendar] = await db
    .insert(calendarV3)
    .values({
      ...data,
      colorKeys: (Array.isArray(data.colorKeys) ? data.colorKeys : []) as any,
      days: (Array.isArray(data.days) ? data.days : []) as any,  // ✅ Saves days
    })
    .onConflictDoUpdate({
      target: [calendarV3.userId, calendarV3.year, calendarV3.month],
      set: {
        colorKeys: (Array.isArray(data.colorKeys) ? data.colorKeys : []) as any,
        days: (Array.isArray(data.days) ? data.days : []) as any,  // ✅ Updates days
        updatedAt: new Date(),
      },
    })
    .returning();
  return calendar;
}
```

**Status:** ✅ Correct - uses PostgreSQL upsert with last-write-wins strategy

---

### 3.4 Database Schema

**File:** `shared/schema.ts`, lines 974-985

```typescript
export const calendarV3 = pgTable("calendar_v3", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  colorKeys: jsonb("color_keys").$type<ColorKeyV3[]>().notNull().default(sql`'[]'::jsonb`),
  days: jsonb("days").$type<CalendarDayV3[]>().notNull().default(sql`'[]'::jsonb`),  // ✅
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("calendar_v3_user_year_month_idx").on(table.userId, table.year, table.month)
]);
```

**Status:** ✅ Correct - `days` column is JSONB, stores array of CalendarDayV3

---

## 4. Root Cause: Debounce Timing Bug

### 4.1 The Debounced Save Function

**File:** `client/src/pages/monthly-content-calendar-v3.tsx`, lines 139-148

```typescript
const debouncedSave = useDebounce(() => {
  if (!calendarData) return;
  saveCalendarData.mutate({
    year,
    month,
    colorKeys: colorKeys,
    days: days  // ✅ Days are included in save
  });
}, 1000);  // ⚠️ 1000ms delay = 1 second window for data loss
```

**Status:** ✅ Includes days in save, ❌ but has 1000ms delay vulnerability

---

### 4.2 The useDebounce Hook

**File:** `client/src/hooks/use-debounce.ts`, lines 1-21

```typescript
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);  // Cancels previous save
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);  // Only runs after 1000ms of inactivity
      }, delay);
    },
    [callback, delay]
  );
}
```

**Critical Flaw:** 
- ❌ No `flush()` method to force immediate execution
- ❌ No unmount cleanup to save pending changes
- ❌ Timeout is simply abandoned when component unmounts

---

### 4.3 Unmount Cleanup Analysis

**File:** `client/src/pages/monthly-content-calendar-v3.tsx`

**Current useEffect hooks:**
1. Lines 126-137: Color picker click outside handler only

**Missing:**
- ❌ No unmount cleanup effect
- ❌ No visibilitychange listener
- ❌ No beforeunload listener
- ❌ No flush on navigation

**Result:** When user navigates away, pending debounced saves are **lost forever**.

---

## 5. Data Loss Scenarios

### Scenario 1: Add Entry + Quick Navigation

```
Timeline:
0ms    → User clicks calendar day, addCalendarEntry() called
0ms    → debouncedSave() schedules save for 1000ms from now
500ms  → User clicks "Back to Content Creation"
500ms  → Component unmounts, timeout is cleared
∞      → Save NEVER happens

Result: Entry appears in UI but is LOST from database
```

---

### Scenario 2: Edit Notes + Browser Refresh

```
Timeline:
0ms    → User opens notes dialog, types "Important notes"
0ms    → User clicks "Save" button
0ms    → handleNotesEdit() → updateEntryNotes() → debouncedSave()
0ms    → Dialog closes (user thinks it's saved)
800ms  → User hits F5 to refresh
800ms  → Component unmounts, timeout is cleared
∞      → Save NEVER happens

Result: Notes appear saved but are LOST from database
```

---

### Scenario 3: Multiple Rapid Adds

```
Timeline:
0ms    → User adds entry to day 1, debouncedSave() schedules for 1000ms
200ms  → User adds entry to day 2, debouncedSave() RESTARTS timer
400ms  → User adds entry to day 3, debouncedSave() RESTARTS timer
600ms  → User navigates away
600ms  → Component unmounts, timeout is cleared
∞      → Save NEVER happens

Result: All 3 entries LOST from database
```

---

## 6. Version/Conflict Handling Analysis

### Current State

**No versioning implemented** - Calendar V3 does NOT use optimistic concurrency control

**Database schema:** No `version` column (unlike Cheat Sheet feature which has versioning)

**Backend strategy:** Last-write-wins via `onConflictDoUpdate`

**Frontend:** No 409 conflict handling

**Implications:**
- ✅ Simple implementation
- ❌ Multi-tab edits can clobber each other
- ❌ No conflict detection

**For this bug fix:** Versioning is NOT the problem. The issue is debounce flush, not concurrent edits.

---

## 7. Implementation Plan

### Goal

**Flush pending debounced saves on:**
1. Component unmount (navigation away)
2. Browser refresh/close (beforeunload)
3. Tab switch (visibilitychange)

**Without breaking:**
- Existing color key behavior (immediate saves)
- Delete entry behavior (immediate saves)
- Normal debounce behavior (batch rapid edits)

---

### Phase 1: Update useDebounce Hook (10 min)

**File:** `client/src/hooks/use-debounce.ts`

**Action:** Replace entire file with enhanced version that supports flush

**New Implementation:**

```typescript
import { useCallback, useRef } from 'react';

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): {
  debounced: (...args: Parameters<T>) => void;
  flush: () => void;
  cancel: () => void;
} {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const argsRef = useRef<Parameters<T> | null>(null);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    argsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (argsRef.current) {
      callback(...argsRef.current);
      argsRef.current = null;
    }
  }, [callback]);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      argsRef.current = args;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        argsRef.current = null;
      }, delay);
    },
    [callback, delay]
  );

  return { debounced, flush, cancel };
}
```

**Key Changes:**
1. Store pending arguments in `argsRef`
2. Add `flush()` method to immediately execute pending callback
3. Add `cancel()` method to clear without executing
4. Return object `{ debounced, flush, cancel }` instead of just function

---

### Phase 2: Update Calendar Component (20 min)

**File:** `client/src/pages/monthly-content-calendar-v3.tsx`

#### Change 2.1: Update debouncedSave usage (line 139)

**Before:**
```typescript
const debouncedSave = useDebounce(() => {
  if (!calendarData) return;
  saveCalendarData.mutate({
    year,
    month,
    colorKeys: colorKeys,
    days: days
  });
}, 1000);
```

**After:**
```typescript
const { debounced: debouncedSave, flush: flushSave } = useDebounce(() => {
  if (!calendarData) return;
  saveCalendarData.mutate({
    year,
    month,
    colorKeys: colorKeys,
    days: days
  });
}, 1000);
```

---

#### Change 2.2: Add unmount cleanup effect (insert after line 137)

**Location:** After the color picker useEffect, before debouncedSave

**Code to add:**

```typescript
  // Flush pending saves on unmount or visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSave();
      }
    };

    const handleBeforeUnload = () => {
      flushSave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      flushSave();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushSave]);
```

**Why each listener:**
- `visibilitychange`: Saves when user switches tabs or minimizes window
- `beforeunload`: Saves when user refreshes or closes browser
- `return cleanup`: Saves when component unmounts (navigation)

---

#### Change 2.3: Update debouncedEditKeySave usage (line 289)

**Before:**
```typescript
const debouncedEditKeySave = useDebounce((keyId: string, value: string) => {
  if (value.trim()) {
    updateColorKey(keyId, { label: value.trim() });
  }
}, 50);
```

**After:**
```typescript
const { debounced: debouncedEditKeySave } = useDebounce((keyId: string, value: string) => {
  if (value.trim()) {
    updateColorKey(keyId, { label: value.trim() });
  }
}, 50);
```

**Note:** We don't need `flush` for color keys because `updateColorKey()` already saves immediately.

---

### Phase 3: Testing (30 min)

#### Test 1: Add Entry + Immediate Navigation

**Steps:**
1. Open Monthly Content Calendar
2. Click a calendar day to add an entry (select any color key)
3. **Immediately** click "Back to Content Creation" (within 0.5 seconds)
4. Navigate back to Monthly Content Calendar

**Expected:** ✅ Entry is still present

**Why:** `flushSave()` executes on unmount, saving the entry before navigation completes

---

#### Test 2: Edit Notes + Quick Refresh

**Steps:**
1. Add an entry to a calendar day
2. Click the entry to open notes dialog
3. Type "Test notes 12345"
4. Click "Save" button
5. **Immediately** hit F5 to refresh (within 0.5 seconds)
6. Check the entry after page reload

**Expected:** ✅ Notes are "Test notes 12345"

**Why:** `flushSave()` executes on beforeunload, saving notes before refresh

---

#### Test 3: Multiple Rapid Adds + Navigation

**Steps:**
1. Quickly add 5 entries to different calendar days (click-click-click)
2. **Immediately** navigate to a different page
3. Navigate back to calendar

**Expected:** ✅ All 5 entries are present

**Why:** Debounce groups all edits, then `flushSave()` on unmount saves all at once

---

#### Test 4: Tab Switch

**Steps:**
1. Add a calendar entry
2. **Immediately** switch to another browser tab (Cmd+Tab or Ctrl+Tab)
3. Wait 10 seconds
4. Switch back to calendar tab
5. Refresh the page

**Expected:** ✅ Entry is still present

**Why:** `flushSave()` executes on visibilitychange when tab becomes hidden

---

#### Test 5: Delete Entry (Regression Test)

**Steps:**
1. Add an entry
2. Open notes dialog
3. Click "Delete Entry"
4. **Immediately** navigate away
5. Navigate back to calendar

**Expected:** ✅ Entry is deleted (not restored)

**Why:** Delete already saves immediately, should work as before

---

#### Test 6: Color Key Edit (Regression Test)

**Steps:**
1. Edit a color key label to "Modified Tag"
2. **Immediately** navigate away
3. Navigate back to calendar

**Expected:** ✅ Label is "Modified Tag"

**Why:** Color keys save immediately, should work as before

---

#### Test 7: Browser Console Check

**Steps:**
1. Open browser DevTools → Console tab
2. Add 2 calendar entries rapidly
3. Navigate away immediately
4. Check console for save logs

**Expected Logs:**
```
Calendar V3 PUT - Received data: { userId: '...', year: 2025, month: 1, daysCount: 2 }
CalendarV3 UPSERT - Saving data: { daysCount: 2 }
```

✅ **Verify:** PUT request was sent with `daysCount: 2`

---

#### Test 8: Database Verification

**SQL Query:**
```sql
SELECT user_id, year, month, 
       jsonb_array_length(days) as days_count,
       jsonb_pretty(days) as days_data,
       updated_at
FROM calendar_v3
WHERE user_id = 'YOUR_USER_ID' AND year = 2025 AND month = 1;
```

**Steps:**
1. Add 3 entries to calendar
2. Navigate away immediately
3. Run SQL query

**Expected:** 
- `days_count = 3`
- `days_data` shows all 3 entries with correct IDs and colorKeyIds
- `updated_at` is very recent (within last minute)

---

## 8. Acceptance Criteria

### Must Pass

- [ ] **AC1:** Adding entry + immediate navigation saves entry
- [ ] **AC2:** Editing notes + immediate refresh saves notes
- [ ] **AC3:** Multiple rapid adds + navigation saves all entries
- [ ] **AC4:** Tab switch triggers save (visibilitychange)
- [ ] **AC5:** Browser refresh triggers save (beforeunload)
- [ ] **AC6:** Component unmount triggers save (cleanup)
- [ ] **AC7:** Database contains all expected entries after flush

### Must Not Break

- [ ] **AC8:** Delete entry still works immediately
- [ ] **AC9:** Color key edits still work immediately
- [ ] **AC10:** Normal debounce still groups rapid edits
- [ ] **AC11:** No duplicate saves
- [ ] **AC12:** No console errors

### UX

- [ ] **AC13:** "Saving..." indicator appears during flush
- [ ] **AC14:** Navigation feels instant (no blocking)

---

## 9. Rollback Plan

If issues arise:

**Step 1:** Revert calendar component
```bash
git checkout HEAD -- client/src/pages/monthly-content-calendar-v3.tsx
```

**Step 2:** Revert useDebounce hook
```bash
git checkout HEAD -- client/src/hooks/use-debounce.ts
```

**Step 3:** Restart workflow
```bash
# Workflow auto-restarts after file changes
```

**Time to rollback:** < 2 minutes

---

## 10. Files to Modify

```
client/src/hooks/use-debounce.ts
  - Add flush() and cancel() methods
  - Store pending args in ref
  - Return { debounced, flush, cancel } object

client/src/pages/monthly-content-calendar-v3.tsx  
  - Update debouncedSave to destructure { debounced, flush }
  - Add useEffect for unmount/visibility/beforeunload cleanup
  - Update debouncedEditKeySave to destructure { debounced }
```

**No backend changes needed** - API and database already work correctly.

---

## 11. Why This Fixes the Bug

### Before Fix

```
User adds entry
  ↓
debouncedSave() schedules save for 1000ms
  ↓
User navigates (500ms later)
  ↓
Component unmounts, timeout cleared
  ↓
Save NEVER HAPPENS ❌
  ↓
Entry lost from database
```

### After Fix

```
User adds entry
  ↓
debouncedSave() schedules save for 1000ms
  ↓
User navigates (500ms later)
  ↓
useEffect cleanup fires flushSave()
  ↓
Pending save EXECUTES IMMEDIATELY ✅
  ↓
Entry saved to database before unmount
```

---

## 12. Summary

**Problem:** Debounced saves are lost when component unmounts before 1000ms delay expires

**Root Cause:** `useDebounce` hook has no flush mechanism

**Solution:** Add flush capability to hook + call flush on unmount/visibility/beforeunload

**Scope:** 2 files, ~50 lines of code

**Risk:** Low (isolated changes, extensive testing, easy rollback)

**Effort:** 1 hour (10 min hook + 20 min component + 30 min testing)

**Impact:** Eliminates data loss for calendar day entries

---

**Status:** Ready for Implementation  
**Next Step:** Proceed with Phase 1 (Update useDebounce Hook)
