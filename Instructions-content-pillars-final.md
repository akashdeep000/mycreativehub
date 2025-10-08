# Content Pillars - Rebuild Specification
**Final Implementation Plan for Reliable Database Persistence**

---

## Executive Summary

This document specifies a complete rebuild of the Content Pillars feature to ensure reliable database persistence with no lost keystrokes, proper autosave behavior, and clear visual feedback. The solution reuses the existing `social_media_strategies` table with minimal changes, following the proven patterns from the Cheat Sheet and Calendar V3 implementations.

---

## 1. Root Cause Analysis

### 1.1 Current Implementation Files
- **Frontend**: `client/src/pages/social-media-strategy.tsx` (358 lines)
- **Backend API**: `server/routes.ts` (lines 1878-1933)
- **Storage Layer**: `server/storage.ts` (lines 1147-1170)
- **Database Schema**: `shared/schema.ts` (lines 290-299)

### 1.2 Critical Issues Identified

#### Issue #1: Aggressive Debounce Delay (Line 127 in social-media-strategy.tsx)
```typescript
saveTimerRef.current = setTimeout(() => {
  saveStrategy(newGoals, newPillars);
}, 50); // ← TOO AGGRESSIVE: 50ms
```
**Impact**: Triggers save on nearly every keystroke, causing:
- Race conditions when typing quickly
- Excessive server requests
- Potential data overwrites

#### Issue #2: No Flush Mechanism
**Missing**: Event listeners for:
- Component unmount
- Browser tab visibility change (`visibilitychange`)
- Page unload/refresh (`beforeunload`)

**Impact**: Any changes in the debounce queue (waiting 50ms) are LOST if user:
- Navigates away quickly
- Closes the tab
- Refreshes the page
- Switches tabs

#### Issue #3: No Conflict Resolution
**Current Storage** (server/storage.ts lines 1155-1170):
```typescript
async upsertSocialMediaStrategy(strategyData: InsertSocialMediaStrategy): Promise<SocialMediaStrategy> {
  // Simple upsert - no version checking, no conflicts
  const [strategy] = await db
    .insert(socialMediaStrategies)
    .values(strategyData)
    .onConflictDoUpdate({
      target: socialMediaStrategies.userId,
      set: {
        contentGoals: strategyData.contentGoals,
        pillars: strategyData.pillars,
        updatedAt: new Date(),
      },
    })
    .returning();
  return strategy;
}
```
**Impact**: Last-write-wins with no conflict detection. Concurrent edits from multiple tabs/devices will silently overwrite each other.

#### Issue #4: Refetch During Typing
**Current Query** (lines 50-53):
```typescript
const { data: existingStrategy, isLoading } = useQuery<SocialMediaStrategy>({
  queryKey: ['/api/social-media-strategy'],
  enabled: !!user,
});
```
**Issue**: Query can refetch while user is typing (e.g., window focus, network reconnection), potentially overwriting local unsaved changes.

---

## 2. Final Data Model

### 2.1 Persistence Strategy Choice
**Decision**: Reuse existing `social_media_strategies` table with versioning added.

**Rationale**:
- ✅ Minimal migration impact (just add a version column)
- ✅ Follows proven Cheat Sheet pattern
- ✅ Keeps pillars data logically separate from calendar
- ✅ Maintains backward compatibility
- ✅ No localStorage dependency (per user requirement)

### 2.2 Database Schema Updates

**File**: `shared/schema.ts` (update lines 290-299)

```typescript
// Social media strategy
export const socialMediaStrategies = pgTable("social_media_strategies", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  contentGoals: text("content_goals"),
  pillars: jsonb("pillars").notNull(), // Array of { id: string, name: string, description: string, goals: string, cta: string }
  version: integer("version").notNull().default(1), // ← ADD THIS for optimistic locking
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserId: uniqueIndex("social_media_strategy_user_unique").on(table.userId),
}));
```

**Migration Command**: 
```bash
npm run db:push --force
```

### 2.3 Default Content Pillars

