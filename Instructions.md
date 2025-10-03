# Colour Key Data Persistence Bug - Analysis & Implementation Plan

## Executive Summary

The Colour Key feature in the Monthly Content Calendar is not persisting changes because of a **critical API route mismatch** between the frontend and backend, combined with a lack of optimistic concurrency control. Changes appear immediately in the UI but are lost after refresh or re-login.

---

## 1. Root Cause Analysis

### Primary Issue: API Route Mismatch

**Frontend (`client/src/pages/monthly-content-calendar-v3.tsx`, line 153):**
```typescript
saveCalendarData.mutate({
  year,
  month,
  colorKeys: colorKeys,
  days: days
});

// The mutation calls:
return apiRequest('/api/calendar-v3', {  // ❌ WRONG - missing params
  method: 'PUT',
  body: JSON.stringify(data),
});
```

**Backend (`server/routes.ts`, line 2810):**
```typescript
app.put('/api/calendar-v3/:year/:month', jwtAuth, async (req: any, res) => {
  // ✅ Expects year and month in URL params
```

**Result:** The PUT request likely returns a 404 or hits no endpoint, so saves fail silently.

### Secondary Issues

1. **No Optimistic Concurrency Control**
   - Unlike the Conversation Flow Cheat Sheet (which uses versioning), calendar saves have no conflict detection
   - Multiple tabs or rapid edits can clobber each other
   
2. **No Version Field in Schema**
   - `calendarV3` table lacks a `version` column for tracking changes
   
3. **Silent Failures**
   - The frontend doesn't properly handle save errors or 404s
   - Users see "Saving..." but errors are hidden

---

## 2. Current System Architecture

### Database Schema (`shared/schema.ts`, lines 974-985)

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

**ColorKey Structure:**
```typescript
export interface ColorKeyV3 {
  id: string;
  label: string;
  color: string;
}
```

### API Endpoints

#### GET `/api/calendar-v3/:year/:month`
- Fetches calendar data for a specific user/year/month
- Returns: `{ userId, year, month, colorKeys[], days[] }`
- Status: ✅ Working correctly

#### PUT `/api/calendar-v3/:year/:month`
- Saves full calendar data (colorKeys + days)
- Calls `storage.upsertCalendarV3()` with conflict resolution on `(userId, year, month)`
- Status: ❌ Not being called due to frontend route mismatch

### Storage Layer (`server/storage.ts`, lines 1885-1918)

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

**Note:** This implementation uses last-write-wins with `onConflictDoUpdate`. No version checking.

### Frontend Component (`client/src/pages/monthly-content-calendar-v3.tsx`)

**Key State Variables:**
- `colorKeys` - array of ColorKey objects
- `saveStatus` - 'idle' | 'saving' | 'saved'

**Save Flow:**
1. User edits a tag label or color
2. `updateColorKey()` updates query cache optimistically
3. `saveCalendarData.mutate()` is called immediately (no debounce for color key changes)
4. Mutation sets `saveStatus` to 'saving'
5. On success, sets to 'saved' for 2 seconds

**Current Issues:**
- Line 153: Wrong API route (`/api/calendar-v3` instead of `/api/calendar-v3/${year}/${month}`)
- No 409 conflict handling
- Error handling only invalidates cache and shows toast, doesn't retry or merge conflicts

---

## 3. Reference Implementation: Conversation Flow Cheat Sheet

The Cheat Sheet feature already implements robust persistence with versioning. Key patterns to replicate:

### Database Schema (`shared/schema.ts`, lines 1073-1079)

