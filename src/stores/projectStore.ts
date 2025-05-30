import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

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

interface ProjectState {
  books: Book[];
  chaptersByBookId: Record<string, Chapter[]>;
  currentBook: Book | null;
  currentChapter: Chapter | null;
  loadingBooks: boolean;
  loadingChapters: boolean;
  error: string | null;
  fetchBooks: (user: User) => Promise<void>;
  createBook: (title: string, user: User) => Promise<Book | null>;
  deleteBook: (bookId: string) => Promise<void>;
  setCurrentBook: (book: Book | null) => Promise<void>;
  fetchChaptersForBook: (bookId: string, user: User) => Promise<void>;
  createChapter: (bookId: string, title: string, user: User) => Promise<Chapter | null>;
  updateChapterContent: (chapterId: string, content: string) => Promise<void>;
  updateChapterOrder: (chapters: Chapter[]) => Promise<void>;
  deleteChapter: (chapterId: string) => Promise<void>;
  setCurrentChapter: (chapter: Chapter | null) => void;
  clearProjectData: () => void;
}

const useProjectStore = create<ProjectState>((set, get) => ({
  books: [],
  chaptersByBookId: {},
  currentBook: null,
  currentChapter: null,
  loadingBooks: false,
  loadingChapters: false,
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
    } catch (error: any) {
      console.error('Error fetching books:', error);
      set({ error: error.message, loadingBooks: false });
    }
  },

  createBook: async (title, user) => {
    if (!user) {
      set({ error: 'User not authenticated' });
      return null;
    }
    set({ loadingBooks: true, error: null });
    try {
      const { data, error } = await supabase
        .from('books')
        .insert([{ title, user_id: user.id }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        const newBook = data[0] as Book;
        set((state) => ({ books: [newBook, ...state.books], loadingBooks: false }));
        return newBook;
      }
      return null;
    } catch (error: any) {
      console.error('Error creating book:', error);
      set({ error: error.message, loadingBooks: false });
      return null;
    }
  },

  deleteBook: async (bookId) => {
    set({ loadingBooks: true, error: null });
    try {
      const { error } = await supabase.from('books').delete().eq('id', bookId);
      if (error) throw error;
      set((state) => {
        const newChaptersByBookId = { ...state.chaptersByBookId };
        delete newChaptersByBookId[bookId];
        return {
          books: state.books.filter((book) => book.id !== bookId),
          chaptersByBookId: newChaptersByBookId,
          currentBook: state.currentBook?.id === bookId ? null : state.currentBook,
          currentChapter: state.currentBook?.id === bookId ? null : state.currentChapter,
          loadingBooks: false,
        };
      });
    } catch (error: any) {
      console.error('Error deleting book:', error);
      set({ error: error.message, loadingBooks: false });
    }
  },

  setCurrentBook: async (book) => {
    set({ currentBook: book, currentChapter: null, chaptersByBookId: book ? get().chaptersByBookId : {} });
    if (book) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await get().fetchChaptersForBook(book.id, user);
      }
    } 
  },

  fetchChaptersForBook: async (bookId, user) => {
    if (!user) {
      set(state => ({ chaptersByBookId: { ...state.chaptersByBookId, [bookId]: [] }, loadingChapters: false }));
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
    } catch (error: any) {
      console.error(`Error fetching chapters for book ${bookId}:`, error);
      set({ error: error.message, loadingChapters: false });
    }
  },

  createChapter: async (bookId, title, user) => {
    if (!user) {
      set({ error: 'User not authenticated' });
      return null;
    }
    set({ loadingChapters: true, error: null });
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
        return newChapter;
      }
      return null;
    } catch (error: any) {
      console.error('Error creating chapter:', error);
      set({ error: error.message, loadingChapters: false });
      return null;
    }
  },

  updateChapterContent: async (chapterId, content) => {
    set({ loadingChapters: true, error: null });
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
          loadingChapters: false,
        }));
      }
    } catch (error: any) {
      console.error('Error updating chapter content:', error);
      set({ error: error.message, loadingChapters: false });
    }
  },

  updateChapterOrder: async (chaptersToUpdate: Chapter[]) => {
    if (chaptersToUpdate.length === 0) return;
    set({ loadingChapters: true, error: null });
    try {
      const updates = chaptersToUpdate.map((chapter, index) => ({
        id: chapter.id,
        chapter_order: index + 1,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('chapters').upsert(updates);
      if (error) throw error;

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

    } catch (error: any) {
      console.error('Error updating chapter order:', error);
      set({ error: error.message, loadingChapters: false });
    }
  },

  deleteChapter: async (chapterId) => {
    set({ loadingChapters: true, error: null });
    try {
      let bookIdToDeleteFrom: string | undefined = undefined;
      const chaptersByBook = get().chaptersByBookId;
      for (const bkId in chaptersByBook) {
        if (chaptersByBook[bkId].some(ch => ch.id === chapterId)) {
          bookIdToDeleteFrom = bkId;
          break;
        }
      }

      const { error } = await supabase.from('chapters').delete().eq('id', chapterId);
      if (error) throw error;

      if (bookIdToDeleteFrom) {
        const finalBookId = bookIdToDeleteFrom; // Keep for closure
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
    } catch (error: any) {
      console.error('Error deleting chapter:', error);
      set({ error: error.message, loadingChapters: false });
    }
  },

  setCurrentChapter: (chapter) => {
    set({ currentChapter: chapter });
  },

  clearProjectData: () => {
    set({
      books: [],
      chaptersByBookId: {},
      currentBook: null,
      currentChapter: null,
      loadingBooks: false,
      loadingChapters: false,
      error: null,
    });
  }
}));

export default useProjectStore; 