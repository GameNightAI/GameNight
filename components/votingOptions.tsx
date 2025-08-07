import React from 'react';
import { Text } from 'react-native';
import { SmilePlus, Smile, Laugh, HelpCircle, ThumbsDown } from 'lucide-react-native';

export const VOTING_OPTIONS = [
  { value: 'voteType1', icon: 'voteType1Icon', label: 'Excited', score: 3 },
  { value: 'voteType2', icon: 'voteType2Icon', label: 'Like', score: 2 },
  { value: 'voteType3', icon: 'voteType3Icon', label: 'Would Play', score: 1 },
  // { value: 'voteType4', icon: 'voteType4Icon', label: 'Don\'t Know', score: 0 },
  { value: 'voteType5', icon: 'voteType5Icon', label: 'Veto', score: -3 },
] as const;

export type VoteType = typeof VOTING_OPTIONS[number]['value'];
export type IconName = typeof VOTING_OPTIONS[number]['icon'];

export const ICON_MAP: Record<IconName, React.ComponentType<any> | string> = {
  voteType1Icon: Laugh,
  voteType2Icon: SmilePlus,
  voteType3Icon: Smile,
  // voteType4Icon: HelpCircle,
  voteType5Icon: ThumbsDown,
};

export const VOTE_TYPE_TO_SCORE = Object.fromEntries(VOTING_OPTIONS.map(opt => [opt.value, opt.score]));
export const SCORE_TO_VOTE_TYPE = Object.fromEntries(VOTING_OPTIONS.map(opt => [opt.score, opt.value]));

// Utility function to map score to voteType key
export const getVoteTypeKeyFromScore = (score: number): string => {
  switch (score) {
    case 3: return 'voteType1';  // Excited
    case 2: return 'voteType2';  // Like
    case 1: return 'voteType3';  // Would Play
    // case 0: return 'voteType4';  // Don't Know
    case -3: return 'voteType5'; // Veto
    default: return 'voteType4'; // Default to Don't Know
  }
};

// Utility function to get icon color based on vote type and selection state
export const getIconColor = (voteType: string, isSelected: boolean = false): string => {
  if (isSelected) {
    switch (voteType) {
      case 'voteType1': return '#10b981'; // Excited - green smiley green background
      case 'voteType2': return '#10b981'; // Like - green smiley yellow background
      case 'voteType3': return '#fbbf24'; // Would Play - yellow smiley yellow background
      // case 'voteType4': return '#fbbf24'; // Don't Know - yellow
      case 'voteType5': return '#ef4444'; // Veto - red thumbsdown red background
    }
  }
  return '#666666'; // Default gray for unselected
}; 