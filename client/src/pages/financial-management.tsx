import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/mobile-nav';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit2,
  Download,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';

interface Transaction {
  id: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: string;
  notes: string;
  year: number;
  month: number;
}

interface MonthSettings {
  currency: string;
  taxPercentage: string;
  customAllocations: { id: string; name: string; percentage: number }[];
  isClosed: boolean;
  notes: string;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

const INCOME_CATEGORIES = [
  'Client Income',
  'Product Sales',
  'Affiliate Income',
  'Course Sales',
  'Consulting',
  'Other Income'
];

const EXPENSE_CATEGORIES = [
  'Software/Tools',
  'Marketing',
  'Education',
  'Contractors',
  'Office Supplies',
  'Other Expenses'
];

export default function FinancialManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Current month/year
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  
  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Month settings
  const [monthSettings, setMonthSettings] = useState<MonthSettings>({
    currency: 'GBP',
    taxPercentage: '25',
    customAllocations: [],
    isClosed: false,
    notes: ''
  });
  
  // Dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Transaction currency preference (persisted in localStorage)
  const [transactionCurrency, setTransactionCurrency] = useState(() => {
    const saved = localStorage.getItem('transactionCurrency');
    return saved || 'GBP';
  });

  // Update localStorage when currency changes
  useEffect(() => {
    localStorage.setItem('transactionCurrency', transactionCurrency);
  }, [transactionCurrency]);

  // Form state
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Load transactions and month settings
  useEffect(() => {
    loadData();
  }, [currentYear, currentMonth]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load transactions
      const transactionsRes = await fetch(`/api/finance/transactions/${currentYear}/${currentMonth}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data);
      }

      // Load month settings
      const settingsRes = await fetch(`/api/finance/months/${currentYear}/${currentMonth}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data) {
          setMonthSettings({
            currency: data.currency || 'GBP',
            taxPercentage: data.taxPercentage || '25',
            customAllocations: data.customAllocations || [],
            isClosed: data.isClosed || false,
            notes: data.notes || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load financial data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    try {
      const response = await apiRequest('/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: formData.amount,
          year: currentYear,
          month: currentMonth,
          date: new Date(formData.date).toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Transaction added successfully'
        });
        setIsAddDialogOpen(false);
        setFormData({
          type: 'income',
          category: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          notes: ''
        });
        loadData();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add transaction',
        variant: 'destructive'
      });
    }
  };

