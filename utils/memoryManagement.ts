import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook to manage component lifecycle and cleanup
 */
export const useComponentCleanup = (cleanupFn: () => void) => {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    cleanupRef.current = cleanupFn;

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [cleanupFn]);
};

/**
 * Hook to manage AbortController for async operations
 */
export const useAbortController = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const createAbortController = useCallback(() => {
    // Cancel any existing controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return { createAbortController, abort };
};

/**
 * Hook to manage image memory cleanup
 */
export const useImageMemoryCleanup = () => {
  const imageRefs = useRef<Set<string>>(new Set());

  const trackImage = useCallback((uri: string) => {
    imageRefs.current.add(uri);
  }, []);

  const untrackImage = useCallback((uri: string) => {
    imageRefs.current.delete(uri);
  }, []);

  const clearAllImages = useCallback(() => {
    imageRefs.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllImages();
    };
  }, [clearAllImages]);

  return { trackImage, untrackImage, clearAllImages };
};

/**
 * Hook to manage subscription cleanup
 */
export const useSubscriptionCleanup = () => {
  const subscriptionsRef = useRef<Set<any>>(new Set());

  const addSubscription = useCallback((subscription: any) => {
    subscriptionsRef.current.add(subscription);
  }, []);

  const removeSubscription = useCallback((subscription: any) => {
    subscriptionsRef.current.delete(subscription);
  }, []);

  const clearAllSubscriptions = useCallback(() => {
    subscriptionsRef.current.forEach(subscription => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    });
    subscriptionsRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllSubscriptions();
    };
  }, [clearAllSubscriptions]);

  return { addSubscription, removeSubscription, clearAllSubscriptions };
};

/**
 * Utility to check if component is still mounted
 */
export const useIsMounted = () => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
};

/**
 * Memory-optimized image loading hook
 */
export const useOptimizedImage = (uri: string | null) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!uri) {
      setIsLoaded(false);
      setError(null);
      return;
    }

    setIsLoaded(false);
    setError(null);

    // Preload image to check if it's valid
    const img = new Image();

    const handleLoad = () => {
      if (isMounted()) {
        setIsLoaded(true);
      }
    };

    const handleError = () => {
      if (isMounted()) {
        setError('Failed to load image');
      }
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = uri;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [uri, isMounted]);

  return { isLoaded, error };
};
