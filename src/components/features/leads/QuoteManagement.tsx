'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { LeadQuote, QuoteStatus } from '@/types/lead';
import { getQuoteStatusColor } from '@/types/lead';
import {
    DollarSign,
    Edit,
    FileText,
    Plus,
    Send,
    Trash2,
    X
} from 'lucide-react';
import { useState } from 'react';

interface QuoteManagementProps {
  leadId: string;
  quotes: LeadQuote[];
  onQuoteCreate: (quote: Omit<LeadQuote, 'id' | 'created_at' | 'updated_at' | 'sent_at' | 'sent_by_user_id' | 'sent_by_user_name'>) => Promise<void>;
  onQuoteUpdate: (quoteId: string, quote: Partial<LeadQuote>) => Promise<void>;
  onQuoteDelete: (quoteId: string) => Promise<void>;
  currentUserId: string;
  currentUserName: string;
  className?: string;
}

const QUOTE_STATUSES: { value: QuoteStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-800' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
];

const CURRENCIES = [
  { value: 'AED', label: 'AED (UAE Dirham)' },
  { value: 'USD', label: 'USD (US Dollar)' },
  { value: 'EUR', label: 'EUR (Euro)' },
  { value: 'GBP', label: 'GBP (British Pound)' },
];

const SERVICE_TYPES = [
  'Doctor on Call',
  'Nurse at Home',
  'Physiotherapy',
  'Caregiver Services',
  'IV Therapy',
  'Lab Tests',
  'Medical Equipment',
  'Other',
];

