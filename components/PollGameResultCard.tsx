import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Heart, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { GameResult } from '@/hooks/usePollResults';

export function GameResultCard({ game }: { game: GameResult }) {
  const totalVotes = game.double_thumbs_up + game.thumbs_up + game.thumbs_down;
  
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{game.name}</Text>
      
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

      {totalVotes > 0 && (
        <View style={styles.votersSection}>
          <Text style={styles.votersLabel}>Voters:</Text>
          <Text style={styles.voters}>{game.voters.join(', ')}</Text>
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 12,
    lineHeight: 24,
  },
  votesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
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
  votersSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  votersLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  voters: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});