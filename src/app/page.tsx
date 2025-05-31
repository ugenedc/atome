'use client';

import { useEffect } from 'react';
import useAuthStore from '@/stores/authStore';
import AuthForm from '@/components/AuthForm';
import { useRouter } from 'next/navigation'; // Added for redirection
import Link from 'next/link'; // For navigation links

// Removed MDEditor, useProjectStore, debounce, and related states/logic as they will move.
// Removed styles import as page.module.css was specific to the old layout.

export default function LandingPage() {
  const { session, loading: authLoading, initializeAuthListener, signOut, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = initializeAuthListener();
    return () => unsubscribe();
  }, [initializeAuthListener]);

  useEffect(() => {
    if (!authLoading && session) {
      router.replace('/dashboard'); // Redirect to dashboard if logged in
    }
  }, [session, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  if (!session) {
    // Show AuthForm centered on the page if not logged in
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Welcome to Atome</h1>
          <p className="text-xl text-slate-300 mb-8">Your minimalist distraction-free writing sanctuary.</p>
        </div>
        <div className="w-full max-w-md">
          <AuthForm />
        </div>
        <footer className="absolute bottom-8 text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Atome. All rights reserved.</p>
        </footer>
      </div>
    );
  }
  
  // This part should ideally not be reached if redirection to /dashboard works correctly when session exists.
  // However, as a fallback or if initial load happens here:
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-6">Welcome back, {user?.email}!</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
        You are logged in. Ready to craft your next masterpiece?
      </p>
      <Link href="/dashboard"
        className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-150 ease-in-out"
      >
        Go to Your Dashboard
      </Link>
      <button
        onClick={() => signOut().then(() => router.push('/'))} // Sign out and redirect to landing
        className="mt-6 px-6 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
      >
        Sign Out
      </button>
    </div>
  );
}
