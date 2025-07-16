import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Users, Clock, X, ChevronDown, ChevronUp, Calendar, Star, Baby, Brain } from 'lucide-react-native';
import Animated, { FadeOut, FadeIn, SlideInDown, SlideOutUp } from 'react-native-reanimated';

import { Game } from '@/types/game';

interface GameItemProps {
  game: Game;
  onDelete: (id: number) => void;
}

function decodeHTML(html: string): string {
  var txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

export const GameItem: React.FC<GameItemProps> = ({ game, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Animated.View
      style={styles.container}
      exiting={FadeOut.duration(200)}
    >
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(game.id)}
      >
        <X size={16} color="#e74c3c" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.mainContent}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: game.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {decodeHTML(game.name)}
            </Text>
            <View style={styles.expandIcon}>
              {isExpanded ? (
                <ChevronUp size={20} color="#666666" />
              ) : (
                <ChevronDown size={20} color="#666666" />
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Users size={16} color="#666666" />
              <Text style={styles.infoText}>
                {game.max_players ?
                  game.min_players + (game.min_players === game.max_players ? '' : '-' + game.max_players) + ' player' + (game.max_players === 1 ? '' : 's')
                  : 'N/A'}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Clock size={16} color="#666666" />
              <Text style={styles.infoText}>
                {game.maxPlaytime === 0 ? 'N/A'
                  : game.minPlaytime + (game.minPlaytime === game.maxPlaytime ? '' : '-' + game.maxPlaytime) + ' min'}
              </Text>
            </View>
          </View>
        </View>
        
        {isExpanded ? (
          <ChevronUp size={24} color="#ff9654" />
        ) : (
          <ChevronDown size={24} color="#ff9654" />
        )}
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
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: '#fff0f0',
    borderRadius: 12,
    padding: 4,
  },
  mainContent: {
    flexDirection: 'row',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    paddingRight: 24,
    flex: 1,
  },
  expandIcon: {
    marginLeft: 8,
    marginTop: 2,
  },
  expandIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#666666',
    marginLeft: 4,
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
});