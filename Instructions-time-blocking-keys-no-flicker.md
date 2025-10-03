# Time Blocking Colour Keys - Data Consistency Fix

## Problem Summary
When editing a colour key (e.g., "Deep Work" → "Deep Work!"), the UI shows the old value for ~1 second on page re-entry, then flickers to the new value. This is a race condition between stale React Query cache and fresh database data.

---

## Root Cause Analysis

### 1. **Duplicate Data Loading (Two Sources of Truth)**

**Parent Page (`time-blocking.tsx`):**
- Lines 99-111: Fetches colour keys via `fetch('/api/time-blocking-color-keys')`
- Lines 117-122: Transforms response and stores in local state
- Line 124-131: Passes to child as `initialData` prop

**Child Component (`TimeBlockingPlanner`):**
- Lines 102-109: Fetches same keys via React Query `useQuery`
- Line 108: Uses `staleTime: 1000 * 60 * 5` (5-minute cache)
- Line 112: Uses `timeBlockingColorData?.colorKeys || []`

**Problem:** Two separate data sources attempting to manage the same global state.

### 2. **React Query Cache Staleness**

**Cache Behavior:**
- React Query caches data for 5 minutes (`staleTime`)
- On component mount, it returns cached data **immediately**
- Then fetches fresh data in background and updates **later**

**The Flicker Sequence:**
```
1. User edits "Deep Work" → "Deep Work!"
2. React Query cache updated to "Deep Work!" ✓
3. Parent saves to DB via PUT /api/time-blocking-color-keys ✓
4. User navigates away
5. User returns to page
6. React Query returns CACHED "Deep Work" (stale from before edit) ❌
7. ~1 second later, API returns "Deep Work!" from DB ✓
8. UI flickers from old → new value ❌
```

### 3. **Incomplete Save Path (Cache Not Updated by Parent)**

**Child's Save Flow (`TimeBlockingPlanner` line 647-669):**
```typescript
const updateColorKey = (id: string, updates: Partial<ColourTag>) => {
  const updatedColorKeys = colorKeys.map((key: any) => 
    key.id === id ? { ...key, ...updates } : key
  );
  
  // ✓ Updates React Query cache immediately
  queryClient.setQueryData(['/api/time-blocking-color-keys'], { 
    colorKeys: updatedColorKeys 
  });
  
  // ✓ Triggers parent save
  setDirtyCategories(true);
};
```

**Parent's Save Flow (`time-blocking.tsx` line 167-205):**
```typescript
const handleSave = async (data: any) => {
  // ✓ Saves to database
  const saveKeysResponse = await fetch('/api/time-blocking-color-keys', {
    method: 'PUT',
    body: JSON.stringify({ colorKeys }),
  });
  
  // ❌ Does NOT update React Query cache!
  // Result: Next mount will have stale cache
};
```

### 4. **All Sources That Set Colour Keys on Mount**

| Source | Location | When It Runs | Data Source |
|--------|----------|--------------|-------------|
| Parent fetch | `time-blocking.tsx` L99-111 | On auth + user ready | API via fetch |
| Child useQuery | `TimeBlockingPlanner` L102-109 | On mount | React Query cache → API |
| Default fallback | `time-blocking.tsx` L125 | On load error | Hardcoded defaults |

**Race Details:**
- Parent fetch has no cache, always hits network
- Child useQuery returns cache first (stale), then refetches
- If parent finishes first, it sets `initialData` with fresh data
- But child's `useQuery` already returned stale cache to UI
- ~1s later, child's API call resolves and updates UI (flicker!)

---

## Minimal Non-Breaking Fix

### Strategy
Make the database the **single source of truth** by:
1. Removing duplicate parent loading
2. Using React Query exclusively in child
3. Fixing save path to properly update cache
4. Eliminating stale cache on page load

### Changes Required

#### Change 1: Remove Parent Loading Logic
**File:** `client/src/pages/time-blocking.tsx`

**Remove:** Lines 96-114 (the color key fetch in `loadTimeBlockingEvents`)
```typescript
// DELETE THIS BLOCK:
// Load time blocking color keys from dedicated API
let allColorKeys = [];
try {
  console.log('🔄 Loading time blocking color keys...');
  const colorResponse = await fetch('/api/time-blocking-color-keys', {
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-store'
    }
  });
  
  if (colorResponse.ok) {
    const data = await colorResponse.json();
    allColorKeys = data.colorKeys || [];
    console.log(`✅ Loaded ${allColorKeys.length} time blocking color keys`);
  }
} catch (error) {
  console.log('Using default time blocking color categories');
}
```

