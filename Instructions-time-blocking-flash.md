# Time Blocking Planner - Flash Bug Analysis & Fix

## Symptom
When adding a color-key block to any day in the Time Blocking Planner:
- Block appears immediately (optimistic update)
- ~1-2 seconds later, the block **disappears briefly** then reappears
- Data persists correctly (survives refresh/re-login)
- Issue is purely visual (UI flash/flicker)

## Root Cause Analysis

### Primary Cause: Query Invalidation Triggers Aggressive Refetch

**File: `client/src/components/workflow/time-blocking-planner.tsx`**

The `createTimeBlock` function (line 286) follows this flow:

1. **Line 294-307**: Creates block with temporary ID (`temp_${Date.now()}...`)
2. **Line 309-317**: Optimistic update - immediately adds block to local state
   ```typescript
   const updatedData = {
     ...data,
     monthlyView: {
       ...data.monthlyView,
       blocks: [...data.monthlyView.blocks, newBlock]  // ← Block shows immediately
     }
   };
   setData(updatedData);
   ```
3. **Line 325-339**: POST request to `/api/time-blocking-events`
4. **Line 345**: Server responds with real database ID
5. **Line 349**: 🚨 **THE PROBLEM** 🚨
   ```typescript
   queryClient.invalidateQueries({ queryKey: ['/api/time-blocking-events'] });
   ```
6. **Line 355-402**: Replaces temp ID with real ID in local state

**File: `client/src/pages/time-blocking.tsx`**

The parent page has an aggressive query configuration (lines 63-75):

```typescript
const { data: eventsData, isLoading: eventsLoading } = useQuery({
  queryKey: ['/api/time-blocking-events', startStr, endStr],
  queryFn: async () => { /* fetch events */ },
  staleTime: 0,              // ← Data immediately stale
  refetchOnMount: true,      // ← Always refetch on mount
  enabled: isAuthenticated && !!user,
});
```

**The Flash Sequence:**

1. User clicks → Optimistic update → Block shows (✅ instant)
2. Server saves → Returns real ID → Query invalidation triggered
3. Parent query refetches (because `staleTime: 0` + invalidation)
4. During refetch (~1-2 sec network delay): React Query may show stale/empty data
5. Refetch completes → Block reappears
6. **Result: Block disappears then reappears = FLASH**

### Contributing Factors

1. **Multiple Invalidation Points** (lines 349, 387, 512, 579, 632):
   - Every CRUD operation invalidates queries
   - Invalidation is too broad: `{ queryKey: ['/api/time-blocking-events'] }` matches ALL event queries

2. **Unstable Component Key** (time-blocking.tsx line 222):
   ```typescript
   key={`timeblocking-${JSON.stringify(timeBlockingData).substring(0, 50)}`}
   ```
   - Changes when data changes → forces component remount → potential re-render flash

3. **Dual State Management**:
   - Local component state (`data` in time-blocking-planner.tsx)
   - React Query cache (parent page)
   - Both update at different times → synchronization issues

## Proposed Fixes

### Minimal Fix (Recommended)

**Change 1: Remove Query Invalidation from Optimistic Updates**

In `client/src/components/workflow/time-blocking-planner.tsx`:

**Line 349** - Remove or comment out:
```typescript
// queryClient.invalidateQueries({ queryKey: ['/api/time-blocking-events'] });
```

**Why this works:**
- Local state already updated optimistically
- Parent page refetches on mount anyway (`refetchOnMount: true`)
- User will see updated data when navigating away and back
- No flash because no mid-operation refetch

**Change 2: Update Cache Directly Instead of Invalidating**

Replace query invalidation with direct cache update:

```typescript
// Instead of invalidating (line 349):
queryClient.invalidateQueries({ queryKey: ['/api/time-blocking-events'] });

// Update cache directly:
queryClient.setQueryData(
  ['/api/time-blocking-events', startStr, endStr], 
  (oldData: any) => [...(oldData || []), savedEvent]
);
```

**Why this works:**
- Updates cache immediately with new data
- No refetch needed → no network delay → no flash
- Parent page gets updated data instantly

### Robust Fix (Long-term Solution)

**1. Centralize State in React Query**

Remove local `data` state from `time-blocking-planner.tsx`, use React Query cache as single source of truth:

```typescript
// Current (problematic):
const [data, setData] = useState<TimeBlockingData>(initialData);

// Proposed:
const { data: blocks } = useQuery({
  queryKey: ['/api/time-blocking-events', startStr, endStr],
  // ... config
});
```

**2. Use Optimistic Updates Properly**

In mutation's `onMutate`:
```typescript
const createBlockMutation = useMutation({
  mutationFn: async (blockData) => {
    const response = await fetch('/api/time-blocking-events', {
      method: 'POST',
      body: JSON.stringify(blockData)
    });
    return response.json();
  },
  onMutate: async (newBlock) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['/api/time-blocking-events'] });
    
    // Snapshot previous value
    const previousBlocks = queryClient.getQueryData(['/api/time-blocking-events', ...]);
    
    // Optimistically update cache
    queryClient.setQueryData(['/api/time-blocking-events', ...], (old) => [...old, newBlock]);
    
    return { previousBlocks };
  },
  onError: (err, newBlock, context) => {
    // Rollback on error
    queryClient.setQueryData(['/api/time-blocking-events', ...], context.previousBlocks);
  },
  onSuccess: (savedBlock) => {
    // Replace temp block with real block
    queryClient.setQueryData(['/api/time-blocking-events', ...], (old) => 
      old.map(block => block.id === tempId ? savedBlock : block)
    );
  }
});
```

