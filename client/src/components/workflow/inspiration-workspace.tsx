import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Tag, 
  Search, 
  Trash2,
  Edit3,
  GripVertical,
  Save,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { WorkflowTemplateInstance } from "@shared/schema";

interface InspirationItem {
  id: string;
  type: "image" | "link" | "note";
  title: string;
  content: string; // URL for images/links, text for notes
  notes: string;
  tags: string[];
  order: number;
}

interface InspirationData {
  items: InspirationItem[];
  lastModified: string;
}

export default function InspirationWorkspace() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    type: "note" as const,
    title: "",
    content: "",
    notes: "",
    tags: [] as string[],
  });
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // Fetch template instance
  const { data: template, isLoading } = useQuery({
    queryKey: ["/api/workflow-templates", id],
    queryFn: async () => {
      const res = await fetch(`/api/workflow-templates/${id}`);
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json() as Promise<WorkflowTemplateInstance>;
    },
    enabled: !!id,
  });

  // Auto-save mutation with debounce
  const updateMutation = useMutation({
    mutationFn: async (data: InspirationData) => {
      return apiRequest({
        url: `/api/workflow-templates/${id}`,
        method: "PUT",
        body: { data },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-templates", id] });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const templateData = template?.data as InspirationData | undefined;
  const items = templateData?.items || [];

  // Auto-save function with debounce
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (data: InspirationData) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          updateMutation.mutate(data);
        }, 500);
      };
    })(),
    [updateMutation]
  );

  const saveData = (updatedItems: InspirationItem[]) => {
    const data: InspirationData = {
      items: updatedItems,
      lastModified: new Date().toISOString(),
    };
    debouncedSave(data);
  };

  const handleAddItem = () => {
    if (!newItem.title.trim()) return;

    const item: InspirationItem = {
      id: `item_${Date.now()}`,
      type: newItem.type,
      title: newItem.title,
      content: newItem.content,
      notes: newItem.notes,
      tags: newItem.tags,
      order: items.length,
    };

    const updatedItems = [...items, item];
    saveData(updatedItems);

    setNewItem({
      type: "note",
      title: "",
      content: "",
      notes: "",
      tags: [],
    });
    setIsAddingItem(false);

    toast({
      title: "Item Added",
      description: "Your inspiration item has been added successfully.",
    });
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    saveData(updatedItems);

    toast({
      title: "Item Deleted",
      description: "The inspiration item has been removed.",
    });
  };

  const handleUpdateItem = (itemId: string, updates: Partial<InspirationItem>) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    saveData(updatedItems);
  };

  const handleImageUpload = async (file: File) => {
    // In a real app, you'd upload to a file storage service
    // For now, we'll create a data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setNewItem(prev => ({
        ...prev,
        type: "image",
        content: dataUrl,
        title: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Filter items based on search and tags
  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === "" || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => item.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(items.flatMap(item => item.tags)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inspiration workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Creative Inspiration Hub</h2>
          <p className="text-gray-600">Collect and organize your creative references</p>
        </div>
        <Button
          onClick={() => setIsAddingItem(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search items, notes, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                setSelectedTags(prev =>
                  prev.includes(tag)
                    ? prev.filter(t => t !== tag)
                    : [...prev, tag]
                );
              }}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Add Item Form */}
      {isAddingItem && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Add New Inspiration Item
              <Button variant="ghost" size="sm" onClick={() => setIsAddingItem(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={newItem.type === "note" ? "default" : "outline"}
                size="sm"
                onClick={() => setNewItem(prev => ({ ...prev, type: "note" }))}
              >
                Note
              </Button>
              <Button
                variant={newItem.type === "image" ? "default" : "outline"}
                size="sm"
                onClick={() => setNewItem(prev => ({ ...prev, type: "image" }))}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Image
              </Button>
              <Button
                variant={newItem.type === "link" ? "default" : "outline"}
                size="sm"
                onClick={() => setNewItem(prev => ({ ...prev, type: "link" }))}
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Link
              </Button>
            </div>

            <Input
              placeholder="Title"
              value={newItem.title}
              onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
            />

            {newItem.type === "image" && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
              </div>
            )}

            {newItem.type === "link" && (
              <Input
                placeholder="URL"
                value={newItem.content}
                onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
              />
            )}

            {newItem.type === "note" && (
              <Textarea
                placeholder="Your notes..."
                value={newItem.content}
                onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                rows={3}
              />
            )}

            <Textarea
              placeholder="Additional notes..."
              value={newItem.notes}
              onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />

            <div className="flex gap-2">
              <Button onClick={handleAddItem} className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-4 h-4 mr-2" />
                Save Item
              </Button>
              <Button variant="outline" onClick={() => setIsAddingItem(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="group hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                  {item.type === "image" && <ImageIcon className="w-4 h-4 text-purple-600" />}
                  {item.type === "link" && <LinkIcon className="w-4 h-4 text-blue-600" />}
                  {item.type === "note" && <Edit3 className="w-4 h-4 text-green-600" />}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>

              <h3 className="font-medium text-gray-900 mb-2">{item.title}</h3>

              {item.type === "image" && item.content && (
                <div className="mb-3">
                  <img
                    src={item.content}
                    alt={item.title}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}

              {item.type === "link" && (
                <div className="mb-3">
                  <a
                    href={item.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm break-all"
                  >
                    {item.content}
                  </a>
                </div>
              )}

              {item.type === "note" && (
                <p className="text-gray-700 text-sm mb-3 line-clamp-3">{item.content}</p>
              )}

              {item.notes && (
                <p className="text-gray-600 text-xs mb-3 italic">{item.notes}</p>
              )}

              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No inspiration items yet</h3>
          <p className="text-gray-600 mb-4">
            Start building your creative collection by adding images, links, or notes
          </p>
          <Button
            onClick={() => setIsAddingItem(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Item
          </Button>
        </div>
      )}

      {/* Auto-save indicator */}
      {updateMutation.isPending && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg px-4 py-2 border">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            <span className="text-sm text-gray-600">Auto-saving...</span>
          </div>
        </div>
      )}
    </div>
  );
}