```typescript
export const cheatSheetDocs = pgTable("cheat_sheet_docs", {
  userId: varchar("user_id").primaryKey().notNull(),
  data: jsonb("data").notNull(), // { version: number, rows: [...] }
  version: integer("version").notNull().default(1), // ← Version field
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Optimistic Concurrency in Storage (`server/storage.ts`, lines 2421-2498)

```typescript
async updateCheatSheetDocOptimistic(
  userId: string,
  clientVersion: number,
  rows: CheatSheetRow[]
): Promise<{ success: boolean; doc?: CheatSheetDoc; conflict?: {...} }> {
  const currentDoc = await this.getCheatSheetDoc(userId);
  const currentData = currentDoc.data as CheatSheetDocData;

  // 1. Check version conflict
  if (clientVersion < currentData.version) {
    return { success: false, conflict: { version: currentData.version, rows: currentData.rows } };
  }

  const newVersion = currentData.version + 1;

  // 2. Atomic update with version check
  const [updatedDoc] = await db
    .update(cheatSheetDocs)
    .set({
      data: newData,
      version: newVersion,
      updatedAt: new Date(),
    })
    .where(and(
      eq(cheatSheetDocs.userId, userId),
      eq(cheatSheetDocs.version, currentData.version) // ← Compare-and-swap
    ))
    .returning();

  if (!updatedDoc) {
    // 3. Version conflict - refetch and return conflict
    const latestDoc = await this.getCheatSheetDoc(userId);
    return { success: false, conflict: { ... } };
  }

  return { success: true, doc: updatedDoc };
}
```

### API Route with 409 Handling (`server/routes.ts`, lines 2545-2576)

```typescript
app.put('/api/automation/cheatsheet', jwtAuth, async (req: any, res) => {
  const { version, rows } = cheatSheetDocPutBodySchema.parse(req.body);
  
  const result = await storage.updateCheatSheetDocOptimistic(userId, version, rows);
  
  if (result.success && result.doc) {
    res.json(transformed);
  } else {
    // Return 409 Conflict with latest server state
    res.status(409).json({
      message: 'Version conflict - document was updated by another session',
      conflict: result.conflict
    });
  }
});
```

### Frontend Pattern (Inferred)
1. Fetch document with `version` field
2. On save, send current `version` in request body
3. If 409 response, merge or overwrite with server state
4. Show UI feedback: "Saving..." → "Saved ✓" or "Conflict detected"

---

## 4. Proposed Solution

### Option A: Minimal Fix (Recommended for Quick Resolution)

**Goal:** Fix the route mismatch to make saves work immediately.

**Changes:**

1. **Fix Frontend Route** (`client/src/pages/monthly-content-calendar-v3.tsx`, line 153)
   ```typescript
   // BEFORE:
   return apiRequest('/api/calendar-v3', {
   
   // AFTER:
   return apiRequest(`/api/calendar-v3/${year}/${month}`, {
   ```

2. **Add Error Logging**
   ```typescript
   onError: (error) => {
     console.error('Save error:', error);
     console.error('Error details:', { year, month, colorKeysCount: colorKeys.length });
     setSaveStatus('idle');
     toast({ title: "Failed to save calendar", variant: "destructive" });
   }
   ```

3. **Test Acceptance Criteria:**
   - [ ] Add a new color key → Refresh page → Color key still present
   - [ ] Edit a color key label → Refresh page → Edit persists
   - [ ] Change a color key color → Refresh page → Color change persists
   - [ ] Delete a color key → Refresh page → Deletion persists
   - [ ] Log out and log back in → All changes still present

**Estimated Effort:** 5 minutes  
**Risk:** Low  
**Pros:** Immediate fix, minimal code change  
**Cons:** Still vulnerable to multi-tab conflicts

---

### Option B: Full Robustness (Recommended for Long-Term)

**Goal:** Match the Cheat Sheet's robustness with versioning and conflict handling.

#### 4.1 Database Schema Migration

**Add version column to `calendarV3` table:**

```typescript
// In shared/schema.ts, update calendarV3 definition:
export const calendarV3 = pgTable("calendar_v3", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  colorKeys: jsonb("color_keys").$type<ColorKeyV3[]>().notNull().default(sql`'[]'::jsonb`),
  days: jsonb("days").$type<CalendarDayV3[]>().notNull().default(sql`'[]'::jsonb`),
  version: integer("version").notNull().default(1), // ← ADD THIS
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("calendar_v3_user_year_month_idx").on(table.userId, table.year, table.month)
]);
```

**Run migration:**
```bash
npm run db:push
```

**Note:** Existing rows will get `version = 1` by default.

---

#### 4.2 Backend Storage Layer

**Update IStorage interface** (`server/storage.ts`, around line 330):

```typescript
// REPLACE:
upsertCalendarV3(data: InsertCalendarV3): Promise<CalendarV3>;

// WITH:
getCalendarV3(userId: string, year: number, month: number): Promise<CalendarV3 | undefined>;
upsertCalendarV3Optimistic(
  userId: string,
  year: number,
  month: number,
  clientVersion: number,
  colorKeys: ColorKeyV3[],
  days: CalendarDayV3[]
): Promise<{ success: boolean; calendar?: CalendarV3; conflict?: { version: number; colorKeys: ColorKeyV3[]; days: CalendarDayV3[] } }>;
```

**Implement optimistic update** (`server/storage.ts`, after line 1918):

```typescript
async upsertCalendarV3Optimistic(
  userId: string,
  year: number,
  month: number,
  clientVersion: number,
  colorKeys: ColorKeyV3[],
  days: CalendarDayV3[]
): Promise<{ success: boolean; calendar?: CalendarV3; conflict?: { version: number; colorKeys: ColorKeyV3[]; days: CalendarDayV3[] } }> {
  console.log('CalendarV3 Optimistic UPSERT - Start:', { userId, year, month, clientVersion });

  // Get current calendar
  const currentCalendar = await this.getCalendarV3(userId, year, month);

  if (!currentCalendar) {
    // No calendar exists - create with version 1
    const [newCalendar] = await db
      .insert(calendarV3)
      .values({
        userId,
        year,
        month,
        colorKeys: colorKeys as any,
        days: days as any,
        version: 1,
      })
      .returning();

    console.log('CalendarV3 - Created new calendar with version 1');
    return { success: true, calendar: newCalendar };
  }

  // Check version conflict
  if (clientVersion < currentCalendar.version) {
    console.log('CalendarV3 - Version conflict detected:', {
      clientVersion,
      serverVersion: currentCalendar.version,
    });
    return {
      success: false,
      conflict: {
        version: currentCalendar.version,
        colorKeys: currentCalendar.colorKeys,
        days: currentCalendar.days,
      },
    };
  }

  const newVersion = currentCalendar.version + 1;

  // Atomic update with version check
  const [updatedCalendar] = await db
    .update(calendarV3)
    .set({
      colorKeys: colorKeys as any,
      days: days as any,
      version: newVersion,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(calendarV3.userId, userId),
        eq(calendarV3.year, year),
        eq(calendarV3.month, month),
        eq(calendarV3.version, currentCalendar.version) // Compare-and-swap
      )
    )
    .returning();

  if (!updatedCalendar) {
    // Version conflict - refetch latest
    const latestCalendar = await this.getCalendarV3(userId, year, month);
    if (latestCalendar) {
      console.log('CalendarV3 - Concurrent update conflict');
      return {
        success: false,
        conflict: {
          version: latestCalendar.version,
          colorKeys: latestCalendar.colorKeys,
          days: latestCalendar.days,
        },
      };
    }
  }

  console.log('CalendarV3 - Save successful, new version:', newVersion);
  return { success: true, calendar: updatedCalendar };
}
```

**Keep legacy `upsertCalendarV3` for migration endpoint:**
```typescript
// Keep existing implementation for migration route compatibility
async upsertCalendarV3(data: InsertCalendarV3): Promise<CalendarV3> {
  // ... existing implementation unchanged
}
```

---

#### 4.3 Backend API Route

**Update PUT route** (`server/routes.ts`, replace lines 2810-2854):

```typescript
app.put('/api/calendar-v3/:year/:month', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const { colorKeys, days, version } = req.body;

    // Validate version is provided
    if (typeof version !== 'number') {
      return res.status(400).json({ message: 'Version is required for optimistic concurrency control' });
    }

    console.log('Calendar V3 PUT - Received data:', {
      userId,
      year,
      month,
      version,
      colorKeysCount: Array.isArray(colorKeys) ? colorKeys.length : 0,
      daysCount: Array.isArray(days) ? days.length : 0,
    });

    // Attempt optimistic update
    const result = await storage.upsertCalendarV3Optimistic(
      userId,
      year,
      month,
      version,
      colorKeys || [],
      days || []
    );

    if (result.success && result.calendar) {
      const response = {
        userId: result.calendar.userId,
        year: result.calendar.year,
        month: result.calendar.month,
        colorKeys: result.calendar.colorKeys || [],
        days: result.calendar.days || [],
        version: result.calendar.version,
      };

      console.log('Calendar V3 PUT - Save successful:', {
        newVersion: result.calendar.version,
        colorKeysCount: response.colorKeys.length,
      });

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(response);
    } else {
      // Version conflict - return 409 with latest server state
      console.log('Calendar V3 PUT - Version conflict, returning 409');
      res.status(409).json({
        message: 'Version conflict - calendar was updated by another session',
        conflict: {
          version: result.conflict!.version,
          colorKeys: result.conflict!.colorKeys,
          days: result.conflict!.days,
        },
      });
    }
  } catch (error) {
    console.error('Error saving calendar v3:', error);
    res.status(500).json({ message: 'Failed to save calendar data' });
  }
});
```

**Update GET route to return version** (`server/routes.ts`, around line 2730):

```typescript
const response = {
  userId: newCalendar.userId,
  year: newCalendar.year,
  month: newCalendar.month,
  colorKeys: newCalendar.colorKeys || [],
  days: newCalendar.days || [],
  version: newCalendar.version, // ← ADD THIS
};
```

---

#### 4.4 Shared Schema Validation

**Add request body schema** (`shared/schema.ts`, after line 994):

```typescript
export const calendarV3PutBodySchema = z.object({
  year: z.number(),
  month: z.number(),
  version: z.number(),
  colorKeys: z.array(z.object({
    id: z.string(),
    label: z.string(),
    color: z.string(),
  })),
  days: z.array(z.object({
    date: z.string(),
    entries: z.array(z.any()),
  })),
});

export type CalendarV3PutBody = z.infer<typeof calendarV3PutBodySchema>;
```

**Update exports:**
```typescript
export type CalendarV3 = typeof calendarV3.$inferSelect;
export type InsertCalendarV3 = z.infer<typeof insertCalendarV3Schema>;
export type CalendarV3PutBody = z.infer<typeof calendarV3PutBodySchema>; // ← ADD
```

---

#### 4.5 Frontend Component Updates

**Update interfaces** (`client/src/pages/monthly-content-calendar-v3.tsx`, after line 30):

```typescript
interface CalendarData {
  userId: string;
  year: number;
  month: number;
  colorKeys: ColorKey[];
  days: CalendarDay[];
  version: number; // ← ADD THIS
}
```

**Add version tracking state** (after line 69):

```typescript
const [localVersion, setLocalVersion] = useState<number>(1);
```

**Update query to track version** (lines 75-109):

```typescript
const { data: calendarData, isLoading, refetch } = useQuery({
  queryKey: ['/api/calendar-v3', year, month],
  queryFn: async () => {
    const response = await apiRequest(`/api/calendar-v3/${year}/${month}`);
    const data = await response.json();
    console.log('V3Calendar - Raw API response:', data);
    
    // Update local version whenever we fetch from server
    if (data?.version) {
      setLocalVersion(data.version);
    }
    
    // ... migration logic unchanged ...
    
    return data;
  },
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  refetchOnMount: true,
});
```

**Fix save mutation route and add version** (lines 150-169):

```typescript
const saveCalendarData = useMutation({
  mutationFn: (data: { year: number; month: number; colorKeys: ColorKey[]; days: CalendarDay[] }) => {
    setSaveStatus('saving');
    return apiRequest(`/api/calendar-v3/${year}/${month}`, { // ← FIX ROUTE
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        version: localVersion, // ← ADD VERSION
      }),
      headers: { 'Content-Type': 'application/json' },
    });
  },
  onSuccess: async (response) => {
    const data = await response.json();
    
    // Update local version to server's new version
    if (data?.version) {
      setLocalVersion(data.version);
    }
    
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  },
  onError: async (error: any) => {
    console.error('Save error:', error);
    
    // Handle 409 Conflict
    if (error.status === 409) {
      const conflictData = await error.json();
      console.log('Version conflict detected:', conflictData);
      
      // Update local state with server's version
      setLocalVersion(conflictData.conflict.version);
      
      // Update query cache with server data
      queryClient.setQueryData(['/api/calendar-v3', year, month], {
        ...calendarData,
        colorKeys: conflictData.conflict.colorKeys,
        days: conflictData.conflict.days,
        version: conflictData.conflict.version,
      });
      
      toast({
        title: "Calendar updated by another session",
        description: "Your changes have been merged with the latest version.",
        variant: "default",
      });
    } else {
      toast({ title: "Failed to save calendar", variant: "destructive" });
    }
    
    setSaveStatus('idle');
    queryClient.invalidateQueries({ queryKey: ['/api/calendar-v3', year, month] });
  },
});
```

**Add debounce for label edits** (lines 287-292):

```typescript
// Change debounce time from 50ms to 300ms for better grouping
const debouncedEditKeySave = useDebounce((keyId: string, value: string) => {
  if (value.trim()) {
    updateColorKey(keyId, { label: value.trim() });
  }
}, 300); // ← Change from 50 to 300ms
```

---

## 5. Testing Plan

### 5.1 Manual Acceptance Tests

**Test 1: Basic Persistence**
1. Navigate to Monthly Content Calendar
2. Add a new color key with label "Test Tag" and color #FF6B9D
3. Refresh the page
4. ✅ Verify: "Test Tag" is still present with correct color

**Test 2: Label Edit Persistence**
1. Click edit on an existing tag
2. Change label to "Updated Label"
3. Wait for "Saved ✓" indicator
4. Refresh the page
5. ✅ Verify: Label is "Updated Label"

**Test 3: Color Change Persistence**
1. Click the color dot on a tag
2. Select a different color from the grid
3. Wait for "Saved ✓"
4. Refresh the page
5. ✅ Verify: Color has changed

**Test 4: Delete Persistence**
1. Delete a color key
2. Wait for "Saved ✓"
3. Refresh the page
4. ✅ Verify: Tag is still deleted

**Test 5: Re-login Persistence**
1. Make several changes (add, edit, delete tags)
2. Log out
3. Log back in
4. Navigate to calendar
5. ✅ Verify: All changes are still present

**Test 6: Multi-Tab Conflict Handling (Option B only)**
1. Open calendar in two browser tabs (same month)
2. Tab 1: Edit tag "A" → "A-Modified"
3. Tab 2: Edit tag "B" → "B-Modified"
4. Tab 2: Wait for save
5. Tab 1: Make another edit
6. ✅ Verify: Tab 1 shows conflict toast and merges changes
7. ✅ Verify: Both edits are preserved after refresh

**Test 7: Rapid Edits**
1. Rapidly type into a tag label field
2. Wait for "Saving..." → "Saved ✓"
3. Refresh page
4. ✅ Verify: Final typed value is saved

**Test 8: Network Failure Recovery**
1. Open browser DevTools → Network tab
2. Set throttling to "Offline"
3. Edit a tag
4. ✅ Verify: Error toast appears
5. Re-enable network
6. Make another edit
7. ✅ Verify: Save succeeds

---

### 5.2 Edge Cases

**Edge Case 1: Empty Color Keys**
- Calendar with 0 color keys → Add first tag → Refresh → ✅ Tag persists

**Edge Case 2: Maximum Color Keys**
- Add 20+ color keys → Refresh → ✅ All tags present

**Edge Case 3: Special Characters in Labels**
- Labels with emojis, accents, quotes: "Test's \"Tag\" 🎨"
- ✅ Verify: Label saves and displays correctly after refresh

**Edge Case 4: Month Navigation**
- Add tag to January calendar
- Navigate to February
- Navigate back to January
- ✅ Verify: Tag is still in January

**Edge Case 5: Concurrent Month Edits (Option B only)**
- Tab 1: Edit January calendar
- Tab 2: Edit February calendar
- Both save simultaneously
- ✅ Verify: No conflicts (different month = different DB rows)

---

## 6. Implementation Checklist

### Option A: Minimal Fix (5 minutes)

- [ ] **Frontend:** Fix API route in `saveCalendarData.mutate()`
  - File: `client/src/pages/monthly-content-calendar-v3.tsx`
  - Line: 153
  - Change: `/api/calendar-v3` → `/api/calendar-v3/${year}/${month}`

- [ ] **Frontend:** Add error logging
  - Lines: 163-169
  - Add: Log error details (year, month, colorKeysCount)

- [ ] **Test:** Run all acceptance tests from Section 5.1 (excluding Test 6)

- [ ] **Verify:** Check browser console for any errors during save

- [ ] **Verify:** Check server logs for successful PUT requests

---

### Option B: Full Robustness (2-3 hours)

#### Phase 1: Database Schema (15 min)
- [ ] **Schema:** Add `version` column to `calendarV3` table
  - File: `shared/schema.ts`
  - Location: After line 979
  - Code: `version: integer("version").notNull().default(1),`

- [ ] **Schema:** Add `CalendarV3PutBody` type and validation schema
  - File: `shared/schema.ts`
  - Location: After line 994

- [ ] **Migration:** Run `npm run db:push` to apply schema changes

- [ ] **Verify:** Check database that `version` column exists with default value 1

#### Phase 2: Backend Storage (45 min)
- [ ] **Storage Interface:** Add `upsertCalendarV3Optimistic` method signature
  - File: `server/storage.ts`
  - Location: Around line 330

- [ ] **Storage Implementation:** Implement `upsertCalendarV3Optimistic`
  - File: `server/storage.ts`
  - Location: After line 1918
  - Copy pattern from `updateCheatSheetDocOptimistic` (lines 2421-2498)

- [ ] **Storage:** Keep legacy `upsertCalendarV3` for migration route

- [ ] **Test:** Add console.log statements to verify version increments

#### Phase 3: Backend API Route (30 min)
- [ ] **Route:** Update PUT `/api/calendar-v3/:year/:month` handler
  - File: `server/routes.ts`
  - Location: Lines 2810-2854
  - Add: Version validation, optimistic update call, 409 conflict response

- [ ] **Route:** Update GET `/api/calendar-v3/:year/:month` to return version
  - File: `server/routes.ts`
  - Location: Around line 2730

- [ ] **Test:** Use curl/Postman to test PUT with version field

#### Phase 4: Frontend Component (60 min)
- [ ] **Interface:** Add `version` field to `CalendarData` interface
  - File: `client/src/pages/monthly-content-calendar-v3.tsx`
  - Location: After line 30

- [ ] **State:** Add `localVersion` state variable
  - Location: After line 69

- [ ] **Query:** Update `queryFn` to track server version
  - Location: Lines 75-109
  - Add: `setLocalVersion(data.version)`

- [ ] **Mutation:** Fix route and add version to request body
  - Location: Lines 150-169
  - Change route + add `version: localVersion`

- [ ] **Mutation:** Implement 409 conflict handler in `onError`
  - Merge server state, update `localVersion`, show toast

- [ ] **Mutation:** Update `onSuccess` to track new version
  - Add: `setLocalVersion(data.version)`

- [ ] **Debounce:** Increase label edit debounce to 300-500ms
  - Location: Line 292

- [ ] **Test:** Verify "Saving..." and "Saved ✓" indicators work

#### Phase 5: Testing & Validation (30 min)
- [ ] **Test:** Run all manual acceptance tests (Section 5.1)
- [ ] **Test:** Run all edge case tests (Section 5.2)
- [ ] **Test:** Multi-tab conflict test (Test 6)
- [ ] **Test:** Network failure test (Test 8)
- [ ] **Verify:** Check browser console for no errors
- [ ] **Verify:** Check server logs for version increments
- [ ] **Verify:** Database inspection - verify version column updates correctly

#### Phase 6: Documentation (15 min)
- [ ] **Code Comments:** Add JSDoc comments to `upsertCalendarV3Optimistic`
- [ ] **README:** Update replit.md with calendar persistence architecture
- [ ] **README:** Document version conflict resolution behavior
- [ ] **CHANGELOG:** Add entry for "Implemented robust Colour Key persistence"

---

## 7. Rollback Plan

If issues arise after deployment:

### Option A Rollback:
1. Revert frontend route change
2. Redeploy frontend
3. No database changes to rollback

### Option B Rollback:
1. **Phase 1: Immediate Fix (5 min)**
   - Revert frontend changes (git revert)
   - Redeploy frontend
   - Backend will continue to work with old frontend

2. **Phase 2: Backend Rollback (15 min)**
   - Revert backend routes and storage changes
   - Redeploy backend
   - Legacy `upsertCalendarV3` continues to work

3. **Phase 3: Database Rollback (if needed)**
   - Run SQL: `ALTER TABLE calendar_v3 DROP COLUMN version;`
   - Or: Leave version column (harmless, defaults to 1)

---

## 8. Success Metrics

**Quantitative:**
- [ ] 0 save failures in browser console logs
- [ ] 100% persistence rate (changes survive refresh/re-login)
- [ ] < 500ms save latency (time from edit to "Saved ✓")
- [ ] 0 data loss incidents in multi-tab scenarios (Option B)

**Qualitative:**
- [ ] Users report no more lost edits
- [ ] "Saving..." indicator shows predictably
- [ ] Conflict resolution (if any) is transparent to users

---

## 9. Files to Modify

### Option A (Minimal Fix)
```
client/src/pages/monthly-content-calendar-v3.tsx (1 line change)
```

### Option B (Full Robustness)
```
shared/schema.ts (3 additions)
  - calendarV3 table: add version column
  - CalendarV3PutBody type
  - calendarV3PutBodySchema validation

