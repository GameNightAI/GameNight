import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
// import { VoteType } from '@/types/poll'; // or copy enum here

export default function PollResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [games, setGames] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [checkingVote, setCheckingVote] = useState(true);
  const [gamesResults, setGamesResults] = useState<
    {
      id: number;
      name: string;
      thumbs_up: number;
      double_thumbs_up: number;
      thumbs_down: number;
      voter: string[]
    }[]
  >([]);
  console.log('PollResultsScreen - poll ID:', id);

  useEffect(() => {
    checkIfVoted();
  }, []);

  const checkIfVoted = async () => {

    try {
      setCheckingVote(true);
      setError(null);

      if (!id) throw new Error('Invalid poll ID');
      console.log('Checking vote for poll ID:', id);

      // Check local AsyncStorage flag
      const votedFlag = await AsyncStorage.getItem(`voted_${id}`);
      console.log('AsyncStorage voted flag:', votedFlag);
      if (votedFlag !== 'true') {
        setHasVoted(false);
        setCheckingVote(false);
        return;
      }

      // Fetch poll title (optional, for display)
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('title, user_id')
        .eq('id', id)
        .single();

      if (pollError) throw pollError;
      console.log('Poll title fetched:', pollData?.title);
      setPollTitle(pollData.title);

      const { data: { user } } = await supabase.auth.getUser();

      if (user?.id === pollData.user_id) {
        setHasVoted(true);
        setPollTitle(pollData.title);
        // skip AsyncStorage check and go straight to fetching votes
      } else {
        // proceed with existing local AsyncStorage check
        const votedFlag = await AsyncStorage.getItem(`voted_${id}`);
        if (votedFlag !== 'true') {
          setHasVoted(false);
          setCheckingVote(false);
          return;
        }
      }

      // Fetch vote summary grouped by game and vote type
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('game_id, vote_type, voter_name')
        .eq('poll_id', id);

      if (votesError) throw votesError;
      console.log('Votes fetched:', votes);

      // Aggregate votes per game
      const resultsMap: Record<number, { thumbs_up: number; double_thumbs_up: number; thumbs_down: number, voter_name: string[] }> = {};

      votes.forEach(({ game_id, vote_type, voter_name }) => {
        if (!resultsMap[game_id]) {
          resultsMap[game_id] = { thumbs_up: 0, double_thumbs_up: 0, thumbs_down: 0, voter_name: [] };
        }

        if (vote_type === 'thumbs_up') resultsMap[game_id].thumbs_up++;
        else if (vote_type === 'double_thumbs_up') resultsMap[game_id].double_thumbs_up++;
        else if (vote_type === 'thumbs_down') resultsMap[game_id].thumbs_down++;

        if (!resultsMap[game_id].voter_name.includes(voter_name)) {
          resultsMap[game_id].voter_name.push(voter_name);
        }
      })
      console.log('Aggregated results map:', resultsMap);

      // Fetch game names for these game_ids
      const gameIds = Object.keys(resultsMap).map(idStr => parseInt(idStr));
      console.log('Game IDs:', gameIds);
      const { data: games, error: gamesError } = await supabase
        .from('collections_games')
        .select('bgg_game_id, name')
        .in('bgg_game_id', gameIds);

      if (gamesError) throw gamesError;
      console.log('Games fetched:', games);

      // Combine results with game names
      const combinedResults = games.map(game => ({
        id: game.bgg_game_id,
        name: game.name,
        thumbs_up: resultsMap[game.bgg_game_id]?.thumbs_up || 0,
        double_thumbs_up: resultsMap[game.bgg_game_id]?.double_thumbs_up || 0,
        thumbs_down: resultsMap[game.bgg_game_id]?.thumbs_down || 0,
        voter: resultsMap[game.bgg_game_id]?.voter_name || [],
      }));
      console.log('Combined results:', combinedResults);

      setGamesResults(combinedResults);
      setHasVoted(true);
    } catch (err) {
      console.error('Error in checkIfVoted:', err);
      setError(err instanceof Error ? err.message : 'Failed to load results');
      setHasVoted(false);
    } finally {
      setCheckingVote(false);
    }
  };

  if (checkingVote) {
    return <LoadingState />;
  }

  if (!hasVoted) {
    return (
      <ErrorState
        message="You need to vote in the poll before viewing the results."
        onRetry={() => router.back()}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={checkIfVoted}
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Poll Results</Text>
      {gamesResults.map(game => (
        <View key={game.id} style={styles.resultCard}>
          <Text style={styles.name}>{game.name}</Text>
          <Text>Down: {game.thumbs_down}</Text>
          <Text>Up: {game.thumbs_up}</Text>
          <Text>Love: {game.double_thumbs_up}</Text>
          <Text style={styles.voters}>Voters: {game.voter.join(', ')}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  heading: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  name: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  voters: {
    marginTop: 4,
    fontSize: 12,
    color: '#888',
  }
});

/* old function
    const { data: { user } } = await supabase.auth.getUser();
    const userIdentifier = user?.email || 'Anonymous'; // Fallback for anonymous
    const { data: votes } = await supabase
      .from('votes')
      .select('id')
      .eq('poll_id', id)
      .eq('voter_name', userIdentifier);

    setHasVoted((votes?.length || 0) > 0);
    setCheckingVote(false);
  };

  const loadResults = async () => {
    try {
      setError(null);
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('poll_id', id);

      if (votesError) throw votesError;

      const { data: pollGames } = await supabase
        .from('poll_games')
        .select('game_id')
        .eq('poll_id', id);

      const gameIds = pollGames?.map(pg => pg.game_id) || [];

      const { data: gameDetails } = await supabase
        .from('collections_games')
        .select('*')
        .in('bgg_game_id', gameIds);

      const enrichedGames = gameDetails.map(game => {
        const gameVotes = votes.filter(v => v.game_id === game.bgg_game_id);
        return {
          ...game,
          thumbs_up: gameVotes.filter(v => v.vote_type === VoteType.THUMBS_UP).length,
          double_thumbs_up: gameVotes.filter(v => v.vote_type === VoteType.DOUBLE_THUMBS_UP).length,
          thumbs_down: gameVotes.filter(v => v.vote_type === VoteType.THUMBS_DOWN).length,
          voters: gameVotes.map(v => v.voter_name),
        };
      });

      setGames(enrichedGames);
    } catch (err) {
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (checkingVote) return <LoadingState />;

  if (!hasVoted) {
    return (
      <ErrorState
        message="You need to vote in the poll before viewing the results."
        onRetry={() => router.back()}
      />
    );
  }
  if (error) return <ErrorState message={error} onRetry={loadResults} />;
*/