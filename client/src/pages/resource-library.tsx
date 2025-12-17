import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, GripVertical, FileText, Link, Download, Edit2, X, Check, ExternalLink, BookOpen, Loader2, Plus } from 'lucide-react';
import BackToDashboard from '@/components/BackToDashboard';
import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { type ResourceLibraryItem, type ResourceCategory } from '@shared/schema';
import PdfViewer from '@/components/PdfViewer';
import { Skeleton } from '@/components/ui/skeleton';

export default function ResourceLibrary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [isAddPdfModalOpen, setIsAddPdfModalOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<ResourceLibraryItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<ResourceLibraryItem | null>(null);
  const [viewingPdf, setViewingPdf] = useState<{ url: string; title: string } | null>(null);

  // Fetch Categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<ResourceCategory[]>({
    queryKey: ['/api/resource-categories'],
    queryFn: async () => {
      const response = await fetch('/api/resource-categories', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const { data: items = [], isLoading: isLoadingItems } = useQuery<ResourceLibraryItem[]>({
    queryKey: ['/api/resource-library'],
    queryFn: async () => {
      const response = await fetch('/api/resource-library', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch items');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const addItemMutation = useMutation({
    mutationFn: async (newItem: any) => {
      const res = await apiRequest("/api/resource-library", {
        method: "POST",
        body: JSON.stringify(newItem),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resource-library"] });
      toast({ title: "Success", description: "Resource added successfully" });
      setIsAddLinkModalOpen(false);
      setIsAddPdfModalOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to add resource", variant: "destructive" });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/resource-library/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/resource-library'] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(['/api/resource-library']);

      // Close edit mode immediately
      // Moved to event handlers for synchronous closing

      // Optimistically update to the new value
      queryClient.setQueryData(['/api/resource-library'], (old: any) => {
        return (old || []).map((item: any) => 
          item.id === id ? { ...item, ...data } : item
        );
      });

      // Return a context object with the snapshotted value
      return { previousItems };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousItems) {
        queryClient.setQueryData(['/api/resource-library'], context.previousItems);
      }
      toast({ title: "Error", description: "Failed to update resource", variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['/api/resource-library'] });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Resource updated" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/resource-library/${id}`, { method: 'DELETE' });
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['/api/resource-library'] });
      const previousItems = queryClient.getQueryData(['/api/resource-library']) || [];
      queryClient.setQueryData(['/api/resource-library'], (old: any) => 
        (old || []).filter((item: any) => item.id !== deletedId)
      );
      return { previousItems, deletedId };
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Resource deleted from your library" });
    },
    onError: (error, deletedId, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['/api/resource-library'], context.previousItems);
      }
      toast({ title: "Error", description: "Failed to delete resource", variant: "destructive" });
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
      await queryClient.cancelQueries({ queryKey: ['/api/resource-library'] });
      const previousItems = queryClient.getQueryData(['/api/resource-library']);
      const currentItems = (previousItems as ResourceLibraryItem[]) || [];
      const reorderedItemsMap = new Map(reorderedItems.map(item => [item.id, item.displayOrder]));
      
      const newItems = currentItems.map(item => {
        if (reorderedItemsMap.has(item.id)) {
          return { ...item, displayOrder: reorderedItemsMap.get(item.id)! };
        }
        return item;
      });

      queryClient.setQueryData(['/api/resource-library'], newItems);
      return { previousItems };
    },
    onError: (err, newItems, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['/api/resource-library'], context.previousItems);
      }
      toast({ title: "Error", description: "Failed to reorder items", variant: "destructive" });
    },
    onSettled: () => {
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

    // Only allow reordering within the same category for now to keep it simple
    if (draggedItem.categoryId !== targetItem.categoryId) {
      // Optional: Allow moving between categories via drag and drop?
      // For now, let's just update the category of the dragged item
      updateItemMutation.mutate({
        id: draggedItem.id,
        data: { categoryId: targetItem.categoryId }
      });
      setDraggedItem(null);
      return;
    }

    const categoryItems = items
      .filter(item => item.categoryId === targetItem.categoryId)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const draggedIndex = categoryItems.findIndex(item => item.id === draggedItem.id);
    const targetIndex = categoryItems.findIndex(item => item.id === targetItem.id);

    const newCategoryItems = [...categoryItems];
    const [movedItem] = newCategoryItems.splice(draggedIndex, 1);
    newCategoryItems.splice(targetIndex, 0, movedItem);

    const reorderedItems = newCategoryItems.map((item, index) => ({
      id: item.id,
      displayOrder: index + 1,
    }));

    reorderMutation.mutate(reorderedItems);
    setDraggedItem(null);
  };

  const handleAddLink = (formData: any) => {
    const categoryId = formData.categoryId ? parseInt(formData.categoryId) : (categories[0]?.id || 0);
    const categoryItems = items.filter(i => i.categoryId === categoryId);
    const nextOrder = categoryItems.length + 1;
    
    addItemMutation.mutate({
      ...formData,
      type: 'link',
      displayOrder: nextOrder,
      categoryId: categoryId,
    });
  };

  const handleAddPdf = (formData: any) => {
    const categoryId = formData.categoryId ? parseInt(formData.categoryId) : (categories[0]?.id || 0);
    const categoryItems = items.filter(i => i.categoryId === categoryId);
    const nextOrder = categoryItems.length + 1;

    addItemMutation.mutate({
      title: formData.title,
      type: 'file',
      fileData: formData.fileData,
      fileName: formData.fileName,
      fileType: formData.fileType,
      description: formData.description,
      displayOrder: nextOrder,
      categoryId: categoryId,
    });
  };

  const openAddLinkModal = (categoryId?: number | React.MouseEvent) => {
    setIsAddLinkModalOpen(true);
    // If categoryId is a number, we could use it to set default category
    // But since we don't have external state for form data, we'll rely on activeCategoryId
    // or we can add a state for selectedCategoryForAdd if needed.
    // For now, let's just open the modal.
  };

  const openAddPdfModal = () => {
    setIsAddPdfModalOpen(true);
  };

  if (isLoadingItems || isLoadingCategories) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
          <div className="mb-8">
            <BackToDashboard />
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <Skeleton className="h-8 w-64" />
            </div>
            <Skeleton className="h-4 w-full max-w-2xl mb-2" />
            <Skeleton className="h-4 w-3/4 max-w-xl" />
          </div>

          <div className="space-y-8">
            {/* Tabs Skeleton */}
            <div className="flex gap-2 border-b pb-1">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-t-lg" />
              ))}
            </div>

            {/* Content Skeleton */}
            <div className="space-y-8">
              {[...Array(2)].map((_, sectionIndex) => (
                <div key={sectionIndex} className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                      <Card key={i} className="min-h-48 flex flex-col border-0 shadow-md">
                        <div className="p-4 h-16 bg-gray-100 rounded-t-lg relative">
                          <Skeleton className="w-10 h-10 rounded-full" />
                        </div>
                        <CardContent className="p-4 flex-1 flex flex-col space-y-3">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-full" />
                          <div className="mt-auto pt-4">
                            <Skeleton className="h-8 w-full" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group items by categoryId
  const itemsByCategoryId: Record<number, ResourceLibraryItem[]> = {};
  categories.forEach(cat => {
    itemsByCategoryId[cat.id] = [];
  });
  
  items.forEach(item => {
    const catId = item.categoryId;
    if (catId && itemsByCategoryId[catId]) {
      itemsByCategoryId[catId].push(item);
    }
  });

  // Sort items within categories
  Object.keys(itemsByCategoryId).forEach(catId => {
    itemsByCategoryId[parseInt(catId)].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  });

  const activeCategoryName = activeCategoryId === "all" ? "All Resources" : categories.find(c => c.id.toString() === activeCategoryId)?.name || "";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
        <div className="mb-8">
          <BackToDashboard />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-serif font-semibold text-gray-800">Your Resource Library</h1>
          </div>
          <p className="text-gray-600 leading-relaxed">
            This is your personal resource hub. You'll find all downloadable PDFs and templates inside your 'My Creative Hub: Systems for Success' course.
          </p>
        </div>

        <Tabs value={activeCategoryId} className="w-full" onValueChange={setActiveCategoryId}>
          <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-transparent border-b rounded-none">
            <TabsTrigger 
              value="all"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-500 data-[state=active]:shadow-none rounded-none px-4 py-2"
            >
              All
            </TabsTrigger>
            {categories.map(category => (
              <TabsTrigger 
                key={category.id} 
                value={category.id.toString()}
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-500 data-[state=active]:shadow-none rounded-none px-4 py-2"
              >
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-8 animate-in fade-in-50 duration-300">
            {/* PDF Files Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-medium text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-pink-500" />
                  PDF Resources
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openAddPdfModal}
                  className="text-pink-600 border-pink-200 hover:bg-pink-50"
                >
                  <Plus className="w-4 h-4 mr-1" /> PDF
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.filter(item => item.type === 'file').length === 0 ? (
                  <div className="col-span-full py-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-gray-400 text-sm">No PDF resources yet</p>
                  </div>
                ) : (
                  items.filter(item => item.type === 'file')
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map(item => (
                    <ResourceCard
                      key={item.id}
                      item={item}
                      currentUserId={user?.id}
                      onEdit={setEditingItem}
                      onDelete={(id) => deleteItemMutation.mutate(id)}
                      onUpdate={(id, data) => {
                        updateItemMutation.mutate({ id, data });
                        setEditingItem(null);
                      }}
                      draggedItem={draggedItem}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      editingItem={editingItem}
                      onCancelEdit={() => setEditingItem(null)}
                      onViewPdf={(url, title) => setViewingPdf({ url, title })}
                      categories={categories}
                      isDraggable={false}
                      showCategory={true}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Links Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-medium text-gray-700 flex items-center gap-2">
                  <Link className="w-4 h-4 text-blue-500" />
                  Websites & Links
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openAddLinkModal}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-1" /> Link
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.filter(item => item.type === 'link').length === 0 ? (
                  <div className="col-span-full py-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-gray-400 text-sm">No links yet</p>
                  </div>
                ) : (
                  items.filter(item => item.type === 'link')
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map(item => (
                    <ResourceCard
                      key={item.id}
                      item={item}
                      currentUserId={user?.id}
                      onEdit={setEditingItem}
                      onDelete={(id) => deleteItemMutation.mutate(id)}
                      onUpdate={(id, data) => {
                        updateItemMutation.mutate({ id, data });
                        setEditingItem(null);
                      }}
                      draggedItem={draggedItem}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      editingItem={editingItem}
                      onCancelEdit={() => setEditingItem(null)}
                      onViewPdf={(url, title) => setViewingPdf({ url, title })}
                      categories={categories}
                      isDraggable={false}
                      showCategory={true}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {categories.map(category => {
            const categoryItems = itemsByCategoryId[category.id] || [];
            const fileItems = categoryItems.filter(item => item.type === 'file');
            const linkItems = categoryItems.filter(item => item.type === 'link');

            return (
              <TabsContent key={category.id} value={category.id.toString()} className="space-y-8 animate-in fade-in-50 duration-300">
                {/* Files Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-pink-500" />
                      PDF Resources
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openAddPdfModal}
                      className="text-pink-600 border-pink-200 hover:bg-pink-50"
                    >
                      <Plus className="w-4 h-4 mr-1" /> PDF
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {fileItems.length === 0 ? (
                      <div className="col-span-full py-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <p className="text-gray-400 text-sm">No PDF resources yet</p>
                      </div>
                    ) : (
                      fileItems.map(item => (
                        <ResourceCard
                          key={item.id}
                          item={item}
                          currentUserId={user?.id}
                          onEdit={setEditingItem}
                          onDelete={(id) => deleteItemMutation.mutate(id)}
                          onUpdate={(id, data) => {
                        updateItemMutation.mutate({ id, data });
                        setEditingItem(null);
                      }}
                          draggedItem={draggedItem}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          editingItem={editingItem}
                          onCancelEdit={() => setEditingItem(null)}
                          onViewPdf={(url, title) => setViewingPdf({ url, title })}
                          categories={categories}
                          isDraggable={true}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Links Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-medium text-gray-700 flex items-center gap-2">
                      <Link className="w-4 h-4 text-blue-500" />
                      Websites & Links
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddLinkModal(category.id)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Link
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {linkItems.length === 0 ? (
                      <div className="col-span-full py-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <p className="text-gray-400 text-sm">No links yet</p>
                      </div>
                    ) : (
                      linkItems.map(item => (
                        <ResourceCard
                          key={item.id}
                          item={item}
                          currentUserId={user?.id}
                          onEdit={setEditingItem}
                          onDelete={(id) => deleteItemMutation.mutate(id)}
                          onUpdate={(id, data) => {
                        updateItemMutation.mutate({ id, data });
                        setEditingItem(null);
                      }}
                          draggedItem={draggedItem}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          editingItem={editingItem}
                          onCancelEdit={() => setEditingItem(null)}
                          onViewPdf={(url, title) => setViewingPdf({ url, title })}
                          categories={categories}
                          isDraggable={true}
                        />
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        <Dialog open={isAddLinkModalOpen} onOpenChange={setIsAddLinkModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Link</DialogTitle>
            </DialogHeader>
            <AddLinkForm 
              onSubmit={handleAddLink} 
              categories={categories}
              defaultCategoryId={activeCategoryId !== "all" ? activeCategoryId : undefined}
              isLoading={addItemMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isAddPdfModalOpen} onOpenChange={setIsAddPdfModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add PDF Resource</DialogTitle>
            </DialogHeader>
            <AddPdfForm 
              onSubmit={handleAddPdf} 
              categories={categories}
              defaultCategoryId={activeCategoryId !== "all" ? activeCategoryId : undefined}
              isLoading={addItemMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        <PdfViewer
          isOpen={!!viewingPdf}
          onClose={() => setViewingPdf(null)}
          url={viewingPdf?.url || null}
          title={viewingPdf?.title}
        />
        <MobileNav />
      </div>
    </div>
  );
}

function ResourceCard({ 
  item, 
  currentUserId,
  onEdit, 
  onDelete, 
  onUpdate, 
  draggedItem, 
  onDragStart, 
  onDragOver, 
  onDrop, 
  editingItem, 
  onCancelEdit,
  onViewPdf,
  categories,
  isDraggable = true,
  showCategory = false
}: {
  item: ResourceLibraryItem;
  currentUserId?: string;
  onEdit: (item: ResourceLibraryItem) => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: any) => void;
  draggedItem: ResourceLibraryItem | null;
  onDragStart: (e: React.DragEvent, item: ResourceLibraryItem) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, item: ResourceLibraryItem) => void;
  editingItem: ResourceLibraryItem | null;
  onCancelEdit: () => void;
  onViewPdf: (url: string, title: string) => void;
  categories: ResourceCategory[];
  isDraggable?: boolean;
  showCategory?: boolean;
}) {
  const isFile = item.type === 'file';
  const isEditing = editingItem?.id === item.id;
  const isOwner = currentUserId === item.userId;
  const categoryName = categories.find(c => c.id === item.categoryId)?.name;

  const handleOpenFile = () => {
    if (isFile) {
      // Use the new content route
      const fileUrl = `/api/resource-library/${item.id}/content`;
      onViewPdf(fileUrl, item.title);
    }
  };

  const handleOpenLink = () => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-lg ${isDraggable ? 'cursor-move' : ''} border-0 shadow-md bg-white min-h-48 flex flex-col ${
        draggedItem?.id === item.id ? 'opacity-50' : ''
      }`}
      draggable={isDraggable}
      onDragStart={(e) => isDraggable && onDragStart(e, item)}
      onDragOver={(e) => isDraggable && onDragOver(e)}
      onDrop={(e) => isDraggable && onDrop(e, item)}
    >
      <CardHeader className={`pb-3 p-4 ${isFile ? 'bg-gradient-to-br from-pink-400 to-purple-400' : 'bg-gradient-to-br from-blue-400 to-green-400'} text-white relative rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            {isFile ? <FileText className="w-5 h-5" /> : <Link className="w-5 h-5" />}
          </div>
          <div className="flex gap-1">
            {isOwner && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(item)}
                  className="text-white hover:bg-white/20 w-7 h-7 p-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(item.id)}
                  className="text-white hover:bg-white/20 w-7 h-7 p-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
        {isDraggable && <GripVertical className="w-3 h-3 absolute top-2 left-2 text-white/60" />}
      </CardHeader>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        {isEditing ? (
          <EditItemForm
            item={item}
            onSave={(data) => onUpdate(item.id, data)}
            onCancel={onCancelEdit}
            categories={categories}
          />
        ) : (
          <>
            <div className="flex-1 mb-3">
              {showCategory && categoryName && (
                <span className="inline-block px-2 py-0.5 mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-500 bg-gray-100 rounded-full">
                  {categoryName}
                </span>
              )}
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm leading-snug" title={item.title}>{item.title}</h3>
              {item.description && (
                <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
              )}
            </div>
            
            <div className="mt-auto">
              {isFile ? (
                <Button
                  onClick={handleOpenFile}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white h-8 text-xs"
                  size="sm"
                >
                  <Download className="w-3 h-3 mr-1.5" />
                  Open
                </Button>
              ) : (
                <Button
                  onClick={handleOpenLink}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs"
                  size="sm"
                >
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  Visit
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AddLinkForm({ onSubmit, categories, defaultCategoryId, isLoading }: { 
  onSubmit: (data: any) => void;
  categories: ResourceCategory[];
  defaultCategoryId?: string;
  isLoading?: boolean;
}) {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    categoryId: defaultCategoryId || (categories[0]?.id.toString() || ''),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ 
      title: '', 
      url: '', 
      description: '', 
      categoryId: defaultCategoryId || (categories[0]?.id.toString() || '') 
    });
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
        <Label htmlFor="category">Category</Label>
        <Select 
          value={formData.categoryId} 
          onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description"
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Link'
          )}
        </Button>
      </div>
    </form>
  );
}

function AddPdfForm({ onSubmit, categories, defaultCategoryId, isLoading }: { 
  onSubmit: (data: any) => void;
  categories: ResourceCategory[];
  defaultCategoryId?: string;
  isLoading?: boolean;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: defaultCategoryId || (categories[0]?.id.toString() || ''),
  });
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: selectedFile.name.replace('.pdf', '') }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onSubmit({
        ...formData,
        fileData: base64,
        fileName: file.name,
        fileType: file.type,
        // description is already in formData
      });
      // Form reset is handled by parent closing the modal or manual reset if needed
      // But since we auto-close, we might not need to reset here immediately if unmounted
    };
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="pdf-file">PDF File</Label>
        <Input
          id="pdf-file"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="pdf-title">Title</Label>
        <Input
          id="pdf-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter resource title"
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="pdf-category">Category</Label>
        <Select 
          value={formData.categoryId} 
          onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="pdf-description">Description (optional)</Label>
        <Textarea
          id="pdf-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description"
          rows={3}
          disabled={isLoading}
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!file || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Resource'
          )}
        </Button>
      </div>
    </form>
  );
}

function EditItemForm({ item, onSave, onCancel, categories }: { 
  item: ResourceLibraryItem; 
  onSave: (data: any) => void; 
  onCancel: () => void; 
  categories: ResourceCategory[];
}) {
  const [formData, setFormData] = useState({
    title: item.title,
    description: item.description || '',
    url: item.url || '',
    categoryId: item.categoryId?.toString() || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Input
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Title"
        required
        className="h-8 text-sm"
      />
      {item.type === 'link' && (
        <Input
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="URL"
          required
          className="h-8 text-sm"
        />
      )}
      <Select 
        value={formData.categoryId} 
        onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map(cat => (
            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Description"
        rows={2}
        className="text-sm resize-none"
      />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-7 w-7 p-0">
          <X className="w-3 h-3" />
        </Button>
        <Button type="submit" size="sm" className="h-7 w-7 p-0 bg-green-500 hover:bg-green-600">
          <Check className="w-3 h-3" />
        </Button>
      </div>
    </form>
  );
}