**Update:** Lines 117-125 to use defaults only
```typescript
// Replace with:
const colourTags = defaultTimeBlockingData.colourTags; // Just pass defaults, child will load real data

setTimeBlockingData({
  colourTags, // Defaults only - TimeBlockingPlanner will load actual data
  weeklyView: { blocks: [] },
  monthlyView: {
    blocks: allBlocks,
    selectedMonth: new Date().toISOString().substring(0, 7)
  }
});
```

#### Change 2: Fix Child's React Query Configuration
**File:** `client/src/components/workflow/time-blocking-planner.tsx`

**Replace:** Lines 102-109
```typescript
// BEFORE:
const { data: timeBlockingColorData, isLoading: colorKeysLoading } = useQuery({
  queryKey: ['/api/time-blocking-color-keys'],
  queryFn: async () => {
    const response = await apiRequest(`/api/time-blocking-color-keys`);
    return await response.json();
  },
  staleTime: 1000 * 60 * 5 // 5 minute cache ❌ CAUSES STALENESS
});

// AFTER:
const { data: timeBlockingColorData, isLoading: colorKeysLoading } = useQuery({
  queryKey: ['/api/time-blocking-color-keys'],
  queryFn: async () => {
    const response = await apiRequest(`/api/time-blocking-color-keys`);
    return await response.json();
  },
  staleTime: 0, // ✓ Always consider data stale
  refetchOnMount: true, // ✓ Always refetch on mount (ignores cache)
  gcTime: 1000 * 60 * 5, // Keep in cache for 5 min for quick navigation
});
```

#### Change 3: Add Proper Mutation for Saving
**File:** `client/src/components/workflow/time-blocking-planner.tsx`

**Add after line 109:**
```typescript
// Mutation for saving color keys (replaces parent save)
const saveColorKeysMutation = useMutation({
  mutationFn: async (colorKeys: any[]) => {
    const response = await apiRequest('/api/time-blocking-color-keys', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colorKeys }),
    });
    return await response.json();
  },
  onSuccess: (data) => {
    // Update React Query cache with server response
    queryClient.setQueryData(['/api/time-blocking-color-keys'], { 
      colorKeys: data.colorKeys 
    });
  },
});
```

#### Change 4: Update Save Logic to Use Mutation
**File:** `client/src/components/workflow/time-blocking-planner.tsx`

**Update:** Lines 646-670 (updateColorKey function)
```typescript
const updateColorKey = (id: string, updates: Partial<ColourTag>) => {
  const updatedColorKeys = colorKeys.map((key: any) => 
    key.id === id ? { ...key, ...updates } : key
  );
  
  // Optimistically update React Query cache for instant UI
  queryClient.setQueryData(['/api/time-blocking-color-keys'], { 
    colorKeys: updatedColorKeys 
  });
  
  // Update local state
  setData(prev => ({
    ...prev,
    colourTags: updatedColorKeys.map((key: any) => ({
      id: key.id,
      label: key.label,
      colour: key.colour || key.color,
      selected: key.id === activeColourTagId
    }))
  }));
  
  // Save to database using mutation (replaces setDirtyCategories)
  const colorKeysToSave = updatedColorKeys.map((key: any) => ({
    id: key.id,
    label: key.label,
    color: key.colour || key.color
  }));
  saveColorKeysMutation.mutate(colorKeysToSave);
};
```

**Apply same pattern to:**
- `addNewColorTag` (line 697)
- `deleteColourTag` (line 728)
- `updateColourTagColor` (line 672)

#### Change 5: Remove dirtyCategories Logic (No Longer Needed)
**File:** `client/src/components/workflow/time-blocking-planner.tsx`

**Remove:** 
- Line 132: `const [dirtyCategories, setDirtyCategories] = useState(false);`
- Lines 140-172: Auto-save effect that uses `dirtyCategories`
- All `setDirtyCategories(true)` calls

**Replace with:** Direct mutation calls as shown in Change 4

#### Change 6: Show Loading State During Initial Fetch
**File:** `client/src/components/workflow/time-blocking-planner.tsx`

