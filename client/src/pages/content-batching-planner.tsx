import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { ChevronLeft, Plus, Trash2, RotateCcw, Download, Edit3, X } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface BatchingRow {
  id: string;
  postTitle: string;
  pillar: string;
  type: string;
  cta: string;
  caption: string;
  visual: string;
  status: string;
}

const defaultPillars = [
  "Educational/Tips",
  "Behind the Scenes",
  "Personal/Lifestyle",
  "Product/Service",
  "Community/Engagement",
  "Inspirational/Motivational",
  "Entertainment/Fun"
];

const defaultPostTypes = [
  "Reel",
  "Carousel",
  "Single Photo",
  "Story",
  "Live",
  "IGTV",
  "Promotion"
];

export default function ContentBatchingPlanner() {
  const { toast } = useToast();
  
  const [batchingData, setBatchingData] = useState<BatchingRow[]>([
    { id: '1', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
    { id: '2', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
    { id: '3', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
    { id: '4', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
    { id: '5', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
  ]);

  // Custom dropdown options state
  const [customPillars, setCustomPillars] = useState<string[]>([]);
  const [customPostTypes, setCustomPostTypes] = useState<string[]>([]);
  const [showCustomPillarInput, setShowCustomPillarInput] = useState<string | null>(null);
  const [showCustomTypeInput, setShowCustomTypeInput] = useState<string | null>(null);
  const [customPillarValue, setCustomPillarValue] = useState('');
  const [customTypeValue, setCustomTypeValue] = useState('');
  const [showClearTableModal, setShowClearTableModal] = useState(false);

  // Load custom options from localStorage on component mount
  useEffect(() => {
    const savedPillars = localStorage.getItem('content-batching-custom-pillars');
    const savedTypes = localStorage.getItem('content-batching-custom-post-types');
    
    if (savedPillars) {
      setCustomPillars(JSON.parse(savedPillars));
    }
    
    if (savedTypes) {
      setCustomPostTypes(JSON.parse(savedTypes));
    }
  }, []);

  // Save custom options to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('content-batching-custom-pillars', JSON.stringify(customPillars));
  }, [customPillars]);

  useEffect(() => {
    localStorage.setItem('content-batching-custom-post-types', JSON.stringify(customPostTypes));
  }, [customPostTypes]);

  const updateBatchingData = (id: string, field: keyof BatchingRow, value: string) => {
    setBatchingData(prev => 
      prev.map(row => 
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const addBatchingRow = () => {
    const newRow: BatchingRow = {
      id: Date.now().toString(),
      postTitle: '',
      pillar: '',
      type: '',
      caption: '',
      cta: '',
      visual: '',
      status: ''
    };
    setBatchingData([...batchingData, newRow]);
  };

  const deleteBatchingRow = (id: string) => {
    setBatchingData(prev => prev.filter(row => row.id !== id));
  };

  const clearAllBatchingData = () => {
    setBatchingData([
      { id: '1', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
      { id: '2', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
      { id: '3', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
      { id: '4', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
      { id: '5', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
    ]);
    setShowClearTableModal(false);
    toast({
      title: "Table cleared",
      description: "All content has been removed from your batching table",
      duration: 3000,
    });
  };

  const addCustomPillar = () => {
    if (customPillarValue.trim() && !customPillars.includes(customPillarValue.trim())) {
      setCustomPillars(prev => [...prev, customPillarValue.trim()]);
      updateBatchingData(showCustomPillarInput!, 'pillar', customPillarValue.trim());
      setShowCustomPillarInput(null);
      setCustomPillarValue('');
      toast({
        title: "Custom pillar added",
        description: `"${customPillarValue.trim()}" has been added to your pillars`,
        duration: 2000,
      });
    }
  };

  const addCustomPostType = () => {
    if (customTypeValue.trim() && !customPostTypes.includes(customTypeValue.trim())) {
      setCustomPostTypes(prev => [...prev, customTypeValue.trim()]);
      updateBatchingData(showCustomTypeInput!, 'type', customTypeValue.trim());
      setShowCustomTypeInput(null);
      setCustomTypeValue('');
      toast({
        title: "Custom post type added",
        description: `"${customTypeValue.trim()}" has been added to your post types`,
        duration: 2000,
      });
    }
  };

  const handleCustomPillarKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addCustomPillar();
    } else if (e.key === 'Escape') {
      setShowCustomPillarInput(null);
      setCustomPillarValue('');
    }
  };

  const handleCustomTypeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addCustomPostType();
    } else if (e.key === 'Escape') {
      setShowCustomTypeInput(null);
      setCustomTypeValue('');
    }
  };

  const exportToPDF = async () => {
    try {
      const element = document.getElementById('batching-table');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 297;
      const pageHeight = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('content-batching-planner.pdf');
      
      toast({
        title: "PDF exported successfully",
        description: "Your content batching planner has been downloaded",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your planner to PDF",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/content-planning">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Content Planning
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Content Batching Planner</h1>
              <p className="text-gray-600 mt-1">Map out your content ideas before they hit the calendar</p>
            </div>
          </div>
          <Button
            onClick={exportToPDF}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        {/* Content Batching Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Content Batching Space
            </CardTitle>
            <CardDescription>
              Use this space to brainstorm and organise your posts by pillar, type, CTA, and notes—so planning feels structured, not scattered.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-pink-50 rounded-lg p-4 border border-pink-100" id="batching-table">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-pink-100 border-b border-pink-200">
                    <th className="text-left p-3 font-semibold text-gray-700 border-r border-pink-200">Post Title</th>
                    <th className="text-left p-3 font-semibold text-gray-700 border-r border-pink-200">Content Pillar</th>
                    <th className="text-left p-3 font-semibold text-gray-700 border-r border-pink-200">Post Type</th>
                    <th className="text-left p-3 font-semibold text-gray-700 border-r border-pink-200">CTA</th>
                    <th className="text-left p-3 font-semibold text-gray-700 border-r border-pink-200">Notes</th>
                    <th className="text-center p-3 font-semibold text-gray-700 w-12">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {batchingData.map((row) => (
                    <tr key={row.id} className="border-b border-pink-100 hover:bg-pink-25">
                      <td className="p-3 border-r border-gray-100">
                        <Input
                          value={row.postTitle}
                          onChange={(e) => updateBatchingData(row.id, 'postTitle', e.target.value)}
                          placeholder="Post title..."
                          className="border-none bg-transparent p-0 focus:ring-0 text-sm"
                        />
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        {showCustomPillarInput === row.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={customPillarValue}
                              onChange={(e) => setCustomPillarValue(e.target.value)}
                              onKeyDown={handleCustomPillarKeyPress}
                              placeholder="Enter custom pillar..."
                              className="h-6 text-xs flex-1"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={addCustomPillar}
                              className="h-5 w-5 p-0 bg-green-500 hover:bg-green-600 text-white"
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setShowCustomPillarInput(null);
                                setCustomPillarValue('');
                              }}
                              className="h-5 w-5 p-0 bg-gray-400 hover:bg-gray-500 text-white"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <select
                            value={row.pillar}
                            onChange={(e) => {
                              if (e.target.value === '+ Add Custom Pillar') {
                                setShowCustomPillarInput(row.id);
                                setCustomPillarValue('');
                              } else {
                                updateBatchingData(row.id, 'pillar', e.target.value);
                              }
                            }}
                            className="w-full border-none bg-transparent p-0 focus:ring-0 text-sm"
                          >
                            <option value="">Select pillar...</option>
                            {defaultPillars.map((pillar) => (
                              <option key={pillar} value={pillar}>{pillar}</option>
                            ))}
                            {customPillars.length > 0 && (
                              <optgroup label="Custom Pillars">
                                {customPillars.map((pillar) => (
                                  <option key={pillar} value={pillar} className="font-medium">
                                    {pillar}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <option value="+ Add Custom Pillar" className="text-blue-600 font-medium">
                              + Add Custom Pillar
                            </option>
                          </select>
                        )}
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        {showCustomTypeInput === row.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={customTypeValue}
                              onChange={(e) => setCustomTypeValue(e.target.value)}
                              onKeyDown={handleCustomTypeKeyPress}
                              placeholder="Enter custom type..."
                              className="h-6 text-xs flex-1"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={addCustomPostType}
                              className="h-5 w-5 p-0 bg-green-500 hover:bg-green-600 text-white"
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setShowCustomTypeInput(null);
                                setCustomTypeValue('');
                              }}
                              className="h-5 w-5 p-0 bg-gray-400 hover:bg-gray-500 text-white"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <select
                            value={row.type}
                            onChange={(e) => {
                              if (e.target.value === '+ Add Custom Type') {
                                setShowCustomTypeInput(row.id);
                                setCustomTypeValue('');
                              } else {
                                updateBatchingData(row.id, 'type', e.target.value);
                              }
                            }}
                            className="w-full border-none bg-transparent p-0 focus:ring-0 text-sm"
                          >
                            <option value="">Select type...</option>
                            {defaultPostTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                            {customPostTypes.length > 0 && (
                              <optgroup label="Custom Types">
                                {customPostTypes.map((type) => (
                                  <option key={type} value={type} className="font-medium">
                                    {type}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <option value="+ Add Custom Type" className="text-blue-600 font-medium">
                              + Add Custom Type
                            </option>
                          </select>
                        )}
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        <Input
                          value={row.cta}
                          onChange={(e) => updateBatchingData(row.id, 'cta', e.target.value)}
                          placeholder="Call to action..."
                          className="border-none bg-transparent p-0 focus:ring-0 text-sm"
                        />
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        <Textarea
                          value={row.caption}
                          onChange={(e) => updateBatchingData(row.id, 'caption', e.target.value)}
                          placeholder="Notes..."
                          className="border-none bg-transparent p-0 focus:ring-0 resize-none text-sm"
                          rows={1}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteBatchingRow(row.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <Button
                  onClick={addBatchingRow}
                  variant="outline"
                  size="sm"
                  className="text-pink-600 border-pink-200 hover:bg-pink-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add More
                </Button>
                <Dialog open={showClearTableModal} onOpenChange={setShowClearTableModal}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-pink-600 border-pink-200 hover:bg-pink-50"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Clear Table
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Clear All Posts?</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to clear all content from your batching table? This action can't be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowClearTableModal(false)}
                        className="mt-2 sm:mt-0"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={clearAllBatchingData}
                        className="bg-pink-500 hover:bg-pink-600 text-white"
                      >
                        Clear Table
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}