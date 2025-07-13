import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/mobile-nav';
import { 
  CheckSquare, 
  ArrowLeft, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Eye,
  Save,
  X,
  Tag
} from 'lucide-react';

interface Component {
  id: string;
  itemName: string;
  quantity: string;
  notes: string;
}

interface Product {
  id: string;
  title: string;
  status: 'idea' | 'in-progress' | 'ready-to-launch';
  components: Component[];
  lastModified: string;
}

const STATUS_CONFIG = {
  'idea': { label: 'Idea', color: 'bg-gray-100 text-gray-700', icon: '💡' },
  'in-progress': { label: 'In Progress', color: 'bg-orange-100 text-orange-700', icon: '⏳' },
  'ready-to-launch': { label: 'Ready to Launch', color: 'bg-green-100 text-green-700', icon: '🚀' }
};

export default function ProductComponentChecklist() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  // Load products from localStorage on component mount
  useEffect(() => {
    const savedProducts = localStorage.getItem('productComponentChecklist');
    if (savedProducts) {
      try {
        setProducts(JSON.parse(savedProducts));
      } catch (error) {
        console.error('Failed to parse saved products:', error);
      }
    }
  }, []);

  // Save products to localStorage whenever products change
  useEffect(() => {
    localStorage.setItem('productComponentChecklist', JSON.stringify(products));
  }, [products]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const createNewProduct = () => {
    const newProduct: Product = {
      id: generateId(),
      title: 'New Product',
      status: 'idea',
      components: [
        { id: generateId(), itemName: '', quantity: '', notes: '' }
      ],
      lastModified: new Date().toISOString()
    };
    setProducts(prev => [...prev, newProduct]);
    setSelectedProduct(newProduct);
    setIsEditing(true);
    setEditingTitle(newProduct.title);
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    if (selectedProduct?.id === productId) {
      setSelectedProduct(null);
    }
    toast({
      title: "Product deleted",
      description: "Product has been removed from your library.",
    });
  };

  const updateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => 
      p.id === updatedProduct.id 
        ? { ...updatedProduct, lastModified: new Date().toISOString() }
        : p
    ));
    setSelectedProduct(updatedProduct);
  };

  const addComponent = () => {
    if (!selectedProduct) return;
    
    const newComponent: Component = {
      id: generateId(),
      itemName: '',
      quantity: '',
      notes: ''
    };
    
    const updatedProduct = {
      ...selectedProduct,
      components: [...selectedProduct.components, newComponent]
    };
    
    updateProduct(updatedProduct);
  };

  const updateComponent = (componentId: string, field: keyof Component, value: string) => {
    if (!selectedProduct) return;
    
    const updatedProduct = {
      ...selectedProduct,
      components: selectedProduct.components.map(c =>
        c.id === componentId ? { ...c, [field]: value } : c
      )
    };
    
    updateProduct(updatedProduct);
  };

  const deleteComponent = (componentId: string) => {
    if (!selectedProduct) return;
    
    const updatedProduct = {
      ...selectedProduct,
      components: selectedProduct.components.filter(c => c.id !== componentId)
    };
    
    updateProduct(updatedProduct);
  };

  const copyComponentList = () => {
    if (!selectedProduct) return;
    
    let copyText = `${selectedProduct.title}\n`;
    copyText += '='.repeat(selectedProduct.title.length) + '\n\n';
    
    selectedProduct.components.forEach((component, index) => {
      if (component.itemName) {
        copyText += `${index + 1}. ${component.itemName}`;
        if (component.quantity) copyText += ` (Qty: ${component.quantity})`;
        if (component.notes) copyText += ` - ${component.notes}`;
        copyText += '\n';
      }
    });
    
    navigator.clipboard.writeText(copyText);
    toast({
      title: "List copied!",
      description: "Component list has been copied to your clipboard.",
    });
  };

  const updateProductStatus = (productId: string, newStatus: Product['status']) => {
    setProducts(prev => prev.map(p => 
      p.id === productId 
        ? { ...p, status: newStatus, lastModified: new Date().toISOString() }
        : p
    ));
    if (selectedProduct?.id === productId) {
      setSelectedProduct(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleTitleSave = () => {
    if (!selectedProduct || !editingTitle.trim()) return;
    
    const updatedProduct = {
      ...selectedProduct,
      title: editingTitle.trim()
    };
    
    updateProduct(updatedProduct);
    setIsEditing(false);
  };

  const handleTitleCancel = () => {
    setEditingTitle(selectedProduct?.title || '');
    setIsEditing(false);
  };

  if (selectedProduct) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-white">
        <Sidebar />
        <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setSelectedProduct(null)}
              className="mb-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-xl flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="text-2xl font-bold border-none p-0 focus-visible:ring-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTitleSave();
                        if (e.key === 'Escape') handleTitleCancel();
                      }}
                      onBlur={handleTitleSave}
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={handleTitleSave}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleTitleCancel}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedProduct.title}</h1>
                    <Button size="sm" variant="ghost" onClick={() => { setIsEditing(true); setEditingTitle(selectedProduct.title); }}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Status selector */}
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Status:</span>
              <div className="flex gap-2">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <Button
                    key={status}
                    variant={selectedProduct.status === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateProductStatus(selectedProduct.id, status as Product['status'])}
                    className={`text-xs ${selectedProduct.status === status ? config.color : ''}`}
                  >
                    {config.icon} {config.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Components Table */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Product Components</h3>
                <div className="flex gap-2">
                  <Button onClick={copyComponentList} variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy List
                  </Button>
                  <Button onClick={addComponent} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Component
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium text-gray-700">Item Name</th>
                    <th className="text-left p-4 font-medium text-gray-700">Quantity</th>
                    <th className="text-left p-4 font-medium text-gray-700">Notes</th>
                    <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.components.map((component, index) => (
                    <tr key={component.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-4">
                        <Input
                          value={component.itemName}
                          onChange={(e) => updateComponent(component.id, 'itemName', e.target.value)}
                          placeholder="Enter item name"
                          className="border-gray-300"
                        />
                      </td>
                      <td className="p-4">
                        <Input
                          value={component.quantity}
                          onChange={(e) => updateComponent(component.id, 'quantity', e.target.value)}
                          placeholder="e.g., 1, 2 lbs, 5 pieces"
                          className="border-gray-300"
                        />
                      </td>
                      <td className="p-4">
                        <Textarea
                          value={component.notes}
                          onChange={(e) => updateComponent(component.id, 'notes', e.target.value)}
                          placeholder="Additional notes..."
                          className="border-gray-300 min-h-[40px]"
                          rows={2}
                        />
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteComponent(component.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <Sidebar />
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-xl flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Product Component Checklist</h1>
              <p className="text-gray-600">Manage your product library with detailed component breakdowns</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-8">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm text-blue-800 leading-relaxed">
                Start building your product library by creating a new card for each item you plan to launch. 
                Within each product, list every component involved, from materials to packaging. When you're 
                ready to price it, click 'Copy List' and paste it into the Profit Calculator to start working 
                on your pricing strategy. Save each product to refer back to and tweak.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add New Product Button */}
        <div className="mb-6">
          <Button onClick={createNewProduct} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add New Product
          </Button>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-600">Create your first product to get started using the button above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="group hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg text-gray-900 leading-tight">
                      {product.title}
                    </CardTitle>
                    <Badge className={`${STATUS_CONFIG[product.status].color} text-xs`}>
                      {STATUS_CONFIG[product.status].icon} {STATUS_CONFIG[product.status].label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      {product.components.length} component{product.components.length !== 1 ? 's' : ''} listed
                    </div>
                    <div className="text-xs text-gray-500">
                      Last modified: {new Date(product.lastModified).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProduct(product)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProduct(product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}