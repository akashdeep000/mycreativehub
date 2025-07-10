import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { BookOpen, Download, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface WorksheetData {
  contentThatFeltGood: string;
  contentThatPerformed: string;
  whatDidntLand: string;
  audienceReactions: string;
  strategyShifts: string;
  nextCheckIn: string;
}

const initialData: WorksheetData = {
  contentThatFeltGood: '',
  contentThatPerformed: '',
  whatDidntLand: '',
  audienceReactions: '',
  strategyShifts: '',
  nextCheckIn: '',
};

export default function ContentPerformanceStrategy() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [worksheetData, setWorksheetData] = useState<WorksheetData>(initialData);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('contentPerformanceStrategy');
    if (savedData) {
      setWorksheetData(JSON.parse(savedData));
    }
  }, []);

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('contentPerformanceStrategy', JSON.stringify(worksheetData));
  }, [worksheetData]);

  const handleInputChange = (field: keyof WorksheetData, value: string) => {
    setWorksheetData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClearAll = () => {
    setWorksheetData(initialData);
    setShowClearModal(false);
    toast({
      title: "Worksheet cleared",
      description: "All fields have been reset.",
    });
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('worksheet-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('content-performance-strategy-worksheet.pdf');

      toast({
        title: "PDF exported successfully",
        description: "Your worksheet has been saved as a PDF.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your worksheet.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const worksheetFields = [
    {
      key: 'contentThatFeltGood' as keyof WorksheetData,
      title: 'Content That Felt Good',
      description: 'What content types felt aligned or easy to create?',
      placeholder: 'e.g., Behind-the-scenes stories, carousel tips, messy Monday reel'
    },
    {
      key: 'contentThatPerformed' as keyof WorksheetData,
      title: 'Content That Performed Well',
      description: 'What content got high engagement or responses?',
      placeholder: 'e.g., Story replies on personal post, save-heavy tip carousel'
    },
    {
      key: 'whatDidntLand' as keyof WorksheetData,
      title: 'What Didn\'t Land?',
      description: 'What fell flat or didn\'t feel right to create?',
      placeholder: 'e.g., Email promo felt pushy, static post got no interaction'
    },
    {
      key: 'audienceReactions' as keyof WorksheetData,
      title: 'Audience Reactions',
      description: 'What messages, DMs, or comments gave you clues?',
      placeholder: 'e.g., Lots of replies saying \'this is so me!\' on reel'
    },
    {
      key: 'strategyShifts' as keyof WorksheetData,
      title: 'Strategy Shifts to Try',
      description: 'What small changes will you make going forward?',
      placeholder: 'e.g., Add more personality to carousels, batch real-life clips weekly'
    },
    {
      key: 'nextCheckIn' as keyof WorksheetData,
      title: 'Next Check-In Date',
      description: 'When will you revisit this worksheet?',
      placeholder: 'e.g., 1st of each month'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
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
                <BookOpen className="w-6 h-6 text-pink-600" />
                Reflect & Refine: Strategy Worksheet
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Look back before you move forward—use this space to reflect on what's working and set fresh, intentional content goals.
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Worksheet Content */}
        <Card className="bg-white shadow-lg">
          <CardContent className="p-8" id="worksheet-content">
            <div className="space-y-8">
              {worksheetFields.map((field, index) => (
                <div key={field.key} className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-gray-800">{field.title}</h3>
                    <p className="text-sm text-gray-600">{field.description}</p>
                  </div>
                  <Textarea
                    placeholder={field.placeholder}
                    value={worksheetData[field.key]}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className="min-h-[100px] text-sm leading-relaxed border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                    rows={4}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Download as PDF'}
          </Button>

          <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-pink-300 text-pink-600 hover:bg-pink-50 px-6 py-2 rounded-lg flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Clear All Fields
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Clear All Fields?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to clear your reflection worksheet? This action cannot be undone.
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
                  Clear Worksheet
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}