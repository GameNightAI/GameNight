import React, { useState, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { usePollResults } from '@/hooks/usePollResults';
import { GameResultCard } from '@/components/PollGameResultCard';
import { supabase } from '@/services/supabase';
import { Trophy, Medal, Award, Vote } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRef } from 'react';
import { VOTING_OPTIONS } from '@/components/votingOptions';

export default function PollResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [comments, setComments] = useState<{ voter_name: string; comment_text: string }[]>([]);
  // --- Real-time vote listening ---
  const [newVotes, setNewVotes] = useState(false);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!id) return;
    // Subscribe to new votes for this poll
    const channel = supabase
      .channel('votes-listener')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `poll_id=eq.${id}`,
        },
        (payload) => {
          setNewVotes(true);
        }
      )
      .subscribe();
    subscriptionRef.current = channel;
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [id]);

  const { pollTitle, gameResults, hasVoted, loading, error } = usePollResults(id as string | undefined);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // Fetch poll comments
    const fetchComments = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('poll_comments')
        .select('voter_name, comment_text')
        .eq('poll_id', id)
        .order('id', { ascending: false });
      if (!error && data) setComments(data);
    };
    fetchComments();

    // Check if user just updated their votes
    const checkForVoteUpdate = async () => {
      if (!id) return;
      const voteUpdated = await AsyncStorage.getItem(`vote_updated_${id}`);
      if (voteUpdated === 'true') {
        Toast.show({ type: 'success', text1: 'Vote updated!' });
        await AsyncStorage.removeItem(`vote_updated_${id}`);
      }
    };
    checkForVoteUpdate();
  }, [id]);

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

  // Update score calculation to use voteType1, voteType2, etc.
  const scoredResults = gameResults.map(game => ({
    ...game,
    score: VOTING_OPTIONS.reduce((sum, voteType) => {
      const voteCount = game[voteType.value] || 0;
      return sum + voteCount * voteType.score;
    }, 0)
  }));
  scoredResults.sort((a, b) => b.score - a.score);

  // Assign ranks, handling ties (all tied items get tie: true)
  let lastScore: number | null = null;
  let lastRank = 0;
  let tieGroup: number[] = [];
  const tempRanked: any[] = [];
  scoredResults.forEach((game, idx) => {
    if (lastScore === null || game.score !== lastScore) {
      // Assign tie: true to all in previous tieGroup if more than 1
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
  // Final group
  if (tieGroup.length > 1) {
    tieGroup.forEach(i => tempRanked[i].tie = true);
  }
  const rankedResults = tempRanked;

  const getRankingIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={24} color="#FFC300" />; // Higher-contrast gold
      case 2:
        return <Medal size={24} color="#A6B1C2" />;
      case 3:
        return <Award size={24} color="#CD7F32" />;
      default:
        return null;
    }
  };

  const getRankingColor = (rank: number) => {
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
  };

  const navigateToVoting = () => {
    router.push({ pathname: '/poll/[id]', params: { id: id as string } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/polls')}>
          <Text style={styles.backLink}>&larr; Back to Polls</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Poll Results</Text>
        <Text style={styles.subtitle}>{pollTitle}</Text>
      </View>
      {/* --- Banner notification for new votes --- */}
      {newVotes && (
        <View style={{
          backgroundColor: '#fffbe6',
          borderBottomWidth: 1,
          borderBottomColor: '#ffe58f',
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}>
          <Text style={{ color: '#b45309', fontWeight: 'bold', fontSize: 15 }}>
            New votes have been cast! Pull to refresh or tap below.
          </Text>
          <TouchableOpacity onPress={() => {
            setNewVotes(false);
            // Optionally, trigger a refetch of results here
          }}>
            <Text style={{ color: '#2563eb', fontWeight: 'bold', marginLeft: 16 }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

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
        {rankedResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No votes have been cast yet.</Text>
          </View>
        ) : (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Ranking Results</Text>
              <Text style={styles.resultsSubtitle}>
                {rankedResults.length} game{rankedResults.length !== 1 ? 's' : ''} ranked by votes
              </Text>
            </View>

            {rankedResults.map((game, index) => (
              <View key={game.id} style={styles.resultItem}>
                <View style={styles.rankingContainer}>
                  <View style={[styles.rankingBadge, { backgroundColor: getRankingColor(game.rank) }]}>
                    {getRankingIcon(game.rank)}
                    <Text style={styles.rankingNumber}>{game.rank}</Text>
                  </View>
                  <View style={styles.rankingInfo}>
                    <Text style={styles.rankingLabel}>
                      {game.tie
                        ? `Tied for ${game.rank}${getOrdinalSuffix(game.rank)} Place`
                        : `${game.rank}${getOrdinalSuffix(game.rank)} Place`}
                    </Text>
                    {/* <Text style={styles.scoreText}>
                      Score: {game.score}
                    </Text> */}
                  </View>
                </View>
                <GameResultCard game={game} />
              </View>
            ))}
            {/* Comments Section at the bottom of the scrollview */}
            {comments.length > 0 && (
              <View style={styles.commentsContainer}>
                <Text style={styles.commentsTitle}>Comments</Text>
                {comments.map((c, idx) => (
                  <View key={idx} style={styles.commentItem}>
                    <Text style={styles.commentVoter}>{c.voter_name || 'Anonymous'}:</Text>
                    <Text style={styles.commentText}>{c.comment_text}</Text>
                  </View>
                ))}
              </View>
            )}
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
    padding: 20,
    backgroundColor: '#1a2b5f',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#fff',
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingBottom: 32,
    width: '100%',
    alignSelf: 'stretch',
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
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginLeft: 4,
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
  commentsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  commentsTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  commentItem: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  commentVoter: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
    marginBottom: 2,
  },
  commentText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#1a2b5f',
  },
  backLink: {
    color: '#1d4ed8',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    marginBottom: 8,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
});