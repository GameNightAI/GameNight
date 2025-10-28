// Safari-specific polyfills and compatibility fixes
import { Platform } from 'react-native';

// Check if running in Safari (web only)
export const isSafari = () => {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent;
  return /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
};

// Safari-specific storage fixes
export const safariStorageFix = () => {
  if (Platform.OS !== 'web') return;
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

      // Skip if target doesn't exist or is not a proper HTML element
      if (!target || !target.tagName) return;

      // Skip React Native components (they don't have standard HTML attributes)
      if (target.hasAttribute('data-clickable') ||
        target.closest('[data-clickable]') ||
        target.getAttribute('role') === 'button') {
        return; // Let React Native handle these
      }

      // Only handle native HTML button elements
      if (target.tagName === 'BUTTON') {
        e.preventDefault();
        // Only call click() if it's a proper HTML element with click method
        if (typeof target.click === 'function') {
          target.click();
        }
      }
    }, { passive: false });
  }
};

// Safari-specific input zoom prevention
export const safariInputZoomFix = () => {
  if (!isSafari()) return;

  // Add viewport meta tag to prevent zoom
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  } else {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(meta);
  }

  // Prevent zoom on input focus
  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Set viewport to prevent zoom
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    }
  });

  // Restore normal viewport when input loses focus
  document.addEventListener('focusout', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Restore normal viewport
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    }
  });
};

// Initialize all Safari fixes
export const initializeSafariFixes = () => {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined') return;

  safariStorageFix();
  safariFetchFix();
  safariEventFix();
  safariInputZoomFix();

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
  if (Platform.OS !== 'web') return;
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