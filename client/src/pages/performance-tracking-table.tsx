import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { BarChart3, Plus, Trash2, Download, Check, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PerformanceItem {
  id: string;
  contentTitle: string;
  contentType: string;
  platform: string;
  engagement: string;
  savesShares: string;
  comments: string;
  overallInsight: string;
}

interface AddingCustom {
  field: 'contentType' | 'platform';
  rowId: string;
}

const defaultContentTypes = ['Reel', 'Carousel', 'Story', 'Email', 'Post', 'Other'];
const defaultPlatforms = ['Instagram', 'TikTok', 'Email', 'Blog', 'Pinterest', 'Other'];
const engagementOptions = ['High', 'Medium', 'Low'];

export default function PerformanceTrackingTable() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [performanceItems, setPerformanceItems] = useState<PerformanceItem[]>([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [addingCustom, setAddingCustom] = useState<AddingCustom | null>(null);
  const [customValue, setCustomValue] = useState('');
  const [customContentTypes, setCustomContentTypes] = useState<string[]>([]);
  const [customPlatforms, setCustomPlatforms] = useState<string[]>([]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedItems = localStorage.getItem('performanceTrackingItems');
    if (savedItems) {
      setPerformanceItems(JSON.parse(savedItems));
    } else {
      // Initialize with 5 empty rows
      const initialItems = Array.from({ length: 5 }, (_, index) => ({
        id: `item-${index + 1}`,
        contentTitle: '',
        contentType: '',
        platform: '',
        engagement: '',
        savesShares: '',
        comments: '',
        overallInsight: '',
      }));
      setPerformanceItems(initialItems);
    }

    const savedCustomContentTypes = localStorage.getItem('customContentTypes');
    if (savedCustomContentTypes) {
      setCustomContentTypes(JSON.parse(savedCustomContentTypes));
    }

    const savedCustomPlatforms = localStorage.getItem('customPlatforms');
    if (savedCustomPlatforms) {
      setCustomPlatforms(JSON.parse(savedCustomPlatforms));
    }
  }, []);

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('performanceTrackingItems', JSON.stringify(performanceItems));
  }, [performanceItems]);

  useEffect(() => {
    localStorage.setItem('customContentTypes', JSON.stringify(customContentTypes));
  }, [customContentTypes]);

  useEffect(() => {
    localStorage.setItem('customPlatforms', JSON.stringify(customPlatforms));
  }, [customPlatforms]);

  const handleInputChange = (id: string, field: keyof PerformanceItem, value: string) => {
    setPerformanceItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addNewRow = () => {
    const newItem: PerformanceItem = {
      id: `item-${Date.now()}`,
      contentTitle: '',
      contentType: '',
      platform: '',
      engagement: '',
      savesShares: '',
      comments: '',
      overallInsight: '',
    };
    setPerformanceItems(prev => [...prev, newItem]);
  };

  const deleteRow = (id: string) => {
    setPerformanceItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAll = () => {
    const initialItems = Array.from({ length: 5 }, (_, index) => ({
      id: `item-${index + 1}`,
      contentTitle: '',
      contentType: '',
      platform: '',
      engagement: '',
      savesShares: '',
      comments: '',
      overallInsight: '',
    }));
    setPerformanceItems(initialItems);
    setShowClearModal(false);
    toast({
      title: "Table cleared",
      description: "All performance tracking data has been reset.",
    });
  };

  const exportToCSV = () => {
    const headers = ['Content Title', 'Content Type', 'Platform', 'Engagement', 'Saves/Shares', 'Comments', 'Overall Insight'];
    const csvContent = [
      headers.join(','),
      ...performanceItems.map(item => [
        `"${item.contentTitle}"`,
        `"${item.contentType}"`,
        `"${item.platform}"`,
        `"${item.engagement}"`,
        `"${item.savesShares}"`,
        `"${item.comments}"`,
        `"${item.overallInsight}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'performance-tracking-table.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV exported",
      description: "Your performance tracking data has been downloaded.",
    });
  };

  const handleCustomSubmit = () => {
    if (!customValue.trim() || !addingCustom) return;

    if (addingCustom.field === 'contentType') {
      setCustomContentTypes(prev => [...prev, customValue.trim()]);
      handleInputChange(addingCustom.rowId, 'contentType', customValue.trim());
    } else if (addingCustom.field === 'platform') {
      setCustomPlatforms(prev => [...prev, customValue.trim()]);
      handleInputChange(addingCustom.rowId, 'platform', customValue.trim());
    }

    setCustomValue('');
    setAddingCustom(null);
    toast({
      title: "Custom option added",
      description: `"${customValue.trim()}" has been added to your options.`,
    });
  };

  const handleCustomCancel = () => {
    setCustomValue('');
    setAddingCustom(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      handleCustomCancel();
    }
  };

  const renderDropdown = (
    item: PerformanceItem,
    field: 'contentType' | 'platform' | 'engagement',
    options: string[],
    customOptions: string[] = []
  ) => {
    if (addingCustom?.field === field && addingCustom?.rowId === item.id) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Add custom ${field}`}
            className="h-10 text-sm"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleCustomSubmit}
            className="h-10 w-10 p-0 bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCustomCancel}
            className="h-10 w-10 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    return (
      <Select
        value={item[field]}
        onValueChange={(value) => {
          if (value === 'add-custom') {
            setAddingCustom({ field: field as 'contentType' | 'platform', rowId: item.id });
            setCustomValue('');
          } else {
            handleInputChange(item.id, field, value);
          }
        }}
      >
        <SelectTrigger className="h-12 text-sm">
          <SelectValue placeholder={`Select ${field}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          {customOptions.length > 0 && (
            <>
              <hr className="my-1" />
              {customOptions.map((option) => (
                <SelectItem key={option} value={option} className="italic">
                  {option}
                </SelectItem>
              ))}
            </>
          )}
          {field !== 'engagement' && (
            <>
              <hr className="my-1" />
              <SelectItem value="add-custom" className="text-pink-600 font-medium">
                + Add Custom {field === 'contentType' ? 'Type' : 'Platform'}
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/content-planning')}
            className="mb-4 text-gray-600 hover:text-gray-800"
          >
            ← Back to Content Planning
          </Button>
          
          <Card className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl text-gray-800">
                <BarChart3 className="w-6 h-6 text-pink-600" />
                Performance Tracking Table
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Track which content performs best so you can create more of what works.
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Performance Tracking Table */}
        <Card className="bg-white shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gradient-to-r from-pink-400 to-rose-400 text-white sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-sm w-48">Content Title</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm w-32">Content Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm w-32">Platform</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm w-32">Engagement</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm w-32">Saves/Shares</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm w-24">Comments</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm w-64">Overall Insight</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceItems.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-pink-50`}
                    >
                      <td className="px-4 py-3">
                        <Input
                          value={item.contentTitle}
                          onChange={(e) => handleInputChange(item.id, 'contentTitle', e.target.value)}
                          placeholder="e.g., Reel – Packing Orders"
                          className="h-12 text-sm border-gray-200 focus:border-pink-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {renderDropdown(item, 'contentType', defaultContentTypes, customContentTypes)}
                      </td>
                      <td className="px-4 py-3">
                        {renderDropdown(item, 'platform', defaultPlatforms, customPlatforms)}
                      </td>
                      <td className="px-4 py-3">
                        {renderDropdown(item, 'engagement', engagementOptions)}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={item.savesShares}
                          onChange={(e) => handleInputChange(item.id, 'savesShares', e.target.value)}
                          placeholder="e.g., 10 saves, 3 shares"
                          className="h-12 text-sm border-gray-200 focus:border-pink-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={item.comments}
                          onChange={(e) => handleInputChange(item.id, 'comments', e.target.value)}
                          placeholder="e.g., 15"
                          className="h-12 text-sm border-gray-200 focus:border-pink-300"
                          type="number"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Textarea
                          value={item.overallInsight}
                          onChange={(e) => handleInputChange(item.id, 'overallInsight', e.target.value)}
                          placeholder="e.g., Hook performed well, caption fell flat"
                          className="h-12 text-sm border-gray-200 focus:border-pink-300 resize-none"
                          rows={1}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(item.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer Controls */}
        <div className="flex justify-between items-center mt-6">
          <div className="flex gap-3">
            <Button
              onClick={addNewRow}
              className="bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </Button>

            <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-pink-300 text-pink-600 hover:bg-pink-50 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Clear All Rows
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Clear All Rows?</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to clear all performance tracking data? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowClearModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleClearAll}
                    className="bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    Clear Table
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Button
            onClick={exportToCSV}
            variant="outline" 
            className="border-pink-300 text-pink-600 hover:bg-pink-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
}