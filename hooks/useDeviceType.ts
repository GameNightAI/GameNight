import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export interface DeviceType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  platform: string;
}

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const platform = Platform.OS;

    return {
      isMobile: screenWidth < 768 || platform !== 'web',
      isTablet: screenWidth >= 768 && screenWidth < 1024 && platform === 'web',
      isDesktop: screenWidth >= 1024 && platform === 'web',
      screenWidth,
      screenHeight,
      platform,
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const { width: screenWidth, height: screenHeight } = window;
      const platform = Platform.OS;

      setDeviceType({
        isMobile: screenWidth < 768 || platform !== 'web',
        isTablet: screenWidth >= 768 && screenWidth < 1024 && platform === 'web',
        isDesktop: screenWidth >= 1024 && platform === 'web',
        screenWidth,
        screenHeight,
        platform,
      });
    });

    return () => subscription?.remove();
  }, []);

  return deviceType;
} 