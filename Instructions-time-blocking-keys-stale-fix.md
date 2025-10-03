# Time Blocking Colour Keys - Stale Data Fix

## Problem Summary
- **Symptom 1:** Edited labels don't update or show blank/old values
- **Symptom 2:** On re-entering page, keys show older values that never update

## Root Cause Analysis

### ✅ DB Writes ARE Working
SQL Query confirms writes are happening:
```sql
SELECT * FROM time_blocking_color_keys WHERE user_id = 'AiLQ9hB3ro98m6qVOwpAT';
-- Result: Row exists with colorKeys JSONB array
-- tb-1 has empty label: "label": "" ← BUG EVIDENCE
```

### 🐛 Critical Bugs Identified

#### Bug #1: Inline Edit Saves on Every Keystroke
**Location:** `client/src/components/workflow/time-blocking-planner.tsx` line 863

```typescript
<Input
  value={tag.label}
  onChange={(e) => updateColorKey(tag.id, { label: e.target.value })}  // ❌ SAVES ON EVERY KEYSTROKE
  onBlur={() => setEditingColourTag(null)}
  ...
/>
```

**Problem Flow:**
1. User starts typing "Deep Work"
2. After typing "D" → onChange fires → `updateColorKey` called
3. `updateColorKey` sets cache and calls `setDirtyCategories(true)`
4. Auto-save effect (line 140) immediately saves to DB with label="D"
5. User types "e" → saved as "De"
6. User deletes all → saved as ""
7. **Result:** DB has `"label": ""`

#### Bug #2: Parent Save Doesn't Update React Query Cache
**Location:** `client/src/pages/time-blocking.tsx` lines 179-192

```typescript
const saveKeysResponse = await fetch('/api/time-blocking-color-keys', {
  method: 'PUT',
  body: JSON.stringify({ colorKeys }),
});
// ❌ No queryClient.invalidateQueries() or setQueryData()
// Result: React Query cache becomes stale
```

#### Bug #3: No Proper Mutation Pattern
**Location:** `client/src/components/workflow/time-blocking-planner.tsx` lines 647-669

```typescript
const updateColorKey = (id: string, updates: Partial<ColourTag>) => {
  // Updates cache optimistically
  queryClient.setQueryData(['/api/time-blocking-color-keys'], { ... });
  
  // ❌ Uses dirtyCategories flag instead of mutation
  setDirtyCategories(true);  
  
  // ❌ No await, no success callback, no refetch
}
```

#### Bug #4: Duplicate State Sources
- Parent (`time-blocking.tsx` lines 99-111): Fetches keys, stores in `timeBlockingData`
- Child (`TimeBlockingPlanner` lines 102-112): Fetches same keys via React Query
- **Result:** Two sources of truth that can diverge

---

## The Fix

### Strategy
1. **Fix inline edit to save only on blur/enter** (not every keystroke)
2. **Add proper useMutation with cache invalidation**
3. **Remove parent loading/saving** (let child be authoritative)
4. **Ensure DB is single source of truth via React Query**

### File Changes

#### Change 1: Fix Inline Edit to Save on Blur
**File:** `client/src/components/workflow/time-blocking-planner.tsx`

**Line 860-870, replace with:**
```typescript
{editingColourTag === tag.id ? (
  <Input
    value={newColourTagLabel}  // ✓ Use temp state
    onChange={(e) => setNewColourTagLabel(e.target.value)}  // ✓ Only update temp
    onBlur={() => {
      if (newColourTagLabel.trim() && newColourTagLabel !== tag.label) {
        updateColorKey(tag.id, { label: newColourTagLabel.trim() });  // ✓ Save on blur
      }
      setEditingColourTag(null);
      setNewColourTagLabel('');
    }}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        if (newColourTagLabel.trim() && newColourTagLabel !== tag.label) {
          updateColorKey(tag.id, { label: newColourTagLabel.trim() });  // ✓ Save on enter
        }
        setEditingColourTag(null);
        setNewColourTagLabel('');
      }
      if (e.key === 'Escape') {
        setEditingColourTag(null);
        setNewColourTagLabel('');
      }
    }}
    className="h-6 text-xs w-24"
    autoFocus
  />
) : (
```