server/storage.ts (2 additions)
  - IStorage interface: upsertCalendarV3Optimistic signature
  - DatabaseStorage: upsertCalendarV3Optimistic implementation (~80 lines)

server/routes.ts (2 modifications)
  - GET /api/calendar-v3/:year/:month: return version field
  - PUT /api/calendar-v3/:year/:month: use optimistic update + 409 handling (~60 lines)

client/src/pages/monthly-content-calendar-v3.tsx (5 modifications)
  - CalendarData interface: add version field
  - State: add localVersion tracking
  - useQuery: update localVersion on fetch
  - useMutation: fix route, send version, handle 409
  - Debounce: increase delay to 300-500ms
```

---

## 10. API Contracts

### GET `/api/calendar-v3/:year/:month`

**Request:**
```http
GET /api/calendar-v3/2025/1
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "userId": "user_123",
  "year": 2025,
  "month": 1,
  "version": 5,
  "colorKeys": [
    {
      "id": "tag-1",
      "label": "Email",
      "color": "#3B82F6"
    },
    {
      "id": "custom_1735000000_abc123",
      "label": "My Custom Tag",
      "color": "#FF6B9D"
    }
  ],
  "days": [
    {
      "date": "1",
      "entries": [
        {
          "id": "entry_1735000000_xyz789",
          "colorKeyId": "tag-1",
          "label": "Email",
          "color": "#3B82F6",
          "notes": "Newsletter draft",
          "time": ""
        }
      ]
    }
  ]
}
```

---

### PUT `/api/calendar-v3/:year/:month` (Option B)

**Request:**
```http
PUT /api/calendar-v3/2025/1
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "year": 2025,
  "month": 1,
  "version": 5,
  "colorKeys": [
    {
      "id": "tag-1",
      "label": "Email - Updated",
      "color": "#3B82F6"
    }
  ],
  "days": [...]
}
```

**Response (200 OK):**
```json
{
  "userId": "user_123",
  "year": 2025,
  "month": 1,
  "version": 6,
  "colorKeys": [...],
  "days": [...]
}
```

**Response (409 Conflict):**
```json
{
  "message": "Version conflict - calendar was updated by another session",
  "conflict": {
    "version": 7,
    "colorKeys": [...],
    "days": [...]
  }
}
```

**Response (400 Bad Request):**
```json
{
  "message": "Version is required for optimistic concurrency control"
}
```

**Response (500 Internal Server Error):**
```json
{
  "message": "Failed to save calendar data"
}
```

---

## 11. Monitoring & Debugging

### Browser Console Logs to Watch
```javascript
// Successful save flow:
"V3Calendar - Raw API response: { version: 5, colorKeys: [...] }"
"Calendar V3 PUT - Sending version: 5"
"Calendar V3 PUT - Save successful, new version: 6"

