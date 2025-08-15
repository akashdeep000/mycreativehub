import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import BackToDashboard from "@/components/BackToDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Pencil
} from "lucide-react";

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



interface Goal {
  id: string;
  title: string;
  type: 'monthly' | 'quarterly' | 'yearly';
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status: 'on-track' | 'behind' | 'ahead';
}

interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
}

interface MonthlySnapshot {
  id: string;
  monthYear: string;
  savedDate: string;
  currency: string;
  budgetItems: BudgetItem[];
  incomeExpenseItems: IncomeExpenseItem[];
  taxPercentage: number;
  personalPayAmount: number;
  goals: Goal[];
  savingsGoals: SavingsGoal[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    profit: number;
    taxSetAside: number;
    personalPay: number;
    profitMargin: number;
    availableForSavings: number;
  };
  notes: {
    budget: string;
    tracker: string;
    goals: string;
    savings: string;
  };
}

export default function YourMoneyMap() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('goals');
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
  const [personalPayAmount, setPersonalPayAmount] = useState(0);
  const [savingsPercentage, setSavingsPercentage] = useState(20);
  
  // Category names state
  const [taxCategoryName, setTaxCategoryName] = useState('Tax Amount');
  const [personalPayCategoryName, setPersonalPayCategoryName] = useState('Personal Pay Amount');
  const [savingsCategoryName, setSavingsCategoryName] = useState('Set aside for savings');
  
  // Edit states for category names
  const [editingTax, setEditingTax] = useState(false);
  const [editingPersonalPay, setEditingPersonalPay] = useState(false);
  const [editingSavings, setEditingSavings] = useState(false);
  const [trackerNotes, setTrackerNotes] = useState('');



  // Goal Tracker State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalNotes, setGoalNotes] = useState('');

  // Savings Tracker State
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [savingsNotes, setSavingsNotes] = useState('');

  // Monthly Snapshots State
  const [monthlySnapshots, setMonthlySnapshots] = useState<MonthlySnapshot[]>([]);
  const [showMonthlyRecords, setShowMonthlyRecords] = useState(false);
  const [expandedSnapshots, setExpandedSnapshots] = useState<Set<string>>(new Set());

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
      return `📅 ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    } else {
      const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
      const quarterMonths = [
        'Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'
      ];
      return `📘 Q${quarter}: ${quarterMonths[quarter - 1]} ${currentDate.getFullYear()}`;
    }
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
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

  const saveDraftForCurrentPeriod = () => {
    const periodKey = getCurrentPeriodKey();
    const currentData = {
      budgetItems,
      budgetNotes,
      incomeExpenseItems,
      taxPercentage,
      personalPayAmount,
      trackerNotes,
      goals,
      goalNotes,
      savingsGoals,
      savingsNotes,
      selectedPeriod,
      currency
    };
    
    const newDrafts = { ...drafts, [periodKey]: currentData };
    setDrafts(newDrafts);
    localStorage.setItem('your-money-map-drafts', JSON.stringify(newDrafts));
  };

  const loadDraftForCurrentPeriod = () => {
    const periodKey = getCurrentPeriodKey();
    const savedDrafts = localStorage.getItem('your-money-map-drafts');
    
    if (savedDrafts) {
      try {
        const parsedDrafts = JSON.parse(savedDrafts);
        setDrafts(parsedDrafts);
        
        if (parsedDrafts[periodKey]) {
          const draft = parsedDrafts[periodKey];
          setBudgetItems(draft.budgetItems || []);
          setBudgetNotes(draft.budgetNotes || '');
          setIncomeExpenseItems(draft.incomeExpenseItems || []);
          setTaxPercentage(draft.taxPercentage || 25);
          setPersonalPayAmount(draft.personalPayAmount || 0);
          setTrackerNotes(draft.trackerNotes || '');
          setGoals(draft.goals || []);
          setGoalNotes(draft.goalNotes || '');
          setSavingsGoals(draft.savingsGoals || []);
          setSavingsNotes(draft.savingsNotes || '');
          return true;
        }
      } catch (error) {
        console.error('Error loading drafts:', error);
      }
    }
    return false;
  };

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('your-money-map-data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setSelectedPeriod(parsed.selectedPeriod || 'monthly');
        // Force update to GBP as new default, regardless of saved currency
        // This ensures all users get the new GBP default
        setCurrency('GBP');
        setMonthlySnapshots(parsed.monthlySnapshots || []);
        // Always start with current date instead of restoring saved date
        // This ensures the money map opens on the current month/period
        setCurrentDate(new Date());
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  // Load draft for current period when period changes
  useEffect(() => {
    if (!loadDraftForCurrentPeriod()) {
      // Reset to empty state if no draft exists
      setBudgetItems([]);
      setBudgetNotes('');
      setIncomeExpenseItems([]);
      setTaxPercentage(25);
      setPersonalPayAmount(0);
      setTrackerNotes('');
      setGoals([]);
      setGoalNotes('');
      setSavingsGoals([]);
      setSavingsNotes('');
    }
  }, [currentDate, selectedPeriod]);

  // Save data to localStorage whenever state changes
  // Note: We don't save currentDate so the app always starts with current month
  useEffect(() => {
    const dataToSave = {
      selectedPeriod,
      currency,
      monthlySnapshots
    };
    localStorage.setItem('your-money-map-data', JSON.stringify(dataToSave));
  }, [selectedPeriod, currency, monthlySnapshots]);

  // Auto-save draft when data changes
  useEffect(() => {
    saveDraftForCurrentPeriod();
  }, [budgetItems, budgetNotes, incomeExpenseItems, taxPercentage, personalPayAmount, trackerNotes, goals, goalNotes, savingsGoals, savingsNotes]);

  // Authentication check
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return null;
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
    const availableForSavings = afterTaxProfit - personalPayAmount;
    const profitMargin = actualIncome > 0 ? (actualProfit / actualIncome) * 100 : 0;
    
    return {
      actualIncome,
      actualExpenses,
      actualProfit,
      taxAmount,
      afterTaxProfit,
      availableForSavings,
      profitMargin
    };
  };



  // Goal Tracker Functions
  const addGoal = () => {
    const newGoal: Goal = {
      id: Date.now().toString(),
      title: '',
      type: 'monthly',
      targetAmount: 0,
      currentAmount: 0,
      deadline: '',
      status: 'on-track'
    };
    setGoals([...goals, newGoal]);
  };

  const updateGoal = (id: string, field: string, value: any) => {
    setGoals(goals.map(goal => {
      if (goal.id === id) {
        const updatedGoal = { ...goal, [field]: value };
        // Auto-calculate status based on progress
        if (field === 'currentAmount' || field === 'targetAmount') {
          const progress = updatedGoal.targetAmount > 0 ? (updatedGoal.currentAmount / updatedGoal.targetAmount) * 100 : 0;
          if (progress >= 100) {
            updatedGoal.status = 'ahead';
          } else if (progress >= 80) {
            updatedGoal.status = 'on-track';
          } else {
            updatedGoal.status = 'behind';
          }
        }
        return updatedGoal;
      }
      return goal;
    }));
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(goal => goal.id !== id));
  };

  // Savings Tracker Functions
  const addSavingsGoal = () => {
    const newGoal: SavingsGoal = {
      id: Date.now().toString(),
      title: '',
      targetAmount: 0,
      currentAmount: 0,
      monthlyContribution: 0,
      targetDate: '',
      priority: 'medium'
    };
    setSavingsGoals([...savingsGoals, newGoal]);
  };

  const updateSavingsGoal = (id: string, field: string, value: any) => {
    setSavingsGoals(savingsGoals.map(goal => 
      goal.id === id ? { ...goal, [field]: value } : goal
    ));
  };

  const deleteSavingsGoal = (id: string) => {
    setSavingsGoals(savingsGoals.filter(goal => goal.id !== id));
  };

  const calculateMonthsToGoal = (goal: SavingsGoal) => {
    if (goal.monthlyContribution <= 0) return 0;
    const remaining = goal.targetAmount - goal.currentAmount;
    return Math.ceil(remaining / goal.monthlyContribution);
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
    csvContent += `Personal Pay,${personalPayAmount}\n`;
    csvContent += `Available for Savings,${trackerTotals.availableForSavings}\n`;
    csvContent += `Profit Margin,${trackerTotals.profitMargin.toFixed(2)}%\n\n`;
    
    // Goals
    csvContent += "GOALS\n";
    csvContent += "Title,Type,Target Amount,Current Amount,Progress %,Status,Deadline\n";
    goals.forEach(goal => {
      const progress = goal.targetAmount > 0 ? ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1) : 0;
      csvContent += `${goal.title},${goal.type},${goal.targetAmount},${goal.currentAmount},${progress},${goal.status},${goal.deadline}\n`;
    });
    
    // Savings Goals
    csvContent += "\nSAVINGS GOALS\n";
    csvContent += "Title,Target Amount,Current Amount,Monthly Contribution,Months to Goal,Priority,Target Date\n";
    savingsGoals.forEach(goal => {
      const monthsToGoal = calculateMonthsToGoal(goal);
      csvContent += `${goal.title},${goal.targetAmount},${goal.currentAmount},${goal.monthlyContribution},${monthsToGoal},${goal.priority},${goal.targetDate}\n`;
    });
    
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
      personalPayAmount,
      goals: [...goals],
      savingsGoals: [...savingsGoals],
      summary: {
        totalIncome: trackerTotals.actualIncome,
        totalExpenses: trackerTotals.actualExpenses,
        profit: trackerTotals.actualProfit,
        taxSetAside: trackerTotals.taxAmount,
        personalPay: personalPayAmount,
        profitMargin: trackerTotals.profitMargin,
        availableForSavings: trackerTotals.availableForSavings,
      },
      notes: {
        budget: budgetNotes,
        tracker: trackerNotes,
        goals: goalNotes,
        savings: savingsNotes,
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
    csvContent += `Personal Pay,${snapshot.summary.personalPay}\n`;
    csvContent += `Available for Savings,${snapshot.summary.availableForSavings}\n`;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-8">
          <BackToDashboard />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">Your Money Map</h1>
              <p className="text-gray-600">Complete financial dashboard for creative businesses</p>
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
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
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
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                3 Sections
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="tracker">Income & Expenses</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
          </TabsList>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">

            {/* Financial Goals */}
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Financial Goals</span>
                  <Button onClick={addGoal} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Goal
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="p-4 border rounded-lg space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          placeholder="Goal title"
                          value={goal.title}
                          onChange={(e) => updateGoal(goal.id, 'title', e.target.value)}
                        />
                        <Select value={goal.type} onValueChange={(value) => updateGoal(goal.id, 'type', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Achieve Goal By</label>
                          <Input
                            type="date"
                            value={goal.deadline}
                            onChange={(e) => updateGoal(goal.id, 'deadline', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          type="number"
                          placeholder="Target amount"
                          value={goal.targetAmount || ''}
                          onChange={(e) => updateGoal(goal.id, 'targetAmount', parseFloat(e.target.value) || 0)}
                        />
                        <Input
                          type="number"
                          placeholder="Current amount"
                          value={goal.currentAmount || ''}
                          onChange={(e) => updateGoal(goal.id, 'currentAmount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Progress</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0}%
                            </span>
                            <div className="flex items-center gap-1">
                              {goal.status === 'ahead' && <CheckCircle className="w-4 h-4 text-green-500" />}
                              {goal.status === 'on-track' && <Target className="w-4 h-4 text-blue-500" />}
                              {goal.status === 'behind' && <AlertCircle className="w-4 h-4 text-red-500" />}
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                goal.status === 'ahead' ? 'bg-green-100 text-green-700' :
                                goal.status === 'on-track' ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {goal.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Progress 
                          value={goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteGoal(goal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Goals Summary */}
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle>Goals Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {goals.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Goals</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {goals.filter(g => g.status === 'on-track' || g.status === 'ahead').length}
                    </div>
                    <div className="text-sm text-gray-600">On Track</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(goals.reduce((sum, goal) => sum + goal.targetAmount, 0))}
                    </div>
                    <div className="text-sm text-gray-600">Total Target</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(goals.reduce((sum, goal) => sum + goal.currentAmount, 0))}
                    </div>
                    <div className="text-sm text-gray-600">Current Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Goal Notes */}
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle>Goal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add notes about your goals and progress..."
                  value={goalNotes}
                  onChange={(e) => setGoalNotes(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Income & Expense Tracker Tab */}
          <TabsContent value="tracker" className="space-y-6">
            {/* Save Button */}
            <Card className="shadow-md border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Save className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Save your progress for {selectedPeriod === 'monthly' ? 'this month' : 'this quarter'}
                      </p>
                      <p className="text-xs text-gray-600">
                        Creates a permanent record for taxes and tracking
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={saveMonthlySnapshot}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    💾 Save {selectedPeriod === 'monthly' 
                      ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      : getCurrentPeriodLabel().replace('📘 ', '')
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={item.actualAmount || ''}
                        onChange={(e) => updateIncomeExpenseItem(item.id, 'actualAmount', parseFloat(e.target.value) || 0)}
                        className="w-32"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteIncomeExpenseItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    onClick={() => addIncomeExpenseItem('income')}
                    className="w-full"
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
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={item.actualAmount || ''}
                        onChange={(e) => updateIncomeExpenseItem(item.id, 'actualAmount', parseFloat(e.target.value) || 0)}
                        className="w-32"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteIncomeExpenseItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    onClick={() => addIncomeExpenseItem('expense')}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense Category
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Percentage Allocations */}
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle>Percentage Allocations</CardTitle>
                <CardDescription>
                  Input the percentage you want to save in the following categories and they will automatically appear in your Financial Summary
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {editingTax ? (
                        <Input
                          type="text"
                          value={taxCategoryName}
                          onChange={(e) => setTaxCategoryName(e.target.value)}
                          onBlur={() => setEditingTax(false)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingTax(false)}
                          className="flex-1 text-sm font-medium"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1 text-sm font-medium">{taxCategoryName}</span>
                      )}
                      <button
                        onClick={() => setEditingTax(true)}
                        className="hover:text-blue-600 transition-colors"
                      >
                        <Pencil className="h-3 w-3 text-gray-400 hover:text-blue-600" />
                      </button>
                      <span className="text-sm font-medium">(%)</span>
                    </div>
                    <Input
                      id="tax-percentage"
                      type="number"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {editingPersonalPay ? (
                        <Input
                          type="text"
                          value={personalPayCategoryName}
                          onChange={(e) => setPersonalPayCategoryName(e.target.value)}
                          onBlur={() => setEditingPersonalPay(false)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingPersonalPay(false)}
                          className="flex-1 text-sm font-medium"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1 text-sm font-medium">{personalPayCategoryName}</span>
                      )}
                      <button
                        onClick={() => setEditingPersonalPay(true)}
                        className="hover:text-blue-600 transition-colors"
                      >
                        <Pencil className="h-3 w-3 text-gray-400 hover:text-blue-600" />
                      </button>
                      <span className="text-sm font-medium">(%)</span>
                    </div>
                    <Input
                      id="personal-pay"
                      type="number"
                      value={personalPayAmount}
                      onChange={(e) => setPersonalPayAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {editingSavings ? (
                        <Input
                          type="text"
                          value={savingsCategoryName}
                          onChange={(e) => setSavingsCategoryName(e.target.value)}
                          onBlur={() => setEditingSavings(false)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingSavings(false)}
                          className="flex-1 text-sm font-medium"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1 text-sm font-medium">{savingsCategoryName}</span>
                      )}
                      <button
                        onClick={() => setEditingSavings(true)}
                        className="hover:text-blue-600 transition-colors"
                      >
                        <Pencil className="h-3 w-3 text-gray-400 hover:text-blue-600" />
                      </button>
                      <span className="text-sm font-medium">(%)</span>
                    </div>
                    <Input
                      id="savings-percentage"
                      type="number"
                      value={savingsPercentage}
                      onChange={(e) => setSavingsPercentage(parseFloat(e.target.value) || 0)}
                      placeholder="20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tracker Summary */}
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(getTrackerTotals().actualIncome)}
                    </div>
                    <div className="text-sm text-gray-600">Actual Income</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(getTrackerTotals().actualExpenses)}
                    </div>
                    <div className="text-sm text-gray-600">Actual Expenses</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className={`text-xl font-bold ${getTrackerTotals().actualProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(getTrackerTotals().actualProfit)}
                    </div>
                    <div className="text-sm text-gray-600">Gross Profit</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">
                      {getTrackerTotals().profitMargin.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Profit Margin</div>
                  </div>
                </div>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-lg font-bold text-orange-600">
                      {formatCurrency(getTrackerTotals().taxAmount)}
                    </div>
                    <div className="text-sm text-gray-600">{taxCategoryName}</div>
                  </div>
                  <div className="text-center p-4 bg-indigo-50 rounded-lg">
                    <div className="text-lg font-bold text-indigo-600">
                      {formatCurrency(personalPayAmount)}
                    </div>
                    <div className="text-sm text-gray-600">{personalPayCategoryName}</div>
                  </div>
                  <div className="text-center p-4 bg-teal-50 rounded-lg">
                    <div className="text-lg font-bold text-teal-600">
                      {formatCurrency(getTrackerTotals().availableForSavings)}
                    </div>
                    <div className="text-sm text-gray-600">{savingsCategoryName}</div>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Tracker Notes */}
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle>Tracker Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add notes about your actual income and expenses..."
                  value={trackerNotes}
                  onChange={(e) => setTrackerNotes(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          </TabsContent>





          {/* Savings Tracker Tab */}
          <TabsContent value="savings" className="space-y-6">

            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Savings Goals</span>
                  <Button onClick={addSavingsGoal} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Savings Goal
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {savingsGoals.map((goal) => (
                    <div key={goal.id} className="p-4 border rounded-lg space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          placeholder="Savings goal title"
                          value={goal.title}
                          onChange={(e) => updateSavingsGoal(goal.id, 'title', e.target.value)}
                        />
                        <Select value={goal.priority} onValueChange={(value) => updateSavingsGoal(goal.id, 'priority', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High Priority</SelectItem>
                            <SelectItem value="medium">Medium Priority</SelectItem>
                            <SelectItem value="low">Low Priority</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          value={goal.targetDate}
                          onChange={(e) => updateSavingsGoal(goal.id, 'targetDate', e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          type="number"
                          placeholder="Target amount"
                          value={goal.targetAmount || ''}
                          onChange={(e) => updateSavingsGoal(goal.id, 'targetAmount', parseFloat(e.target.value) || 0)}
                        />
                        <Input
                          type="number"
                          placeholder="Current amount"
                          value={goal.currentAmount || ''}
                          onChange={(e) => updateSavingsGoal(goal.id, 'currentAmount', parseFloat(e.target.value) || 0)}
                        />
                        <Input
                          type="number"
                          placeholder="Monthly contribution"
                          value={goal.monthlyContribution || ''}
                          onChange={(e) => updateSavingsGoal(goal.id, 'monthlyContribution', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Progress</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm">
                              {goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0}%
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              goal.priority === 'high' ? 'bg-red-100 text-red-700' :
                              goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {goal.priority}
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {calculateMonthsToGoal(goal) > 0 && (
                            <span>
                              {calculateMonthsToGoal(goal)} months to goal at current contribution rate
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSavingsGoal(goal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Savings Summary */}
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle>Savings Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0))}
                    </div>
                    <div className="text-sm text-gray-600">Total Saved</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">
                      {formatCurrency(savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0))}
                    </div>
                    <div className="text-sm text-gray-600">Total Target</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">
                      {formatCurrency(savingsGoals.reduce((sum, goal) => sum + goal.monthlyContribution, 0))}
                    </div>
                    <div className="text-sm text-gray-600">Monthly Contributions</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Savings Notes */}
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle>Savings Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add notes about your savings goals and strategies..."
                  value={savingsNotes}
                  onChange={(e) => setSavingsNotes(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Monthly Records Section */}
        <Card className="shadow-md border-0 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-gray-600" />
                Monthly Records
                <Badge variant="secondary" className="ml-2">
                  {monthlySnapshots.length} Saved
                </Badge>
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
            <CardContent>
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
                            {getCurrencySymbol(snapshot.currency)}{snapshot.summary.personalPay.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Personal Pay</div>
                        </div>
                        <div className="text-center p-3 bg-teal-50 rounded-lg">
                          <div className="text-sm font-bold text-teal-600">
                            {getCurrencySymbol(snapshot.currency)}{snapshot.summary.availableForSavings.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Available for Savings</div>
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
                              <h5 className="font-medium mb-3 text-red-600">Expenses</h5>
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

                          {/* Goals & Savings Summary */}
                          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h5 className="font-medium mb-3 text-blue-600">Goals ({snapshot.goals.length})</h5>
                              <div className="space-y-2">
                                {snapshot.goals.map((goal, index) => (
                                  <div key={index} className="text-sm">
                                    <div className="flex justify-between">
                                      <span>{goal.title}</span>
                                      <span className="font-medium">{goal.status}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {getCurrencySymbol(snapshot.currency)}{goal.currentAmount.toLocaleString()} / {getCurrencySymbol(snapshot.currency)}{goal.targetAmount.toLocaleString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-medium mb-3 text-purple-600">Savings Goals ({snapshot.savingsGoals.length})</h5>
                              <div className="space-y-2">
                                {snapshot.savingsGoals.map((goal, index) => (
                                  <div key={index} className="text-sm">
                                    <div className="flex justify-between">
                                      <span>{goal.title}</span>
                                      <span className="font-medium">{goal.priority}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {getCurrencySymbol(snapshot.currency)}{goal.currentAmount.toLocaleString()} / {getCurrencySymbol(snapshot.currency)}{goal.targetAmount.toLocaleString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
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

      <MobileNav />
    </div>
  );
}