**Also update line 880:**
```typescript
onClick={(e) => {
  e.stopPropagation();
  setNewColourTagLabel(tag.label);  // ✓ Initialize temp state with current value
  setEditingColourTag(tag.id);
}}
```

#### Change 2: Add Proper Save Mutation
**File:** `client/src/components/workflow/time-blocking-planner.tsx`

**After line 109, add:**
```typescript
// Mutation for saving color keys with proper cache invalidation
const saveColorKeysMutation = useMutation({
  mutationFn: async (colorKeys: any[]) => {
    const response = await apiRequest('/api/time-blocking-color-keys', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colorKeys }),
    });
    if (!response.ok) throw new Error('Failed to save color keys');
    return await response.json();
  },
  onSuccess: (data) => {
    // Update cache with server response (single source of truth)
    queryClient.setQueryData(['/api/time-blocking-color-keys'], { 
      colorKeys: data.colorKeys 
    });
    toast({ title: "Saved", description: "Colour keys updated", duration: 2000 });
  },
  onError: (error) => {
    toast({ 
      title: "Save Failed", 
      description: "Could not save colour keys. Please try again.", 
      variant: "destructive" 
    });
  }
});
```

#### Change 3: Update updateColorKey to Use Mutation
**File:** `client/src/components/workflow/time-blocking-planner.tsx`

**Lines 647-670, replace with:**
```typescript
const updateColorKey = (id: string, updates: Partial<ColourTag>) => {
  const updatedColorKeys = colorKeys.map((key: any) => 
    key.id === id ? { ...key, ...updates } : key
  );
  
  // Optimistically update cache for instant UI
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
  
  // Save to DB using mutation (with proper error handling)
  const colorKeysToSave = updatedColorKeys.map((key: any) => ({
    id: key.id,
    label: key.label,
    color: key.colour || key.color
  }));
  saveColorKeysMutation.mutate(colorKeysToSave);
};
```

#### Change 4: Update addNewColorTag and deleteColourTag
**File:** `client/src/components/workflow/time-blocking-planner.tsx`

**Lines 697-726, update to:**
```typescript
const addNewColorTag = (name: string, color: string) => {
  const newKey = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    label: name.trim(),
    colour: color
  };
  
  const updatedColorKeys = [...colorKeys, newKey];
  
  // Optimistic update
  queryClient.setQueryData(['/api/time-blocking-color-keys'], { 
    colorKeys: updatedColorKeys 
  });
  
  setData(prev => ({
    ...prev,
    colourTags: updatedColorKeys.map((key: any) => ({
      id: key.id,
      label: key.label,
      colour: key.colour || key.color,
      selected: key.id === activeColourTagId
    }))
  }));
  
  // Save using mutation
  const colorKeysToSave = updatedColorKeys.map((key: any) => ({
    id: key.id,
    label: key.label,
    color: key.colour || key.color
  }));
  saveColorKeysMutation.mutate(colorKeysToSave);
};
```

**Lines 728-757, update to:**
```typescript
const deleteColourTag = (tagId: string) => {
  const updatedColorKeys = colorKeys.filter((key: any) => key.id !== tagId);
  
  // Optimistic update
  queryClient.setQueryData(['/api/time-blocking-color-keys'], { 
    colorKeys: updatedColorKeys 
  });
  
  setData(prev => ({
    ...prev,
    colourTags: prev.colourTags.filter(tag => tag.id !== tagId),
    weeklyView: {
      ...prev.weeklyView,
      blocks: prev.weeklyView.blocks.map(block =>
        block.colourTagId === tagId ? { ...block, colourTagId: undefined } : block
      )
    },
    monthlyView: {
      ...prev.monthlyView,
      blocks: prev.monthlyView.blocks.map(block =>
        block.colourTagId === tagId ? { ...block, colourTagId: undefined } : block
      )
    }
  }));
  
  // Save using mutation
  const colorKeysToSave = updatedColorKeys.map((key: any) => ({
    id: key.id,
    label: key.label,
    color: key.colour || key.color
  }));
  saveColorKeysMutation.mutate(colorKeysToSave);
};
```