**For brand-new users** (not written to DB until first edit):

```typescript
const DEFAULT_PILLARS = [
  { id: "email", name: "Email", description: "", goals: "", cta: "" },
  { id: "reel", name: "Reel", description: "", goals: "", cta: "" },
  { id: "tiktok", name: "TikTok", description: "", goals: "", cta: "" },
  { id: "shorts", name: "Shorts", description: "", goals: "", cta: "" },
  { id: "long-form-video", name: "Long-Form Video", description: "", goals: "", cta: "" },
  { id: "pinterest", name: "Pinterest", description: "", goals: "", cta: "" },
  { id: "carousel", name: "Carousel", description: "", goals: "", cta: "" },
  { id: "static-post", name: "Static Post", description: "", goals: "", cta: "" },
  { id: "story", name: "Story", description: "", goals: "", cta: "" },
  { id: "newsletter", name: "Newsletter", description: "", goals: "", cta: "" },
  { id: "blog", name: "Blog", description: "", goals: "", cta: "" },
];
```

**Behavior**:
- Show defaults on first load (no DB write)
- Write to DB only on first user edit
- Seed with version: 1

---

## 3. API Contracts

### 3.1 GET /api/strategy/pillars
**Purpose**: Load user's content pillars

**Request**:
```http
GET /api/strategy/pillars
Authorization: Bearer <jwt_token>
```

**Response - Existing User**:
```json
{
  "id": 123,
  "userId": "user_abc",
  "contentGoals": "Educate and inspire my audience",
  "pillars": [
    {
      "id": "email",
      "name": "Email Marketing",
      "description": "Weekly newsletters",
      "goals": "Build email list",
      "cta": "Subscribe to newsletter"
    }
  ],
  "version": 5,
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T14:30:00Z"
}
```

**Response - New User** (no record in DB):
```json
{
  "pillars": [
    { "id": "email", "name": "Email", "description": "", "goals": "", "cta": "" },
    { "id": "reel", "name": "Reel", "description": "", "goals": "", "cta": "" },
    // ... all 11 defaults
  ],
  "contentGoals": "",
  "version": 0
}
```

**Implementation Notes**:
- If no record exists, return defaults with `version: 0` (client-only, not saved to DB)
- Never return `null` or empty object

### 3.2 PUT /api/strategy/pillars
**Purpose**: Save user's content pillars with optimistic locking

**Request**:
```http
PUT /api/strategy/pillars
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "version": 5,
  "contentGoals": "Updated goals",
  "pillars": [
    {
      "id": "email",
      "name": "Email Marketing",
      "description": "Weekly newsletters",
      "goals": "Build email list",
      "cta": "Subscribe"
    }
  ]
}
```

**Success Response (200)**:
```json
{
  "id": 123,
  "userId": "user_abc",
  "contentGoals": "Updated goals",
  "pillars": [...],
  "version": 6,
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T14:35:00Z"
}
```

**Conflict Response (409)**:
```json
{
  "error": "version_conflict",
  "message": "Document was updated by another session",
  "conflict": {
    "version": 7,
    "contentGoals": "...",
    "pillars": [...],
    "updatedAt": "2025-01-15T14:34:00Z"
  }
}
```

**Implementation Logic**:
1. Check if current DB version matches request version
2. If match: Update and increment version
3. If mismatch: Return 409 with latest data
4. If version: 0 (new user): Insert with version: 1

---

## 4. Storage Layer Implementation

### 4.1 Interface Updates
**File**: `server/storage.ts` (update interface around line 257)

```typescript
// Social Media Strategy
getPillarsStrategy(userId: string): Promise<SocialMediaStrategy | undefined>;
upsertPillarsStrategyOptimistic(
  userId: string,
  clientVersion: number,
  contentGoals: string,
  pillars: ContentPillar[]
): Promise<{ success: boolean; strategy?: SocialMediaStrategy; conflict?: SocialMediaStrategy }>;
```

