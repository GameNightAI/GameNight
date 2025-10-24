import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { VoteType, VOTE_TYPE_TO_SCORE, SCORE_TO_VOTE_TYPE, getVoteTypeKeyFromScore, VOTING_OPTIONS } from '@/components/votingOptions';
import { VoterNameInput } from '@/components/PollVoterNameInput';
import { GameCard } from '@/components/PollGameCard';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { useTheme } from '@/hooks/useTheme';
import { censor } from '@/utils/profanityFilter';

// Custom hook for local voting that bypasses user authentication
const useLocalPollData = (pollId: string | string[] | undefined) => {
  const [poll, setPoll] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingVotes, setPendingVotes] = useState<Record<number, number>>({});
  const [creatorName, setCreatorName] = useState<string | null>(null);

  useEffect(() => {
    if (pollId) loadLocalPoll(pollId.toString());
  }, [pollId]);

  const loadLocalPoll = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get the poll details
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (pollError) {
        console.error('Poll error:', pollError);
        throw new Error('Poll not found or has been deleted');
      }

      if (!pollData) {
        throw new Error('Poll not found');
      }

      setPoll(pollData);

      // Fetch creator info
      if (pollData?.user_id) {
        const { data: profileData, error: creatorError } = await supabase
          .from('profiles')
          .select('username, firstname, lastname')
          .eq('id', pollData.user_id)
          .maybeSingle();
        if (!creatorError && profileData) {
          const { username, firstname, lastname } = profileData;
          setCreatorName(
            firstname || lastname
              ? `${censor([firstname, lastname].join(' ').trim())} (${username})`
              : username
          );
        }
      }

      // Get the games in this poll
      const { data: pollGames, error: gamesError } = await supabase
        .from('poll_games')
        .select('game_id')
        .eq('poll_id', id);

      if (gamesError) {
        console.error('Poll games error:', gamesError);
        throw gamesError;
      }

      if (!pollGames || pollGames.length === 0) {
        setGames([]);
        setLoading(false);
        return;
      }

      const gameIds = pollGames.map(pg => pg.game_id);

      // Get the actual game details from games table
      const { data: gamesData, error: gameDetailsError } = await supabase
        .from('games_view')
        .select('*')
        .in('id', gameIds);

      if (gameDetailsError) {
        console.error('Game details error:', gameDetailsError);
        throw gameDetailsError;
      }

      if (!gamesData || gamesData.length === 0) {
        setGames([]);
        setLoading(false);
        return;
      }

      // Get votes for this poll (for display purposes only)
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('poll_id', id);

      if (votesError) {
        console.error('Votes error:', votesError);
        throw votesError;
      }

      // Map games data to the expected format (without user votes)
      const formattedGames = gamesData.map(game => {
        const gameVotes = votes?.filter(v => v.game_id === game.id) || [];

        // Use the same mapping logic as usePollResults
        const voteData = {
          votes: {} as Record<string, number>,
          voters: gameVotes.map(v => ({
            name: censor(v.voter_name) || 'Anonymous',
            vote_type: v.vote_type as VoteType,
          })),
        };

        // Initialize all vote types to 0 using VOTING_OPTIONS
        VOTING_OPTIONS.forEach(option => {
          voteData.votes[option.value] = 0;
        });

        // Count votes using the utility function
        gameVotes.forEach(vote => {
          const voteTypeKey = getVoteTypeKeyFromScore(vote.vote_type);
          (voteData.votes as any)[voteTypeKey]++;
        });

        return {
          id: game.id,
          name: game.name,
          yearPublished: game.year_published,
          // Use BGG's "NO IMAGE AVAILABLE" as a fallback
          thumbnail: game.thumbnail || 'https://cf.geekdo-images.com/zxVVmggfpHJpmnJY9j-k1w__imagepagezoom/img/RO6wGyH4m4xOJWkgv6OVlf6GbrA=/fit-in/1200x900/filters:no_upscale():strip_icc()/pic1657689.jpg',
          image: game.image_url || 'https://cf.geekdo-images.com/zxVVmggfpHJpmnJY9j-k1w__imagepagezoom/img/RO6wGyH4m4xOJWkgv6OVlf6GbrA=/fit-in/1200x900/filters:no_upscale():strip_icc()/pic1657689.jpg',
          min_players: game.min_players,
          max_players: game.max_players,
          playing_time: game.playing_time,
          minPlaytime: game.minplaytime,
          maxPlaytime: game.maxplaytime,
          description: game.description,
          minAge: game.min_age,
          is_cooperative: game.is_cooperative,
          complexity: game.complexity,
          complexity_tier: game.complexity_tier,
          complexity_desc: game.complexity_desc,
          average: game.average,
          bayesaverage: game.bayesaverage,
          votes: voteData,
          userVote: null, // Always null for local voting
        };
      });

      setGames(formattedGames);
      setPendingVotes({}); // Always start with empty votes
    } catch (err) {
      console.error('Error in loadLocalPoll:', err);
      setError((err as Error).message || 'Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  return {
    poll,
    games,
    loading,
    error,
    pendingVotes,
    setPendingVotes,
    creatorName,
    reload: () => pollId && loadLocalPoll(pollId.toString()),
  };
};

