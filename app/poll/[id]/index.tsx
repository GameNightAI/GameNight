// poll/PollScreen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { usePollData, VoteType } from '@/hooks/usePollData';
import { VoterNameInput } from '@/components/PollVoterNameInput';
import { GameCard } from '@/components/PollGameCard';
import { PollResultsButton } from '@/components/PollResultsButton';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { getOrCreateAnonId } from '@/utils/anon';

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

  useEffect(() => {
    (async () => {
      const savedName = await AsyncStorage.getItem('voter_name');
      if (savedName) setVoterName(savedName);
    })();
  }, []);

  const handleVote = (gameId: number, voteType: VoteType) => {
    setPendingVotes(prev => {
      const updated = { ...prev };
      if (updated[gameId] === voteType) {
        delete updated[gameId]; // toggle off
      } else {
        updated[gameId] = voteType;
      }
      return updated;
    });
  };

  const submitAllVotes = async () => {
    try {
      setSubmitting(true);

      // Get user identifier
      let finalName = '';
      if (user?.email) {
        finalName = user.email;
      } else {
        const trimmedName = voterName.trim();
        if (!trimmedName) {
          setNameError(true);
          Toast.show({ type: 'error', text1: 'Please enter your name' });
          return;
        }
        finalName = trimmedName;
      }

      console.log('Submitting votes with name:', finalName);
      console.log('Pending votes:', pendingVotes);

      // Submit each vote
      for (const [gameIdStr, voteType] of Object.entries(pendingVotes)) {
        const gameId = parseInt(gameIdStr, 10);

        console.log(`Processing vote for game ${gameId}: ${voteType}`);

        // Check for existing vote
        const { data: existing, error: selectError } = await supabase
          .from('votes')
          .select('id, vote_type')
          .eq('poll_id', id)
          .eq('game_id', gameId)
          .eq('voter_name', finalName);

        if (selectError) {
          console.error('Error checking existing votes:', selectError);
          throw selectError;
        }

        console.log('Existing votes found:', existing);

        if (existing && existing.length > 0) {
          const vote = existing[0];
          console.log('vote.vote_type:', vote.vote_type);
          console.log('voteType:', voteType);
          if (vote.vote_type !== voteType) {
            console.log(`Updating existing vote ${vote.id} from ${vote.vote_type} to ${voteType}`);
            const { error: updateError } = await supabase
              .from('votes')
              .update({ vote_type: voteType })
              .eq('id', vote.id);

            if (updateError) {
              console.error('Error updating vote:', updateError);
              throw updateError;
            }
          } else {
            console.log('Vote already exists with same type, skipping');
          }
        } else {
          console.log(`Creating new vote for game ${gameId}`);
          const { error: insertError } = await supabase.from('votes').insert({
            poll_id: id,
            game_id: gameId,
            vote_type: voteType,
            voter_name: finalName,
          });

          if (insertError) {
            console.error('Error inserting vote:', insertError);
            throw insertError;
          }
        }
      }

      // Save voter name for future use
      if (!user?.email) {
        await AsyncStorage.setItem('voter_name', finalName);
      }

      // Mark as voted in local storage for results access
      await AsyncStorage.setItem(`voted_${id}`, 'true');

      await reload();
      Toast.show({ type: 'success', text1: 'Votes submitted!' });
    } catch (err) {
      console.error('Error submitting votes:', err);
      Toast.show({ type: 'error', text1: 'Failed to submit votes' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!poll) return <ErrorState message="Poll not found." onRetry={reload} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{poll?.title}</Text>
        {!!poll?.description && <Text style={styles.description}>{poll.description}</Text>}
        <Text style={styles.subtitle}>
          {isCreator
            ? 'View results below'
            : 'Vote for as many games as you like with thumbs up, double thumbs up, or thumbs down'}
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
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
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
              game={game}
              index={i}
              selectedVote={pendingVotes[game.id] ?? game.userVote}
              onVote={handleVote}
              disabled={submitting}
            />
          ))
        )}
      </View>

      {Object.keys(pendingVotes).length > 0 && (
        <View style={styles.submitVotesContainer}>
          <TouchableOpacity
            style={styles.submitVotesButton}
            onPress={submitAllVotes}
            disabled={submitting}
          >
            <Text style={styles.submitVotesButtonText}>
              {submitting ? 'Submitting...' : 'Submit My Votes'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {hasVoted && (
        <View style={styles.viewResultsContainer}>
          <PollResultsButton
            onPress={() =>
              router.replace({ pathname: '/poll/[id]/results', params: { id: id as string } })
            }
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fc' },
  header: { padding: 20, backgroundColor: '#1a2b5f' },
  title: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#fff', marginBottom: 8 },
  description: { fontSize: 16, fontFamily: 'Poppins-Regular', color: '#fff', marginBottom: 12 },
  subtitle: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#fff', opacity: 0.8 },
  gamesContainer: { padding: 20 },
  noGamesText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    textAlign: 'center',
    marginTop: 32,
  },
  submitVotesContainer: { padding: 20, paddingTop: 0 },
  submitVotesButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitVotesButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  viewResultsContainer: { padding: 20 },
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
});