### 4.2 Implementation
**File**: `server/storage.ts` (replace lines 1147-1170)

```typescript
// Social Media Strategy - Pillars
async getPillarsStrategy(userId: string): Promise<SocialMediaStrategy | undefined> {
  const [strategy] = await db
    .select()
    .from(socialMediaStrategies)
    .where(eq(socialMediaStrategies.userId, userId))
    .limit(1);
  return strategy;
}

async upsertPillarsStrategyOptimistic(
  userId: string,
  clientVersion: number,
  contentGoals: string,
  pillars: ContentPillar[]
): Promise<{ success: boolean; strategy?: SocialMediaStrategy; conflict?: SocialMediaStrategy }> {
  
  // Get current document
  const currentStrategy = await this.getPillarsStrategy(userId);
  
  // New user (version 0 from client means "not in DB yet")
  if (!currentStrategy && clientVersion === 0) {
    const [newStrategy] = await db
      .insert(socialMediaStrategies)
      .values({
        userId,
        contentGoals,
        pillars,
        version: 1,
      })
      .returning();
    return { success: true, strategy: newStrategy };
  }
  
  // Document doesn't exist but client has non-zero version - shouldn't happen
  if (!currentStrategy) {
    const [seededStrategy] = await db
      .insert(socialMediaStrategies)
      .values({
        userId,
        contentGoals,
        pillars,
        version: 1,
      })
      .returning();
    return { success: false, conflict: seededStrategy };
  }
  
  // Version conflict check
  if (currentStrategy.version !== clientVersion) {
    return { success: false, conflict: currentStrategy };
  }
  
  // Version matches - update and increment
  const [updatedStrategy] = await db
    .update(socialMediaStrategies)
    .set({
      contentGoals,
      pillars,
      version: currentStrategy.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(socialMediaStrategies.userId, userId))
    .returning();
  
  return { success: true, strategy: updatedStrategy };
}
```

---

## 5. Backend API Routes

**File**: `server/routes.ts` (replace lines 1878-1933)

```typescript
// Content Pillars Strategy routes
app.get('/api/strategy/pillars', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const strategy = await storage.getPillarsStrategy(userId);
    
    // Return defaults for new users (not saved to DB)
    if (!strategy) {
      const DEFAULT_PILLARS = [
        { id: "email", name: "Email", description: "", goals: "", cta: "" },
        { id: "reel", name: "Reel", description: "", goals: "", cta: "" },
        { id: "tiktok", name: "TikTok", description: "", goals: "", cta: "" },
        { id: "shorts", name: "Shorts", description: "", goals: "", cta: "" },
        { id: "long-form-video", name: "Long-Form Video", description: "", goals: "", cta: "" },
        { id: "pinterest", name: "Pinterest", description: "", goals: "", cta: "" },
        { id: "carousel", name: "Carousel", description: "", goals: "", cta: "" },
        { id: "static-post", name: "Static Post", description: "", goals: "", cta: "" },
        { id: "story", name: "Story", description: "", goals: "", cta: "" },
        { id: "newsletter", name: "Newsletter", description: "", goals: "", cta: "" },
        { id: "blog", name: "Blog", description: "", goals: "", cta: "" },
      ];
      
      return res.json({
        pillars: DEFAULT_PILLARS,
        contentGoals: "",
        version: 0
      });
    }
    
    res.json(strategy);
  } catch (error) {
    console.error("Error fetching pillars strategy:", error);
    res.status(500).json({ message: "Failed to fetch pillars strategy" });
  }
});

app.put('/api/strategy/pillars', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { version, contentGoals, pillars } = req.body;
    
    // Validate request
    if (typeof version !== 'number') {
      return res.status(400).json({ message: "Invalid version" });
    }
    
    // Attempt optimistic update
    const result = await storage.upsertPillarsStrategyOptimistic(
      userId,
      version,
      contentGoals || "",
      pillars || []
    );
    
    if (result.success && result.strategy) {
      res.json(result.strategy);
    } else {
      // Version conflict - return 409 with current state
      res.status(409).json({
        error: 'version_conflict',
        message: 'Document was updated by another session',
        conflict: result.conflict
      });
    }
  } catch (error: any) {
    console.error("Error saving pillars strategy:", error);
    res.status(500).json({ message: "Failed to save pillars strategy" });
  }
});
```

