import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { X, Plus, Check, Users, ChevronDown, ChevronUp, Clock, Brain, Users as Users2, Baby, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { Game } from '@/types/game';
import Toast from 'react-native-toast-message';
import { CreatePollModal } from './CreatePollModal';


interface EditPollModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pollId: string;
  pollTitle: string;
  pollDescription?: string;
}

export const EditPollModal: React.FC<EditPollModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
  pollId,
  pollTitle,
  pollDescription,
}) => {
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [originalPollGames, setOriginalPollGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingVotes, setHasExistingVotes] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<'save' | 'addGames'>('save');
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [dynamicPollTitle, setDynamicPollTitle] = useState(pollTitle);



  useEffect(() => {
    if (isVisible) {
      loadGames();
      checkExistingVotes();
    }
  }, [isVisible, pollId]);

  // Function to generate updated poll title based on game count
  const generateUpdatedTitle = (gameCount: number) => {
    if (gameCount === 0) {
      return 'No games in poll';
    } else if (gameCount === 1) {
      return 'Vote on 1 game';
    } else {
      return `Vote on ${gameCount} games`;
    }
  };

  // Check if the current title is in the default format
  const isDefaultTitle = (title: string) => {
    return title === 'No games in poll' ||
      title === 'Vote on 1 game' ||
      title.match(/^Vote on \d+ games$/);
  };

  // Update title when selected games change, but only if it's a default title
  useEffect(() => {
    if (isDefaultTitle(dynamicPollTitle)) {
      const newTitle = generateUpdatedTitle(selectedGames.length);
      setDynamicPollTitle(newTitle);
    }
  }, [selectedGames.length]);

  const checkExistingVotes = async () => {
    try {
      const { data: votes, error } = await supabase
        .from('votes')
        .select('id')
        .eq('poll_id', pollId);

      if (!error && votes) {
        setHasExistingVotes(votes.length > 0);
        setVoteCount(votes.length);
      }
    } catch (err) {
      console.error('Error checking existing votes:', err);
    }
  };

  const loadGames = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user's collection games
      const { data: collectionData, error: collectionError } = await supabase
        .from('collections_games')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (collectionError) throw collectionError;

      const collectionGames = collectionData.map(game => ({
        id: game.bgg_game_id,
        name: game.name,
        thumbnail: game.thumbnail,
        min_players: game.min_players,
        max_players: game.max_players,
        playing_time: game.playing_time,
        yearPublished: game.year_published,
        description: game.description,
        image: game.image_url,
        minAge: game.min_age,
        is_cooperative: game.is_cooperative,
        is_teambased: game.is_teambased,
        complexity: game.complexity,
        minPlaytime: game.minplaytime,
        maxPlaytime: game.maxplaytime,
        complexity_tier: game.complexity_tier,
        complexity_desc: game.complexity_desc,
        bayesaverage: game.bayesaverage ?? null,
      }));

      setAvailableGames(collectionGames);

      // Load current poll games
      const { data: pollGames, error: pollGamesError } = await supabase
        .from('poll_games')
        .select('game_id')
        .eq('poll_id', pollId);

      if (pollGamesError) throw pollGamesError;

      if (pollGames && pollGames.length > 0) {
        const gameIds = pollGames.map(pg => pg.game_id);
        const currentGames = collectionGames.filter(game => gameIds.includes(game.id));
        setOriginalPollGames(currentGames);
        setSelectedGames(currentGames);
      }
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load games');
    }
  };



  const handleSaveChanges = async () => {
    if (selectedGames.length === 0) {
      setError('Please select at least one game.');
      return;
    }

    // Show warning if there are existing votes
    if (hasExistingVotes) {
      setConfirmationAction('save');
      setShowConfirmation(true);
    } else {
      performSave();
    }
  };

  const performSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate pollId
      if (!pollId) {
        throw new Error('Invalid poll ID');
      }

      // Get current poll games
      const { data: currentPollGames, error: currentError } = await supabase
        .from('poll_games')
        .select('game_id')
        .eq('poll_id', pollId);

      if (currentError) {
        throw currentError;
      }

      const currentGameIds = currentPollGames?.map(pg => pg.game_id) || [];
      const newGameIds = selectedGames.map(game => game.id);

      // Find games to remove and add
      const gamesToRemove = currentGameIds.filter(id => !newGameIds.includes(id));
      const gamesToAdd = newGameIds.filter(id => !currentGameIds.includes(id));

      // Try selective removal first (preserves existing games)
      if (gamesToRemove.length > 0) {
        const { data: deleteResult, error: removeError } = await supabase
          .from('poll_games')
          .delete()
          .eq('poll_id', pollId)
          .in('game_id', gamesToRemove)
          .select();

        if (removeError) {
          throw new Error('Unable to remove games from poll. This might be due to database permissions. Please contact support.');
        }
      }

      // Update the poll title if it has changed
      if (dynamicPollTitle !== pollTitle) {
        const { error: titleError } = await supabase
          .from('polls')
          .update({ title: dynamicPollTitle })
          .eq('id', pollId);

        if (titleError) {
          throw titleError;
        }
      }

      // Add new games (existing games are preserved)
      if (gamesToAdd.length > 0) {
        const newPollGames = gamesToAdd.map(gameId => ({
          poll_id: pollId,
          game_id: gameId,
        }));

        const { error: addError } = await supabase
          .from('poll_games')
          .insert(newPollGames);

        if (addError) {
          throw addError;
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Poll updated successfully!',
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50
      });

      onSuccess(); // This will handle closing the modal and refreshing the polls
    } catch (err) {
      console.error('Error updating poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to update poll');
    } finally {
      setLoading(false);
    }
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



  if (!isVisible) return null;



  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Poll</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* Warning about existing votes */}
        {hasExistingVotes && (
          <View style={styles.warningHeader}>
            <AlertTriangle size={20} color="#f59e0b" />
            <Text style={styles.warningHeaderText}>
              This poll already has votes
            </Text>
          </View>
        )}

        {/* Custom confirmation dialog */}
        {showConfirmation && (
          <View style={styles.confirmationOverlay}>
            <View style={styles.confirmationDialog}>
              <Text style={styles.confirmationTitle}>Warning: Existing Votes</Text>
              <Text style={styles.confirmationMessage}>
                {confirmationAction === 'save'
                  ? 'This poll already has votes. Are you sure you want to continue?'
                  : 'This poll already has votes. Adding more games may affect existing votes. Continue to add games?'
                }
              </Text>
              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={styles.confirmationButtonCancel}
                  onPress={() => {
                    setShowConfirmation(false);
                  }}
                >
                  <Text style={styles.confirmationButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmationButtonContinue}
                  onPress={() => {
                    setShowConfirmation(false);
                    if (confirmationAction === 'save') {
                      performSave();
                    } else {
                      setShowCreatePollModal(true);
                    }
                  }}
                >
                  <Text style={styles.confirmationButtonTextContinue}>
                    {confirmationAction === 'save' ? 'Continue' : 'Add Games'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <ScrollView style={styles.content}>
          <View style={styles.pollInfo}>
            <Text style={styles.pollTitle}>{dynamicPollTitle}</Text>
            {(selectedGames.length !== originalPollGames.length && isDefaultTitle(dynamicPollTitle)) && (
              <Text style={styles.pollTitleNote}>
                Title updated automatically
              </Text>
            )}
            {pollDescription && (
              <Text style={styles.pollDescription}>{pollDescription}</Text>
            )}
          </View>

          {originalPollGames.length > 0 && (
            <View style={styles.currentGamesSection}>
              <Text style={styles.sublabel}>
                Uncheck games to remove them from the poll
              </Text>

              {originalPollGames.map(game => {
                const isSelected = selectedGames.some(g => g.id === game.id);
                return (
                  <TouchableOpacity
                    key={game.id}
                    style={[
                      styles.gameItem,
                      isSelected && styles.gameItemSelected
                    ]}
                    onPress={() => toggleGameSelection(game)}
                  >
                    <View style={styles.gameInfo}>
                      <Text style={styles.gameName}>{game.name}</Text>
                      <Text style={styles.playerCount}>
                        {game.min_players}-{game.max_players} players • {game.playing_time ? `${game.playing_time} min` : game.minPlaytime && game.maxPlaytime ? (game.minPlaytime === game.maxPlaytime ? `${game.minPlaytime} min` : `${game.minPlaytime}-${game.maxPlaytime} min`) : game.minPlaytime || game.maxPlaytime ? `${game.minPlaytime || game.maxPlaytime} min` : 'Unknown time'}
                      </Text>
                    </View>
                    <View style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected
                    ]}>
                      {isSelected && (
                        <Check size={16} color="#ffffff" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={styles.addGamesButton}
            onPress={() => {
              if (hasExistingVotes) {
                setConfirmationAction('addGames');
                setShowConfirmation(true);
              } else {
                setShowCreatePollModal(true);
              }
            }}
          >
            <Plus size={20} color="#1d4ed8" />
            <Text style={styles.addGamesButtonText}>
              {originalPollGames.length === 0 ? 'Add Games to Poll' : 'Add More Games'}
            </Text>
          </TouchableOpacity>


        </ScrollView>

        <View style={styles.footer}>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            style={[styles.saveButton, loading || selectedGames.length === 0 ? styles.saveButtonDisabled : undefined]}
            onPress={handleSaveChanges}
            disabled={loading || selectedGames.length === 0}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CreatePollModal for adding more games */}
      <CreatePollModal
        isVisible={showCreatePollModal}
        onClose={() => setShowCreatePollModal(false)}
        onSuccess={(pollType, addedGames) => {
          setShowCreatePollModal(false);
          if (pollType === 'add-games' && addedGames) {
            // Add the new games to the current selection
            setSelectedGames(current => [...current, ...addedGames]);
            // Also add them to originalPollGames so they show up in the list
            setOriginalPollGames(current => [...current, ...addedGames]);
          } else {
            // Refresh the games list for other cases
            loadGames();
          }
        }}
        preselectedGames={originalPollGames}
        isAddingToExistingPoll={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
  },
  closeButton: {
    padding: 4,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderTopWidth: 1,
    borderTopColor: '#f59e0b',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
    padding: 16,
    margin: 0,
    gap: 12,
  },
  warningHeaderText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#92400e',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  pollInfo: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
    paddingLeft: 0,
    // backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  pollTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
    marginTop: 0,
    marginBottom: 4,
  },
  pollTitleNote: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  pollDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  currentGamesSection: {
    marginBottom: 20,
    marginTop: 0,
  },
  sublabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
    marginBottom: 12,
  },



  addGamesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#1d4ed8',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    gap: 8,
  },
  addGamesButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1d4ed8',
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  gameItemSelected: {
    borderColor: '#1d4ed8',
    backgroundColor: '#eff6ff',
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
    marginBottom: 2,
  },
  playerCount: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  confirmationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  confirmationDialog: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmationTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
    marginBottom: 12,
  },
  confirmationMessage: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  confirmationButtonCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  confirmationButtonTextCancel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#6b7280',
  },
  confirmationButtonContinue: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#1d4ed8',
  },
  confirmationButtonTextContinue: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
});
