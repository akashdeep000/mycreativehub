# Money Map Ledger Redesign - Implementation Plan

## Executive Summary

**Current Problem**: The "Your Money Map" feature uses a confusing "Save to Monthly Records" button that creates snapshots manually. This causes:
- **Data loss risk**: Users can add entries but forget to click "Save to Monthly Records", losing work on navigation
- **Confusion**: Users don't understand the difference between the current month's working data vs. saved snapshots
- **Poor UX**: Two separate views (current entries + monthly records list) for what should be one unified ledger

**Proposed Solution**: Convert Money Map into a live, auto-saving transaction ledger where:
- Each month is automatically saved as users add/edit/delete entries
- A transaction table shows all entries for the active month in real-time
- Summary cards compute directly from the transaction table
- No manual "Save to Monthly Records" button—everything auto-saves
- Optional "Close Month" feature to lock a month and create a final snapshot

---

## Current Implementation Analysis

### Data Flow (As-Is)

**File**: `client/src/pages/your-money-map.tsx` (1326 lines)

**Current State Structure**:
```typescript
// Lines 117-125
const [incomeExpenseItems, setIncomeExpenseItems] = useState<IncomeExpenseItem[]>([]);
const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
const [monthlySnapshots, setMonthlySnapshots] = useState<MonthlySnapshot[]>([]);
const [taxPercentage, setTaxPercentage] = useState(25);
const [customAllocations, setCustomAllocations] = useState<CustomAllocation[]>([]);
```

**Current Data Storage**:
```typescript
// Database Schema - shared/schema.ts Lines 715-726
export const moneyMap = pgTable("money_map", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  currency: varchar("currency").notNull().default('USD'),
  period: varchar("period").notNull().default('monthly'),
  goalsData: jsonb("goals_data").notNull().default('{}'),
  incomeExpensesData: jsonb("income_expenses_data").notNull().default('{}'), // Stores by period key
  savingsData: jsonb("savings_data").notNull().default('{}'),
  monthlySnapshots: jsonb("monthly_snapshots").notNull().default('[]'), // Manual snapshots
});
```

**Current Save Flow**:
1. User adds income/expense items → updates `incomeExpenseItems` state
2. Auto-save triggers (1s debounce) → saves to `incomeExpensesData` JSONB field keyed by period (e.g., `"2025-10"`)
3. User clicks "Save to Monthly Records" → creates a `MonthlySnapshot` object
4. Snapshot added to `monthlySnapshots` array → triggers another save

**Problems with Current Approach**:
- **Nested JSONB structure**: `incomeExpensesData[periodKey]` stores current working data
- **Separate snapshots**: `monthlySnapshots` array stores "finalized" records
- **Duplicate data**: Same data exists in both `incomeExpensesData` and `monthlySnapshots`
- **Confusion**: Users don't know when data is "saved" vs "recorded"
- **No transaction history**: Can't see a chronological list of all entries

**Current API Routes**:
- `GET /api/persistent/money-map` (Lines 2366-2375 in `server/routes.ts`)
- `PUT /api/persistent/money-map` (Lines 2380-2405 in `server/routes.ts`)

**Current Storage Functions**:
- `getMoneyMap(userId)` (Lines 1668-1674 in `server/storage.ts`)
- `upsertMoneyMap(data)` (Lines 1676-1692 in `server/storage.ts`)

---

## Root Cause Analysis

### Why Current UX Causes Confusion

1. **Implicit vs Explicit Save**
   - Current period data auto-saves to `incomeExpensesData[periodKey]`
   - Monthly Records require manual "Save to Monthly Records" click
   - Users expect one save mechanism, not two

2. **Data Duplication Risk**
   - Same entry can exist in both current period and monthly snapshot
   - No clear "source of truth" for a given month's data
   - Editing current period after saving snapshot creates divergence

3. **No Transaction Audit Trail**
   - Cannot see when entries were added/modified
   - Cannot see entry-level metadata (date added, notes per transaction)
   - Cannot easily export a chronological ledger

4. **Period Navigation Confusion**
   - Navigating to previous month loads from `incomeExpensesData[periodKey]`
   - If user saved a snapshot, data exists in two places
   - User doesn't know which data is "correct"

### Data Loss Scenarios

**Scenario 1: Forgot to Save Snapshot**
1. User adds October entries → auto-saved to `incomeExpensesData["2025-10"]`
2. User navigates away without clicking "Save to Monthly Records"
3. User returns later, adds more entries
4. User never created snapshot → data only in working area
5. If `incomeExpensesData` gets corrupted or reset, all data lost

**Scenario 2: Edited After Snapshot**
1. User saves October snapshot → data frozen in `monthlySnapshots` array
2. User realizes they forgot an entry, adds it
3. Snapshot shows old totals, current period shows new totals
4. Confusion about which is "real"

---

## Proposed Data Model

### New Table: `finance_transactions`

**Rationale**: Instead of storing entries in JSONB arrays, use a proper relational table with one row per transaction.

```typescript
// shared/schema.ts - Add new table
export const financeTransactions = pgTable("finance_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Transaction details
  date: timestamp("date").notNull(), // When transaction occurred (user-editable)
  type: varchar("type").notNull(), // 'income' or 'expense'
  category: varchar("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"), // Optional per-transaction notes
  
  // Month association
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Optional: track if month is closed
  isDeleted: boolean("is_deleted").notNull().default(false), // Soft delete
});

// Index for efficient queries
CREATE INDEX idx_finance_transactions_user_year_month 
ON finance_transactions(user_id, year, month);

CREATE INDEX idx_finance_transactions_date 
ON finance_transactions(user_id, date DESC);
```

