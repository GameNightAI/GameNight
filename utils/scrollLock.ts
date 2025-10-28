import { useEffect } from 'react';
import { Platform } from 'react-native';

export const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    // Only apply on web platform
    if (Platform.OS !== 'web') return;

    // Check if document exists (web environment)
    if (typeof document === 'undefined') return;

    if (isLocked) {
      // Save current scroll position
      const scrollY = window.scrollY;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      // Lock scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      // Get the scroll position before unlocking
      const scrollY = document.body.style.top;

      // Unlock scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.paddingRight = '';

      // Restore scroll position
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }

    // Cleanup on unmount
    return () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.paddingRight = '';
      }
    };
  }, [isLocked]);
};

