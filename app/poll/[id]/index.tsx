// poll/PollScreen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { usePollData } from '@/hooks/usePollData';
import { useAccessibility } from '@/hooks/useAccessibility';
import { VoteType, VOTE_TYPE_TO_SCORE, SCORE_TO_VOTE_TYPE } from '@/components/votingOptions';
import { VoterNameInput } from '@/components/PollVoterNameInput';
import { GameCard } from '@/components/PollGameCard';
import { PollResultsButton } from '@/components/PollResultsButton';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
// import { getOrCreateAnonId } from '@/utils/anon';
import {
  saveUsername,
  getUsername,
  saveVotedFlag,
  saveVoteUpdatedFlag
} from '@/utils/storage';
// import { BarChart3 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { censor } from '@/utils/profanityFilter';

export default function PollScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const { announceForAccessibility, isReduceMotionEnabled, getReducedMotionStyle } = useAccessibility();
  const insets = useSafeAreaInsets();

  const {
    poll,
    games,
    hasVoted,
    isCreator,
    loading,
    error,
    user,
    pendingVotes,
    setPendingVotes,
    reload,
  } = usePollData(id);

  const [voterName, setVoterName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [hasPreviousVotes, setHasPreviousVotes] = useState(false);
  const [storageInitialized, setStorageInitialized] = useState(false);

  // Initialize storage and voter name
  // TODO: there's probably no reason to use storage for logged in users
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // Single device: prefill with username if logged in
        if (user?.username) {
          setVoterName(user.username);
        } else {
          const savedName = await getUsername();
          if (savedName) setVoterName(savedName);
        }
        setStorageInitialized(true);
      } catch (error) {
        console.warn('Error initializing storage:', error);
        setStorageInitialized(true); // Continue anyway
      }
    };

    initializeStorage();
  }, [user]);

  useEffect(() => {
    if (poll?.user_id) {
      // Fetch the creator's username, firstname, and lastname from Supabase `profiles`
      (async () => {
        try {
          const { data: { username, firstname, lastname }, error } = await supabase
            .from('profiles') 
            .select('username, firstname, lastname')
            .eq('id', poll.user_id)
            .maybeSingle();
          setCreatorName(
            firstname || lastname
              ? `${censor([firstname, lastname].join(' ').trim())} (${username})`
              : username
          );
          if (error) {
            throw error;
          }
        } catch (error) {
          console.error(error);
          setCreatorName(poll.user_id);
        }
      })();
    }
  }, [poll]);

  // Check for previous votes with better error handling
  const checkPreviousVotes = useCallback(async (name: string, pollId: string) => {
    try {
      let trimmedName;
      if (!user) {
        trimmedName = name.trim();
        if (!trimmedName) {
          setHasPreviousVotes(false);
          return;
        }
      }

      const { data: previousVotes, error: previousVotesError } = await supabase
        .from('votes')
        .select('id')
        .eq('poll_id', pollId)
        .eq(
          user ? 'user_id' : 'voter_name',
          user ? user.id : trimmedName
        );

      if (previousVotesError) {
        console.warn('Error checking previous votes:', previousVotesError);
        setHasPreviousVotes(false);
        return;
      }

      setHasPreviousVotes(previousVotes && previousVotes.length > 0);
    } catch (error) {
      console.warn('Error in checkPreviousVotes:', error);
      setHasPreviousVotes(false);
    }
  }, []);

  useEffect(() => {
    if (user || ((storageInitialized && voterName)) && id) {
      checkPreviousVotes(voterName, id as string);
    }
  }, [user, voterName, id, storageInitialized, checkPreviousVotes]);

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

      let finalName;
      if (!user) {
        finalName = voterName.trim();
        if (!finalName) {
          setNameError(true);
          Toast.show({ type: 'error', text1: 'Please enter your name' });
          setSubmitting(false);
          return;
        }
      }
      // Check if the voter has previously voted on any game in this poll
      const { data: previousVotes, error: previousVotesError } = await supabase
        .from('votes')
        .select('id, game_id, vote_type')
        .eq('poll_id', id)
        .eq(
          user ? 'user_id' : 'voter_name',
          user ? user.id : finalName
        );

      if (previousVotesError) {
        console.error('Error checking previous votes:', previousVotesError);
        throw previousVotesError;
      }

      const hasPreviousVotes = previousVotes?.length > 0;
      let updated = false; // Track if any votes were updated or inserted as an update

      // Submit each vote
      for (const [gameIdStr, score] of Object.entries(pendingVotes)) {
        const gameId = parseInt(gameIdStr, 10);

        // Check for existing vote for this game
        const existing = previousVotes?.find(v => v.game_id === gameId);

        if (existing) {
          if (existing.vote_type !== score) {
            const { error: updateError } = await supabase
              .from('votes')
              .update({ vote_type: score })
              .eq('id', existing.id);
            if (updateError) {
              console.error('Error updating vote:', updateError);
              throw updateError;
            }
            updated = true;
          }
        } else {
          const { error: insertError } = await supabase
            .from('votes')
            .insert({
              poll_id: id,
              game_id: gameId,
              vote_type: score,
              voter_name: user ? null : finalName,
              user_id: user ? user.id : null,
            });
          if (insertError) {
            console.error('Error inserting vote:', insertError);
            throw insertError;
          }
          // If the voter has previously voted on any other game, mark as updated
          if (hasPreviousVotes) {
            updated = true;
          }
        }
      }

      // Save voter name for future use with error handling
      if (!user) {
        try {
          await saveUsername(finalName);
        } catch (storageError) {
          console.warn('Failed to save username to storage:', storageError);
        }
      }

      // Set flag if votes were updated
      if (updated) {
        try {
          await saveVoteUpdatedFlag(id as string);
        } catch (storageError) {
          console.warn('Failed to save vote updated flag:', storageError);
        }
      }

      // Insert comment if present
      if (comment.trim()) {
        const { error: commentError } = await supabase.from('poll_comments').insert({
          poll_id: id,
          voter_name: user ? null : finalName,
          user_id: user ? user.id : null,
          comment_text: comment.trim(),
        });
        if (commentError) {
          Toast.show({ type: 'error', text1: 'Failed to submit comment' });
        }
      }

      // Mark as voted in local storage for results access
      try {
        await saveVotedFlag(id as string);
      } catch (storageError) {
        console.warn('Failed to save voted flag:', storageError);
      }

      await reload();
      setComment(''); // Clear comment after successful submission
      navigateToResults();

      // Only show toast for new votes, not updated votes
      if (!updated) {
        Toast.show({ type: 'success', text1: 'Votes submitted!' });
      }
      announceForAccessibility('Votes submitted successfully');
    } catch (err) {
      console.error('Error submitting votes:', err);
      Toast.show({ type: 'error', text1: 'Failed to submit votes' });
      announceForAccessibility('Failed to submit votes');
    } finally {
      setSubmitting(false);
    }
  };

  const navigateToResults = () => {
    router.push({ pathname: '/poll/[id]/results', params: { id: id as string } });
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
          {/* Show creator for non-creator users */}
          {!isCreator && creatorName && (
            <Text style={styles.creatorSubtitle}>Poll created by {creatorName}</Text>
          )}
          <Text style={styles.subtitle}>
            {isCreator
              ? (creatorName ? `Poll created by ${creatorName}` : 'Poll created by you')
              : 'Vote for as many games as you like or none at all!'}
          </Text>
        </View>

        {!user && (
          <>
            <VoterNameInput
              value={voterName}
              onChange={(text) => {
                setVoterName(text);
                if (nameError) setNameError(false);
              }}
              hasError={nameError}
            />
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>
                Want to create your own polls?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/auth/register')}
                accessibilityLabel="Sign up for free"
                accessibilityRole="button"
                accessibilityHint="Opens registration screen to create your own polls"
              >
                <Text style={styles.signUpLink}>Sign up for free</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.gamesContainer}>
          {games.length === 0 ? (
            <Text style={styles.noGamesText}>No games found in this poll.</Text>
          ) : (
            games.map((game, i) => (
              <GameCard
                key={game.id}
                game={game as any} // Allow for missing image_url, etc.
                index={i}
                selectedVote={pendingVotes[game.id] !== undefined && pendingVotes[game.id] !== null ? SCORE_TO_VOTE_TYPE[pendingVotes[game.id]] as VoteType : (game.userVote !== undefined && game.userVote !== null ? SCORE_TO_VOTE_TYPE[game.userVote] as VoteType : undefined)}
                onVote={handleVote}
                disabled={submitting}
              />
            ))
          )}
        </View>
        {/* Comments Field */}
        <View style={styles.commentContainer}>
          <Text style={styles.commentLabel}>Comments (optional):</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Add any comments about your vote..."
            placeholderTextColor={colors.textMuted}
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
            accessibilityLabel={submitting ? 'Submitting votes' : (hasPreviousVotes ? 'Update Vote' : 'Submit My Votes')}
            accessibilityRole="button"
            accessibilityHint={submitting ? 'Votes are being submitted' : 'Submits your votes for this poll'}
          >
            <Text style={styles.submitVotesButtonText}>
              {submitting ? 'Submitting...' : (hasPreviousVotes ? 'Update Vote' : 'Submit My Votes')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomActionsContainer}>
          <View style={styles.viewResultsContainer}>
            <PollResultsButton
              onPress={navigateToResults}
            />
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
    paddingBottom: insets.bottom + 20,
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
  subtitle: {
    fontSize: typography.fontSize.footnote,
    fontFamily: typography.getFontFamily('normal'),
    color: colors.card,
    opacity: 0.8
  },
  creatorSubtitle: {
    fontSize: typography.fontSize.footnote,
    fontFamily: typography.getFontFamily('normal'),
    color: colors.accent,
    marginBottom: 2,
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
    paddingBottom: Math.max(20, insets.bottom),
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
    width: '100%',
    alignSelf: 'stretch'
  },
  signUpContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: typography.fontSize.footnote,
    fontFamily: typography.getFontFamily('normal'),
    color: colors.textMuted,
  },
  signUpLink: {
    fontSize: typography.fontSize.footnote,
    fontFamily: typography.getFontFamily('semibold'),
    color: colors.accent,
    textDecorationLine: 'underline',
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
  backLink: {
    color: colors.accent,
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.subheadline,
    marginBottom: 8,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
});
