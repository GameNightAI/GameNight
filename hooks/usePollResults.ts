import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';

export type GameResult = {
  id: number;
  name: string;
  thumbs_up: number;
  double_thumbs_up: number;
  thumbs_down: number;
  voters: string[];
};

export function usePollResults(pollId?: string) {
  const [pollTitle, setPollTitle] = useState('');
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pollId) {
      setError('Invalid poll ID');
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching poll results for ID:', pollId);

        console.log('Fetching poll results for ID:', pollId);

        // Check local vote flag
        const votedFlag = await AsyncStorage.getItem(`voted_${pollId}`);
        console.log('Local voted flag:', votedFlag);
        console.log('Local voted flag:', votedFlag);

        // Fetch poll info
        const { data: pollData, error: pollError } = await supabase
          .from('polls')
          .select('title, user_id')
          .eq('id', pollId)
          .single();

        if (pollError) {
          console.error('Poll fetch error:', pollError);
          throw pollError;
        }
        if (pollError) {
          console.error('Poll fetch error:', pollError);
          throw pollError;
        }

        console.log('Poll data:', pollData);
        console.log('Poll data:', pollData);
        setPollTitle(pollData.title);

        // Get current user ID
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.warn('Auth error (continuing as anonymous):', authError);
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.warn('Auth error (continuing as anonymous):', authError);
        }

        const currentUserId = authData.user?.id;
        console.log('Current user ID:', currentUserId);

        if (currentUserId === pollData.user_id) {
          // Poll creator can always see results
          console.log('User is poll creator, allowing access to results');
          setHasVoted(true);
        } else if (votedFlag !== 'true') {
          console.log('User has not voted, denying access to results');
          setHasVoted(false);
          setLoading(false);
          return;
        } else {
          console.log('User has voted, allowing access to results');
          setHasVoted(true);
        }
        if (currentUserId === pollData.user_id) {
          // Poll creator can always see results
          console.log('User is poll creator, allowing access to results');
          setHasVoted(true);
        } else if (votedFlag !== 'true') {
          console.log('User has not voted, denying access to results');
          setHasVoted(false);
          setLoading(false);
          return;
        } else {
          console.log('User has voted, allowing access to results');
          setHasVoted(true);
        }

        // Fetch votes
        const { data: votes, error: votesError } = await supabase
          .from('votes')
          .select('game_id, vote_type, voter_name')
          .eq('poll_id', pollId);

        if (votesError) {
          console.error('Votes fetch error:', votesError);
          throw votesError;
        }

        console.log('Votes data:', votes);
        if (votesError) {
          console.error('Votes fetch error:', votesError);
          throw votesError;
        }

        console.log('Votes data:', votes);

        // Aggregate votes by game
        const resultsMap: Record<
          number,
          { thumbs_up: number; double_thumbs_up: number; thumbs_down: number; voters: string[] }
        > = {};

        votes?.forEach(({ game_id, vote_type, voter_name }) => {
          if (!game_id) return; // Skip votes without game_id

          if (!resultsMap[game_id]) {
            resultsMap[game_id] = { thumbs_up: 0, double_thumbs_up: 0, thumbs_down: 0, voters: [] };
          }

          if (vote_type === 'thumbs_up') resultsMap[game_id].thumbs_up++;
          else if (vote_type === 'double_thumbs_up') resultsMap[game_id].double_thumbs_up++;
          else if (vote_type === 'thumbs_down') resultsMap[game_id].thumbs_down++;

          if (voter_name && !resultsMap[game_id].voters.includes(voter_name)) {
            resultsMap[game_id].voters.push(voter_name);
          }
        });

        console.log('Results map:', resultsMap);

        // Fetch game details
        const gameIds = Object.keys(resultsMap).map(Number);
        console.log('Game IDs to fetch:', gameIds);

        if (gameIds.length === 0) {
          console.log('No games with votes found');
          setGameResults([]);
          setLoading(false);
          return;
        }

        console.log('Game IDs to fetch:', gameIds);

        if (gameIds.length === 0) {
          console.log('No games with votes found');
          setGameResults([]);
          setLoading(false);
          return;
        }

        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select('id, name')
          .in('id', gameIds);

        if (gamesError) {
          console.error('Games fetch error:', gamesError);
          throw gamesError;
        }

        console.log('Games data:', gamesData);
        if (gamesError) {
          console.error('Games fetch error:', gamesError);
          throw gamesError;
        }

        console.log('Games data:', gamesData);

        const combinedResults: GameResult[] = gamesData?.map((game) => ({
          id: game.id,
          name: game.name || 'Unknown Game',
          thumbs_up: resultsMap[game.id]?.thumbs_up || 0,
          double_thumbs_up: resultsMap[game.id]?.double_thumbs_up || 0,
          thumbs_down: resultsMap[game.id]?.thumbs_down || 0,
          voters: resultsMap[game.id]?.voters || [],
        })) || [];

        console.log('Combined results:', combinedResults);
        console.log('Combined results:', combinedResults);
        setGameResults(combinedResults);
      } catch (err) {
        console.error('Error in fetchData:', err);
        console.error('Error in fetchData:', err);
        setError(err instanceof Error ? err.message : 'Failed to load poll results');
        setHasVoted(false);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [pollId]);

  return { pollTitle, gameResults, hasVoted, loading, error };
}