// Conflict detection:
"Version conflict detected: { clientVersion: 5, serverVersion: 6 }"
"Calendar updated by another session (toast)"

// Error conditions:
"Save error: { status: 409, message: '...' }"
"Error saving calendar v3: ..."
```

### Server Logs to Watch
```
CalendarV3 GET - Querying for: { userId: '...', year: 2025, month: 1 }
CalendarV3 GET - Database result: { found: true, colorKeysCount: 5 }

Calendar V3 PUT - Received data: { userId: '...', year: 2025, month: 1, version: 5 }
CalendarV3 Optimistic UPSERT - Start: { userId: '...', version: 5 }
CalendarV3 - Save successful, new version: 6
Calendar V3 PUT - Save successful: { newVersion: 6, colorKeysCount: 5 }

// Or conflict:
CalendarV3 - Version conflict detected: { clientVersion: 5, serverVersion: 6 }
Calendar V3 PUT - Version conflict, returning 409
```

### Database Queries for Verification

**Check version increments:**
```sql
SELECT id, user_id, year, month, version, updated_at, 
       jsonb_array_length(color_keys) as color_key_count
FROM calendar_v3
WHERE user_id = 'user_123' AND year = 2025 AND month = 1;
```

**Verify color keys stored correctly:**
```sql
SELECT user_id, year, month, version, 
       jsonb_pretty(color_keys) as color_keys_formatted
