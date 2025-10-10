// File not in use. Saved for future use if we implement screen rotation.

import { useState, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';

// Debounce function to limit how often we update dimensions
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedWindowDimensions(delay: number = 150) {
  const { width, height, scale, fontScale } = useWindowDimensions();

  // Debounce the dimensions to prevent excessive updates
  const debouncedWidth = useDebounce(width, delay);
  const debouncedHeight = useDebounce(height, delay);
  const debouncedScale = useDebounce(scale, delay);
  const debouncedFontScale = useDebounce(fontScale, delay);

  return {
    width: debouncedWidth,
    height: debouncedHeight,
    scale: debouncedScale,
    fontScale: debouncedFontScale,
  };
}