---

## 6. Frontend Implementation Plan

### 6.1 State Management
**File**: `client/src/pages/social-media-strategy.tsx`

#### Core State (replace lines 42-48):
```typescript
// Document state (includes version for optimistic locking)
const [strategy, setStrategy] = useState<SocialMediaStrategy | null>(null);
const [contentGoals, setContentGoals] = useState("");
const [pillars, setPillars] = useState<ContentPillar[]>([]);
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

// Track if user has made edits (prevent refetch overwrite)
const hasUserEdited = useRef(false);
```

### 6.2 Data Loading
**Pattern**: Load once, prevent refetch overwrite

```typescript
const { data: serverStrategy, isLoading } = useQuery<SocialMediaStrategy>({
  queryKey: ['/api/strategy/pillars'],
  enabled: !!user,
  staleTime: Infinity,  // ← Prevent automatic refetch
  refetchOnWindowFocus: false,  // ← Don't refetch on focus
  refetchOnMount: false,  // ← Only fetch on initial mount
});

useEffect(() => {
  if (serverStrategy && !hasLoadedInitialData && !hasUserEdited.current) {
    setStrategy(serverStrategy);
    setContentGoals(serverStrategy.contentGoals || "");
    setPillars(serverStrategy.pillars || []);
    setHasLoadedInitialData(true);
  }
}, [serverStrategy, hasLoadedInitialData]);
```

### 6.3 Autosave Implementation

#### Enhanced useDebounce Hook
**File**: `client/src/hooks/use-debounce.ts` (already exists, use the Calendar V3 version)

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
  const callbackRef = useRef(callback);
  const argsRef = useRef<Parameters<T> | null>(null);

  callbackRef.current = callback;

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (argsRef.current) {
      callbackRef.current(...argsRef.current);
      argsRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    argsRef.current = null;
  }, []);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      cancel();
      argsRef.current = args;
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        argsRef.current = null;
      }, delay);
    },
    [delay, cancel]
  );

  return { debounced, flush, cancel };
}
```

#### Save Logic (replace lines 106-128):
```typescript
// Save mutation with optimistic versioning
const saveMutation = useMutation({
  mutationFn: async ({ contentGoals, pillars }: { contentGoals: string; pillars: ContentPillar[] }) => {
    if (!strategy) {
      throw new Error('Strategy not loaded');
    }
    
    const response = await apiRequest('/api/strategy/pillars', {
      method: 'PUT',
      body: JSON.stringify({
        version: strategy.version,
        contentGoals,
        pillars
      }),
    });

    if (response.status === 409) {
      const conflictData = await response.json();
      throw new Error(JSON.stringify({ type: 'conflict', conflict: conflictData.conflict }));
    }

    if (!response.ok) {
      throw new Error('Failed to save');
    }

    return response.json();
  },
  onMutate: () => {
    setSaveStatus('saving');
  },
  onSuccess: (savedStrategy: SocialMediaStrategy) => {
    setStrategy(savedStrategy);  // Update version
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
    queryClient.setQueryData(['/api/strategy/pillars'], savedStrategy);
  },
  onError: async (error: Error) => {
    // Conflict resolution (auto-retry)
    try {
      const errorData = JSON.parse(error.message);
      if (errorData.type === 'conflict') {
        const freshStrategy = await queryClient.fetchQuery({
          queryKey: ['/api/strategy/pillars'],
        }) as SocialMediaStrategy;
        
        if (freshStrategy) {
          setStrategy(freshStrategy);  // Update to latest version
          // Retry save with user's current changes
          setTimeout(() => {
            saveMutation.mutate({ contentGoals, pillars });
          }, 100);
          return;
        }
      }
    } catch {}
    
    setSaveStatus('idle');
    toast({
      title: "Save failed",
      description: "Unable to save changes. Please try again.",
      variant: "destructive",
    });
  },
});

