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
      const finalName = user?.email || voterName.trim();

      if (!finalName) {
        setNameError(true);
        Toast.show({ type: 'error', text1: 'Please enter your name' });
        return;
      }

      for (const [gameIdStr, voteType] of Object.entries(pendingVotes)) {
        const gameId = parseInt(gameIdStr, 10);
        const { data: existing } = await supabase
          .from('votes')
          .select('id, vote_type')
          .eq('poll_id', id)
          .eq('game_id', gameId)
          .eq('voter_name', finalName);

        if (existing && existing.length > 0) {
          const vote = existing[0];
          if (vote.vote_type !== voteType) {
            await supabase.from('votes').update({ vote_type: voteType }).eq('id', vote.id);
          }
        } else {
          await supabase.from('votes').insert({
            poll_id: id,
            game_id: gameId,
            vote_type: voteType,
            voter_name: finalName,
          });
        }
      }

      await AsyncStorage.setItem('voter_name', finalName);
      await reload();
      Toast.show({ type: 'success', text1: 'Votes submitted!' });
    } catch (err) {
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
        <VoterNameInput
          value={voterName}
          onChange={(text) => {
            setVoterName(text);
            if (nameError) setNameError(false);
          }}
          hasError={nameError}
        />
      )}

      <View style={styles.gamesContainer}>
        {games.map((game, i) => (
          <GameCard
            key={game.id}
            game={game}
            index={i}
            selectedVote={pendingVotes[game.id] ?? game.userVote}
            onVote={handleVote}
            disabled={submitting}
          />
        ))}
      </View>

      {Object.keys(pendingVotes).length > 0 && (
        <View style={styles.submitVotesContainer}>
          <TouchableOpacity
            style={styles.submitVotesButton}
            onPress={submitAllVotes}
            disabled={submitting}
          >
            <Text style={styles.submitVotesButtonText}>Submit My Votes</Text>
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
});