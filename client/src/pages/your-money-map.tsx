import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  Download, 
  DollarSign, 
  PieChart, 
  Target, 
  PiggyBank,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  LockOpen,
  Save,
  Check
} from "lucide-react";

interface Transaction {
  id?: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: string;
  notes?: string;
  year: number;
  month: number;
  isNew?: boolean;
}

interface MonthData {
  year: number;
  month: number;
  currency: string;
  taxPercentage: string;
  customAllocations: CustomAllocation[];
  isClosed: boolean;
  closedAt?: string;
  closedSnapshot?: any;
  notes?: string;
}

interface CustomAllocation {
  id: string;
  name: string;
  percentage: number;
}

const CURRENCIES = [
  { value: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { value: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { value: 'EUR', symbol: '€', label: 'Euro (€)' },
  { value: 'CAD', symbol: 'CA$', label: 'Canadian Dollar (CA$)' },
  { value: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)' },
];

const INCOME_CATEGORIES = [
  'Client Income',
  'Product Sales',
  'Service Revenue',
  'Affiliate Income',
  'Course Sales',
  'Consultation Fees',
  'Other Income'
];

const EXPENSE_CATEGORIES = [
  'Software/Tools',
  'Marketing/Ads',
  'Equipment',
  'Contractors/Freelancers',
  'Professional Services',
  'Office Supplies',
  'Education/Training',
  'Travel',
  'Other Expenses'
];

export default function YourMoneyMap() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState('GBP');
  const [taxPercentage, setTaxPercentage] = useState('25');
  const [customAllocations, setCustomAllocations] = useState<CustomAllocation[]>([]);
  const [monthNotes, setMonthNotes] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const pendingChanges = useRef<Set<number | 'new'>>(new Set());
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialLoad = useRef(true);

  const currencySymbol = CURRENCIES.find(c => c.value === currency)?.symbol || '£';

  const { data: monthData, isLoading: monthLoading } = useQuery<MonthData>({
    queryKey: ['/api/finance/month', currentYear, currentMonth],
    enabled: !!user,
    retry: 1,
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/finance/transactions', currentYear, currentMonth],
    enabled: !!user,
    retry: 1,
  });

  useEffect(() => {
    if (monthData) {
      setCurrency(monthData.currency || 'GBP');
      setTaxPercentage(monthData.taxPercentage || '25');
      setCustomAllocations(monthData.customAllocations || []);
      setMonthNotes(monthData.notes || '');
      setIsClosed(monthData.isClosed || false);
    }
  }, [monthData]);

  useEffect(() => {
    if (transactionsData) {
      setTransactions(transactionsData.map(t => ({
        ...t,
        date: t.date.split('T')[0],
        amount: t.amount.toString()
      })));
      isInitialLoad.current = false;
    }
  }, [transactionsData]);

  const saveMonthMutation = useMutation({
    mutationFn: async (data: Partial<MonthData>) => {
      const response = await apiRequest('/api/finance/month', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: currentYear,
          month: currentMonth,
          currency,
          taxPercentage,
          customAllocations,
          isClosed,
          notes: monthNotes,
          ...data
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/month', currentYear, currentMonth] });
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (transaction: Transaction) => {
      const response = await apiRequest('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: transaction.date,
          type: transaction.type,
          category: transaction.category,
          amount: transaction.amount,
          notes: transaction.notes || '',
          year: currentYear,
          month: currentMonth
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/transactions', currentYear, currentMonth] });
    }
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Transaction> }) => {
      const response = await apiRequest(`/api/finance/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/transactions', currentYear, currentMonth] });
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/finance/transactions/${id}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finance/transactions', currentYear, currentMonth] });
    }
  });

  const autoSave = () => {
    if (isInitialLoad.current || isClosed) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('saving');
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const changesToSave = Array.from(pendingChanges.current);
        
        for (const change of changesToSave) {
          const transaction = transactions.find(t => 
            change === 'new' ? t.isNew : t.id === change
          );
          
          if (!transaction) continue;

          if (transaction.isNew) {
            await createTransactionMutation.mutateAsync(transaction);
          } else if (transaction.id) {
            await updateTransactionMutation.mutateAsync({
              id: transaction.id,
              updates: {
                date: transaction.date,
                type: transaction.type,
                category: transaction.category,
                amount: transaction.amount,
                notes: transaction.notes
              }
            });
          }
        }

        pendingChanges.current.clear();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('idle');
        toast({
          title: "Auto-save failed",
          description: "Your changes couldn't be saved. Please try again.",
          variant: "destructive",
        });
      }
    }, 1000);
  };

  const addTransaction = (type: 'income' | 'expense') => {
    if (isClosed) {
      toast({
        title: "Month is closed",
        description: "Reopen the month to add transactions.",
        variant: "destructive",
      });
      return;
    }

    const newTransaction: Transaction = {
      date: new Date().toISOString().split('T')[0],
      type,
      category: type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
      amount: '0',
      notes: '',
      year: currentYear,
      month: currentMonth,
      isNew: true
    };

    setTransactions(prev => [newTransaction, ...prev]);
    pendingChanges.current.add('new');
    autoSave();
  };

  const updateTransaction = (index: number, field: keyof Transaction, value: string) => {
    if (isClosed) return;

    setTransactions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (updated[index].id) {
        pendingChanges.current.add(updated[index].id!);
      } else {
        pendingChanges.current.add('new');
      }
      
      return updated;
    });

    autoSave();
  };

  const deleteTransaction = async (index: number) => {
    if (isClosed) return;

    const transaction = transactions[index];
    
    if (transaction.id) {
      await deleteTransactionMutation.mutateAsync(transaction.id);
    }
    
    setTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const updateMonthSettings = (field: string, value: any) => {
    if (isClosed) {
      toast({
        title: "Month is closed",
        description: "Reopen the month to make changes.",
        variant: "destructive",
      });
      return;
    }

    if (field === 'currency') setCurrency(value);
    else if (field === 'taxPercentage') setTaxPercentage(value);
    else if (field === 'customAllocations') setCustomAllocations(value);
    else if (field === 'notes') setMonthNotes(value);

    saveMonthMutation.mutate({});
  };

  const toggleMonthClosed = async () => {
    const newClosedState = !isClosed;
    
    if (newClosedState) {
      const snapshot = {
        transactions,
        summary: calculateSummary(),
        closedDate: new Date().toISOString()
      };
      
      await saveMonthMutation.mutateAsync({
        isClosed: true,
        closedAt: new Date().toISOString(),
        closedSnapshot: snapshot
      });
      
      setIsClosed(true);
      toast({
        title: "Month closed",
        description: "This month is now read-only.",
      });
    } else {
      await saveMonthMutation.mutateAsync({
        isClosed: false,
        closedAt: undefined,
        closedSnapshot: undefined
      });
      
      setIsClosed(false);
      toast({
        title: "Month reopened",
        description: "You can now edit this month.",
      });
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
    isInitialLoad.current = true;
  };

  const calculateSummary = () => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    
    const profit = totalIncome - totalExpenses;
    const taxAmount = profit * (parseFloat(taxPercentage) / 100);
    
    const customAllocTotal = customAllocations.reduce((sum, alloc) => 
      sum + (profit * (alloc.percentage / 100)), 0
    );
    
    const availableAfterTax = profit - taxAmount;
    const availableAfterAllocations = availableAfterTax - customAllocTotal;
    const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      profit,
      taxAmount,
      customAllocTotal,
      availableAfterTax,
      availableAfterAllocations,
      profitMargin
    };
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Notes'];
    const rows = transactions.map(t => [
      t.date,
      t.type,
      t.category,
      t.amount,
      t.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `money-map-${currentYear}-${String(currentMonth).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addCustomAllocation = () => {
    if (isClosed) return;

    const newAllocation: CustomAllocation = {
      id: Date.now().toString(),
      name: 'New Allocation',
      percentage: 10
    };

    const updated = [...customAllocations, newAllocation];
    setCustomAllocations(updated);
    updateMonthSettings('customAllocations', updated);
  };

  const updateAllocation = (id: string, field: 'name' | 'percentage', value: string | number) => {
    if (isClosed) return;

    const updated = customAllocations.map(alloc =>
      alloc.id === id ? { ...alloc, [field]: value } : alloc
    );
    setCustomAllocations(updated);
    updateMonthSettings('customAllocations', updated);
  };

  const deleteAllocation = (id: string) => {
    if (isClosed) return;

    const updated = customAllocations.filter(alloc => alloc.id !== id);
    setCustomAllocations(updated);
    updateMonthSettings('customAllocations', updated);
  };

  const summary = calculateSummary();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (!isAuthenticated || monthLoading || transactionsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" data-testid="loader-loading" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0a0a0a]">
      <Sidebar currentPath="/your-money-map" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileNav currentPath="/your-money-map" />
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-title">
                  Your Money Map
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Auto-saving transaction ledger for {monthName}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400" data-testid="text-saving">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400" data-testid="text-saved">
                    <Check className="h-4 w-4" />
                    Saved
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold text-gray-900 dark:text-white px-4" data-testid="text-month">
                  {monthName}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMonthClosed}
                  data-testid="button-toggle-close"
                >
                  {isClosed ? <LockOpen className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                  {isClosed ? 'Reopen Month' : 'Close Month'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  data-testid="button-export-csv"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {isClosed && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4" data-testid="alert-closed">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <p className="text-amber-900 dark:text-amber-200 font-medium">
                    This month is closed and read-only. Click "Reopen Month" to make changes.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-income">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Income
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-total-income">
                    {currencySymbol}{summary.totalIncome.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-expenses">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Expenses
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-red-600 dark:text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-total-expenses">
                    {currencySymbol}{summary.totalExpenses.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-profit">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Profit
                  </CardTitle>
                  <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${summary.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-profit">
                    {currencySymbol}{summary.profit.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {summary.profitMargin.toFixed(1)}% margin
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-after-tax">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    After Tax ({taxPercentage}%)
                  </CardTitle>
                  <PiggyBank className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-after-tax">
                    {currencySymbol}{summary.availableAfterTax.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Tax: {currencySymbol}{summary.taxAmount.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-settings">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Month Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={currency} 
                      onValueChange={(val) => updateMonthSettings('currency', val)}
                      disabled={isClosed}
                    >
                      <SelectTrigger id="currency" data-testid="select-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tax">Tax Percentage</Label>
                    <Input
                      id="tax"
                      type="number"
                      value={taxPercentage}
                      onChange={(e) => updateMonthSettings('taxPercentage', e.target.value)}
                      disabled={isClosed}
                      data-testid="input-tax-percentage"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Custom Allocations</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addCustomAllocation}
                      disabled={isClosed}
                      data-testid="button-add-allocation"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {customAllocations.map(alloc => (
                      <div key={alloc.id} className="flex gap-2" data-testid={`allocation-${alloc.id}`}>
                        <Input
                          placeholder="Name"
                          value={alloc.name}
                          onChange={(e) => updateAllocation(alloc.id, 'name', e.target.value)}
                          disabled={isClosed}
                          className="flex-1"
                          data-testid={`input-allocation-name-${alloc.id}`}
                        />
                        <Input
                          type="number"
                          placeholder="%"
                          value={alloc.percentage}
                          onChange={(e) => updateAllocation(alloc.id, 'percentage', parseFloat(e.target.value))}
                          disabled={isClosed}
                          className="w-20"
                          data-testid={`input-allocation-percentage-${alloc.id}`}
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => deleteAllocation(alloc.id)}
                          disabled={isClosed}
                          data-testid={`button-delete-allocation-${alloc.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Month Notes</Label>
                  <Textarea
                    id="notes"
                    value={monthNotes}
                    onChange={(e) => updateMonthSettings('notes', e.target.value)}
                    placeholder="Add notes about this month..."
                    disabled={isClosed}
                    data-testid="textarea-notes"
                  />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-transactions">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Transactions</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => addTransaction('income')}
                      disabled={isClosed}
                      data-testid="button-add-income"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Income
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addTransaction('expense')}
                      disabled={isClosed}
                      data-testid="button-add-expense"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Expense
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left p-2 text-sm font-medium text-gray-600 dark:text-gray-400">Date</th>
                        <th className="text-left p-2 text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
                        <th className="text-left p-2 text-sm font-medium text-gray-600 dark:text-gray-400">Category</th>
                        <th className="text-left p-2 text-sm font-medium text-gray-600 dark:text-gray-400">Amount</th>
                        <th className="text-left p-2 text-sm font-medium text-gray-600 dark:text-gray-400">Notes</th>
                        <th className="text-left p-2 text-sm font-medium text-gray-600 dark:text-gray-400"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400" data-testid="text-no-transactions">
                            No transactions yet. Click "Add Income" or "Add Expense" to get started.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((t, i) => (
                          <tr key={t.id || i} className="border-b dark:border-gray-700" data-testid={`transaction-row-${i}`}>
                            <td className="p-2">
                              <Input
                                type="date"
                                value={t.date}
                                onChange={(e) => updateTransaction(i, 'date', e.target.value)}
                                disabled={isClosed}
                                className="w-40"
                                data-testid={`input-date-${i}`}
                              />
                            </td>
                            <td className="p-2">
                              <Select
                                value={t.type}
                                onValueChange={(val) => updateTransaction(i, 'type', val)}
                                disabled={isClosed}
                              >
                                <SelectTrigger className="w-32" data-testid={`select-type-${i}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="income">Income</SelectItem>
                                  <SelectItem value="expense">Expense</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Select
                                value={t.category}
                                onValueChange={(val) => updateTransaction(i, 'category', val)}
                                disabled={isClosed}
                              >
                                <SelectTrigger className="w-48" data-testid={`select-category-${i}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(t.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={t.amount}
                                onChange={(e) => updateTransaction(i, 'amount', e.target.value)}
                                disabled={isClosed}
                                className="w-32"
                                data-testid={`input-amount-${i}`}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={t.notes || ''}
                                onChange={(e) => updateTransaction(i, 'notes', e.target.value)}
                                placeholder="Optional notes"
                                disabled={isClosed}
                                data-testid={`input-notes-${i}`}
                              />
                            </td>
                            <td className="p-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteTransaction(i)}
                                disabled={isClosed}
                                data-testid={`button-delete-${i}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