FROM calendar_v3
WHERE user_id = 'user_123' AND year = 2025 AND month = 1;
```

---

## 12. Known Limitations & Future Work

### Current Limitations
1. **No offline support** - Changes fail if network is unavailable (acceptable for MVP)
2. **Last-write-wins within version** - If two edits happen on same version before first save completes, second overwrites first (rare, acceptable)
3. **No edit history/undo** - User can't see who made changes or revert (future enhancement)

### Future Enhancements
1. **Real-time sync** - Use WebSockets to push changes to all open tabs immediately
2. **Granular versioning** - Version individual color keys instead of entire calendar
3. **Conflict resolution UI** - Show diff view when conflicts occur, let user choose which changes to keep
4. **Activity log** - Track who changed what and when (useful for shared calendars in future)
5. **Undo/Redo** - Store change history for 24 hours, allow reverting

---

## 13. Conclusion

**Problem:** Colour Key edits appear to save but disappear after refresh due to API route mismatch.

**Root Cause:** Frontend calls `PUT /api/calendar-v3` but backend expects `PUT /api/calendar-v3/:year/:month`.

**Quick Fix (Option A):** Change 1 line in frontend to fix route. 5 minutes.

**Robust Fix (Option B):** Add versioning like Cheat Sheet feature for conflict-safe saves. 2-3 hours.

**Recommended Approach:** 
- **Immediate:** Deploy Option A to stop data loss
- **Follow-up:** Implement Option B for long-term robustness

Both options ensure changes survive refresh and re-login. Option B additionally prevents multi-tab conflicts.

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-03  
**Author:** Replit Agent  
**Status:** Ready for Implementation
