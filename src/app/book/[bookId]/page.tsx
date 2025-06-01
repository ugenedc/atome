'use client';

import { useEffect, useState, FormEvent, useCallback, useMemo } from 'react';
import useAuthStore from '@/stores/authStore';
import useProjectStore from '@/stores/projectStore';
import MDEditor from "@uiw/react-md-editor";
import styles from '../../page.module.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Debounce function
function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced as (...args: Parameters<F>) => void; // Return type is void as it's fire-and-forget
}

interface BookPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any; // Changed to any to workaround Next.js 15.3.3 type issue
}

export default function BookPage({ params }: BookPageProps) {
  const { session, loading: authLoading, user } = useAuthStore();
  const router = useRouter();
  const bookId = params.bookId as string; // Extract and cast bookId

  const {
    chaptersByBookId,
    currentBook,
    currentChapter,
    loadingChapters,
    error: projectError,
    fetchBookById,
    setCurrentBook,
    createChapter,
    updateChapterContent,
    deleteChapter,
    setCurrentChapter,
  } = useProjectStore();

  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [editorContent, setEditorContent] = useState<string | undefined>('');
  const [isZenMode, setIsZenMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingBook, setIsLoadingBook] = useState(true);

  useEffect(() => {
    if (user && bookId) {
      setIsLoadingBook(true);
      if (currentBook && currentBook.id === bookId) {
        setIsLoadingBook(false);
        if(!chaptersByBookId[bookId] || chaptersByBookId[bookId].length === 0){
            setCurrentBook(currentBook); 
        }
        return;
      }
      const bookFromStore = useProjectStore.getState().books.find(b => b.id === bookId);
      if (bookFromStore) {
        setCurrentBook(bookFromStore).then(() => setIsLoadingBook(false));
      } else {
        fetchBookById(bookId, user).then(fetchedBook => {
          if (fetchedBook) {
            setCurrentBook(fetchedBook);
          } else {
            router.replace('/dashboard');
          }
          setIsLoadingBook(false);
        });
      }
    } else if (!user && !authLoading) {
        router.replace('/');
    }
  }, [bookId, user, authLoading, fetchBookById, setCurrentBook, router, currentBook, chaptersByBookId]);

  const toggleZenMode = useCallback(() => {
    setIsZenMode(prev => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isZenMode) {
        toggleZenMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZenMode, toggleZenMode]);

 useEffect(() => {
    if (currentChapter) {
      if (editorContent !== currentChapter.content) {
         setEditorContent(currentChapter.content || '');
      }
    } else {
      setEditorContent(undefined);
    }
    if (isZenMode && !currentChapter) {
      setIsZenMode(false);
    }
  }, [currentChapter, editorContent, isZenMode]);

  const handleCreateChapter = async (e: FormEvent) => {
    e.preventDefault();
    if (newChapterTitle.trim() && currentBook && user) {
      const newChap = await createChapter(currentBook.id, newChapterTitle.trim(), user);
      if (newChap) {
        setCurrentChapter(newChap);
        setNewChapterTitle('');
      }
    }
  };
  
  const handleDeleteChapter = async (chapterId: string) => {
    if (confirm('Are you sure you want to delete this chapter?')) {
      await deleteChapter(chapterId);
      if (currentChapter?.id === chapterId) {
        setCurrentChapter(null);
      }
    }
  };

  const getErrorMessage = (error: unknown): string | null => {
    if (!error) return null;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const msg = (error as { message: unknown }).message;
      if (typeof msg === 'string') return msg;
    }
    return 'An unexpected error occurred.';
  };

  const handleSaveContent = useCallback(async (contentToSave: string) => {
    if (currentChapter && contentToSave !== currentChapter.content) {
      setIsSaving(true);
      await updateChapterContent(currentChapter.id, contentToSave);
      setIsSaving(false);
    }
  }, [currentChapter, updateChapterContent]);
  
  const debouncedSave = useMemo(() => 
    debounce(handleSaveContent, 1500), 
    [handleSaveContent]
  );

  useEffect(() => {
    if (editorContent !== undefined && currentChapter && editorContent !== currentChapter.content) {
      debouncedSave(editorContent);
    }
  }, [editorContent, currentChapter, debouncedSave]);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/');
    }
  }, [session, authLoading, router]);

  if (authLoading || !session || isLoadingBook) { 
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading book data...</p>
      </div>
    );
  }

  if (!currentBook) {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-xl mb-4">Book not found or you do not have access.</p>
          <Link href="/dashboard" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Return to Dashboard
          </Link>
        </div>
      );
  }

  const chaptersForCurrentBook = chaptersByBookId[currentBook.id] || [];
  const displayError = getErrorMessage(projectError);

  return (
    <main className={`${styles.mainLayout} ${isZenMode ? styles.zenModeActive : ''} flex flex-col h-screen bg-white dark:bg-gray-900`}>
      <div className="flex flex-1 overflow-hidden">
        {!isZenMode && (
          <aside className="w-64 bg-gray-50 dark:bg-gray-800 p-4 overflow-y-auto space-y-4 border-r border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">Chapters for: {currentBook.title}</h3>
              <form onSubmit={handleCreateChapter} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="New chapter title"
                  className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingChapters}
                />
                <button type="submit" className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm" disabled={loadingChapters || !newChapterTitle.trim()}>
                  {loadingChapters ? '...' : 'Add'}
                </button>
              </form>
              {loadingChapters && <p>Loading chapters...</p>}
              {displayError && <p className="text-red-500 dark:text-red-400 text-xs">Error: {displayError}</p>}
              <ul className="space-y-1">
                {chaptersForCurrentBook.map((chapter) => (
                  <li key={chapter.id} 
                      onClick={() => setCurrentChapter(chapter)} 
                      className={`p-2 rounded cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 ${currentChapter?.id === chapter.id ? 'bg-blue-100 dark:bg-blue-700/30 font-semibold text-blue-600 dark:text-blue-300' : ''}`}>
                     <div className="flex justify-between items-center">
                        <span className="flex-grow">{chapter.title} (Order: {chapter.chapter_order})</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteChapter(chapter.id);}} className="text-red-500 hover:text-red-700 text-xs p-1">✕</button>
                      </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        <section className={`flex-1 flex flex-col overflow-hidden ${isZenMode ? 'p-0' : 'bg-white dark:bg-gray-900'} ${isZenMode ? styles.zenEditorSection : ''}`}>
          {currentChapter ? (
            <div className="flex flex-col flex-grow h-full">
              {!isZenMode && (
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{currentChapter.title}</h1>
                    {currentBook && <p className="text-xs text-gray-500 dark:text-gray-400">Book: {currentBook.title}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaving && <span className="text-xs text-gray-500 dark:text-gray-400">Saving...</span>}
                    <button
                      onClick={() => editorContent !== undefined && handleSaveContent(editorContent)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400 dark:disabled:bg-gray-600"
                      disabled={loadingChapters || isSaving || editorContent === undefined || editorContent === currentChapter.content}
                    >
                      {isSaving ? 'Saving...' : (editorContent === currentChapter.content ? 'Saved' : 'Save Now')}
                    </button>
                    <button
                      onClick={toggleZenMode}
                      title="Toggle Zen Mode (Esc to exit)"
                      className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-md"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm0 0l2.225-4.517M6.25 6.25l3.11-2.19L10.5 15M6.25 6.25L3.11 4.06M6.25 6.25l2.225 4.517M12 12m-1 1v6m0-6H9m3 0h3m-3 0V6m0 6v6m0-6H9m3 0h3m-3 0V6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              <div className={`${styles.editorContainer} flex-grow overflow-y-auto ${isZenMode ? styles.zenEditorWrapper : 'p-1 md:p-2 lg:p-4'}`}>
                <MDEditor
                  value={editorContent}
                  onChange={setEditorContent}
                  height={isZenMode? undefined : "100%"}
                  preview="live"
                  className={`${isZenMode ? styles.zenMDEditor : styles.normalMDEditor}`}
                  hideToolbar={isZenMode}
                  textareaProps={{
                    placeholder: "Start writing your masterpiece..."
                  }}
                  visibleDragbar={!isZenMode} 
                />
              </div>
              {isZenMode && (
                 <button 
                    onClick={toggleZenMode} 
                    title="Exit Zen Mode (Esc)"
                    className={styles.exitZenButton}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                    </svg>
                 </button>
              )}
            </div>
          ) : currentBook ? (
            <div className={`text-center mt-10 p-8 ${isZenMode ? styles.zenPlaceholder : 'text-gray-500 dark:text-gray-400'}`}>
                <h1 className={`text-2xl font-bold mb-4 ${isZenMode ? 'text-gray-700' : 'text-gray-700 dark:text-gray-200'}`}>{currentBook.title}</h1>
                <p>Select a chapter to start writing, or create a new one.</p>
            </div>
          ) : (
            <div className={`text-center mt-10 p-8 ${isZenMode ? styles.zenPlaceholder : 'text-gray-500 dark:text-gray-400'}`}>
                <h1 className={`text-2xl font-bold mb-4 ${isZenMode ? 'text-gray-700' : 'text-gray-700 dark:text-gray-200'}`}>Book not loaded</h1>
                <p>Please select a book from the dashboard.</p>
            </div>
          )}
        </section>

        {!isZenMode && (
          <aside className="w-64 bg-gray-50 dark:bg-gray-800 p-4 overflow-y-auto border-l border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Profiles & Notes</h2>
            {currentBook && <p className="text-xs text-gray-500 dark:text-gray-400">For: {currentBook.title}</p>}
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Character profiles and notes will go here.</p>
          </aside>
        )}
      </div>
    </main>
  );
} 