'use client';

import { useEffect, useState, FormEvent, useCallback, useMemo } from 'react';
import useAuthStore from '@/stores/authStore';
import useProjectStore, { CharacterProfile, BookNote } from '@/stores/projectStore';
import MDEditor from "@uiw/react-md-editor";
import styles from '../../page.module.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CharacterProfilesSection from '@/components/book/CharacterProfilesSection';
import BookNotesSection from '@/components/book/BookNotesSection';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { toast } from 'react-hot-toast';
import { visit, SKIP } from 'unist-util-visit';

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
  return debounced as (...args: Parameters<F>) => void;
}

// remark plugin to find and link mentions
function createRemarkMentionPlugin(itemsToMention: Array<{ id: string; name: string; type: 'character' | 'note' }>) {
  if (!itemsToMention || itemsToMention.length === 0) {
    return () => (tree: any) => tree; // No-op plugin
  }

  // Sort by length descending to ensure longer names are matched first (e.g., "First Last" before "First")
  const sortedItems = [...itemsToMention].sort((a, b) => b.name.length - a.name.length);

  // This function is the remark "attacher"
  return function remarkMentionsAttacher() {
    // This function is the "transformer"
    return function transformer(tree: any) {
      visit(tree, 'text', (node, index, parent) => {
        if (!parent || typeof node.value !== 'string' || !index === undefined) {
          return;
        }

        const text = node.value;
        const newChildren: any[] = [];
        let lastIndex = 0;

        // Iterate through the text to find all occurrences of the items
        let currentSearchIndex = 0;
        while (currentSearchIndex < text.length) {
          let foundItem = null;
          let matchStartIndex = -1;
          let matchLength = 0;

          // Check for each sorted item at the current position
          for (const item of sortedItems) {
            if (text.substring(currentSearchIndex).startsWith(item.name)) {
              // Preliminary match found, now check word boundaries
              const charBeforeIndex = currentSearchIndex -1;
              const charAfterIndex = currentSearchIndex + item.name.length;

              const isStartBoundary = 
                currentSearchIndex === 0 || 
                !/\\w/.test(text[charBeforeIndex]);
              
              const isEndBoundary = 
                charAfterIndex === text.length || 
                !/\\w/.test(text[charAfterIndex]);

              if (isStartBoundary && isEndBoundary) {
                foundItem = item;
                matchStartIndex = currentSearchIndex;
                matchLength = item.name.length;
                break; // Found the longest, boundary-respecting match
              }
            }
          }

          if (foundItem && matchStartIndex !== -1) {
            // Add text before the match
            if (matchStartIndex > lastIndex) {
              newChildren.push({ type: 'text', value: text.slice(lastIndex, matchStartIndex) });
            }
            // Add the mention as a link
            newChildren.push({
              type: 'link',
              url: `mention://${foundItem.type}/${foundItem.id}`,
              children: [{ type: 'text', value: foundItem.name }],
              data: { mention: true, itemType: foundItem.type, itemId: foundItem.id, itemName: foundItem.name },
              title: `View ${foundItem.type}: ${foundItem.name}`
            });
            lastIndex = matchStartIndex + matchLength;
            currentSearchIndex = lastIndex;
          } else {
            // No match at currentSearchIndex, advance currentSearchIndex by 1
            // and ensure the loop progresses. Add the character at currentSearchIndex to newChildren if no previous text node is pending.
            // This part of the logic ensures that text not part of any mention is preserved.
            // It's simpler to find the *next* match or the end of the string.
            
            let nextAdvance = text.length; // Default to end of string
            if (newChildren.length > 0 && newChildren[newChildren.length-1].type === 'text') {
                 // If last added was text, append to it
                newChildren[newChildren.length-1].value += text[currentSearchIndex];
            } else {
                 newChildren.push({ type: 'text', value: text[currentSearchIndex]});
            }
            currentSearchIndex++;
            lastIndex = currentSearchIndex; // Or handle accumulation differently
          }
        }
        
        // After loop, if there's remaining text from lastIndex
        // The logic above for non-matches should handle this by incrementing char by char.
        // Let's refine the non-match part:
        // The loop should find the *next* segment of text that is either a mention or non-mention text.

        // --- Revision of the loop logic for clarity and correctness ---
        const revisedNewChildren: any[] = [];
        let currentTextIndex = 0;
        while(currentTextIndex < text.length) {
            let bestMatch = null; // { item: MentionItem, startIndex: number, length: number }

            for(const item of sortedItems) {
                const KMP_FAIL = -1; // Knuth-Morris-Pratt failure value
                let kmp_i = 0, kmp_j = 0;
                const textSegment = text.substring(currentTextIndex);
                
                // Simple indexOf for now, KMP is overkill here.
                const itemIndexInSegment = textSegment.indexOf(item.name);

                if (itemIndexInSegment === 0) { // Match must start at currentTextIndex
                    const startIndex = currentTextIndex;
                    const endIndex = startIndex + item.name.length;

                    const charBefore = startIndex > 0 ? text[startIndex - 1] : ' ';
                    const charAfter = endIndex < text.length ? text[endIndex] : ' ';
                    
                    const startOk = !/\\w/.test(charBefore) || !/\\w/.test(item.name[0]);
                    const endOk = !/\\w/.test(charAfter) || !/\\w/.test(item.name[item.name.length -1]);

                    if(startOk && endOk) {
                        bestMatch = { item, startIndex, length: item.name.length};
                        break; // Since sortedItems is by length, this is the best match starting at currentTextIndex
                    }
                }
            }

            if (bestMatch) {
                // Add text before this match, if any (should be empty if matches are contiguous)
                // This part needs to be handled by how currentTextIndex advances
                
                revisedNewChildren.push({
                    type: 'link',
                    url: `mention://${bestMatch.item.type}/${bestMatch.item.id}`,
                    children: [{ type: 'text', value: bestMatch.item.name }],
                    data: { mention: true, itemType: bestMatch.item.type, itemId: bestMatch.item.id, itemName: bestMatch.item.name },
                    title: `View ${bestMatch.item.type}: ${bestMatch.item.name}`
                });
                currentTextIndex += bestMatch.length;
            } else {
                // No match starting at currentTextIndex. Add this character as plain text.
                // And find the start of the next segment of plain text.
                let nextPotentialMatchStart = text.length;
                for(const item of sortedItems) {
                    const R_KMP_FAIL = -1;
                    let R_kmp_i = currentTextIndex + 1, R_kmp_j = 0;
                    const nextOcc = text.indexOf(item.name, currentTextIndex + 1);
                    if (nextOcc !== -1 && nextOcc < nextPotentialMatchStart) {
                        nextPotentialMatchStart = nextOcc;
                    }
                }
                
                const plainTextSegment = text.substring(currentTextIndex, nextPotentialMatchStart);
                if (plainTextSegment) {
                   revisedNewChildren.push({ type: 'text', value: plainTextSegment });
                }
                currentTextIndex = nextPotentialMatchStart;
            }
        }


        if (revisedNewChildren.length > 0 && (revisedNewChildren.length !== 1 || revisedNewChildren[0].type !== 'text' || revisedNewChildren[0].value !== text)) {
            if (parent && typeof index === 'number') {
                 parent.children.splice(index, 1, ...revisedNewChildren);
                 return [SKIP, index + revisedNewChildren.length];
            }
        }
      });
    };
  };
}

