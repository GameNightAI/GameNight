// poll/components/GameCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ThumbsDown, ThumbsUp, Heart } from 'lucide-react-native';

import { VoteType } from '../hooks/usePollData';

interface Game {
  id: number;
  name: string;
  min_players: number;
  max_players: number;
  playing_time: number;
  userVote?: VoteType | null;
}

interface Props {
  game: Game;
  index: number;
  selectedVote?: VoteType;
  onVote: (gameId: number, voteType: VoteType) => void;
  disabled?: boolean;
}

export const GameCard = ({ game, index, selectedVote, onVote, disabled }: Props) => {
  const getButtonStyle = (voteType: VoteType) => {
    const isSelected = selectedVote === voteType;

    return [
      styles.voteButton,
      isSelected && styles.voteButtonSelected,
      isSelected && voteType === VoteType.THUMBS_DOWN && styles.thumbsDownSelected,
      isSelected && voteType === VoteType.THUMBS_UP && styles.thumbsUpSelected,
      isSelected && voteType === VoteType.DOUBLE_THUMBS_UP && styles.doubleThumbsUpSelected,
    ];
  };

  const getIconColor = (voteType: VoteType) => {
    if (selectedVote === voteType) {
      switch (voteType) {
        case VoteType.THUMBS_DOWN: return '#ef4444';
        case VoteType.THUMBS_UP: return '#10b981';
        case VoteType.DOUBLE_THUMBS_UP: return '#ec4899';
      }
    }
    return '#666666';
  };

  return (
    <Animated.View entering={FadeIn.delay(index * 100)} style={styles.card}>
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.name}>{game.name}</Text>
          <Text style={styles.details}>
            {game.min_players}-{game.max_players} players • {game.playing_time} min
          </Text>
        </View>

        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={getButtonStyle(VoteType.THUMBS_DOWN)}
            onPress={() => onVote(game.id, VoteType.THUMBS_DOWN)}
            disabled={disabled}
          >
            <ThumbsDown size={20} color={getIconColor(VoteType.THUMBS_DOWN)} />
          </TouchableOpacity>

          <TouchableOpacity
            style={getButtonStyle(VoteType.THUMBS_UP)}
            onPress={() => onVote(game.id, VoteType.THUMBS_UP)}
            disabled={disabled}
          >
            <ThumbsUp size={20} color={getIconColor(VoteType.THUMBS_UP)} />
          </TouchableOpacity>

          <TouchableOpacity
            style={getButtonStyle(VoteType.DOUBLE_THUMBS_UP)}
            onPress={() => onVote(game.id, VoteType.DOUBLE_THUMBS_UP)}
            disabled={disabled}
          >
            <Heart
              size={20}
              color={getIconColor(VoteType.DOUBLE_THUMBS_UP)}
              fill={selectedVote === VoteType.DOUBLE_THUMBS_UP ? getIconColor(VoteType.DOUBLE_THUMBS_UP) : 'transparent'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: 16,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voteButtonSelected: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
  },
  thumbsUpSelected: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  doubleThumbsUpSelected: {
    borderColor: '#ec4899',
    backgroundColor: '#fff7f9',
  },
  thumbsDownSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
});