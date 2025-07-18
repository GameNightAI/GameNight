// poll/components/GameCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ThumbsDown, ThumbsUp, Heart, Calendar, Star, Baby, Brain, ChevronDown, ChevronUp } from 'lucide-react-native';

import { VoteType } from '@/hooks/usePollData';

interface Game {
  id: number;
  name: string;
  min_players: number;
  max_players: number;
  playing_time: number;
  userVote?: VoteType | null;
  yearPublished?: number | null;
  complexity?: number;
  complexity_desc?: string;
  average?: number | null;
  minAge?: number;
  thumbnail?: string;
  image?: string;
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

  // Add expand/collapse state
  const [isExpanded, setIsExpanded] = React.useState(false);
  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  return (
    <Animated.View entering={FadeIn.delay(index * 100)} style={styles.card}>
      <TouchableOpacity
        style={styles.expandTouchable}
        activeOpacity={0.85}
        onPress={toggleExpanded}
      >
        <View style={styles.contentRowWithThumb}>
          <Image
            source={{ uri: game.thumbnail || game.image || 'https://via.placeholder.com/80?text=No+Image' }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.infoAndVote}>
            <View style={styles.info}>
              <Text style={styles.name}>{game.name}</Text>
              <Text style={styles.details}>
                {game.min_players}-{game.max_players} players • {game.playing_time} min
              </Text>
            </View>
            <View style={styles.voteButtonsContainer}>
              <View style={styles.voteButtons}>
                <TouchableOpacity
                  style={getButtonStyle(VoteType.THUMBS_DOWN)}
                  onPress={e => { e.stopPropagation(); onVote(game.id, VoteType.THUMBS_DOWN); }}
                  disabled={disabled}
                >
                  <ThumbsDown size={20} color={getIconColor(VoteType.THUMBS_DOWN)} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={getButtonStyle(VoteType.THUMBS_UP)}
                  onPress={e => { e.stopPropagation(); onVote(game.id, VoteType.THUMBS_UP); }}
                  disabled={disabled}
                >
                  <ThumbsUp size={20} color={getIconColor(VoteType.THUMBS_UP)} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={getButtonStyle(VoteType.DOUBLE_THUMBS_UP)}
                  onPress={e => { e.stopPropagation(); onVote(game.id, VoteType.DOUBLE_THUMBS_UP); }}
                  disabled={disabled}
                >
                  <Heart
                    size={20}
                    color={getIconColor(VoteType.DOUBLE_THUMBS_UP)}
                    fill={selectedVote === VoteType.DOUBLE_THUMBS_UP ? getIconColor(VoteType.DOUBLE_THUMBS_UP) : 'transparent'}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.chevronIcon}>
                {isExpanded ? (
                  <ChevronUp size={24} color="#ff9654" />
                ) : (
                  <ChevronDown size={24} color="#ff9654" />
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {isExpanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.expandedContent}
        >
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Calendar size={16} color="#ff9654" />
                <Text style={styles.detailLabel}>Publication Year</Text>
                <Text style={styles.detailValue}>
                  {game.yearPublished || 'Unknown'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Brain size={16} color="#8b5cf6" />
                <Text style={styles.detailLabel}>Weight</Text>
                <Text style={styles.detailValue}>
                  {game.complexity ?
                    `${game.complexity.toFixed(1)}${game.complexity_desc ? ` (${game.complexity_desc})` : ''}`
                    : 'Unknown'}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Star size={16} color="#10b981" />
                <Text style={styles.detailLabel}>Community Score</Text>
                <Text style={styles.detailValue}>
                  {game.average ? game.average.toFixed(1) : 'N/A'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Baby size={16} color="#e74c3c" />
                <Text style={styles.detailLabel}>Minimum Age</Text>
                <Text style={styles.detailValue}>
                  {game.minAge ? `${game.minAge}+` : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12, // Add padding similar to GameItem
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contentRowWithThumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  infoAndVote: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 12,
    gap: 8,
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
  expandIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: '#fff0f0',
    borderRadius: 12,
    padding: 4,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailsContainer: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    padding: 12,
    borderRadius: 8,
  },
  detailLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
  },
  detailValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginTop: 2,
    textAlign: 'center',
  },
  expandTouchable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voteButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevronIcon: {
    marginLeft: 8,
  },
});