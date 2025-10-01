import React from 'react';
import { Heart, Meh, X } from 'lucide-react-native';

export const EVENT_VOTING_OPTIONS = [
  { value: 2, icon: 'Heart', label: 'Ideal', score: 2, color: '#10b981' },
  { value: 1, icon: 'Meh', label: 'Doable', score: 1, color: '#f59e0b' },
  { value: -2, icon: 'X', label: 'No', score: -1, color: '#ef4444' },
] as const;

export type EventVoteType = typeof EVENT_VOTING_OPTIONS[number]['value'];
export type EventIconName = typeof EVENT_VOTING_OPTIONS[number]['icon'];

export const EVENT_ICON_MAP: Record<EventIconName, React.ComponentType<any>> = {
  Heart,
  Meh,
  X,
};

export const EVENT_VOTE_TYPE_TO_SCORE = Object.fromEntries(
  EVENT_VOTING_OPTIONS.map(opt => [opt.value, opt.score])
);

export const EVENT_SCORE_TO_VOTE_TYPE = Object.fromEntries(
  EVENT_VOTING_OPTIONS.map(opt => [opt.score, opt.value])
);

// Utility function to get vote type from score
export const getEventVoteTypeFromScore = (score: number): EventVoteType => {
  switch (score) {
    case 2: return 2;  // Ideal
    case 1: return 1;  // Doable
    case -2: return -2; // No
    default: return 1; // Default to Doable
  }
};

// Utility function to get icon color based on vote type and selection state
export const getEventIconColor = (voteType: EventVoteType, isSelected: boolean = false, colors?: any): string => {
  if (isSelected) {
    switch (voteType) {
      case 2: return colors?.success || '#10b981'; // Ideal - green
      case 1: return colors?.warning || '#f59e0b'; // Doable - orange
      case -2: return colors?.error || '#ef4444'; // No - red
    }
  }
  return colors?.textMuted || '#666666'; // Default gray for unselected
};

// Utility function to get background color based on vote type and selection state
export const getEventVoteBgColor = (voteType: EventVoteType, isSelected: boolean, colors?: any): string => {
  if (!isSelected) return colors?.tints?.neutral || '#f5f5f5';

  switch (voteType) {
    case 2: return colors?.tints?.success || '#bbf7d0'; // Ideal - light green
    case 1: return colors?.tints?.warningBg || '#fef3c7'; // Doable - light orange
    case -2: return colors?.tints?.error || '#fecaca'; // No - light red
    default: return colors?.tints?.neutral || '#f5f5f5';
  }
};

// Utility function to get border color based on vote type and selection state
export const getEventVoteBorderColor = (voteType: EventVoteType, isSelected: boolean, colors?: any): string => {
  if (!isSelected) return 'transparent';

  switch (voteType) {
    case 2: return colors?.success || '#10b981'; // Ideal - green
    case 1: return colors?.warning || '#f59e0b'; // Doable - orange
    case -2: return colors?.error || '#ef4444'; // No - red
    default: return 'transparent';
  }
};
