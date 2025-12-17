import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import type { MediaItem } from './calendar-types';

// Format file size helper
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface MediaLightboxProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MediaLightbox({ 
  item, 
  isOpen, 
  onClose 
}: MediaLightboxProps) {
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black/95 border-0">
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Media content */}
          <div className="max-w-full max-h-full flex flex-col items-center">
            {item.mediaType === 'image' ? (
              <img
                src={item.objectPath}
                alt={item.fileName}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            ) : (
              <video
                src={item.objectPath}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            )}

            {/* Media info */}
            <div className="mt-4 text-center">
              <p className="text-white font-medium">{item.fileName}</p>
              <p className="text-white/70 text-sm">
                {formatFileSize(item.fileSize)} • {item.mediaType === 'image' ? 'Image' : 'Video'}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
