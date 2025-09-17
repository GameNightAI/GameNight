import { useCallback } from 'react';
import { AccessibilityInfo } from 'react-native';

export interface AccessibilityConfig {
  label: string;
  hint?: string;
  role?: 'button' | 'text' | 'image' | 'header' | 'link' | 'search' | 'none';
  state?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean;
    expanded?: boolean;
  };
}

export const useAccessibility = () => {
  const isScreenReaderEnabled = useCallback(async () => {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch {
      return false;
    }
  }, []);

  const announceForAccessibility = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  const setAccessibilityFocus = useCallback((reactTag: number) => {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }, []);

  return {
    isScreenReaderEnabled,
    announceForAccessibility,
    setAccessibilityFocus,
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
      role: 'button' as const,
    },
    polls: {
      label: 'Polls tab',
      hint: 'View and create voting polls for game nights',
      role: 'button' as const,
    },
    events: {
      label: 'Events tab',
      hint: 'View and manage game night events',
      role: 'button' as const,
    },
    profile: {
      label: 'Profile tab',
      hint: 'View and manage your account settings',
      role: 'button' as const,
    },
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

  // Poll-related
  pollCard: (title: string, gameCount: number, voteCount: number) => ({
    label: `Poll: ${title}, ${gameCount} games, ${voteCount} votes`,
    hint: 'Tap to view poll details and vote',
    role: 'button' as const,
  }),

  voteButton: (gameName: string, isVoted: boolean) => ({
    label: isVoted ? `Remove vote for ${gameName}` : `Vote for ${gameName}`,
    hint: isVoted ? 'Tap to remove your vote' : 'Tap to vote for this game',
    role: 'button' as const,
    state: { selected: isVoted },
  }),

  // Form elements
  textInput: (label: string, placeholder?: string) => ({
    label,
    hint: placeholder ? `Enter ${placeholder.toLowerCase()}` : undefined,
    role: 'text' as const,
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

  // Loading states
  loadingButton: (action: string) => ({
    label: `${action} in progress`,
    hint: 'Please wait while this action completes',
    role: 'button' as const,
    state: { disabled: true },
  }),

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
};
