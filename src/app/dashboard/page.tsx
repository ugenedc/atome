'use client';

import { useEffect, useState, FormEvent } from 'react';
import useAuthStore from '@/stores/authStore';
import useProjectStore, { Book } from '@/stores/projectStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConfirmationModal from '@/components/common/ConfirmationModal';

export default function DashboardPage() {
  const { session, loading: authLoading, user, signOut } = useAuthStore();
  const {
    books,
    fetchBooks,
    createBook,
    loadingBooks,
    error: projectError,
    setCurrentBook,
    deleteBook,
  } = useProjectStore();
  const router = useRouter();

  const [newBookTitle, setNewBookTitle] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'book' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteBook = (bookId: string, bookTitle: string) => {
    setItemToDelete({ id: bookId, name: bookTitle, type: 'book' });
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || itemToDelete.type !== 'book') return;

    setIsDeleting(true);
    await deleteBook(itemToDelete.id);
    setIsDeleting(false);
    setIsConfirmModalOpen(false);
    setItemToDelete(null);
  };

  if (authLoading || !session) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
        <p className="text-slate-700 dark:text-slate-300 text-lg">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <Link href="/dashboard" className="text-2xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 transition-colors">
            Atome Dashboard
          </Link>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">{user?.email}</span>
            <button
              onClick={() => signOut().then(() => router.push('/'))}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 dark:focus:ring-offset-slate-900 focus:ring-red-500 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl font-bold mb-2 text-slate-900 dark:text-slate-50">My Books</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">Create new books or continue your writing journey.</p>
        </div>

        <form onSubmit={handleCreateBook} className="mb-12 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-grow w-full sm:w-auto">
            <label htmlFor="newBookTitle" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Book Title</label>
            <input
              id="newBookTitle"
              type="text"
              value={newBookTitle}
              onChange={(e) => setNewBookTitle(e.target.value)}
              placeholder="e.g., My Next Bestseller..."
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 text-base transition-colors duration-150"
              disabled={loadingBooks}
            />
          </div>
          <button 
            type="submit" 
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-500 transition-all duration-150 ease-in-out text-base flex items-center justify-center space-x-2"
            disabled={loadingBooks || !newBookTitle.trim()}
          >
            {loadingBooks ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Creating...</span>
              </>
            ) : ( 
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>Create Book</span>
              </>
            )}
          </button>
        </form>

        {projectError && <p className="text-red-500 dark:text-red-400 text-sm mb-4 bg-red-100 dark:bg-red-900/30 p-3 rounded-md">Error: {typeof projectError === 'string' ? projectError : projectError.message}</p>}

        {loadingBooks && books.length === 0 && 
          <div className="text-center py-10">
            <svg className="animate-spin mx-auto h-12 w-12 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">Loading your library...</p>
          </div>
        }
        
        {!loadingBooks && books.length === 0 && (
          <div className="text-center py-20 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 rounded-xl shadow-lg">
            <svg className="mx-auto h-24 w-24 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">No books yet!</h3>
            <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto">Looks like your library is empty. Create your first book to get started on your writing journey.</p>
          </div>
        )}

        {books.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map((book: Book) => (
              <Link href={`/book/${book.id}`} key={book.id} className="block group transform hover:-translate-y-1 transition-all duration-200 ease-in-out">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-200 ease-in-out h-full flex flex-col justify-between p-6 ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-blue-500 dark:hover:ring-blue-500">
                  <div>
                    <h2 className="text-xl font-semibold mb-2 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 truncate" title={book.title}>{book.title}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Created: {new Date(book.created_at).toLocaleDateString()}</p>
                  </div>
                  <button className="mt-5 w-full text-sm text-white bg-blue-500 group-hover:bg-blue-600 dark:bg-blue-600 dark:group-hover:bg-blue-700 px-4 py-2.5 rounded-lg font-medium transition-colors duration-150 flex items-center justify-center space-x-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    <span>Open Book</span>
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteBook(book.id, book.title);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-700/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete book"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4z" />
                    </svg>
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}

        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={confirmDelete}
          title={`Delete ${itemToDelete?.type || 'item'}`}
          message={
            <span>
              Are you sure you want to delete the book <strong className="font-semibold text-slate-700 dark:text-slate-200">{itemToDelete?.name}</strong>? 
              <br />
              All associated chapters, character profiles, and notes will also be deleted. This action cannot be undone.
            </span>
          }
          confirmButtonText={isDeleting ? 'Deleting...' : 'Delete Book'}
          isLoading={isDeleting}
          confirmButtonVariant="danger"
        />
      </main>
    </div>
  );
} 