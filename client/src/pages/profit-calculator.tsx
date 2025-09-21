import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/mobile-nav';
import { 
  Calculator, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit2,
  Edit3,
  Save,
  X,
  Download,
  Eye,
  Upload,
  Archive,
  FileText
} from 'lucide-react';

interface Component {
  id: string;
  name: string;
  costPerUnit: number;
  quantity: number;
  totalCost: number;
}

interface ProfitCalculation {
  id: string;
  name: string;
  components: Component[];
  totalCost: number;
  sellingPrice: number;
  profitPerUnit: number;
  profitMargin: number;
  marginStrength: 'strong' | 'moderate' | 'low';
  lastModified: string;
  currency: string;
}

interface PricingLibraryEntry {
  id: string;
  productName: string;
  components: Component[];
  totalCost: number;
  sellingPrice: number;
  profitPerUnit: number;
  profitMargin: number;
  marginStrength: 'strong' | 'moderate' | 'low';
  dateAdded: string;
  currency: string;
}

const MARGIN_CONFIG = {
  strong: { 
    label: 'Excellent Margin', 
    color: 'bg-green-200 text-green-900 border-green-400',
    cellColor: 'bg-green-100'
  },
  moderate: { 
    label: 'Good Margin', 
    color: 'bg-green-100 text-green-800 border-green-300',
    cellColor: 'bg-green-50'
  },
  low: { 
    label: 'Low Margin', 
    color: 'bg-red-100 text-red-800 border-red-300',
    cellColor: 'bg-red-50'
  }
};

const POPULAR_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' }
];

