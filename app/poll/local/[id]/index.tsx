import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import React, { useState, useEffect } from 'react';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { VoteType } from '@/hooks/usePollData';
import { VoterNameInput } from '@/components/PollVoterNameInput';
import { GameCard } from '@/components/PollGameCard';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';

// Custom hook for local voting that bypasses user authentication
const useLocalPollData = (pollId: string | string[] | undefined) => {
  const [poll, setPoll] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingVotes, setPendingVotes] = useState<Record<number, VoteType>>({});

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
        .from('games')
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

        const voteData = {
          thumbs_down: gameVotes.filter(v => v.vote_type === VoteType.THUMBS_DOWN).length,
          thumbs_up: gameVotes.filter(v => v.vote_type === VoteType.THUMBS_UP).length,
          double_thumbs_up: gameVotes.filter(v => v.vote_type === VoteType.DOUBLE_THUMBS_UP).length,
          voters: gameVotes.map(v => ({
            name: v.voter_name || 'Anonymous',
            vote_type: v.vote_type as VoteType,
          })),
        };

        return {
          id: game.id,
          name: game.name || 'Unknown Game',
          yearPublished: game.year_published || null,
          thumbnail: game.image_url || 'https://via.placeholder.com/150?text=No+Image',
          image: game.image_url || 'https://via.placeholder.com/300?text=No+Image',
          min_players: game.min_players || 1,
          max_players: game.max_players || 1,
          playing_time: game.playing_time || 0,
          minPlaytime: game.minplaytime || 0,
          maxPlaytime: game.maxplaytime || 0,
          description: game.description || '',
          minAge: game.min_age || 0,
          is_cooperative: game.is_cooperative || false,
          complexity: game.complexity || 1,
          complexity_tier: game.complexity_tier || 1,
          complexity_desc: game.complexity_desc || '',
          average: game.average ?? null,
          bayesaverage: game.bayesaverage ?? null,
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
    reload: () => pollId && loadLocalPoll(pollId.toString()),
  };
};

export default function LocalPollScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const {
    poll,
    games,
    loading,
    error,
    pendingVotes,
    setPendingVotes,
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
      if (updated[gameId] === voteType) {
        delete updated[gameId];
      } else {
        updated[gameId] = voteType;
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
        return;
      }
      const finalName = trimmedName;
      for (const [gameIdStr, voteType] of Object.entries(pendingVotes)) {
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
          if (vote.vote_type !== voteType) {
            const { error: updateError } = await supabase
              .from('votes')
              .update({ vote_type: voteType })
              .eq('id', vote.id);
            if (updateError) throw updateError;
          }
        } else {
          const { error: insertError } = await supabase.from('votes').insert({
            poll_id: id,
            game_id: gameId,
            vote_type: voteType,
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
              game={game}
              index={i}
              selectedVote={pendingVotes[game.id]}
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
        />
      </View>
      <View style={{ paddingHorizontal: 0, width: '100%', alignSelf: 'stretch' }}>
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
        <View style={styles.bottomActionsContainer}>
          <View style={styles.viewResultsContainer}>
            <TouchableOpacity
              style={styles.viewResultsButton}
              onPress={navigateToResults}
            >
              <Text style={styles.viewResultsButtonText}>View Results</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 0,
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
    width: '100%',
    alignSelf: 'stretch',
  },
  submitVotesButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  bottomActionsContainer: { width: '100%', alignSelf: 'stretch', marginTop: 8 },
  viewResultsContainer: {
    marginTop: 8, marginBottom: 8, marginLeft: 0, marginRight: 0, paddingLeft: 20,
    paddingRight: 20, width: '100%', alignSelf: 'stretch'
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
  viewResultsButton: {
    backgroundColor: '#ff9654',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
  viewResultsButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
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