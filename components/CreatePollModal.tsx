import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Platform, ScrollView, Switch } from 'react-native';
import { X, Plus, Check, Info } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { Game } from '@/types/game';

interface CreatePollModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const [description, setDescription] = useState('');
  const [maxVotes, setMaxVotes] = useState(1);
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadGames();
    }
  }, [isVisible]);

  const loadGames = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      setAvailableGames(data.map(game => ({
        id: game.bgg_game_id,
        name: game.name,
        thumbnail: game.thumbnail,
        minPlayers: game.min_players,
        maxPlayers: game.max_players,
        playingTime: game.playing_time,
        yearPublished: game.year_published,
        description: '',
        image: game.thumbnail,
      })));
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load games');
    }
  };

  const handleCreatePoll = async () => {
    try {
      setLoading(true);
      setError(null);

      if (selectedGames.length === 0) {
        setError('Please select at least one game');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create the poll with a default title based on selected games
      const title = selectedGames.length === 1 
        ? `Vote on ${selectedGames[0].name}`
        : `Vote on ${selectedGames.length} games`;

      // Create the poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          user_id: user.id,
          title,
          description: description.trim() || null,
          max_votes: allowMultipleVotes ? maxVotes : 1,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Add games to the poll
      const pollGames = selectedGames.map(game => ({
        poll_id: poll.id,
        game_id: game.id,
      }));

      const { error: gamesError } = await supabase
        .from('poll_games')
        .insert(pollGames);

      if (gamesError) throw gamesError;

      onSuccess();
      resetForm();
    } catch (err) {
      console.error('Error creating poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setMaxVotes(1);
    setSelectedGames([]);
    setError(null);
    setAllowMultipleVotes(false);
  };

  const toggleGameSelection = (game: Game) => {
    setSelectedGames(current => {
      const isSelected = current.some(g => g.id === game.id);
      if (isSelected) {
        return current.filter(g => g.id !== game.id);
      } else {
        return [...current, game];
      }
    });
  };

  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Poll</Text>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => {
            onClose();
            resetForm();
          }}
        >
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Note (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add a note"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Allow Multiple Votes</Text>
            <Switch
              value={allowMultipleVotes}
              onValueChange={setAllowMultipleVotes}
              trackColor={{ false: '#e1e5ea', true: '#ff9654' }}
            />
          </View>
          
          {allowMultipleVotes && (
            <View style={styles.maxVotesContainer}>
              <Text style={styles.sublabel}>Maximum votes per person:</Text>
              <TextInput
                style={[styles.input, styles.numberInput]}
                value={String(maxVotes)}
                onChangeText={(text) => {
                  const num = parseInt(text);
                  if (!isNaN(num) && num > 0) {
                    setMaxVotes(num);
                  }
                }}
                keyboardType="number-pad"
              />
            </View>
          )}
        </View>

        <View style={styles.gamesSection}>
          <Text style={styles.label}>Select Games</Text>
          <Text style={styles.sublabel}>
            Choose games from your collection to include in the poll
          </Text>

          {availableGames.map(game => (
            <TouchableOpacity
              key={game.id}
              style={[
                styles.gameItem,
                selectedGames.some(g => g.id === game.id) && styles.gameItemSelected
              ]}
              onPress={() => toggleGameSelection(game)}
            >
              <Text style={styles.gameName}>{game.name}</Text>
              {selectedGames.some(g => g.id === game.id) && (
                <Check size={20} color="#ff9654" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={handleCreatePoll}
        disabled={loading}
      >
        <Plus color="#fff" size={20} />
        <Text style={styles.createButtonText}>
          {loading ? 'Creating Poll...' : 'Create Poll'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'web') {
    if (!isVisible) return null;
    return (
      <View style={styles.webOverlay}>
        {content}
      </View>
    );
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {content}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90vh',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
  },
  content: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  sublabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  input: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  maxVotesContainer: {
    marginTop: 12,
  },
  numberInput: {
    width: 80,
  },
  gamesSection: {
    marginTop: 8,
  },
  gameItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  gameItemSelected: {
    backgroundColor: '#fff5ef',
    borderColor: '#ff9654',
  },
  gameName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    padding: 16,
    margin: 20,
    borderRadius: 12,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
});