import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Heart, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Eye } from 'lucide-react-native';
import { GameResult } from '@/hooks/usePollResults';

export function GameResultCard({ game }: { game: GameResult }) {
  const [showVotes, setShowVotes] = useState(false);
  const totalVotes = game.double_thumbs_up + game.thumbs_up + game.thumbs_down;
  
  // Group voters by their vote type
  const getVotersByType = () => {
    const votersByType = {
      heart: [] as string[],
      thumbsUp: [] as string[],
      thumbsDown: [] as string[]
    };

    game.voterDetails.forEach(voter => {
      switch (voter.vote_type) {
        case 'double_thumbs_up':
          votersByType.heart.push(voter.name);
          break;
        case 'thumbs_up':
          votersByType.thumbsUp.push(voter.name);
          break;
        case 'thumbs_down':
          votersByType.thumbsDown.push(voter.name);
          break;
      }
    });

    return votersByType;
  };

  const votersByType = getVotersByType();
  
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{game.name}</Text>
      
      {/* Show Votes Button */}
      <View style={styles.showVotesSection}>
        <TouchableOpacity 
          style={styles.showVotesButton}
          onPress={() => setShowVotes(!showVotes)}
        >
          <Eye size={16} color="#ff9654" />
          <Text style={styles.showVotesText}>
            {showVotes ? 'Hide Votes' : 'Show Votes'}
          </Text>
          {showVotes ? (
            <ChevronUp size={16} color="#ff9654" />
          ) : (
            <ChevronDown size={16} color="#ff9654" />
          )}
        </TouchableOpacity>
      </View>

      {/* Vote Details - Only shown when showVotes is true */}
      {showVotes && (
        <View style={styles.votesContainer}>
          {/* Heart (Double Thumbs Up) */}
          <View style={styles.voteItem}>
            <View style={styles.voteIconContainer}>
              <Heart size={20} color="#ec4899" fill="#ec4899" />
              <Text style={[styles.voteCount, { color: '#ec4899' }]}>{game.double_thumbs_up}</Text>
            </View>
          </View>

          {/* Thumbs Up */}
          <View style={styles.voteItem}>
            <View style={styles.voteIconContainer}>
              <ThumbsUp size={20} color="#10b981" />
              <Text style={[styles.voteCount, { color: '#10b981' }]}>{game.thumbs_up}</Text>
            </View>
          </View>

          {/* Thumbs Down */}
          <View style={styles.voteItem}>
            <View style={styles.voteIconContainer}>
              <ThumbsDown size={20} color="#ef4444" />
              <Text style={[styles.voteCount, { color: '#ef4444' }]}>{game.thumbs_down}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Detailed Voter Information - Only shown when showVotes is true */}
      {showVotes && totalVotes > 0 && (
        <View style={styles.votersDetails}>
          {votersByType.heart.length > 0 && (
            <View style={styles.voteTypeSection}>
              <View style={styles.voteTypeHeader}>
                <Heart size={16} color="#ec4899" fill="#ec4899" />
                <Text style={[styles.voteTypeLabel, { color: '#ec4899' }]}>
                  Love ({votersByType.heart.length})
                </Text>
              </View>
              <Text style={styles.votersList}>
                {votersByType.heart.join(', ')}
              </Text>
            </View>
          )}

          {votersByType.thumbsUp.length > 0 && (
            <View style={styles.voteTypeSection}>
              <View style={styles.voteTypeHeader}>
                <ThumbsUp size={16} color="#10b981" />
                <Text style={[styles.voteTypeLabel, { color: '#10b981' }]}>
                  Like ({votersByType.thumbsUp.length})
                </Text>
              </View>
              <Text style={styles.votersList}>
                {votersByType.thumbsUp.join(', ')}
              </Text>
            </View>
          )}

          {votersByType.thumbsDown.length > 0 && (
            <View style={styles.voteTypeSection}>
              <View style={styles.voteTypeHeader}>
                <ThumbsDown size={16} color="#ef4444" />
                <Text style={[styles.voteTypeLabel, { color: '#ef4444' }]}>
                  Dislike ({votersByType.thumbsDown.length})
                </Text>
              </View>
              <Text style={styles.votersList}>
                {votersByType.thumbsDown.join(', ')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginLeft: 8, // Add margin to account for rank badge
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 16,
    lineHeight: 24,
  },
  showVotesSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  showVotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff5ef',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff9654',
    minWidth: 140,
  },
  showVotesText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
    marginHorizontal: 8,
  },
  votesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  voteItem: {
    alignItems: 'center',
    flex: 1,
  },
  voteIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  voteCount: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    marginTop: 4,
  },
  votersDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  voteTypeSection: {
    marginBottom: 12,
  },
  voteTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  voteTypeLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    marginLeft: 6,
  },
  votersList: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginLeft: 22,
  },
});