import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import type { Session, User, AuthError } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: AuthError | null) => void;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuthListener: () => () => void; // Returns the unsubscribe function
}

const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  error: null,
  setSession: (session) => set({ session, user: session?.user ?? null, loading: false }),
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),

  signInWithPassword: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error, loading: false });
      console.error('Sign in error:', error);
    } else if (data.session) {
      set({ session: data.session, user: data.session.user, loading: false, error: null });
    } else {
      // Should not happen if no error and session is null, but handle defensively
      set({ loading: false, error: { name: 'SignInError', message: 'Sign in failed, no session data.'} as AuthError });
    }
  },

  signUpWithPassword: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      set({ error, loading: false });
      console.error('Sign up error:', error);
    } else if (data.session) {
      // User is signed up and logged in
      set({ session: data.session, user: data.session.user, loading: false, error: null });
    } else if (data.user && !data.session) {
      // User is signed up but needs to confirm email (if email confirmation is enabled)
      set({ user: data.user, loading: false, error: null });
      // You might want to show a message to the user to check their email
      alert('Sign up successful! Please check your email to verify your account.');
    } else {
       set({ loading: false, error: { name: 'SignUpError', message: 'Sign up failed, no user or session data.'} as AuthError });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ error, loading: false });
      console.error('Sign out error:', error);
    } else {
      set({ session: null, user: null, loading: false, error: null });
    }
  },

  initializeAuthListener: () => {
    set({ loading: true });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false, error: null });
    });

    // Initialize session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, loading: false });
    }).catch(err => {
      console.error("Error getting initial session:", err);
      set({ loading: false, error: { name: "GetSessionError", message: "Failed to get initial session."} as AuthError });
    });
    
    return () => {
      subscription?.unsubscribe();
    };
  },
}));

export default useAuthStore; 