**Add after line 112:**
```typescript
// Show loading state while color keys load
if (colorKeysLoading && colorKeys.length === 0) {
  return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading colour keys...</p>
    </div>
  );
}
```

#### Change 7: Update Parent Save to Skip Color Keys
**File:** `client/src/pages/time-blocking.tsx`

**Simplify:** Lines 167-205 (handleSave function)
```typescript
const handleSave = async (data: any) => {
  // Color keys are now saved directly by TimeBlockingPlanner component
  // This function can be simplified or removed if no longer needed
  console.log('💾 Time blocks handled by TimeBlockingPlanner component');
};
```

---

## Loading State Options

### Option A: Show Skeleton (Recommended)
Replace loading check with a skeleton UI that matches the colour key panel layout.

### Option B: Use Placeholder Data
```typescript
const { data: timeBlockingColorData } = useQuery({
  // ... query config
  placeholderData: { 
    colorKeys: initialData.colourTags.map(tag => ({
      id: tag.id,
      label: tag.label,
      color: tag.colour
    }))
  }
});
```
**Trade-off:** Shows default data briefly, but prevents empty state.

---

## Acceptance Criteria

### ✅ Must Pass:
1. **No Flicker on Page Re-entry**
   - Edit a key: "Deep Work" → "Deep Work!"
   - Navigate away, then back to Time Blocking page
   - UI shows "Deep Work!" immediately (no old value flash)

2. **Database is Single Source of Truth**
   - On mount, colour keys loaded ONLY from DB via React Query
   - No stale cache data shown to user
   - If API is slow, show loading/skeleton (not stale data)

3. **Save Path Updates Cache Correctly**
   - Edit a key → cache updated immediately
   - Save to DB completes → cache has final value
   - Next mount shows saved value instantly

4. **No Breaking Changes**
   - Time blocks continue to work
   - Colour tag operations (add/edit/delete) work
   - No data loss during migration

---

## Test Checklist

### Manual Test Steps:
1. ✅ **Edit and Reload Test**
   ```
   1. Open Time Blocking Planner
   2. Edit "Deep Work" → "Deep Work!"
   3. Wait for save (check network tab for PUT)
   4. Refresh page (hard reload with Cmd+Shift+R)
   5. VERIFY: Shows "Deep Work!" immediately (no flicker)
   ```

2. ✅ **Navigate Away and Return**
   ```
   1. Edit a colour key
   2. Navigate to Dashboard
   3. Return to Time Blocking
   4. VERIFY: Shows edited value immediately
   ```

3. ✅ **Multiple Edits Sequence**
   ```
   1. Edit "Deep Work" → "Deep Work!"
   2. Wait 1 second
   3. Edit "Deep Work!" → "Deep Work!!"
   4. Navigate away and return
   5. VERIFY: Shows "Deep Work!!" (final value)
   ```

4. ✅ **Cache Invalidation Test**
   ```
   1. Edit a key and save
   2. Open DevTools → Application → IndexedDB/Cache
   3. Clear React Query cache
   4. Reload page
   5. VERIFY: Fetches from DB and shows correct value
   ```

5. ✅ **Slow Network Test**
   ```
   1. DevTools → Network → Slow 3G throttling
   2. Reload page
   3. VERIFY: Shows loading state (not stale data)
   4. VERIFY: Shows correct data after load
   ```

### Edge Cases:
- ✅ First-time user (no DB keys) → defaults seeded correctly
- ✅ Concurrent edits (if two tabs open) → last write wins
- ✅ Network error during save → user notified, can retry
- ✅ API returns error → fallback behavior clear

---

## Rollback Plan

If issues arise:
1. Revert Changes 1-7 via git
2. Re-enable parent loading as fallback
3. Add `refetchOnMount: 'always'` as temporary fix
4. Investigate and apply proper fix in next iteration

---

## Summary

**Problem:** Stale React Query cache causes colour keys to flicker on page load.

**Root Cause:** 
- Duplicate loading (parent + child)
- 5-minute stale cache
- Parent save doesn't update cache

**Solution:**
- Remove parent loading
- Use `refetchOnMount: true` and `staleTime: 0`
- Add proper mutation with cache updates
- Show loading state instead of stale data

**Result:** Database is the single source of truth, no flicker, immediate consistency.
