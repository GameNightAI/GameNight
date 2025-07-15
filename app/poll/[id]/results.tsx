import React, { useState, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { usePollResults } from '@/hooks/usePollResults';
import { GameResultCard } from '@/components/PollGameResultCard';
import { supabase } from '@/services/supabase';
import { Trophy, Medal, Award, Vote } from 'lucide-react-native';

export default function PollResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);

  const { pollTitle, gameResults, hasVoted, loading, error } = usePollResults(id as string | undefined);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          router.replace({ pathname: '/poll/[id]', params: { id: id as string } });
        }}
      />
    );
  }

  // Sort games by total positive votes (heart votes count double)
  const sortedResults = [...gameResults].sort((a, b) => {
    const aScore = (a.double_thumbs_up * 2) + a.thumbs_up - a.thumbs_down;
    const bScore = (b.double_thumbs_up * 2) + b.thumbs_up - b.thumbs_down;
    return bScore - aScore;
  });

  const getRankingIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy size={24} color="#FFD700" />;
      case 1:
        return <Medal size={24} color="#C0C0C0" />;
      case 2:
        return <Award size={24} color="#CD7F32" />;
      default:
        return null;
    }
  };

  const getRankingColor = (index: number) => {
    switch (index) {
      case 0:
        return '#FFD700';
      case 1:
        return '#C0C0C0';
      case 2:
        return '#CD7F32';
      default:
        return '#666666';
    }
  };

  const navigateToVoting = () => {
    router.push({ pathname: '/poll/[id]', params: { id: id as string } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Poll Results</Text>
        <Text style={styles.subtitle}>{pollTitle}</Text>
      </View>

      {!user && (
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>
            Want to create your own polls?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={styles.signUpLink}>Sign up for free</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sortedResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No votes have been cast yet.</Text>
          </View>
        ) : (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Ranking Results</Text>
              <Text style={styles.resultsSubtitle}>
                {sortedResults.length} game{sortedResults.length !== 1 ? 's' : ''} ranked by votes
              </Text>
            </View>

            {sortedResults.map((game, index) => (
              <View key={game.id} style={styles.resultItem}>
                <View style={styles.rankingContainer}>
                  <View style={[styles.rankingBadge, { backgroundColor: getRankingColor(index) }]}>
                    {getRankingIcon(index)}
                    <Text style={styles.rankingNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.rankingInfo}>
                    <Text style={styles.rankingLabel}>
                      {index === 0 ? '1st Place' :
                        index === 1 ? '2nd Place' :
                          index === 2 ? '3rd Place' :
                            `${index + 1}${getOrdinalSuffix(index + 1)} Place`}
                    </Text>
                    <Text style={styles.scoreText}>
                      Score: {(game.double_thumbs_up * 2) + game.thumbs_up - game.thumbs_down}
                    </Text>
                  </View>
                </View>
                <GameResultCard game={game} />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.bottomActionsContainer}>
        <TouchableOpacity
          style={styles.backToVotingButton}
          onPress={navigateToVoting}
        >
          <Vote size={20} color="#ffffff" />
          <Text style={styles.backToVotingButtonText}>
            {hasVoted ? 'Back to Voting' : 'Vote Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getOrdinalSuffix = (num: number) => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    backgroundColor: '#1a2b5f',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  resultsHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e1e5ea',
  },
  resultsTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  resultsSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
  },
  resultItem: {
    marginBottom: 20,
  },
  rankingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  rankingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 12,
    minWidth: 60,
    justifyContent: 'center',
  },
  rankingNumber: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 4,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 2,
  },
  scoreText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  signUpContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  signUpText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  signUpLink: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#ff9654',
    textDecorationLine: 'underline',
  },
  bottomActionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  backToVotingButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  backToVotingButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
});