**3. Stabilize Parent Query**

In `client/src/pages/time-blocking.tsx`:

```typescript
const { data: eventsData } = useQuery({
  queryKey: ['/api/time-blocking-events', startStr, endStr],
  queryFn: async () => { /* ... */ },
  staleTime: 5 * 60 * 1000,    // ← 5 minutes instead of 0
  refetchOnMount: false,       // ← Don't refetch on mount (cache is updated by mutations)
  enabled: isAuthenticated && !!user,
});
```

**4. Remove Unstable Key**

In `client/src/pages/time-blocking.tsx` line 222:

```typescript
// Current (causes remounts):
<TimeBlockingPlanner
  key={`timeblocking-${JSON.stringify(timeBlockingData).substring(0, 50)}`}
  ...
/>

// Proposed (stable key):
<TimeBlockingPlanner
  key="timeblocking-planner"  // or no key at all
  ...
/>
```

## Implementation Plan

### Phase 1: Quick Fix (5 minutes)
1. Comment out query invalidation on line 349 in `time-blocking-planner.tsx`
2. Test: Add blocks, verify no flash
3. Test: Navigate away and back, verify data persists

### Phase 2: Cache Update Fix (15 minutes)
1. Replace all `invalidateQueries` with `setQueryData` in `time-blocking-planner.tsx`
2. Update `createTimeBlock`, `updateTimeBlock`, `deleteTimeBlock` functions
3. Test all CRUD operations

### Phase 3: Robust Refactor (1-2 hours)
1. Remove local state, migrate to React Query cache
2. Implement proper optimistic updates with rollback
3. Update parent query configuration
4. Remove unstable component key
5. Comprehensive testing

## Acceptance Criteria

✅ **Must Pass:**
1. Add a block → No visual flash/flicker
2. Add a block → Block appears immediately
3. Add a block → Data persists after page refresh
4. Add a block → Data persists after logout/login
5. Navigate away and back → Block still visible
6. Delete a block → No flash during deletion
7. Update a block → No flash during update

✅ **Performance:**
1. Block appears in <100ms after click
2. No network requests block UI updates
3. No unnecessary re-renders

## Test Checklist

### Basic Functionality
- [ ] Add a block on Monday 9 AM → appears immediately, no flash
- [ ] Add a block on Friday 3 PM → appears immediately, no flash
- [ ] Add 3 blocks rapidly → all appear, no flash
- [ ] Delete a block → disappears immediately, no flash
- [ ] Edit block title → updates immediately, no flash
- [ ] Change block color → updates immediately, no flash

### Persistence
- [ ] Add block → refresh page (F5) → block still there
- [ ] Add block → navigate to different page → return → block still there
- [ ] Add block → logout → login → block still there

### Edge Cases
- [ ] Add block with slow network (throttle to 3G) → no flash
- [ ] Add block while offline → shows error, no flash
- [ ] Rapid clicks on same slot → only one block created

### Cross-browser
- [ ] Test in Chrome
- [ ] Test in Firefox  
- [ ] Test in Safari
- [ ] Test on mobile

## Files Involved

### Primary Files (Must Edit)
1. **`client/src/components/workflow/time-blocking-planner.tsx`**
   - Lines 349, 387, 512, 579, 632 (query invalidations)
   - Line 286-419 (`createTimeBlock` function)
   - Line 421-520 (`updateTimeBlock` function)

2. **`client/src/pages/time-blocking.tsx`**
   - Lines 63-75 (query configuration)
   - Line 222 (unstable component key)

### Supporting Files (Reference Only)
3. **`server/routes.ts`**
   - Lines 2962-3060 (Time Blocking Events API endpoints)
   
4. **`server/storage.ts`**
   - Time blocking CRUD operations
   
5. **`shared/schema.ts`**
   - `timeBlockingEvents` table schema
   - `timeBlockingColorKeys` table schema

## Architecture Notes

### Current Architecture Issues
1. **Dual State Management**: Local state + React Query cache → sync problems
2. **Aggressive Invalidation**: Every mutation invalidates all queries
3. **Over-fetching**: `staleTime: 0` + `refetchOnMount: true` → excessive requests
4. **Optimistic Updates Done Wrong**: Update local state then invalidate → flash

### Recommended Architecture
1. **Single Source of Truth**: React Query cache only
2. **Targeted Cache Updates**: Update specific cache entries, not invalidate
3. **Smart Refetching**: Use `staleTime` appropriately, disable unnecessary refetches
4. **Proper Optimistic Updates**: Use React Query's built-in optimistic update pattern

## Related Issues

This same pattern likely affects:
- Monthly Content Calendar V3 (similar optimistic update + invalidation pattern)
- Any component using optimistic updates + query invalidation

Consider applying the same fix pattern to those components.

## Notes

- The bug is **not** caused by `colour` vs `color` field naming
- The bug is **not** caused by StrictMode double rendering
- The bug **is** caused by query invalidation triggering refetch during optimistic update
- Network latency (1-2 sec) makes the flash more noticeable

## Summary

**Quick Win**: Comment out `queryClient.invalidateQueries()` on line 349 → Flash gone

**Proper Solution**: Use `queryClient.setQueryData()` to update cache directly instead of invalidating

**Best Practice**: Migrate to React Query cache as single source of truth with proper optimistic updates
