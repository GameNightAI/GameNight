import React, { createContext, useContext, useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

interface AccessibilityContextType {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isBoldTextEnabled: boolean;
  isGrayscaleEnabled: boolean;
  announceForAccessibility: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  const [isBoldTextEnabled, setIsBoldTextEnabled] = useState(false);
  const [isGrayscaleEnabled, setIsGrayscaleEnabled] = useState(false);

  useEffect(() => {
    // Check initial accessibility states
    const checkAccessibilityStates = async () => {
      try {
        const screenReader = await AccessibilityInfo.isScreenReaderEnabled();
        const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
        const boldText = await AccessibilityInfo.isBoldTextEnabled();
        const grayscale = await AccessibilityInfo.isGrayscaleEnabled();

        setIsScreenReaderEnabled(screenReader);
        setIsReduceMotionEnabled(reduceMotion);
        setIsBoldTextEnabled(boldText);
        setIsGrayscaleEnabled(grayscale);
      } catch (error) {
        console.warn('Error checking accessibility states:', error);
      }
    };

    checkAccessibilityStates();

    // Listen for accessibility changes
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotionEnabled
    );

    const boldTextSubscription = AccessibilityInfo.addEventListener(
      'boldTextChanged',
      setIsBoldTextEnabled
    );

    const grayscaleSubscription = AccessibilityInfo.addEventListener(
      'grayscaleChanged',
      setIsGrayscaleEnabled
    );

    return () => {
      screenReaderSubscription?.remove();
      reduceMotionSubscription?.remove();
      boldTextSubscription?.remove();
      grayscaleSubscription?.remove();
    };
  }, []);

  const announceForAccessibility = (message: string) => {
    if (isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        isScreenReaderEnabled,
        isReduceMotionEnabled,
        isBoldTextEnabled,
        isGrayscaleEnabled,
        announceForAccessibility,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibilityContext = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibilityContext must be used within an AccessibilityProvider');
  }
  return context;
};
