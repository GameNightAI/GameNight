import React from 'react';
import { Text } from 'react-native';

export const VOTING_OPTIONS = [
  { value: 'voteType1', icon: 'voteType1Icon', label: 'Excited', score: 3 },
  { value: 'voteType2', icon: 'voteType2Icon', label: 'Like', score: 2 },
  { value: 'voteType3', icon: 'voteType3Icon', label: 'Would Play', score: 1 },
  { value: 'voteType4', icon: 'voteType4Icon', label: 'Don\'t Know', score: 0 },
  { value: 'voteType5', icon: 'voteType5Icon', label: 'Veto', score: -3 },
] as const;

export type VoteType = typeof VOTING_OPTIONS[number]['value'];
export type IconName = typeof VOTING_OPTIONS[number]['icon'];

export const ICON_MAP: Record<IconName, React.ComponentType<any> | string> = {
  voteType1Icon: (props: any) => <Text {...props} accessibilityLabel="Vote Type 1">😍</Text>,
  voteType2Icon: (props: any) => <Text {...props} accessibilityLabel="Vote Type 2">😃</Text>,
  voteType3Icon: (props: any) => <Text {...props} accessibilityLabel="Vote Type 3">😐</Text>,
  voteType4Icon: (props: any) => <Text {...props} accessibilityLabel="Vote Type 4">❓</Text>,
  voteType5Icon: (props: any) => <Text {...props} accessibilityLabel="Vote Type 5">👎</Text>,
};

export const VOTE_TYPE_TO_SCORE = Object.fromEntries(VOTING_OPTIONS.map(opt => [opt.value, opt.score]));
export const SCORE_TO_VOTE_TYPE = Object.fromEntries(VOTING_OPTIONS.map(opt => [opt.score, opt.value])); 