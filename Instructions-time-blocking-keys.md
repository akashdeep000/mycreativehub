# Time Blocking Planner - Global Color Keys Implementation Plan

## Overview
Implement global, user-specific color keys for the Time Blocking Planner that persist across all months/weeks and are stored in the database (not localStorage).

## Current State
- Color keys are currently hardcoded in `client/src/pages/time-blocking.tsx` as `defaultTimeBlockingData.colourTags`
- Keys are currently content-type focused (Business Operations, Client Calls, etc.)
- They are being saved to/loaded from the Monthly Content Calendar V3 API (`/api/calendar-v3`) which is incorrect
- No proper database persistence for Time Blocking color keys

## Desired State
- Color keys are business-task focused with these defaults:
  - Deep Work
  - Filming
  - Editing
  - Email Marketing
  - Social Scheduling
  - Listing Work
  - Admin/Ops
  - Finance
  - Product Dev
  - Packing/Shipping
  - Creation Time
- Keys are global per user (one set shared across all time periods)
- Keys persist to database (PostgreSQL via Drizzle ORM)
- Auto-seed defaults on first visit for new users
- Users can rename, add, delete keys with full persistence
- Completely independent from Monthly Content Calendar keys

## Implementation Approach

### Phase 1: Database Schema

#### 1.1 Create New Table: `timeBlockingColorKeys`
**File:** `shared/schema.ts`

Add this table definition (similar to `globalColorKeys`):

```typescript
// Time Blocking Color Keys - Global per user
export const timeBlockingColorKeys = pgTable("time_blocking_color_keys", {
  userId: varchar("user_id").primaryKey().notNull().references(() => users.id),
  colorKeys: jsonb("color_keys").notNull(), // Array of { id: string, label: string, color: string }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTimeBlockingColorKeysSchema = createInsertSchema(timeBlockingColorKeys).omit({
  createdAt: true,
  updatedAt: true,
});

export type TimeBlockingColorKeys = typeof timeBlockingColorKeys.$inferSelect;
export type InsertTimeBlockingColorKeys = z.infer<typeof insertTimeBlockingColorKeysSchema>;
```