export default function ProfitCalculator() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [calculations, setCalculations] = useState<ProfitCalculation[]>([]);
  const [selectedCalculation, setSelectedCalculation] = useState<ProfitCalculation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [pricingLibrary, setPricingLibrary] = useState<PricingLibraryEntry[]>([]);
  const [activeTab, setActiveTab] = useState('calculator');
  const [editingLibraryEntryId, setEditingLibraryEntryId] = useState<string | null>(null);

  // Load calculations and pricing library from localStorage on component mount
  useEffect(() => {
    const savedCalculations = localStorage.getItem('profitCalculations');
    const savedPricingLibrary = localStorage.getItem('pricingLibrary');
    
    if (savedCalculations) {
      try {
        setCalculations(JSON.parse(savedCalculations));
      } catch (error) {
        console.error('Failed to parse saved calculations:', error);
      }
    }
    
    if (savedPricingLibrary) {
      try {
        setPricingLibrary(JSON.parse(savedPricingLibrary));
      } catch (error) {
        console.error('Failed to parse saved pricing library:', error);
      }
    }
  }, []);

  // Save calculations to localStorage whenever calculations change
  useEffect(() => {
    localStorage.setItem('profitCalculations', JSON.stringify(calculations));
  }, [calculations]);

  // Save pricing library to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pricingLibrary', JSON.stringify(pricingLibrary));
  }, [pricingLibrary]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const getMarginStrength = (margin: number): 'strong' | 'moderate' | 'low' => {
    if (margin >= 70) return 'strong';
    if (margin >= 40) return 'moderate';
    return 'low';
  };

  const getCurrencySymbol = (currencyCode: string): string => {
    const currency = POPULAR_CURRENCIES.find(c => c.code === currencyCode);
    return currency ? currency.symbol : currencyCode;
  };

  const handleCurrencyChange = (newCurrency: string) => {
    if (!selectedCalculation) return;
    
    const updatedCalculation = {
      ...selectedCalculation,
      currency: newCurrency
    };
    
    updateCalculation(updatedCalculation);
  };

  const calculateTotals = (components: Component[], sellingPrice: number) => {
    const totalCost = components.reduce((sum, comp) => sum + comp.totalCost, 0);
    const profitPerUnit = sellingPrice - totalCost;
    const profitMargin = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;
    const marginStrength = getMarginStrength(profitMargin);
    
    return { totalCost, profitPerUnit, profitMargin, marginStrength };
  };

  const createNewCalculation = () => {
    const newCalculation: ProfitCalculation = {
      id: generateId(),
      name: 'New Calculation',
      components: [
        { id: generateId(), name: '', costPerUnit: 0, quantity: 0, totalCost: 0 }
      ],
      totalCost: 0,
      sellingPrice: 0,
      profitPerUnit: 0,
      profitMargin: 0,
      marginStrength: 'low',
      lastModified: new Date().toISOString(),
      currency: 'GBP'
    };
    setCalculations(prev => [...prev, newCalculation]);
    setSelectedCalculation(newCalculation);
    setIsEditing(true);
    setEditingName(newCalculation.name);
  };

  const deleteCalculation = (calculationId: string) => {
    setCalculations(prev => prev.filter(c => c.id !== calculationId));
    if (selectedCalculation?.id === calculationId) {
      setSelectedCalculation(null);
    }
    toast({
      title: "Calculation deleted",
      description: "Calculation has been removed from your library.",
    });
  };

  const updateCalculation = (updatedCalculation: ProfitCalculation) => {
    setCalculations(prev => prev.map(c => 
      c.id === updatedCalculation.id 
        ? { ...updatedCalculation, lastModified: new Date().toISOString() }
        : c
    ));
    setSelectedCalculation(updatedCalculation);
  };

  const addComponent = () => {
    if (!selectedCalculation) return;
    
    const newComponent: Component = {
      id: generateId(),
      name: '',
      costPerUnit: 0,
      quantity: 0,
      totalCost: 0
    };
    
    const updatedCalculation = {
      ...selectedCalculation,
      components: [...selectedCalculation.components, newComponent]
    };
    
    updateCalculation(updatedCalculation);
  };

  const updateComponent = (componentId: string, field: keyof Component, value: string | number) => {
    if (!selectedCalculation) return;
    
    const updatedComponents = selectedCalculation.components.map(c => {
      if (c.id === componentId) {
        const updated = { ...c, [field]: value };
        if (field === 'costPerUnit' || field === 'quantity') {
          updated.totalCost = updated.costPerUnit * updated.quantity;
        }
        return updated;
      }
      return c;
    });
    
    const { totalCost, profitPerUnit, profitMargin, marginStrength } = calculateTotals(
      updatedComponents, 
      selectedCalculation.sellingPrice
    );
    
    const updatedCalculation = {
      ...selectedCalculation,
      components: updatedComponents,
      totalCost,
      profitPerUnit,
      profitMargin,
      marginStrength
    };
    
    updateCalculation(updatedCalculation);
  };

  const updateSellingPrice = (price: number) => {
    if (!selectedCalculation) return;
    
    const { totalCost, profitPerUnit, profitMargin, marginStrength } = calculateTotals(
      selectedCalculation.components, 
      price
    );
    
    const updatedCalculation = {
      ...selectedCalculation,
      sellingPrice: price,
      totalCost,
      profitPerUnit,
      profitMargin,
      marginStrength
    };
    
    updateCalculation(updatedCalculation);
  };

  const deleteComponent = (componentId: string) => {
    if (!selectedCalculation) return;
    
    const updatedComponents = selectedCalculation.components.filter(c => c.id !== componentId);
    const { totalCost, profitPerUnit, profitMargin, marginStrength } = calculateTotals(
      updatedComponents, 
      selectedCalculation.sellingPrice
    );
    
    const updatedCalculation = {
      ...selectedCalculation,
      components: updatedComponents,
      totalCost,
      profitPerUnit,
      profitMargin,
      marginStrength
    };
    
    updateCalculation(updatedCalculation);
  };

  const handlePaste = () => {
    if (!pasteText.trim() || !selectedCalculation) return;
    
    const lines = pasteText.trim().split('\n');
    const newComponents: Component[] = [];
    
    lines.forEach(line => {
      const cleanLine = line.trim();
      if (cleanLine && !cleanLine.includes('=')) {
        // Parse lines like "1. Item name (Qty: 2) - notes"
        const match = cleanLine.match(/^(\d+\.)?\s*(.+?)(?:\s*\(Qty:\s*([^)]+)\))?(?:\s*-\s*(.+))?$/);
        if (match) {
          const [, , name, qty] = match;
          const quantity = qty ? parseFloat(qty) || 1 : 1;
          
          newComponents.push({
            id: generateId(),
            name: name.trim(),
            costPerUnit: 0,
            quantity,
            totalCost: 0
          });
        }
      }
    });
    
    if (newComponents.length > 0) {
      const updatedCalculation = {
        ...selectedCalculation,
        components: newComponents
      };
      updateCalculation(updatedCalculation);
      setPasteText('');
      toast({
        title: "Components pasted",
        description: `${newComponents.length} components added to your calculation.`,
      });
    }
  };

  const handleNameSave = () => {
    if (!selectedCalculation || !editingName.trim()) return;
    
    const updatedCalculation = {
      ...selectedCalculation,
      name: editingName.trim()
    };
    
    updateCalculation(updatedCalculation);
    setIsEditing(false);
  };

  const handleNameCancel = () => {
    setEditingName(selectedCalculation?.name || '');
    setIsEditing(false);
  };

  const saveToLibrary = () => {
    if (!selectedCalculation) return;
    
    const libraryEntry: PricingLibraryEntry = {
      id: editingLibraryEntryId || generateId(),
      productName: selectedCalculation.name,
      components: selectedCalculation.components,
      totalCost: selectedCalculation.totalCost,
      sellingPrice: selectedCalculation.sellingPrice,
      profitPerUnit: selectedCalculation.profitPerUnit,
      profitMargin: selectedCalculation.profitMargin,
      marginStrength: selectedCalculation.marginStrength,
      dateAdded: editingLibraryEntryId ? 
        pricingLibrary.find(e => e.id === editingLibraryEntryId)?.dateAdded || new Date().toISOString() :
        new Date().toISOString(),
      currency: selectedCalculation.currency
    };
    
    if (editingLibraryEntryId) {
      // Update existing entry
      setPricingLibrary(prev => 
        prev.map(entry => 
          entry.id === editingLibraryEntryId ? libraryEntry : entry
        )
      );
      setEditingLibraryEntryId(null);
      toast({
        title: "Updated in library",
        description: `${selectedCalculation.name} has been updated in your pricing library.`,
      });
    } else {
      // Add new entry
      setPricingLibrary(prev => [...prev, libraryEntry]);
      toast({
        title: "Saved to library",
        description: `${selectedCalculation.name} has been added to your pricing library.`,
      });
    }
  };

  const editFromLibrary = (id: string) => {
    const entry = pricingLibrary.find(e => e.id === id);
    if (!entry) return;
    
    // Set editing mode to track which library entry we're editing
    setEditingLibraryEntryId(id);
    
    // Create a new calculation from the library entry with all original components
    const editCalculation: ProfitCalculation = {
      id: generateId(),
      name: entry.productName,
      components: entry.components || [],
      totalCost: entry.totalCost,
      sellingPrice: entry.sellingPrice,
      profitPerUnit: entry.profitPerUnit,
      profitMargin: entry.profitMargin,
      marginStrength: entry.marginStrength,
      currency: entry.currency || 'USD',
      lastModified: new Date().toISOString()
    };
    
    // When editing from library, just set as selected without adding to calculations list
    setSelectedCalculation(editCalculation);
    
    // Switch to calculator tab
    setActiveTab('calculator');
    
    toast({
      title: "Loaded for editing",
      description: `${entry.productName} has been loaded into the calculator for editing. Changes will update the original entry.`,
    });
  };

  const deleteFromLibrary = (id: string) => {
    const entry = pricingLibrary.find(e => e.id === id);
    setPricingLibrary(prev => prev.filter(e => e.id !== id));
    toast({
      title: "Removed from library",
      description: `${entry?.productName} has been removed from your pricing library.`,
    });
  };

  const exportLibraryToCSV = () => {
    if (pricingLibrary.length === 0) {
      toast({
        title: "No data to export",
        description: "Add some products to your pricing library first.",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      'Product Name',
      'Total Cost',
      'Selling Price', 
      'Profit per Unit',
      'Profit Margin %',
      'Margin Strength',
      'Currency',
      'Date Added'
    ];

    const csvContent = [
      headers.join(','),
      ...pricingLibrary.map(entry => [
        `"${entry.productName}"`,
        entry.totalCost.toFixed(2),
        entry.sellingPrice.toFixed(2),
        entry.profitPerUnit.toFixed(2),
        entry.profitMargin.toFixed(1),
        `"${MARGIN_CONFIG[entry.marginStrength].label}"`,
        entry.currency || 'USD',
        new Date(entry.dateAdded).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pricing-library-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export complete",
      description: "Your pricing library has been downloaded as a CSV file.",
    });
  };

  if (selectedCalculation) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-white">
        <Sidebar />
        <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 lg:ml-64">
          {/* Header */}
          <div className="mb-6">
            {/* Mobile Navigation - Single Back Arrow */}
            <div className="flex items-center gap-3 lg:hidden mt-16 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedCalculation(null)}
                className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Desktop Navigation - Full Button */}
            <Button
              variant="ghost"
              onClick={() => setSelectedCalculation(null)}
              className="mb-4 text-gray-600 hover:text-gray-900 hidden lg:flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Calculations
            </Button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-400 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="text-2xl font-bold border-none p-0 focus-visible:ring-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameSave();
                        if (e.key === 'Escape') handleNameCancel();
                      }}
                      onBlur={handleNameSave}
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={handleNameSave}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleNameCancel}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedCalculation.name}</h1>
                    <Button size="sm" variant="ghost" onClick={() => { setIsEditing(true); setEditingName(selectedCalculation.name); }}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* Components Table */}
          <div className="bg-white rounded-lg border mb-6">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Components & Costs</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Currency:</label>
                <Select value={selectedCalculation.currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name} ({currency.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium text-gray-700">Component Name</th>
                    <th className="text-left p-4 font-medium text-gray-700">Cost per Unit ({getCurrencySymbol(selectedCalculation.currency)})</th>
                    <th className="text-left p-4 font-medium text-gray-700">Quantity</th>
                    <th className="text-left p-4 font-medium text-gray-700">Total Cost ({getCurrencySymbol(selectedCalculation.currency)})</th>
                    <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCalculation.components.map((component, index) => (
                    <tr key={component.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-4">
                        <Input
                          value={component.name}
                          onChange={(e) => updateComponent(component.id, 'name', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          placeholder="Component name"
                          className="border-gray-300"
                        />
                      </td>
                      <td className="p-4">
                        <Input
                          type="number"
                          value={component.costPerUnit}
                          onChange={(e) => updateComponent(component.id, 'costPerUnit', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          placeholder="0.00"
                          className="border-gray-300"
                          step="0.01"
                        />
                      </td>
                      <td className="p-4">
                        <Input
                          type="number"
                          value={component.quantity}
                          onChange={(e) => updateComponent(component.id, 'quantity', parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          placeholder="1"
                          className="border-gray-300"
                          step="0.01"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">
                          {getCurrencySymbol(selectedCalculation.currency)}{component.totalCost.toFixed(2)}
                        </div>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteComponent(component.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Add Component Button */}
            <div className="p-4 border-t bg-gray-50">
              <Button onClick={addComponent} size="sm" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Component
              </Button>
            </div>
          </div>

          {/* Pricing & Profit Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Pricing Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-3">
                    Desired Selling Price ({getCurrencySymbol(selectedCalculation.currency)})
                  </label>
                  <Input
                    type="number"
                    value={selectedCalculation.sellingPrice}
                    onChange={(e) => updateSellingPrice(parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="0.00"
                    className="border-gray-300 text-2xl p-4 font-semibold"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Cost to Produce
                  </label>
                  <div className="text-2xl font-bold text-gray-900">
                    {getCurrencySymbol(selectedCalculation.currency)}{selectedCalculation.totalCost.toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedCalculation.sellingPrice > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900">Profit Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profit per Unit
                    </label>
                    <div className="text-2xl font-bold text-gray-900">
                      {getCurrencySymbol(selectedCalculation.currency)}{selectedCalculation.profitPerUnit.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profit Margin (%)
                    </label>
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedCalculation.profitMargin.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Margin Strength
                  </label>
                  <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${MARGIN_CONFIG[selectedCalculation.marginStrength].color}`}>
                    <span className="font-medium">
                      {MARGIN_CONFIG[selectedCalculation.marginStrength].label}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end gap-3">
            <Button onClick={saveToLibrary} className="bg-green-500 hover:bg-green-600 text-white">
              <Archive className="w-4 h-4 mr-2" />
              Save to Pricing Library
            </Button>
            <Button 
              onClick={() => {
                setSelectedCalculation(null);
                setActiveTab('library');
              }} 
              variant="outline"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Library
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <Sidebar />
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 lg:ml-64">
        {/* Navigation */}
        <div className="mb-4">
          {/* Mobile Navigation - Single Back Arrow */}
          <div className="flex items-center gap-3 lg:hidden mt-16">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/launch")}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Desktop Navigation - Full Buttons */}
          <div className="hidden lg:flex gap-4">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Main Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={() => setLocation('/product-launch')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Product Launch
            </Button>
          </div>
        </div>
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-400 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profit Calculator</h1>
              <p className="text-gray-600">Calculate costs, profits, and margins with colour-coded indicators</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="library">Pricing Library ({pricingLibrary.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator">
            <div className="space-y-6">
              {/* Instructions */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <p className="text-sm text-green-800 leading-relaxed">List your product components here, enter your costs, and let the calculator do the rest. You'll see exactly how much it costs to produce each item and how much profit you're making. Tweak your numbers to test different scenarios, then click 'add to library' to see all your products listed in one place, ready to download.</p>
                </CardContent>
              </Card>

              {/* Add New Calculation Button */}
              <div className="mb-6">
                <Button onClick={createNewCalculation} className="bg-green-500 hover:bg-green-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Calculation
                </Button>
              </div>

              {/* Calculations Grid */}
              {calculations.length === 0 ? (
                <div className="text-center py-12">
                  <Calculator className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No calculations yet</h3>
                  <p className="text-gray-600">Create your first profit calculation to get started using the button above</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {calculations.map((calculation) => (
                    <Card key={calculation.id} className="group hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg text-gray-900 leading-tight">
                            {calculation.name}
                          </CardTitle>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${MARGIN_CONFIG[calculation.marginStrength].color}`}>
                            {MARGIN_CONFIG[calculation.marginStrength].label}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="text-sm text-gray-600">
                            {calculation.components.length} component{calculation.components.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            Profit Margin: {calculation.profitMargin.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            Last modified: {new Date(calculation.lastModified).toLocaleDateString()}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedCalculation(calculation)}
                              className="flex-1"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Open
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCalculation(calculation.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="library">
            <div className="space-y-6">
              {/* Export Button */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Saved Pricing Library</h3>
                <Button onClick={exportLibraryToCSV} className="bg-green-500 hover:bg-green-600 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Download Full Pricing Report
                </Button>
              </div>

              {/* Pricing Library Table */}
              {pricingLibrary.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved products yet</h3>
                  <p className="text-gray-600">Complete profit calculations and save them to build your pricing library</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-4 font-medium text-gray-700">Product Name</th>
                          <th className="text-left p-4 font-medium text-gray-700">Total Cost</th>
                          <th className="text-left p-4 font-medium text-gray-700">Selling Price</th>
                          <th className="text-left p-4 font-medium text-gray-700">Profit per Unit</th>
                          <th className="text-left p-4 font-medium text-gray-700">Profit Margin %</th>
                          <th className="text-left p-4 font-medium text-gray-700">Margin Strength</th>
                          <th className="text-left p-4 font-medium text-gray-700">Date Added</th>
                          <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricingLibrary.map((entry, index) => (
                          <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-4 font-medium text-gray-900">{entry.productName}</td>
                            <td className="p-4 text-gray-900">{getCurrencySymbol(entry.currency || 'USD')}{entry.totalCost.toFixed(2)}</td>
                            <td className="p-4 text-gray-900">{getCurrencySymbol(entry.currency || 'USD')}{entry.sellingPrice.toFixed(2)}</td>
                            <td className="p-4 text-gray-900">{getCurrencySymbol(entry.currency || 'USD')}{entry.profitPerUnit.toFixed(2)}</td>
                            <td className="p-4 text-gray-900">{entry.profitMargin.toFixed(1)}%</td>
                            <td className={`p-4 ${MARGIN_CONFIG[entry.marginStrength].cellColor}`}>
                              <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${MARGIN_CONFIG[entry.marginStrength].color}`}>
                                {MARGIN_CONFIG[entry.marginStrength].label}
                              </div>
                            </td>
                            <td className="p-4 text-gray-600">{new Date(entry.dateAdded).toLocaleDateString()}</td>
                            <td className="p-4">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => editFromLibrary(entry.id)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteFromLibrary(entry.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}