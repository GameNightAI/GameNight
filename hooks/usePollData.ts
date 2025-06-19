// hooks/usePollData.ts

import { useEffect, useState } from 'react';
import { getOrCreateAnonId } from '@/utils/anon';
import { supabase } from '@/services/supabase';
import { Poll, Vote } from '@/types/poll';
import { Game } from '@/types/game';

export enum VoteType {
  THUMBS_DOWN = 'thumbs_down',
  THUMBS_UP = 'thumbs_up',
  DOUBLE_THUMBS_UP = 'double_thumbs_up',
}

interface GameVotes {
  thumbs_down: number;
  thumbs_up: number;
  double_thumbs_up: number;
  voters: { name: string; vote_type: VoteType }[];
}

interface PollGame extends Game {
  votes: GameVotes;
  userVote?: VoteType | null;
}

export const usePollData = (pollId: string | string[] | undefined) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [games, setGames] = useState<PollGame[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pendingVotes, setPendingVotes] = useState<Record<number, VoteType>>({});

  useEffect(() => {
    if (pollId) loadPoll(pollId.toString());
  }, [pollId]);

  const loadPoll = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (pollError || !pollData) throw new Error('Poll not found');

      setPoll(pollData);

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsCreator(user?.id === pollData.user_id);

      const { data: pollGames } = await supabase
        .from('poll_games')
        .select('game_id')
        .eq('poll_id', id);

      const gameIds = pollGames?.map(pg => pg.game_id) || [];

      const { data: gamesData } = await supabase
        //        .from('collections_games')
        //        .select('*')
        //        .eq('user_id', pollData.user_id)
        //        .in('bgg_game_id', gameIds);

        .from('games')
        .select('*')
        .in('id', gameIds);

      if (!gamesData) throw new Error('Could not load games');

      const { data: votes } = await supabase
        .from('votes')
        .select('*')
        .eq('poll_id', id);

      if (!votes) throw new Error('Could not load votes');

      const anonId = await getOrCreateAnonId();
      const identifier = user?.email || anonId;
      const userVotes = votes.filter(v => v.voter_name === identifier);
      setHasVoted(userVotes.length > 0 || user?.id === pollData.user_id);

      const formattedGames = gamesData.map(game => {
        const gameVotes = votes.filter(v => v.game_id === game.bgg_game_id);

        const voteData: GameVotes = {
          thumbs_down: gameVotes.filter(v => v.vote_type === VoteType.THUMBS_DOWN).length,
          thumbs_up: gameVotes.filter(v => v.vote_type === VoteType.THUMBS_UP).length,
          double_thumbs_up: gameVotes.filter(v => v.vote_type === VoteType.DOUBLE_THUMBS_UP).length,
          voters: gameVotes.map(v => ({
            name: v.voter_name,
            vote_type: v.vote_type as VoteType,
          })),
        };

        return {
          ...game,
          id: game.id,
          votes: voteData,
          userVote: gameVotes.find(v => v.voter_name === identifier)?.vote_type || null,
        };
      });

      const initialVotes: Record<number, VoteType> = {};
      userVotes.forEach(v => {
        initialVotes[v.game_id] = v.vote_type as VoteType;
      });

      setGames(formattedGames);
      setPendingVotes(initialVotes);
    } catch (err) {
      setError((err as Error).message);
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