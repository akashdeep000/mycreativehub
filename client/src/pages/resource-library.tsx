import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Plus, Trash2, GripVertical, FileText, Link, Download, Edit2, X, Check, ExternalLink, Archive, BookOpen, Loader2, FolderPlus, Palette } from 'lucide-react';
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
import type { ResourceLibraryItem, ResourceLibraryFolder } from '@shared/schema';

export default function ResourceLibrary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourceLibraryItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<ResourceLibraryItem | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [editingFolder, setEditingFolder] = useState<ResourceLibraryFolder | null>(null);

  // Use folder-scoped cache keys for better cache invalidation
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/resource-library', selectedFolder],
    queryFn: async () => {
      const url = selectedFolder !== null 
        ? `/api/resource-library?folderId=${selectedFolder}`
        : '/api/resource-library';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch items');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['/api/resource-library/folders'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const addItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      return await apiRequest('/api/resource-library', {
        method: 'POST',
        body: JSON.stringify(itemData),
      });
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['/api/resource-library'] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(['/api/resource-library', selectedFolder]) || [];

      // Create optimistic item with temporary ID
      const tempId = -Date.now();
      const optimisticItem = {
        id: tempId,
        ...variables,
      };

      // Optimistically update to the new value
      queryClient.setQueryData(['/api/resource-library', selectedFolder], (old: any) => [optimisticItem, ...(old || [])]);

      // Clear upload state immediately after optimistic update
      setUploadingFileName(null);

      // Return a context object with the snapshotted value
      return { previousItems, tempId };
    },
    onSuccess: (createdItem, variables, context) => {
      console.log('Upload success - item created:', createdItem);
      
      // Invalidate all folder-scoped cache entries
      queryClient.invalidateQueries({ queryKey: ['/api/resource-library'] });
      
      setIsAddModalOpen(false);
      toast({
        title: "Success",
        description: "Resource added to your library",
      });
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousItems) {
        queryClient.setQueryData(['/api/resource-library', selectedFolder], context.previousItems);
      }
      
      setUploadingFileName(null);
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
    onMutate: async (reorderedItems) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/resource-library'] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(['/api/resource-library']);

      // Optimistically update cache with new order
      const currentItems = (previousItems as ResourceLibraryItem[]) || [];
      const reorderedItemsMap = new Map(reorderedItems.map(item => [item.id, item.displayOrder]));
      
      const newItems = [...currentItems].sort((a, b) => {
        const aOrder = reorderedItemsMap.get(a.id) ?? a.displayOrder;
        const bOrder = reorderedItemsMap.get(b.id) ?? b.displayOrder;
        return aOrder - bOrder;
      });

      queryClient.setQueryData(['/api/resource-library'], newItems);

      return { previousItems };
    },
    onError: (err, newItems, context) => {
      // Revert to previous state on error
      if (context?.previousItems) {
        queryClient.setQueryData(['/api/resource-library'], context.previousItems);
      }
      toast({
        title: "Error",
        description: "Failed to reorder items. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Optionally refresh data in background (not blocking UI)
      queryClient.invalidateQueries({ queryKey: ['/api/resource-library'] });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (folderData: { name: string; color: string }) => {
      return await apiRequest('/api/resource-library/folders', {
        method: 'POST',
        body: JSON.stringify(folderData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resource-library/folders'] });
      setIsAddFolderOpen(false);
      toast({
        title: "Success",
        description: "Folder created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string; color?: string } }) => {
      return await apiRequest(`/api/resource-library/folders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resource-library/folders'] });
      toast({
        title: "Success",
        description: "Folder updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update folder",
        variant: "destructive",
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      return await apiRequest(`/api/resource-library/folders/${folderId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resource-library/folders'] });
      // Invalidate all folder-scoped cache entries
      queryClient.invalidateQueries({ queryKey: ['/api/resource-library'] });
      toast({
        title: "Success",
        description: "Folder deleted",
      });
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

    const draggedIndex = (items as ResourceLibraryItem[]).findIndex((item: ResourceLibraryItem) => item.id === draggedItem.id);
    const targetIndex = (items as ResourceLibraryItem[]).findIndex((item: ResourceLibraryItem) => item.id === targetItem.id);

    const newItems = [...(items as ResourceLibraryItem[])];
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

    // Check if file is a PDF
    if (file.type !== 'application/pdf') {
      toast({
        title: "Error",
        description: "Failed to upload. Please upload a PDF only.",
        variant: "destructive",
      });
      return;
    }

    // Set uploading state
    setUploadingFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const nextOrder = (items as ResourceLibraryItem[]).length + 1;
      
      addItemMutation.mutate({
        title: file.name,
        type: 'file',
        fileData: base64,
        fileName: file.name,
        fileType: file.type,
        displayOrder: nextOrder,
        folderId: selectedFolder,
      });
    };
    
    reader.onerror = () => {
      setUploadingFileName(null);
      toast({
        title: "Error",
        description: "Failed to read the file. Please try again.",
        variant: "destructive",
      });
    };
    
    reader.readAsDataURL(file);

    // Reset file input
    e.target.value = '';
  };

  const handleAddLink = (formData: any) => {
    const nextOrder = (items as ResourceLibraryItem[]).length + 1;
    addItemMutation.mutate({
      ...formData,
      type: 'link',
      displayOrder: nextOrder,
      folderId: selectedFolder,
    });
  };

  const handleCreateFolder = (formData: { name: string; color: string }) => {
    createFolderMutation.mutate(formData);
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

  const filteredItems = (items as ResourceLibraryItem[]).filter((item: ResourceLibraryItem) => {
    if (selectedFolder === null) return true; // Show all items when no folder selected
    return item.folderId === selectedFolder; // Only show items in selected folder
  });

  const fileItems = filteredItems.filter((item: ResourceLibraryItem) => item.type === 'file');
  const linkItems = filteredItems.filter((item: ResourceLibraryItem) => item.type === 'link');

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
          accept=".pdf"
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

        {/* Create Folder Dialog */}
        <Dialog open={isAddFolderOpen} onOpenChange={setIsAddFolderOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <CreateFolderForm onSubmit={handleCreateFolder} />
          </DialogContent>
        </Dialog>

        {/* Edit Folder Dialog */}
        <Dialog open={!!editingFolder} onOpenChange={() => setEditingFolder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Folder</DialogTitle>
            </DialogHeader>
            {editingFolder && (
              <EditFolderForm 
                folder={editingFolder}
                onSubmit={(data) => {
                  updateFolderMutation.mutate({
                    id: editingFolder.id,
                    data
                  });
                  setEditingFolder(null);
                }}
                onCancel={() => setEditingFolder(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Folder Management Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Organize by Folders</h2>
          <Button
            onClick={() => setIsAddFolderOpen(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
            size="sm"
            data-testid="button-add-folder"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Add Folder
          </Button>
        </div>
        
        {folders.length === 0 ? (
          <Card className="text-center py-6 border-dashed border-2 border-gray-300 bg-white shadow-md">
            <CardContent>
              <FolderOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No folders created yet</p>
              <Button
                variant="outline"
                onClick={() => setIsAddFolderOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-300"
                data-testid="button-create-first-folder"
              >
                Create Your First Folder
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              variant={selectedFolder === null ? "default" : "outline"}
              onClick={() => setSelectedFolder(null)}
              className={selectedFolder === null ? "bg-gray-900 text-white" : ""}
              size="sm"
              data-testid="button-all-files"
            >
              All Files
            </Button>
            {folders.map((folder: ResourceLibraryFolder) => (
              <div key={folder.id} className="relative group">
                <Button
                  variant={selectedFolder === folder.id ? "default" : "outline"}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`${
                    selectedFolder === folder.id
                      ? "text-white"
                      : "hover:bg-gray-50"
                  } pr-8`}
                  style={{
                    backgroundColor: selectedFolder === folder.id ? folder.color : undefined,
                    borderColor: folder.color
                  }}
                  size="sm"
                  data-testid={`button-folder-${folder.id}`}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: folder.color }}
                  />
                  {folder.name}
                </Button>
                <div className="absolute right-0 top-0 h-full flex opacity-0 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-full px-1 text-gray-500 hover:text-gray-700"
                    onClick={() => setEditingFolder(folder)}
                    data-testid={`button-edit-folder-${folder.id}`}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-full px-1 text-red-500 hover:text-red-700"
                    onClick={() => deleteFolderMutation.mutate(folder.id)}
                    data-testid={`button-delete-folder-${folder.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF Files Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Uploaded PDFs</h2>
          {fileItems.length > 0 && (
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              className="bg-pink-500 hover:bg-pink-600 text-white"
              size="sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Add More PDFs
            </Button>
          )}
        </div>
        {fileItems.length === 0 && !uploadingFileName ? (
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
        ) : fileItems.length === 0 && uploadingFileName ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Upload Progress Card - First Upload */}
            <Card className="aspect-square border-0 shadow-md bg-white animate-pulse">
              <CardHeader className="pb-4 bg-gradient-to-br from-pink-400 to-purple-400 text-white relative">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{uploadingFileName}</h3>
                  <p className="text-sm text-gray-600 mb-3">Uploading PDF...</p>
                </div>
                <div className="mt-auto">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="bg-pink-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">Please wait...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Upload Progress Card */}
            {uploadingFileName && (
              <Card className="aspect-square border-0 shadow-md bg-white animate-pulse">
                <CardHeader className="pb-4 bg-gradient-to-br from-pink-400 to-purple-400 text-white relative">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{uploadingFileName}</h3>
                    <p className="text-sm text-gray-600 mb-3">Uploading PDF...</p>
                  </div>
                  <div className="mt-auto">
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="bg-pink-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 text-center">Please wait...</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
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
        <p className="text-gray-600 mb-4">If you have websites or tools you visit regularly, add them here so they're easy to access.</p>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
      className={`transition-all duration-200 hover:shadow-lg cursor-move border-0 shadow-md bg-white h-48 ${
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

function CreateFolderForm({ onSubmit }: { onSubmit: (data: { name: string; color: string }) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    color: '#6B7280',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', color: '#6B7280' });
  };

  const colorOptions = [
    { value: '#6B7280', name: 'Gray' },
    { value: '#EF4444', name: 'Red' },
    { value: '#F97316', name: 'Orange' },
    { value: '#EAB308', name: 'Yellow' },
    { value: '#22C55E', name: 'Green' },
    { value: '#3B82F6', name: 'Blue' },
    { value: '#8B5CF6', name: 'Purple' },
    { value: '#EC4899', name: 'Pink' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="folderName">Folder Name</Label>
        <Input
          id="folderName"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter folder name"
          required
          data-testid="input-folder-name"
        />
      </div>
      <div>
        <Label htmlFor="folderColor">Color</Label>
        <Select
          value={formData.color}
          onValueChange={(value) => setFormData({ ...formData, color: value })}
        >
          <SelectTrigger data-testid="select-folder-color">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: formData.color }}
              />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {colorOptions.map((color) => (
              <SelectItem key={color.value} value={color.value}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: color.value }}
                  />
                  {color.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setFormData({ name: '', color: '#6B7280' })}>
          Cancel
        </Button>
        <Button type="submit" data-testid="button-create-folder">Create Folder</Button>
      </div>
    </form>
  );
}

function EditFolderForm({ folder, onSubmit, onCancel }: { 
  folder: ResourceLibraryFolder;
  onSubmit: (data: { name: string; color: string }) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: folder.name,
    color: folder.color,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const colorOptions = [
    { value: '#6B7280', name: 'Gray' },
    { value: '#EF4444', name: 'Red' },
    { value: '#F97316', name: 'Orange' },
    { value: '#EAB308', name: 'Yellow' },
    { value: '#22C55E', name: 'Green' },
    { value: '#3B82F6', name: 'Blue' },
    { value: '#8B5CF6', name: 'Purple' },
    { value: '#EC4899', name: 'Pink' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="editFolderName">Folder Name</Label>
        <Input
          id="editFolderName"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter folder name"
          required
          data-testid="input-edit-folder-name"
        />
      </div>
      <div>
        <Label htmlFor="editFolderColor">Color</Label>
        <Select
          value={formData.color}
          onValueChange={(value) => setFormData({ ...formData, color: value })}
        >
          <SelectTrigger data-testid="select-edit-folder-color">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: formData.color }}
              />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {colorOptions.map((color) => (
              <SelectItem key={color.value} value={color.value}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: color.value }}
                  />
                  {color.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-edit-folder">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-save-folder">Save Changes</Button>
      </div>
    </form>
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