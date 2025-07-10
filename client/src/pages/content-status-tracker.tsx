import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  Plus, 
  Trash2,
  Download,
  ClipboardCheck,
  Calendar,
  Check,
  X
} from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  type: string;
  platform: string;
  status: string;
  scheduledDate: string;
  notes: string;
}

const statusOptions = [
  { value: 'idea', label: 'Idea 💡', color: 'bg-gray-100 text-gray-800' },
  { value: 'inprogress', label: 'In Progress 🔧', color: 'bg-orange-100 text-orange-800' },
  { value: 'ready', label: 'Ready to Post ✅', color: 'bg-green-100 text-green-800' },
  { value: 'scheduled', label: 'Scheduled 🗓', color: 'bg-blue-100 text-blue-800' },
  { value: 'posted', label: 'Posted 📬', color: 'bg-purple-100 text-purple-800' },
];

const typeOptions = [
  'Reel', 'Carousel', 'Blog', 'Email', 'Story', 'Other'
];

const platformOptions = [
  'Instagram', 'Website', 'Email', 'YouTube', 'Pinterest', 'Other'
];

export default function ContentStatusTracker() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [customPlatforms, setCustomPlatforms] = useState<string[]>([]);
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  const [addingCustom, setAddingCustom] = useState<{type: string, itemId: string} | null>(null);
  const [customValue, setCustomValue] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const savedItems = localStorage.getItem('content-status-tracker');
    const savedCustomTypes = localStorage.getItem('content-tracker-custom-types');
    const savedCustomPlatforms = localStorage.getItem('content-tracker-custom-platforms');
    const savedCustomStatuses = localStorage.getItem('content-tracker-custom-statuses');
    
    if (savedItems) {
      setContentItems(JSON.parse(savedItems));
    } else {
      // Initialize with one empty row
      const initialItem: ContentItem = {
        id: `item-${Date.now()}`,
        title: '',
        type: '',
        platform: '',
        status: 'idea',
        scheduledDate: '',
        notes: ''
      };
      setContentItems([initialItem]);
    }
    
    if (savedCustomTypes) {
      setCustomTypes(JSON.parse(savedCustomTypes));
    }
    if (savedCustomPlatforms) {
      setCustomPlatforms(JSON.parse(savedCustomPlatforms));
    }
    if (savedCustomStatuses) {
      setCustomStatuses(JSON.parse(savedCustomStatuses));
    }
  }, []);

  const saveToStorage = (items: ContentItem[]) => {
    localStorage.setItem('content-status-tracker', JSON.stringify(items));
    setContentItems(items);
  };

  const saveCustomOptions = (type: string, options: string[]) => {
    localStorage.setItem(`content-tracker-custom-${type}`, JSON.stringify(options));
  };

  const addCustomOption = (type: string, value: string) => {
    if (!value.trim()) return;
    
    let updatedOptions: string[] = [];
    if (type === 'types') {
      updatedOptions = [...customTypes, value.trim()];
      setCustomTypes(updatedOptions);
    } else if (type === 'platforms') {
      updatedOptions = [...customPlatforms, value.trim()];
      setCustomPlatforms(updatedOptions);
    } else if (type === 'statuses') {
      updatedOptions = [...customStatuses, value.trim()];
      setCustomStatuses(updatedOptions);
    }
    
    saveCustomOptions(type, updatedOptions);
    setAddingCustom(null);
    setCustomValue('');
    
    toast({
      title: "Custom option added",
      description: `"${value.trim()}" has been added to your ${type}.`,
    });
  };

  const handleCustomInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (addingCustom) {
        addCustomOption(addingCustom.type, customValue);
      }
    } else if (e.key === 'Escape') {
      setAddingCustom(null);
      setCustomValue('');
    }
  };

  const addNewRow = () => {
    const newItem: ContentItem = {
      id: `item-${Date.now()}`,
      title: '',
      type: '',
      platform: '',
      status: 'idea',
      scheduledDate: '',
      notes: ''
    };
    const updatedItems = [...contentItems, newItem];
    saveToStorage(updatedItems);
    
    toast({
      title: "New row added",
      description: "A new content item has been added to your tracker.",
    });
  };

  const updateItem = (id: string, field: keyof ContentItem, value: string) => {
    const updatedItems = contentItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    saveToStorage(updatedItems);
  };

  const deleteItem = (id: string) => {
    const updatedItems = contentItems.filter(item => item.id !== id);
    saveToStorage(updatedItems);
    
    toast({
      title: "Row deleted",
      description: "The content item has been removed from your tracker.",
    });
  };

  const clearAllRows = () => {
    const initialItem: ContentItem = {
      id: `item-${Date.now()}`,
      title: '',
      type: '',
      platform: '',
      status: 'idea',
      scheduledDate: '',
      notes: ''
    };
    saveToStorage([initialItem]);
    
    toast({
      title: "Tracker cleared",
      description: "All content items have been removed from your tracker.",
    });
  };

  const downloadTracker = () => {
    // Create CSV content
    const headers = ['Content Title', 'Type', 'Platform', 'Status', 'Scheduled Date', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...contentItems.map(item => [
        `"${item.title}"`,
        `"${item.type}"`,
        `"${item.platform}"`,
        `"${statusOptions.find(s => s.value === item.status)?.label || item.status}"`,
        `"${item.scheduledDate}"`,
        `"${item.notes}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `content-status-tracker-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download started",
      description: "Your content tracker has been exported to CSV.",
    });
  };

  const getStatusColor = (status: string) => {
    return statusOptions.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    return statusOptions.find(s => s.value === status)?.label || status;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/content" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-pink-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Track Your Content Progress</h1>
                <p className="text-gray-600">Use this tool to monitor where each piece of content sits in your workflow.</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                {contentItems.length} Items
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Active Tracker
              </Badge>
            </div>
            <Button 
              onClick={addNewRow}
              className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Row
            </Button>
          </div>
        </div>

        {/* Main Content Table */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Table Header */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6 p-4 bg-gradient-to-r from-pink-50 to-orange-50 rounded-lg border border-pink-100">
                  <div className="lg:col-span-3 font-semibold text-gray-700 text-sm uppercase tracking-wide">Content Title</div>
                  <div className="lg:col-span-2 font-semibold text-gray-700 text-sm uppercase tracking-wide">Type</div>
                  <div className="lg:col-span-2 font-semibold text-gray-700 text-sm uppercase tracking-wide">Platform</div>
                  <div className="lg:col-span-2 font-semibold text-gray-700 text-sm uppercase tracking-wide">Status</div>
                  <div className="lg:col-span-2 font-semibold text-gray-700 text-sm uppercase tracking-wide">Scheduled Date</div>
                  <div className="lg:col-span-1 font-semibold text-gray-700 text-sm uppercase tracking-wide">Actions</div>
                </div>

                {/* Table Rows */}
                <div className="space-y-4">
                  {contentItems.map((item, index) => (
                    <div key={item.id} className={`grid grid-cols-1 lg:grid-cols-12 gap-4 p-6 border-2 rounded-xl transition-all duration-200 hover:shadow-lg ${index % 2 === 0 ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'}`}>
                      {/* Content Title */}
                      <div className="lg:col-span-3 space-y-2">
                        <label className="block text-sm font-medium text-gray-600 lg:hidden">Content Title</label>
                        <Input
                          value={item.title}
                          onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                          placeholder="e.g., Summer Sale Carousel"
                          className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-base"
                        />
                      </div>

                      {/* Type */}
                      <div className="lg:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-gray-600 lg:hidden">Type</label>
                        {addingCustom?.type === 'types' && addingCustom?.itemId === item.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={customValue}
                              onChange={(e) => setCustomValue(e.target.value)}
                              onKeyDown={handleCustomInput}
                              placeholder="Enter custom type..."
                              className="flex-1 border-pink-300 focus:border-pink-400 focus:ring-pink-200 h-12"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => addCustomOption('types', customValue)}
                              className="bg-green-600 hover:bg-green-700 h-12 px-3"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {setAddingCustom(null); setCustomValue('');}}
                              className="h-12 px-3"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={item.type}
                            onValueChange={(value) => {
                              if (value === 'add_custom') {
                                setAddingCustom({type: 'types', itemId: item.id});
                                setCustomValue('');
                              } else {
                                updateItem(item.id, 'type', value);
                              }
                            }}
                          >
                            <SelectTrigger className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-base">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {typeOptions.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                              {customTypes.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100">Custom Types</div>
                                  {customTypes.map((type) => (
                                    <SelectItem key={type} value={type} className="font-italic">
                                      {type}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              <SelectItem value="add_custom" className="text-pink-600 font-medium">
                                + Add Custom Type
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Platform */}
                      <div className="lg:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-gray-600 lg:hidden">Platform</label>
                        {addingCustom?.type === 'platforms' && addingCustom?.itemId === item.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={customValue}
                              onChange={(e) => setCustomValue(e.target.value)}
                              onKeyDown={handleCustomInput}
                              placeholder="Enter custom platform..."
                              className="flex-1 border-pink-300 focus:border-pink-400 focus:ring-pink-200 h-12"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => addCustomOption('platforms', customValue)}
                              className="bg-green-600 hover:bg-green-700 h-12 px-3"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {setAddingCustom(null); setCustomValue('');}}
                              className="h-12 px-3"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={item.platform}
                            onValueChange={(value) => {
                              if (value === 'add_custom') {
                                setAddingCustom({type: 'platforms', itemId: item.id});
                                setCustomValue('');
                              } else {
                                updateItem(item.id, 'platform', value);
                              }
                            }}
                          >
                            <SelectTrigger className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-base">
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                              {platformOptions.map((platform) => (
                                <SelectItem key={platform} value={platform}>
                                  {platform}
                                </SelectItem>
                              ))}
                              {customPlatforms.length > 0 && (
                                <>
                                  <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100">Custom Platforms</div>
                                  {customPlatforms.map((platform) => (
                                    <SelectItem key={platform} value={platform} className="font-italic">
                                      {platform}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              <SelectItem value="add_custom" className="text-pink-600 font-medium">
                                + Add Custom Platform
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Status */}
                      <div className="lg:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-gray-600 lg:hidden">Status</label>
                        <Select
                          value={item.status}
                          onValueChange={(value) => updateItem(item.id, 'status', value)}
                        >
                          <SelectTrigger className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Badge className={`${getStatusColor(item.status)} text-xs px-3 py-1`}>
                          {getStatusLabel(item.status)}
                        </Badge>
                      </div>

                      {/* Scheduled Date */}
                      <div className="lg:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-gray-600 lg:hidden">Scheduled Date</label>
                        <Input
                          type="date"
                          value={item.scheduledDate}
                          onChange={(e) => updateItem(item.id, 'scheduledDate', e.target.value)}
                          className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-base"
                        />
                      </div>

                      {/* Notes - Full width on mobile, spans remaining columns on desktop */}
                      <div className="lg:col-span-12 lg:col-start-1 lg:row-start-2 space-y-2 lg:mt-4">
                        <label className="block text-sm font-medium text-gray-600">Notes</label>
                        <Input
                          value={item.notes}
                          onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                          placeholder="Add notes about this content..."
                          className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-base"
                        />
                      </div>

                      {/* Actions */}
                      <div className="lg:col-span-1 flex items-center justify-center lg:justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteItem(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-12 px-4"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Controls */}
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <Button
              onClick={downloadTracker}
              variant="outline"
              className="border-pink-200 text-pink-600 hover:bg-pink-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Tracker
            </Button>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Clear All Rows
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to clear your tracker?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all content items from your tracker. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={clearAllRows}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Clear All Rows
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}