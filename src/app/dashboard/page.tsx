'use client';

import { useEffect, useState, FormEvent } from 'react';
import useAuthStore from '@/stores/authStore';
import useProjectStore, { Book } from '@/stores/projectStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { session, loading: authLoading, user, signOut } = useAuthStore();
  const {
    books,
    fetchBooks,
    createBook,
    loadingBooks,
    error: projectError,
    setCurrentBook,
  } = useProjectStore();
  const router = useRouter();

  const [newBookTitle, setNewBookTitle] = useState('');

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/');
    }
    if (user && session) {
      fetchBooks(user);
      setCurrentBook(null);
    }
  }, [session, authLoading, router, user, fetchBooks, setCurrentBook]);

  const handleCreateBook = async (e: FormEvent) => {
    e.preventDefault();
    if (newBookTitle.trim() && user) {
      const newBook = await createBook(newBookTitle.trim(), user);
      if (newBook) {
        setNewBookTitle('');
        router.push(`/book/${newBook.id}`);
      }
    }
  };

  if (authLoading || !session) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <Link href="/dashboard" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            Atome Dashboard
          </Link>
          <div className="flex items-center">
            <span className="text-sm mr-4 hidden sm:inline">{user?.email}</span>
            <button
              onClick={() => signOut().then(() => router.push('/'))}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 dark:focus:ring-offset-gray-900 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Books</h1>
          <p className="text-gray-600 dark:text-gray-400">Create new books or continue working on existing ones.</p>
        </div>

        <form onSubmit={handleCreateBook} className="mb-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-grow w-full sm:w-auto">
            <label htmlFor="newBookTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Book Title</label>
            <input
              id="newBookTitle"
              type="text"
              value={newBookTitle}
              onChange={(e) => setNewBookTitle(e.target.value)}
              placeholder="Enter title for your new book..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-base"
              disabled={loadingBooks}
            />
          </div>
          <button 
            type="submit" 
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-500 transition duration-150 ease-in-out text-base"
            disabled={loadingBooks || !newBookTitle.trim()}
          >
            {loadingBooks ? 'Creating...' : 'Create Book'}
          </button>
        </form>

        {projectError && <p className="text-red-500 dark:text-red-400 text-sm mb-4">Error: {typeof projectError === 'string' ? projectError : projectError.message}</p>}

        {loadingBooks && books.length === 0 && <p>Loading your library...</p>}
        
        {!loadingBooks && books.length === 0 && (
          <div className="text-center py-10">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-50">No books yet!</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating your first book.</p>
          </div>
        )}

        {books.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map((book: Book) => (
              <Link href={`/book/${book.id}`} key={book.id} className="block group">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200 ease-in-out h-full flex flex-col justify-between p-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-2 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 truncate" title={book.title}>{book.title}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Created: {new Date(book.created_at).toLocaleDateString()}</p>
                  </div>
                  <button className="mt-4 w-full text-sm text-white bg-blue-500 group-hover:bg-blue-600 dark:bg-blue-600 dark:group-hover:bg-blue-700 px-4 py-2 rounded-md transition-colors duration-150">
                    Open Book
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 