**Insert Schema**:
```typescript
export const insertFinanceTransactionSchema = createInsertSchema(financeTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFinanceTransaction = z.infer<typeof insertFinanceTransactionSchema>;
export type FinanceTransaction = typeof financeTransactions.$inferSelect;
```

### Updated Table: `money_map_months`

**Rationale**: Track month-level metadata (currency, tax %, allocations, closed status).

```typescript
// shared/schema.ts - Add new table for month metadata
export const moneyMapMonths = pgTable("money_map_months", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Month identifier
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  
  // Month settings
  currency: varchar("currency").notNull().default('GBP'),
  taxPercentage: numeric("tax_percentage", { precision: 5, scale: 2 }).notNull().default('25'),
  
  // Custom allocations (e.g., savings %, investment %)
  customAllocations: jsonb("custom_allocations").notNull().default('[]'),
  // Example: [{ id: "1", name: "Savings", percentage: 20 }, ...]
  
  // Month status
  isClosed: boolean("is_closed").notNull().default(false),
  closedAt: timestamp("closed_at"),
  closedSnapshot: jsonb("closed_snapshot"), // Summary when month was closed
  
  // Optional notes
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unique constraint: one record per user per month
CREATE UNIQUE INDEX idx_money_map_months_user_year_month 
ON money_map_months(user_id, year, month);
```

**Insert Schema**:
```typescript
export const insertMoneyMapMonthSchema = createInsertSchema(moneyMapMonths).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMoneyMapMonth = z.infer<typeof insertMoneyMapMonthSchema>;
export type MoneyMapMonth = typeof moneyMapMonths.$inferSelect;
```

### Migration Strategy

**Phase 1: Create New Tables**
- Run `npm run db:push` to add `finance_transactions` and `money_map_months`
- Keep existing `money_map` table untouched (for rollback safety)

**Phase 2: Migrate Existing Data** (Optional - only if users have data)
```typescript
// Migration script (run once)
async function migrateMoneyMapData() {
  // 1. Get all users with money map data
  const users = await db.select().from(moneyMap);
  
  for (const user of users) {
    // 2. For each period in incomeExpensesData
    if (user.incomeExpensesData) {
      for (const [periodKey, periodData] of Object.entries(user.incomeExpensesData)) {
        // periodKey format: "2025-10" (monthly)
        const [year, monthStr] = periodKey.split('-');
        const month = parseInt(monthStr);
        
        // 3. Create month record
        await db.insert(moneyMapMonths).values({
          userId: user.userId,
          year: parseInt(year),
          month,
          currency: user.currency,
          taxPercentage: periodData.taxPercentage || 25,
          customAllocations: periodData.customAllocations || [],
          notes: periodData.trackerNotes || periodData.budgetNotes || '',
        }).onConflictDoNothing();
        
        // 4. Migrate incomeExpenseItems to transactions
        if (periodData.incomeExpenseItems) {
          for (const item of periodData.incomeExpenseItems) {
            await db.insert(financeTransactions).values({
              userId: user.userId,
              date: new Date(parseInt(year), month - 1, 15), // Default to mid-month
              type: item.type,
              category: item.category,
              amount: item.actualAmount.toString(),
              year: parseInt(year),
              month,
            });
          }
        }
      }
    }
    
    // 5. Migrate monthlySnapshots to closed months
    if (user.monthlySnapshots) {
      for (const snapshot of user.monthlySnapshots) {
        // Parse monthYear: "January 2025" or "Q1: Jan–Mar 2025"
        const dateMatch = snapshot.monthYear.match(/(\w+)\s+(\d{4})/);
        if (dateMatch) {
          const monthName = dateMatch[1];
          const year = parseInt(dateMatch[2]);
          const monthMap = {
            January: 1, February: 2, March: 3, April: 4,
            May: 5, June: 6, July: 7, August: 8,
            September: 9, October: 10, November: 11, December: 12
          };
          const month = monthMap[monthName];
          
          // Mark month as closed
          await db.update(moneyMapMonths)
            .set({
              isClosed: true,
              closedAt: new Date(snapshot.savedDate),
              closedSnapshot: snapshot.summary,
            })
            .where(and(
              eq(moneyMapMonths.userId, user.userId),
              eq(moneyMapMonths.year, year),
              eq(moneyMapMonths.month, month)
            ));
        }
      }
    }
  }
}
```

---

## API Contracts

### 1. Get Transactions for Month

**Endpoint**: `GET /api/finance/transactions/:year/:month`

