import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Poll, Vote } from '@/types/poll';
import { Game } from '@/types/game';
import { VOTING_OPTIONS, getVoteTypeKeyFromScore } from '@/components/votingOptions';
import { getVoteUpdatedFlag, removeVoteUpdatedFlag } from '@/utils/storage';
import { censor } from '@/utils/profanityFilter';

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
  const [creatorName, setCreatorName] = useState<string>('Loading...');
  const [comments, setComments] = useState<{ username: string; firstname: string; lastname: string; voter_name: string; comment_text: string }[]>([]);

  // Track the last pollId to prevent unnecessary re-fetches
  const lastPollIdRef = useRef<string | null>(null);

  const loadResults = useCallback(async (id: string) => {
    // Prevent duplicate requests for the same pollId
    if (lastPollIdRef.current === id) {
      return;
    }

    lastPollIdRef.current = id;

    try {
      setLoading(true);
      setError(null);

      // Check if user has voted by querying the database
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // Get user identifier using the same logic as usePollData
        let identifier = null;

        // Try to get saved username from storage
        const { getUsername } = await import('@/utils/storage');
        const savedUsername = await getUsername();
        if (savedUsername) {
          identifier = savedUsername;
        } else {
          // Fallback to anonymous ID
          const { getOrCreateAnonId } = await import('@/utils/anon');
          const anonId = await getOrCreateAnonId();
          identifier = anonId;
        }

        if (identifier) {
          const { data: userVotes, error: votesError } = await supabase
            .from('votes')
            .select('id')
            .eq('poll_id', id)
            .eq('voter_name', identifier)
            .limit(1);

          if (votesError) {
            console.warn('Error checking user votes:', votesError);
            setHasVoted(false);
          } else {
            setHasVoted(userVotes?.length > 0);
          }
        } else if (user) {
          const { data: userVotes, error: votesError } = await supabase
            .from('votes')
            .select('id')
            .eq('poll_id', id)
            .eq('user_id', user?.id)
            .limit(1);
          if (votesError) {
            console.warn('Error checking user votes:', votesError);
            setHasVoted(false);
          } else {
            setHasVoted(userVotes?.length > 0);
          }
        } else {
          setHasVoted(false);
        }
      } catch (error) {
        console.warn('Error checking if user has voted:', error);
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

      // Get the poll details (only polls with poll_games - these are game polls)
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select(`
          *,
          poll_games!inner(
            id,
            game_id
          )
        `)
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
        .from('games_view')
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
        .from('votes_view')
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
          votes: {} as Record<string, number>,
          voters: gameVotes.map(v => ({
            name: v.username
              ? (v.firstname || v.lastname
                ? `${censor([v.firstname, v.lastname].join(' ').trim())} (${v.username})`
                : v.username
              ) : censor(v.voter_name) || 'Anonymous',
            vote_type: v.vote_type,
          })) || [],
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

        return {
          id: game.id,
          name: game.name,
          yearPublished: game.year_published,
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
          const voteTypeKey = getVoteTypeKeyFromScore(option.score);
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

      // Fetch creator info
      const fetchCreatorInfo = async () => {
        const { data, error } = await supabase
          .from('polls_profiles')
          .select('username, firstname, lastname')
          .eq('id', id)
          .maybeSingle();
        if (!error && data) {
          const { username, firstname, lastname } = data;
          setCreatorName(
            firstname || lastname
              ? `${censor([firstname, lastname].join(' ').trim())} (${username})`
              : username
          );
        }
      };
      await fetchCreatorInfo();

      // Fetch poll comments
      const fetchComments = async () => {
        const { data, error } = await supabase
          .from('poll_comments_view')
          .select('username, firstname, lastname, voter_name, comment_text')
          .eq('poll_id', id)
          .order('created_at', { ascending: false });
        if (!error && data) setComments(data);
      };
      await fetchComments();

    } catch (err) {
      console.error('Error in loadResults:', err);
      setError((err as Error).message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pollId && typeof pollId === 'string') {
      loadResults(pollId);
    }
  }, [pollId, loadResults]);

  const reload = useCallback(() => {
    if (pollId && typeof pollId === 'string') {
      lastPollIdRef.current = null; // Reset the ref to allow re-fetch
      loadResults(pollId);
    }
  }, [pollId, loadResults]);

  return {
    poll,
    games,
    results,
    hasVoted,
    voteUpdated,
    creatorName,
    comments,
    loading,
    error,
    reload,
  };
};