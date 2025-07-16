import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, RotateCw, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSave: (croppedImageUrl: string) => void;
}

export function ImageUploadModal({ isOpen, onClose, onImageSave }: ImageUploadModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        // Reset crop when new image is loaded
        setCrop(undefined);
        setCompletedCrop(undefined);
      };
      reader.readAsDataURL(file);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Create a square crop in the center of the image
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        1, // 1:1 aspect ratio for square
        width,
        height,
      ),
      width,
      height,
    );
    
    setCrop(crop);
    setCompletedCrop(crop);
  }, []);

  const getCroppedImageUrl = useCallback(() => {
    if (!completedCrop || !imageRef.current || !canvasRef.current) {
      return null;
    }

    const image = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  }, [completedCrop]);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const croppedImageUrl = getCroppedImageUrl();
      if (croppedImageUrl) {
        onImageSave(croppedImageUrl);
        handleClose();
        toast({
          title: "Success",
          description: "Profile photo updated successfully",
        });
      }
    } catch (error) {
      console.error('Error saving image:', error);
      toast({
        title: "Error",
        description: "Failed to save profile photo",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Profile Photo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!selectedImage ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-pink-400 bg-pink-50'
                  : 'border-gray-300 hover:border-pink-400 hover:bg-pink-50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {isDragActive ? 'Drop your photo here' : 'Drag and drop your photo here'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse files
              </p>
              <p className="text-xs text-gray-400">
                JPG, PNG, GIF or WebP. Max file size 5MB.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Adjust your photo</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="w-4 h-4" />
                  Change Photo
                </Button>
              </div>
              
              <div className="max-h-96 overflow-hidden rounded-lg border">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                  className="max-w-full"
                >
                  <img
                    ref={imageRef}
                    src={selectedImage}
                    alt="Crop preview"
                    className="max-w-full h-auto"
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              </div>
              
              <p className="text-sm text-gray-500">
                Drag the circle to reposition and resize your photo. It will be cropped to fit a circular profile picture.
              </p>
            </div>
          )}
          
          {/* Hidden canvas for cropping */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {selectedImage && (
            <Button
              onClick={handleSave}
              disabled={isProcessing}
              className="bg-pink-500 hover:bg-pink-600"
            >
              <Check className="w-4 h-4 mr-2" />
              {isProcessing ? 'Saving...' : 'Save Photo'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}