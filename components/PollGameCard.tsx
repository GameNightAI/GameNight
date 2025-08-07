// poll/components/GameCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, useWindowDimensions, Linking } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SmilePlus, Smile, Laugh, HelpCircle, ThumbsDown, ThumbsUp, Heart, Star, Baby, Brain, ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react-native';

import { VOTING_OPTIONS, ICON_MAP, VoteType, getIconColor } from './votingOptions';

// Utility to get score by voteType
const getScoreByVoteType = (voteType: string): number => {
  const option = VOTING_OPTIONS.find(opt => opt.value === voteType);
  return option ? option.score : 0;
};

// Utility to get background color by score
const getVoteBgColor = (score: number, isSelected: boolean): string => {
  if (!isSelected) return '#f5f5f5';
  if (score > 2) return '#bbf7d0'; // green-200
  if (score < 0) return '#fecaca'; // red-200
  return '#fef9c3'; // yellow-100
};

interface Game {
  id: number;
  name: string;
  image_url: string;
  min_players: number;
  max_players: number;
  playing_time: number;
  complexity?: number;
  complexity_desc?: string;
  bgg_id?: number;
  year_published?: number;
  thumbnail?: string;
  image?: string;
  average?: number | null;
  minAge?: number;
  // userVote property removed as it is not used
}

interface Props {
  game: Game;
  index: number;
  selectedVote?: string;
  onVote: (gameId: number, voteType: VoteType) => void;
  disabled?: boolean;
}

export const GameCard = ({ game, index, selectedVote, onVote, disabled }: Props) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 500;
  const isSmallScreen = width < 400;

  const getButtonStyle = (voteType: string) => {
    const isSelected = selectedVote === voteType;
    const score = getScoreByVoteType(voteType);
    return [
      styles.voteButton,
      isSmallScreen && styles.voteButtonSmall,
      {
        backgroundColor: getVoteBgColor(score, isSelected),
        borderColor: isSelected ? (score > 1 ? '#22c55e' : score < 0 ? '#ef4444' : '#eab308') : 'transparent',
        borderWidth: isSelected ? 3 : 2,
        shadowColor: isSelected ? (score > 1 ? '#22c55e' : score < 0 ? '#ef4444' : '#eab308') : 'transparent',
        shadowOpacity: isSelected ? 0.25 : 0,
        shadowRadius: isSelected ? 8 : 0,
        elevation: isSelected ? 4 : 0,
      },
    ];
  };



  const [isExpanded, setIsExpanded] = React.useState(false);
  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  function hasRemovesGame(option: typeof VOTING_OPTIONS[number]): option is typeof VOTING_OPTIONS[number] & { removesGame: true } {
    return 'removesGame' in option && option.removesGame === true;
  }

  return (
    <Animated.View entering={FadeIn.delay(index * 100)} style={styles.card}>
      <TouchableOpacity
        style={styles.expandTouchable}
        activeOpacity={0.85}
        onPress={toggleExpanded}
      >
        {/* Main content area */}
        <View style={[styles.mainContent, isMobile && styles.mainContentMobile]}>
          {/* Game info and thumbnail row */}
          <View style={[styles.gameInfoRow, isMobile && styles.gameInfoRowMobile]}>
            <View style={[styles.gameInfo, isMobile && styles.gameInfoMobile]}>
              <Text style={[styles.name, isSmallScreen && styles.nameSmall]}>{game.name}</Text>
              <Text style={[styles.details, isSmallScreen && styles.detailsSmall]}>
                {game.min_players}-{game.max_players} players • {game.playing_time} min
              </Text>
            </View>
            <View style={styles.chevronContainer}>
              {isExpanded ? (
                <ChevronUp size={isSmallScreen ? 20 : 24} color="#ff9654" />
              ) : (
                <ChevronDown size={isSmallScreen ? 20 : 24} color="#ff9654" />
              )}
            </View>
            <Image
              source={{ uri: game.thumbnail || game.image || 'https://via.placeholder.com/80?text=No+Image' }}
              style={[
                styles.thumbnail,
                isMobile && styles.thumbnailMobile,
                isSmallScreen && styles.thumbnailSmall
              ]}
              resizeMode="cover"
            />
          </View>

          {/* Voting buttons row - moved below game info for mobile */}
          <View style={[styles.voteButtonsContainer, isMobile && styles.voteButtonsContainerMobile]}>
            {VOTING_OPTIONS.map(option => {
              const IconComponent = ICON_MAP[option.icon];
              return (
                <TouchableOpacity
                  key={option.value}
                  style={getButtonStyle(option.value)}
                  onPress={() => onVote(game.id, option.value)}
                  disabled={disabled}
                >
                  <IconComponent size={isSmallScreen ? 16 : 20} color={getIconColor(option.value, selectedVote === option.value)} />
                </TouchableOpacity>
              );
            })}
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
              <View style={[styles.detailItem, isSmallScreen && styles.detailItemSmall]}>
                <LinkIcon size={16} color="#1d4ed8" />
                <Text style={styles.detailLabel}>BGG Link</Text>
                <Text
                  style={[styles.detailValue, { color: '#1d4ed8', textDecorationLine: 'underline' }]}
                  onPress={() => Linking.openURL(`https://boardgamegeek.com/boardgame/${game.id}`)}
                >
                  More Info
                </Text>
              </View>
              <View style={[styles.detailItem, isSmallScreen && styles.detailItemSmall]}>
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
              <View style={[styles.detailItem, isSmallScreen && styles.detailItemSmall]}>
                <Star size={16} color="#10b981" />
                <Text style={styles.detailLabel}>Community Score</Text>
                <Text style={styles.detailValue}>
                  {game.average ? game.average.toFixed(1) : 'N/A'}
                </Text>
              </View>
              <View style={[styles.detailItem, isSmallScreen && styles.detailItemSmall]}>
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
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mainContentMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  gameInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  gameInfoRowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  gameInfo: {
    flex: 1,
    marginRight: 8,
  },
  gameInfoMobile: {
    flex: 1,
    marginRight: 0,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  thumbnailMobile: {
    width: 60,
    height: 60,
  },
  thumbnailSmall: {
    width: 48,
    height: 48,
  },
  chevronContainer: {
    marginLeft: 'auto',
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
    marginBottom: 4,
  },
  nameSmall: {
    fontSize: 13,
    marginBottom: 2,
  },
  details: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  detailsSmall: {
    fontSize: 11,
  },
  voteButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  voteButtonsContainerMobile: {
    justifyContent: 'space-around',
    paddingHorizontal: 8,
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
  voteButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  detailItemSmall: {
    borderRadius: 4,
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
});