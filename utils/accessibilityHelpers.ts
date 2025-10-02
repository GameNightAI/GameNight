import { Platform } from 'react-native';

/**
 * Accessibility helper utilities for GameNyte
 */

// Font scaling utilities
export const getScaledFontSize = (baseSize: number, fontScale: number = 1): number => {
  return Math.round(baseSize * fontScale);
};

export const getScaledLineHeight = (baseSize: number, fontScale: number = 1, lineHeightMultiplier: number = 1.4): number => {
  return Math.round(getScaledFontSize(baseSize, fontScale) * lineHeightMultiplier);
};

// Touch target utilities
export const getMinimumTouchTarget = (size: number = 44): number => {
  return Math.max(size, 44); // 44pt minimum as per Apple HIG
};

export const getAccessibleTouchTarget = (baseSize: number, padding: number = 8): number => {
  const minSize = getMinimumTouchTarget();
  const totalSize = baseSize + (padding * 2);
  return Math.max(totalSize, minSize);
};

// Color contrast utilities
export const getHighContrastColor = (lightColor: string, darkColor: string, isGrayscale: boolean = false): string => {
  return isGrayscale ? darkColor : lightColor;
};

// Animation utilities for reduced motion
export const getReducedMotionStyle = (normalStyle: any, reducedStyle: any, isReduceMotion: boolean = false): any => {
  return isReduceMotion ? reducedStyle : normalStyle;
};

// Platform-specific accessibility
export const getPlatformAccessibilityProps = (props: any) => {
  if (Platform.OS === 'web') {
    return {
      ...props,
      // Web-specific accessibility props
      tabIndex: props.disabled ? -1 : 0,
    };
  }
  return props;
};

// VoiceOver announcement utilities
export const createAnnouncement = (message: string, priority: 'polite' | 'assertive' = 'polite'): string => {
  return message;
};

// Screen reader navigation helpers
export const createNavigationHint = (currentScreen: string, availableActions: string[]): string => {
  return `You are on ${currentScreen}. Available actions: ${availableActions.join(', ')}`;
};

// Form validation accessibility
export const createValidationMessage = (fieldName: string, isValid: boolean, errorMessage?: string): string => {
  if (isValid) {
    return `${fieldName} is valid`;
  }
  return errorMessage || `${fieldName} has an error`;
};

// List and grid accessibility
export const createListNavigationHint = (itemCount: number, currentIndex: number): string => {
  return `Item ${currentIndex + 1} of ${itemCount}`;
};

export const createGridNavigationHint = (row: number, col: number, totalRows: number, totalCols: number): string => {
  return `Row ${row + 1} of ${totalRows}, Column ${col + 1} of ${totalCols}`;
};

// Poll and voting accessibility
export const createVoteAnnouncement = (gameName: string, isVoted: boolean, totalVotes: number): string => {
  const action = isVoted ? 'removed from' : 'added to';
  return `${gameName} ${action} your vote. Total votes: ${totalVotes}`;
};

export const createPollStatusAnnouncement = (pollTitle: string, gameCount: number, voteCount: number): string => {
  return `Poll: ${pollTitle}. ${gameCount} games available. ${voteCount} total votes.`;
};

// Game collection accessibility
export const createGameCardAnnouncement = (gameName: string, playerCount: string, playTime: string, isOwned: boolean): string => {
  const ownership = isOwned ? 'owned' : 'not owned';
  return `${gameName}. ${playerCount} players. ${playTime} play time. ${ownership}.`;
};

// Error and status accessibility
export const createErrorAnnouncement = (errorType: string, errorMessage: string): string => {
  return `Error: ${errorType}. ${errorMessage}`;
};

export const createSuccessAnnouncement = (action: string, details?: string): string => {
  return `Success: ${action}${details ? `. ${details}` : ''}`;
};

// Loading state accessibility
export const createLoadingAnnouncement = (action: string, progress?: number): string => {
  if (progress !== undefined) {
    return `${action} in progress. ${progress}% complete.`;
  }
  return `${action} in progress. Please wait.`;
};

// Modal and dialog accessibility
export const createModalAnnouncement = (title: string, isOpen: boolean): string => {
  return isOpen ? `${title} dialog opened` : `${title} dialog closed`;
};

// Tab navigation accessibility
export const createTabAnnouncement = (tabName: string, isSelected: boolean): string => {
  return isSelected ? `${tabName} tab selected` : `${tabName} tab`;
};

// Search accessibility
export const createSearchAnnouncement = (query: string, resultCount: number): string => {
  if (resultCount === 0) {
    return `No results found for "${query}"`;
  }
  return `${resultCount} results found for "${query}"`;
};

// Filter accessibility
export const createFilterAnnouncement = (filterType: string, isActive: boolean, value?: string): string => {
  const status = isActive ? 'applied' : 'removed';
  const filterValue = value ? ` with value "${value}"` : '';
  return `${filterType} filter ${status}${filterValue}`;
};
