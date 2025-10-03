# Calendar Day Entries Persistence Bug - Analysis & Fix Plan

## Executive Summary

Calendar day entries (adding/editing/deleting entries in the grid) appear to save but the **last change is lost** after navigation or refresh. Color Keys now persist correctly. This is caused by a **debounced save that doesn't flush on unmount**, so pending saves are cancelled when the user navigates away.

---

## 1. Root Cause Analysis

### Primary Issue: Debounced Save Without Flush on Unmount

**Current Behavior:**

1. User adds a calendar entry → `addCalendarEntry()` → `debouncedSave()` with **1000ms delay**
2. User edits entry notes → `updateEntryNotes()` → `debouncedSave()` with **1000ms delay**
3. If user navigates away or refreshes **within that 1000ms window**, the debounce timeout is **cleared and the save never happens**

**The `useDebounce` Hook** (`client/src/hooks/use-debounce.ts`, lines 1-21):

```typescript
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);  // ← Cancels previous save
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);  // ← Only runs if 1000ms passes without interruption
      }, delay);
    },
    [callback, delay]
  );
}
```

**Critical Flaw:** This hook provides **no cleanup/flush mechanism**. When the component unmounts:
- The timeout is simply abandoned
- React clears the timeout reference
- The pending save **never executes**
- Data is lost

**Why Color Keys Work:** Color key changes (lines 196, 315, 359) call `saveCalendarData.mutate()` **immediately** with no debounce, so they always persist.

---

## 2. Current Implementation Details

### File: `client/src/pages/monthly-content-calendar-v3.tsx`

#### Calendar Day Entry Operations

**1. Add Entry** (lines 204-227):
```typescript
const addCalendarEntry = (date: number, colorKeyId: string) => {
  const newEntry: CalendarEntry = {
    id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    colorKeyId,
    notes: ''
  };

  // ... update days array ...

  const updatedData = { ...(calendarData as any), days: updatedDays };
  queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
  debouncedSave();  // ← 1000ms delay, can be lost on unmount
};
```

**2. Update Entry Notes** (lines 229-242):
```typescript
const updateEntryNotes = (date: number, entryId: string, notes: string) => {
  // ... find and update entry ...

  const updatedData = { ...(calendarData as any), days: updatedDays };
  queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
  debouncedSave();  // ← 1000ms delay, can be lost on unmount
};
```

**3. Delete Entry** (lines 244-266):
```typescript
const deleteEntry = (date: number, entryId: string) => {
  // ... remove entry from days array ...

  const updatedData = { ...(calendarData as any), days: updatedDays };
  queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
  
  // Save immediately for deletes (no debounce delay)
  saveCalendarData.mutate({  // ← Works correctly, no debounce
    year,
    month,
    colorKeys: updatedData.colorKeys,
    days: updatedData.days,
  });
};
```

**Observation:** `deleteEntry()` works reliably because it saves **immediately** without debounce.

#### The Debounced Save Function (lines 139-148):

```typescript
const debouncedSave = useDebounce(() => {
  if (!calendarData) return;
  saveCalendarData.mutate({
    year,
    month,
    colorKeys: colorKeys,
    days: days
  });
}, 1000);  // ← 1000ms delay
```

#### The Save Mutation (lines 150-170):

```typescript
const saveCalendarData = useMutation({
  mutationFn: (data: { year: number; month: number; colorKeys: ColorKey[]; days: CalendarDay[] }) => {
    setSaveStatus('saving');
    return apiRequest(`/api/calendar-v3/${data.year}/${data.month}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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

**Status:** Routes are correct (`PUT /api/calendar-v3/:year/:month`), body includes both `colorKeys` and `days`. The API itself works fine.

#### Current useEffect Hooks

**Only one useEffect exists** (lines 126-137):
```typescript
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (showColorPicker && !(event.target as Element).closest('.color-picker-container')) {
      setShowColorPicker(null);
    }
  };

  if (showColorPicker) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
}, [showColorPicker]);
```

