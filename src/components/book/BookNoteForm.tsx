'use client';

import { useState, useEffect, FormEvent } from 'react';
import useProjectStore, { BookNote } from '@/stores/projectStore';
import type { User } from '@supabase/supabase-js';

interface BookNoteFormProps {
  bookId: string;
  user: User;
  noteToEdit?: BookNote | null;
  onClose: () => void;
}

export default function BookNoteForm({
  bookId,
  user,
  noteToEdit,
  onClose,
}: BookNoteFormProps) {
  const { createBookNote, updateBookNote, loadingNotes } = useProjectStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (noteToEdit) {
      setTitle(noteToEdit.title || '');
      setContent(noteToEdit.content || '');
    } else {
      setTitle('');
      setContent('');
    }
    setFormError(null);
  }, [noteToEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Note title is required.');
      return;
    }

    const noteData = {
      title: title.trim(),
      content: content.trim() || null,
    };

    let success = false;
    if (noteToEdit) {
      const updated = await updateBookNote(noteToEdit.id, noteData);
      if (updated) success = true;
    } else {
      const created = await createBookNote(bookId, noteData, user);
      if (created) success = true;
    }

    if (success) {
      onClose();
    } else {
      setFormError(`Failed to ${noteToEdit ? 'update' : 'create'} note. See console for details.`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 my-4 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 space-y-4">
      <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-3">
        {noteToEdit ? 'Edit Book Note' : 'Add New Book Note'}
      </h4>
      
      <div>
        <label htmlFor="noteTitle" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Title <span className="text-red-500">*</span></label>
        <input
          id="noteTitle"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Plot Idea, Chapter Outline"
          className="w-full p-2.5 border border-slate-300 dark:border-slate-500 rounded-md shadow-sm text-sm bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          disabled={loadingNotes}
          required
        />
      </div>

      <div>
        <label htmlFor="noteContent" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Content</label>
        <textarea
          id="noteContent"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Jot down your notes, ideas, or outlines here..."
          rows={8} // Increased rows for more content
          className="w-full p-2.5 border border-slate-300 dark:border-slate-500 rounded-md shadow-sm text-sm bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          disabled={loadingNotes}
        />
      </div>

      {formError && <p className="text-xs text-red-500 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">{formError}</p>}

      <div className="flex justify-end items-center space-x-3 pt-2">
        <button 
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-500/50 hover:bg-slate-200 dark:hover:bg-slate-500/80 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:focus:ring-offset-slate-700 transition-colors"
          disabled={loadingNotes}
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="px-4 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-700 focus:ring-green-500 disabled:bg-slate-400 dark:disabled:bg-slate-500 transition-colors flex items-center space-x-1.5"
          disabled={loadingNotes || !title.trim()}
        >
          {loadingNotes ? (
            <>
              <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{noteToEdit ? 'Saving...' : 'Creating...'}</span>
            </>
          ) : (
            <span>{noteToEdit ? 'Save Note' : 'Create Note'}</span>
          )}
        </button>
      </div>
    </form>
  );
} 