'use client';

import { useState } from 'react';
import useProjectStore, { BookNote } from '@/stores/projectStore';
import useAuthStore from '@/stores/authStore';
import BookNoteForm from './BookNoteForm';
import BookNoteCard from './BookNoteCard';

export default function BookNotesSection() {
  const { user } = useAuthStore();
  const {
    currentBook,
    bookNotesByBookId,
    loadingNotes,
    error,
  } = useProjectStore();

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<BookNote | null>(null);

  const notes = currentBook ? bookNotesByBookId[currentBook.id] || [] : [];

  const handleAddNewNote = () => {
    setEditingNote(null);
    setShowNoteForm(true);
  };

  const handleEditNote = (note: BookNote) => {
    setEditingNote(note);
    setShowNoteForm(true);
  };

  const handleCloseForm = () => {
    setShowNoteForm(false);
    setEditingNote(null);
  };

  const displayError = error ? (typeof error === 'string' ? error : (error as any)?.message || 'An unknown error occurred') : null;

  if (!currentBook) {
    return null; // Should be handled by parent, or a more descriptive placeholder if needed directly here
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">Book Notes</h3>
        {!showNoteForm && (
            <button
                onClick={handleAddNewNote}
                className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-green-500 transition-colors flex items-center space-x-1.5 disabled:opacity-60"
                disabled={!currentBook || loadingNotes}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                </svg>
                <span>Add Note</span>
            </button>
        )}
      </div>

      {showNoteForm && currentBook && user && (
        <BookNoteForm 
          bookId={currentBook.id} 
          user={user}
          noteToEdit={editingNote} 
          onClose={handleCloseForm} 
        />
      )}

      {loadingNotes && notes.length === 0 && !showNoteForm && (
        <div className="text-center py-4">
          <svg className="animate-spin mx-auto h-6 w-6 text-green-500 dark:text-green-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading notes...</p>
        </div>
      )}

      {!loadingNotes && notes.length === 0 && !showNoteForm && (
        <div className="text-center py-6 px-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No book notes yet.</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Jot down your first note for this book!</p>
        </div>
      )}

      {displayError && !loadingNotes && !showNoteForm && (
        <p className="text-xs text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded-md">Error: {displayError}</p>
      )}
      
      {notes.length > 0 && !showNoteForm && (
        <div className="space-y-3">
          {notes.map(note => (
            <BookNoteCard 
              key={note.id} 
              note={note} 
              onEdit={() => handleEditNote(note)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 