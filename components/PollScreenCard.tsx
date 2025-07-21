import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Trophy, Medal, Award } from 'lucide-react-native';

interface GameVoteSummary {
  name: string;
  thumbs_up: number;
  double_thumbs_up: number;
  thumbs_down: number;
}

interface PollScreenCardProps {
  games: GameVoteSummary[];
  onViewDetails: () => void;
}

// Helper functions for ranking icons/colors
function getRankingIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy size={20} color="#FFC300" style={{ marginRight: 4 }} />; // Higher-contrast gold
    case 2:
      return <Medal size={20} color="#A6B1C2" style={{ marginRight: 4 }} />;
    case 3:
      return <Award size={20} color="#CD7F32" style={{ marginRight: 4 }} />;
    default:
      return null;
  }
}

function getRankingColor(rank: number) {
  switch (rank) {
    case 1:
      return '#FFC300'; // Higher-contrast gold
    case 2:
      return '#A6B1C2';
    case 3:
      return '#CD7F32';
    default:
      return '#666666';
  }
}

export function PollScreenCard({ games, onViewDetails }: PollScreenCardProps) {
  // Calculate scores and sort
  const scoredResults = games.map(game => ({
    ...game,
    score: (game.double_thumbs_up * 2) + game.thumbs_up - game.thumbs_down
  }));
  scoredResults.sort((a, b) => b.score - a.score);

  // Assign ranks, handling ties (match results context)
  let lastScore: number | null = null;
  let lastRank = 0;
  let tieGroup: number[] = [];
  const tempRanked: any[] = [];
  scoredResults.forEach((game, idx) => {
    if (lastScore === null || game.score !== lastScore) {
      if (tieGroup.length > 1) {
        tieGroup.forEach(i => tempRanked[i].tie = true);
      }
      tieGroup = [idx];
      lastRank = idx + 1;
    } else {
      tieGroup.push(idx);
    }
    tempRanked.push({ ...game, rank: lastRank, tie: false });
    lastScore = game.score;
  });
  if (tieGroup.length > 1) {
    tieGroup.forEach(i => tempRanked[i].tie = true);
  }
  const rankedResults = tempRanked;

  return (
    <View style={styles.card}>
      <Text style={styles.header}>Games & Votes</Text>
      {/* Header row for vote types */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }} />
        <View style={styles.voteCol}><Text style={styles.voteIcon}>❤️</Text></View>
        <View style={styles.voteCol}><Text style={styles.voteIcon}>👍</Text></View>
        <View style={styles.voteCol}><Text style={styles.voteIcon}>👎</Text></View>
      </View>
      {rankedResults.map((game, idx) => {
        // Alternate row shading for desktop/web
        const rowStyle = [
          styles.gameRowColumns,
          Platform.OS === 'web' && idx % 2 === 1 ? styles.altRow : null,
          Platform.OS === 'web' ? styles.gameRowDesktop : null,
        ];
        const icon = getRankingIcon(game.rank);
        const color = getRankingColor(game.rank);
        return (
          <View key={idx} style={rowStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {icon}
              <Text style={[styles.gameName, { color }]}>{game.name}</Text>
              {game.tie && (
                <Text style={{ color: '#888', fontSize: 12, marginLeft: 4 }}>(tie)</Text>
              )}
            </View>
            <View style={styles.voteCol}><Text style={styles.voteValue}>{game.double_thumbs_up}</Text></View>
            <View style={styles.voteCol}><Text style={styles.voteValue}>{game.thumbs_up}</Text></View>
            <View style={styles.voteCol}><Text style={styles.voteValue}>{game.thumbs_down}</Text></View>
          </View>
        );
      })}
      <TouchableOpacity style={styles.detailsButton} onPress={onViewDetails}>
        <Text style={styles.detailsButtonText}>View Detailed Results</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    // Condense width for desktop/web
    ...(Platform.OS === 'web' ? {
      maxWidth: 420,
      minWidth: 320,
      width: '100%',
      alignSelf: 'center',
    } : {}),
  },
  header: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gameName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  votesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voteType: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#444',
    marginLeft: 8,
  },
  detailsButton: {
    marginTop: 12,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 2 : 4,
    paddingLeft: 0,
    paddingRight: 0,
    minHeight: Platform.OS === 'web' ? 28 : undefined,
  },
  gameRowColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 2 : 6,
    paddingVertical: Platform.OS === 'web' ? 4 : 0,
    paddingHorizontal: Platform.OS === 'web' ? 2 : 0,
  },
  gameRowDesktop: {
    minHeight: 32,
  },
  altRow: {
    backgroundColor: '#f6f8fa', // subtle gray for alternating rows
    borderRadius: 6,
  },
  voteCol: {
    width: Platform.OS === 'web' ? 32 : 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteIcon: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#444',
  },
  voteValue: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#222',
  },
});