**Critical Missing:** There is **NO unmount cleanup** to flush pending saves before component unmounts.

---

## 3. Backend Verification

### API Route: `PUT /api/calendar-v3/:year/:month`

**File:** `server/routes.ts`, lines 2810-2854

```typescript
app.put('/api/calendar-v3/:year/:month', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const { colorKeys, days } = req.body;
    
    console.log('Calendar V3 PUT - Received data:', {
      userId, year, month,
      colorKeysCount: Array.isArray(colorKeys) ? colorKeys.length : 0,
      daysCount: Array.isArray(days) ? days.length : 0
    });
    
    const calendar = await storage.upsertCalendarV3({
      userId, year, month,
      colorKeys: colorKeys || [],
      days: days || []
    });
    
    // Returns updated calendar
    res.json({
      userId: calendar.userId,
      year: calendar.year,
      month: calendar.month,
      colorKeys: calendar.colorKeys || [],
      days: calendar.days || []
    });
  } catch (error) {
    console.error('Error saving calendar v3:', error);
    res.status(500).json({ message: 'Failed to save calendar data' });
  }
});
```

**Status:** ✅ Working correctly. Uses `onConflictDoUpdate` (last-write-wins). No version field yet.

### Storage Layer: `upsertCalendarV3()`

**File:** `server/storage.ts`, lines 1885-1918

```typescript
async upsertCalendarV3(data: InsertCalendarV3): Promise<CalendarV3> {
  const [calendar] = await db
    .insert(calendarV3)
    .values({
      ...data,
      colorKeys: (Array.isArray(data.colorKeys) ? data.colorKeys : []) as any,
      days: (Array.isArray(data.days) ? data.days : []) as any,
    })
    .onConflictDoUpdate({
      target: [calendarV3.userId, calendarV3.year, calendarV3.month],
      set: {
        colorKeys: (Array.isArray(data.colorKeys) ? data.colorKeys : []) as any,
        days: (Array.isArray(data.days) ? data.days : []) as any,
        updatedAt: new Date(),
      },
    })
    .returning();
  return calendar;
}
```

**Status:** ✅ Working correctly. Saves to PostgreSQL database with upsert logic.

### Database Schema: `calendarV3`

**File:** `shared/schema.ts`, lines 974-985

```typescript
export const calendarV3 = pgTable("calendar_v3", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  colorKeys: jsonb("color_keys").$type<ColorKeyV3[]>().notNull().default(sql`'[]'::jsonb`),
  days: jsonb("days").$type<CalendarDayV3[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("calendar_v3_user_year_month_idx").on(table.userId, table.year, table.month)
]);
```

**Status:** ✅ Correct schema. No `version` field yet (not using optimistic concurrency control).

---

## 4. Why Last Change is Lost: Failure Scenarios

### Scenario 1: User Navigates Away Within 1 Second

1. User clicks on a calendar day to add an entry
2. `addCalendarEntry()` is called
3. `debouncedSave()` schedules a save for 1000ms from now
4. **User immediately clicks "Back to Content Creation" button (500ms later)**
5. Component unmounts
6. React clears the debounce timeout
7. **Save never happens, entry is lost**

### Scenario 2: User Adds Entry Then Refreshes

1. User adds entry → debounced save pending
2. User hits F5 or refreshes browser (800ms later)
3. Page reloads, component unmounts
4. **Save never happens, entry is lost**

### Scenario 3: User Edits Notes Then Closes Dialog

