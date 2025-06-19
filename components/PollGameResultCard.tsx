import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GameResult } from '@/hooks/usePollResults';

export function GameResultCard({ game }: { game: GameResult }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{game.name}</Text>
      <Text>👍: {game.thumbs_up}</Text>
      <Text>❤️: {game.double_thumbs_up}</Text>
      <Text>👎: {game.thumbs_down}</Text>
      <Text style={styles.voters}>Voters: {game.voters.join(', ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  name: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  voters: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
});