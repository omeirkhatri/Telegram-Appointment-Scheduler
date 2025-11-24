'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LeadNote } from '@/types/lead';
import {
    Edit,
    MessageSquare,
    Pin,
    Plus,
    Trash2,
    X
} from 'lucide-react';
import { useState } from 'react';

interface NotesManagementProps {
  leadId: string;
  notes: LeadNote[];
  onNoteCreate: (note: Omit<LeadNote, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onNoteUpdate: (noteId: string, note: Partial<LeadNote>) => Promise<void>;
  onNoteDelete: (noteId: string) => Promise<void>;
  currentUserId: string;
  currentUserName: string;
  className?: string;
}

export function NotesManagement({
  leadId,
  notes,
  onNoteCreate,
  onNoteUpdate,
  onNoteDelete,
  currentUserId,
  currentUserName,
  className = '',
}: NotesManagementProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState({
    note: '',
    is_pinned: false,
  });
  const [editingNote, setEditingNote] = useState({
    note: '',
    is_pinned: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sort notes: pinned first, then by creation date
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleCreateNote = async () => {
    if (!newNote.note.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const noteData = {
        lead_id: leadId,
        user_id: currentUserId,
        user_name: currentUserName,
        note: newNote.note.trim(),
        is_pinned: newNote.is_pinned,
      };

      await onNoteCreate(noteData);

      // Reset form
      setNewNote({
        note: '',
        is_pinned: false,
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingNote.note.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onNoteUpdate(noteId, {
        note: editingNote.note.trim(),
        is_pinned: editingNote.is_pinned,
      });

      setEditingNoteId(null);
      setEditingNote({
        note: '',
        is_pinned: false,
      });
    } catch (error) {
      console.error('Failed to update note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      try {
        await onNoteDelete(noteId);
      } catch (error) {
        console.error('Failed to delete note:', error);
      }
    }
  };

  const startEditing = (note: LeadNote) => {
    setEditingNoteId(note.id);
    setEditingNote({
      note: note.note,
      is_pinned: note.is_pinned,
    });
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingNote({
      note: '',
      is_pinned: false,
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

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notes Management
          <Badge variant="secondary">{notes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Note Form */}
        {isCreating && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Add New Note</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <Label htmlFor="note">Note Content *</Label>
              <Textarea
                id="note"
                placeholder="Write your note here..."
                value={newNote.note}
                onChange={(e) =>
                  setNewNote(prev => ({ ...prev, note: e.target.value }))
                }
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_pinned"
                checked={newNote.is_pinned}
                onChange={(e) =>
                  setNewNote(prev => ({ ...prev, is_pinned: e.target.checked }))
                }
                className="rounded"
              />
              <Label htmlFor="is_pinned" className="flex items-center gap-2">
                <Pin className="h-4 w-4" />
                Pin this note
              </Label>
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
                onClick={handleCreateNote}
                disabled={isSubmitting || !newNote.note.trim()}
              >
                {isSubmitting ? 'Creating...' : 'Create Note'}
              </Button>
            </div>
          </div>
        )}

        {/* Add Note Button */}
        {!isCreating && (
          <Button
            variant="outline"
            onClick={() => setIsCreating(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        )}

        {/* Notes List */}
        <div className="space-y-4">
          {sortedNotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notes yet</p>
              <p className="text-sm">Start by adding a note above</p>
            </div>
          ) : (
            sortedNotes.map((note) => (
              <div
                key={note.id}
                className={`p-4 border rounded-lg transition-colors ${
                  note.is_pinned ? 'bg-yellow-50 border-yellow-200' : 'hover:bg-gray-50'
                }`}
              >
                {editingNoteId === note.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Edit Note</h4>
                        {note.is_pinned && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Pin className="h-3 w-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div>
                      <Label htmlFor="edit_note">Note Content *</Label>
                      <Textarea
                        id="edit_note"
                        value={editingNote.note}
                        onChange={(e) =>
                          setEditingNote(prev => ({ ...prev, note: e.target.value }))
                        }
                        rows={4}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="edit_is_pinned"
                        checked={editingNote.is_pinned}
                        onChange={(e) =>
                          setEditingNote(prev => ({ ...prev, is_pinned: e.target.checked }))
                        }
                        className="rounded"
                      />
                      <Label htmlFor="edit_is_pinned" className="flex items-center gap-2">
                        <Pin className="h-4 w-4" />
                        Pin this note
                      </Label>
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
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={isSubmitting || !editingNote.note.trim()}
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
                        <span className="text-sm font-medium text-gray-700">
                          {note.user_name}
                        </span>
                        {note.is_pinned && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Pin className="h-3 w-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400" title={formatDate(note.created_at)}>
                          {getRelativeTime(note.created_at)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(note)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {note.note}
                    </div>

                    {note.updated_at !== note.created_at && (
                      <div className="text-xs text-gray-400 mt-2">
                        Edited {getRelativeTime(note.updated_at)}
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
