# Social Media Strategy Persistence Fix

## Current State Analysis

### Database Layer ✅
- **Table**: `socialMediaStrategies` exists in `shared/schema.ts`
  - `contentGoals`: text field
  - `pillars`: jsonb array field (stores `{ id, title, cta }[]`)
  - Unique constraint on `userId`

### Storage Layer ✅
- **Methods** in `server/storage.ts`:
  - `getSocialMediaStrategy(userId)`: Fetches user's strategy
  - `upsertSocialMediaStrategy(strategyData)`: Atomic insert/update with conflict resolution

### API Routes ✅
- **GET** `/api/social-media-strategy`: Returns user's strategy
- **POST** `/api/social-media-strategy`: Upserts strategy data

### UI Component Issues ❌
**File**: `client/src/pages/social-media-strategy.tsx`

**Problems**:
1. **No debounce**: Saves on every keystroke (line 129)
2. **No flush on unmount**: Pending changes lost on navigation/refresh
3. **Race conditions**: Rapid typing can cause multiple simultaneous saves

**Current behavior**:
- ✅ Loads from DB on mount
- ✅ Shows "Saving..." and "Saved ✓" indicators
- ✅ Updates cache after mutation
- ❌ Saves immediately on every change (inefficient, can lose data)

## Minimal Fix (Option A)

### Pattern to Follow
Use the **Calendar v3** successful implementation pattern:
- File: `client/src/pages/monthly-content-calendar-v3.tsx`
- Uses `useDebounce` hook with 1000ms delay
- Flushes pending saves on unmount and visibility change
- Proper cache updates via `queryClient.setQueryData`

### Changes Required

1. **Import debounce hook**:
   ```typescript
   import { useDebounce } from "@/hooks/use-debounce";
   ```

2. **Replace immediate save with debounced save**:
   ```typescript
   const { debounced: debouncedSave, flush: flushSave } = useDebounce(() => {
     if (!user) return;
     
     const hasContent = strategy.contentGoals.trim() || 
                       strategy.pillars.some(p => p.title.trim() || p.cta.trim());
     
     if (hasContent) {
       setSaveStatus('saving');
       saveMutation.mutate({
         contentGoals: strategy.contentGoals,
         pillars: strategy.pillars
       });
     }
   }, 1000);
   ```

3. **Update effect to use debounced save**:
   ```typescript
   useEffect(() => {
     if (!user || !hasLoadedInitialData.current) return;
     if (combinedString === lastSavedRef.current) return;
     
     lastSavedRef.current = combinedString;
     debouncedSave();
   }, [combinedString, user, debouncedSave]);
   ```

4. **Add flush on unmount/visibility change**:
   ```typescript
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

## Expected Behavior After Fix

1. ✅ Content Goals and Pillars persist to database
2. ✅ Data loads from DB on mount (no placeholders)
3. ✅ "Saving..." → "Saved ✓" UI feedback
4. ✅ Debounced save (1000ms) groups rapid edits
5. ✅ Flush on unmount/navigation ensures no data loss
6. ✅ Same reliable pattern as Calendar v3 and Cheat Sheet

## Testing Steps

1. Type in Content Goals → wait 1 second → verify "Saved ✓"
2. Add/edit Content Pillars → wait 1 second → verify "Saved ✓"
3. Refresh page → verify data persists
4. Navigate away and back → verify data persists
5. Type and immediately navigate → verify changes saved (flush works)
