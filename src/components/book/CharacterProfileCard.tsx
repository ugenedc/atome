'use client';

import useProjectStore, { CharacterProfile } from '@/stores/projectStore';
import Image from 'next/image'; // Using next/image for optimized image handling, though direct <img> is also fine for URLs.
import { useState } from 'react'; // Added useState
import ConfirmationModal from '@/components/common/ConfirmationModal'; // Import the modal

interface CharacterProfileCardProps {
  profile: CharacterProfile;
  onEdit: () => void;
  // deleteProfile action will be accessed from the store directly in handleDelete
}

export default function CharacterProfileCard({
  profile,
  onEdit,
}: CharacterProfileCardProps) {
  const { deleteCharacterProfile, loadingProfiles } = useProjectStore();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  // No separate isDeleting state needed here if store's loadingProfiles is used by modal, 
  // or if the toast system provides enough feedback.
  // However, for consistency with BookPage and potential direct loading indicator on button if needed:
  const [isDeletingForThisCard, setIsDeletingForThisCard] = useState(false); 

  const handleDeleteRequest = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeletingForThisCard(true);
    await deleteCharacterProfile(profile.id); 
    // Toasts (loading, success, error) are handled by deleteCharacterProfile in the store.
    setIsDeletingForThisCard(false);
    setIsConfirmModalOpen(false);
    // The list will re-render due to store update if successful
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-700/50 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-600/50 hover:shadow-md transition-shadow duration-150">
        <div className="flex items-start space-x-4">
          {profile.image_url ? (
            <div className="relative h-16 w-16 rounded-md overflow-hidden ring-1 ring-slate-300 dark:ring-slate-600 flex-shrink-0">
              <Image 
                src={profile.image_url} 
                alt={`Image of ${profile.name}`}
                layout="fill"
                objectFit="cover"
                onError={(e) => (e.currentTarget.style.display = 'none')} // Hide if image fails to load
              />
              {/* Fallback if image fails or for styling purposes */}
              <div 
                className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-600 text-slate-400 dark:text-slate-300 text-xs"
                style={{ display: profile.image_url ? 'none' : 'flex' }} // Show if no image_url or onError (though onError hides parent)
              >
                No Image
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 h-16 w-16 rounded-md bg-slate-100 dark:bg-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-300 ring-1 ring-slate-300 dark:ring-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
          <div className="flex-grow min-w-0">
            <h4 className="text-md font-semibold text-blue-600 dark:text-blue-400 truncate" title={profile.name}>{profile.name}</h4>
            {profile.role && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 truncate" title={profile.role}>Role: {profile.role}</p>
            )}
            {profile.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap break-words line-clamp-3 hover:line-clamp-none transition-all">
                {profile.description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600/50 flex items-center justify-end space-x-2">
          <button
            onClick={onEdit}
            className="px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 dark:focus:ring-offset-slate-700 transition-colors disabled:opacity-50"
            disabled={loadingProfiles || isDeletingForThisCard} // Disable if any profile action is loading
          >
            Edit
          </button>
          <button
            onClick={handleDeleteRequest} // Open modal
            className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-100 dark:bg-red-700/20 hover:bg-red-200 dark:hover:bg-red-700/40 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 dark:focus:ring-offset-slate-700 transition-colors disabled:opacity-50"
            disabled={loadingProfiles || isDeletingForThisCard} // Disable if any profile action is loading
          >
            Delete
          </button>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Character Profile"
        message={
          <span>
            Are you sure you want to delete the profile for <strong className="font-semibold text-slate-700 dark:text-slate-200">{profile.name}</strong>? 
            This action cannot be undone.
          </span>
        }
        confirmButtonText={isDeletingForThisCard ? 'Deleting...' : 'Delete'}
        isLoading={isDeletingForThisCard} // Use local deleting state for the modal button
        confirmButtonVariant="danger"
      />
    </>
  );
} 