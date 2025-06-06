import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { supabase } from '@/services/supabase';
import { Poll, Vote } from '@/types/poll';
import { Game } from '@/types/game';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';

interface PollGame extends Game {
  votes: number;
  voters: string[];
}

export default function PollScreen() {
  const { id } = useLocalSearchParams();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [games, setGames] = useState<PollGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<number[]>([]);
  const [voterName, setVoterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    loadPoll();
  }, [id]);

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
      setIsCreator(user?.id === pollData.user_id);

      // Get the games in this poll
      const { data: pollGames, error: gamesError } = await supabase
        .from('poll_games')
        .select('game_id')
        .eq('poll_id', id);

      if (gamesError) throw gamesError;

      // Get the actual game details
      const gameIds = pollGames.map(pg => pg.game_id);
      const { data: games, error: gameDetailsError } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', pollData.user_id)
        .in('bgg_game_id', gameIds);

      if (gameDetailsError) throw gameDetailsError;

      // Get votes for this poll
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('poll_id', id);

      if (votesError) throw votesError;

      // Combine game data with vote counts
      const gamesWithVotes = games.map(game => {
        const gameVotes = votes.filter(v => v.game_id === game.bgg_game_id);
        return {
          id: game.bgg_game_id,
          name: game.name,
          thumbnail: game.thumbnail,
          minPlayers: game.min_players,
          maxPlayers: game.max_players,
          playingTime: game.playing_time,
          yearPublished: game.year_published,
          description: '',
          image: game.thumbnail,
          votes: gameVotes.length,
          voters: gameVotes.map(v => v.voter_name).filter(Boolean),
        };
      });

      setGames(gamesWithVotes);
    } catch (err) {
      console.error('Error loading poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    try {
      setSubmitting(true);
      setError(null);

      if (selectedGames.length === 0) {
        setError('Please select at least one game');
        return;
      }

      if (selectedGames.length > (poll?.max_votes || 1)) {
        setError(`You can only vote for up to ${poll?.max_votes} games`);
        return;
      }

      const votes = selectedGames.map(gameId => ({
        poll_id: id,
        game_id: gameId,
        voter_name: voterName.trim() || null,
      }));

      const { error: votesError } = await supabase
        .from('votes')
        .insert(votes);

      if (votesError) throw votesError;

      await loadPoll();
      setSelectedGames([]);
      setVoterName('');
    } catch (err) {
      console.error('Error submitting votes:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit votes');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGameSelection = (gameId: number) => {
    setSelectedGames(current => {
      const isSelected = current.includes(gameId);
      if (isSelected) {
        return current.filter(id => id !== gameId);
      } else {
        if (current.length >= (poll?.max_votes || 1)) {
          return current;
        }
        return [...current, gameId];
      }
    });
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
          {isCreator ? 'View results below' : `Vote for up to ${poll?.max_votes} ${poll?.max_votes === 1 ? 'game' : 'games'}`}
        </Text>
      </View>

      {!isCreator && (
        <View style={styles.nameInput}>
          <TextInput
            style={styles.input}
            value={voterName}
            onChangeText={setVoterName}
            placeholder="Enter your name (optional)"
          />
        </View>
      )}

      <View style={styles.gamesContainer}>
        {games.map((game, index) => (
          <Animated.View
            key={game.id}
            entering={FadeIn.delay(index * 100)}
            style={[
              styles.gameCard,
              selectedGames.includes(game.id) && styles.gameCardSelected
            ]}
          >
            <TouchableOpacity
              style={styles.gameContent}
              onPress={() => !isCreator && toggleGameSelection(game.id)}
              disabled={isCreator}
            >
              <View style={styles.gameInfo}>
                <Text style={styles.gameName}>{game.name}</Text>
                <Text style={styles.gameDetails}>
                  {game.minPlayers}-{game.maxPlayers} players • {game.playingTime} min
                </Text>
                {isCreator && (
                  <>
                    <Text style={styles.voteCount}>
                      {game.votes} {game.votes === 1 ? 'vote' : 'votes'}
                    </Text>
                    {game.voters.length > 0 && (
                      <Text style={styles.voters}>
                        Voters: {game.voters.join(', ')}
                      </Text>
                    )}
                  </>
                )}
              </View>
              {!isCreator && selectedGames.includes(game.id) && (
                <Check size={24} color="#ff9654" />
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {!isCreator && (
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleVote}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Vote'}
          </Text>
        </TouchableOpacity>
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
  gameCardSelected: {
    backgroundColor: '#fff5ef',
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  gameContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameInfo: {
    flex: 1,
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
    marginBottom: 4,
  },
  voteCount: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
    marginTop: 8,
  },
  voters: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8d8d8d',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#ff9654',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
});