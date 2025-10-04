import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  Download, 
  DollarSign, 
  PieChart, 
  Calculator, 
  Target, 
  PiggyBank,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  TrendingDown,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Save,
  Eye,
  EyeOff,
  Archive,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface BudgetItem {
  id: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
}

interface IncomeExpenseItem {
  id: string;
  category: string;
  actualAmount: number;
  type: 'income' | 'expense';
}

interface CustomAllocation {
  id: string;
  name: string;
  percentage: number;
}

interface MonthlySnapshot {
  id: string;
  monthYear: string;
  savedDate: string;
  currency: string;
  budgetItems: BudgetItem[];
  incomeExpenseItems: IncomeExpenseItem[];
  taxPercentage: number;
  customAllocations: CustomAllocation[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    profit: number;
    taxSetAside: number;
    customAllocationsTotal: number;
    availableAfterAllocations: number;
    profitMargin: number;
  };
  notes: {
    budget: string;
    tracker: string;
  };
}

interface MoneyMapData {
  currency: string;
  period: string;
  goalsData: any;
  incomeExpensesData: any;
  savingsData: any;
  monthlySnapshots: MonthlySnapshot[];
}

export default function YourMoneyMap() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [currency, setCurrency] = useState('GBP');
  
  // Period navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [drafts, setDrafts] = useState<{[key: string]: any}>({});

  // Budget Planner State
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [budgetNotes, setBudgetNotes] = useState('');

  // Income & Expense Tracker State
  const [incomeExpenseItems, setIncomeExpenseItems] = useState<IncomeExpenseItem[]>([]);
  const [taxPercentage, setTaxPercentage] = useState(25);
  const [customAllocations, setCustomAllocations] = useState<CustomAllocation[]>([]);
  const [taxCategoryName, setTaxCategoryName] = useState('Tax Amount');
  const [editingTax, setEditingTax] = useState(false);
  const [trackerNotes, setTrackerNotes] = useState('');

  // Monthly Snapshots State
  const [monthlySnapshots, setMonthlySnapshots] = useState<MonthlySnapshot[]>([]);
  const [showMonthlyRecords, setShowMonthlyRecords] = useState(false);
  const [expandedSnapshots, setExpandedSnapshots] = useState<Set<string>>(new Set());

  // Save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const hasLoadedInitialData = useRef(false);

  // Fetch money map data from database
  const { data: moneyMapData, isLoading: dataLoading, error: dataError } = useQuery<MoneyMapData>({
    queryKey: ['/api/persistent/money-map'],
    enabled: !!user,
    retry: 1,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<MoneyMapData>) => {
      console.log('Saving money map to database:', data);
      const response = await apiRequest('/api/persistent/money-map', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save money map');
      }
      
      return response.json();
    },
    onSuccess: (savedData) => {
      console.log('Money map saved successfully ✓');
      queryClient.setQueryData(['/api/persistent/money-map'], savedData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: (error: any) => {
      console.error('Error saving money map:', error);
      setSaveStatus('idle');
      toast({
        title: "Save Failed",
        description: "Could not save your financial data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load initial data from database
  useEffect(() => {
    if (dataLoading || !moneyMapData || hasLoadedInitialData.current) return;
    
    hasLoadedInitialData.current = true;
    console.log('Loading money map from database:', moneyMapData);
    
    // Load global settings
    if (moneyMapData.currency) {
      setCurrency(moneyMapData.currency);
    }
    if (moneyMapData.period) {
      setSelectedPeriod(moneyMapData.period);
    }
    
    // Load monthly snapshots
    if (moneyMapData.monthlySnapshots && Array.isArray(moneyMapData.monthlySnapshots)) {
      setMonthlySnapshots(moneyMapData.monthlySnapshots);
    }
    
    // Load current period data from incomeExpensesData
    if (moneyMapData.incomeExpensesData) {
      const periodKey = getCurrentPeriodKey();
      const periodData = moneyMapData.incomeExpensesData[periodKey];
      
      if (periodData) {
        setBudgetItems(periodData.budgetItems || []);
        setBudgetNotes(periodData.budgetNotes || '');
        setIncomeExpenseItems(periodData.incomeExpenseItems || []);
        setTaxPercentage(periodData.taxPercentage || 25);
        setCustomAllocations(periodData.customAllocations || []);
        setTrackerNotes(periodData.trackerNotes || '');
      }
    }
  }, [moneyMapData, dataLoading]);

  // Helper functions for period navigation
  const getCurrentPeriodKey = () => {
    if (selectedPeriod === 'monthly') {
      return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    } else {
      const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
      return `${currentDate.getFullYear()}-Q${quarter}`;
    }
  };

  const getCurrentPeriodLabel = () => {
    if (selectedPeriod === 'monthly') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
      const quarterMonths = [
        'Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'
      ];
      return `Q${quarter}: ${quarterMonths[quarter - 1]} ${currentDate.getFullYear()}`;
    }
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    // Save current period data before navigating
    savePeriodData();
    
    const newDate = new Date(currentDate);
    if (selectedPeriod === 'monthly') {
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
    } else {
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 3);
      } else {
        newDate.setMonth(newDate.getMonth() + 3);
      }
    }
    setCurrentDate(newDate);
  };

  const savePeriodData = () => {
    if (!hasLoadedInitialData.current) return;
    
    const periodKey = getCurrentPeriodKey();
    const currentPeriodData = {
      budgetItems,
      budgetNotes,
      incomeExpenseItems,
      taxPercentage,
      customAllocations,
      trackerNotes,
    };
    
    // Merge with existing income/expenses data
    const updatedIncomeExpensesData = {
      ...(moneyMapData?.incomeExpensesData || {}),
      [periodKey]: currentPeriodData
    };
    
    saveToDatabase({
      currency,
      period: selectedPeriod,
      incomeExpensesData: updatedIncomeExpensesData,
      monthlySnapshots,
    });
  };

  const saveToDatabase = (data: Partial<MoneyMapData>) => {
    setSaveStatus('saving');
    saveMutation.mutate(data);
  };

  // Load data for current period when period changes
  useEffect(() => {
    if (!hasLoadedInitialData.current || !moneyMapData) return;
    
    const periodKey = getCurrentPeriodKey();
    const periodData = moneyMapData.incomeExpensesData?.[periodKey];
    
    if (periodData) {
      setBudgetItems(periodData.budgetItems || []);
      setBudgetNotes(periodData.budgetNotes || '');
      setIncomeExpenseItems(periodData.incomeExpenseItems || []);
      setTaxPercentage(periodData.taxPercentage || 25);
      setCustomAllocations(periodData.customAllocations || []);
      setTrackerNotes(periodData.trackerNotes || '');
    } else {
      // Reset to empty state if no data exists for this period
      setBudgetItems([]);
      setBudgetNotes('');
      setIncomeExpenseItems([]);
      setTaxPercentage(25);
      setCustomAllocations([]);
      setTrackerNotes('');
    }
  }, [currentDate, selectedPeriod]);

  // Auto-save with debounce
  const { debounced: debouncedSave, flush: flushSave } = useDebounce(() => {
    savePeriodData();
  }, 1000);

  // Trigger save when data changes
  const lastSavedRef = useRef<string>('');
  const combinedString = JSON.stringify({
    budgetItems,
    budgetNotes,
    incomeExpenseItems,
    taxPercentage,
    customAllocations,
    trackerNotes,
    currency,
    selectedPeriod,
  });

  useEffect(() => {
    if (!hasLoadedInitialData.current) return;
    if (combinedString === lastSavedRef.current) return;
    
    lastSavedRef.current = combinedString;
    debouncedSave();
  }, [combinedString, debouncedSave]);

  // Save monthly snapshots when they change
  useEffect(() => {
    if (!hasLoadedInitialData.current) return;
    
    saveToDatabase({
      currency,
      period: selectedPeriod,
      incomeExpensesData: moneyMapData?.incomeExpensesData || {},
      monthlySnapshots,
    });
  }, [monthlySnapshots]);

  // Flush on unmount
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

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-500" />
            <p className="text-gray-600">Loading your financial data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 flex items-center justify-center h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                Error Loading Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                We couldn't load your financial data. Please try refreshing the page.
              </p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getCurrencySymbol = (currencyCode: string) => {
    const symbols: { [key: string]: string } = {
      USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$', CHF: 'Fr',
      CNY: '¥', INR: '₹', BRL: 'R$', ZAR: 'R', NZD: 'NZ$', SEK: 'kr', NOK: 'kr',
      DKK: 'kr', PLN: 'zł', CZK: 'Kč', HUF: 'Ft', RON: 'lei', BGN: 'лв',
      HRK: 'kn', RUB: '₽', TRY: '₺', MXN: '$', ARS: '$', CLP: '$', COP: '$',
      PEN: 'S/', UYU: '$', KRW: '₩', THB: '฿', VND: '₫', IDR: 'Rp', MYR: 'RM',
      SGD: 'S$', PHP: '₱', ILS: '₪', EGP: '£', ZMW: 'ZK', GHS: '₵', NGN: '₦'
    };
    return symbols[currencyCode] || currencyCode;
  };

  const formatCurrency = (amount: number | undefined) => {
    const validAmount = amount || 0;
    return `${getCurrencySymbol(currency)}${validAmount.toLocaleString()}`;
  };

  // Budget Planner Functions
  const addBudgetItem = (type: 'income' | 'expense') => {
    const newItem: BudgetItem = {
      id: Date.now().toString(),
      category: '',
      amount: 0,
      type
    };
    setBudgetItems([...budgetItems, newItem]);
  };

  const updateBudgetItem = (id: string, field: string, value: any) => {
    setBudgetItems(budgetItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const deleteBudgetItem = (id: string) => {
    setBudgetItems(budgetItems.filter(item => item.id !== id));
  };

  const getBudgetTotals = () => {
    const income = budgetItems.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expenses = budgetItems.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    return { income, expenses, profit: income - expenses };
  };

  // Income & Expense Tracker Functions
  const addIncomeExpenseItem = (type: 'income' | 'expense') => {
    const newItem: IncomeExpenseItem = {
      id: Date.now().toString(),
      category: '',
      actualAmount: 0,
      type
    };
    setIncomeExpenseItems([...incomeExpenseItems, newItem]);
  };

  const updateIncomeExpenseItem = (id: string, field: string, value: any) => {
    setIncomeExpenseItems(incomeExpenseItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const deleteIncomeExpenseItem = (id: string) => {
    setIncomeExpenseItems(incomeExpenseItems.filter(item => item.id !== id));
  };

  const getTrackerTotals = () => {
    const incomeItems = incomeExpenseItems.filter(item => item.type === 'income');
    const expenseItems = incomeExpenseItems.filter(item => item.type === 'expense');
    
    const actualIncome = incomeItems.reduce((sum, item) => sum + item.actualAmount, 0);
    const actualExpenses = expenseItems.reduce((sum, item) => sum + item.actualAmount, 0);
    
    const actualProfit = actualIncome - actualExpenses;
    const taxAmount = actualProfit * (taxPercentage / 100);
    const afterTaxProfit = actualProfit - taxAmount;
    
    // Calculate custom allocations
    const customAllocationsTotal = customAllocations.reduce((sum, allocation) => {
      return sum + (afterTaxProfit * (allocation.percentage / 100));
    }, 0);
    
    const availableAfterAllocations = afterTaxProfit - customAllocationsTotal;
    const profitMargin = actualIncome > 0 ? (actualProfit / actualIncome) * 100 : 0;
    
    return {
      actualIncome,
      actualExpenses,
      actualProfit,
      taxAmount,
      customAllocationsTotal,
      customAllocations: customAllocations.map(allocation => ({
        ...allocation,
        amount: afterTaxProfit * (allocation.percentage / 100)
      })),
      afterTaxProfit,
      availableAfterAllocations,
      profitMargin
    };
  };

  // Custom Allocations Functions
  const addCustomAllocation = () => {
    const newAllocation: CustomAllocation = {
      id: Date.now().toString(),
      name: '',
      percentage: 0
    };
    setCustomAllocations([...customAllocations, newAllocation]);
  };

  const updateCustomAllocation = (id: string, field: string, value: any) => {
    setCustomAllocations(customAllocations.map(allocation => 
      allocation.id === id ? { ...allocation, [field]: value } : allocation
    ));
  };

  const deleteCustomAllocation = (id: string) => {
    setCustomAllocations(customAllocations.filter(allocation => allocation.id !== id));
  };

  // Export to CSV
  const exportToCSV = () => {
    const budgetTotals = getBudgetTotals();
    const trackerTotals = getTrackerTotals();
    
    let csvContent = "Your Money Map - Financial Dashboard Export\n\n";
    
    // Budget Planner
    csvContent += "BUDGET PLANNER\n";
    csvContent += `Period: ${selectedPeriod}\n`;
    csvContent += `Currency: ${currency}\n\n`;
    csvContent += "Category,Type,Amount\n";
    budgetItems.forEach(item => {
      csvContent += `${item.category},${item.type},${item.amount}\n`;
    });
    csvContent += `\nBudget Summary:\n`;
    csvContent += `Total Income,${budgetTotals.income}\n`;
    csvContent += `Total Expenses,${budgetTotals.expenses}\n`;
    csvContent += `Net Profit,${budgetTotals.profit}\n\n`;
    
    // Income & Expense Tracker
    csvContent += "INCOME & EXPENSE TRACKER\n";
    csvContent += "Category,Type,Actual Amount\n";
    incomeExpenseItems.forEach(item => {
      csvContent += `${item.category},${item.type},${item.actualAmount}\n`;
    });
    csvContent += `\nTracker Summary:\n`;
    csvContent += `Actual Income,${trackerTotals.actualIncome}\n`;
    csvContent += `Actual Expenses,${trackerTotals.actualExpenses}\n`;
    csvContent += `Actual Profit,${trackerTotals.actualProfit}\n`;
    csvContent += `Tax Amount (${taxPercentage}%),${trackerTotals.taxAmount}\n`;
    trackerTotals.customAllocations.forEach(allocation => {
      csvContent += `${allocation.name} (${allocation.percentage}%),${allocation.amount}\n`;
    });
    csvContent += `Profit Margin,${trackerTotals.profitMargin.toFixed(2)}%\n\n`;
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `your-money-map-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: "Your Money Map data has been exported to CSV",
    });
  };

  // Monthly Snapshot Functions
  const saveMonthlySnapshot = () => {
    const now = new Date();
    const periodLabel = selectedPeriod === 'monthly' 
      ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : getCurrentPeriodLabel().replace('📘 ', '');
    
    const trackerTotals = getTrackerTotals();
    
    const snapshot: MonthlySnapshot = {
      id: Date.now().toString(),
      monthYear: periodLabel,
      savedDate: now.toISOString(),
      currency,
      budgetItems: [...budgetItems],
      incomeExpenseItems: [...incomeExpenseItems],
      taxPercentage,
      customAllocations: [...customAllocations],
      summary: {
        totalIncome: trackerTotals.actualIncome,
        totalExpenses: trackerTotals.actualExpenses,
        profit: trackerTotals.actualProfit,
        taxSetAside: trackerTotals.taxAmount,
        customAllocationsTotal: trackerTotals.customAllocationsTotal,
        availableAfterAllocations: trackerTotals.availableAfterAllocations,
        profitMargin: trackerTotals.profitMargin,
      },
      notes: {
        budget: budgetNotes,
        tracker: trackerNotes,
      },
    };
    
    const updatedSnapshots = [...monthlySnapshots, snapshot];
    setMonthlySnapshots(updatedSnapshots);
    
    toast({
      title: "Snapshot Saved",
      description: `${periodLabel} financial data has been saved successfully`,
    });
  };

  const deleteMonthlySnapshot = (id: string) => {
    const updatedSnapshots = monthlySnapshots.filter(snapshot => snapshot.id !== id);
    setMonthlySnapshots(updatedSnapshots);
    
    toast({
      title: "Snapshot Deleted",
      description: "Monthly snapshot has been removed",
    });
  };

  const toggleSnapshotExpansion = (id: string) => {
    const newExpanded = new Set(expandedSnapshots);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSnapshots(newExpanded);
  };

  const exportSnapshotToCSV = (snapshot: MonthlySnapshot) => {
    let csvContent = `MONTHLY SNAPSHOT - ${snapshot.monthYear}\n`;
    csvContent += `Saved Date: ${new Date(snapshot.savedDate).toLocaleDateString()}\n`;
    csvContent += `Currency: ${snapshot.currency}\n\n`;
    
    // Summary
    csvContent += "FINANCIAL SUMMARY\n";
    csvContent += "Metric,Amount\n";
    csvContent += `Total Income,${snapshot.summary.totalIncome}\n`;
    csvContent += `Total Expenses,${snapshot.summary.totalExpenses}\n`;
    csvContent += `Profit,${snapshot.summary.profit}\n`;
    csvContent += `Tax Set Aside,${snapshot.summary.taxSetAside}\n`;
    csvContent += `Custom Allocations Total,${snapshot.summary.customAllocationsTotal}\n`;
    csvContent += `Profit Margin,${snapshot.summary.profitMargin.toFixed(2)}%\n\n`;
    
    // Income & Expenses
    csvContent += "INCOME & EXPENSES\n";
    csvContent += "Category,Type,Amount\n";
    snapshot.incomeExpenseItems.forEach(item => {
      csvContent += `${item.category},${item.type},${item.actualAmount}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `monthly-snapshot-${snapshot.monthYear.replace(' ', '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: `${snapshot.monthYear} snapshot exported to CSV`,
    });
  };

  const trackerTotals = getTrackerTotals();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6">
            {/* Mobile Navigation - Single Back Arrow */}
            <div className="flex items-center gap-3 mb-4 lg:hidden mt-16">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation('/finance')}
                className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 h-4" />
              </Button>
            </div>
            
            {/* Desktop Navigation - Full Buttons */}
            <div className="hidden lg:flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/')}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Main Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/finance')}
                className="flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Back to Financial Management
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-semibold text-gray-800">Your Money Map</h1>
              <p className="text-gray-600">Complete financial dashboard for creative businesses</p>
            </div>
            {/* Save indicator */}
            <div className="text-sm">
              {saveStatus === 'saving' && (
                <span className="text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>
          </div>
          
          {/* Period Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigatePeriod('prev')}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-lg font-semibold text-gray-800 min-w-[200px] text-center">
                  {getCurrentPeriodLabel()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigatePeriod('next')}
                  className="h-8 px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">Click Save to add this entry to your Monthly Records</Badge>
            </div>
          </div>
        </div>


        {/* Income & Expenses Card */}
        <Card className="shadow-lg border-0 mb-8">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
              Income & Expenses
            </CardTitle>
            <CardDescription>Track your income and expenses then save to your desktop.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income */}
              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Income
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {incomeExpenseItems.filter(item => item.type === 'income').map((item) => (
                    <div key={item.id} className="flex gap-2">
                      <Input
                        placeholder="Income source"
                        value={item.category}
                        onChange={(e) => updateIncomeExpenseItem(item.id, 'category', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="0"
                        value={item.actualAmount || ''}
                        onChange={(e) => updateIncomeExpenseItem(item.id, 'actualAmount', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="w-32"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteIncomeExpenseItem(item.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addIncomeExpenseItem('income')}
                    className="w-full border-dashed border-green-300 text-green-600 hover:bg-green-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Income Source
                  </Button>
                </CardContent>
              </Card>

              {/* Expenses */}
              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {incomeExpenseItems.filter(item => item.type === 'expense').map((item) => (
                    <div key={item.id} className="flex gap-2">
                      <Input
                        placeholder="Expense category"
                        value={item.category}
                        onChange={(e) => updateIncomeExpenseItem(item.id, 'category', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="0"
                        value={item.actualAmount || ''}
                        onChange={(e) => updateIncomeExpenseItem(item.id, 'actualAmount', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="w-32"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteIncomeExpenseItem(item.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addIncomeExpenseItem('expense')}
                    className="w-full border-dashed border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <Card className="shadow-md border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Total Income</div>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(trackerTotals.actualIncome)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Total Expenses</div>
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(trackerTotals.actualExpenses)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Profit</div>
                    <div className={`text-xl font-bold ${trackerTotals.actualProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(trackerTotals.actualProfit)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Profit Margin</div>
                    <div className="text-xl font-bold text-purple-600">
                      {trackerTotals.profitMargin.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax and Allocations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tax */}
              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Tax Set Aside</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tax Percentage</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        value={taxPercentage}
                        onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Tax Amount ({taxPercentage}%)</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(trackerTotals.taxAmount)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Custom Allocations */}
              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Custom Allocations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customAllocations.map((allocation) => (
                    <div key={allocation.id} className="flex gap-2">
                      <Input
                        placeholder="Name (e.g., Savings)"
                        value={allocation.name}
                        onChange={(e) => updateCustomAllocation(allocation.id, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="0"
                        value={allocation.percentage || ''}
                        onChange={(e) => updateCustomAllocation(allocation.id, 'percentage', parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                      <span className="flex items-center text-sm text-gray-600">%</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCustomAllocation(allocation.id)}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCustomAllocation}
                    className="w-full border-dashed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Allocation
                  </Button>
                  {customAllocations.length > 0 && (
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Total Allocations</div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {formatCurrency(trackerTotals.customAllocationsTotal)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                onClick={saveMonthlySnapshot}
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Save to Monthly Records
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Records */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xl">
                <Calendar className="w-6 h-6 text-purple-600" />
                Monthly Records
              </div>
              <div className="flex items-center gap-2">
                {monthlySnapshots.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMonthlyRecords(!showMonthlyRecords)}
                >
                  {showMonthlyRecords ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          
          {showMonthlyRecords && (
            <CardContent className="space-y-4">
              {monthlySnapshots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No monthly snapshots saved yet</p>
                  <p className="text-sm">Save your first monthly snapshot to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlySnapshots.map((snapshot) => (
                    <div key={snapshot.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{snapshot.monthYear}</h3>
                          <p className="text-sm text-gray-600">
                            Saved on {new Date(snapshot.savedDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSnapshotExpansion(snapshot.id)}
                          >
                            {expandedSnapshots.has(snapshot.id) ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportSnapshotToCSV(snapshot)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMonthlySnapshot(snapshot.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            {getCurrencySymbol(snapshot.currency)}{snapshot.summary.totalIncome.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Total Income</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-lg font-bold text-red-600">
                            {getCurrencySymbol(snapshot.currency)}{snapshot.summary.totalExpenses.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Total Expenses</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className={`text-lg font-bold ${snapshot.summary.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {getCurrencySymbol(snapshot.currency)}{snapshot.summary.profit.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Profit</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-lg font-bold text-purple-600">
                            {snapshot.summary.profitMargin.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-600">Profit Margin</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-sm font-bold text-orange-600">
                            {getCurrencySymbol(snapshot.currency)}{snapshot.summary.taxSetAside.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Tax Set Aside</div>
                        </div>
                        <div className="text-center p-3 bg-indigo-50 rounded-lg">
                          <div className="text-sm font-bold text-indigo-600">
                            {getCurrencySymbol(snapshot.currency)}{snapshot.summary.customAllocationsTotal.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Custom Allocations</div>
                        </div>
                        <div className="text-center p-3 bg-teal-50 rounded-lg">
                          <div className="text-sm font-bold text-teal-600">
                            {getCurrencySymbol(snapshot.currency)}{snapshot.summary.availableAfterAllocations.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Available After Allocations</div>
                        </div>
                      </div>

                      {/* Detailed Breakdown */}
                      {expandedSnapshots.has(snapshot.id) && (
                        <div className="mt-6 pt-4 border-t">
                          <h4 className="font-semibold mb-4">Detailed Breakdown</h4>
                          
                          {/* Income & Expenses Detail */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h5 className="font-medium mb-3 text-green-600">Income Sources</h5>
                              <div className="space-y-2">
                                {snapshot.incomeExpenseItems.filter(item => item.type === 'income').map((item, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span>{item.category}</span>
                                    <span className="font-medium">
                                      {getCurrencySymbol(snapshot.currency)}{item.actualAmount.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-medium mb-3 text-red-600">Expense Categories</h5>
                              <div className="space-y-2">
                                {snapshot.incomeExpenseItems.filter(item => item.type === 'expense').map((item, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span>{item.category}</span>
                                    <span className="font-medium">
                                      {getCurrencySymbol(snapshot.currency)}{item.actualAmount.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Custom Allocations Detail */}
                          {snapshot.customAllocations.length > 0 && (
                            <div className="mt-6">
                              <h5 className="font-medium mb-3 text-indigo-600">Custom Allocations Breakdown</h5>
                              <div className="space-y-2">
                                {snapshot.customAllocations.map((allocation, index) => {
                                  const amount = (snapshot.summary.profit - snapshot.summary.taxSetAside) * (allocation.percentage / 100);
                                  return (
                                    <div key={index} className="flex justify-between text-sm">
                                      <span>{allocation.name} ({allocation.percentage}%)</span>
                                      <span className="font-medium">
                                        {getCurrencySymbol(snapshot.currency)}{amount.toLocaleString()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