**Request**:
```http
GET /api/finance/transactions/2025/10
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):
```json
{
  "transactions": [
    {
      "id": 1,
      "userId": "user_123",
      "date": "2025-10-05T10:00:00.000Z",
      "type": "income",
      "category": "Freelance",
      "amount": "5000.00",
      "notes": "Client X payment",
      "year": 2025,
      "month": 10,
      "createdAt": "2025-10-05T10:00:00.000Z",
      "updatedAt": "2025-10-05T10:00:00.000Z",
      "isDeleted": false
    },
    {
      "id": 2,
      "userId": "user_123",
      "date": "2025-10-12T14:30:00.000Z",
      "type": "expense",
      "category": "Software",
      "amount": "99.00",
      "notes": "Adobe subscription",
      "year": 2025,
      "month": 10,
      "createdAt": "2025-10-12T14:30:00.000Z",
      "updatedAt": "2025-10-12T14:30:00.000Z",
      "isDeleted": false
    }
  ],
  "monthMetadata": {
    "id": 1,
    "userId": "user_123",
    "year": 2025,
    "month": 10,
    "currency": "GBP",
    "taxPercentage": "25.00",
    "customAllocations": [
      { "id": "1", "name": "Savings", "percentage": 20 }
    ],
    "isClosed": false,
    "closedAt": null,
    "closedSnapshot": null,
    "notes": "",
    "createdAt": "2025-10-01T00:00:00.000Z",
    "updatedAt": "2025-10-05T10:00:00.000Z"
  }
}
```

**Response** (404 Not Found):
```json
{
  "transactions": [],
  "monthMetadata": null
}
```

---

### 2. Create Transaction

**Endpoint**: `POST /api/finance/transactions`

**Request**:
```http
POST /api/finance/transactions
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "date": "2025-10-15T00:00:00.000Z",
  "type": "income",
  "category": "Consulting",
  "amount": "3500.00",
  "notes": "Project Y milestone",
  "year": 2025,
  "month": 10
}
```

**Response** (201 Created):
```json
{
  "id": 3,
  "userId": "user_123",
  "date": "2025-10-15T00:00:00.000Z",
  "type": "income",
  "category": "Consulting",
  "amount": "3500.00",
  "notes": "Project Y milestone",
  "year": 2025,
  "month": 10,
  "createdAt": "2025-10-15T10:30:00.000Z",
  "updatedAt": "2025-10-15T10:30:00.000Z",
  "isDeleted": false
}
```

---

### 3. Update Transaction

**Endpoint**: `PUT /api/finance/transactions/:id`

**Request**:
```http
PUT /api/finance/transactions/3
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "category": "Consulting - New Client",
  "amount": "4000.00",
  "notes": "Updated: final payment received"
}
```

**Response** (200 OK):
```json
{
  "id": 3,
  "userId": "user_123",
  "date": "2025-10-15T00:00:00.000Z",
  "type": "income",
  "category": "Consulting - New Client",
  "amount": "4000.00",
  "notes": "Updated: final payment received",
  "year": 2025,
  "month": 10,
  "createdAt": "2025-10-15T10:30:00.000Z",
  "updatedAt": "2025-10-15T11:00:00.000Z",
  "isDeleted": false
}
```

---

### 4. Delete Transaction

**Endpoint**: `DELETE /api/finance/transactions/:id`

**Request**:
```http
DELETE /api/finance/transactions/3
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Transaction deleted"
}
```

**Note**: Implement soft delete (set `isDeleted = true`) to maintain audit trail.

---

### 5. Update Month Metadata

**Endpoint**: `PUT /api/finance/months/:year/:month`

**Request**:
```http
PUT /api/finance/months/2025/10
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "currency": "USD",
  "taxPercentage": "30.00",
  "customAllocations": [
    { "id": "1", "name": "Savings", "percentage": 25 },
    { "id": "2", "name": "Investment", "percentage": 15 }
  ],
  "notes": "High earning month - adjust allocations"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "userId": "user_123",
  "year": 2025,
  "month": 10,
  "currency": "USD",
  "taxPercentage": "30.00",
  "customAllocations": [
    { "id": "1", "name": "Savings", "percentage": 25 },
    { "id": "2", "name": "Investment", "percentage": 15 }
  ],
  "isClosed": false,
  "closedAt": null,
  "closedSnapshot": null,
  "notes": "High earning month - adjust allocations",
  "createdAt": "2025-10-01T00:00:00.000Z",
  "updatedAt": "2025-10-15T12:00:00.000Z"
}
```

---

### 6. Close Month

**Endpoint**: `POST /api/finance/months/:year/:month/close`

**Request**:
```http
POST /api/finance/months/2025/10/close
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "userId": "user_123",
  "year": 2025,
  "month": 10,
  "currency": "GBP",
  "taxPercentage": "25.00",
  "customAllocations": [],
  "isClosed": true,
  "closedAt": "2025-11-01T00:00:00.000Z",
  "closedSnapshot": {
    "totalIncome": 8500.00,
    "totalExpenses": 3200.00,
    "profit": 5300.00,
    "taxSetAside": 1325.00,
    "customAllocationsTotal": 0,
    "availableAfterAllocations": 3975.00,
    "profitMargin": 62.35,
    "transactionCount": 12
  },
  "notes": "",
  "createdAt": "2025-10-01T00:00:00.000Z",
  "updatedAt": "2025-11-01T00:00:00.000Z"
}
```

**Effect**: Sets `isClosed = true`, stores snapshot of summary, prevents further edits (optional).

---

### 7. Reopen Month

**Endpoint**: `POST /api/finance/months/:year/:month/reopen`

**Request**:
```http
POST /api/finance/months/2025/10/reopen
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "userId": "user_123",
  "year": 2025,
  "month": 10,
  "currency": "GBP",
  "taxPercentage": "25.00",
  "customAllocations": [],
  "isClosed": false,
  "closedAt": null,
  "closedSnapshot": null,
  "notes": "",
  "createdAt": "2025-10-01T00:00:00.000Z",
  "updatedAt": "2025-11-01T01:00:00.000Z"
}
```

---

### 8. Export Month to CSV

**Endpoint**: `GET /api/finance/months/:year/:month/export`

**Request**:
```http
GET /api/finance/months/2025/10/export
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):
```
Content-Type: text/csv
Content-Disposition: attachment; filename="money-map-2025-10.csv"

Date,Type,Category,Amount,Notes
2025-10-05,Income,Freelance,5000.00,Client X payment
2025-10-12,Expense,Software,99.00,Adobe subscription
2025-10-15,Income,Consulting,4000.00,Updated: final payment received

Summary
Total Income,9000.00
Total Expenses,99.00
Profit,8901.00
Tax (25%),2225.25
Available After Tax,6675.75
```