interface BookPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any; 
}

export default function BookPage({ params }: BookPageProps) {
  const { session, loading: authLoading, user } = useAuthStore();
  const router = useRouter();
  const bookId = params.bookId as string;

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
    characterProfilesByBookId,
    bookNotesByBookId,
  } = useProjectStore();

  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [editorContent, setEditorContent] = useState<string | undefined>('');
  const [isZenMode, setIsZenMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingBook, setIsLoadingBook] = useState(true);
  const [loadedChapterId, setLoadedChapterId] = useState<string | null | undefined>(null);

  // State for delete confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'chapter' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // For loading state on modal confirm button

  useEffect(() => {
    if (!user && !authLoading) {
      router.replace('/');
      return;
    }

    if (user && bookId) {
      if (currentBook?.id !== bookId) {
        setIsLoadingBook(true);
        const bookFromStateBooks = useProjectStore.getState().books.find(b => b.id === bookId);
        if (bookFromStateBooks) {
          setCurrentBook(bookFromStateBooks)
            .finally(() => setIsLoadingBook(false));
        } else {
          fetchBookById(bookId, user).then(fetchedBook => {
            if (fetchedBook) {
              setCurrentBook(fetchedBook);
            } else {
              router.replace('/dashboard');
            }
          }).finally(() => setIsLoadingBook(false));
        }
      } else {
        if (isLoadingBook) setIsLoadingBook(false);
      }
    }
  }, [bookId, user, authLoading, router, currentBook?.id, fetchBookById, setCurrentBook, isLoadingBook]);

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
      if (currentChapter.id !== loadedChapterId) {
        setEditorContent(currentChapter.content || '');
        setLoadedChapterId(currentChapter.id);
      }
    } else {
      setEditorContent(undefined);
      setLoadedChapterId(null);
    }

    if (isZenMode && !currentChapter) {
      setIsZenMode(false);
    }
  }, [currentChapter, isZenMode, loadedChapterId]);

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
  
  const handleDeleteChapter = async (chapterId: string, chapterTitle: string) => {
    setItemToDelete({ id: chapterId, name: chapterTitle, type: 'chapter' });
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    if (itemToDelete.type === 'chapter') {
      await deleteChapter(itemToDelete.id);
      toast.success(`Chapter "${itemToDelete.name}" deleted.`);
      if (currentChapter?.id === itemToDelete.id) {
        setCurrentChapter(null);
      }
    }
    
    setIsDeleting(false);
    setIsConfirmModalOpen(false);
    setItemToDelete(null);
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

  // ---- MENTION LOGIC ----
  const mentionableItems = useMemo(() => {
    const items: Array<{ id: string; name: string; type: 'character' | 'note' }> = [];
    if (currentBook) {
      const profiles = characterProfilesByBookId[currentBook.id] || [];
      profiles.forEach(p => {
        if (p.name && p.name.trim() !== '') { // Ensure name is not empty
          items.push({ id: p.id, name: p.name, type: 'character' });
        }
      });
      const notes = bookNotesByBookId[currentBook.id] || [];
      notes.forEach(n => {
        if (n.title && n.title.trim() !== '') { // Ensure title is not empty
         items.push({ id: n.id, name: n.title, type: 'note' });
        }
      });
    }
    return items.sort((a, b) => b.name.length - a.name.length); // Important: match longer names first
  }, [characterProfilesByBookId, bookNotesByBookId, currentBook]);

  const handleMentionClick = useCallback((type: string, id: string, name: string) => {
    toast.success(`Clicked mention: ${name} (${type} ID: ${id})`);
    // Here you would typically open a drawer or modal with the item's details
    // For example:
    // if (type === 'character') {
    //   const profile = characterProfilesByBookId[currentBook!.id]?.find(p => p.id === id);
    //   // openCharacterDrawer(profile);
    // } else if (type === 'note') {
    //   const note = bookNotesByBookId[currentBook!.id]?.find(n => n.id === id);
    //   // openNoteDrawer(note);
    // }
  }, []);

  const remarkPlugins = useMemo(() => {
    return [createRemarkMentionPlugin(mentionableItems)];
  }, [mentionableItems]);
  // ---- END MENTION LOGIC ----

  if (authLoading || !session || isLoadingBook) { 
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
        <div className="text-center">
          <svg className="animate-spin mx-auto h-12 w-12 text-blue-500 dark:text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-700 dark:text-slate-300 text-lg">Loading book data...</p>
        </div>
      </div>
    );
  }

  if (!currentBook) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 p-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 dark:text-red-400 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8V4m0 16v-4" />
          </svg>
          <p className="text-xl text-slate-700 dark:text-slate-200 mb-4 font-semibold">Book Not Found</p>
          <p className="text-slate-600 dark:text-slate-400 mb-8 text-center max-w-md">The book you are looking for does not exist or you may not have permission to access it.</p>
          <Link href="/dashboard" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 focus:ring-blue-500 transition-colors">
            Return to Dashboard
          </Link>
        </div>
      );
  }

  const chaptersForCurrentBook = chaptersByBookId[currentBook.id] || [];
  const displayError = getErrorMessage(projectError);

  return (
    <main className={`${styles.mainLayout} ${isZenMode ? styles.zenModeActive : ''} flex flex-col h-screen bg-slate-50 dark:bg-slate-900`}>
      {/* No top-level app header on this page for focus */} 
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Chapters */} 
        {!isZenMode && (
          <aside className="w-72 bg-white dark:bg-slate-800 p-5 overflow-y-auto space-y-6 border-r border-slate-200 dark:border-slate-700 shadow-sm">
            <div>
              <h3 className="text-xl font-semibold mb-1 text-slate-800 dark:text-slate-100 truncate" title={currentBook.title}>Chapters</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">For: <span className="font-medium">{currentBook.title}</span></p>
              <form onSubmit={handleCreateChapter} className="flex flex-col gap-3 mb-6">
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="New chapter title..."
                  className="flex-grow p-2.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={loadingChapters}
                />
                <button type="submit" 
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-500 transition-colors flex items-center justify-center space-x-2"
                  disabled={loadingChapters || !newChapterTitle.trim()}
                >
                  {loadingChapters ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Add Chapter</span>
                    </>
                  )}
                </button>
              </form>
              {loadingChapters && chaptersForCurrentBook.length === 0 && 
                <div className="text-center py-4">
                  <svg className="animate-spin mx-auto h-8 w-8 text-blue-500 dark:text-blue-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading chapters...</p>
                </div>
              }
              {displayError && <p className="text-red-500 dark:text-red-400 text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded-md">Error: {displayError}</p>}
              {chaptersForCurrentBook.length > 0 ? (
                <ul className="space-y-1.5">
                  {chaptersForCurrentBook.map((chapter) => (
                    <li key={chapter.id} 
                        onClick={() => setCurrentChapter(chapter)} 
                        className={`group flex justify-between items-center p-2.5 rounded-md cursor-pointer transition-all duration-150 ease-in-out text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 ${currentChapter?.id === chapter.id ? 'bg-blue-50 dark:bg-blue-600/20 font-semibold text-blue-600 dark:text-blue-300 ring-1 ring-blue-500 dark:ring-blue-500' : ''}`}>
                      <span className="truncate pr-2 flex-1" title={chapter.title}>{chapter.title}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteChapter(chapter.id, chapter.title);}}
                        className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-full focus:outline-none focus:ring-1 focus:ring-red-500 transition-opacity duration-150"
                        title="Delete chapter"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (!loadingChapters && !displayError && (
                <div className="text-center py-12 px-6 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                    <svg className="mx-auto h-16 w-16 text-blue-500 dark:text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">No Chapters Yet</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your story is waiting for its first chapter. Add one above to begin plotting your narrative!</p>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Main Writing Area */}
        <section className={`flex-1 flex flex-col overflow-hidden ${isZenMode ? 'p-0' : 'bg-white dark:bg-slate-800/30'} ${isZenMode ? styles.zenEditorSection : ''}`}>
          {currentChapter ? (
            <div className="flex flex-col flex-grow h-full">
              {!isZenMode && (
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-sm">
                  <div>
                    <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 truncate" title={currentChapter.title}>{currentChapter.title}</h1>
                    {currentBook && <p className="text-xs text-slate-500 dark:text-slate-400">Book: <span className="font-medium">{currentBook.title}</span></p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {isSaving && <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">Saving...</span>}
                    <button
                      onClick={() => editorContent !== undefined && handleSaveContent(editorContent)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-slate-400 dark:disabled:bg-slate-500 transition-colors duration-150 flex items-center space-x-1.5"
                      disabled={loadingChapters || isSaving || editorContent === undefined || editorContent === currentChapter.content}
                    >
                      {isSaving ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                      )}
                      <span>{isSaving ? 'Saving...' : (editorContent === currentChapter.content ? 'Saved' : 'Save Now')}</span>
                    </button>
                    <button
                      onClick={toggleZenMode}
                      title="Toggle Zen Mode (Esc to exit)"
                      className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-md transition-colors duration-150"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M20.25 20.25h-4.5m4.5 0v-4.5m0-4.5L15 15" />
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
                  previewOptions={{
                    remarkPlugins: remarkPlugins,
                    components: {
                      a: ({ node, ...props }) => {
                        if (props.href?.startsWith('mention://') && node?.data) {
                          const { itemType, itemId, itemName } = node.data as { itemType: string; itemId: string; itemName: string };
                          return (
                            <span
                              style={{ color: 'cornflowerblue', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => handleMentionClick(itemType, itemId, itemName)}
                              title={props.title || `View ${itemName}`}
                            >
                              {props.children}
                            </span>
                          );
                        }
                        // eslint-disable-next-line jsx-a11y/anchor-has-content
                        return <a {...props} />; // Default link rendering
                      },
                    },
                  }}
                />
              </div>
              {isZenMode && (
                 <button 
                    onClick={toggleZenMode} 
                    title="Exit Zen Mode (Esc)"
                    className={styles.exitZenButton}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                 </button>
              )}
            </div>
          ) : currentBook ? (
            <div className={`flex flex-col items-center justify-center text-center flex-grow p-8 ${isZenMode ? styles.zenPlaceholder : 'text-slate-600 dark:text-slate-400'} bg-white dark:bg-slate-800/30`}>
                <svg className={`mx-auto h-20 w-20 mb-6 ${isZenMode ? 'text-slate-500' : 'text-slate-400 dark:text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                <h1 className={`text-3xl font-semibold mb-3 ${isZenMode ? 'text-slate-800' : 'text-slate-800 dark:text-slate-100'}`}>{currentBook.title}</h1>
                <p className={`text-lg ${isZenMode ? 'text-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>Select a chapter to begin, or create a new one.</p>
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center text-center flex-grow p-8 ${isZenMode ? styles.zenPlaceholder : 'text-slate-600 dark:text-slate-400'} bg-white dark:bg-slate-800/30`}>
                {/* This state should ideally not be reached if bookId is invalid / user unauth, as handled by earlier checks */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 dark:text-red-400 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <h1 className={`text-2xl font-bold mb-4 ${isZenMode ? 'text-slate-700' : 'text-slate-700 dark:text-slate-200'}`}>Book Error</h1>
                <p className={`${isZenMode ? 'text-slate-600' : 'text-slate-500 dark:text-slate-400'} mb-6`}>There was an issue loading the book. Please try again or return to dashboard.</p>
                <Link href="/dashboard" className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-blue-500 transition-colors">
                  Go to Dashboard
                </Link>
            </div>
          )}
        </section>

        {/* Right Sidebar for Profiles/Notes */} 
        {!isZenMode && (
          <aside className="w-80 bg-white dark:bg-slate-800 p-5 overflow-y-auto border-l border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1 text-slate-800 dark:text-slate-100">Story Elements</h2>
              {currentBook && <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">For: <span className="font-medium truncate">{currentBook.title}</span></p>}
            </div>

            {/* Character Profiles Section */}
            <CharacterProfilesSection />

            {/* Divider */}
            <hr className="border-slate-200 dark:border-slate-700 my-6" />

            {/* Book Notes Section */}
            <BookNotesSection />
            
          </aside>
        )}
      </div>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDelete}
        title={`Delete ${itemToDelete?.type || 'item'}`}
        message={
          <span>
            Are you sure you want to delete <strong className="font-semibold text-slate-700 dark:text-slate-200">{itemToDelete?.name}</strong>? 
            <br />
            This action cannot be undone.
          </span>
        }
        confirmButtonText={isDeleting ? 'Deleting...' : 'Delete'}
        isLoading={isDeleting}
        confirmButtonVariant="danger"
      />
    </main>
  );
} 