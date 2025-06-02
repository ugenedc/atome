import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import type { User, PostgrestError } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// Define interfaces for Book and Chapter
export interface Book {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  user_id: string;
  title: string;
  content: string | null;
  chapter_order: number | null;
  created_at: string;
  updated_at: string | null;
}

// New Interfaces for Character Profiles and Book Notes
export interface CharacterProfile {
  id: string;
  book_id: string;
  user_id: string;
  name: string;
  description?: string | null;
  role?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface BookNote {
  id: string;
  book_id: string;
  user_id: string;
  title: string;
  content?: string | null; // Assuming content can be Markdown/text
  created_at: string;
  updated_at: string | null;
}

// A more specific error type for Supabase errors or general errors
type StoreError = PostgrestError | Error | { message: string; [key: string]: unknown };

interface ProjectState {
  books: Book[];
  chaptersByBookId: Record<string, Chapter[]>;
  characterProfilesByBookId: Record<string, CharacterProfile[]>; // New state for profiles
  bookNotesByBookId: Record<string, BookNote[]>; // New state for notes
  currentBook: Book | null;
  currentChapter: Chapter | null;
  loadingBooks: boolean;
  loadingChapters: boolean;
  loadingProfiles: boolean; // New loading state for profiles
  loadingNotes: boolean;    // New loading state for notes
  error: StoreError | string | null; // Allow string for simple messages too
  fetchBooks: (user: User) => Promise<void>;
  fetchBookById: (bookId: string, user: User) => Promise<Book | null>;
  createBook: (title: string, user: User) => Promise<Book | null>;
  deleteBook: (bookId: string) => Promise<void>;
  setCurrentBook: (book: Book | null) => Promise<void>;
  fetchChaptersForBook: (bookId: string, user: User) => Promise<void>;
  createChapter: (bookId: string, title: string, user: User) => Promise<Chapter | null>;
  updateChapterContent: (chapterId: string, content: string) => Promise<void>;
  updateChapterOrder: (chapters: Chapter[]) => Promise<void>;
  deleteChapter: (chapterId: string) => Promise<void>;
  setCurrentChapter: (chapter: Chapter | null) => void;
  // New actions for Character Profiles
  fetchCharacterProfiles: (bookId: string, user: User) => Promise<void>;
  createCharacterProfile: (bookId: string, profileData: Omit<CharacterProfile, 'id' | 'user_id' | 'book_id' | 'created_at' | 'updated_at'>, user: User) => Promise<CharacterProfile | null>;
  updateCharacterProfile: (profileId: string, profileData: Partial<Omit<CharacterProfile, 'id' | 'user_id' | 'book_id' | 'created_at'>>) => Promise<CharacterProfile | null>;
  deleteCharacterProfile: (profileId: string) => Promise<void>;
  // New actions for Book Notes
  fetchBookNotes: (bookId: string, user: User) => Promise<void>;
  createBookNote: (bookId: string, noteData: Omit<BookNote, 'id' | 'user_id' | 'book_id' | 'created_at' | 'updated_at'>, user: User) => Promise<BookNote | null>;
  updateBookNote: (noteId: string, noteData: Partial<Omit<BookNote, 'id' | 'user_id' | 'book_id' | 'created_at'>>) => Promise<BookNote | null>;
  deleteBookNote: (noteId: string) => Promise<void>;
  clearProjectData: () => void;
}

const useProjectStore = create<ProjectState>((set, get) => ({
  books: [],
  chaptersByBookId: {},
  characterProfilesByBookId: {}, // Initialize new state
  bookNotesByBookId: {},       // Initialize new state
  currentBook: null,
  currentChapter: null,
  loadingBooks: false,
  loadingChapters: false,
  loadingProfiles: false,      // Initialize new loading state
  loadingNotes: false,         // Initialize new loading state
  error: null,

  fetchBooks: async (user) => {
    if (!user) return set({ books: [], loadingBooks: false });
    set({ loadingBooks: true, error: null });
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ books: data || [], loadingBooks: false });
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error fetching books:', error);
      set({ error: error.message || 'Failed to fetch books', loadingBooks: false });
      toast.error(error.message || 'Failed to fetch books');
    }
  },

