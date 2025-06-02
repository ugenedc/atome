'use client';

import { useState, useEffect, FormEvent } from 'react';
import useProjectStore, { CharacterProfile } from '@/stores/projectStore';
import type { User } from '@supabase/supabase-js';

interface CharacterProfileFormProps {
  bookId: string;
  user: User;
  profileToEdit?: CharacterProfile | null;
  onClose: () => void;
  // Note: createCharacterProfile and updateCharacterProfile are now directly accessed from the store hook
}

export default function CharacterProfileForm({
  bookId,
  user,
  profileToEdit,
  onClose,
}: CharacterProfileFormProps) {
  const { createCharacterProfile, updateCharacterProfile, loadingProfiles } = useProjectStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (profileToEdit) {
      setName(profileToEdit.name || '');
      setDescription(profileToEdit.description || '');
      setRole(profileToEdit.role || '');
      setImageUrl(profileToEdit.image_url || '');
    } else {
      setName('');
      setDescription('');
      setRole('');
      setImageUrl('');
    }
    setFormError(null);
  }, [profileToEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Character name is required.');
      return;
    }

    const profileData = {
      name: name.trim(),
      description: description.trim() || null,
      role: role.trim() || null,
      image_url: imageUrl.trim() || null,
    };

    let success = false;
    if (profileToEdit) {
      const updated = await updateCharacterProfile(profileToEdit.id, profileData);
      if (updated) success = true;
    } else {
      const created = await createCharacterProfile(bookId, profileData, user);
      if (created) success = true;
    }

    if (success) {
      onClose();
    } else {
      setFormError(`Failed to ${profileToEdit ? 'update' : 'create'} profile. The store might have more error details.`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 my-4 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 space-y-4">
      <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-3">
        {profileToEdit ? 'Edit Character Profile' : 'Add New Character Profile'}
      </h4>
      
      <div>
        <label htmlFor="profileName" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Name <span className="text-red-500">*</span></label>
        <input
          id="profileName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Elara Vance"
          className="w-full p-2.5 border border-slate-300 dark:border-slate-500 rounded-md shadow-sm text-sm bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          disabled={loadingProfiles}
          required
        />
      </div>

      <div>
        <label htmlFor="profileDescription" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Description</label>
        <textarea
          id="profileDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Appearance, personality, backstory..."
          rows={4}
          className="w-full p-2.5 border border-slate-300 dark:border-slate-500 rounded-md shadow-sm text-sm bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          disabled={loadingProfiles}
        />
      </div>

      <div>
        <label htmlFor="profileRole" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Role</label>
        <input
          id="profileRole"
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g., Protagonist, Mentor"
          className="w-full p-2.5 border border-slate-300 dark:border-slate-500 rounded-md shadow-sm text-sm bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          disabled={loadingProfiles}
        />
      </div>

      <div>
        <label htmlFor="profileImageUrl" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Image URL (Optional)</label>
        <input
          id="profileImageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.png"
          className="w-full p-2.5 border border-slate-300 dark:border-slate-500 rounded-md shadow-sm text-sm bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          disabled={loadingProfiles}
        />
      </div>

      {formError && <p className="text-xs text-red-500 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">{formError}</p>}

      <div className="flex justify-end items-center space-x-3 pt-2">
        <button 
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-500/50 hover:bg-slate-200 dark:hover:bg-slate-500/80 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:focus:ring-offset-slate-700 transition-colors"
          disabled={loadingProfiles}
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-700 focus:ring-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-500 transition-colors flex items-center space-x-1.5"
          disabled={loadingProfiles || !name.trim()}
        >
          {loadingProfiles ? (
            <>
              <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{profileToEdit ? 'Saving...' : 'Creating...'}</span>
            </>           
          ) : (
            <span>{profileToEdit ? 'Save Changes' : 'Create Profile'}</span>
          )}
        </button>
      </div>
    </form>
  );
} 