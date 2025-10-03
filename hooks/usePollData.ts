// hooks/usePollData.ts

import { useEffect, useState } from 'react';
import { getOrCreateAnonId } from '@/utils/anon';
import { supabase } from '@/services/supabase';
import { Poll, Vote } from '@/types/poll';
import { Game } from '@/types/game';
import { VOTING_OPTIONS, VOTE_TYPE_TO_SCORE, getVoteTypeKeyFromScore } from '@/components/votingOptions';
import { getUsername } from '@/utils/storage';

interface GameVotes {
  votes: Record<string, number>; // voteType1: 3, voteType2: 1, etc.
  voters: { name: string; vote_type: number }[];
}

interface PollGame extends Game {
  votes: GameVotes;
  userVote?: number | null;
}

export const usePollData = (pollId: string | string[] | undefined) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [games, setGames] = useState<PollGame[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pendingVotes, setPendingVotes] = useState<Record<number, number>>({});

  useEffect(() => {
    if (pollId) loadPoll(pollId.toString());
  }, [pollId]);

  const loadPoll = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // console.log('Loading poll with ID:', id);

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

      // console.log('Poll data loaded:', pollData);
      setPoll(pollData);

      // Get current user (may be null for anonymous users)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.warn('User auth error (continuing as anonymous):', userError);
      }

      setUser(user);
      setIsCreator(user?.id === pollData.user_id);

      // Get the games in this poll
      const { data: pollGames, error: gamesError } = await supabase
        .from('poll_games')
        .select('game_id')
        .eq('poll_id', id);

      if (gamesError) {
        console.error('Poll games error:', gamesError);
        throw gamesError;
      }

      // console.log('Poll games:', pollGames);

      if (!pollGames || pollGames.length === 0) {
        console.log('No games found in poll');
        setGames([]);
        setLoading(false);
        return;
      }

      const gameIds = pollGames.map(pg => pg.game_id);
      // console.log('Game IDs to fetch:', gameIds);

      // Get the actual game details from games table
      const { data: gamesData, error: gameDetailsError } = await supabase
        .from('games_view')
        .select('*')
        .in('id', gameIds);

      if (gameDetailsError) {
        console.error('Game details error:', gameDetailsError);
        throw gameDetailsError;
      }

      // console.log('Games data loaded:', gamesData);

      if (!gamesData || gamesData.length === 0) {
        console.log('No game details found');
        setGames([]);
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

      console.log('Votes loaded:', votes);

      // Get user identifier for vote checking with better fallback
      let identifier = null;
      try {
        if (user?.email) {
          identifier = user.email;
        } else {
          // Try to get saved username from storage
          const savedUsername = await getUsername();
          if (savedUsername) {
            identifier = savedUsername;
          } else {
            // Fallback to anonymous ID
            const anonId = await getOrCreateAnonId();
            identifier = anonId;
          }
        }
      } catch (error) {
        console.warn('Could not get user identifier:', error);
        // Try anonymous ID as last resort
        try {
          const anonId = await getOrCreateAnonId();
          identifier = anonId;
        } catch (anonError) {
          console.warn('Could not get anonymous ID:', anonError);
        }
      }

      console.log('User identifier:', identifier);

      const userVotes = votes?.filter(v => v.voter_name === identifier) || [];
      setHasVoted(userVotes.length > 0 || user?.id === pollData.user_id);

      // Map games data to the expected format
      const formattedGames = gamesData.map(game => {
        // Find votes for this specific game using the game's ID
        const gameVotes = votes?.filter(v => v.game_id === game.id) || [];

        // Initialize vote counts with zeros
        const voteData: GameVotes = {
          votes: {} as Record<string, number>,
          voters: gameVotes.map(v => ({
            name: v.voter_name || 'Anonymous',
            vote_type: v.vote_type,
          })),
        };

        // Initialize all vote types to 0 using VOTING_OPTIONS
        VOTING_OPTIONS.forEach(option => {
          voteData.votes[option.value] = 0;
        });

        // Count votes using the utility function
        gameVotes.forEach(vote => {
          const voteTypeKey = getVoteTypeKeyFromScore(vote.vote_type);
          voteData.votes[voteTypeKey]++;
        });

        // Find user's vote for this game
        const userVote = identifier ?
          gameVotes.find(v => v.voter_name === identifier)?.vote_type ?? null
          : null;

        return {
          id: game.id,
          name: game.name || 'Unknown Game',
          yearPublished: game.year_published || null,
          thumbnail: game.thumbnail || 'https://cf.geekdo-images.com/zxVVmggfpHJpmnJY9j-k1w__imagepagezoom/img/RO6wGyH4m4xOJWkgv6OVlf6GbrA=/fit-in/1200x900/filters:no_upscale():strip_icc()/pic1657689.jpg',
          image: game.image_url || 'https://cf.geekdo-images.com/zxVVmggfpHJpmnJY9j-k1w__imagepagezoom/img/RO6wGyH4m4xOJWkgv6OVlf6GbrA=/fit-in/1200x900/filters:no_upscale():strip_icc()/pic1657689.jpg',
          min_players: game.min_players,
          max_players: game.max_players,
          min_exp_players: game.min_exp_players,
          max_exp_players: game.max_exp_players,
          playing_time: game.playing_time,
          minPlaytime: game.minplaytime,
          maxPlaytime: game.maxplaytime,
          description: game.description,
          minAge: game.min_age,
          is_cooperative: game.is_cooperative,
          is_teambased: game.is_teambased,
          complexity: game.complexity,
          complexity_tier: game.complexity_tier,
          complexity_desc: game.complexity_desc,
          average: game.average,
          bayesaverage: game.bayesaverage,
          votes: voteData,
          userVote,
        };
      });

      // Set initial pending votes from user's existing votes
      const initialVotes: Record<number, number> = {};
      userVotes.forEach(v => {
        if (v.game_id && typeof v.vote_type === 'number') {
          initialVotes[v.game_id] = v.vote_type;
        }
      });

      setGames(formattedGames);
      setPendingVotes(initialVotes);
    } catch (err) {
      console.error('Error in loadPoll:', err);
      setError((err as Error).message || 'Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  return {
    poll,
    games,
    hasVoted,
    isCreator,
    loading,
    error,
    user,
    pendingVotes,
    setPendingVotes,
    reload: () => pollId && loadPoll(pollId.toString()),
  };
};