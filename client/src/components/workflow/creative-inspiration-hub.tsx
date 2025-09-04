import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, X, Edit, Edit2, Trash2, Palette, Image } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Image {
  id: number;
  url: string;
  alt: string;
}

interface Note {
  id: number;
  text: string;
  color: string;
}

interface CreativeInspirationData {
  moodboard: {
    images: Image[];
    notes: Note[];
  };
}

interface CreativeInspirationHubProps {
  templateId: number;
  initialData: CreativeInspirationData;
  onSave: (data: CreativeInspirationData) => void;
}

export default function CreativeInspirationHub({ templateId, initialData, onSave }: CreativeInspirationHubProps) {
  const [data, setData] = useState<CreativeInspirationData>(initialData);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [newNote, setNewNote] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave(data);
    }, 1000);
    return () => clearTimeout(timer);
  }, [data, onSave]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage = {
          id: Date.now(),
          url: e.target?.result as string,
          alt: file.name
        };
        setData(prev => ({
          ...prev,
          moodboard: {
            ...prev.moodboard,
            images: [...prev.moodboard.images, newImage]
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageReplace = (imageId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setData(prev => ({
          ...prev,
          moodboard: {
            ...prev.moodboard,
            images: prev.moodboard.images.map(img => 
              img.id === imageId 
                ? { ...img, url: e.target?.result as string, alt: file.name }
                : img
            )
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = (imageId: number) => {
    setData(prev => ({
      ...prev,
      moodboard: {
        ...prev.moodboard,
        images: prev.moodboard.images.filter(img => img.id !== imageId)
      }
    }));
  };

  const handleNoteAdd = () => {
    if (newNote.trim()) {
      const colors = ["#8B5CF6", "#A855F7", "#9333EA", "#7C3AED", "#6D28D9"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const note = {
        id: Date.now(),
        text: newNote.trim(),
        color: randomColor
      };
      
      setData(prev => ({
        ...prev,
        moodboard: {
          ...prev.moodboard,
          notes: [...prev.moodboard.notes, note]
        }
      }));
      setNewNote("");
    }
  };

  const handleNoteEdit = (noteId: number, newText: string) => {
    setData(prev => ({
      ...prev,
      moodboard: {
        ...prev.moodboard,
        notes: prev.moodboard.notes.map(note => 
          note.id === noteId ? { ...note, text: newText } : note
        )
      }
    }));
    setEditingNote(null);
  };

  const handleNoteRemove = (noteId: number) => {
    setData(prev => ({
      ...prev,
      moodboard: {
        ...prev.moodboard,
        notes: prev.moodboard.notes.filter(note => note.id !== noteId)
      }
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImage = {
            id: Date.now() + Math.random(),
            url: e.target?.result as string,
            alt: file.name
          };
          setData(prev => ({
            ...prev,
            moodboard: {
              ...prev.moodboard,
              images: [...prev.moodboard.images, newImage]
            }
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Creative Inspiration Hub</h2>
          <p className="text-gray-600">Collect and organize your creative inspirations</p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-200">
          Auto-saving
        </Badge>
      </div>

      {/* Images Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Moodboard Images
          </CardTitle>
          <CardDescription>
            Upload or drag and drop images to build your visual inspiration collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 ${
              isDragging ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {data.moodboard.images.map((image) => (
              <div key={image.id} className="relative group">
                <img 
                  src={image.url} 
                  alt={image.alt}
                  className="w-full h-48 object-cover rounded-lg shadow-sm"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageReplace(image.id, e)}
                      />
                      <Button size="sm" variant="secondary">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </label>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleImageRemove(image.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add New Image */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <div className="h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors">
                <div className="text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Add Image</p>
                </div>
              </div>
            </label>
          </div>
          
          {isDragging && (
            <div className="text-center py-4">
              <p className="text-blue-600 font-medium">Drop images here to add them to your moodboard</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Inspiration Notes
          </CardTitle>
          <CardDescription>
            Add notes, ideas, and color inspirations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {data.moodboard.notes.map((note) => (
              <div 
                key={note.id} 
                className="relative group p-4 rounded-lg shadow-sm"
                style={{ backgroundColor: note.color + '20', borderLeft: `4px solid ${note.color}` }}
              >
                {editingNote === note.id ? (
                  <Textarea
                    value={note.text}
                    onChange={(e) => handleNoteEdit(note.id, e.target.value)}
                    onBlur={() => setEditingNote(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        handleNoteEdit(note.id, e.currentTarget.value);
                      }
                    }}
                    autoFocus
                    className="resize-none"
                  />
                ) : (
                  <>
                    <p className="text-sm text-gray-700 leading-relaxed">{note.text}</p>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingNote(note.id)}
                        title="Edit note"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleNoteRemove(note.id)}
                        title="Delete note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          
          {/* Add New Note */}
          <div className="flex gap-2">
            <Input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a new inspiration note..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNoteAdd();
                }
              }}
            />
            <Button onClick={handleNoteAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}