---

## Frontend Changes

### Component Structure (Proposed)

**File**: `client/src/pages/your-money-map.tsx`

**New State Shape**:
```typescript
// Remove old state
// const [incomeExpenseItems, setIncomeExpenseItems] = useState<IncomeExpenseItem[]>([]);
// const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
// const [monthlySnapshots, setMonthlySnapshots] = useState<MonthlySnapshot[]>([]);

// New state
const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
const [monthMetadata, setMonthMetadata] = useState<MoneyMapMonth | null>(null);
const [currentDate, setCurrentDate] = useState(new Date());
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

// Form state for adding new transaction
const [newTransaction, setNewTransaction] = useState({
  date: new Date(),
  type: 'income' as 'income' | 'expense',
  category: '',
  amount: '',
  notes: '',
});
```

**New Data Fetching**:
```typescript
// Fetch transactions for current month
const { data: monthData, isLoading, refetch } = useQuery({
  queryKey: ['/api/finance/transactions', currentDate.getFullYear(), currentDate.getMonth() + 1],
  enabled: !!user,
  refetchOnMount: true,
});

useEffect(() => {
  if (monthData) {
    setTransactions(monthData.transactions || []);
    setMonthMetadata(monthData.monthMetadata);
  }
}, [monthData]);
```

**Auto-Save Mutations**:
```typescript
// Create transaction
const createMutation = useMutation({
  mutationFn: async (data: InsertFinanceTransaction) => {
    const response = await apiRequest('/api/finance/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create transaction');
    return response.json();
  },
  onMutate: () => setSaveStatus('saving'),
  onSuccess: (newTransaction) => {
    setTransactions(prev => [...prev, newTransaction]);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  },
  onError: () => {
    setSaveStatus('idle');
    toast({ title: "Save Failed", variant: "destructive" });
  },
});

// Update transaction
const updateMutation = useMutation({
  mutationFn: async ({ id, data }: { id: number; data: Partial<InsertFinanceTransaction> }) => {
    const response = await apiRequest(`/api/finance/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update transaction');
    return response.json();
  },
  onMutate: () => setSaveStatus('saving'),
  onSuccess: (updatedTransaction) => {
    setTransactions(prev =>
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
    );
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  },
  onError: () => {
    setSaveStatus('idle');
    toast({ title: "Update Failed", variant: "destructive" });
  },
});

