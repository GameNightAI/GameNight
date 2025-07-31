import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { Poll, Vote } from '@/types/poll';
import { Game } from '@/types/game';
import { VOTING_OPTIONS } from '@/components/votingOptions';
import { getVotedFlag, getVoteUpdatedFlag, removeVoteUpdatedFlag } from '@/utils/storage';

interface GameVotes {
  votes: Record<string, number>; // voteType1: 3, voteType2: 1, etc.
  voters: { name: string; vote_type: number }[];
}

interface PollGame extends Game {
  votes: GameVotes;
  userVote?: number | null;
}

export interface GameResult {
  game: PollGame;
  totalScore: number;
  totalVotes: number;
  ranking: number;
}

export const usePollResults = (pollId: string | string[] | undefined) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [games, setGames] = useState<PollGame[]>([]);
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteUpdated, setVoteUpdated] = useState(false);

  useEffect(() => {
    if (pollId) loadResults(pollId.toString());
  }, [pollId]);

  const loadResults = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check if user has voted
      try {
        const votedFlag = await getVotedFlag(id);
        setHasVoted(votedFlag);
      } catch (storageError) {
        console.warn('Error checking voted flag:', storageError);
        setHasVoted(false);
      }

      // Check if votes were updated
      try {
        const voteUpdatedFlag = await getVoteUpdatedFlag(id);
        setVoteUpdated(voteUpdatedFlag);
        if (voteUpdatedFlag) {
          // Clear the flag after reading it
          await removeVoteUpdatedFlag(id);
        }
      } catch (storageError) {
        console.warn('Error checking vote updated flag:', storageError);
        setVoteUpdated(false);
      }

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
        setResults([]);
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
        setResults([]);
        setLoading(false);
        return;
      }

      // Get votes for this poll
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('poll_id', id);

      if (votesError) {
        console.error('Votes error:', votesError);
        throw votesError;
      }

      // Map games data to the expected format
      const formattedGames = gamesData.map(game => {
        const gameVotes = votes?.filter(v => v.game_id === game.id) || [];

        const voteData: GameVotes = {
          votes: {
            voteType1: gameVotes.filter(v => v.vote_type === 3).length,
            voteType2: gameVotes.filter(v => v.vote_type === 2).length,
            voteType3: gameVotes.filter(v => v.vote_type === 1).length,
            voteType4: gameVotes.filter(v => v.vote_type === 0).length,
            voteType5: gameVotes.filter(v => v.vote_type === -3).length,
          },
          voters: gameVotes.map(v => ({
            name: v.voter_name || 'Anonymous',
            vote_type: v.vote_type,
          })) || [],
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
        };
      });

      setGames(formattedGames);

      // Calculate results
      const gameResults: GameResult[] = formattedGames.map(game => {
        // Ensure game.votes exists
        if (!game.votes) {
          console.warn('Game votes is undefined for game:', game.id);
          return {
            game,
            totalScore: 0,
            totalVotes: 0,
            ranking: 0,
          };
        }

        // Use array manipulation for cleaner code
        const totalScore = VOTING_OPTIONS.reduce((score, option) => {
          const voteTypeKey = `voteType${option.score === 3 ? 1 : option.score === 2 ? 2 : option.score === 1 ? 3 : option.score === 0 ? 4 : 5}`;
          const voteCount = game.votes.votes[voteTypeKey] || 0;
          return score + (option.score * voteCount);
        }, 0);

        const totalVotes = Object.values(game.votes.votes).reduce((sum, count) => sum + count, 0);

        return {
          game,
          totalScore,
          totalVotes,
          ranking: 0, // Will be set after sorting
        };
      });

      // Sort by total score (descending) and assign rankings
      gameResults.sort((a, b) => b.totalScore - a.totalScore);
      gameResults.forEach((result, index) => {
        result.ranking = index + 1;
      });

      setResults(gameResults);
    } catch (err) {
      console.error('Error in loadResults:', err);
      setError((err as Error).message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  return {
    poll,
    games,
    results,
    hasVoted,
    voteUpdated,
    loading,
    error,
    reload: () => pollId && loadResults(pollId.toString()),
  };
};