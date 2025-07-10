import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Download, 
  FileText, 
  Check, 
  X, 
  FolderOpen,
  Folder,
  Recycle
} from 'lucide-react';
import { useLocation } from 'wouter';

interface RepurposingItem {
  id: string;
  originalContent: string;
  originalPlatform: string;
  newFormatIdeas: string;
  visualAssets: string;
  captions: string;
  publishDate: string;
  status: string;
}

interface AddingCustom {
  type: 'platforms' | 'formats' | 'status';
  itemId: string;
}

const platformOptions = ['Instagram', 'TikTok', 'YouTube', 'Blog', 'Email', 'Pinterest', 'LinkedIn', 'Twitter'];
const formatOptions = ['Reel', 'Carousel', 'Story', 'Blog Post', 'Email', 'Infographic', 'Video', 'Podcast'];
const statusOptions = [
  { value: 'idea', label: 'Idea 💡' },
  { value: 'progress', label: 'In Progress ⏳' },
  { value: 'ready', label: 'Ready ✅' },
  { value: 'posted', label: 'Posted 📬' }
];



export default function RepurposingToolkit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [repurposingItems, setRepurposingItems] = useState<RepurposingItem[]>([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [addingCustom, setAddingCustom] = useState<AddingCustom | null>(null);
  const [customValue, setCustomValue] = useState('');
  const [customPlatforms, setCustomPlatforms] = useState<string[]>([]);
  const [customFormats, setCustomFormats] = useState<string[]>([]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedItems = localStorage.getItem('repurposingItems');
    if (savedItems) {
      setRepurposingItems(JSON.parse(savedItems));
    } else {
      // Create 3 initial empty rows
      const initialItems: RepurposingItem[] = Array.from({ length: 3 }, (_, i) => ({
        id: `item-${Date.now()}-${i}`,
        originalContent: '',
        originalPlatform: '',
        newFormatIdeas: '',
        visualAssets: '',
        captions: '',
        publishDate: '',
        status: 'idea'
      }));
      setRepurposingItems(initialItems);
    }



    const savedCustomPlatforms = localStorage.getItem('customPlatforms');
    if (savedCustomPlatforms) {
      setCustomPlatforms(JSON.parse(savedCustomPlatforms));
    }

    const savedCustomFormats = localStorage.getItem('customFormats');
    if (savedCustomFormats) {
      setCustomFormats(JSON.parse(savedCustomFormats));
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('repurposingItems', JSON.stringify(repurposingItems));
  }, [repurposingItems]);



  useEffect(() => {
    localStorage.setItem('customPlatforms', JSON.stringify(customPlatforms));
  }, [customPlatforms]);

  useEffect(() => {
    localStorage.setItem('customFormats', JSON.stringify(customFormats));
  }, [customFormats]);

  const updateItem = (id: string, field: keyof RepurposingItem, value: string) => {
    setRepurposingItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addNewRow = () => {
    const newItem: RepurposingItem = {
      id: `item-${Date.now()}`,
      originalContent: '',
      originalPlatform: '',
      newFormatIdeas: '',
      visualAssets: '',
      captions: '',
      publishDate: '',
      status: 'idea'
    };
    setRepurposingItems(prev => [...prev, newItem]);
    toast({
      title: "New row added",
      description: "Ready to plan your next repurposing project!",
    });
  };

  const deleteItem = (id: string) => {
    setRepurposingItems(prev => prev.filter(item => item.id !== id));
    toast({
      title: "Row deleted",
      description: "Item removed from your repurposing planner.",
    });
  };

  const clearAllRows = () => {
    const initialItems: RepurposingItem[] = Array.from({ length: 3 }, (_, i) => ({
      id: `item-${Date.now()}-${i}`,
      originalContent: '',
      originalPlatform: '',
      newFormatIdeas: '',
      visualAssets: '',
      captions: '',
      publishDate: '',
      status: 'idea'
    }));
    setRepurposingItems(initialItems);
    setShowClearModal(false);
    toast({
      title: "Table cleared",
      description: "Your repurposing planner has been reset.",
    });
  };

  const addCustomFolder = () => {
    if (newFolderName.trim()) {
      setCustomFolders(prev => [...prev, newFolderName.trim()]);
      setNewFolderName('');
      toast({
        title: "Custom folder added",
        description: `"${newFolderName}" added to your folder system.`,
      });
    }
  };

  const addCustomOption = (type: 'platforms' | 'formats', value: string) => {
    if (!value.trim()) return;
    
    if (type === 'platforms') {
      setCustomPlatforms(prev => [...prev, value.trim()]);
    } else if (type === 'formats') {
      setCustomFormats(prev => [...prev, value.trim()]);
    }
    
    setAddingCustom(null);
    setCustomValue('');
    toast({
      title: "Custom option added",
      description: `"${value}" added to your ${type}.`,
    });
  };

  const handleCustomInput = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (addingCustom) {
        addCustomOption(addingCustom.type, customValue);
      }
    } else if (e.key === 'Escape') {
      setAddingCustom(null);
      setCustomValue('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idea': return 'bg-gray-100 text-gray-800';
      case 'progress': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'posted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : 'Idea 💡';
  };

  const exportToCSV = () => {
    const headers = ['Original Content', 'Platform It Was Posted', 'New Format Ideas', 'Visual Assets Needed', 'Captions or Copy', 'Publish Date', 'Status'];
    const csvContent = [
      headers.join(','),
      ...repurposingItems.map(item => [
        `"${item.originalContent}"`,
        `"${item.originalPlatform}"`,
        `"${item.newFormatIdeas}"`,
        `"${item.visualAssets}"`,
        `"${item.captions}"`,
        `"${item.publishDate}"`,
        `"${getStatusLabel(item.status)}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'repurposing-planner.csv';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "CSV exported",
      description: "Your repurposing planner has been downloaded.",
    });
  };

  return (
    <div className="min-h-screen bg-rose-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/content-planning')}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Content Planning
          </Button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-xl flex items-center justify-center">
              <Recycle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">Repurposing Toolkit</h1>
              <p className="text-gray-600">Make your past content work harder for you</p>
            </div>
          </div>
        </div>

        {/* Repurposing Planner Table */}
        <Card className="mb-8 border-pink-100 shadow-sm">
          <CardContent className="p-6">
            <div className="bg-gradient-to-r from-pink-50 to-orange-50 p-6 rounded-lg border border-pink-100 mb-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                  {/* Table Header */}
                  <thead>
                    <tr className="border-b border-pink-200">
                      <th className="text-left p-3 font-semibold text-gray-700 text-sm uppercase tracking-wide">Original Content</th>
                      <th className="text-left p-3 font-semibold text-gray-700 text-sm uppercase tracking-wide">Platform It Was Posted</th>
                      <th className="text-left p-3 font-semibold text-gray-700 text-sm uppercase tracking-wide">New Format Ideas</th>
                      <th className="text-left p-3 font-semibold text-gray-700 text-sm uppercase tracking-wide">Visual Assets Needed</th>
                      <th className="text-left p-3 font-semibold text-gray-700 text-sm uppercase tracking-wide">Captions or Copy</th>
                      <th className="text-left p-3 font-semibold text-gray-700 text-sm uppercase tracking-wide">Publish Date</th>
                      <th className="text-left p-3 font-semibold text-gray-700 text-sm uppercase tracking-wide">Status</th>
                      <th className="text-center p-3 font-semibold text-gray-700 text-sm uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  
                  {/* Table Body */}
                  <tbody>
                    {repurposingItems.map((item, index) => (
                      <tr key={item.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        {/* Original Content */}
                        <td className="p-3">
                          <Input
                            value={item.originalContent}
                            onChange={(e) => updateItem(item.id, 'originalContent', e.target.value)}
                            placeholder="e.g., Instagram post about morning routine"
                            className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-sm"
                          />
                        </td>

                        {/* Platform It Was Posted */}
                        <td className="p-3">
                          {addingCustom?.type === 'platforms' && addingCustom?.itemId === item.id ? (
                            <div className="flex gap-1">
                              <Input
                                value={customValue}
                                onChange={(e) => setCustomValue(e.target.value)}
                                onKeyDown={handleCustomInput}
                                placeholder="Custom platform..."
                                className="flex-1 border-pink-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-sm"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => addCustomOption('platforms', customValue)}
                                className="bg-green-600 hover:bg-green-700 h-12 px-2"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {setAddingCustom(null); setCustomValue('');}}
                                className="h-12 px-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Select
                              value={item.originalPlatform}
                              onValueChange={(value) => {
                                if (value === 'add_custom') {
                                  setAddingCustom({type: 'platforms', itemId: item.id});
                                  setCustomValue('');
                                } else {
                                  updateItem(item.id, 'originalPlatform', value);
                                }
                              }}
                            >
                              <SelectTrigger className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-sm">
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
                                  + Add Custom
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </td>

                        {/* New Format Ideas */}
                        <td className="p-3">
                          {addingCustom?.type === 'formats' && addingCustom?.itemId === item.id ? (
                            <div className="flex gap-1">
                              <Input
                                value={customValue}
                                onChange={(e) => setCustomValue(e.target.value)}
                                onKeyDown={handleCustomInput}
                                placeholder="Custom format..."
                                className="flex-1 border-pink-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-sm"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => addCustomOption('formats', customValue)}
                                className="bg-green-600 hover:bg-green-700 h-12 px-2"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {setAddingCustom(null); setCustomValue('');}}
                                className="h-12 px-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Select
                              value={item.newFormatIdeas}
                              onValueChange={(value) => {
                                if (value === 'add_custom') {
                                  setAddingCustom({type: 'formats', itemId: item.id});
                                  setCustomValue('');
                                } else {
                                  updateItem(item.id, 'newFormatIdeas', value);
                                }
                              }}
                            >
                              <SelectTrigger className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-sm">
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                              <SelectContent>
                                {formatOptions.map((format) => (
                                  <SelectItem key={format} value={format}>
                                    {format}
                                  </SelectItem>
                                ))}
                                {customFormats.length > 0 && (
                                  <>
                                    <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100">Custom Formats</div>
                                    {customFormats.map((format) => (
                                      <SelectItem key={format} value={format} className="font-italic">
                                        {format}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                                <SelectItem value="add_custom" className="text-pink-600 font-medium">
                                  + Add Custom
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </td>

                        {/* Visual Assets Needed */}
                        <td className="p-3">
                          <Input
                            value={item.visualAssets}
                            onChange={(e) => updateItem(item.id, 'visualAssets', e.target.value)}
                            placeholder="e.g., New graphics, B-roll footage"
                            className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-sm"
                          />
                        </td>

                        {/* Captions or Copy */}
                        <td className="p-3">
                          <Input
                            value={item.captions}
                            onChange={(e) => updateItem(item.id, 'captions', e.target.value)}
                            placeholder="e.g., Hook, CTA, key points"
                            className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-sm"
                          />
                        </td>

                        {/* Publish Date */}
                        <td className="p-3">
                          <Input
                            type="date"
                            value={item.publishDate}
                            onChange={(e) => updateItem(item.id, 'publishDate', e.target.value)}
                            className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-sm"
                          />
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          <Select
                            value={item.status}
                            onValueChange={(value) => updateItem(item.id, 'status', value)}
                          >
                            <SelectTrigger className="w-full border-gray-300 focus:border-pink-400 focus:ring-pink-200 h-12 text-sm">
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
                          <div className="mt-1">
                            <Badge className={`${getStatusColor(item.status)} text-xs px-2 py-1 w-fit`}>
                              {getStatusLabel(item.status)}
                            </Badge>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteItem(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-12 px-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table Footer with Controls */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button onClick={addNewRow} className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Add More
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowClearModal(true)}
                  className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                >
                  Clear Table
                </Button>
              </div>
              
              <Button onClick={exportToCSV} variant="outline" className="border-pink-300 text-pink-600 hover:bg-pink-50">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content Library Folder System */}
        <Card className="border-pink-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Content Library Folder System
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-6">
              Get a pre-made folder structure to organize your content assets. Perfect for keeping your B-roll, templates, and graphics sorted and ready to use.
            </p>
            <Button 
              className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white px-8 py-3"
              onClick={() => {
                toast({
                  title: "Download ready",
                  description: "Your folder system template is being prepared for download.",
                });
              }}
            >
              <Download className="h-5 w-5 mr-2" />
              Download Folder System (.zip)
            </Button>
          </CardContent>
        </Card>

        {/* Clear Modal */}
        {showClearModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Clear All Rows?</h3>
              <p className="text-gray-600 mb-6">
                This will remove all content from your repurposing planner and reset it to 3 empty rows. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowClearModal(false)}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={clearAllRows}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  Clear Table
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}