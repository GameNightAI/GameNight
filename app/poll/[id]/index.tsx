import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThumbsUp, Heart, ThumbsDown } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { getOrCreateAnonId } from '@/utils/anon';
import { supabase } from '@/services/supabase';
import { Poll, Vote } from '@/types/poll';
import { Game } from '@/types/game';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Vote types enum
enum VoteType {
  THUMBS_DOWN = 'thumbs_down',
  THUMBS_UP = 'thumbs_up',
  DOUBLE_THUMBS_UP = 'double_thumbs_up'
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

export default function PollScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [games, setGames] = useState<PollGame[]>([]);
  //  const [selectedGames, setSelectedGames] = useState<number[]>([]);
  const [voterName, setVoterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  //  const [hasVoted, setHasVoted] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  //  const [checkingVote, setCheckingVote] = useState(true);
  const [nameError, setNameError] = useState(false);
  const [pendingVotes, setPendingVotes] = useState<Record<number, VoteType>>({});

  useEffect(() => {
    loadPoll();
    loadSavedName();
  }, [id]);

  const loadSavedName = async () => {
    const savedName = await AsyncStorage.getItem('voter_name');
    if (savedName) setVoterName(savedName);
  };

  const loadPoll = async () => {
    try {
      setError(null);

      // Get the poll details
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (pollError) {
        if (pollError.code === 'PGRST116') {
          throw new Error('Poll not found or has been deleted');
        }
        throw pollError;
      }

      if (!pollData) {
        throw new Error('Poll not found or has been deleted');
      }

      setPoll(pollData);

      // Check if current user is the creator
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setIsCreator(user?.id === pollData.user_id);

      // Get the games in this poll
      const { data: pollGames, error: gamesError } = await supabase
        .from('poll_games')
        .select('game_id')
        .eq('poll_id', id);

      if (gamesError) throw gamesError;

      // Get the actual game details from collections_games view
      const gameIds = pollGames.map(pg => pg.game_id);
      const { data: games, error: gameDetailsError } = await supabase
        .from('games')
        .select('*')
        .in('id', gameIds);

      if (gameDetailsError) throw gameDetailsError;

      // Get votes for this poll
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('poll_id', id);

      if (votesError) throw votesError;

      const anonId = await getOrCreateAnonId(); // get anonymous identifier
      const voterIdentifier = user?.email || anonId;

      const userVotes = votes.filter(v => v.voter_name === voterIdentifier);

      // Allow creator to see results even if they haven’t voted
      const isPollCreator = user?.id === pollData.user_id;
      setHasVoted(userVotes.length > 0 || isPollCreator);

      // Combine game data with vote counts and user votes
      const gamesWithVotes = games.map(game => {
        const gameVotes = votes.filter(v => v.game_id === game.bgg_game_id);

        const voteData: GameVotes = {
          thumbs_down: gameVotes.filter(v => v.vote_type === VoteType.THUMBS_DOWN).length,
          thumbs_up: gameVotes.filter(v => v.vote_type === VoteType.THUMBS_UP).length,
          double_thumbs_up: gameVotes.filter(v => v.vote_type === VoteType.DOUBLE_THUMBS_UP).length,
          voters: gameVotes.map(v => ({
            name: v.voter_name,
            vote_type: v.vote_type as VoteType
          })).filter(v => v.name)
        };

        // Find current user's vote for this game
        const userVote = gameVotes.find(v => v.voter_name === voterIdentifier)?.vote_type as VoteType || null;

        return {
          id: game.bgg_game_id,
          name: game.name,
          thumbnail: game.thumbnail,
          min_players: game.min_players,
          max_players: game.max_players,
          minPlaytime: game.minplaytime || 0,
          maxPlaytime: game.maxplaytime || 0,
          minAge: game.min_age || 0,
          is_cooperative: game.is_cooperative || false,
          complexity: game.complexity || 1,
          complexity_desc: game.complexity_desc || '',
          playing_time: game.playing_time,
          yearPublished: game.year_published,
          description: '',
          image: game.thumbnail,
          votes: voteData,
          userVote
        };
      });

      const initialVotes: Record<number, VoteType> = {};
      userVotes.forEach(vote => {
        initialVotes[vote.game_id] = vote.vote_type as VoteType;
      });
      setPendingVotes(initialVotes);

      // removed the sorting function. we can re-implement later
      setGames(gamesWithVotes);
    } catch (err) {
      console.error('Error loading poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

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
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      const finalVoterName = user?.email || voterName.trim();

      if (!finalVoterName) {
        setNameError(true);
        Toast.show({
          type: 'error',
          text1: 'Please enter your name',
        });
        setSubmitting(false);
        return;
      }

      for (const [gameIdStr, voteType] of Object.entries(pendingVotes)) {
        const gameId = parseInt(gameIdStr, 10);

        // Check for existing vote
        const { data: existingVotes } = await supabase
          .from('votes')
          .select('id, vote_type')
          .eq('poll_id', id)
          .eq('game_id', gameId)
          .eq('voter_name', finalVoterName);

        if (existingVotes && existingVotes.length > 0) {
          const existingVote = existingVotes[0];

          if (existingVote.vote_type !== voteType) {
            await supabase.from('votes').update({ vote_type: voteType }).eq('id', existingVote.id);
          }
        } else {
          await supabase.from('votes').insert({
            poll_id: id,
            game_id: gameId,
            vote_type: voteType,
            voter_name: finalVoterName,
          });
        }
      }

      await AsyncStorage.setItem('voter_name', finalVoterName);
      await loadPoll(); // Refresh results after submit
      setHasVoted(true); // Mark that user has voted
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit votes');
    } finally {
      setSubmitting(false);
    }
  };

  const getVoteButtonStyle = (gameId: number, voteType: VoteType) => {
    const selectedVote = pendingVotes[gameId] ?? games.find(g => g.id === gameId)?.userVote;

    const isSelected = selectedVote === voteType;

    return [
      styles.voteButton,
      isSelected && styles.voteButtonSelected,
      isSelected && voteType === VoteType.THUMBS_DOWN && styles.thumbsDownSelected,
      isSelected && voteType === VoteType.THUMBS_UP && styles.thumbsUpSelected,
      isSelected && voteType === VoteType.DOUBLE_THUMBS_UP && styles.doubleThumbsUpSelected,
    ];
  };

  const getVoteIconColor = (gameId: number, voteType: VoteType) => {
    const selectedVote = pendingVotes[gameId] ?? games.find(g => g.id === gameId)?.userVote;

    if (selectedVote === voteType) {
      switch (voteType) {
        case VoteType.THUMBS_DOWN: return '#ef4444';
        case VoteType.THUMBS_UP: return '#10b981';
        case VoteType.DOUBLE_THUMBS_UP: return '#ec4899';
      }
    }

    return '#666666';
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadPoll} />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{poll?.title}</Text>
        {poll?.description && (
          <Text style={styles.description}>{poll.description}</Text>
        )}
        <Text style={styles.subtitle}>
          {isCreator
            ? 'View results below'
            : 'Vote for as many games as you like with thumbs up, double thumbs up, or thumbs down'
          }
        </Text>
      </View>

      {!currentUser && (
        <View style={styles.nameInput}>
          <Text style={styles.inputLabel}>Your name (required):</Text>
          <TextInput
            style={[styles.input, nameError && styles.inputError]}
            value={voterName}
            onChangeText={(text) => {
              setNameError(false); // reset when user starts typing
              setVoterName(text);
            }}
            placeholder="Enter your name to vote"
            placeholderTextColor="#999"
          />
        </View>
      )}

      <View style={styles.gamesContainer}>
        {games.map((game, index) => (
          <Animated.View
            key={game.id}
            entering={FadeIn.delay(index * 100)}
            style={styles.gameCard}
          >
            <View style={styles.gameContent}>
              <View style={styles.gameInfo}>
                <Text style={styles.gameName}>{game.name}</Text>
                <Text style={styles.gameDetails}>
                  {game.min_players}-{game.max_players} players • {game.playing_time} min
                </Text>
              </View>


              <View style={styles.voteButtons}>
                <TouchableOpacity
                  style={getVoteButtonStyle(game.id, VoteType.THUMBS_DOWN)}
                  onPress={() => handleVote(game.id, VoteType.THUMBS_DOWN)}
                  disabled={submitting}
                >
                  <ThumbsDown
                    size={20}
                    color={getVoteIconColor(game.id, VoteType.THUMBS_DOWN)}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={getVoteButtonStyle(game.id, VoteType.THUMBS_UP)}
                  onPress={() => handleVote(game.id, VoteType.THUMBS_UP)}
                  disabled={submitting}
                >
                  <ThumbsUp
                    size={20}
                    color={getVoteIconColor(game.id, VoteType.THUMBS_UP)}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={getVoteButtonStyle(game.id, VoteType.DOUBLE_THUMBS_UP)}
                  onPress={() => handleVote(game.id, VoteType.DOUBLE_THUMBS_UP)}
                  disabled={submitting}
                >
                  <Heart
                    size={20}
                    color={getVoteIconColor(game.id, VoteType.DOUBLE_THUMBS_UP)}
                    fill={game.userVote === VoteType.DOUBLE_THUMBS_UP ? getVoteIconColor(game.id, VoteType.DOUBLE_THUMBS_UP) : 'transparent'}
                  />
                </TouchableOpacity>

              </View>

            </View>
          </Animated.View>
        ))}
      </View>

      {/* Vote submission button */}
      {Object.keys(pendingVotes).length > 0 && (
        <View style={styles.submitVotesContainer}>
          <TouchableOpacity
            style={styles.submitVotesButton}
            onPress={submitAllVotes}
            disabled={submitting}
          >
            <Text style={styles.viewResultsButtonText}>
              Submit My Votes
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* View results button, only after submitting votes */}
      {hasVoted && (
        <View style={styles.viewResultsContainer}>
          <TouchableOpacity
            style={styles.viewResultsButton}
            onPress={() => {
              if (poll?.id) {
                router.push({
                  pathname: '/poll/[id]/results',
                  params: { id: poll.id },
                });
              }
            }}
          >
            <Text style={styles.viewResultsButtonText}>
              View Results
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    padding: 20,
    backgroundColor: '#1a2b5f',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
  nameInput: {
    padding: 20,
    paddingTop: 0,
    marginTop: -20,
  },
  nameLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
    color: '#1a2b5f',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  gamesContainer: {
    padding: 20,
  },
  gameCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gameContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameInfo: {
    flex: 1,
    marginRight: 16,
  },
  gameName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  gameDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  submitVotesContainer: {
    padding: 20,
    paddingTop: 0,
  },
  submitVotesButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  viewResultsContainer: {
    padding: 20,
  },
  viewResultsButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewResultsButtonText: {
    color: '#ffffff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  voteStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  voteStatItem: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
    marginRight: 16,
  },
  voters: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8d8d8d',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voteButtonSelected: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
  },
  thumbsUpSelected: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  doubleThumbsUpSelected: {
    borderColor: '#ec4899',
    backgroundColor: '#fff7f9',
  },
  thumbsDownSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
});

/* removed from view window, under <View style={styles.gameContent}>, around line 293
                <View style={styles.voteStats}>
                  <Text style={styles.voteStatItem}>
                    Up: {game.votes.thumbs_up}
                  </Text>
                  <Text style={styles.voteStatItem}>
                    Love: {game.votes.double_thumbs_up}
                  </Text>
                  <Text style={styles.voteStatItem}>
                    Down: {game.votes.thumbs_down}
                  </Text>
                </View>

                {game.votes.voters.length > 0 && (
                  <Text style={styles.voters}>
                    Recent voters: {game.votes.voters.slice(-3).map(v => `${v.name} (${v.vote_type.replace(/_/g, ' ')})`).join(', ')}
                  </Text>
                )}
*/
