import { useCallback } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';

export interface AccessibilityConfig {
  label: string;
  hint?: string;
  role?: 'button' | 'text' | 'image' | 'header' | 'link' | 'search' | 'none' | 'tab' | 'tablist' | 'list' | 'listitem' | 'grid' | 'gridcell' | 'menu' | 'menuitem' | 'dialog' | 'alert' | 'status' | 'progressbar' | 'slider' | 'switch' | 'checkbox' | 'radio' | 'combobox' | 'textbox' | 'spinbutton' | 'scrollbar' | 'toolbar' | 'menubar' | 'tree' | 'treeitem' | 'tabpanel' | 'group' | 'region' | 'banner' | 'complementary' | 'contentinfo' | 'form' | 'main' | 'navigation' | 'search';
  state?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean;
    expanded?: boolean;
    busy?: boolean;
    required?: boolean;
    invalid?: boolean;
  };
  value?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  actions?: string[];
}

export const useAccessibility = () => {
  const {
    isScreenReaderEnabled: contextScreenReaderEnabled,
    isReduceMotionEnabled,
    isBoldTextEnabled,
    isGrayscaleEnabled,
    colorScheme,
    fontScale,
    getScaledFontSize,
    announceForAccessibility: contextAnnounceForAccessibility
  } = useAccessibilityContext();

  const isScreenReaderEnabled = useCallback(async () => {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch {
      return false;
    }
  }, []);

  const announceForAccessibility = useCallback((message: string) => {
    if (contextScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [contextScreenReaderEnabled]);

  const setAccessibilityFocus = useCallback((reactTag: number) => {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }, []);

  // Font scaling utilities - use the context function directly

  const getScaledLineHeight = useCallback((baseSize: number, lineHeightMultiplier: number = 1.4): number => {
    return Math.round(getScaledFontSize(baseSize) * lineHeightMultiplier);
  }, [getScaledFontSize]);

  // Accessibility-aware styling
  const getAccessibilityStyles = useCallback((baseStyles: any) => {
    const scaledStyles = { ...baseStyles };

    // Scale font sizes
    if (scaledStyles.fontSize) {
      scaledStyles.fontSize = getScaledFontSize(scaledStyles.fontSize);
    }

    // Scale line heights
    if (scaledStyles.lineHeight) {
      scaledStyles.lineHeight = getScaledLineHeight(scaledStyles.fontSize || 16, scaledStyles.lineHeight / (scaledStyles.fontSize || 16));
    }

    // Apply bold text if enabled
    if (isBoldTextEnabled && scaledStyles.fontWeight) {
      scaledStyles.fontWeight = 'bold';
    }

    // Apply grayscale if enabled
    if (isGrayscaleEnabled) {
      scaledStyles.filter = 'grayscale(100%)';
    }

    return scaledStyles;
  }, [getScaledFontSize, getScaledLineHeight, isBoldTextEnabled, isGrayscaleEnabled]);

  // Touch target utilities
  const getMinimumTouchTarget = useCallback((size: number = 44): number => {
    return Math.max(size, 44); // 44pt minimum as per Apple HIG
  }, []);

  const getAccessibleTouchTarget = useCallback((baseSize: number, padding: number = 8) => {
    const minSize = getMinimumTouchTarget();
    const totalSize = baseSize + (padding * 2);
    return Math.max(totalSize, minSize);
  }, [getMinimumTouchTarget]);

  // High contrast utilities
  const getHighContrastColor = useCallback((lightColor: string, darkColor: string) => {
    // In high contrast mode, use more contrasting colors
    return isGrayscaleEnabled ? darkColor : lightColor;
  }, [isGrayscaleEnabled]);

  // Motion reduction utilities
  const getReducedMotionStyle = useCallback((normalStyle: any, reducedStyle: any) => {
    return isReduceMotionEnabled ? reducedStyle : normalStyle;
  }, [isReduceMotionEnabled]);

  return {
    // Core accessibility state
    isScreenReaderEnabled: contextScreenReaderEnabled,
    isReduceMotionEnabled,
    isBoldTextEnabled,
    isGrayscaleEnabled,
    colorScheme,
    fontScale,

    // Core accessibility functions
    announceForAccessibility,
    setAccessibilityFocus,

    // Font scaling utilities
    getScaledFontSize: getScaledFontSize,
    getScaledLineHeight,
    getAccessibilityStyles,

    // Touch target utilities
    getMinimumTouchTarget,
    getAccessibleTouchTarget,

    // Color and contrast utilities
    getHighContrastColor,

    // Motion utilities
    getReducedMotionStyle,
  };
};

// Common accessibility configurations for your app
export const accessibilityConfigs = {
  // Navigation
  backButton: {
    label: 'Go back',
    hint: 'Returns to the previous screen',
    role: 'button' as const,
  },
  closeButton: {
    label: 'Close',
    hint: 'Closes the current dialog or modal',
    role: 'button' as const,
  },
  tabBar: {
    collection: {
      label: 'Collection tab',
      hint: 'View and manage your board game collection',
      role: 'tab' as const,
    },
    polls: {
      label: 'Polls tab',
      hint: 'View and create voting polls for game nights',
      role: 'tab' as const,
    },
    events: {
      label: 'Events tab',
      hint: 'View and manage game night events',
      role: 'tab' as const,
    },
    profile: {
      label: 'Profile tab',
      hint: 'View and manage your account settings',
      role: 'tab' as const,
    },
    tools: {
      label: 'Tools tab',
      hint: 'Access game tools like dice and score tracking',
      role: 'tab' as const,
    },
  },

  // Tab bar container
  tabBarContainer: {
    label: 'Main navigation',
    role: 'tablist' as const,
  },

  // Game-related
  gameCard: (gameName: string, playerCount: string, playTime: string) => ({
    label: `${gameName}, ${playerCount} players, ${playTime}`,
    hint: 'Tap to view game details or add to poll',
    role: 'button' as const,
  }),

  gameImage: (gameName: string) => ({
    label: `${gameName} game cover`,
    role: 'image' as const,
  }),

  gameList: {
    label: 'Game collection',
    role: 'list' as const,
  },

  gameListItem: (gameName: string, playerCount: string, playTime: string) => ({
    label: `${gameName}, ${playerCount} players, ${playTime}`,
    role: 'listitem' as const,
  }),

  gameDetails: (gameName: string) => ({
    label: `Details for ${gameName}`,
    role: 'region' as const,
  }),

  // Poll-related
  pollCard: (title: string, gameCount: number, voteCount: number) => ({
    label: `Poll: ${title}, ${gameCount} games, ${voteCount} votes`,
    hint: 'Tap to view poll details and vote',
    role: 'button' as const,
  }),

  pollList: {
    label: 'Game polls',
    role: 'list' as const,
  },

  pollListItem: (title: string, gameCount: number, voteCount: number) => ({
    label: `Poll: ${title}, ${gameCount} games, ${voteCount} votes`,
    role: 'listitem' as const,
  }),

  voteButton: (gameName: string, isVoted: boolean) => ({
    label: isVoted ? `Remove vote for ${gameName}` : `Vote for ${gameName}`,
    hint: isVoted ? 'Tap to remove your vote' : 'Tap to vote for this game',
    role: 'button' as const,
    state: { selected: isVoted },
  }),

  voteGrid: {
    label: 'Voting options',
    role: 'grid' as const,
  },

  voteGridCell: (gameName: string, isVoted: boolean) => ({
    label: `${gameName} vote option`,
    role: 'gridcell' as const,
    state: { selected: isVoted },
  }),

  pollResults: {
    label: 'Poll results',
    role: 'region' as const,
  },

  // Form elements
  textInput: (label: string, placeholder?: string) => ({
    label,
    hint: placeholder ? `Enter ${placeholder.toLowerCase()}` : undefined,
    role: 'textbox' as const,
  }),

  form: {
    label: 'Form',
    role: 'form' as const,
  },

  formField: (label: string, required: boolean = false) => ({
    label,
    role: 'textbox' as const,
    state: { required },
  }),

  switch: (label: string, isOn: boolean) => ({
    label,
    role: 'switch' as const,
    state: { checked: isOn },
  }),

  checkbox: (label: string, isChecked: boolean) => ({
    label,
    role: 'checkbox' as const,
    state: { checked: isChecked },
  }),

  radio: (label: string, isSelected: boolean) => ({
    label,
    role: 'radio' as const,
    state: { checked: isSelected },
  }),

  // Action buttons
  primaryButton: (action: string) => ({
    label: action,
    hint: 'Tap to perform this action',
    role: 'button' as const,
  }),

  secondaryButton: (action: string) => ({
    label: action,
    hint: 'Tap to perform this action',
    role: 'button' as const,
  }),

  destructiveButton: (action: string) => ({
    label: action,
    hint: 'Tap to perform this destructive action',
    role: 'button' as const,
  }),

  // Loading states
  loadingButton: (action: string) => ({
    label: `${action} in progress`,
    hint: 'Please wait while this action completes',
    role: 'button' as const,
    state: { disabled: true, busy: true },
  }),

  loadingSpinner: {
    label: 'Loading',
    role: 'progressbar' as const,
  },

  // Camera and image
  cameraButton: {
    label: 'Take photo',
    hint: 'Opens camera to take a photo of your game collection',
    role: 'button' as const,
  },

  photoLibraryButton: {
    label: 'Choose from library',
    hint: 'Opens photo library to select an existing photo',
    role: 'button' as const,
  },

  // Search
  searchInput: {
    label: 'Search games',
    hint: 'Enter game name to search',
    role: 'search' as const,
  },

  searchButton: {
    label: 'Search',
    hint: 'Tap to search for games',
    role: 'button' as const,
  },

  // Filters
  filterButton: (isActive: boolean) => ({
    label: isActive ? 'Filter active' : 'Filter games',
    hint: isActive ? 'Tap to view active filters' : 'Tap to filter games',
    role: 'button' as const,
    state: { selected: isActive },
  }),

  // Results and rankings
  rankingItem: (position: number, gameName: string, score: number) => ({
    label: `Rank ${position}: ${gameName} with ${score} votes`,
    hint: 'Game ranking in poll results',
    role: 'text' as const,
  }),

  // Headers
  screenHeader: (title: string) => ({
    label: title,
    role: 'header' as const,
  }),

  sectionHeader: (title: string) => ({
    label: title,
    role: 'header' as const,
  }),

  // Modal and dialog
  modal: (title: string) => ({
    label: title,
    role: 'dialog' as const,
  }),

  modalOverlay: {
    label: 'Modal background',
    role: 'none' as const,
  },

  // Status and feedback
  statusMessage: (message: string) => ({
    label: message,
    role: 'status' as const,
  }),

  alertMessage: (message: string) => ({
    label: message,
    role: 'alert' as const,
  }),

  // Tools and utilities
  diceButton: (sides: number) => ({
    label: `Roll ${sides}-sided die`,
    hint: 'Tap to roll the dice',
    role: 'button' as const,
  }),

  scoreTracker: {
    label: 'Score tracker',
    role: 'region' as const,
  },

  firstPlayerSelector: {
    label: 'First player selector',
    role: 'button' as const,
  },

  // Empty states
  emptyState: (message: string) => ({
    label: message,
    role: 'status' as const,
  }),

  errorState: (message: string) => ({
    label: `Error: ${message}`,
    role: 'alert' as const,
  }),
};