#### Change 5: Remove dirtyCategories Logic
**File:** `client/src/components/workflow/time-blocking-planner.tsx`

**Delete:**
- Line 132: `const [dirtyCategories, setDirtyCategories] = useState(false);`
- Lines 140-172: Auto-save useEffect that watches dirtyCategories
- All `setDirtyCategories(true)` calls (now handled by mutation)

#### Change 6: Remove Parent Loading of Color Keys
**File:** `client/src/pages/time-blocking.tsx`

**Lines 96-114, delete this block:**
```typescript
// DELETE THIS:
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

**Lines 117-125, simplify to:**
```typescript
// Just pass defaults - child will load actual data from DB
const colourTags = defaultTimeBlockingData.colourTags;

setTimeBlockingData({
  colourTags, // Defaults only
  weeklyView: { blocks: [] },
  monthlyView: {
    blocks: allBlocks,
    selectedMonth: new Date().toISOString().substring(0, 7)
  }
});
```

#### Change 7: Simplify Parent Save (No Longer Saves Keys)
**File:** `client/src/pages/time-blocking.tsx`

**Lines 167-205, replace with:**
```typescript
const handleSave = async (data: any) => {
  // Color keys are now saved directly by TimeBlockingPlanner via mutation
  // This function can be removed or used for other save operations
  console.log('💾 Blocks handled by TimeBlockingPlanner');
};
```

---

## Verification Steps

### Test 1: Edit Label Completely
```
1. Open Time Blocking Planner
2. Click edit icon on "Deep Work"
3. Type slowly: "D" → "De" → "Dee" → "Deep" → "Deep Work Updated"
4. Press Enter or click outside (blur)
5. Check Network tab: Should see ONE PUT request (not 20+)
6. Refresh page
7. ✅ VERIFY: Shows "Deep Work Updated" immediately (no flicker)
```

### Test 2: Verify DB Persistence
```
1. Edit a label to "Test123"
2. Wait for save (check Network tab)
3. Run SQL: SELECT jsonb_array_elements(color_keys)->>'label' FROM time_blocking_color_keys;
4. ✅ VERIFY: Shows "Test123" in database
```

### Test 3: Cache Invalidation
```
1. Edit label to "NewValue"
2. Navigate to Dashboard
3. Return to Time Blocking
4. ✅ VERIFY: Shows "NewValue" immediately (not old cached value)
```

### Test 4: Error Handling
```
1. Disconnect network (DevTools → Network → Offline)
2. Try to edit a label
3. ✅ VERIFY: Shows error toast "Save Failed"
4. Reconnect network
5. Edit again
6. ✅ VERIFY: Saves successfully
```

### Test 5: DB is Single Source
```
1. Open DevTools → Application → Clear all storage
2. Refresh page
3. ✅ VERIFY: Loads keys from DB (not stale cache/defaults)
4. Check SQL to confirm DB values match UI
```

---

## Acceptance Criteria

### ✅ Must Pass:
1. **No Partial Saves**
   - Editing label saves only on blur/enter (not every keystroke)
   - No empty labels in database

2. **DB is Authoritative**
   - On mount, keys loaded ONLY from `/api/time-blocking-color-keys`
   - No parent loading/saving of keys
   - React Query manages all key state

3. **Proper Cache Management**
   - Mutation invalidates/updates cache after successful save
   - Next page load shows saved values immediately
   - No stale cache data shown

4. **Error Handling**
   - Failed saves show error toast
   - UI reverts to last known good state on error
   - Retry works after network recovery

---

## Summary

**Root Causes:**
1. ❌ Inline edit saves on every keystroke → blank labels in DB
2. ❌ Parent save doesn't update React Query cache → stale data
3. ❌ No proper mutation pattern → no cache invalidation
4. ❌ Duplicate state sources → inconsistent data

**Solution:**
1. ✅ Save only on blur/enter using temp state
2. ✅ Use useMutation with proper cache updates
3. ✅ Remove parent loading/saving (child is authoritative)
4. ✅ DB via React Query = single source of truth

**Result:** Edits persist correctly, no stale data, DB is authoritative.