  const handleEditTransaction = async () => {
    if (!editingTransaction) return;

    try {
      const response = await apiRequest(`/api/finance/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: formData.amount,
          date: new Date(formData.date).toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Transaction updated successfully'
        });
        setIsEditDialogOpen(false);
        setEditingTransaction(null);
        loadData();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update transaction',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      const response = await apiRequest(`/api/finance/transactions/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTransactions(prevTransactions => prevTransactions.filter(t => t.id !== id));
        toast({
          title: 'Success',
          description: 'Transaction deleted successfully'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete transaction',
        variant: 'destructive'
      });
    }
  };

  const handleCloseMonth = async () => {
    try {
      const response = await apiRequest(`/api/finance/months/${currentYear}/${currentMonth}/close`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Month closed successfully'
        });
        loadData();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to close month',
        variant: 'destructive'
      });
    }
  };

  const handleReopenMonth = async () => {
    try {
      const response = await apiRequest(`/api/finance/months/${currentYear}/${currentMonth}/reopen`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Month reopened successfully'
        });
        loadData();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reopen month',
        variant: 'destructive'
      });
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/finance/months/${currentYear}/${currentMonth}/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${currentYear}-${currentMonth}.csv`;
        a.click();
        toast({
          title: 'Success',
          description: 'Transactions exported successfully'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export transactions',
        variant: 'destructive'
      });
    }
  };

  // Calculate summary
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const netIncome = totalIncome - totalExpenses;

  const currency = CURRENCIES.find(c => c.code === monthSettings.currency);
  const currencySymbol = currency?.symbol || '£';

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  // Transaction currency for dialogs
  const transactionCurrencyObj = CURRENCIES.find(c => c.code === transactionCurrency);
  const transactionCurrencySymbol = transactionCurrencyObj?.symbol || '£';

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      date: new Date(transaction.date).toISOString().split('T')[0],
      notes: transaction.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Mobile Header Banner */}
        <div className="lg:hidden bg-gradient-to-br from-purple-600 to-purple-800 text-white p-4 flex items-center gap-3 shadow-md">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-base">Financial Management</h1>
            <p className="text-xs text-purple-100">Track income & expenses</p>
          </div>
        </div>

        {/* Mobile Back Arrow */}
        <button
          onClick={() => setLocation('/')}
          className="lg:hidden fixed top-20 left-4 z-30 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700"
          data-testid="button-back-mobile"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="w-full lg:max-w-7xl lg:mx-auto p-4 lg:py-8 lg:px-8 space-y-6">
            {/* Desktop Header */}
            <div className="hidden lg:flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/')}
                className="gap-2"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Main Dashboard
              </Button>
            </div>

            <div className="hidden lg:block">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financial Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Track and manage your business income and expenses</p>
            </div>

            {/* Month Selector & Actions */}
            <Card>
              <CardContent className="p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Select
                      value={currentMonth.toString()}
                      onValueChange={(val) => setCurrentMonth(parseInt(val))}
                    >
                      <SelectTrigger className="w-[140px]" data-testid="select-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthNames.map((name, idx) => (
                          <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={currentYear.toString()}
                      onValueChange={(val) => setCurrentYear(parseInt(val))}
                    >
                      <SelectTrigger className="w-[100px]" data-testid="select-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2023, 2024, 2025, 2026].map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {monthSettings.isClosed && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="w-3 h-3" />
                        Closed
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleExport}
                      className="gap-2"
                      data-testid="button-export"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Total Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</p>
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Total Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalExpenses)}</p>
                </CardContent>
              </Card>

              <Card className={`border-2 ${netIncome >= 0 ? 'border-blue-200 dark:border-blue-800' : 'border-orange-200 dark:border-orange-800'}`}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-sm font-medium flex items-center gap-2 ${netIncome >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
                    <DollarSign className="w-4 h-4" />
                    Net Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {formatCurrency(netIncome)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Add Transaction Button */}
            <div className="flex justify-end">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="gap-2"
                    disabled={monthSettings.isClosed}
                    data-testid="button-add-transaction"
                  >
                    <Plus className="w-4 h-4" />
                    Add Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                    <DialogDescription>Add a new income or expense transaction</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(val: 'income' | 'expense') => setFormData({ ...formData, type: val, category: '' })}
                      >
                        <SelectTrigger data-testid="select-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Affiliate Payment, Sales"
                        data-testid="input-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <div className="flex gap-2">
                        <Select
                          value={transactionCurrency}
                          onValueChange={setTransactionCurrency}
                        >
                          <SelectTrigger className="w-[120px]" data-testid="select-currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map(curr => (
                              <SelectItem key={curr.code} value={curr.code}>
                                {curr.symbol} {curr.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="0.00"
                          className="flex-1"
                          data-testid="input-amount"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        data-testid="input-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Add notes..."
                        data-testid="textarea-transaction-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddTransaction} data-testid="button-save-transaction">Add Transaction</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Transactions - Income and Expenses Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income Transactions */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-center py-8 text-gray-500">Loading...</p>
                  ) : transactions.filter(t => t.type === 'income').length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No income for this month</p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.filter(t => t.type === 'income').map((transaction) => (
                        <div key={transaction.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium">{transaction.category}</p>
                              <p className="text-sm text-gray-500">{new Date(transaction.date).toLocaleDateString()}</p>
                            </div>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(parseFloat(transaction.amount))}
                            </p>
                          </div>
                          {transaction.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.notes}</p>
                          )}
                          <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(transaction)}
                              disabled={monthSettings.isClosed}
                              data-testid={`button-edit-${transaction.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              disabled={monthSettings.isClosed}
                              data-testid={`button-delete-${transaction.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expense Transactions */}
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-center py-8 text-gray-500">Loading...</p>
                  ) : transactions.filter(t => t.type === 'expense').length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No expenses for this month</p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.filter(t => t.type === 'expense').map((transaction) => (
                        <div key={transaction.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium">{transaction.category}</p>
                              <p className="text-sm text-gray-500">{new Date(transaction.date).toLocaleDateString()}</p>
                            </div>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">
                              {formatCurrency(parseFloat(transaction.amount))}
                            </p>
                          </div>
                          {transaction.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.notes}</p>
                          )}
                          <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(transaction)}
                              disabled={monthSettings.isClosed}
                              data-testid={`button-edit-${transaction.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              disabled={monthSettings.isClosed}
                              data-testid={`button-delete-${transaction.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Transaction</DialogTitle>
                  <DialogDescription>Update transaction details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(val: 'income' | 'expense') => setFormData({ ...formData, type: val, category: '' })}
                    >
                      <SelectTrigger data-testid="select-edit-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Affiliate Payment, Sales"
                      data-testid="input-edit-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="flex gap-2">
                      <Select
                        value={transactionCurrency}
                        onValueChange={setTransactionCurrency}
                      >
                        <SelectTrigger className="w-[120px]" data-testid="select-edit-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(curr => (
                            <SelectItem key={curr.code} value={curr.code}>
                              {curr.symbol} {curr.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        className="flex-1"
                        data-testid="input-edit-amount"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      data-testid="input-edit-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add notes..."
                      data-testid="textarea-edit-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleEditTransaction} data-testid="button-update-transaction">Update Transaction</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
