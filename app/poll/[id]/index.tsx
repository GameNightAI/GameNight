// poll/PollScreen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import { supabase } from '@/services/supabase';
import { usePollData } from '@/hooks/usePollData';
import { VoteType, VOTE_TYPE_TO_SCORE, SCORE_TO_VOTE_TYPE } from '@/components/votingOptions';
import { VoterNameInput } from '@/components/PollVoterNameInput';
import { GameCard } from '@/components/PollGameCard';
import { PollResultsButton } from '@/components/PollResultsButton';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { getOrCreateAnonId } from '@/utils/anon';
import {
  saveUsername,
  getUsername,
  saveVotedFlag,
  saveVoteUpdatedFlag
} from '@/utils/storage';
import { BarChart3 } from 'lucide-react-native';

export default function PollScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

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
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // Single device: prefill with user email/username if logged in
        if (user && (user.email || user.username)) {
          setVoterName(user.username || user.email);
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
    if (poll && poll.user_id) {
      // Fetch the creator's email or name from Supabase auth.users
      (async () => {
        try {
          const { data, error } = await supabase
            .from('profiles') // Try profiles table first
            .select('username, email')
            .eq('id', poll.user_id)
            .maybeSingle();
          if (data) {
            setCreatorName(data.username || data.email || null);
          } else {
            // Fallback: try auth.users
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(poll.user_id);
            if (userData && userData.user) {
              setCreatorName(userData.user.email || null);
            }
          }
        } catch (e) {
          setCreatorName(null);
        }
      })();
    }
  }, [poll]);

  // Check for previous votes with better error handling
  const checkPreviousVotes = useCallback(async (name: string, pollId: string) => {
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setHasPreviousVotes(false);
        return;
      }

      const { data: previousVotes, error: previousVotesError } = await supabase
        .from('votes')
        .select('id')
        .eq('poll_id', pollId)
        .eq('voter_name', trimmedName);

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
    if (storageInitialized && voterName && id) {
      checkPreviousVotes(voterName, id as string);
    }
  }, [voterName, id, storageInitialized, checkPreviousVotes]);

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

      // Always use entered voterName
      const trimmedName = voterName.trim();
      if (!trimmedName) {
        setNameError(true);
        Toast.show({ type: 'error', text1: 'Please enter your name' });
        setSubmitting(false);
        return;
      }
      const finalName = trimmedName;

      // Check if the voter has previously voted on any game in this poll
      const { data: previousVotes, error: previousVotesError } = await supabase
        .from('votes')
        .select('id, game_id, vote_type')
        .eq('poll_id', id)
        .eq('voter_name', finalName);

      if (previousVotesError) {
        console.error('Error checking previous votes:', previousVotesError);
        throw previousVotesError;
      }

      const hasPreviousVotes = previousVotes && previousVotes.length > 0;
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
          const { error: insertError } = await supabase.from('votes').insert({
            poll_id: id,
            game_id: gameId,
            vote_type: score,
            voter_name: finalName,
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
      try {
        await saveUsername(finalName);
      } catch (storageError) {
        console.warn('Failed to save username to storage:', storageError);
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
          voter_name: finalName,
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
    } catch (err) {
      console.error('Error submitting votes:', err);
      Toast.show({ type: 'error', text1: 'Failed to submit votes' });
    } finally {
      setSubmitting(false);
    }
  };

  const navigateToResults = () => {
    router.push({ pathname: '/poll/[id]/results', params: { id: id as string } });
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!poll) return <ErrorState message="Poll not found." onRetry={reload} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/polls')}>
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
          <Text style={[styles.subtitle, { marginBottom: 2, color: '#ff9654' }]}>Poll created by {creatorName}</Text>
        )}
        <Text style={styles.subtitle}>
          {isCreator
            ? (creatorName ? `Poll created by ${creatorName}` : 'Poll created by you')
            : 'Vote for as many games as you like or none at all!'}
        </Text>
      </View>

      {/* Always show voter name input */}
      <VoterNameInput
        value={voterName}
        onChange={(text) => {
          setVoterName(text);
          if (nameError) setNameError(false);
        }}
        hasError={nameError}
      />
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
          multiline
          editable={!submitting}
        />
      </View>

      {/* Shared button container for consistent width and padding */}
      <View style={{ paddingHorizontal: 0, width: '100%', alignSelf: 'stretch' }}>
        <View style={styles.submitVotesContainer}>
          <TouchableOpacity
            style={styles.submitVotesButton}
            onPress={submitAllVotes}
            disabled={submitting}
          >
            <Text style={styles.submitVotesButtonText}>
              {submitting ? 'Submitting...' : (hasPreviousVotes ? 'Update Vote' : 'Submit My Votes')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomActionsContainer}>
          {hasVoted && (
            <View style={styles.viewResultsContainer}>
              <PollResultsButton
                onPress={navigateToResults}
              />
            </View>
          )}

          {!hasVoted && (
            <View style={styles.viewResultsContainer}>
              <TouchableOpacity
                style={styles.viewResultsButton}
                onPress={navigateToResults}
              >
                <BarChart3 size={20} color="#ffffff" />
                <Text style={styles.viewResultsButtonText}>View Results</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fc' },
  header: { padding: 20, backgroundColor: '#1a2b5f' },
  title: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#fff', marginBottom: 8 },
  description: { fontSize: 16, fontFamily: 'Poppins-Regular', color: '#fff', marginBottom: 12 },
  subtitle: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#fff', opacity: 0.8 },
  gamesContainer: {
    paddingTop: 20,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 0, // Reduce bottom padding by 50%
  },
  noGamesText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    textAlign: 'center',
    marginTop: 32,
  },
  submitVotesContainer: {
    paddingTop: 10,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 0,
    width: '100%', alignSelf: 'stretch'
  },
  submitVotesButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%', // Make button full width
    alignSelf: 'stretch',
  },
  submitVotesButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  bottomActionsContainer: { width: '100%', alignSelf: 'stretch', marginTop: 8 },
  viewResultsContainer: { marginTop: 8, width: '100%', alignSelf: 'stretch' },
  viewResultsButton: {
    backgroundColor: '#ff9654',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%', // Make button full width
    alignSelf: 'stretch',
  },
  viewResultsButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
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
    textDecorationLine: 'underline',
  },
  commentContainer: {
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 20,
    width: '100%',
  },
  commentLabel: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
    marginBottom: 4,
  },
  commentInput: {
    minHeight: 48,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#fff',
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