export function QuoteManagement({
  leadId,
  quotes,
  onQuoteCreate,
  onQuoteUpdate,
  onQuoteDelete,
  currentUserId,
  currentUserName,
  className = '',
}: QuoteManagementProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [newQuote, setNewQuote] = useState({
    service_type: '',
    description: '',
    amount: '',
    currency: 'AED',
    status: 'draft' as QuoteStatus,
  });
  const [editingQuote, setEditingQuote] = useState({
    service_type: '',
    description: '',
    amount: '',
    currency: 'AED',
    status: 'draft' as QuoteStatus,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateQuote = async () => {
    if (!newQuote.service_type.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const quoteData = {
        lead_id: leadId,
        service_type: newQuote.service_type.trim(),
        description: newQuote.description.trim() || null,
        amount: newQuote.amount ? parseFloat(newQuote.amount) : null,
        currency: newQuote.currency,
        status: newQuote.status,
      };

      await onQuoteCreate(quoteData);

      // Reset form
      setNewQuote({
        service_type: '',
        description: '',
        amount: '',
        currency: 'AED',
        status: 'draft',
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create quote:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateQuote = async (quoteId: string) => {
    if (!editingQuote.service_type.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        service_type: editingQuote.service_type.trim(),
        description: editingQuote.description.trim() || null,
        amount: editingQuote.amount ? parseFloat(editingQuote.amount) : null,
        currency: editingQuote.currency,
        status: editingQuote.status,
      };

      await onQuoteUpdate(quoteId, updateData);

      setEditingQuoteId(null);
      setEditingQuote({
        service_type: '',
        description: '',
        amount: '',
        currency: 'AED',
        status: 'draft',
      });
    } catch (error) {
      console.error('Failed to update quote:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
      try {
        await onQuoteDelete(quoteId);
      } catch (error) {
        console.error('Failed to delete quote:', error);
      }
    }
  };

  const handleSendQuote = async (quoteId: string) => {
    try {
      await onQuoteUpdate(quoteId, { status: 'sent' });
    } catch (error) {
      console.error('Failed to send quote:', error);
    }
  };

  const startEditing = (quote: LeadQuote) => {
    setEditingQuoteId(quote.id);
    setEditingQuote({
      service_type: quote.service_type,
      description: quote.description || '',
      amount: quote.amount?.toString() || '',
      currency: quote.currency,
      status: quote.status,
    });
  };

  const cancelEditing = () => {
    setEditingQuoteId(null);
    setEditingQuote({
      service_type: '',
      description: '',
      amount: '',
      currency: 'AED',
      status: 'draft',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return formatDate(dateString);
  };

  const formatAmount = (amount: number | null, currency: string) => {
    if (!amount) return 'No amount set';
    return `${currency} ${amount.toLocaleString()}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Quote Management
          <Badge variant="secondary">{quotes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Quote Form */}
        {isCreating && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Create New Quote</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="service_type">Service Type *</Label>
                <Select
                  value={newQuote.service_type}
                  onValueChange={(value) =>
                    setNewQuote(prev => ({ ...prev, service_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newQuote.status}
                  onValueChange={(value: QuoteStatus) =>
                    setNewQuote(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUOTE_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the service details..."
                value={newQuote.description}
                onChange={(e) =>
                  setNewQuote(prev => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newQuote.amount}
                  onChange={(e) =>
                    setNewQuote(prev => ({ ...prev, amount: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={newQuote.currency}
                  onValueChange={(value) =>
                    setNewQuote(prev => ({ ...prev, currency: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreating(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateQuote}
                disabled={isSubmitting || !newQuote.service_type.trim()}
              >
                {isSubmitting ? 'Creating...' : 'Create Quote'}
              </Button>
            </div>
          </div>
        )}

        {/* Add Quote Button */}
        {!isCreating && (
          <Button
            variant="outline"
            onClick={() => setIsCreating(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Quote
          </Button>
        )}

        {/* Quotes List */}
        <div className="space-y-4">
          {quotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No quotes yet</p>
              <p className="text-sm">Start by creating a quote above</p>
            </div>
          ) : (
            quotes.map((quote) => (
              <div
                key={quote.id}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {editingQuoteId === quote.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Edit Quote</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit_service_type">Service Type *</Label>
                        <Select
                          value={editingQuote.service_type}
                          onValueChange={(value) =>
                            setEditingQuote(prev => ({ ...prev, service_type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="edit_status">Status</Label>
                        <Select
                          value={editingQuote.status}
                          onValueChange={(value: QuoteStatus) =>
                            setEditingQuote(prev => ({ ...prev, status: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUOTE_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="edit_description">Description</Label>
                      <Textarea
                        id="edit_description"
                        value={editingQuote.description}
                        onChange={(e) =>
                          setEditingQuote(prev => ({ ...prev, description: e.target.value }))
                        }
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit_amount">Amount</Label>
                        <Input
                          id="edit_amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={editingQuote.amount}
                          onChange={(e) =>
                            setEditingQuote(prev => ({ ...prev, amount: e.target.value }))
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="edit_currency">Currency</Label>
                        <Select
                          value={editingQuote.currency}
                          onValueChange={(value) =>
                            setEditingQuote(prev => ({ ...prev, currency: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((currency) => (
                              <SelectItem key={currency.value} value={currency.value}>
                                {currency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleUpdateQuote(quote.id)}
                        disabled={isSubmitting || !editingQuote.service_type.trim()}
                      >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{quote.service_type}</h4>
                        <Badge className={getQuoteStatusColor(quote.status)}>
                          {QUOTE_STATUSES.find(s => s.value === quote.status)?.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400" title={formatDate(quote.created_at)}>
                          {getRelativeTime(quote.created_at)}
                        </span>
                        <div className="flex items-center gap-1">
                          {quote.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendQuote(quote.id)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
                              title="Send Quote"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(quote)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuote(quote.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {quote.description && (
                      <div className="text-sm text-gray-700 mb-3">
                        {quote.description}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatAmount(quote.amount, quote.currency)}
                      </div>

                      {quote.sent_at && (
                        <div className="text-xs text-gray-500">
                          Sent {getRelativeTime(quote.sent_at)}
                          {quote.sent_by_user_name && (
                            <span> by {quote.sent_by_user_name}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {quote.updated_at !== quote.created_at && (
                      <div className="text-xs text-gray-400 mt-2">
                        Edited {getRelativeTime(quote.updated_at)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
