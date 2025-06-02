'use client';

import { useState } from 'react';
import useProjectStore, { CharacterProfile } from '@/stores/projectStore';
import useAuthStore from '@/stores/authStore';
import CharacterProfileForm from './CharacterProfileForm'; 
import CharacterProfileCard from './CharacterProfileCard';

export default function CharacterProfilesSection() {
  const { user } = useAuthStore();
  const {
    currentBook,
    characterProfilesByBookId,
    loadingProfiles,
    error,
  } = useProjectStore();

  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CharacterProfile | null>(null);

  const profiles = currentBook ? characterProfilesByBookId[currentBook.id] || [] : [];

  const handleAddNewProfile = () => {
    setEditingProfile(null);
    setShowProfileForm(true);
  };

  const handleEditProfile = (profile: CharacterProfile) => {
    setEditingProfile(profile);
    setShowProfileForm(true);
  };

  const handleCloseForm = () => {
    setShowProfileForm(false);
    setEditingProfile(null);
  };

  const displayError = error ? (typeof error === 'string' ? error : (error as any)?.message || 'An unknown error occurred') : null;

  if (!currentBook) {
    return (
      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
        Select a book to see character profiles.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">Character Profiles</h3>
        {!showProfileForm && (
          <button
            onClick={handleAddNewProfile}
            className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 dark:focus:ring-blue-500 transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            disabled={!currentBook || loadingProfiles} 
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Add New</span>
          </button>
        )}
      </div>

      {showProfileForm && currentBook && user && (
        <CharacterProfileForm 
          bookId={currentBook.id} 
          user={user}
          profileToEdit={editingProfile}
          onClose={handleCloseForm} 
        />
      )}

      {loadingProfiles && profiles.length === 0 && !showProfileForm && (
        <div className="text-center py-4">
          <svg className="animate-spin mx-auto h-6 w-6 text-blue-500 dark:text-blue-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading profiles...</p>
        </div>
      )}

      {!loadingProfiles && profiles.length === 0 && !showProfileForm && (
        <div className="text-center py-6 px-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.982V17.982C11.096 17.982 9.788 17.982 8.31 17.982C6.832 17.982 5.524 17.982 4.62 17.982C3.716 17.982 3 17.266 3 16.362V9.638C3 8.734 3.716 8.018 4.62 8.018C5.524 8.018 6.832 8.018 8.31 8.018C9.788 8.018 11.096 8.018 12 8.018C12.904 8.018 14.212 8.018 15.69 8.018C17.168 8.018 18.476 8.018 19.38 8.018C20.284 8.018 21 8.734 21 9.638V16.362C21 17.266 20.284 17.982 19.38 17.982C18.476 17.982 17.168 17.982 15.69 17.982C14.212 17.982 12.904 17.982 12 17.982ZM9 13.5A1.5 1.5 0 1 1 7.5 12A1.5 1.5 0 0 1 9 13.5ZM12 15V12M14.25 12H17.25" />
          </svg>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No character profiles yet.</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add your first character to get started!</p>
        </div>
      )}

      {displayError && !loadingProfiles && !showProfileForm && (
        <p className="text-xs text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded-md">Error: {displayError}</p>
      )}
      
      {profiles.length > 0 && !showProfileForm && (
        <div className="space-y-3">
          {profiles.map(profile => (
            <CharacterProfileCard 
              key={profile.id} 
              profile={profile} 
              onEdit={() => handleEditProfile(profile)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 