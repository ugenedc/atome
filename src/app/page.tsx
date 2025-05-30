'use client';

import { useEffect, useState, FormEvent } from 'react';
import useAuthStore from '@/stores/authStore';
import useProjectStore from '@/stores/projectStore';
import AuthForm from '@/components/AuthForm';

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
    deleteChapter,
    setCurrentChapter,
    clearProjectData
  } = useProjectStore();

  const [newBookTitle, setNewBookTitle] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');

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

  return (
    <main className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 bg-gray-800 text-white">
        <div>Welcome, {user?.email || 'User'}!</div>
        <button
          onClick={signOut}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Sign Out
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar for Books/Chapters */}
        <aside className="w-1/4 bg-gray-200 p-4 overflow-y-auto space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Books</h2>
            <form onSubmit={handleCreateBook} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newBookTitle}
                onChange={(e) => setNewBookTitle(e.target.value)}
                placeholder="New book title"
                className="flex-grow p-2 border rounded text-sm"
                disabled={loadingBooks}
              />
              <button type="submit" className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm" disabled={loadingBooks || !newBookTitle.trim()}>
                {loadingBooks ? '...' : 'Add'}
              </button>
            </form>
            {loadingBooks && <p>Loading books...</p>}
            {projectError && <p className="text-red-500 text-xs">Error: {projectError}</p>}
            <ul className="space-y-1">
              {books.map((book) => (
                <li key={book.id} 
                    className={`p-2 rounded cursor-pointer hover:bg-gray-300 ${currentBook?.id === book.id ? 'bg-gray-400 font-semibold' : ''}`}>
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
              <h3 className="text-lg font-semibold mt-4 mb-2">Chapters for: {currentBook.title}</h3>
              <form onSubmit={handleCreateChapter} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="New chapter title"
                  className="flex-grow p-2 border rounded text-sm"
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
                      className={`p-2 rounded cursor-pointer hover:bg-gray-300 ${currentChapter?.id === chapter.id ? 'bg-gray-400 font-semibold' : ''}`}>
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

        {/* Main Writing Area */}
        <section className="flex-1 p-8 overflow-y-auto">
          {currentChapter ? (
            <div>
              <h1 className="text-3xl font-bold mb-2">{currentChapter.title}</h1>
              <p className="text-sm text-gray-500 mb-4">Book: {currentBook?.title}</p>
              <div className="bg-white p-6 rounded shadow min-h-[calc(100%-6rem)]">
                <p>Text editor for &apos;{currentChapter.title}&apos; will go here.</p>
                <p className="mt-4 text-xs text-gray-400">Content: {currentChapter.content || 'Empty chapter'}</p>
              </div>
            </div>
          ) : currentBook ? (
             <div className="text-center text-gray-500 mt-10">
                <h1 className="text-2xl font-bold mb-4">{currentBook.title}</h1>
                <p>Select a chapter to start writing, or create a new one.</p>
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-10">
                <h1 className="text-2xl font-bold mb-4">Welcome to Atome</h1>
                <p>Select a book to get started, or create a new one.</p>
            </div>
          )}
        </section>

        {/* Right Sidebar for Profiles/Notes */}
        <aside className="w-1/4 bg-gray-200 p-4 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Profiles & Notes</h2>
          <p>Character profiles and notes will go here.</p>
        </aside>
      </div>
    </main>
  );
}
