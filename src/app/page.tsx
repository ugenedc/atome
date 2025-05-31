'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import useAuthStore from '@/stores/authStore';
import useProjectStore from '@/stores/projectStore';
import AuthForm from '@/components/AuthForm';
import MDEditor from "@uiw/react-md-editor";
import styles from './page.module.css';

export default function Home() {
  const { session, loading: authLoading, initializeAuthListener, signOut, user } = useAuthStore();
  const {
    books,
    chaptersByBookId,
    currentBook,
    currentChapter,
    loadingBooks,
    loadingChapters,
    error: projectError,
    fetchBooks,
    createBook,
    deleteBook,
    setCurrentBook,
    createChapter,
    updateChapterContent,
    deleteChapter,
    setCurrentChapter,
    clearProjectData
  } = useProjectStore();

  const [newBookTitle, setNewBookTitle] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [editorContent, setEditorContent] = useState<string | undefined>('');
  const [isZenMode, setIsZenMode] = useState(false);

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
    const unsubscribe = initializeAuthListener();
    return () => {
      unsubscribe();
    };
  }, [initializeAuthListener]);

  useEffect(() => {
    if (session && user) {
      fetchBooks(user);
    } else {
      clearProjectData();
    }
  }, [session, user, fetchBooks, clearProjectData]);

  useEffect(() => {
    if (currentChapter) {
      setEditorContent(currentChapter.content || '');
    } else {
      setEditorContent(undefined);
    }
    if (isZenMode && !currentChapter) {
      setIsZenMode(false);
    }
  }, [currentChapter, isZenMode]);

  const handleCreateBook = async (e: FormEvent) => {
    e.preventDefault();
    if (newBookTitle.trim() && user) {
      const newBook = await createBook(newBookTitle.trim(), user);
      if (newBook) {
        await setCurrentBook(newBook);
        setNewBookTitle('');
      }
    }
  };

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
  
  const handleDeleteBook = async (bookId: string) => {
    if (confirm('Are you sure you want to delete this book and all its chapters?')) {
      await deleteBook(bookId);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (confirm('Are you sure you want to delete this chapter?')) {
      await deleteChapter(chapterId);
    }
  };

  const getErrorMessage = (error: unknown): string | null => {
    if (!error) return null;
    if (typeof error === 'string') return error;
    // Check if error is an object and has a message property of type string
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const msg = (error as { message: unknown }).message;
      if (typeof msg === 'string') return msg;
    }
    return 'An unexpected error occurred.';
  };

  const handleSaveContent = async () => {
    if (currentChapter && editorContent !== undefined) {
      if (editorContent !== currentChapter.content) {
        await updateChapterContent(currentChapter.id, editorContent);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  const chaptersForCurrentBook = currentBook ? chaptersByBookId[currentBook.id] || [] : [];
  const displayError = getErrorMessage(projectError);

  return (
    <main className={`${styles.mainLayout} ${isZenMode ? styles.zenModeActive : ''} flex flex-col h-screen bg-white dark:bg-gray-900`}>
      {!isZenMode && (
        <header className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
          <div>Welcome, {user?.email || 'User'}!</div>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Sign Out
          </button>
        </header>
      )}
      <div className="flex flex-1 overflow-hidden">
        {!isZenMode && (
          <aside className="w-64 bg-gray-50 dark:bg-gray-800 p-4 overflow-y-auto space-y-4 border-r border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-200">Books</h2>
              <form onSubmit={handleCreateBook} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  placeholder="New book title"
                  className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingBooks}
                />
                <button type="submit" className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm" disabled={loadingBooks || !newBookTitle.trim()}>
                  {loadingBooks ? '...' : 'Add'}
                </button>
              </form>
              {loadingBooks && <p>Loading books...</p>}
              {displayError && <p className="text-red-500 dark:text-red-400 text-xs">Error: {displayError}</p>}
              <ul className="space-y-1">
                {books.map((book) => (
                  <li key={book.id} 
                      className={`p-2 rounded cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 ${currentBook?.id === book.id ? 'bg-blue-100 dark:bg-blue-700/30 font-semibold text-blue-600 dark:text-blue-300' : ''}`}>
                    <div className="flex justify-between items-center">
                      <span onClick={() => setCurrentBook(book)} className="flex-grow">{book.title}</span>
                      <button onClick={() => handleDeleteBook(book.id)} className="text-red-500 hover:text-red-700 text-xs p-1">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {currentBook && (
              <div>
                <h3 className="text-lg font-semibold mt-4 mb-3 text-gray-700 dark:text-gray-200">Chapters for: {currentBook.title}</h3>
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
            )}
          </aside>
        )}

        {/* Main Writing Area */}
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
                    <button
                      onClick={handleSaveContent}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400 dark:disabled:bg-gray-600"
                      disabled={loadingChapters || editorContent === undefined || editorContent === currentChapter.content}
                    >
                      {loadingChapters ? 'Saving...' : 'Save'}
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
              <div className={`${styles.editorContainer} flex-grow overflow-y-auto ${isZenMode ? styles.zenEditorWrapper : 'p-1 md:p-2 lg:p-4'}`} data-color-mode="light">
                <MDEditor
                  value={editorContent}
                  onChange={setEditorContent}
                  height={isZenMode? undefined : "100%"}
                  preview="live"
                  className={`h-full border-none shadow-none ${isZenMode ? styles.zenMDEditor : ''}`}
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
                <h1 className={`text-2xl font-bold mb-4 ${isZenMode ? 'text-gray-700' : 'text-gray-700 dark:text-gray-200'}`}>{ 'Welcome to Atome'}</h1>
                <p>Select a book to get started, or create a new one.</p>
            </div>
          )}
        </section>

        {/* Right Sidebar for Profiles/Notes */}
        {!isZenMode && (
          <aside className="w-64 bg-gray-50 dark:bg-gray-800 p-4 overflow-y-auto border-l border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Profiles & Notes</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Character profiles and notes will go here.</p>
          </aside>
        )}
      </div>
    </main>
  );
}