1. User opens notes dialog, types notes
2. User clicks "Save" button
3. `handleNotesEdit()` calls `updateEntryNotes()`
4. `updateEntryNotes()` calls `debouncedSave()` (1000ms delay)
5. Dialog closes immediately (user thinks it's saved)
6. **User navigates away 600ms later**
7. Component unmounts, **notes update is lost**

### Scenario 4: Multiple Rapid Edits (Debounce Working as Designed)

1. User adds entry 1 → debounce timer starts (1000ms)
2. User adds entry 2 → debounce timer **restarts** (1000ms)
3. User adds entry 3 → debounce timer **restarts** (1000ms)
4. After 1000ms of inactivity, **one save** with all 3 entries
5. ✅ Works fine if user stays on page

**But if:**
4. User navigates away 500ms after entry 3
5. **All 3 entries are lost**

---

## 5. Proposed Solution

### Option A: Immediate Fix (Recommended for Minimal Risk)

**Goal:** Flush pending debounced save on unmount/visibility change to prevent data loss.

**Changes Required:**

#### 5.1 Enhanced useDebounce Hook with Flush Capability

**File:** `client/src/hooks/use-debounce.ts`

**Current Code:**
```typescript
import { useCallback, useRef } from 'react';

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}
```

**New Code:**
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
1. Store debounce arguments in `argsRef` so we can execute them later
2. Return an object with `{ debounced, flush, cancel }` instead of just the debounced function
3. `flush()`: Immediately executes pending callback with stored args
4. `cancel()`: Cancels pending callback without executing

#### 5.2 Update Calendar Component to Use New Hook

**File:** `client/src/pages/monthly-content-calendar-v3.tsx`

**Change 1: Update debouncedSave usage** (lines 139-148):

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

**Change 2: Add unmount cleanup** (add after line 137, before line 139):

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

  // Listen for visibility changes (tab switching, minimizing)
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Listen for page unload/refresh
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Cleanup: flush on unmount
  return () => {
    flushSave();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [flushSave]);
```

**Change 3: Update debouncedEditKeySave usage** (lines 289-293):

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

**Note:** We don't need to flush color key edits because `updateColorKey()` already saves immediately (line 196).

---

### Option B: Robust Long-Term Solution (Follow-Up)

**Goal:** Add optimistic concurrency control with versioning (like Cheat Sheet feature).

**Benefits:**
- Prevents multi-tab conflicts
- Detects concurrent edits
- Provides 409 conflict handling

**Effort:** 2-3 hours (follow instructions from previous `Instructions.md` for Option B)

**Recommendation:** Implement **Option A first** to stop data loss immediately, then schedule Option B for robust multi-tab safety.

---

## 6. Implementation Plan: Option A (Step-by-Step)

### Phase 1: Update useDebounce Hook (10 min)

**Step 1.1:** Open `client/src/hooks/use-debounce.ts`

**Step 1.2:** Replace entire file with enhanced version:

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

**Step 1.3:** Save file

---

### Phase 2: Update Calendar Component (20 min)

**Step 2.1:** Open `client/src/pages/monthly-content-calendar-v3.tsx`

**Step 2.2:** Update debouncedSave usage (around line 139):

**Find:**
```typescript
  // Debounced save function
  const debouncedSave = useDebounce(() => {
```

**Replace with:**
```typescript
  // Debounced save function
  const { debounced: debouncedSave, flush: flushSave } = useDebounce(() => {
```

**Step 2.3:** Add unmount cleanup useEffect (insert after line 137, before debouncedSave):

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

    // Listen for visibility changes (tab switching, minimizing)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for page unload/refresh
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup: flush on unmount
    return () => {
      flushSave();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushSave]);

  // Debounced save function
```

**Step 2.4:** Update debouncedEditKeySave usage (around line 289):

**Find:**
```typescript
  const debouncedEditKeySave = useDebounce((keyId: string, value: string) => {
```

**Replace with:**
```typescript
  const { debounced: debouncedEditKeySave } = useDebounce((keyId: string, value: string) => {
```

**Step 2.5:** Save file

---

### Phase 3: Testing (30 min)

#### Test 1: Add Entry Then Navigate Immediately

**Steps:**
1. Open Monthly Content Calendar
2. Click on a calendar day to add an entry
3. Immediately click "Back to Content Creation" (within 1 second)
4. Navigate back to calendar
5. ✅ **Verify:** Entry is still present

**Expected:** Flush on unmount saves the entry before navigation.

---

#### Test 2: Edit Notes Then Refresh

**Steps:**
1. Add an entry to a calendar day
2. Click the entry to open notes dialog
3. Type "Test notes 123"
4. Click "Save" to close dialog
5. Immediately refresh the page (F5) within 1 second
6. ✅ **Verify:** Notes are "Test notes 123" (not lost)

**Expected:** Flush on beforeunload saves notes before refresh.

---

#### Test 3: Add Multiple Entries Rapidly Then Navigate

**Steps:**
1. Click day 1 to add entry
2. Click day 2 to add entry
3. Click day 3 to add entry
4. Immediately navigate away (500ms later)
5. Navigate back to calendar
6. ✅ **Verify:** All 3 entries are present

**Expected:** Flush on unmount saves all pending changes.

---

#### Test 4: Switch Browser Tabs

**Steps:**
1. Add a calendar entry
2. Immediately switch to another browser tab (Ctrl+Tab or Cmd+Tab)
3. Wait 5 seconds
4. Switch back to calendar tab
5. Refresh the page
6. ✅ **Verify:** Entry is still present

**Expected:** Flush on visibilitychange saves when tab becomes hidden.

---

#### Test 5: Delete Entry (Should Still Work Immediately)

**Steps:**
1. Add an entry
2. Click the entry to open notes dialog
3. Click "Delete Entry"
4. Navigate away immediately
5. Navigate back to calendar
6. ✅ **Verify:** Entry is deleted (not restored)

**Expected:** Delete already saves immediately (no debounce), so it should work as before.

---

#### Test 6: Color Key Edit (Should Still Work)

**Steps:**
1. Edit a color key label to "Updated Tag"
2. Navigate away immediately
3. Navigate back to calendar
4. ✅ **Verify:** Color key label is "Updated Tag"

**Expected:** Color key updates save immediately (no debounce), so they should work as before.

---

#### Test 7: Browser Console Verification

**Steps:**
1. Open browser DevTools → Console tab
2. Add a calendar entry
3. Navigate away immediately
4. Check console logs

**Expected Logs:**
```
V3Calendar - Raw API response: { colorKeys: [...], days: [...] }
Calendar V3 PUT - Received data: { userId: '...', year: 2025, month: 1, daysCount: 1 }
CalendarV3 UPSERT - Saving data: { userId: '...', daysCount: 1 }
```

✅ **Verify:** No errors, PUT request was sent.

---

#### Test 8: Database Verification

**SQL Query:**
```sql
SELECT user_id, year, month, 
       jsonb_array_length(days) as days_count,
       jsonb_pretty(days) as days_formatted,
       updated_at
FROM calendar_v3
WHERE user_id = 'YOUR_USER_ID' AND year = 2025 AND month = 1;
```

**Steps:**
1. Add 2 entries to the calendar
2. Navigate away immediately
3. Run SQL query in Replit Database pane

✅ **Verify:** `days_count = 2`, entries are visible in `days_formatted`, `updated_at` is recent.

---

### Phase 4: Edge Cases (15 min)

#### Edge Case 1: Rapid Debounce Flushes

**Scenario:** User rapidly switches tabs back and forth

**Steps:**
1. Add entry → switch tab → switch back → add entry → switch tab
2. Repeat 5 times rapidly

✅ **Verify:** All entries are saved (no duplicate saves, no lost saves)

---

#### Edge Case 2: Network Failure During Flush

**Steps:**
1. Open DevTools → Network tab → Set throttling to "Offline"
2. Add calendar entry
3. Navigate away (triggers flush)
4. Re-enable network
5. Navigate back to calendar

✅ **Verify:** Entry is not saved (expected, network was offline). No console errors about unhandled promises.

---

#### Edge Case 3: Component Unmount Mid-Save

**Scenario:** Flush triggers save, but mutation is still in flight when component unmounts

**Steps:**
1. Open DevTools → Network tab → Set throttling to "Slow 3G"
2. Add calendar entry
3. Navigate away immediately (triggers flush)
4. **Do not wait for save to complete**
5. Wait 10 seconds
6. Navigate back to calendar

✅ **Verify:** Entry is saved (mutation completes even after unmount because React Query handles cleanup)

---

## 7. Acceptance Criteria

### Primary Criteria

- [ ] **AC1:** Adding a calendar entry and immediately navigating away preserves the entry
- [ ] **AC2:** Editing entry notes and immediately refreshing the page preserves the notes
- [ ] **AC3:** Adding multiple entries rapidly and navigating away preserves all entries
- [ ] **AC4:** Switching browser tabs triggers a save (visibilitychange)
- [ ] **AC5:** Refreshing the page triggers a save (beforeunload)
- [ ] **AC6:** Component unmount triggers a save (cleanup)

### Negative Criteria (Should Not Break)

- [ ] **AC7:** Deleting entries still works immediately (no regression)
- [ ] **AC8:** Color key edits still work immediately (no regression)
- [ ] **AC9:** Normal debounce behavior works (multiple rapid edits only trigger one save after 1000ms)
- [ ] **AC10:** No duplicate saves or race conditions

### UX Criteria

- [ ] **AC11:** "Saving..." indicator appears when flush happens
- [ ] **AC12:** No visible delay or blocking behavior on navigation
- [ ] **AC13:** No console errors or warnings

---

## 8. Rollback Plan

If issues arise after deployment:

### Step 1: Revert Calendar Component (5 min)

```bash
git diff client/src/pages/monthly-content-calendar-v3.tsx
git checkout HEAD -- client/src/pages/monthly-content-calendar-v3.tsx
```

**Result:** Component reverts to old debounce behavior (data loss bug returns, but no new bugs).

---

### Step 2: Revert useDebounce Hook (5 min)

```bash
git diff client/src/hooks/use-debounce.ts
git checkout HEAD -- client/src/hooks/use-debounce.ts
```

**Result:** Hook reverts to simple timeout-only version.

---

### Step 3: Redeploy

```bash
npm run build
```

**Result:** Application is back to pre-fix state.

---

## 9. Monitoring & Debugging

### Browser Console Logs to Watch

**Successful save on flush:**
```javascript
"V3Calendar - Raw API response: { days: [...], colorKeys: [...] }"
"Calendar V3 PUT - Received data: { daysCount: 1 }"
"CalendarV3 UPSERT - Saving data: { daysCount: 1 }"
"CalendarV3 UPSERT - Save successful"
```

**Visibility change flush:**
```javascript
// User switches tabs
"visibilityState: hidden"
// Flush triggered, mutation fires
"Calendar V3 PUT - Received data: { daysCount: 2 }"
```

**Unmount flush:**
```javascript
// User navigates away
"useEffect cleanup: flushing pending save"
"Calendar V3 PUT - Received data: { daysCount: 1 }"
```

### Server Logs to Watch

```
Calendar V3 PUT - Received data: { userId: 'user_123', year: 2025, month: 1, daysCount: 1 }
CalendarV3 UPSERT - Saving data: { userId: 'user_123', daysCount: 1 }
CalendarV3 UPSERT - Save successful: { id: 123, savedDays: [...] }
Calendar V3 PUT - Sending response: { daysCount: 1 }
```

### Add Debug Logging (Optional)

Add to `client/src/pages/monthly-content-calendar-v3.tsx`, inside the new useEffect:

```typescript
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('[Calendar] visibilityState:', document.visibilityState);
      if (document.visibilityState === 'hidden') {
        console.log('[Calendar] Flushing save due to visibility change');
        flushSave();
      }
    };

    const handleBeforeUnload = () => {
      console.log('[Calendar] Flushing save due to beforeunload');
      flushSave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      console.log('[Calendar] Component unmounting, flushing save');
      flushSave();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushSave]);
```

**Remove these logs after testing.**

---

## 10. Files to Modify

```
client/src/hooks/use-debounce.ts
  - Add flush() and cancel() methods
  - Store args in ref for delayed execution
  - Return { debounced, flush, cancel } object

client/src/pages/monthly-content-calendar-v3.tsx
  - Update debouncedSave usage to destructure { debounced, flush }
  - Add useEffect for unmount/visibility/beforeunload cleanup
  - Update debouncedEditKeySave usage to destructure { debounced }
```

**No backend changes required.**

---

## 11. Alternative Approaches Considered

### Alternative 1: Remove Debounce Entirely

**Approach:** Remove debounce, save immediately on every change like color keys do.

**Pros:**
- Simplest fix
- Guaranteed persistence
- No flush logic needed

**Cons:**
- Many API calls (if user types rapidly)
- Performance impact on server
- Database write load

**Verdict:** ❌ Not recommended. Debounce is good UX for grouping rapid edits.

---

### Alternative 2: Manual Save Button

**Approach:** Add a "Save Calendar" button, remove autosave.

**Pros:**
- User has full control
- No debounce complexity

**Cons:**
- ❌ **Violates user's constraint:** "Don't add a manual Save button"
- Bad UX (users forget to click Save)

**Verdict:** ❌ Not allowed per requirements.

---

### Alternative 3: Save on Every Keystroke (No Debounce)

**Approach:** Save immediately when user types notes.

**Pros:**
- Guaranteed persistence

**Cons:**
- API call on every keystroke = bad performance
- Server overload

**Verdict:** ❌ Not recommended. Debounce is better.

---

### Alternative 4: Increase Debounce Delay

**Approach:** Change debounce from 1000ms to 5000ms, assuming users stay longer.

**Pros:**
- Fewer API calls

**Cons:**
- **Still loses data** if user navigates within 5 seconds
- Worse UX (longer delay)

**Verdict:** ❌ Doesn't solve root cause.

---

## 12. Success Metrics

**Quantitative:**
- [ ] 0 data loss incidents (entries lost after navigation)
- [ ] 100% persistence rate in all test scenarios
- [ ] < 100ms overhead for flush on unmount
- [ ] 0 duplicate saves (flush doesn't double-save)

**Qualitative:**
- [ ] Users report no more lost calendar entries
- [ ] "Saving..." indicator shows during flush
- [ ] No visible performance degradation

---

## 13. Known Limitations & Future Work

### Current Limitations (Option A)

1. **No version conflict detection** - Last-write-wins if two tabs edit simultaneously (acceptable for now)
2. **No offline support** - Changes fail if network is unavailable during flush (acceptable)
3. **No retry logic** - If flush fails, data is lost (rare, acceptable for MVP)

### Future Enhancements (Option B)

1. **Optimistic concurrency control** - Add `version` field like Cheat Sheet feature
2. **Conflict resolution UI** - Show diff when 409 conflict occurs
3. **Offline queue** - Queue saves when offline, flush when online
4. **Real-time sync** - WebSocket for multi-tab sync

**Recommendation:** Implement Option A now, schedule Option B for Q2 2025.

---

## 14. Conclusion

**Problem:** Calendar day entries are lost when user navigates away within 1 second of adding/editing.

**Root Cause:** `useDebounce` hook has no flush mechanism, so pending saves are cancelled on unmount.

**Solution:** Add `flush()` method to hook, call it on unmount/visibilitychange/beforeunload.

**Effort:** 45 minutes (10 min hook + 20 min component + 15 min testing)

**Risk:** Low (isolated changes, extensive testing, easy rollback)

**Impact:** Eliminates data loss, maintains current UX, no performance impact.

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-03  
**Author:** Replit Agent  
**Status:** Ready for Implementation
