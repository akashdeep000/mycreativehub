import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, ExternalLink, Copy, Check, Plus, Trash2, Edit, Search, Download, AlertCircle } from 'lucide-react';
import BackToDashboard from '@/components/BackToDashboard';
import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { AffiliateLink, InsertAffiliateLink } from '@shared/schema';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800' }
];

const CONTENT_CHANNELS = [
  'Blog Posts',
  'Social Media',
  'Email Newsletter',
  'Video Content',
  'Podcast',
  'Webinar',
  'Course/Training',
  'Product Reviews',
  'Comparison Posts',
  'Resource Lists'
];

export default function AffiliateMarketing() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null);
  const [customChannels, setCustomChannels] = useState<string[]>([]);
  const [newCustomChannel, setNewCustomChannel] = useState('');
  const [showCustomChannelInput, setShowCustomChannelInput] = useState(false);
  const [newLink, setNewLink] = useState<InsertAffiliateLink>({
    userId: '',
    productName: '',
    companyName: '',
    trackingLink: '',
    affiliateCode: '',
    discountCode: '',
    commissionRate: '',
    cookieLength: '',
    contentChannel: '',
    status: 'active',
    notes: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: affiliateLinks = [], isLoading } = useQuery({
    queryKey: ['/api/affiliate-links']
  });

  // Handle errors with useEffect
  useEffect(() => {
    if (affiliateLinks instanceof Error) {
      if (isUnauthorizedError(affiliateLinks)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    }
  }, [affiliateLinks, toast]);

  const createMutation = useMutation({
    mutationFn: async (linkData: Omit<InsertAffiliateLink, 'userId'>) => {
      return await apiRequest('/api/affiliate-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(linkData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate-links'] });
      toast({
        title: "Success",
        description: "Affiliate link added successfully!",
      });
      setShowAddForm(false);
      resetForm();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to create affiliate link. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AffiliateLink> }) => {
      return await apiRequest(`/api/affiliate-links/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate-links'] });
      toast({
        title: "Success",
        description: "Affiliate link updated successfully!",
      });
      setEditingLink(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to update affiliate link. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/affiliate-links/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate-links'] });
      toast({
        title: "Success",
        description: "Affiliate link deleted successfully!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to delete affiliate link. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const resetForm = () => {
    setNewLink({
      userId: '',
      productName: '',
      companyName: '',
      trackingLink: '',
      affiliateCode: '',
      discountCode: '',
      commissionRate: '',
      cookieLength: '',
      contentChannel: '',
      status: 'active',
      notes: ''
    });
    setErrors({});
  };

  const setContentChannel = (channel: string, isEditing: boolean = false) => {
    if (isEditing && editingLink) {
      setEditingLink({...editingLink, contentChannel: channel});
    } else {
      setNewLink({...newLink, contentChannel: channel});
    }
  };

  const addCustomChannel = () => {
    if (newCustomChannel.trim() && !customChannels.includes(newCustomChannel.trim())) {
      setCustomChannels([...customChannels, newCustomChannel.trim()]);
      setNewCustomChannel('');
      setShowCustomChannelInput(false);
      toast({
        title: "Success",
        description: "Custom channel added successfully!",
      });
    }
  };

  const getAllChannels = () => {
    return [...CONTENT_CHANNELS, ...customChannels];
  };

  const validateForm = (data: Omit<InsertAffiliateLink, 'userId'> | InsertAffiliateLink) => {
    const newErrors: Record<string, string> = {};
    
    if (!data.productName.trim()) {
      newErrors.productName = 'Product name is required';
    }
    if (!data.companyName.trim()) {
      newErrors.companyName = 'Company is required';
    }
    if (!data.trackingLink.trim()) {
      newErrors.trackingLink = 'Tracking link is required';
    } else if (!data.trackingLink.startsWith('http')) {
      newErrors.trackingLink = 'Please enter a valid URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm(newLink)) return;
    const { userId, ...linkData } = newLink;
    createMutation.mutate(linkData);
  };

  const handleUpdate = (link: AffiliateLink) => {
    if (!validateForm(link)) return;
    updateMutation.mutate({ id: link.id, data: link });
  };

  const copyToClipboard = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const exportToCsv = () => {
    const headers = ['Product Name', 'Company', 'Tracking Link', 'Affiliate Code', 'Commission Rate', 'Cookie Length', 'Content Channel', 'Status', 'Notes', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...filteredLinks.map(link => [
        `"${link.productName}"`,
        `"${link.companyName}"`,
        `"${link.trackingLink}"`,
        `"${link.affiliateCode || ''}"`,
        `"${link.commissionRate || ''}"`,
        `"${link.cookieLength || ''}"`,
        `"${link.contentChannel || ''}"`,
        `"${link.status}"`,
        `"${link.notes || ''}"`,
        `"${new Date(link.createdAt).toLocaleDateString()}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `affiliate-links-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: "CSV file downloaded successfully!",
    });
  };

  const filteredLinks = (affiliateLinks as AffiliateLink[]).filter((link: AffiliateLink) => {
    const matchesSearch = link.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         link.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || link.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
      <div className="mb-8">
        <BackToDashboard />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-pink-500 rounded-lg flex items-center justify-center">
            <Link className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">The Affiliate Link Hub</h1>
            <p className="text-gray-600">Manage and track your affiliate partnerships</p>
          </div>
        </div>
        
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Track Your Affiliate Success</h3>
              <p className="text-gray-700 text-sm">
                Keep all your affiliate links organized in one place. Track commissions, cookie lengths, and performance across different content channels.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by product name or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-pink-500 hover:bg-pink-600 text-white rounded-md"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Link
        </Button>
        {affiliateLinks.length > 0 && (
          <Button
            onClick={exportToCsv}
            variant="outline"
            className="border-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>
      {/* Add New Link Form */}
      {showAddForm && (
        <Card className="mb-6 shadow-md border-0">
          <CardHeader>
            <CardTitle>Add New Affiliate Link</CardTitle>
            <CardDescription>Fill in the details for your new affiliate partnership</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <Input
                  value={newLink.productName}
                  onChange={(e) => setNewLink({...newLink, productName: e.target.value})}
                  placeholder="e.g., ConvertKit"
                  className={errors.productName ? 'border-red-500' : ''}
                />
                {errors.productName && <p className="text-red-500 text-xs mt-1">{errors.productName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company *</label>
                <Input
                  value={newLink.companyName}
                  onChange={(e) => setNewLink({...newLink, companyName: e.target.value})}
                  placeholder="e.g., ConvertKit LLC"
                  className={errors.companyName ? 'border-red-500' : ''}
                />
                {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tracking Link *</label>
              <Input
                value={newLink.trackingLink || ''}
                onChange={(e) => setNewLink({...newLink, trackingLink: e.target.value})}
                placeholder="https://..."
                className={errors.trackingLink ? 'border-red-500' : ''}
              />
              {errors.trackingLink && <p className="text-red-500 text-xs mt-1">{errors.trackingLink}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Discount Code/Coupon</label>
              <Input
                value={newLink.discountCode || ''}
                onChange={(e) => setNewLink({...newLink, discountCode: e.target.value})}
                placeholder="e.g., SAVE20, WELCOME10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Affiliate Code</label>
                <Input
                  value={newLink.affiliateCode || ''}
                  onChange={(e) => setNewLink({...newLink, affiliateCode: e.target.value})}
                  placeholder="e.g., ABC123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Commission Rate</label>
                <Input
                  value={newLink.commissionRate || ''}
                  onChange={(e) => setNewLink({...newLink, commissionRate: e.target.value})}
                  placeholder="e.g., 30%"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cookie Length</label>
                <Input
                  value={newLink.cookieLength || ''}
                  onChange={(e) => setNewLink({...newLink, cookieLength: e.target.value})}
                  placeholder="e.g., 30 days"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content Channel</label>
              <Select value={newLink.contentChannel || ''} onValueChange={(value) => setNewLink({...newLink, contentChannel: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a content channel" />
                </SelectTrigger>
                <SelectContent>
                  {getAllChannels().map(channel => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!showCustomChannelInput && (
                <Button
                  variant="outline"
                  className="mt-2 border-pink-500 text-pink-500 hover:bg-pink-50"
                  onClick={() => setShowCustomChannelInput(true)}
                  size="sm"
                >
                  + Add Custom Channel
                </Button>
              )}
              {showCustomChannelInput && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newCustomChannel}
                    onChange={(e) => setNewCustomChannel(e.target.value)}
                    placeholder="Enter custom channel name"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addCustomChannel();
                      } else if (e.key === 'Escape') {
                        setShowCustomChannelInput(false);
                        setNewCustomChannel('');
                      }
                    }}
                  />
                  <Button
                    onClick={addCustomChannel}
                    className="bg-pink-500 hover:bg-pink-600 text-white"
                    size="sm"
                  >
                    Add
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCustomChannelInput(false);
                      setNewCustomChannel('');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select value={newLink.status} onValueChange={(value) => setNewLink({...newLink, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <Textarea
                  value={newLink.notes || ''}
                  onChange={(e) => setNewLink({...newLink, notes: e.target.value})}
                  placeholder="Any additional notes..."
                  className="min-h-[40px]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="bg-pink-500 hover:bg-pink-600 text-white rounded-md"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Link'}
              </Button>
              <Button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Affiliate Links Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Company</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Link</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Commission</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cookie</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Channels</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm || statusFilter !== 'all' ? 'No affiliate links match your filters' : 'No affiliate links yet. Add your first one above!'}
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{link.productName}</div>
                      {link.affiliateCode && (
                        <div className="text-xs text-gray-500">Code: {link.affiliateCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{link.companyName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(link.trackingLink, link.id)}
                          className="p-1 h-8 w-8"
                        >
                          {copiedId === link.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(link.trackingLink, '_blank')}
                          className="p-1 h-8 w-8"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{link.commissionRate || '-'}</td>
                    <td className="px-4 py-3 text-gray-900">{link.cookieLength || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {link.contentChannel ? link.contentChannel.split(', ').slice(0, 2).map(channel => (
                          <Badge key={channel} variant="outline" className="text-xs">
                            {channel}
                          </Badge>
                        )) : null}
                        {link.contentChannel && link.contentChannel.split(', ').length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{link.contentChannel.split(', ').length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${getStatusBadgeColor(link.status)} border-0`}>
                        {STATUS_OPTIONS.find(opt => opt.value === link.status)?.label || link.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingLink({
                            ...link,
                            company: link.companyName,
                            affiliateLink: link.trackingLink,
                            trackingCode: link.affiliateCode,
                            contentChannels: link.contentChannel ? link.contentChannel.split(', ') : []
                          })}
                          className="p-1 h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(link.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1 h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Edit Link Modal */}
      {editingLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Edit Affiliate Link</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <Input
                    value={editingLink.productName}
                    onChange={(e) => setEditingLink({...editingLink, productName: e.target.value})}
                    className={errors.productName ? 'border-red-500' : ''}
                  />
                  {errors.productName && <p className="text-red-500 text-xs mt-1">{errors.productName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Company *</label>
                  <Input
                    value={editingLink.companyName}
                    onChange={(e) => setEditingLink({...editingLink, companyName: e.target.value})}
                    className={errors.companyName ? 'border-red-500' : ''}
                  />
                  {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Tracking Link *</label>
                <Input
                  value={editingLink.trackingLink || ''}
                  onChange={(e) => setEditingLink({...editingLink, trackingLink: e.target.value})}
                  className={errors.trackingLink ? 'border-red-500' : ''}
                />
                {errors.trackingLink && <p className="text-red-500 text-xs mt-1">{errors.trackingLink}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Discount Code/Coupon</label>
                <Input
                  value={editingLink.discountCode || ''}
                  onChange={(e) => setEditingLink({...editingLink, discountCode: e.target.value})}
                  placeholder="e.g., SAVE20, WELCOME10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Affiliate Code</label>
                  <Input
                    value={editingLink.affiliateCode || ''}
                    onChange={(e) => setEditingLink({...editingLink, affiliateCode: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Commission Rate</label>
                  <Input
                    value={editingLink.commissionRate || ''}
                    onChange={(e) => setEditingLink({...editingLink, commissionRate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cookie Length</label>
                  <Input
                    value={editingLink.cookieLength || ''}
                    onChange={(e) => setEditingLink({...editingLink, cookieLength: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Content Channel</label>
                <Select value={editingLink.contentChannel || ''} onValueChange={(value) => setEditingLink({...editingLink, contentChannel: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a content channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllChannels().map((channel: string) => (
                      <SelectItem key={channel} value={channel}>
                        {channel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!showCustomChannelInput && (
                  <Button
                    variant="outline"
                    className="mt-2 border-pink-500 text-pink-500 hover:bg-pink-50"
                    onClick={() => setShowCustomChannelInput(true)}
                    size="sm"
                  >
                    + Add Custom Channel
                  </Button>
                )}
                {showCustomChannelInput && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newCustomChannel}
                      onChange={(e) => setNewCustomChannel(e.target.value)}
                      placeholder="Enter custom channel name"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addCustomChannel();
                        } else if (e.key === 'Escape') {
                          setShowCustomChannelInput(false);
                          setNewCustomChannel('');
                        }
                      }}
                    />
                    <Button
                      onClick={addCustomChannel}
                      className="bg-pink-500 hover:bg-pink-600 text-white"
                      size="sm"
                    >
                      Add
                    </Button>
                    <Button
                      onClick={() => {
                        setShowCustomChannelInput(false);
                        setNewCustomChannel('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Select value={editingLink.status} onValueChange={(value) => setEditingLink({...editingLink, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <Textarea
                    value={editingLink.notes || ''}
                    onChange={(e) => setEditingLink({...editingLink, notes: e.target.value})}
                    className="min-h-[40px]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleUpdate(editingLink)}
                  disabled={updateMutation.isPending}
                  className="bg-pink-500 hover:bg-pink-600 text-white rounded-md"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update Link'}
                </Button>
                <Button
                  onClick={() => setEditingLink(null)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}