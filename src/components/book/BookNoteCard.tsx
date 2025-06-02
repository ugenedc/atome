'use client';

import useProjectStore, { BookNote } from '@/stores/projectStore';
import { useState } from 'react';
import ConfirmationModal from '@/components/common/ConfirmationModal';

interface BookNoteCardProps {
  note: BookNote;
  onEdit: () => void;
}

export default function BookNoteCard({ note, onEdit }: BookNoteCardProps) {
  const { deleteBookNote, loadingNotes } = useProjectStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeletingForThisCard, setIsDeletingForThisCard] = useState(false);

  const handleDeleteRequest = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeletingForThisCard(true);
    await deleteBookNote(note.id);
    setIsDeletingForThisCard(false);
    setIsConfirmModalOpen(false);
  };

  const toggleExpand = () => setIsExpanded(!isExpanded);

  // Show a snippet of content if not expanded, or full content if expanded
  const displayContent = note.content ? 
    (isExpanded ? note.content : `${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}`)
    : 'No content.';

  return (
    <>
      <div className="bg-white dark:bg-slate-700/50 p-3.5 rounded-lg shadow border border-slate-200 dark:border-slate-600/50 hover:shadow-md transition-shadow duration-150">
        <div className="flex justify-between items-start">
          <h4 
            className="text-md font-semibold text-green-600 dark:text-green-400 cursor-pointer hover:underline truncate pr-2"
            title={note.title}
            onClick={toggleExpand}
          >
            {note.title}
          </h4>
          {/* Can add a small expand/collapse icon here if desired */}
        </div>

        <p 
          className={`text-sm mt-1.5 text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words ${isExpanded ? '' : 'line-clamp-3'}`}
          onClick={toggleExpand}
        >
          {displayContent}
        </p>
        {note.content && note.content.length > 100 && (
          <button 
            onClick={toggleExpand} 
            className="text-xs text-green-600 dark:text-green-400 hover:underline mt-1.5 focus:outline-none">
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}

        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600/50 flex items-center justify-end space-x-2">
          <button
            onClick={onEdit}
            className="px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 dark:focus:ring-offset-slate-700 transition-colors disabled:opacity-50"
            disabled={loadingNotes || isDeletingForThisCard}
          >
            Edit
          </button>
          <button
            onClick={handleDeleteRequest}
            className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-100 dark:bg-red-700/20 hover:bg-red-200 dark:hover:bg-red-700/40 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 dark:focus:ring-offset-slate-700 transition-colors disabled:opacity-50"
            disabled={loadingNotes || isDeletingForThisCard}
          >
            Delete
          </button>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Book Note"
        message={
          <span>
            Are you sure you want to delete the note <strong className="font-semibold text-slate-700 dark:text-slate-200">{note.title}</strong>? 
            This action cannot be undone.
          </span>
        }
        confirmButtonText={isDeletingForThisCard ? 'Deleting...' : 'Delete'}
        isLoading={isDeletingForThisCard}
        confirmButtonVariant="danger"
      />
    </>
  );
} 