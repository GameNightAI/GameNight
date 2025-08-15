import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { VOTING_OPTIONS, ICON_MAP, SCORE_TO_VOTE_TYPE, getVoteTypeKeyFromScore, getIconColor } from './votingOptions';
import { Game } from '@/types/game';

interface GameVotes {
  votes: Record<string, number>; // voteType1: 3, voteType2: 1, etc.
  voters: { name: string; vote_type: number }[];
}

interface PollGame extends Game {
  votes: GameVotes;
  userVote?: number | null;
}

// Utility to get background color by score
const getVoteBgColor = (score: number): string => {
  if (score > 1) return '#bbf7d0'; // green-200
  if (score < 0) return '#fecaca'; // red-200
  return '#fef9c3'; // yellow-100
};

export function GameResultCard({ game }: { game: PollGame }) {
  const [showVoters, setShowVoters] = useState(false);

  // Ensure game.votes exists
  if (!game.votes) {
    console.warn('Game votes is undefined for game:', game.id);
    return (
      <View style={styles.card}>
        <Text style={styles.name}>{game.name}</Text>
        <Text style={styles.errorText}>Vote data unavailable</Text>
      </View>
    );
  }

  // Calculate total votes using array manipulation
  const totalVotes = Object.values(game.votes.votes).reduce((sum, count) => sum + count, 0);

  // Group voters by their vote type
  const getVotersByType = () => {
    const votersByType: Record<string, string[]> = {};
    VOTING_OPTIONS.forEach(opt => { votersByType[opt.value] = []; });

    if (game.votes.voters && Array.isArray(game.votes.voters)) {
      game.votes.voters.forEach(voter => {
        const voteTypeKey = getVoteTypeKeyFromScore(voter.vote_type);
        if (votersByType[voteTypeKey]) {
          votersByType[voteTypeKey].push(voter.name);
        }
      });
    }
    return votersByType;
  };
  const votersByType = getVotersByType();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{game.name}</Text>
      </View>
      <View style={styles.votesContainer}>
        {VOTING_OPTIONS.map(function (option: typeof VOTING_OPTIONS[number]) {
          const score = option.score; // Get the score from the option for coloring
          const voteTypeKey = getVoteTypeKeyFromScore(option.score);
          const voteCount = game.votes.votes[voteTypeKey] || 0;
          return (
            <View style={styles.voteItem} key={option.value}>
              <View style={styles.voteIconContainer}>
                {(() => {
                  // Use ICON_MAP from votingOptions
                  const IconComponent = ICON_MAP[option.icon];

                  // Check if IconComponent is a valid React component (can be function or object with render method)
                  if (IconComponent && (typeof IconComponent === 'function' || typeof IconComponent === 'object')) {
                    return <IconComponent size={24} color={getIconColor(option.value)} />;
                  }

                  // Return null if no icon found
                  return null;
                })()}
                <Text style={[styles.voteCount, { backgroundColor: getVoteBgColor(score), borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, minWidth: 28, textAlign: 'center' }]}>{voteCount}</Text>
              </View>
              <Text style={styles.voteLabel}>{option.label}</Text>
            </View>
          );
        })}
      </View>
      {totalVotes > 0 && (
        <View style={styles.votersSection}>
          <TouchableOpacity
            style={styles.showVotersButton}
            onPress={() => setShowVoters(!showVoters)}
          >
            <Text style={styles.showVotersText}>
              {showVoters ? 'Hide Voters' : 'Show Voters'}
            </Text>
            {showVoters ? (
              <ChevronUp size={16} color="#ff9654" />
            ) : (
              <ChevronDown size={16} color="#ff9654" />
            )}
          </TouchableOpacity>
          {showVoters && (
            <View style={styles.votersDetails}>
              {VOTING_OPTIONS.map(option => (
                votersByType[option.value]?.length > 0 && (
                  <View style={styles.voteTypeSection} key={option.value}>
                    <View style={styles.voteTypeHeader}>
                      {(() => {
                        const IconComponent = ICON_MAP[option.icon];
                        if (IconComponent && (typeof IconComponent === 'function' || typeof IconComponent === 'object')) {
                          return <IconComponent size={16} color={getIconColor(option.value)} />;
                        }
                        return null;
                      })()}
                      <Text style={[styles.voteTypeLabel]}>
                        {option.label} ({votersByType[option.value].length})
                      </Text>
                    </View>
                    <Text style={styles.votersList}>
                      {votersByType[option.value].join(', ')}
                    </Text>
                  </View>
                )
              ))}
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
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    lineHeight: 24,
    flex: 1,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5ef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalScore: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#ff9654',
    marginLeft: 4,
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
  voteLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
    textAlign: 'center',
  },
  votersSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  showVotersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff5ef',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  showVotersText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
    marginRight: 4,
  },
  votersDetails: {
    marginTop: 12,
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
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
  },
});