// Debounced save with 250ms delay
const { debounced: debouncedSave, flush: flushSave } = useDebounce(() => {
  hasUserEdited.current = true;  // Mark that user has made edits
  saveMutation.mutate({ contentGoals, pillars });
}, 250);  // ← 250ms delay (up from 50ms)
```

### 6.4 Flush Mechanism
**Critical**: Save pending changes on unmount/visibility change

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
    flushSave();  // Flush on unmount
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [flushSave]);
```

### 6.5 Input Handlers (update lines 130-141):
```typescript
const updateContentGoals = (goals: string) => {
  setContentGoals(goals);
  debouncedSave();  // Will use current state values
};

const updatePillar = (id: string, field: keyof ContentPillar, value: string) => {
  const newPillars = pillars.map(pillar =>
    pillar.id === id ? { ...pillar, [field]: value } : pillar
  );
  setPillars(newPillars);
  debouncedSave();
};

const addPillar = () => {
  const newPillars = [...pillars, { 
    id: `pillar-${Date.now()}`, 
    name: "", 
    description: "", 
    goals: "", 
    cta: "" 
  }];
  setPillars(newPillars);
  flushSave();  // Immediate save for structural changes
  saveMutation.mutate({ contentGoals, pillars: newPillars });
};

const removePillar = (id: string) => {
  if (pillars.length <= 1) {
    toast({
      title: "Cannot remove",
      description: "You need at least one content pillar",
      variant: "destructive",
    });
    return;
  }
  
  const newPillars = pillars.filter(p => p.id !== id);
  setPillars(newPillars);
  flushSave();  // Immediate save for structural changes
  saveMutation.mutate({ contentGoals, pillars: newPillars });
};
```

### 6.6 Save Status Indicator (already exists, keep as-is)
```tsx
{saveStatus === 'saving' && (
  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
    <Loader2 className="w-4 h-4 animate-spin" />
    Saving...
  </span>
)}
{saveStatus === 'saved' && (
  <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
    <Check className="w-4 h-4" />
    Saved ✓
  </span>
)}
```

---

## 7. Conflict Handling Strategy

### 7.1 Automatic Resolution (Primary)
**Pattern**: Auto-retry on conflict (follows Cheat Sheet pattern)

1. Save attempt with version N
2. Server returns 409 (version conflict)
3. Frontend fetches latest (version N+1)
4. Frontend auto-retries save with user's current changes
5. Server saves with version N+2

**User Experience**: Seamless, no manual intervention needed

### 7.2 Edge Case Handling
**Scenario**: Concurrent edits from multiple devices

- **Device A** editing "Email" pillar
- **Device B** editing "Reel" pillar
- Both save at same time