export default function LocalPollScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, typography, touchTargets } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    poll,
    games,
    loading,
    error,
    pendingVotes,
    setPendingVotes,
    creatorName,
    reload,
  } = useLocalPollData(id);

  const [voterName, setVoterName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [submitCount, setSubmitCount] = useState(0);

  // Load persisted submit count on mount
  useEffect(() => {
    const loadSubmitCount = async () => {
      try {
        const savedCount = await AsyncStorage.getItem(`local_poll_${id}_submit_count`);
        if (savedCount !== null) {
          setSubmitCount(parseInt(savedCount, 10));
        }
      } catch (error) {
        console.log('Error loading submit count:', error);
      }
    };
    loadSubmitCount();
  }, [id]);

  // Prepopulate voter name with "Local" + counter
  useEffect(() => {
    setVoterName(`Local ${submitCount + 1}`);
  }, [submitCount]);

  const handleVote = (gameId: number, voteType: VoteType) => {
    setPendingVotes(prev => {
      const updated = { ...prev };
      const score = VOTE_TYPE_TO_SCORE[voteType];
      if (updated[gameId] === score) {
        delete updated[gameId];
      } else {
        updated[gameId] = score;
      }
      return updated;
    });
  };

  const submitAllVotes = async () => {
    if (Object.keys(pendingVotes).length === 0) {
      Toast.show({
        type: 'error',
        text1: 'No votes selected',
        text2: 'Please vote for at least one game before submitting.',
        visibilityTime: 4000,
        autoHide: true,
      });
      return;
    }
    try {
      setSubmitting(true);
      const trimmedName = voterName.trim();
      if (!trimmedName) {
        setNameError(true);
        Toast.show({ type: 'error', text1: 'Please enter your name' });
        setSubmitting(false);
        return;
      }
      const finalName = trimmedName;
      for (const [gameIdStr, score] of Object.entries(pendingVotes)) {
        const gameId = parseInt(gameIdStr, 10);
        const { data: existing, error: selectError } = await supabase
          .from('votes')
          .select('id, vote_type')
          .eq('poll_id', id)
          .eq('game_id', gameId)
          .eq('voter_name', finalName);
        if (selectError) throw selectError;
        if (existing && existing.length > 0) {
          const vote = existing[0];
          if (vote.vote_type !== score) {
            const { error: updateError } = await supabase
              .from('votes')
              .update({ vote_type: score })
              .eq('id', vote.id);
            if (updateError) throw updateError;
          }
        } else {
          const { error: insertError } = await supabase.from('votes').insert({
            poll_id: id,
            game_id: gameId,
            vote_type: score,
            voter_name: finalName,
          });
          if (insertError) throw insertError;
        }
      }
      if (comment.trim()) {
        const { error: commentError } = await supabase.from('poll_comments').insert({
          poll_id: id,
          voter_name: finalName,
          comment_text: comment.trim(),
        });
        if (commentError) {
          Toast.show({ type: 'error', text1: 'Failed to submit comment' });
        }
      }
      setComment('');
      setVoterName('');
      setPendingVotes({});
      const newCount = submitCount + 1;
      setSubmitCount(newCount);

      // Save the new count to AsyncStorage
      try {
        await AsyncStorage.setItem(`local_poll_${id}_submit_count`, newCount.toString());
      } catch (error) {
        console.log('Error saving submit count:', error);
      }

      Toast.show({ type: 'success', text1: 'Votes submitted! Hand the device to the next voter.' });
      await reload();
    } catch (err) {
      console.error('Error submitting votes:', err);
      Toast.show({ type: 'error', text1: 'Failed to submit votes' });
    } finally {
      setSubmitting(false);
    }
  };

  const navigateToResults = () => {
    router.push({ pathname: '/poll/local/[id]/results', params: { id: id as string } });
  };

  const styles = useMemo(() => getStyles(colors, typography, insets), [colors, typography, insets]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!poll) return <ErrorState message="Poll not found." onRetry={reload} />;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/polls')}
            accessibilityLabel="Back to Polls"
            accessibilityRole="button"
            accessibilityHint="Returns to the polls list"
          >
            <Text style={styles.backLink}>&larr; Back to Polls</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {poll?.title === 'Vote on games' && games && games.length > 0
              ? `Vote on games (${games.length} game${games.length === 1 ? '' : 's'})`
              : poll?.title}
          </Text>
          {!!poll?.description && <Text style={styles.description}>{poll.description}</Text>}
          {creatorName && (
            <Text style={styles.creatorSubtitle}>Poll created by {creatorName}</Text>
          )}
          <Text style={styles.subtitle}>Local Voting Mode: Enter your name, vote, and pass the device to the next voter!</Text>
        </View>

        <VoterNameInput
          value={voterName}
          onChange={(text) => {
            setVoterName(text);
            if (nameError) setNameError(false);
          }}
          hasError={nameError}
        />

        <View style={styles.gamesContainer}>
          {games.length === 0 ? (
            <Text style={styles.noGamesText}>No games found in this poll.</Text>
          ) : (
            games.map((game, i) => (
              <GameCard
                key={game.id}
                game={game as any}
                index={i}
                selectedVote={pendingVotes[game.id] !== undefined && pendingVotes[game.id] !== null ? SCORE_TO_VOTE_TYPE[pendingVotes[game.id]] as VoteType : undefined}
                onVote={handleVote}
                disabled={submitting}
              />
            ))
          )}
        </View>

        <View style={styles.commentContainer}>
          <Text style={styles.commentLabel}>Comments (optional):</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Add any comments about your vote..."
            multiline
            editable={!submitting}
            accessibilityLabel="Comments input"
            accessibilityHint="Optional field to add comments about your vote"
          />
        </View>
      </ScrollView>

      {/* Fixed bottom button container */}
      <View style={styles.fixedBottomContainer}>
        <View style={styles.submitVotesContainer}>
          <TouchableOpacity
            style={styles.submitVotesButton}
            onPress={submitAllVotes}
            disabled={submitting}
            accessibilityLabel={submitting ? 'Submitting votes' : 'Submit My Votes'}
            accessibilityRole="button"
            accessibilityHint={submitting ? 'Votes are being submitted' : 'Submits your votes for this poll'}
          >
            <Text style={styles.submitVotesButtonText}>
              {submitting ? 'Submitting...' : 'Submit My Votes'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomActionsContainer}>
          <View style={styles.viewResultsContainer}>
            <TouchableOpacity
              style={styles.viewResultsButton}
              onPress={navigateToResults}
              accessibilityLabel="View Results"
              accessibilityRole="button"
              accessibilityHint="Shows the current voting results for this poll"
            >
              <Text style={styles.viewResultsButtonText}>View Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: any, typography: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20, // Add padding to prevent content from being hidden behind fixed buttons
  },
  header: {
    paddingTop: Math.max(40, insets.top),
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.primary
  },
  title: {
    fontSize: typography.fontSize.title2,
    fontFamily: typography.getFontFamily('bold'),
    color: colors.card,
    marginBottom: 8
  },
  description: {
    fontSize: typography.fontSize.callout,
    fontFamily: typography.getFontFamily('normal'),
    color: colors.card,
    marginBottom: 12
  },
  creatorSubtitle: {
    fontSize: typography.fontSize.footnote,
    fontFamily: typography.getFontFamily('normal'),
    color: colors.accent,
    marginBottom: 8
  },
  subtitle: {
    fontSize: typography.fontSize.footnote,
    fontFamily: typography.getFontFamily('normal'),
    color: colors.card,
    opacity: 0.8
  },
  gamesContainer: {
    paddingTop: 6,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 0,
  },
  noGamesText: {
    fontSize: typography.fontSize.body,
    fontFamily: typography.getFontFamily('normal'),
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 32,
  },
  fixedBottomContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 20, // Safe area padding
  },
  submitVotesContainer: {
    paddingTop: 10,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 0,
    width: '100%',
    alignSelf: 'stretch'
  },
  submitVotesButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 44,
  },
  submitVotesButtonText: {
    fontSize: typography.fontSize.body,
    fontFamily: typography.getFontFamily('semibold'),
    color: colors.card,
  },
  bottomActionsContainer: {
    width: '100%',
    alignSelf: 'stretch',
    marginTop: 8
  },
  viewResultsContainer: {
    marginTop: 8,
    paddingLeft: 20,
    paddingRight: 20,
    width: '100%',
    alignSelf: 'stretch'
  },
  commentContainer: {
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 20,
    width: '100%',
  },
  commentLabel: {
    fontSize: typography.fontSize.subheadline,
    fontFamily: typography.getFontFamily('semibold'),
    color: colors.primary,
    marginBottom: 4,
  },
  commentInput: {
    minHeight: 48,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: typography.fontSize.subheadline,
    fontFamily: typography.getFontFamily('normal'),
    backgroundColor: colors.background,
    color: colors.text,
  },
  viewResultsButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 44,
  },
  viewResultsButtonText: {
    fontSize: typography.fontSize.body,
    fontFamily: typography.getFontFamily('semibold'),
    color: colors.card,
  },
  backLink: {
    color: colors.accent,
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.subheadline,
    marginBottom: 8,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
});
