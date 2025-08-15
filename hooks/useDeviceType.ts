import { useState, useEffect, useCallback } from 'react';
import { Dimensions, Platform } from 'react-native';

export interface DeviceType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  platform: string;
}

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

export function useDeviceType(): DeviceType {
  const [dimensions, setDimensions] = useState(() => {
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    return { screenWidth, screenHeight };
  });

  // Debounce the dimensions to prevent excessive updates
  const debouncedDimensions = useDebounce(dimensions, 150); // 150ms debounce

  const deviceType: DeviceType = {
    isMobile: debouncedDimensions.screenWidth < 768 || Platform.OS !== 'web',
    isTablet: debouncedDimensions.screenWidth >= 768 && debouncedDimensions.screenWidth < 1024 && Platform.OS === 'web',
    isDesktop: debouncedDimensions.screenWidth >= 1024 && Platform.OS === 'web',
    screenWidth: debouncedDimensions.screenWidth,
    screenHeight: debouncedDimensions.screenHeight,
    platform: Platform.OS,
  };

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const { width: screenWidth, height: screenHeight } = window;
      setDimensions({ screenWidth, screenHeight });
    });

    return () => subscription?.remove();
  }, []);

  return deviceType;
} 