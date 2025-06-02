'use client';

import { useEffect } from 'react';
import useAuthStore from '@/stores/authStore';

export default function AuthInitializer() {
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initializeAuthListener();
    return () => {
      unsubscribe(); // Cleanup the listener when the component unmounts
    };
  }, []);

  return null; // This component doesn't render anything
} 