import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { X, Upload, Loader2, ImagePlus, Maximize2, FileImage, FileVideo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface MediaGalleryProps {
  eventId: string;
  onUploadComplete?: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

interface MediaItem {
  id: number;
  eventId: string;
  mediaType: 'image' | 'video';
  fileName: string;
  fileSize: number;
  objectPath: string;
  displayOrder: number;
  createdAt: string;
}

// Format file size helper
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// Loading skeleton component
function MediaSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="aspect-square rounded-lg bg-gray-200 animate-pulse" />
      ))}
    </div>
  );
}

// Media item component with loading state
function MediaItemCard({ 
  item, 
  onDelete, 
  onClick, 
  isDeleting 
}: { 
  item: MediaItem; 
  onDelete: () => void; 
  onClick: () => void;
  isDeleting: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative group aspect-square">
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center p-2">
          <div className="animate-pulse text-center">
            {item.mediaType === 'image' ? (
              <FileImage className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            ) : (
              <FileVideo className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            )}
            <p className="text-xs text-gray-600 font-medium truncate w-full mb-1">
              {item.fileName}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(item.fileSize)}
            </p>
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin mx-auto mt-2" />
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-red-50 rounded-lg border border-red-200 flex flex-col items-center justify-center p-2">
          <X className="w-8 h-8 text-red-400 mb-2" />
          <p className="text-xs text-red-600 text-center">Failed to load</p>
        </div>
      )}

      {/* Actual media */}
      {item.mediaType === 'image' ? (
        <img
          src={item.objectPath}
          alt={item.fileName}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "w-full h-full object-cover rounded-lg border border-gray-200 shadow-sm transition-all cursor-pointer",
            isLoaded ? "opacity-100 group-hover:shadow-md group-hover:scale-[1.02]" : "opacity-0"
          )}
          onClick={onClick}
        />
      ) : (
        <video
          src={item.objectPath}
          preload="metadata"
          onLoadedData={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "w-full h-full object-cover rounded-lg border border-gray-200 shadow-sm transition-all cursor-pointer",
            isLoaded ? "opacity-100 group-hover:shadow-md group-hover:scale-[1.02]" : "opacity-0"
          )}
          onClick={onClick}
          muted
        />
      )}

      {/* Expand icon overlay */}
      {isLoaded && (
        <button
          onClick={onClick}
          className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"
        >
          <div className="bg-white rounded-full p-2 shadow-lg">
            <Maximize2 className="w-4 h-4 text-gray-700" />
          </div>
        </button>
      )}

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={isDeleting}
        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 disabled:opacity-50 shadow-lg z-10"
        title="Delete media"
      >
        <X className="w-3 h-3" />
      </button>

      {/* File info on hover */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate" title={item.fileName}>
          {item.fileName}
        </p>
        <p className="text-xs text-white/80">
          {formatFileSize(item.fileSize)}
        </p>
      </div>
    </div>
  );
}

// Lightbox modal for viewing media
function MediaLightbox({ 
  item, 
  isOpen, 
  onClose 
}: { 
  item: MediaItem | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
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

export default function MediaGallery({ eventId, onUploadComplete, onDragStateChange }: MediaGalleryProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Notify parent of drag state changes
  useEffect(() => {
    onDragStateChange?.(isDragging);
  }, [isDragging, onDragStateChange]);

  // Fetch media for this event
  const { data: media, refetch, isLoading } = useQuery<MediaItem[]>({
    queryKey: ['calendar-event-media', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/calendar-events/${eventId}/media`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch media');
      return res.json();
    },
    enabled: !!eventId,
  });

  // Delete media mutation
  const deleteMutation = useMutation({
    mutationFn: async (mediaId: number) => {
      const res = await fetch(`/api/calendar-events/${eventId}/media/${mediaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete media');
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Media deleted",
        description: "The media file has been removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete media",
        variant: "destructive",
      });
    }
  });

  // Validate file
  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image or video file",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Handle file upload
  const handleUpload = async (file: File) => {
    if (!validateFile(file)) return;

    try {
      setIsUploading(true);

      // 1. Get upload URL
      const urlRes = await fetch(`/api/calendar-events/${eventId}/media/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mediaType: file.type.startsWith('video') ? 'video' : 'image'
        })
      });

      if (!urlRes.ok) throw new Error('Failed to get upload URL');
      const { uploadURL } = await urlRes.json();

      // 2. Upload file to signed URL
      const uploadRes = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadRes.ok) throw new Error('Failed to upload file');

      // 3. Refresh media list
      refetch();
      onUploadComplete?.();

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload media",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input
    e.target.value = '';
  };

  // Expose handleUpload to parent via window for dialog-wide drag support
  useEffect(() => {
    (window as any).__mediaUploadHandler = handleUpload;
    return () => {
      delete (window as any).__mediaUploadHandler;
    };
  }, [eventId]); // Re-register when eventId changes

  const handleMediaClick = (item: MediaItem) => {
    setSelectedMedia(item);
    setIsLightboxOpen(true);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Compact Upload Button */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`media-upload-${eventId}`}
            disabled={isUploading}
          />
          <label htmlFor={`media-upload-${eventId}`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={isUploading}
              className="w-full cursor-pointer"
            >
              <span className="flex items-center justify-center gap-2">
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Click or drag files anywhere to upload
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>

        {/* Loading Skeleton */}
        {isLoading && <MediaSkeleton />}

        {/* Media Grid */}
        {!isLoading && media && media.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {media.map((item) => (
              <MediaItemCard
                key={item.id}
                item={item}
                onDelete={() => deleteMutation.mutate(item.id)}
                onClick={() => handleMediaClick(item)}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && media && media.length === 0 && !isUploading && (
          <div className="text-center py-4">
            <ImagePlus className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              No media yet. Drag files anywhere or click above to upload.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <MediaLightbox
        item={selectedMedia}
        isOpen={isLightboxOpen}
        onClose={() => {
          setIsLightboxOpen(false);
          setSelectedMedia(null);
        }}
      />
    </>
  );
}