**Resolution**:
1. First save (A) succeeds: version 5 → 6
2. Second save (B) gets 409 conflict
3. B fetches version 6 (has A's changes)
4. B retries with its changes → version 6 → 7
5. Final result: Both edits preserved (last-write-wins per field)

**Trade-off**: Simple, reliable, no complex merge logic needed

---

## 8. Testing & Acceptance Criteria

### 8.1 Functional Tests

#### Test 1: Basic Autosave
1. Load page (see defaults or saved data)
2. Type in any field
3. Wait 250ms
4. ✅ Verify "Saving..." appears
5. ✅ Verify "Saved ✓" appears after success
6. ✅ Refresh page - changes should persist

#### Test 2: No Lost Keystrokes
1. Type rapidly in a field (don't stop)
2. Immediately close tab (before 250ms delay)
3. Reopen page
4. ✅ Verify ALL typed characters are saved

#### Test 3: Tab Switch
1. Type in field
2. Immediately switch to another browser tab
3. Wait 2 seconds
4. Switch back
5. ✅ Verify changes are saved (via "Saved ✓")

#### Test 4: Add/Remove Pillars
1. Click "Add Pillar"
2. ✅ Verify immediate save (no 250ms delay)
3. Click delete on a pillar
4. ✅ Verify immediate save
5. ✅ Verify changes persist on refresh

#### Test 5: Conflict Resolution
1. Open page in two tabs (Tab A, Tab B)
2. Edit different pillars in each tab
3. Both tabs save
4. ✅ Verify both edits are preserved
5. ✅ Verify no error messages shown

#### Test 6: New User Flow
1. Create brand new user account
2. Navigate to Content Pillars
3. ✅ Verify 11 default pillars are shown
4. Edit one pillar
5. Wait 250ms
6. ✅ Verify save occurs (version 0 → 1)
7. Refresh page
8. ✅ Verify edit persisted

### 8.2 Performance Tests

#### Test 7: Rapid Typing
1. Type continuously for 10 seconds (no pauses)
2. ✅ Verify only ONE save request after 250ms of stopping
3. ✅ Verify no lag or UI freeze

#### Test 8: Network Delay
1. Throttle network to "Slow 3G" in DevTools
2. Make an edit
3. ✅ Verify "Saving..." persists during network delay
4. ✅ Verify "Saved ✓" appears after response
5. ✅ Verify UI remains responsive during save

### 8.3 Edge Case Tests

#### Test 9: Offline Recovery
1. Make edits while online
2. Disconnect network
3. Make more edits
4. Wait 250ms (save will fail silently)
5. Reconnect network
6. Make one more edit
7. ✅ Verify latest changes save successfully

#### Test 10: Session Expiry
1. Make edits
2. Let JWT expire (wait ~1 hour or manually expire)
3. Make another edit
4. ✅ Verify error message shown
5. ✅ Verify redirect to login

---

## 9. Rollback Plan

### 9.1 Database Rollback
**If version column causes issues:**

```sql
-- Remove version column (rollback migration)
ALTER TABLE social_media_strategies DROP COLUMN version;
```

### 9.2 Code Rollback
**Revert to previous commit:**

```bash
# Find the commit before these changes
git log --oneline

# Revert specific files
git checkout <commit-hash> -- client/src/pages/social-media-strategy.tsx
git checkout <commit-hash> -- server/routes.ts
git checkout <commit-hash> -- server/storage.ts
git checkout <commit-hash> -- shared/schema.ts

# Push database schema rollback
npm run db:push --force
```

### 9.3 Feature Flag Alternative
**Gradual rollout option:**

```typescript
// In server/routes.ts
const USE_VERSIONED_PILLARS = process.env.ENABLE_PILLARS_VERSIONING === 'true';

if (USE_VERSIONED_PILLARS) {
  // New optimistic locking logic
} else {
  // Old simple upsert logic
}
```

---

## 10. Implementation Checklist

### Phase 1: Database & Backend (Day 1)
- [ ] Add `version` column to `social_media_strategies` schema
- [ ] Run `npm run db:push --force`
- [ ] Update `IStorage` interface with new methods
- [ ] Implement `getPillarsStrategy()`
- [ ] Implement `upsertPillarsStrategyOptimistic()`
- [ ] Update GET `/api/strategy/pillars` route
- [ ] Update PUT `/api/strategy/pillars` route (rename from POST)
- [ ] Add default pillars constant to backend
- [ ] Test API with Postman/curl

### Phase 2: Frontend Core (Day 2)
- [ ] Update state management in social-media-strategy.tsx
- [ ] Update data loading logic (prevent refetch overwrite)
- [ ] Implement versioned save mutation
- [ ] Update debounce delay to 250ms
- [ ] Add flush mechanism (unmount, visibility, beforeunload)
- [ ] Update input handlers to use new save logic
- [ ] Update add/remove pillar handlers (immediate save)

### Phase 3: Conflict Resolution (Day 3)
- [ ] Implement auto-retry on 409 conflict
- [ ] Test concurrent edits from multiple tabs
- [ ] Add error handling for edge cases
- [ ] Verify session expiry handling

### Phase 4: Testing & QA (Day 4)
- [ ] Run all acceptance tests (Test 1-10)
- [ ] Performance testing with network throttling
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive testing
- [ ] Load testing with rapid edits

### Phase 5: Documentation & Deployment
- [ ] Update API documentation
- [ ] Add inline code comments
- [ ] Create user-facing documentation (if needed)
- [ ] Deploy to staging environment
- [ ] Monitor for errors (1 week)
- [ ] Deploy to production

---

## 11. Success Metrics

### Primary Goals ✅
1. **Zero Lost Keystrokes**: All edits persist, even on rapid tab close
2. **Clear Feedback**: "Saving..." → "Saved ✓" every time
3. **Reliable Database**: No localStorage, all data in PostgreSQL
4. **No Content Calendar Touch**: Completely isolated changes

### Performance Targets
- **Debounce delay**: 250ms (5x improvement from 50ms)
- **Save latency**: < 500ms on normal network
- **Conflict resolution**: < 1 second auto-retry
- **UI responsiveness**: No lag during typing

### User Experience Goals
- **Seamless**: Users never think about saving
- **Trustworthy**: Visual confirmation builds confidence
- **Forgiving**: Auto-save on close/navigate prevents data loss
- **Fast**: Minimal network requests, optimal debouncing

---

## 12. Known Limitations & Trade-offs

### Limitations
1. **Last-Write-Wins**: No field-level merge logic (acceptable for this use case)
2. **Network Dependency**: Offline edits won't save until reconnected
3. **Single Document**: One pillars config per user (not per workspace/team)

### Trade-offs Made
- ✅ **Simplicity over complexity**: Auto-retry instead of manual conflict UI
- ✅ **Speed over granularity**: 250ms debounce vs per-character saves
- ✅ **Reliability over features**: Proven patterns vs experimental approaches

### Future Enhancements (Out of Scope)
- Real-time collaboration (WebSocket sync)
- Offline-first with IndexedDB
- Field-level operational transform (CRDTs)
- Undo/redo history
- Pillar templates library

---

## Appendix A: File Change Summary

### Files Modified
1. `shared/schema.ts` - Add version column
2. `server/storage.ts` - Add optimistic locking methods
3. `server/routes.ts` - Update API routes (GET/PUT)
4. `client/src/pages/social-media-strategy.tsx` - Complete rewrite of save logic
5. `client/src/hooks/use-debounce.ts` - Add flush capability (if not already present)

### Files NOT Modified
- ❌ `client/src/pages/monthly-content-calendar-v3.tsx` (per user requirement)
- ❌ `client/src/pages/monthly-content-calendar.tsx`
- ❌ `client/src/pages/content-batching-planner.tsx`
- ❌ Any calendar-related files

### New Files Created
- None (reusing existing files)

---

## Appendix B: References

### Similar Implementations in Codebase
1. **Cheat Sheet** (`automation-toolkit.tsx`):
   - Optimistic versioning ✅
   - Conflict detection ✅
   - Auto-retry logic ✅

2. **Calendar V3** (`monthly-content-calendar-v3.tsx`):
   - Flush on unmount ✅
   - 1000ms debounce ✅
   - Visibility change listeners ✅

3. **Pre-Launch Planner** (localStorage example):
   - Shows what NOT to do ❌
   - Data loss risk ❌

### Key Patterns Used
- **Optimistic UI**: Show changes immediately, save in background
- **Debounced Autosave**: Group rapid edits into single save
- **Flush Mechanism**: Never lose pending changes
- **Version Locking**: Prevent concurrent edit conflicts
- **Auto-Retry**: Seamless conflict resolution

---

**END OF SPECIFICATION**

*This document provides a complete blueprint for rebuilding Content Pillars with reliable database persistence, no lost keystrokes, and excellent user experience. All patterns are proven in the existing codebase (Cheat Sheet, Calendar V3). Implementation should follow the checklist in Section 10.*