// Delete transaction
const deleteMutation = useMutation({
  mutationFn: async (id: number) => {
    const response = await apiRequest(`/api/finance/transactions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete transaction');
    return response.json();
  },
  onMutate: () => setSaveStatus('saving'),
  onSuccess: (_, deletedId) => {
    setTransactions(prev => prev.filter(t => t.id !== deletedId));
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  },
  onError: () => {
    setSaveStatus('idle');
    toast({ title: "Delete Failed", variant: "destructive" });
  },
});
```

**Debounced Updates** (for inline editing):
```typescript
const { debounced: debouncedUpdate, flush: flushUpdate } = useDebounce((id: number, field: string, value: any) => {
  updateMutation.mutate({ id, data: { [field]: value } });
}, 1000);

// Save on unmount / navigation
useEffect(() => {
  const handleBeforeUnload = () => flushUpdate();
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') flushUpdate();
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    flushUpdate();
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [flushUpdate]);
```

---

### UI Layout (Proposed)

**Section 1: Month Header**
```tsx
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-4">
    <Button variant="outline" size="sm" onClick={() => navigatePrevMonth()}>
      <ChevronLeft className="w-4 h-4" />
    </Button>
    <h2 className="text-2xl font-semibold">
      {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
    </h2>
    <Button variant="outline" size="sm" onClick={() => navigateNextMonth()}>
      <ChevronRight className="w-4 h-4" />
    </Button>
  </div>
  
  <div className="flex items-center gap-3">
    {/* Save status indicator */}
    {saveStatus === 'saving' && (
      <span className="text-sm text-gray-500 flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving...
      </span>
    )}
    {saveStatus === 'saved' && (
      <span className="text-sm text-green-600 flex items-center gap-2">
        <CheckCircle className="w-3 h-3" />
        Saved
      </span>
    )}
    
    {/* Month closed badge */}
    {monthMetadata?.isClosed && (
      <Badge variant="secondary">Closed</Badge>
    )}
  </div>
</div>
```

**Section 2: Add Transaction Form**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Add Transaction</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div>
        <Label>Date</Label>
        <Input
          type="date"
          value={newTransaction.date.toISOString().split('T')[0]}
          onChange={(e) => setNewTransaction({ ...newTransaction, date: new Date(e.target.value) })}
        />
      </div>
      
      <div>
        <Label>Type</Label>
        <Select value={newTransaction.type} onValueChange={(val) => setNewTransaction({ ...newTransaction, type: val as 'income' | 'expense' })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label>Category</Label>
        <Input
          value={newTransaction.category}
          onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
          placeholder="e.g., Freelance"
        />
      </div>
      
      <div>
        <Label>Amount</Label>
        <Input
          type="number"
          step="0.01"
          value={newTransaction.amount}
          onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
          placeholder="0.00"
        />
      </div>
      
      <div>
        <Label>Notes (Optional)</Label>
        <Input
          value={newTransaction.notes}
          onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
          placeholder="Optional"
        />
      </div>
    </div>
    
    <Button
      className="mt-4"
      onClick={() => {
        createMutation.mutate({
          userId: user.id,
          date: newTransaction.date,
          type: newTransaction.type,
          category: newTransaction.category,
          amount: newTransaction.amount,
          notes: newTransaction.notes || '',
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1,
          isDeleted: false,
        });
        // Reset form
        setNewTransaction({
          date: new Date(),
          type: 'income',
          category: '',
          amount: '',
          notes: '',
        });
      }}
      disabled={!newTransaction.category || !newTransaction.amount || createMutation.isPending}
    >
      {createMutation.isPending ? 'Adding...' : 'Add Transaction'}
    </Button>
  </CardContent>
</Card>
```

**Section 3: Transactions Table**
```tsx
<Card className="mt-6">
  <CardHeader>
    <CardTitle>Transactions</CardTitle>
  </CardHeader>
  <CardContent>
    {isLoading ? (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
        <p className="text-gray-500 mt-2">Loading transactions...</p>
      </div>
    ) : transactions.length === 0 ? (
      <div className="text-center py-8">
        <p className="text-gray-500">No transactions yet. Add your first entry above!</p>
      </div>
    ) : (
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Date</th>
            <th className="text-left py-2">Type</th>
            <th className="text-left py-2">Category</th>
            <th className="text-left py-2">Notes</th>
            <th className="text-right py-2">Amount</th>
            <th className="text-center py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((transaction) => (
              <tr key={transaction.id} className="border-b hover:bg-gray-50">
                <td className="py-3">
                  {new Date(transaction.date).toLocaleDateString()}
                </td>
                <td className="py-3">
                  <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                    {transaction.type}
                  </Badge>
                </td>
                <td className="py-3">{transaction.category}</td>
                <td className="py-3 text-sm text-gray-600">{transaction.notes || '-'}</td>
                <td className="py-3 text-right font-semibold">
                  <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {getCurrencySymbol(monthMetadata?.currency || 'GBP')}
                    {parseFloat(transaction.amount).toLocaleString()}
                  </span>
                </td>
                <td className="py-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this transaction?')) {
                        deleteMutation.mutate(transaction.id);
                      }
                    }}
                    disabled={monthMetadata?.isClosed || deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    )}
  </CardContent>
</Card>
```

**Section 4: Summary Cards**
```tsx
const summary = useMemo(() => {
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  const profit = income - expenses;
  const taxRate = monthMetadata?.taxPercentage ? parseFloat(monthMetadata.taxPercentage) / 100 : 0.25;
  const taxAmount = profit * taxRate;
  const afterTax = profit - taxAmount;
  
  // Calculate custom allocations
  const allocations = (monthMetadata?.customAllocations || []).map(alloc => ({
    ...alloc,
    amount: afterTax * (alloc.percentage / 100),
  }));
  const allocationsTotal = allocations.reduce((sum, a) => sum + a.amount, 0);
  const available = afterTax - allocationsTotal;
  
  return {
    income,
    expenses,
    profit,
    taxAmount,
    afterTax,
    allocations,
    allocationsTotal,
    available,
    profitMargin: income > 0 ? (profit / income) * 100 : 0,
  };
}, [transactions, monthMetadata]);

return (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Total Income</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-green-600">
          {formatCurrency(summary.income)}
        </p>
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Total Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-red-600">
          {formatCurrency(summary.expenses)}
        </p>
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Profit</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${summary.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
          {formatCurrency(summary.profit)}
        </p>
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Profit Margin</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-purple-600">
          {summary.profitMargin.toFixed(1)}%
        </p>
      </CardContent>
    </Card>
  </div>
);
```

**Section 5: Actions**
```tsx
<div className="flex justify-end gap-3 mt-6">
  <Button
    variant="outline"
    onClick={() => {
      window.location.href = `/api/finance/months/${currentDate.getFullYear()}/${currentDate.getMonth() + 1}/export`;
    }}
  >
    <Download className="w-4 h-4 mr-2" />
    Export CSV
  </Button>
  
  {!monthMetadata?.isClosed ? (
    <Button
      onClick={() => closeMonthMutation.mutate()}
      className="bg-blue-600 hover:bg-blue-700"
    >
      <Archive className="w-4 h-4 mr-2" />
      Close Month
    </Button>
  ) : (
    <Button
      variant="outline"
      onClick={() => reopenMonthMutation.mutate()}
    >
      Reopen Month
    </Button>
  )}
</div>
```

---

## Backend Implementation

### Storage Functions

**File**: `server/storage.ts`

```typescript
// Add to IStorage interface
interface IStorage {
  // ... existing methods
  
  // Finance Transactions
  getTransactionsForMonth(userId: string, year: number, month: number): Promise<FinanceTransaction[]>;
  createTransaction(data: InsertFinanceTransaction): Promise<FinanceTransaction>;
  updateTransaction(id: number, data: Partial<InsertFinanceTransaction>): Promise<FinanceTransaction>;
  deleteTransaction(id: number): Promise<void>;
  
  // Month Metadata
  getMonthMetadata(userId: string, year: number, month: number): Promise<MoneyMapMonth | undefined>;
  upsertMonthMetadata(data: InsertMoneyMapMonth): Promise<MoneyMapMonth>;
  closeMonth(userId: string, year: number, month: number, snapshot: any): Promise<MoneyMapMonth>;
  reopenMonth(userId: string, year: number, month: number): Promise<MoneyMapMonth>;
}

// Implement in DbStorage class
class DbStorage implements IStorage {
  // ... existing methods
  
  async getTransactionsForMonth(userId: string, year: number, month: number): Promise<FinanceTransaction[]> {
    const transactions = await db
      .select()
      .from(financeTransactions)
      .where(and(
        eq(financeTransactions.userId, userId),
        eq(financeTransactions.year, year),
        eq(financeTransactions.month, month),
        eq(financeTransactions.isDeleted, false)
      ))
      .orderBy(desc(financeTransactions.date));
    
    return transactions;
  }
  
  async createTransaction(data: InsertFinanceTransaction): Promise<FinanceTransaction> {
    const [transaction] = await db
      .insert(financeTransactions)
      .values(data)
      .returning();
    
    return transaction;
  }
  
  async updateTransaction(id: number, data: Partial<InsertFinanceTransaction>): Promise<FinanceTransaction> {
    const [transaction] = await db
      .update(financeTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(financeTransactions.id, id))
      .returning();
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    return transaction;
  }
  
  async deleteTransaction(id: number): Promise<void> {
    // Soft delete
    await db
      .update(financeTransactions)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(financeTransactions.id, id));
  }
  
  async getMonthMetadata(userId: string, year: number, month: number): Promise<MoneyMapMonth | undefined> {
    const [metadata] = await db
      .select()
      .from(moneyMapMonths)
      .where(and(
        eq(moneyMapMonths.userId, userId),
        eq(moneyMapMonths.year, year),
        eq(moneyMapMonths.month, month)
      ));
    
    return metadata;
  }
  
  async upsertMonthMetadata(data: InsertMoneyMapMonth): Promise<MoneyMapMonth> {
    const [metadata] = await db
      .insert(moneyMapMonths)
      .values(data)
      .onConflictDoUpdate({
        target: [moneyMapMonths.userId, moneyMapMonths.year, moneyMapMonths.month],
        set: {
          currency: data.currency,
          taxPercentage: data.taxPercentage,
          customAllocations: data.customAllocations,
          notes: data.notes,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return metadata;
  }
  
  async closeMonth(userId: string, year: number, month: number, snapshot: any): Promise<MoneyMapMonth> {
    const [metadata] = await db
      .update(moneyMapMonths)
      .set({
        isClosed: true,
        closedAt: new Date(),
        closedSnapshot: snapshot,
        updatedAt: new Date(),
      })
      .where(and(
        eq(moneyMapMonths.userId, userId),
        eq(moneyMapMonths.year, year),
        eq(moneyMapMonths.month, month)
      ))
      .returning();
    
    if (!metadata) {
      throw new Error('Month not found');
    }
    
    return metadata;
  }
  
  async reopenMonth(userId: string, year: number, month: number): Promise<MoneyMapMonth> {
    const [metadata] = await db
      .update(moneyMapMonths)
      .set({
        isClosed: false,
        closedAt: null,
        closedSnapshot: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(moneyMapMonths.userId, userId),
        eq(moneyMapMonths.year, year),
        eq(moneyMapMonths.month, month)
      ))
      .returning();
    
    if (!metadata) {
      throw new Error('Month not found');
    }
    
    return metadata;
  }
}
```

---

### API Routes

**File**: `server/routes.ts`

```typescript
// Get transactions for month
app.get('/api/finance/transactions/:year/:month', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    const transactions = await storage.getTransactionsForMonth(userId, year, month);
    
    // Get or create month metadata
    let monthMetadata = await storage.getMonthMetadata(userId, year, month);
    if (!monthMetadata) {
      monthMetadata = await storage.upsertMonthMetadata({
        userId,
        year,
        month,
        currency: 'GBP',
        taxPercentage: '25',
        customAllocations: [],
        isClosed: false,
      });
    }
    
    res.json({
      transactions,
      monthMetadata,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// Create transaction
app.post('/api/finance/transactions', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { date, type, category, amount, notes, year, month } = req.body;
    
    const transaction = await storage.createTransaction({
      userId,
      date: new Date(date),
      type,
      category,
      amount,
      notes: notes || '',
      year,
      month,
      isDeleted: false,
    });
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Failed to create transaction' });
  }
});

// Update transaction
app.put('/api/finance/transactions/:id', jwtAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    // Convert date string to Date if present
    if (updates.date) {
      updates.date = new Date(updates.date);
    }
    
    const transaction = await storage.updateTransaction(id, updates);
    
    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: 'Failed to update transaction' });
  }
});

// Delete transaction
app.delete('/api/finance/transactions/:id', jwtAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    
    await storage.deleteTransaction(id);
    
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Failed to delete transaction' });
  }
});

// Update month metadata
app.put('/api/finance/months/:year/:month', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const { currency, taxPercentage, customAllocations, notes } = req.body;
    
    const metadata = await storage.upsertMonthMetadata({
      userId,
      year,
      month,
      currency,
      taxPercentage,
      customAllocations,
      notes,
      isClosed: false,
    });
    
    res.json(metadata);
  } catch (error) {
    console.error('Error updating month metadata:', error);
    res.status(500).json({ message: 'Failed to update month metadata' });
  }
});

