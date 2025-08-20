import React, { useState, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { usePollResults } from '@/hooks/usePollResults';
import { GameResultCard } from '@/components/PollGameResultCard';
import { supabase } from '@/services/supabase';
import { Trophy, Medal, Award, Vote, ChevronDown, ChevronUp, Calendar, Clock } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useRef } from 'react';

// Dummy night vote data structure
interface NightVote {
  id: string;
  date: string;
  time: string;
  idealVotes: number;
  okVotes: number;
  noVotes: number;
}

const dummyNightVotes: NightVote[] = [
  {
    id: '1',
    date: '2025-01-25',
    time: '19:00',
    idealVotes: 8,
    okVotes: 3,
    noVotes: 1,
  },
  {
    id: '2',
    date: '2025-01-26',
    time: '18:30',
    idealVotes: 5,
    okVotes: 6,
    noVotes: 2,
  },
  {
    id: '3',
    date: '2025-01-27',
    time: '20:00',
    idealVotes: 3,
    okVotes: 4,
    noVotes: 5,
  },
  {
    id: '4',
    date: '2025-01-28',
    time: '19:30',
    idealVotes: 6,
    okVotes: 2,
    noVotes: 3,
  },
];

export default function PollResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [comments, setComments] = useState<{ voter_name: string; comment_text: string }[]>([]);
  // --- Real-time vote listening ---
  const [newVotes, setNewVotes] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const [showDetailedGameResults, setShowDetailedGameResults] = useState(false);
  const [showDetailedNightResults, setShowDetailedNightResults] = useState(false);

  const { poll, games, results, hasVoted, voteUpdated, loading, error, reload } = usePollResults(id);

  // Calculate winning night based on weighted score
  const getWinningNight = () => {
    const nightsWithScores = dummyNightVotes.map(night => ({
      ...night,
      score: night.idealVotes * 3 + night.okVotes * 1 + night.noVotes * (-3),
      totalVotes: night.idealVotes + night.okVotes + night.noVotes,
    }));
    
    return nightsWithScores.sort((a, b) => b.score - a.score)[0];
  };

  const winningNight = getWinningNight();
  const winningGame = results && results.length > 0 ? results[0] : null;

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
    if (voteUpdated) {
      Toast.show({ type: 'success', text1: 'Vote updated!' });
    }
  }, [id, voteUpdated]);

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
        <Text style={styles.subtitle}>{poll?.title}</Text>
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
            reload(); // Trigger a refetch of results
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
        {!results || results.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No votes have been cast yet.</Text>
          </View>
        ) : (
          <>
            {/* Winning Game Section */}
            {winningGame && (
              <View style={styles.winnerSection}>
                <Text style={styles.winnerSectionTitle}>🏆 Winning Game</Text>
                <TouchableOpacity
                  style={styles.winnerCard}
                  onPress={() => setShowDetailedGameResults(!showDetailedGameResults)}
                >
                  <View style={styles.winnerHeader}>
                    <View style={styles.winnerInfo}>
                      <Text style={styles.winnerName}>{winningGame.game.name}</Text>
                      <Text style={styles.winnerScore}>
                        {winningGame.totalVotes} votes • Score: {winningGame.totalScore}
                      </Text>
                    </View>
                    <View style={styles.expandButton}>
                      {showDetailedGameResults ? (
                        <ChevronUp size={20} color="#ff9654" />
                      ) : (
                        <ChevronDown size={20} color="#ff9654" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Detailed Game Results */}
            {showDetailedGameResults && (
              <View style={styles.detailedSection}>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>All Game Rankings</Text>
                  <Text style={styles.resultsSubtitle}>
                    {results.length} game{results.length !== 1 ? 's' : ''} ranked by votes
                  </Text>
                </View>

                {results.map((result, index) => (
                  <View key={result.game.id} style={styles.resultItem}>
                    <View style={styles.rankingContainer}>
                      <View style={[styles.rankingBadge, { backgroundColor: getRankingColor(result.ranking) }]}>
                        <Text style={styles.rankingNumber}>{result.ranking}</Text>
                      </View>
                      <View style={styles.rankingInfo}>
                        <Text style={styles.rankingLabel}>
                          {`${result.ranking}${getOrdinalSuffix(result.ranking)} Place`}
                        </Text>
                        <Text style={styles.scoreText}>
                          {result.totalVotes} votes
                        </Text>
                      </View>
                    </View>
                    <GameResultCard game={result.game} />
                  </View>
                ))}
              </View>
            )}

            {/* Winning Night Section */}
            <View style={styles.winnerSection}>
              <Text style={styles.winnerSectionTitle}>📅 Winning Night</Text>
              <TouchableOpacity
                style={styles.winnerCard}
                onPress={() => setShowDetailedNightResults(!showDetailedNightResults)}
              >
                <View style={styles.winnerHeader}>
                  <View style={styles.winnerInfo}>
                    <Text style={styles.winnerName}>
                      {new Date(winningNight.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                    <Text style={styles.winnerScore}>
                      {winningNight.time} • {winningNight.totalVotes} votes • Score: {winningNight.score}
                    </Text>
                    <View style={styles.nightVoteSummary}>
                      <Text style={styles.nightVoteItem}>
                        <Text style={styles.idealVote}>Ideal: {winningNight.idealVotes}</Text>
                      </Text>
                      <Text style={styles.nightVoteItem}>
                        <Text style={styles.okVote}>Ok: {winningNight.okVotes}</Text>
                      </Text>
                      <Text style={styles.nightVoteItem}>
                        <Text style={styles.noVote}>No: {winningNight.noVotes}</Text>
                      </Text>
                    </View>
                  </View>
                  <View style={styles.expandButton}>
                    {showDetailedNightResults ? (
                      <ChevronUp size={20} color="#ff9654" />
                    ) : (
                      <ChevronDown size={20} color="#ff9654" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Detailed Night Results */}
            {showDetailedNightResults && (
              <View style={styles.detailedSection}>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>All Night Options</Text>
                  <Text style={styles.resultsSubtitle}>
                    {dummyNightVotes.length} time option{dummyNightVotes.length !== 1 ? 's' : ''} ranked by votes
                  </Text>
                </View>

                {dummyNightVotes
                  .map(night => ({
                    ...night,
                    score: night.idealVotes * 3 + night.okVotes * 1 + night.noVotes * (-3),
                    totalVotes: night.idealVotes + night.okVotes + night.noVotes,
                  }))
                  .sort((a, b) => b.score - a.score)
                  .map((night, index) => (
                    <View key={night.id} style={styles.nightResultItem}>
                      <View style={styles.rankingContainer}>
                        <View style={[styles.rankingBadge, { backgroundColor: getRankingColor(index + 1) }]}>
                          <Text style={styles.rankingNumber}>{index + 1}</Text>
                        </View>
                        <View style={styles.rankingInfo}>
                          <Text style={styles.rankingLabel}>
                            {new Date(night.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </Text>
                          <Text style={styles.scoreText}>
                            {night.time} • {night.totalVotes} votes • Score: {night.score}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.nightVoteDetails}>
                        <View style={styles.nightVoteRow}>
                          <View style={styles.nightVoteTypeContainer}>
                            <View style={[styles.nightVoteBadge, styles.idealBadge]}>
                              <Text style={styles.nightVoteCount}>{night.idealVotes}</Text>
                            </View>
                            <Text style={styles.nightVoteLabel}>Ideal</Text>
                          </View>
                          <View style={styles.nightVoteTypeContainer}>
                            <View style={[styles.nightVoteBadge, styles.okBadge]}>
                              <Text style={styles.nightVoteCount}>{night.okVotes}</Text>
                            </View>
                            <Text style={styles.nightVoteLabel}>Ok</Text>
                          </View>
                          <View style={styles.nightVoteTypeContainer}>
                            <View style={[styles.nightVoteBadge, styles.noBadge]}>
                              <Text style={styles.nightVoteCount}>{night.noVotes}</Text>
                            </View>
                            <Text style={styles.nightVoteLabel}>No</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
              </View>
            )}

            {/* Winning Game Section */}
            {winningGame && (
              <View style={styles.winnerSection}>
                <Text style={styles.winnerSectionTitle}>🏆 Winning Game</Text>
                <TouchableOpacity
                  style={styles.winnerCard}
                  onPress={() => setShowDetailedGameResults(!showDetailedGameResults)}
                >
                  <View style={styles.winnerHeader}>
                    <View style={styles.winnerInfo}>
                      <Text style={styles.winnerName}>{winningGame.game.name}</Text>
                      <Text style={styles.winnerScore}>
                        {winningGame.totalVotes} votes • Score: {winningGame.totalScore}
                      </Text>
                    </View>
                    <View style={styles.expandButton}>
                      {showDetailedGameResults ? (
                        <ChevronUp size={20} color="#ff9654" />
                      ) : (
                        <ChevronDown size={20} color="#ff9654" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Detailed Game Results */}
            {showDetailedGameResults && (
              <View style={styles.detailedSection}>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>All Game Rankings</Text>
                  <Text style={styles.resultsSubtitle}>
                    {results.length} game{results.length !== 1 ? 's' : ''} ranked by votes
                  </Text>
                </View>

                {results.map((result, index) => (
                  <View key={result.game.id} style={styles.resultItem}>
                    <View style={styles.rankingContainer}>
                      <View style={[styles.rankingBadge, { backgroundColor: getRankingColor(result.ranking) }]}>
                        <Text style={styles.rankingNumber}>{result.ranking}</Text>
                      </View>
                      <View style={styles.rankingInfo}>
                        <Text style={styles.rankingLabel}>
                          {`${result.ranking}${getOrdinalSuffix(result.ranking)} Place`}
                        </Text>
                        <Text style={styles.scoreText}>
                          {result.totalVotes} votes
                        </Text>
                      </View>
                    </View>
                    <GameResultCard game={result.game} />
                  </View>
                ))}
              </View>
            )}

            {/* Winning Night Section */}
            <View style={styles.winnerSection}>
              <Text style={styles.winnerSectionTitle}>📅 Winning Night</Text>
              <TouchableOpacity
                style={styles.winnerCard}
                onPress={() => setShowDetailedNightResults(!showDetailedNightResults)}
              >
                <View style={styles.winnerHeader}>
                  <View style={styles.winnerInfo}>
                    <Text style={styles.winnerName}>
                      {new Date(winningNight.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                    <Text style={styles.winnerScore}>
                      {winningNight.time} • {winningNight.totalVotes} votes • Score: {winningNight.score}
                    </Text>
                    <View style={styles.nightVoteSummary}>
                      <Text style={styles.nightVoteItem}>
                        <Text style={styles.idealVote}>Ideal: {winningNight.idealVotes}</Text>
                      </Text>
                      <Text style={styles.nightVoteItem}>
                        <Text style={styles.okVote}>Ok: {winningNight.okVotes}</Text>
                      </Text>
                      <Text style={styles.nightVoteItem}>
                        <Text style={styles.noVote}>No: {winningNight.noVotes}</Text>
                      </Text>
                    </View>
                  </View>
                  <View style={styles.expandButton}>
                    {showDetailedNightResults ? (
                      <ChevronUp size={20} color="#ff9654" />
                    ) : (
                      <ChevronDown size={20} color="#ff9654" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Detailed Night Results */}
            {showDetailedNightResults && (
              <View style={styles.detailedSection}>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>All Night Options</Text>
                  <Text style={styles.resultsSubtitle}>
                    {dummyNightVotes.length} time option{dummyNightVotes.length !== 1 ? 's' : ''} ranked by votes
                  </Text>
                </View>

                {dummyNightVotes
                  .map(night => ({
                    ...night,
                    score: night.idealVotes * 3 + night.okVotes * 1 + night.noVotes * (-3),
                    totalVotes: night.idealVotes + night.okVotes + night.noVotes,
                  }))
                  .sort((a, b) => b.score - a.score)
                  .map((night, index) => (
                    <View key={night.id} style={styles.nightResultItem}>
                      <View style={styles.rankingContainer}>
                        <View style={[styles.rankingBadge, { backgroundColor: getRankingColor(index + 1) }]}>
                          <Text style={styles.rankingNumber}>{index + 1}</Text>
                        </View>
                        <View style={styles.rankingInfo}>
                          <Text style={styles.rankingLabel}>
                            {new Date(night.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </Text>
                          <Text style={styles.scoreText}>
                            {night.time} • {night.totalVotes} votes • Score: {night.score}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.nightVoteDetails}>
            {/* Comments Section at the bottom of the scrollview */}
            {comments && comments.length > 0 && (
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
  winnerSection: {
    marginBottom: 20,
  },
  winnerSectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 12,
    textAlign: 'center',
  },
  winnerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#ff9654',
  },
  winnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  winnerInfo: {
    flex: 1,
  },
  winnerName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  winnerScore: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  expandButton: {
    padding: 8,
  },
  detailedSection: {
    marginBottom: 20,
  },
  nightVoteSummary: {
    flexDirection: 'row',
    gap: 12,
  },
  nightVoteItem: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  idealVote: {
    color: '#10b981',
    fontFamily: 'Poppins-SemiBold',
  },
  okVote: {
    color: '#f59e0b',
    fontFamily: 'Poppins-SemiBold',
  },
  noVote: {
    color: '#ef4444',
    fontFamily: 'Poppins-SemiBold',
  },
  nightResultItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  nightVoteDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  nightVoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  nightVoteTypeContainer: {
    alignItems: 'center',
    flex: 1,
  },
  nightVoteBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  idealBadge: {
    backgroundColor: '#bbf7d0',
  },
  okBadge: {
    backgroundColor: '#fef3c7',
  },
  noBadge: {
    backgroundColor: '#fecaca',
  },
  nightVoteCount: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#1a2b5f',
  },
  nightVoteLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  winnerSection: {
    marginBottom: 20,
  },
  winnerSectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 12,
    textAlign: 'center',
  },
  winnerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#ff9654',
  },
  winnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  winnerInfo: {
    flex: 1,
  },
  winnerName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  winnerScore: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  expandButton: {
    padding: 8,
  },
  detailedSection: {
    marginBottom: 20,
  },
  nightVoteSummary: {
    flexDirection: 'row',
    gap: 12,
  },
  nightVoteItem: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  idealVote: {
    color: '#10b981',
    fontFamily: 'Poppins-SemiBold',
  },
  okVote: {
    color: '#f59e0b',
    fontFamily: 'Poppins-SemiBold',
  },
  noVote: {
    color: '#ef4444',
    fontFamily: 'Poppins-SemiBold',
  },
  nightResultItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  nightVoteDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  nightVoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  nightVoteTypeContainer: {
    alignItems: 'center',
    flex: 1,
  },
  nightVoteBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  idealBadge: {
    backgroundColor: '#bbf7d0',
  },
  okBadge: {
    backgroundColor: '#fef3c7',
  },
  noBadge: {
    backgroundColor: '#fecaca',
  },
  nightVoteCount: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#1a2b5f',
  },
  nightVoteLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});