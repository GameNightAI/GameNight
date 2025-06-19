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
        // Check local vote flag
        const votedFlag = await AsyncStorage.getItem(`voted_${pollId}`);

        // Fetch poll info
        const { data: pollData, error: pollError } = await supabase
          .from('polls')
          .select('title, user_id')
          .eq('id', pollId)
          .single();

        if (pollError) throw pollError;

        setPollTitle(pollData.title);

        // Get current user ID
        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData.user?.id;

        if (currentUserId === pollData.user_id) {
          // Poll creator can always see results
          setHasVoted(true);
        } else if (votedFlag !== 'true') {
          setHasVoted(false);
          setLoading(false);
          return;
        } else {
          setHasVoted(true);
        }

        // Fetch votes
        const { data: votes, error: votesError } = await supabase
          .from('votes')
          .select('game_id, vote_type, voter_name')
          .eq('poll_id', pollId);

        if (votesError) throw votesError;

        // Aggregate votes by game
        const resultsMap: Record<
          number,
          { thumbs_up: number; double_thumbs_up: number; thumbs_down: number; voters: string[] }
        > = {};

        votes.forEach(({ game_id, vote_type, voter_name }) => {
          if (!resultsMap[game_id]) {
            resultsMap[game_id] = { thumbs_up: 0, double_thumbs_up: 0, thumbs_down: 0, voters: [] };
          }
          if (vote_type === 'thumbs_up') resultsMap[game_id].thumbs_up++;
          else if (vote_type === 'double_thumbs_up') resultsMap[game_id].double_thumbs_up++;
          else if (vote_type === 'thumbs_down') resultsMap[game_id].thumbs_down++;

          if (!resultsMap[game_id].voters.includes(voter_name)) {
            resultsMap[game_id].voters.push(voter_name);
          }
        });

        /*        // Fetch game details
                const gameIds = Object.keys(resultsMap).map(Number);
                const { data: gamesData, error: gamesError } = await supabase
                  .from('collections_games')
                  .select('bgg_game_id, name')
                  .in('bgg_game_id', gameIds);
        
                if (gamesError) throw gamesError;
        
                const combinedResults: GameResult[] = gamesData.map((game) => ({
                  id: game.bgg_game_id,
                  name: game.name,
                  thumbs_up: resultsMap[game.bgg_game_id]?.thumbs_up || 0,
                  double_thumbs_up: resultsMap[game.bgg_game_id]?.double_thumbs_up || 0,
                  thumbs_down: resultsMap[game.bgg_game_id]?.thumbs_down || 0,
                  voters: resultsMap[game.bgg_game_id]?.voters || [],
                }));
        */
        const gameIds = Object.keys(resultsMap).map(Number);
        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select('id, name')
          .in('id', gameIds);

        if (gamesError) throw gamesError;

        const combinedResults: GameResult[] = gamesData.map((game) => ({
          id: game.id,
          name: game.name,
          thumbs_up: resultsMap[game.id]?.thumbs_up || 0,
          double_thumbs_up: resultsMap[game.id]?.double_thumbs_up || 0,
          thumbs_down: resultsMap[game.id]?.thumbs_down || 0,
          voters: resultsMap[game.id]?.voters || [],
        }));

        setGameResults(combinedResults);
      } catch (err) {
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