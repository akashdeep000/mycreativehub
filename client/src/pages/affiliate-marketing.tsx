import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, ExternalLink, Copy, Check, Plus, Trash2, Edit, Search, Download, AlertCircle } from 'lucide-react';
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
    company: '',
    affiliateLink: '',
    trackingCode: '',
    discountCode: '',
    commissionRate: '',
    cookieLength: '',
    contentChannels: [],
    status: 'active',
    notes: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: affiliateLinks = [], isLoading } = useQuery({
    queryKey: ['/api/affiliate-links'],
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
      }
    }
  });

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
      company: '',
      affiliateLink: '',
      trackingCode: '',
      discountCode: '',
      commissionRate: '',
      cookieLength: '',
      contentChannels: [],
      status: 'active',
      notes: ''
    });
    setErrors({});
  };

  const toggleContentChannel = (channel: string, isEditing: boolean = false) => {
    if (isEditing && editingLink) {
      const channels = editingLink.contentChannels.includes(channel)
        ? editingLink.contentChannels.filter(c => c !== channel)
        : [...editingLink.contentChannels, channel];
      setEditingLink({...editingLink, contentChannels: channels});
    } else {
      const channels = newLink.contentChannels.includes(channel)
        ? newLink.contentChannels.filter(c => c !== channel)
        : [...newLink.contentChannels, channel];
      setNewLink({...newLink, contentChannels: channels});
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
    if (!data.company.trim()) {
      newErrors.company = 'Company is required';
    }
    if (!data.affiliateLink.trim()) {
      newErrors.affiliateLink = 'Affiliate link is required';
    } else if (!data.affiliateLink.startsWith('http')) {
      newErrors.affiliateLink = 'Please enter a valid URL';
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
    const headers = ['Product Name', 'Company', 'Affiliate Link', 'Tracking Code', 'Commission Rate', 'Cookie Length', 'Content Channels', 'Status', 'Notes', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...filteredLinks.map(link => [
        `"${link.productName}"`,
        `"${link.company}"`,
        `"${link.affiliateLink}"`,
        `"${link.trackingCode || ''}"`,
        `"${link.commissionRate || ''}"`,
        `"${link.cookieLength || ''}"`,
        `"${link.contentChannels.join('; ')}"`,
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

  const filteredLinks = affiliateLinks.filter(link => {
    const matchesSearch = link.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         link.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || link.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
  };



  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-pink-500 rounded-lg flex items-center justify-center">
            <Link className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Affiliate Link Hub</h1>
            <p className="text-gray-600">Manage and track your affiliate partnerships</p>
          </div>
        </div>
        
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Link className="w-4 h-4 text-white" />
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
        <Card className="mb-6">
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
                  value={newLink.company}
                  onChange={(e) => setNewLink({...newLink, company: e.target.value})}
                  placeholder="e.g., ConvertKit LLC"
                  className={errors.company ? 'border-red-500' : ''}
                />
                {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Affiliate Link *</label>
              <Input
                value={newLink.affiliateLink}
                onChange={(e) => setNewLink({...newLink, affiliateLink: e.target.value})}
                placeholder="https://..."
                className={errors.affiliateLink ? 'border-red-500' : ''}
              />
              {errors.affiliateLink && <p className="text-red-500 text-xs mt-1">{errors.affiliateLink}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Discount Code/Coupon</label>
              <Input
                value={newLink.discountCode}
                onChange={(e) => setNewLink({...newLink, discountCode: e.target.value})}
                placeholder="e.g., SAVE20, WELCOME10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tracking Code</label>
                <Input
                  value={newLink.trackingCode}
                  onChange={(e) => setNewLink({...newLink, trackingCode: e.target.value})}
                  placeholder="e.g., ABC123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Commission Rate</label>
                <Input
                  value={newLink.commissionRate}
                  onChange={(e) => setNewLink({...newLink, commissionRate: e.target.value})}
                  placeholder="e.g., 30%"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cookie Length</label>
                <Input
                  value={newLink.cookieLength}
                  onChange={(e) => setNewLink({...newLink, cookieLength: e.target.value})}
                  placeholder="e.g., 30 days"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content Channels</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {getAllChannels().map(channel => (
                  <Badge
                    key={channel}
                    variant={newLink.contentChannels.includes(channel) ? "default" : "outline"}
                    className={`cursor-pointer ${newLink.contentChannels.includes(channel) 
                      ? 'bg-pink-500 text-white' 
                      : 'border-gray-300 hover:border-pink-500'}`}
                    onClick={() => toggleContentChannel(channel)}
                  >
                    {channel}
                  </Badge>
                ))}
                {!showCustomChannelInput && (
                  <Badge
                    variant="outline"
                    className="cursor-pointer border-pink-500 text-pink-500 hover:bg-pink-50"
                    onClick={() => setShowCustomChannelInput(true)}
                  >
                    + Add Custom Channel
                  </Badge>
                )}
              </div>
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
                  value={newLink.notes}
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
                    value={editingLink.company}
                    onChange={(e) => setEditingLink({...editingLink, company: e.target.value})}
                    className={errors.company ? 'border-red-500' : ''}
                  />
                  {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Affiliate Link *</label>
                <Input
                  value={editingLink.affiliateLink}
                  onChange={(e) => setEditingLink({...editingLink, affiliateLink: e.target.value})}
                  className={errors.affiliateLink ? 'border-red-500' : ''}
                />
                {errors.affiliateLink && <p className="text-red-500 text-xs mt-1">{errors.affiliateLink}</p>}
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
                  <label className="block text-sm font-medium mb-1">Tracking Code</label>
                  <Input
                    value={editingLink.trackingCode || ''}
                    onChange={(e) => setEditingLink({...editingLink, trackingCode: e.target.value})}
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
                <label className="block text-sm font-medium mb-2">Content Channels</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {getAllChannels().map(channel => (
                    <Badge
                      key={channel}
                      variant={editingLink.contentChannels.includes(channel) ? "default" : "outline"}
                      className={`cursor-pointer ${editingLink.contentChannels.includes(channel) 
                        ? 'bg-pink-500 text-white' 
                        : 'border-gray-300 hover:border-pink-500'}`}
                      onClick={() => toggleContentChannel(channel, true)}
                    >
                      {channel}
                    </Badge>
                  ))}
                  {!showCustomChannelInput && (
                    <Badge
                      variant="outline"
                      className="cursor-pointer border-pink-500 text-pink-500 hover:bg-pink-50"
                      onClick={() => setShowCustomChannelInput(true)}
                    >
                      + Add Custom Channel
                    </Badge>
                  )}
                </div>
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
  );
}