  fetchBookById: async (bookId, user) => {
    if (!user) {
      set({ error: 'User not authenticated for fetchBookById' });
      toast.error('User not authenticated.');
      return null;
    }
    set({ loadingBooks: true, error: null });
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', bookId)
        .single(); // We expect only one book or null

      if (error && error.code !== 'PGRST116') { // PGRST116: Row toట్టుsingledisplayed
        throw error;
      }

      if (data) {
        // Add or update this book in the main books array if not already there or outdated
        set(state => {
          const bookExists = state.books.find(b => b.id === data.id);
          let newBooksArray = state.books;
          if (bookExists) {
            newBooksArray = state.books.map(b => b.id === data.id ? data as Book : b);
          } else {
            newBooksArray = [...state.books, data as Book];
          }
          return { books: newBooksArray, loadingBooks: false };
        });
        return data as Book;
      } else {
        set({ error: `Book with ID ${bookId} not found.`, loadingBooks: false });
        return null;
      }
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error(`Error fetching book ${bookId}:`, error);
      const message = error.message || `Failed to fetch book ${bookId}`;
      set({ error: message, loadingBooks: false });
      toast.error(message);
      return null;
    }
  },

  createBook: async (title, user) => {
    if (!user) {
      set({ error: 'User not authenticated' });
      toast.error('User not authenticated to create book.');
      return null;
    }
    set({ loadingBooks: true, error: null });
    const loadingToastId = toast.loading('Creating book...');
    try {
      const { data, error } = await supabase
        .from('books')
        .insert([{ title, user_id: user.id }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        const newBook = data[0] as Book;
        set((state) => ({ books: [newBook, ...state.books], loadingBooks: false }));
        toast.success(`Book "${newBook.title}" created!`, { id: loadingToastId });
        return newBook;
      }
      toast.dismiss(loadingToastId);
      return null;
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error creating book:', error);
      const message = error.message || 'Failed to create book';
      set({ error: message, loadingBooks: false });
      toast.error(message, { id: loadingToastId });
      return null;
    }
  },

  deleteBook: async (bookId) => {
    set({ loadingBooks: true, error: null });
    const bookToDelete = get().books.find(b => b.id === bookId);
    const loadingToastId = toast.loading(`Deleting book "${bookToDelete?.title || '...'}"...`);
    try {
      const { error: deleteError } = await supabase.from('books').delete().eq('id', bookId);
      if (deleteError) throw deleteError;
      set((state) => {
        const newChaptersByBookId = { ...state.chaptersByBookId };
        delete newChaptersByBookId[bookId];
        const newCharacterProfilesByBookId = { ...state.characterProfilesByBookId }; // Clear profiles
        delete newCharacterProfilesByBookId[bookId];
        const newBookNotesByBookId = { ...state.bookNotesByBookId }; // Clear notes
        delete newBookNotesByBookId[bookId];

        return {
          books: state.books.filter((book) => book.id !== bookId),
          chaptersByBookId: newChaptersByBookId,
          characterProfilesByBookId: newCharacterProfilesByBookId,
          bookNotesByBookId: newBookNotesByBookId,
          currentBook: state.currentBook?.id === bookId ? null : state.currentBook,
          currentChapter: state.currentBook?.id === bookId ? null : state.currentChapter,
          loadingBooks: false,
        };
      });
      toast.success(`Book "${bookToDelete?.title || 'Selected Book'}" deleted.`, { id: loadingToastId });
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error deleting book:', error);
      const message = error.message || 'Failed to delete book';
      set({ error: message, loadingBooks: false });
      toast.error(message, { id: loadingToastId });
    }
  },

  setCurrentBook: async (book) => {
    set({
      currentBook: book, 
      currentChapter: null, 
      chaptersByBookId: book ? get().chaptersByBookId : {},
      characterProfilesByBookId: book ? get().characterProfilesByBookId : {},
      bookNotesByBookId: book ? get().bookNotesByBookId : {},
    });
    if (book) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // These fetches will update their respective loading states and data slices
        // and their own error toasts if applicable.
        // No explicit toast here for setCurrentBook itself, as it's a state change trigger.
        await Promise.all([
          get().fetchChaptersForBook(book.id, user),
          get().fetchCharacterProfiles(book.id, user),
          get().fetchBookNotes(book.id, user)
        ]);
      } else {
        toast.error("Could not fetch book details: User session not found.");
      }
    } 
  },

  fetchChaptersForBook: async (bookId, user) => {
    if (!user) {
      set(state => ({ chaptersByBookId: { ...state.chaptersByBookId, [bookId]: [] }, loadingChapters: false }));
      // No toast here as it's an internal call from setCurrentBook usually, user not primary trigger
      return;
    }
    set({ loadingChapters: true, error: null });
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .order('chapter_order', { ascending: true, nullsFirst: false });
      if (error) throw error;
      set((state) => ({
        chaptersByBookId: { ...state.chaptersByBookId, [bookId]: data || [] },
        loadingChapters: false,
      }));
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error(`Error fetching chapters for book ${bookId}:`, error);
      const message = error.message || `Failed to fetch chapters for book ${bookId}`;
      set({ error: message, loadingChapters: false });
      toast.error(message);
    }
  },

  createChapter: async (bookId, title, user) => {
    if (!user) {
      set({ error: 'User not authenticated' });
      toast.error('User not authenticated to create chapter.');
      return null;
    }
    set({ loadingChapters: true, error: null });
    const loadingToastId = toast.loading('Creating chapter...');
    try {
      const currentChapters = get().chaptersByBookId[bookId] || [];
      const maxOrder = currentChapters.reduce((max, chap) => Math.max(max, chap.chapter_order || 0), 0);

      const { data, error } = await supabase
        .from('chapters')
        .insert([{ title, book_id: bookId, user_id: user.id, chapter_order: maxOrder + 1 }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        const newChapter = data[0] as Chapter;
        set((state) => ({
          chaptersByBookId: {
            ...state.chaptersByBookId,
            [bookId]: [...(state.chaptersByBookId[bookId] || []), newChapter].sort((a,b) => (a.chapter_order || 0) - (b.chapter_order || 0)),
          },
          loadingChapters: false,
        }));
        toast.success(`Chapter "${newChapter.title}" created!`, { id: loadingToastId });
        return newChapter;
      }
      toast.dismiss(loadingToastId); // Dismiss if no data came back but no error
      return null;
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error creating chapter:', error);
      const message = error.message || 'Failed to create chapter';
      set({ error: message, loadingChapters: false });
      toast.error(message, { id: loadingToastId });
      return null;
    }
  },

  updateChapterContent: async (chapterId, content) => {
    // For content updates, toast is handled in BookPage for more immediate UI feedback (Saving... Saved)
    // Only show error toast here if the operation itself fails unexpectedly.
    set({ error: null }); // Clear previous errors specific to this op if any
    try {
      const { data, error } = await supabase
        .from('chapters')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', chapterId)
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        const updatedChapter = data[0] as Chapter;
        set((state) => ({
          chaptersByBookId: {
            ...state.chaptersByBookId,
            [updatedChapter.book_id]: (state.chaptersByBookId[updatedChapter.book_id] || []).map(chap =>
              chap.id === updatedChapter.id ? updatedChapter : chap
            ),
          },
          currentChapter: state.currentChapter?.id === updatedChapter.id ? updatedChapter : state.currentChapter,
          // loadingChapters: false, // Keep as true if parent component handles it for saving indicator
        }));
        // Success toast might be better handled by the calling component if it shows a saving indicator
      } else {
        // This case might mean the chapter wasn't found or user doesn't have permission
        throw new Error('Chapter not found or update failed.');
      }
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error updating chapter content:', error);
      const message = error.message || 'Failed to save chapter content.';
      set({ error: message });
      toast.error(message);
      // Re-throw or handle as appropriate if the calling component needs to know about failure
      throw error; // Re-throw so the calling component (BookPage) can stop its saving indicator.
    }
  },

  updateChapterOrder: async (chaptersToUpdate: Chapter[]) => {
    if (chaptersToUpdate.length === 0) return;
    set({ loadingChapters: true, error: null });
    const loadingToastId = toast.loading('Updating chapter order...');
    try {
      const updates = chaptersToUpdate.map((chapter, index) => ({
        id: chapter.id,
        chapter_order: index + 1,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase.from('chapters').upsert(updates);
      if (upsertError) throw upsertError;

      const bookId = chaptersToUpdate[0].book_id;
      set(state => {
        const updatedChaptersForBook = (state.chaptersByBookId[bookId] || []).map(ch => {
            const foundUpdate = updates.find(u => u.id === ch.id);
            return foundUpdate ? { ...ch, chapter_order: foundUpdate.chapter_order, updated_at: foundUpdate.updated_at } : ch;
        }).sort((a,b) => (a.chapter_order || 0) - (b.chapter_order || 0));

        return {
            chaptersByBookId: {
                ...state.chaptersByBookId,
                [bookId]: updatedChaptersForBook,
            },
            loadingChapters: false,
        }
      });
      toast.success('Chapter order updated.', { id: loadingToastId });
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error updating chapter order:', error);
      const message = error.message || 'Failed to update chapter order';
      set({ error: message, loadingChapters: false });
      toast.error(message, { id: loadingToastId });
    }
  },

  deleteChapter: async (chapterId) => {
    set({ loadingChapters: true, error: null });
    const chapterToDelete = Object.values(get().chaptersByBookId).flat().find(ch => ch.id === chapterId);
    const loadingToastId = toast.loading(`Deleting chapter "${chapterToDelete?.title || '...'}"...`); 
    try {
      let bookIdToDeleteFrom: string | undefined = undefined;
      const chaptersByBook = get().chaptersByBookId;
      for (const bkId in chaptersByBook) {
        if (chaptersByBook[bkId].some(ch => ch.id === chapterId)) {
          bookIdToDeleteFrom = bkId;
          break;
        }
      }

      const { error: deleteError } = await supabase.from('chapters').delete().eq('id', chapterId);
      if (deleteError) throw deleteError;

      if (bookIdToDeleteFrom) {
        const finalBookId = bookIdToDeleteFrom;
        set((state) => ({
          chaptersByBookId: {
            ...state.chaptersByBookId,
            [finalBookId]: (state.chaptersByBookId[finalBookId] || []).filter((chap) => chap.id !== chapterId),
          },
          currentChapter: state.currentChapter?.id === chapterId ? null : state.currentChapter,
          loadingChapters: false,
        }));
      } else {
         set({ loadingChapters: false });
      }
      toast.dismiss(loadingToastId);
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error deleting chapter:', error);
      const message = error.message || 'Failed to delete chapter';
      set({ error: message, loadingChapters: false });
      toast.error(message, { id: loadingToastId });
    }
  },

  setCurrentChapter: (chapter) => {
    set({ currentChapter: chapter });
    // No toast for simple state selection change
  },

  // --- Character Profile Actions ---
  fetchCharacterProfiles: async (bookId, user) => {
    if (!user) {
      set(state => ({ characterProfilesByBookId: { ...state.characterProfilesByBookId, [bookId]: [] }, loadingProfiles: false }));
      // No toast, internal call from setCurrentBook
      return;
    }
    set({ loadingProfiles: true, error: null });
    try {
      const { data, error } = await supabase
        .from('character_profiles')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      set((state) => ({
        characterProfilesByBookId: { ...state.characterProfilesByBookId, [bookId]: data || [] },
        loadingProfiles: false,
      }));
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error(`Error fetching profiles for book ${bookId}:`, error);
      const message = error.message || `Failed to fetch profiles for book ${bookId}`;
      set({ error: message, loadingProfiles: false });
      toast.error(message);
    }
  },

  createCharacterProfile: async (bookId, profileData, user) => {
    if (!user) {
      set({ error: 'User not authenticated for createCharacterProfile' });
      toast.error('User not authenticated to create profile.');
      return null;
    }
    set({ loadingProfiles: true, error: null });
    const loadingToastId = toast.loading('Creating character profile...');
    try {
      const { data, error } = await supabase
        .from('character_profiles')
        .insert([{ ...profileData, book_id: bookId, user_id: user.id }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        const newProfile = data[0] as CharacterProfile;
        set((state) => ({
          characterProfilesByBookId: {
            ...state.characterProfilesByBookId,
            [bookId]: [...(state.characterProfilesByBookId[bookId] || []), newProfile],
          },
          loadingProfiles: false,
        }));
        toast.success(`Profile "${newProfile.name}" created!`, { id: loadingToastId });
        return newProfile;
      }
      toast.dismiss(loadingToastId);
      return null;
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error creating profile:', error);
      const message = error.message || 'Failed to create profile.';
      set({ error: message, loadingProfiles: false });
      toast.error(message, { id: loadingToastId });
      return null;
    }
  },

  updateCharacterProfile: async (profileId, profileData) => {
    set({ loadingProfiles: true, error: null });
    const profileName = profileData.name || get().characterProfilesByBookId[Object.keys(get().characterProfilesByBookId).find(bookId => get().characterProfilesByBookId[bookId].some(p => p.id === profileId)) || '']?.find(p => p.id === profileId)?.name || '...';
    const loadingToastId = toast.loading(`Updating profile "${profileName}"...`);
    try {
      const { data, error } = await supabase
        .from('character_profiles')
        .update({ ...profileData, updated_at: new Date().toISOString() })
        .eq('id', profileId)
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        const updatedProfile = data[0] as CharacterProfile;
        set((state) => ({
          characterProfilesByBookId: {
            ...state.characterProfilesByBookId,
            [updatedProfile.book_id]: (state.characterProfilesByBookId[updatedProfile.book_id] || []).map(p =>
              p.id === updatedProfile.id ? updatedProfile : p
            ),
          },
          loadingProfiles: false,
        }));
        toast.success(`Profile "${updatedProfile.name}" updated.`, { id: loadingToastId });
        return updatedProfile;
      }
      toast.dismiss(loadingToastId);
      return null;
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error updating profile:', error);
      const message = error.message || 'Failed to update profile.';
      set({ error: message, loadingProfiles: false });
      toast.error(message, { id: loadingToastId });
      return null;
    }
  },

  deleteCharacterProfile: async (profileId) => {
    set({ loadingProfiles: true, error: null });
    const profileToDelete = Object.values(get().characterProfilesByBookId).flat().find(p => p.id === profileId);
    const loadingToastId = toast.loading(`Deleting profile "${profileToDelete?.name || '...'}"...`);
    try {
      // Find which book this profile belongs to for store update
      let bookIdForProfile: string | undefined = undefined;
      const profilesByBook = get().characterProfilesByBookId;
      for (const bkId in profilesByBook) {
        if (profilesByBook[bkId].some(p => p.id === profileId)) {
          bookIdForProfile = bkId;
          break;
        }
      }

      const { error: deleteError } = await supabase.from('character_profiles').delete().eq('id', profileId);
      if (deleteError) throw deleteError;

      if (bookIdForProfile) {
        const finalBookId = bookIdForProfile;
        set((state) => ({
          characterProfilesByBookId: {
            ...state.characterProfilesByBookId,
            [finalBookId]: (state.characterProfilesByBookId[finalBookId] || []).filter((p) => p.id !== profileId),
          },
          loadingProfiles: false,
        }));
      } else {
        set({ loadingProfiles: false }); // Should ideally always find a bookId
      }
      toast.success(`Profile "${profileToDelete?.name || 'Selected Profile'}" deleted.`, { id: loadingToastId });
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error deleting profile:', error);
      const message = error.message || 'Failed to delete profile.';
      set({ error: message, loadingProfiles: false });
      toast.error(message, { id: loadingToastId });
    }
  },

  // --- Book Note Actions ---
  fetchBookNotes: async (bookId, user) => {
    if (!user) {
      set(state => ({ bookNotesByBookId: { ...state.bookNotesByBookId, [bookId]: [] }, loadingNotes: false }));
      // No toast, internal call
      return;
    }
    set({ loadingNotes: true, error: null });
    try {
      const { data, error } = await supabase
        .from('book_notes')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      set((state) => ({
        bookNotesByBookId: { ...state.bookNotesByBookId, [bookId]: data || [] },
        loadingNotes: false,
      }));
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error(`Error fetching notes for book ${bookId}:`, error);
      const message = error.message || `Failed to fetch notes for book ${bookId}`;
      set({ error: message, loadingNotes: false });
      toast.error(message);
    }
  },

  createBookNote: async (bookId, noteData, user) => {
    if (!user) {
      set({ error: 'User not authenticated for createBookNote' });
      toast.error('User not authenticated to create note.');
      return null;
    }
    set({ loadingNotes: true, error: null });
    const loadingToastId = toast.loading('Creating note...');
    try {
      const { data, error } = await supabase
        .from('book_notes')
        .insert([{ ...noteData, book_id: bookId, user_id: user.id }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        const newNote = data[0] as BookNote;
        set((state) => ({
          bookNotesByBookId: {
            ...state.bookNotesByBookId,
            [bookId]: [...(state.bookNotesByBookId[bookId] || []), newNote],
          },
          loadingNotes: false,
        }));
        toast.success(`Note "${newNote.title}" created!`, { id: loadingToastId });
        return newNote;
      }
      toast.dismiss(loadingToastId);
      return null;
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error creating note:', error);
      const message = error.message || 'Failed to create note.';
      set({ error: message, loadingNotes: false });
      toast.error(message, { id: loadingToastId });
      return null;
    }
  },

  updateBookNote: async (noteId, noteData) => {
    set({ loadingNotes: true, error: null });
    const noteTitle = noteData.title || get().bookNotesByBookId[Object.keys(get().bookNotesByBookId).find(bookId => get().bookNotesByBookId[bookId].some(n => n.id === noteId)) || '']?.find(n => n.id === noteId)?.title || '...';
    const loadingToastId = toast.loading(`Updating note "${noteTitle}"...`);
    try {
      const { data, error } = await supabase
        .from('book_notes')
        .update({ ...noteData, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        const updatedNote = data[0] as BookNote;
        set((state) => ({
          bookNotesByBookId: {
            ...state.bookNotesByBookId,
            [updatedNote.book_id]: (state.bookNotesByBookId[updatedNote.book_id] || []).map(n =>
              n.id === updatedNote.id ? updatedNote : n
            ),
          },
          loadingNotes: false,
        }));
        toast.success(`Note "${updatedNote.title}" updated.`, { id: loadingToastId });
        return updatedNote;
      }
      toast.dismiss(loadingToastId);
      return null;
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error updating note:', error);
      const message = error.message || 'Failed to update note.';
      set({ error: message, loadingNotes: false });
      toast.error(message, { id: loadingToastId });
      return null;
    }
  },

  deleteBookNote: async (noteId) => {
    set({ loadingNotes: true, error: null });
    const noteToDelete = Object.values(get().bookNotesByBookId).flat().find(n => n.id === noteId);
    const loadingToastId = toast.loading(`Deleting note "${noteToDelete?.title || '...'}"...`);
    try {
      // Find which book this note belongs to for store update
      let bookIdForNote: string | undefined = undefined;
      const notesByBook = get().bookNotesByBookId;
      for (const bkId in notesByBook) {
        if (notesByBook[bkId].some(n => n.id === noteId)) {
          bookIdForNote = bkId;
          break;
        }
      }

      const { error: deleteError } = await supabase.from('book_notes').delete().eq('id', noteId);
      if (deleteError) throw deleteError;

      if (bookIdForNote) {
        const finalBookId = bookIdForNote;
        set((state) => ({
          bookNotesByBookId: {
            ...state.bookNotesByBookId,
            [finalBookId]: (state.bookNotesByBookId[finalBookId] || []).filter((n) => n.id !== noteId),
          },
          loadingNotes: false,
        }));
      } else {
        set({ loadingNotes: false });
      }
      toast.success(`Note "${noteToDelete?.title || 'Selected Note'}" deleted.`, { id: loadingToastId });
    } catch (e: unknown) {
      const error = e as StoreError;
      console.error('Error deleting note:', error);
      const message = error.message || 'Failed to delete note.';
      set({ error: message, loadingNotes: false });
      toast.error(message, { id: loadingToastId });
    }
  },

  clearProjectData: () => {
    set({
      books: [],
      chaptersByBookId: {},
      characterProfilesByBookId: {},
      bookNotesByBookId: {},
      currentBook: null,
      currentChapter: null,
      loadingBooks: false,
      loadingChapters: false,
      loadingProfiles: false,
      loadingNotes: false,
      error: null,
    });
    // toast.success("Project data cleared (simulated)"); // Optional: if you want a toast for this
  }
}));

export default useProjectStore; 