**Key Design Decisions:**
- `userId` as primary key (one-to-one relationship with user)
- `colorKeys` as JSONB array to store the flexible color key structure
- Structure: `[{ id: string, label: string, color: string }]`
- No `selected` field in database (that's UI state only)

#### 1.2 Default Color Keys
```typescript
const DEFAULT_TIME_BLOCKING_COLOR_KEYS = [
  { id: 'tb-1', label: 'Deep Work', color: '#3B82F6' },
  { id: 'tb-2', label: 'Filming', color: '#10B981' },
  { id: 'tb-3', label: 'Editing', color: '#8B5CF6' },
  { id: 'tb-4', label: 'Email Marketing', color: '#F59E0B' },
  { id: 'tb-5', label: 'Social Scheduling', color: '#EF4444' },
  { id: 'tb-6', label: 'Listing Work', color: '#14B8A6' },
  { id: 'tb-7', label: 'Admin/Ops', color: '#EC4899' },
  { id: 'tb-8', label: 'Finance', color: '#6366F1' },
  { id: 'tb-9', label: 'Product Dev', color: '#F97316' },
  { id: 'tb-10', label: 'Packing/Shipping', color: '#8B5CF6' },
  { id: 'tb-11', label: 'Creation Time', color: '#A855F7' },
];
```

**Note:** IDs prefixed with `tb-` to distinguish from calendar color key IDs.

### Phase 2: Storage Layer

#### 2.1 Add Storage Methods
**File:** `server/storage.ts`

Add to `IStorage` interface:
```typescript
// Time Blocking Color Keys Operations (global per user)
getTimeBlockingColorKeys(userId: string): Promise<TimeBlockingColorKeys | undefined>;
upsertTimeBlockingColorKeys(data: InsertTimeBlockingColorKeys): Promise<TimeBlockingColorKeys>;
```

Add to `DbStorage` class implementation:
```typescript
async getTimeBlockingColorKeys(userId: string): Promise<TimeBlockingColorKeys | undefined> {
  const [keys] = await db
    .select()
    .from(timeBlockingColorKeys)
    .where(eq(timeBlockingColorKeys.userId, userId));
  
  return keys;
}

async upsertTimeBlockingColorKeys(data: InsertTimeBlockingColorKeys): Promise<TimeBlockingColorKeys> {
  const [keys] = await db
    .insert(timeBlockingColorKeys)
    .values({
      ...data,
      colorKeys: (Array.isArray(data.colorKeys) ? data.colorKeys : []) as any,
    })
    .onConflictDoUpdate({
      target: [timeBlockingColorKeys.userId],
      set: {
        colorKeys: (Array.isArray(data.colorKeys) ? data.colorKeys : []) as any,
        updatedAt: new Date(),
      },
    })
    .returning();
  
  return keys;
}
```

### Phase 3: API Layer

#### 3.1 Create New API Endpoints
**File:** `server/routes.ts`

Add these two endpoints (do NOT reuse calendar endpoints):

```typescript
// GET /api/time-blocking-color-keys - Get global color keys for time blocking
app.get('/api/time-blocking-color-keys', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`Time Blocking Color Keys GET - User: ${userId}`);
    
    // Get global color keys for this user
    let colorKeys = await storage.getTimeBlockingColorKeys(userId);
    
    // If no keys exist, seed defaults
    if (!colorKeys) {
      console.log('Time Blocking Color Keys - No keys found, seeding defaults');
      
      colorKeys = await storage.upsertTimeBlockingColorKeys({
        userId,
        colorKeys: DEFAULT_TIME_BLOCKING_COLOR_KEYS,
      });
    }
    
    res.json({
      colorKeys: colorKeys.colorKeys || [],
    });
  } catch (error) {
    console.error('Error fetching time blocking color keys:', error);
    res.status(500).json({ message: 'Failed to fetch color keys' });
  }
});

// PUT /api/time-blocking-color-keys - Update global color keys
app.put('/api/time-blocking-color-keys', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { colorKeys } = req.body;
    
    console.log(`Time Blocking Color Keys PUT - User: ${userId}, Keys: ${colorKeys?.length || 0}`);
    
    const updated = await storage.upsertTimeBlockingColorKeys({
      userId,
      colorKeys: colorKeys || [],
    });
    
    res.json({
      colorKeys: updated.colorKeys || [],
    });
  } catch (error) {
    console.error('Error saving time blocking color keys:', error);
    res.status(500).json({ message: 'Failed to save color keys' });
  }
});
```

**Key Points:**
- These are NEW endpoints separate from calendar
- GET auto-seeds defaults if none exist
- PUT saves changes globally (affects all time periods)

### Phase 4: Frontend Updates

#### 4.1 Update Time Blocking Component
**File:** `client/src/pages/time-blocking.tsx`

**Changes needed:**

1. **Remove dependency on calendar API for color keys**
   - Delete lines 93-112 (calendar API fetch for color keys)
   - Replace with new time blocking color keys API

2. **Update `useEffect` to load color keys from new API**
   ```typescript
   useEffect(() => {
     const loadTimeBlockingColorKeys = async () => {
       try {
         console.log('🔄 Loading time blocking color keys...');
         
         const response = await fetch('/api/time-blocking-color-keys', {
           credentials: 'include',
           headers: {
             'Cache-Control': 'no-store'
           }
         });
         
         if (!response.ok) {
           throw new Error('Failed to load color keys');
         }
         
         const data = await response.json();
         const colorKeys = data.colorKeys || [];
         
         console.log(`✅ Loaded ${colorKeys.length} time blocking color keys`);
         
         // Convert to colourTags format with selected state
         const colourTags = colorKeys.map((key: any, index: number) => ({
           id: key.id,
           label: key.label,
           colour: key.color,
           selected: index === 0 // First tag selected by default
         }));
         
         setTimeBlockingData(prev => ({
           ...prev,
           colourTags
         }));
         
       } catch (error) {
         console.error('❌ Failed to load time blocking color keys:', error);
         toast({
           title: "Load Error",
           description: "Failed to load color categories. Using defaults.",
           variant: "destructive"
         });
       }
     };
     
     if (isAuthenticated && user) {
       loadTimeBlockingColorKeys();
     }
   }, [isAuthenticated, user, toast]);
   ```

3. **Update save function to use new API**
   Replace lines 168-215 in the save function:
   
   ```typescript
   // Save color keys globally (not to calendar API)
   if (data.colourTags && data.colourTags.length > 0) {
     const colorKeys = data.colourTags.map((tag: any) => ({
       id: tag.id,
       label: tag.label,
       color: tag.colour || tag.color
     }));
     
     console.log(`💾 Saving ${colorKeys.length} time blocking color keys...`);
     
     const saveKeysResponse = await fetch('/api/time-blocking-color-keys', {
       method: 'PUT',
       headers: {
         'Content-Type': 'application/json',
       },
       credentials: 'include',
       body: JSON.stringify({ colorKeys }),
     });
     
     if (!saveKeysResponse.ok) {
       console.error('Failed to save color keys');
     } else {
       console.log('✅ Color keys saved successfully');
     }
   }
   ```

4. **Update default color keys**
   Replace lines 20-28 with the new defaults:
   
   ```typescript
   const defaultTimeBlockingData = {
     colourTags: [
       { id: 'tb-1', label: 'Deep Work', colour: '#3B82F6', selected: true },
       { id: 'tb-2', label: 'Filming', colour: '#10B981', selected: false },
       { id: 'tb-3', label: 'Editing', colour: '#8B5CF6', selected: false },
       { id: 'tb-4', label: 'Email Marketing', colour: '#F59E0B', selected: false },
       { id: 'tb-5', label: 'Social Scheduling', colour: '#EF4444', selected: false },
       { id: 'tb-6', label: 'Listing Work', colour: '#14B8A6', selected: false },
       { id: 'tb-7', label: 'Admin/Ops', colour: '#EC4899', selected: false },
       { id: 'tb-8', label: 'Finance', colour: '#6366F1', selected: false },
       { id: 'tb-9', label: 'Product Dev', colour: '#F97316', selected: false },
       { id: 'tb-10', label: 'Packing/Shipping', colour: '#8B5CF6', selected: false },
       { id: 'tb-11', label: 'Creation Time', colour: '#A855F7', selected: false },
     ],
     weeklyView: {
       blocks: []
     },
     monthlyView: {
       blocks: [],
       selectedMonth: new Date().toISOString().substring(0, 7)
     }
   };
   ```

### Phase 5: Database Migration

#### 5.1 Push Schema Changes
```bash
npm run db:push
```

**Expected Output:**
```
[✓] Changes applied
```

If data loss warning appears (unlikely since this is a new table):
```bash
npm run db:push --force
```

#### 5.2 Verify Table Created
Check that `time_blocking_color_keys` table exists in database with:
- `user_id` (varchar, primary key)
- `color_keys` (jsonb)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Phase 6: Testing Plan

#### 6.1 Unit Tests (Future Enhancement)
Create `server/__tests__/time-blocking-color-keys.test.ts`:
- Test GET endpoint returns defaults for new user
- Test GET endpoint returns saved keys for existing user
- Test PUT endpoint saves keys correctly
- Test PUT endpoint updates existing keys

#### 6.2 Manual Testing Checklist

**Test 1: New User - Default Seeding**
1. Clear time blocking color keys for test user (or use new user)
2. Navigate to Time Blocking Planner
3. Verify all 11 default keys appear with correct labels
4. Verify first key ("Deep Work") is selected by default

**Test 2: Persistence Across Refresh**
1. Add a custom color key "Meeting Prep" with color #FF6B9D
2. Refresh the page
3. Verify "Meeting Prep" still appears in the list
4. Navigate away and back to Time Blocking Planner
5. Verify "Meeting Prep" persists

**Test 3: Rename Color Key**
1. Click edit on "Deep Work" key
2. Rename to "Focus Time"
3. Save the change
4. Refresh page
5. Verify key now shows "Focus Time"

**Test 4: Delete Color Key**
1. Delete the "Packing/Shipping" key
2. Refresh page
3. Verify it's still deleted (persists)

**Test 5: Color Change**
1. Change color of "Filming" from green to red
2. Refresh page
3. Verify color persists

**Test 6: Independence from Monthly Content Calendar**
1. Navigate to Monthly Content Calendar V3
2. Note its color keys (Emails, Reel, Carousel, etc.)
3. Navigate to Time Blocking Planner
4. Verify it has different keys (Deep Work, Filming, etc.)
5. Add custom key to Time Blocking "Custom Task"
6. Navigate to Monthly Content Calendar
7. Verify "Custom Task" does NOT appear there
8. Verify calendar keys are unchanged

**Test 7: Month Navigation (Time Blocking)**
1. Set current month to October
2. Note the color keys displayed
3. Navigate to November
4. Verify SAME color keys appear (global)
5. Add custom key "Review Time"
6. Navigate back to October
7. Verify "Review Time" appears in October too (global)

**Test 8: Multi-User Isolation**
1. Login as User A
2. Add custom key "User A Task"
3. Logout
4. Login as User B
5. Navigate to Time Blocking Planner
6. Verify "User A Task" does NOT appear
7. Verify User B sees only defaults (or their own custom keys)

### Phase 7: Rollback Plan

If issues occur:

1. **Revert frontend changes**
   ```bash
   git checkout client/src/pages/time-blocking.tsx
   ```

2. **Keep database table** (no harm, just unused)
   - Don't drop `time_blocking_color_keys` table
   - Users won't lose any existing time blocking events

3. **Remove API endpoints** (comment out in `server/routes.ts`)
   ```typescript
   // Temporarily disabled - rollback
   // app.get('/api/time-blocking-color-keys', ...)
   // app.put('/api/time-blocking-color-keys', ...)
   ```

4. **Old behavior restored**
   - Time Blocking uses hardcoded defaults
   - No persistence for color key changes
   - No impact on existing time blocking events

## Files to Modify

### New Files
None - all changes in existing files

### Modified Files
1. **shared/schema.ts** - Add `timeBlockingColorKeys` table, schemas, types
2. **server/storage.ts** - Add get/upsert methods for time blocking color keys
3. **server/routes.ts** - Add two new API endpoints
4. **client/src/pages/time-blocking.tsx** - Update to use new API, new defaults

## Data Migration Notes

**No data migration needed because:**
- This is a new table (`time_blocking_color_keys`)
- Existing `time_blocking_events` table unchanged
- Users' existing events still reference `colorKeyId` which matches the ID field
- Old color key data was never persisted anyway (was only in localStorage/memory)

**Auto-seeding handles new users:**
- First GET request to `/api/time-blocking-color-keys` seeds defaults
- No manual migration script needed

## Success Criteria

✅ New users see 11 default business-task color keys on first visit  
✅ Color keys persist across page refresh  
✅ Color keys persist across browser sessions  
✅ Color keys persist across month navigation in Time Blocking  
✅ Users can rename keys and changes persist  
✅ Users can add custom keys and they persist  
✅ Users can delete keys and deletion persists  
✅ Time Blocking keys are completely independent from Monthly Content Calendar keys  
✅ No breaking changes to existing time blocking events  
✅ No localStorage usage for color keys  

## Timeline Estimate

- Phase 1-2 (Schema + Storage): 15 minutes
- Phase 3 (API): 15 minutes  
- Phase 4 (Frontend): 30 minutes
- Phase 5 (Migration): 5 minutes
- Phase 6 (Testing): 30 minutes

**Total: ~1.5 hours**

## Notes

- This follows the exact same pattern as the Monthly Content Calendar V3 global color keys implementation
- Keep the two systems completely separate (different tables, different APIs)
- The `colorKeyId` field in `time_blocking_events` table already exists and will work with the new IDs
- Consider adding a bulk migration endpoint later if users need to migrate old events to new key IDs