// Close month
app.post('/api/finance/months/:year/:month/close', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    // Calculate summary from transactions
    const transactions = await storage.getTransactionsForMonth(userId, year, month);
    const monthMetadata = await storage.getMonthMetadata(userId, year, month);
    
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const profit = income - expenses;
    const taxRate = monthMetadata?.taxPercentage ? parseFloat(monthMetadata.taxPercentage) / 100 : 0.25;
    const taxSetAside = profit * taxRate;
    const afterTax = profit - taxSetAside;
    
    // Calculate allocations
    const allocations = (monthMetadata?.customAllocations || []) as any[];
    const customAllocationsTotal = allocations.reduce((sum, a) => {
      return sum + (afterTax * (a.percentage / 100));
    }, 0);
    
    const availableAfterAllocations = afterTax - customAllocationsTotal;
    const profitMargin = income > 0 ? (profit / income) * 100 : 0;
    
    const snapshot = {
      totalIncome: income,
      totalExpenses: expenses,
      profit,
      taxSetAside,
      customAllocationsTotal,
      availableAfterAllocations,
      profitMargin,
      transactionCount: transactions.length,
    };
    
    const closedMonth = await storage.closeMonth(userId, year, month, snapshot);
    
    res.json(closedMonth);
  } catch (error) {
    console.error('Error closing month:', error);
    res.status(500).json({ message: 'Failed to close month' });
  }
});

