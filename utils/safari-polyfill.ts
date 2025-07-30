// Safari-specific polyfills and compatibility fixes

// Check if running in Safari
export const isSafari = () => {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent;
  return /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
};

// Safari-specific storage fixes
export const safariStorageFix = () => {
  if (!isSafari()) return;

  // Fix for Safari's aggressive storage clearing
  const originalSetItem = localStorage.setItem;
  const originalGetItem = localStorage.getItem;
  const originalRemoveItem = localStorage.removeItem;

  // Wrap localStorage methods to handle Safari-specific errors
  localStorage.setItem = function (key: string, value: string) {
    try {
      return originalSetItem.call(this, key, value);
    } catch (error) {
      console.warn('Safari localStorage.setItem failed:', error);
      // Fallback to sessionStorage
      try {
        sessionStorage.setItem(key, value);
      } catch (sessionError) {
        console.warn('Safari sessionStorage.setItem also failed:', sessionError);
      }
    }
  };

  localStorage.getItem = function (key: string) {
    try {
      return originalGetItem.call(this, key);
    } catch (error) {
      console.warn('Safari localStorage.getItem failed:', error);
      // Try sessionStorage as fallback
      try {
        return sessionStorage.getItem(key);
      } catch (sessionError) {
        console.warn('Safari sessionStorage.getItem also failed:', sessionError);
        return null;
      }
    }
  };

  localStorage.removeItem = function (key: string) {
    try {
      return originalRemoveItem.call(this, key);
    } catch (error) {
      console.warn('Safari localStorage.removeItem failed:', error);
      // Also try to remove from sessionStorage
      try {
        sessionStorage.removeItem(key);
      } catch (sessionError) {
        console.warn('Safari sessionStorage.removeItem also failed:', sessionError);
      }
    }
  };
};

// Safari-specific fetch fixes
export const safariFetchFix = () => {
  if (!isSafari()) return;

  // Fix for Safari's fetch timeout issues
  const originalFetch = window.fetch;

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const fetchPromise = originalFetch(input, {
      ...init,
      signal: controller.signal,
    });

    fetchPromise.finally(() => clearTimeout(timeoutId));

    return fetchPromise;
  };
};

// Safari-specific event listener fixes
export const safariEventFix = () => {
  if (!isSafari()) return;

  // Fix for Safari's touch event issues
  if ('ontouchstart' in window) {
    // Prevent double-tap zoom on buttons
    document.addEventListener('touchend', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        e.preventDefault();
        target.click();
      }
    }, { passive: false });
  }
};

// Initialize all Safari fixes
export const initializeSafariFixes = () => {
  if (typeof window === 'undefined') return;

  safariStorageFix();
  safariFetchFix();
  safariEventFix();

  console.log('Safari compatibility fixes initialized');
};

// Export a function to check if we're in a private browsing mode
export const isPrivateBrowsing = async (): Promise<boolean> => {
  try {
    // Try to write to localStorage
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return false;
  } catch (error) {
    // If we can't write to localStorage, we're likely in private browsing
    return true;
  }
};

// Safari-specific session persistence
export const persistSessionInSafari = () => {
  if (!isSafari()) return;

  // Try to keep the session alive by periodically accessing storage
  setInterval(() => {
    try {
      const timestamp = Date.now().toString();
      localStorage.setItem('safari_session_keepalive', timestamp);
    } catch (error) {
      console.warn('Safari session keepalive failed:', error);
    }
  }, 30000); // Every 30 seconds
}; 