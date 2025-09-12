import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Plus, Trash2, GripVertical, FileText, Link, Download, Edit2, X, Check, ExternalLink, Archive, BookOpen } from 'lucide-react';
import BackToDashboard from '@/components/BackToDashboard';
import Sidebar from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ResourceLibraryItem } from '@shared/schema';

export default function ResourceLibrary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourceLibraryItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<ResourceLibraryItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/resource-library'],
  });

  const addItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      return await apiRequest('/api/resource-library', {
        method: 'POST',
        body: JSON.stringify(itemData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resource-library'] });
      setIsAddModalOpen(false);
      toast({
        title: "Success",
        description: "Resource added to your library",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add resource",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/resource-library/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resource-library'] });
      setEditingItem(null);
      toast({
        title: "Success",
        description: "Resource updated",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/resource-library/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resource-library'] });
      toast({
        title: "Success",
        description: "Resource deleted from your library",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorderedItems: { id: number; displayOrder: number }[]) => {
      return await apiRequest('/api/resource-library/reorder', {
        method: 'POST',
        body: JSON.stringify({ items: reorderedItems }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resource-library'] });
    },
  });

  const handleDragStart = (e: React.DragEvent, item: ResourceLibraryItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetItem: ResourceLibraryItem) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = items.findIndex((item: ResourceLibraryItem) => item.id === draggedItem.id);
    const targetIndex = items.findIndex((item: ResourceLibraryItem) => item.id === targetItem.id);

    const newItems = [...items];
    const [movedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);

    // Update display order
    const reorderedItems = newItems.map((item, index) => ({
      id: item.id,
      displayOrder: index + 1,
    }));

    reorderMutation.mutate(reorderedItems);
    setDraggedItem(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const nextOrder = items.length + 1;
      
      addItemMutation.mutate({
        title: file.name,
        type: 'file',
        fileData: base64,
        fileName: file.name,
        fileType: file.type,
        displayOrder: nextOrder,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddLink = (formData: any) => {
    const nextOrder = items.length + 1;
    addItemMutation.mutate({
      ...formData,
      type: 'link',
      displayOrder: nextOrder,
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'file': return 'bg-blue-100 text-blue-800';
      case 'link': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'file': return <FileText className="w-4 h-4" />;
      case 'link': return <Link className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-4"></div>
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fileItems = items.filter((item: ResourceLibraryItem) => item.type === 'file');
  const linkItems = items.filter((item: ResourceLibraryItem) => item.type === 'link');

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
      <div className="mb-8">
        <BackToDashboard />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-serif font-semibold text-gray-800">Your Resource Library</h1>
        </div>
        <p className="text-gray-600 leading-relaxed">This is your personal resource hub. You'll find all downloadable PDFs and templates inside your 'My Creative Hub: Systems for Success' course. When you come across a resource you'd like to refer back to, add it here to keep everything in one place.</p>
        
        {/* Hidden file input for uploads triggered from section buttons */}
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
          onChange={handleFileUpload}
        />
        
        {/* Hidden dialog for links triggered from section buttons */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Website Link</DialogTitle>
            </DialogHeader>
            <AddLinkForm onSubmit={handleAddLink} />
          </DialogContent>
        </Dialog>
      </div>

      {/* PDF Files Section */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Uploaded PDFs & Files</h2>
        {fileItems.length === 0 ? (
          <Card className="text-center py-8 border-dashed border-2 border-gray-300 bg-white shadow-md">
            <CardContent>
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No files uploaded yet</p>
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-300"
              >
                Upload Your First File
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fileItems.map((item: ResourceLibraryItem) => (
              <ResourceCard
                key={item.id}
                item={item}
                onEdit={setEditingItem}
                onDelete={(id) => deleteItemMutation.mutate(id)}
                onUpdate={(id, data) => updateItemMutation.mutate({ id, data })}
                draggedItem={draggedItem}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                editingItem={editingItem}
                onCancelEdit={() => setEditingItem(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Website Links Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Favourite Websites & Resources</h2>
        <p className="text-gray-600 mb-4">
          Have websites or tools you visit regularly? Add them here so they're easy to access.
        </p>
        {linkItems.length === 0 ? (
          <Card className="text-center py-8 border-dashed border-2 border-gray-300 bg-white shadow-md">
            <CardContent>
              <Link className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No links saved yet</p>
              <Button
                variant="outline"
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
              >
                Add Your First Link
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {linkItems.map((item: ResourceLibraryItem) => (
              <ResourceCard
                key={item.id}
                item={item}
                onEdit={setEditingItem}
                onDelete={(id) => deleteItemMutation.mutate(id)}
                onUpdate={(id, data) => updateItemMutation.mutate({ id, data })}
                draggedItem={draggedItem}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                editingItem={editingItem}
                onCancelEdit={() => setEditingItem(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Download All PDFs Button */}
      {fileItems.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center">
            <Button
              variant="outline"
              size="lg"
              className="bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 text-gray-700 border-gray-300"
              onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "Bulk PDF download feature will be available shortly",
                });
              }}
            >
              <Archive className="w-5 h-5 mr-2" />
              Download All PDFs into Organised Folders for Your Desktop
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function ResourceCard({ 
  item, 
  onEdit, 
  onDelete, 
  onUpdate, 
  draggedItem, 
  onDragStart, 
  onDragOver, 
  onDrop, 
  editingItem, 
  onCancelEdit 
}: {
  item: ResourceLibraryItem;
  onEdit: (item: ResourceLibraryItem) => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: any) => void;
  draggedItem: ResourceLibraryItem | null;
  onDragStart: (e: React.DragEvent, item: ResourceLibraryItem) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, item: ResourceLibraryItem) => void;
  editingItem: ResourceLibraryItem | null;
  onCancelEdit: () => void;
}) {
  const isFile = item.type === 'file';
  const isLink = item.type === 'link';
  const isEditing = editingItem?.id === item.id;

  const handleOpenFile = () => {
    if (item.fileData) {
      const link = document.createElement('a');
      link.href = item.fileData;
      link.download = item.fileName || 'download';
      link.click();
    }
  };

  const handleOpenLink = () => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-lg cursor-move aspect-square border-0 shadow-md bg-white ${
        draggedItem?.id === item.id ? 'opacity-50' : ''
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, item)}
    >
      <CardHeader className={`pb-4 ${isFile ? 'bg-gradient-to-br from-pink-400 to-purple-400' : 'bg-gradient-to-br from-blue-400 to-green-400'} text-white relative`}>
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            {isFile ? <FileText className="w-6 h-6" /> : <Link className="w-6 h-6" />}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item)}
              className="text-white hover:bg-white/20 w-8 h-8 p-0"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item.id)}
              className="text-white hover:bg-white/20 w-8 h-8 p-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <GripVertical className="w-4 h-4 absolute top-2 left-2 text-white/60" />
      </CardHeader>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        {isEditing ? (
          <EditItemForm
            item={item}
            onSave={(data) => onUpdate(item.id, data)}
            onCancel={onCancelEdit}
          />
        ) : (
          <>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">{item.description}</p>
              )}
            </div>
            
            <div className="mt-auto">
              {isFile ? (
                <Button
                  onClick={handleOpenFile}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Open PDF
                </Button>
              ) : (
                <div className="space-y-2">
                  {item.url && (
                    <p className="text-xs text-gray-500 truncate">{item.url}</p>
                  )}
                  <Button
                    onClick={handleOpenLink}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Website
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AddLinkForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ title: '', url: '', description: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter link title"
          required
        />
      </div>
      <div>
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://example.com"
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of this resource"
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setFormData({ title: '', url: '', description: '' })}>
          Cancel
        </Button>
        <Button type="submit">Add Link</Button>
      </div>
    </form>
  );
}

function EditItemForm({ item, onSave, onCancel }: { 
  item: ResourceLibraryItem; 
  onSave: (data: any) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    title: item.title,
    description: item.description || '',
    url: item.url || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Title"
          required
        />
      </div>
      {item.type === 'link' && (
        <div>
          <Input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="URL"
            required
          />
        </div>
      )}
      <div>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Description"
          rows={2}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          <Check className="w-4 h-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}