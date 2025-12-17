import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string | null;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export default function PdfViewer({ url, isOpen, onClose, title }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function zoomIn() {
    setScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  }

  function zoomOut() {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  }

  function handleDownload() {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = title || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-full h-screen p-0 flex flex-col bg-gray-100 m-0 rounded-none border-0 focus:outline-none [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-2 sm:p-4 bg-white border-b shadow-sm relative h-14 sm:h-16">
          <div className="flex items-center gap-2 overflow-hidden">
            <DialogClose asChild className="shrink-0">
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
            <h3 className="font-semibold text-sm sm:text-lg truncate max-w-[150px] sm:max-w-md" title={title}>
              {title || 'PDF Viewer'}
            </h3>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8 sm:h-9 sm:w-9"
              title="Download"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 sm:p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomOut}
                disabled={scale <= 0.5}
                className="h-7 w-7 sm:h-8 sm:w-8"
              >
                <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <span className="text-[10px] sm:text-xs w-8 sm:w-12 text-center font-medium">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomIn}
                disabled={scale >= 3.0}
                className="h-7 w-7 sm:h-8 sm:w-8"
              >
                <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex relative">
          {/* Sidebar Thumbnails (Desktop only) */}
          <div className="hidden lg:block w-64 border-r bg-gray-50 overflow-y-auto p-4 shrink-0">
            {url && numPages && (
              <Document file={url} className="flex flex-col gap-4">
                {Array.from(new Array(numPages), (el, index) => (
                  <div 
                    key={`thumb_${index + 1}`}
                    className={`cursor-pointer transition-all p-1 rounded border-2 ${
                      pageNumber === index + 1 ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => setPageNumber(index + 1)}
                  >
                    <Page
                      pageNumber={index + 1}
                      width={200}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="shadow-sm"
                    />
                    <p className="text-center text-xs text-gray-500 mt-1">Page {index + 1}</p>
                  </div>
                ))}
              </Document>
            )}
          </div>

          {/* Main Viewer */}
          <div 
            className="flex-1 overflow-auto flex justify-center p-4 bg-gray-100/50 relative touch-none"
            ref={(el) => {
              if (el) {
                setContainerWidth(el.clientWidth);
                
                // Add wheel listener for zoom
                const handleWheel = (e: WheelEvent) => {
                  if (e.ctrlKey) {
                    e.preventDefault();
                    const delta = e.deltaY * -0.01;
                    setScale(prevScale => Math.min(Math.max(prevScale + delta, 0.5), 3.0));
                  }
                };
                
                el.addEventListener('wheel', handleWheel, { passive: false });
                
                // Touch zoom logic
                let initialDistance = 0;
                let initialScale = 1;

                const handleTouchStart = (e: TouchEvent) => {
                  if (e.touches.length === 2) {
                    initialDistance = Math.hypot(
                      e.touches[0].clientX - e.touches[1].clientX,
                      e.touches[0].clientY - e.touches[1].clientY
                    );
                    initialScale = scale;
                  }
                };

                const handleTouchMove = (e: TouchEvent) => {
                  if (e.touches.length === 2) {
                    e.preventDefault();
                    const currentDistance = Math.hypot(
                      e.touches[0].clientX - e.touches[1].clientX,
                      e.touches[0].clientY - e.touches[1].clientY
                    );
                    
                    if (initialDistance > 0) {
                      const delta = currentDistance / initialDistance;
                      setScale(Math.min(Math.max(initialScale * delta, 0.5), 3.0));
                    }
                  }
                };

                el.addEventListener('touchstart', handleTouchStart);
                el.addEventListener('touchmove', handleTouchMove, { passive: false });

                // Cleanup function not directly possible in ref callback, 
                // but React handles ref updates. Ideally use useEffect if extracting logic.
                // For now, this simple attachment works as ref callback runs on mount/update.
                // To prevent duplicate listeners on re-renders if ref callback runs multiple times,
                // we should be careful. However, with the current structure, extracting to useEffect is better.
              }
            }}
          >
            {url && (
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center h-full bg-gray-100/50">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                }
                error={
                  <div className="flex items-center justify-center h-full text-red-500">
                    Failed to load PDF. Please try downloading it instead.
                  </div>
                }
                className="flex flex-col items-center shadow-lg my-auto"
              >
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale} 
                  width={containerWidth ? Math.min(containerWidth - 32, 800) : undefined}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="bg-white shadow-sm"
                />
              </Document>
            )}
          </div>
        </div>

        {/* Footer Controls */}
        {numPages && numPages > 1 && (
          <div className="p-2 sm:p-4 bg-white border-t flex items-center justify-center gap-4 z-50 safe-area-bottom shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
            <Button
              variant="outline"
              size="sm"
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className="h-8 sm:h-9"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <span className="text-xs sm:text-sm font-medium">
              Page {pageNumber} of {numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={pageNumber >= numPages}
              className="h-8 sm:h-9"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