// Reopen month
app.post('/api/finance/months/:year/:month/reopen', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    const reopenedMonth = await storage.reopenMonth(userId, year, month);
    
    res.json(reopenedMonth);
  } catch (error) {
    console.error('Error reopening month:', error);
    res.status(500).json({ message: 'Failed to reopen month' });
  }
});

// Export month to CSV
app.get('/api/finance/months/:year/:month/export', jwtAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    const transactions = await storage.getTransactionsForMonth(userId, year, month);
    const monthMetadata = await storage.getMonthMetadata(userId, year, month);
    
    // Build CSV
    let csv = 'Date,Type,Category,Amount,Notes\n';
    
    transactions.forEach(t => {
      const date = new Date(t.date).toLocaleDateString();
      const type = t.type.charAt(0).toUpperCase() + t.type.slice(1);
      const category = t.category.replace(/,/g, ' '); // Escape commas
      const amount = parseFloat(t.amount).toFixed(2);
      const notes = (t.notes || '').replace(/,/g, ' '); // Escape commas
      
      csv += `${date},${type},${category},${amount},${notes}\n`;
    });
    
    // Add summary
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const profit = income - expenses;
    const taxRate = monthMetadata?.taxPercentage ? parseFloat(monthMetadata.taxPercentage) : 25;
    const taxAmount = profit * (taxRate / 100);
    const afterTax = profit - taxAmount;
    
    csv += '\nSummary\n';
    csv += `Total Income,${income.toFixed(2)}\n`;
    csv += `Total Expenses,${expenses.toFixed(2)}\n`;
    csv += `Profit,${profit.toFixed(2)}\n`;
    csv += `Tax (${taxRate}%),${taxAmount.toFixed(2)}\n`;
    csv += `Available After Tax,${afterTax.toFixed(2)}\n`;
    
    // Set headers
    const filename = `money-map-${year}-${String(month).padStart(2, '0')}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting month:', error);
    res.status(500).json({ message: 'Failed to export month' });
  }
});
```

---

## Acceptance Tests

### Test 1: Add Transaction Persists After Refresh

**Steps**:
1. Navigate to "Your Money Map"
2. Add a new income transaction: Date=Today, Type=Income, Category="Freelance", Amount=5000
3. Click "Add Transaction"
4. Verify "Saving..." then "Saved ✓" appears
5. Refresh the page (F5)
6. Verify transaction appears in the table
7. Verify Total Income summary shows £5000

**Success Criteria**:
- ✅ Transaction appears in table after refresh
- ✅ Summary cards update correctly
- ✅ Save status indicator shows "Saved ✓"

---

### Test 2: Edit Transaction (Inline)

**Steps**:
1. From Test 1, click on the Category field in the transaction row
2. Change category to "Consulting"
3. Tab away or click outside the field
4. Wait 1 second (debounce)
5. Verify "Saving..." then "Saved ✓" appears
6. Refresh the page
7. Verify category updated to "Consulting"

**Success Criteria**:
- ✅ Inline edit saves automatically
- ✅ Change persists after refresh

---

### Test 3: Delete Transaction

**Steps**:
1. From Test 2, click the trash icon on the transaction
2. Confirm deletion in the dialog
3. Verify "Saving..." then "Saved ✓" appears
4. Verify transaction removed from table
5. Verify Total Income summary shows £0
6. Refresh the page
7. Verify transaction still deleted

**Success Criteria**:
- ✅ Delete persists after refresh
- ✅ Summary updates immediately

---

### Test 4: Navigate Between Months

**Steps**:
1. Add transaction in October 2025: Income £5000
2. Click "Next Month" arrow → November 2025
3. Verify table is empty (no transactions)
4. Add transaction in November: Expense £200
5. Click "Previous Month" arrow → October 2025
6. Verify October transaction (£5000) still there
7. Click "Next Month" → November 2025
8. Verify November transaction (£200) still there

**Success Criteria**:
- ✅ Each month maintains its own transaction list
- ✅ Data doesn't bleed between months

---

### Test 5: Export CSV

**Steps**:
1. Add 3 transactions: 2 income, 1 expense
2. Click "Export CSV"
3. Verify file downloads: `money-map-2025-10.csv`
4. Open file in Excel/Numbers/Google Sheets
5. Verify all 3 transactions listed with correct dates, types, categories, amounts
6. Verify summary section at bottom with correct totals

**Success Criteria**:
- ✅ CSV file downloads
- ✅ All transactions present
- ✅ Summary correct

---

### Test 6: Close Month

**Steps**:
1. Add several transactions in October
2. Click "Close Month"
3. Verify badge changes to "Closed"
4. Verify "Add Transaction" form is disabled
5. Verify delete buttons on transactions are disabled
6. Refresh page
7. Verify month still shows as closed
8. Navigate to November, add transaction
9. Navigate back to October
10. Verify still closed, cannot edit

**Success Criteria**:
- ✅ Closed status persists
- ✅ Cannot edit closed month
- ✅ Can still view and export

---

### Test 7: Reopen Month

**Steps**:
1. From Test 6 (October closed)
2. Click "Reopen Month"
3. Verify badge removed
4. Verify "Add Transaction" form enabled
5. Add a new transaction
6. Verify saves successfully
7. Close month again
8. Verify new transaction included in closed snapshot

**Success Criteria**:
- ✅ Can reopen and edit
- ✅ Re-closing updates snapshot

---

### Test 8: Auto-Save on Navigation Away

**Steps**:
1. Add transaction but DON'T wait for "Saved ✓"
2. Immediately navigate to another page (e.g., Home)
3. Navigate back to "Your Money Map"
4. Verify transaction saved

**Success Criteria**:
- ✅ beforeunload/visibilitychange flush works
- ✅ No data loss on quick navigation

---

## Migration & Rollback Plan

### Phase 1: Database Changes (Low Risk)

**Action**: Add new tables without touching existing data

1. Update `shared/schema.ts`:
   - Add `financeTransactions` table
   - Add `moneyMapMonths` table
   - Add insert schemas and types
   
2. Run migration:
   ```bash
   npm run db:push
   ```
   
3. Verify tables created:
   ```sql
   \dt finance*
   \dt money_map*
   ```

**Rollback**: No rollback needed - new tables don't affect existing code.

---

### Phase 2: API Routes (Medium Risk)

**Action**: Add new routes alongside existing ones

1. Add new routes in `server/routes.ts`:
   - `/api/finance/transactions/*`
   - `/api/finance/months/*`
   
2. Add storage functions in `server/storage.ts`

3. Test routes with Postman/curl before frontend changes

**Rollback**: Remove new routes, existing `/api/persistent/money-map` still works.

---

### Phase 3: Frontend Redesign (High Risk)

**Action**: Replace Money Map component with new ledger-based version

**Option A: Feature Flag** (Recommended for safety)
```typescript
// Add to user preferences or environment variable
const USE_NEW_LEDGER = import.meta.env.VITE_USE_NEW_LEDGER === 'true';

export default function YourMoneyMap() {
  if (USE_NEW_LEDGER) {
    return <YourMoneyMapLedger />;
  }
  return <YourMoneyMapLegacy />;
}
```

**Option B: Full Replacement** (Faster but riskier)
- Backup `your-money-map.tsx` to `your-money-map-legacy.tsx`
- Replace with new implementation
- If issues arise, restore from backup

**Rollback**:
1. Restore `your-money-map-legacy.tsx`
2. Update imports
3. Redeploy

---

### Phase 4: Data Migration (Optional)

**Action**: Migrate existing `incomeExpensesData` to transactions table

**When to Run**: After frontend is stable and tested

**Script**:
```typescript
// Run manually via admin endpoint or script
async function migrateExistingData() {
  // See "Migration Strategy" section above
}
```

**Rollback**: 
- Existing `money_map` table unchanged
- Can always re-migrate if needed

---

## Minimal-Risk Implementation Path

### Week 1: Database + Backend
1. ✅ Add new tables via migration
2. ✅ Add storage functions
3. ✅ Add API routes
4. ✅ Test with Postman (no frontend changes yet)

### Week 2: Frontend Prototype
1. ✅ Create new component `your-money-map-ledger.tsx`
2. ✅ Implement basic CRUD (add, list, delete)
3. ✅ Test in isolation (separate route `/your-money-map-beta`)

### Week 3: Feature Complete
1. ✅ Add summary cards, export, close month
2. ✅ Add auto-save with debounce
3. ✅ Add save status indicator
4. ✅ Complete manual testing (all 8 tests)

### Week 4: Migration & Rollout
1. ✅ Migrate existing user data (if any)
2. ✅ Replace main `/your-money-map` route
3. ✅ Monitor for errors
4. ✅ Keep legacy backup for 2 weeks

---

## Summary of Benefits

### Current UX Problems Solved

| Problem | Solution |
|---------|----------|
| Manual "Save to Monthly Records" confusing | Auto-save everything, no manual snapshot button |
| Data loss risk on navigation | beforeunload/visibilitychange flush |
| No transaction-level details (date, notes) | Each transaction is a row with metadata |
| Can't see chronological history | Table sorted by date, newest first |
| Duplicate data in two places | Single source of truth: `finance_transactions` table |
| No clear "month closed" status | `isClosed` flag prevents edits, shows badge |
| Export only available for snapshots | Export button always available, generates from live data |

### Technical Improvements

| Improvement | Benefit |
|-------------|---------|
| Relational table vs JSONB | Efficient queries, proper indexing, easier to extend |
| One row per transaction | Audit trail, soft delete, better analytics |
| Separate month metadata | Currency/tax settings isolated from transactions |
| Optimistic UI with debounce | Instant feedback, reduced server load |
| Save status indicator | Clear visibility into save state |
| Closed month snapshots | Final summary preserved, prevents accidental edits |

---

**End of Implementation Plan**
