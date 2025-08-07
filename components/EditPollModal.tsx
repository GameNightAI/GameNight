import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { X, Plus, Check, Users, ChevronDown, ChevronUp, Clock, Brain, Users as Users2, Baby, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { Game } from '@/types/game';
import Toast from 'react-native-toast-message';
import Select from 'react-select';

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
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingVotes, setHasExistingVotes] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Filter states - changed to arrays for multi-select
  const [playerCount, setPlayerCount] = useState<any[]>([]);
  const [playTime, setPlayTime] = useState<any[]>([]);
  const [minAge, setMinAge] = useState<any[]>([]);
  const [gameType, setGameType] = useState<any[]>([]);
  const [complexity, setComplexity] = useState<any[]>([]);

  // Filter options
  const playerOptions = Array.from({ length: 14 }, (_, i) => String(i + 1)).concat(['15+'])
    .map(_ => ({ value: parseInt(_), label: _ }));
  const timeOptions = [
    { value: 1, min: 1, max: 30, label: '30 min or less' },
    { value: 31, min: 31, max: 60, label: '31-60 min' },
    { value: 61, min: 61, max: 90, label: '61-90 min' },
    { value: 91, min: 91, max: 120, label: '91-120 min' },
    { value: 121, min: 121, max: 999999999, label: 'More than 120 min' },
  ];
  const ageOptions = [
    { value: 1, min: 1, max: 5, label: '5 and under' },
    { value: 6, min: 6, max: 7, label: '6-7' },
    { value: 8, min: 8, max: 9, label: '8-9' },
    { value: 10, min: 10, max: 11, label: '10-11' },
    { value: 12, min: 12, max: 13, label: '12-13' },
    { value: 14, min: 14, max: 15, label: '14-15' },
    { value: 16, min: 16, max: 999, label: '16 and up' },
  ];
  const typeOptions = ['Competitive', 'Cooperative', 'Team-based']
    .map(_ => ({ value: _, label: _ }));
  const complexityOptions = ['Light', 'Medium Light', 'Medium', 'Medium Heavy', 'Heavy']
    .map((_, i) => ({ value: i + 1, label: _ }));

  useEffect(() => {
    if (isVisible) {
      loadGames();
      checkExistingVotes();
    }
  }, [isVisible, pollId]);

  useEffect(() => {
    filterGames();
  }, [availableGames, playerCount, playTime, minAge, gameType, complexity]);

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
      setFilteredGames(collectionGames);

      // Load current poll games
      const { data: pollGames, error: pollGamesError } = await supabase
        .from('poll_games')
        .select('game_id')
        .eq('poll_id', pollId);

      if (pollGamesError) throw pollGamesError;

      if (pollGames && pollGames.length > 0) {
        const gameIds = pollGames.map(pg => pg.game_id);
        const currentGames = collectionGames.filter(game => gameIds.includes(game.id));
        setSelectedGames(currentGames);
      }
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load games');
    }
  };

  const filterGames = () => {
    let filtered = [...availableGames];

    if (playerCount.length) {
      filtered = filtered.filter(game =>
        playerCount.some(p => (
          (game.min_players <= p.value || p.value === 15)
          && p.value <= game.max_players
        ))
      );
    }

    if (playTime.length) {
      filtered = filtered.filter(game =>
        playTime.some(t => {
          const time = game.playing_time || game.maxPlaytime || game.minPlaytime;
          return (
            t.min <= game.playing_time
            && game.playing_time <= t.max
          );
        })
      );
    }

    if (minAge.length) {
      filtered = filtered.filter(game =>
        minAge.some(a => (
          a.min <= game.minAge
          && game.minAge <= a.max
        ))
      );
    }

    if (gameType.length) {
      filtered = filtered.filter(game =>
        gameType.some(t => {
          switch (t.value) {
            case 'Competitive':
              return !game.is_cooperative;
            case 'Cooperative':
              return game.is_cooperative;
            case 'Team-based':
              return game.is_teambased;
            default:
              return true;
          }
        })
      );
    }

    if (complexity.length) {
      filtered = filtered.filter(game =>
        complexity.some(c => (
          game.complexity_tier === c.value
        ))
      );
    }

    setFilteredGames(filtered);
  };

  const handleSaveChanges = async () => {
    if (selectedGames.length === 0) {
      setError('Please select at least one game.');
      return;
    }

    // Show warning if there are existing votes
    if (hasExistingVotes) {
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

  const handlePlayerCountChange = (newValue: any) => {
    setPlayerCount(newValue || []);
  };

  const handlePlayTimeChange = (newValue: any) => {
    setPlayTime(newValue || []);
  };

  const handleMinAgeChange = (newValue: any) => {
    setMinAge(newValue || []);
  };

  const handleGameTypeChange = (newValue: any) => {
    setGameType(newValue || []);
  };

  const handleComplexityChange = (newValue: any) => {
    setComplexity(newValue || []);
  };

  if (!isVisible) return null;

  const selectStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      borderRadius: 8,
      minHeight: 40,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#1d4ed8' : state.isFocused ? '#f3f4f6' : '#ffffff',
      color: state.isSelected ? '#ffffff' : '#1f2937',
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: '#e0e7ff',
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: '#1d4ed8',
    }),
  };

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
          <View style={styles.warningContainer}>
            <AlertTriangle size={20} color="#f59e0b" />
            <Text style={styles.warningText}>
              This poll has {voteCount} vote(s). Votes for games that remain in the poll will be preserved. Only votes for removed games will be deleted.
            </Text>
          </View>
        )}

        {/* Custom confirmation dialog */}
        {showConfirmation && (
          <View style={styles.confirmationOverlay}>
            <View style={styles.confirmationDialog}>
              <Text style={styles.confirmationTitle}>Warning: Existing Votes</Text>
              <Text style={styles.confirmationMessage}>
                This poll already has {voteCount} vote(s). Votes for games that remain in the poll will be preserved. Only votes for removed games will be deleted. Are you sure you want to continue?
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
                    performSave();
                  }}
                >
                  <Text style={styles.confirmationButtonTextContinue}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <ScrollView style={styles.content}>
          <View style={styles.pollInfo}>
            <Text style={styles.pollTitle}>{pollTitle}</Text>
            {pollDescription && (
              <Text style={styles.pollDescription}>{pollDescription}</Text>
            )}
          </View>

          <View style={styles.filtersSection}>
            <Text style={styles.sectionTitle}>Filter Games</Text>
            <View style={styles.filtersGrid}>
              <Select
                placeholder="Player count"
                value={playerCount}
                onChange={handlePlayerCountChange}
                defaultValue={[]}
                options={playerOptions}
                isMulti
                isClearable
                isSearchable={false}
                closeMenuOnSelect={false}
                blurInputOnSelect={false}
                styles={selectStyles}
              />

              <Select
                placeholder="Play time"
                value={playTime}
                onChange={handlePlayTimeChange}
                defaultValue={[]}
                options={timeOptions}
                isMulti
                isClearable
                isSearchable={false}
                closeMenuOnSelect={false}
                blurInputOnSelect={false}
                styles={selectStyles}
              />

              <Select
                placeholder="Minimum age"
                value={minAge}
                onChange={handleMinAgeChange}
                defaultValue={[]}
                options={ageOptions}
                isMulti
                isClearable
                isSearchable={false}
                closeMenuOnSelect={false}
                blurInputOnSelect={false}
                styles={selectStyles}
              />

              <Select
                placeholder="Co-op / competitive"
                value={gameType}
                onChange={handleGameTypeChange}
                defaultValue={[]}
                options={typeOptions}
                isMulti
                isClearable
                isSearchable={false}
                closeMenuOnSelect={false}
                blurInputOnSelect={false}
                styles={selectStyles}
              />

              <Select
                placeholder="Game complexity"
                value={complexity}
                onChange={handleComplexityChange}
                defaultValue={[]}
                options={complexityOptions}
                isMulti
                isClearable
                isSearchable={false}
                closeMenuOnSelect={false}
                blurInputOnSelect={false}
                styles={selectStyles}
              />
            </View>
          </View>

          <View style={styles.gamesSection}>
            <View style={styles.gamesHeader}>
              <View style={styles.gamesHeaderLeft}>
                <Text style={styles.label}>Select Games ({selectedGames.length} selected)</Text>
                <Text style={styles.sublabel}>
                  {(playerCount.length || playTime.length || minAge.length || gameType.length || complexity.length)
                    ? `Games that match your filters`
                    : 'Choose games from your collection to include in the poll'}
                </Text>
              </View>
              <View style={styles.gamesHeaderRight}>
                <TouchableOpacity
                  style={styles.selectAllButton}
                  onPress={() => setSelectedGames([...filteredGames])}
                >
                  <Text style={styles.selectAllButtonText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.clearAllButton}
                  onPress={() => setSelectedGames([])}
                >
                  <Text style={styles.clearAllButtonText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </View>

            {filteredGames.length === 0 ? (
              <Text style={styles.noGamesText}>
                No games found matching your filters
              </Text>
            ) : (
              filteredGames.map(game => {
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
                        {game.min_players}-{game.max_players} players • {game.playing_time} min
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
              })
            )}
          </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 20,
    marginTop: 0,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#92400e',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  pollInfo: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  pollTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
    marginBottom: 4,
  },
  pollDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  filtersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
    marginBottom: 12,
  },
  filtersGrid: {
    gap: 12,
  },
  gamesSection: {
    marginBottom: 20,
  },
  gamesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  gamesHeaderLeft: {
    flex: 1,
  },
  gamesHeaderRight: {
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
    marginBottom: 4,
  },
  sublabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  selectAllButton: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectAllButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  clearAllButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearAllButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#6b7280',
  },
  noGamesText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    textAlign: 'center',
    padding: 20,
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
