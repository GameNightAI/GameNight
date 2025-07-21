import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, Modal, Platform, ScrollView, Dimensions, TextInput, TouchableWithoutFeedback, Keyboard, Pressable, KeyboardAvoidingView } from 'react-native';
import { X, Plus, Check, Users, ChevronDown, ChevronUp, Clock, Brain, Users as Users2, Baby } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { Game } from '@/types/game';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';


interface CreatePollModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: (pollType: 'single-user' | 'multi-user-device') => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollTitle, setPollTitle] = useState('');
  const [defaultTitle, setDefaultTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');

  // Filter states
  const [playerCount, setPlayerCount] = useState<string>('');
  const [playTime, setPlayTime] = useState<string>('');
  const [minAge, setMinAge] = useState<string>('');
  const [gameType, setGameType] = useState<string>('');
  const [complexity, setComplexity] = useState<string>('');

  // Dropdown visibility states
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showAgeDropdown, setShowAgeDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showComplexityDropdown, setShowComplexityDropdown] = useState(false);

  const playerOptions = Array.from({ length: 14 }, (_, i) => String(i + 1)).concat(['15+']);
  const timeOptions = ['30', '60', '90', '120+'];
  const ageOptions = ['6+', '8+', '10+', '12+', '14+', '16+'];
  const typeOptions = ['Any', 'Cooperative', 'Competitive', 'Team-based'];
  const complexityOptions = ['Light', 'Medium Light', 'Medium', 'Medium Heavy', 'Heavy'];

  useEffect(() => {
    if (isVisible) {
      loadGames();
    }
  }, [isVisible]);

  useEffect(() => {
    filterGames();
  }, [availableGames, playerCount, playTime, minAge, gameType, complexity]);

  // Update default title when selected games change
  useEffect(() => {
    let newDefaultTitle = '';
    if (selectedGames.length === 1) {
      newDefaultTitle = 'Vote on 1 game';
    } else if (selectedGames.length > 1) {
      newDefaultTitle = `Vote on ${selectedGames.length} games`;
    }
    setDefaultTitle(newDefaultTitle);
    if ((!pollTitle || pollTitle.startsWith('Vote on')) && newDefaultTitle) {
      setPollTitle(newDefaultTitle);
    }
  }, [selectedGames]);

  const loadGames = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('collections_games')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      const games = data.map(game => ({
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

      setAvailableGames(games);
      setFilteredGames(games);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load games');
    }
  };

  const filterGames = () => {
    let filtered = [...availableGames];

    if (playerCount) {
      const count = parseInt(playerCount === '15+' ? '15' : playerCount);
      filtered = filtered.filter(game =>
        game.min_players <= count && game.max_players >= count
      );
    }

    if (playTime) {
      const maxTime = parseInt(playTime === '120+' ? '120' : playTime);
      filtered = filtered.filter(game =>
        game.playing_time <= maxTime || (playTime === '120+' && game.playing_time >= 120)
      );
    }

    if (minAge) {
      const age = parseInt(minAge.replace('+', ''));
      filtered = filtered.filter(game =>
        !game.minAge || game.minAge <= age
      );
    }

    if (gameType && gameType !== 'Any') {
      filtered = filtered.filter(game => {
        switch (gameType) {
          case 'Cooperative': return game.is_cooperative;
          case 'Competitive': return !game.is_cooperative;
          case 'Team-based': return game.is_teambased;
          default: return true;
        }
      });
    }

    if (complexity) {
      filtered = filtered.filter(game => {
        if (!game.complexity_tier) return false;
        switch (complexity) {
          case 'Light': return game.complexity_tier <= 1;
          case 'Medium Light': return game.complexity_tier <= 2;
          case 'Medium': return game.complexity_tier <= 3;
          case 'Medium Heavy': return game.complexity_tier <= 4;
          case 'Heavy': return game.complexity_tier <= 5;
          default: return true;
        }
      });
    }

    setFilteredGames(filtered);
    setSelectedGames(prev =>
      prev.filter(game =>
        filtered.some(g => g.id === game.id)
      )
    );
  };

  const handleCreatePoll = async () => {
    try {
      setLoading(true);
      setError(null);

      if (selectedGames.length === 0) {
        setError('Please select at least one game to create a poll.');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use the current poll title (which will be the default if user didn't change it)
      const title = pollTitle.trim();

      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          user_id: user.id,
          title,
          description: pollDescription.trim() || null,
          max_votes: 1,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      const pollGames = selectedGames.map(game => ({
        poll_id: poll.id,
        game_id: game.id,
      }));

      const { error: gamesError } = await supabase
        .from('poll_games')
        .insert(pollGames);

      if (gamesError) throw gamesError;

      // Copy poll link to clipboard
      const pollUrl = `${Platform.select({ web: window.location.origin, default: '' })}/poll/${poll.id}/`;
      await Clipboard.setStringAsync(pollUrl);
      Toast.show({ type: 'success', text1: 'Poll link copied to clipboard!' });

      // Pass pollType to onSuccess for downstream handling
      onSuccess('single-user'); // Assuming single-user for now
      resetForm();
    } catch (err) {
      console.error('Error creating poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedGames([]);
    setError(null);
    setPollTitle('');
    setPollDescription('');
    setPlayerCount('');
    setPlayTime('');
    setMinAge('');
    setGameType('');
    setComplexity('');
    setShowPlayerDropdown(false);
    setShowTimeDropdown(false);
    setShowAgeDropdown(false);
    setShowTypeDropdown(false);
    setShowComplexityDropdown(false);
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

  const closeAllDropdowns = () => {
    setShowPlayerDropdown(false);
    setShowTimeDropdown(false);
    setShowAgeDropdown(false);
    setShowTypeDropdown(false);
    setShowComplexityDropdown(false);
  };

  const toggleDropdown = (dropdown: string) => {
    closeAllDropdowns();
    switch (dropdown) {
      case 'player':
        setShowPlayerDropdown(true);
        break;
      case 'time':
        setShowTimeDropdown(true);
        break;
      case 'age':
        setShowAgeDropdown(true);
        break;
      case 'type':
        setShowTypeDropdown(true);
        break;
      case 'complexity':
        setShowComplexityDropdown(true);
        break;
    }
  };

  const clearFilter = (filterType: string) => {
    switch (filterType) {
      case 'player':
        setPlayerCount('');
        setShowPlayerDropdown(false);
        break;
      case 'time':
        setPlayTime('');
        setShowTimeDropdown(false);
        break;
      case 'age':
        setMinAge('');
        setShowAgeDropdown(false);
        break;
      case 'type':
        setGameType('');
        setShowTypeDropdown(false);
        break;
      case 'complexity':
        setComplexity('');
        setShowComplexityDropdown(false);
        break;
    }
  };

  let content;
  if (Platform.OS === 'web') {
    content = (
      <div style={{
        maxWidth: '95vw',
        maxHeight: '80vh',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <View style={[styles.dialog, { height: '100%', display: 'flex', flexDirection: 'column', flex: 1, maxWidth: undefined, maxHeight: undefined }]}>
          <TouchableOpacity
            style={styles.absoluteCloseButton}
            onPress={() => {
              onClose();
              resetForm();
            }}
            accessibilityLabel="Close"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#666666" />
          </TouchableOpacity>
          <View style={styles.header}>
            <Text style={styles.title}>Create Poll</Text>
          </View>
          <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={styles.scrollContent}>
            <View style={styles.titleSection}>
              <Text style={styles.label}>Poll Title (Optional)</Text>
              <Text style={styles.sublabel}>
                Customize your poll title or keep the auto-generated name
              </Text>
              <TextInput
                style={styles.titleInput}
                value={pollTitle}
                onChangeText={setPollTitle}
                placeholder="Enter a custom title or keep the default"
                placeholderTextColor="#999999"
                maxLength={100}
              />
            </View>

            <View style={styles.descriptionSection}>
              <Text style={styles.label}>Description (Optional)</Text>
              <Text style={styles.sublabel}>
                Add context, instructions, or any additional information for voters
              </Text>
              <TextInput
                style={styles.descriptionInput}
                value={pollDescription}
                onChangeText={setPollDescription}
                placeholder="e.g., Vote for your top 3 games, or Let's decide what to play this weekend"
                placeholderTextColor="#999999"
                maxLength={500}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.label}>Filter Games</Text>

              {/* Player Count Filter */}
              <View style={styles.filterItem}>
                <TouchableOpacity
                  style={[styles.filterButton, playerCount ? styles.filterButtonActive : undefined]}
                  onPress={() => {
                    if (showPlayerDropdown && playerCount) {
                      clearFilter('player');
                    } else {
                      toggleDropdown('player');
                    }
                  }}
                >
                  <View style={styles.filterButtonContent}>
                    <Users size={20} color={playerCount ? "#ff9654" : "#666666"} />
                    <Text style={[styles.filterButtonText, playerCount ? styles.filterButtonTextActive : undefined]}>
                      {playerCount ? `${playerCount} players` : 'Player count'}
                    </Text>
                  </View>
                  <View style={styles.filterButtonRight}>
                    {playerCount && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          clearFilter('player');
                        }}
                        style={styles.clearButton}
                      >
                        <X size={16} color="#ff9654" />
                      </TouchableOpacity>
                    )}
                    {showPlayerDropdown ? (
                      <ChevronUp size={20} color="#666666" />
                    ) : (
                      <ChevronDown size={20} color="#666666" />
                    )}
                  </View>
                </TouchableOpacity>

                {showPlayerDropdown && (
                  <View style={styles.dropdown}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {playerOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.dropdownItem,
                            playerCount === option && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setPlayerCount(option);
                            setShowPlayerDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            playerCount === option && styles.dropdownItemTextSelected
                          ]}>
                            {option} {option === '1' ? 'player' : 'players'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Play Time Filter */}
              <View style={styles.filterItem}>
                <TouchableOpacity
                  style={[styles.filterButton, playTime ? styles.filterButtonActive : undefined]}
                  onPress={() => {
                    if (showTimeDropdown && playTime) {
                      clearFilter('time');
                    } else {
                      toggleDropdown('time');
                    }
                  }}
                >
                  <View style={styles.filterButtonContent}>
                    <Clock size={20} color={playTime ? "#ff9654" : "#666666"} />
                    <Text style={[styles.filterButtonText, playTime ? styles.filterButtonTextActive : undefined]}>
                      {playTime ? `${playTime} minutes${playTime === '120+' ? ' or more' : ''}` : 'Play time'}
                    </Text>
                  </View>
                  <View style={styles.filterButtonRight}>
                    {playTime && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          clearFilter('time');
                        }}
                        style={styles.clearButton}
                      >
                        <X size={16} color="#ff9654" />
                      </TouchableOpacity>
                    )}
                    {showTimeDropdown ? (
                      <ChevronUp size={20} color="#666666" />
                    ) : (
                      <ChevronDown size={20} color="#666666" />
                    )}
                  </View>
                </TouchableOpacity>

                {showTimeDropdown && (
                  <View style={styles.dropdown}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {timeOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.dropdownItem,
                            playTime === option && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setPlayTime(option);
                            setShowTimeDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            playTime === option && styles.dropdownItemTextSelected
                          ]}>
                            {option} minutes{option === '120+' ? ' or more' : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Minimum Age Filter */}
              <View style={styles.filterItem}>
                <TouchableOpacity
                  style={[styles.filterButton, minAge ? styles.filterButtonActive : undefined]}
                  onPress={() => {
                    if (showAgeDropdown && minAge) {
                      clearFilter('age');
                    } else {
                      toggleDropdown('age');
                    }
                  }}
                >
                  <View style={styles.filterButtonContent}>
                    <Baby size={20} color={minAge ? "#ff9654" : "#666666"} />
                    <Text style={[styles.filterButtonText, minAge ? styles.filterButtonTextActive : undefined]}>
                      {minAge ? `${minAge} years` : 'Youngest player age'}
                    </Text>
                  </View>
                  <View style={styles.filterButtonRight}>
                    {minAge && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          clearFilter('age');
                        }}
                        style={styles.clearButton}
                      >
                        <X size={16} color="#ff9654" />
                      </TouchableOpacity>
                    )}
                    {showAgeDropdown ? (
                      <ChevronUp size={20} color="#666666" />
                    ) : (
                      <ChevronDown size={20} color="#666666" />
                    )}
                  </View>
                </TouchableOpacity>

                {showAgeDropdown && (
                  <View style={styles.dropdown}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {ageOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.dropdownItem,
                            minAge === option && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setMinAge(option);
                            setShowAgeDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            minAge === option && styles.dropdownItemTextSelected
                          ]}>
                            {option} years
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Game Type Filter */}
              <View style={styles.filterItem}>
                <TouchableOpacity
                  style={[styles.filterButton, gameType ? styles.filterButtonActive : undefined]}
                  onPress={() => {
                    if (showTypeDropdown && gameType) {
                      clearFilter('type');
                    } else {
                      toggleDropdown('type');
                    }
                  }}
                >
                  <View style={styles.filterButtonContent}>
                    <Users2 size={20} color={gameType ? "#ff9654" : "#666666"} />
                    <Text style={[styles.filterButtonText, gameType ? styles.filterButtonTextActive : undefined]}>
                      {gameType || 'Co-op/Competitive'}
                    </Text>
                  </View>
                  <View style={styles.filterButtonRight}>
                    {gameType && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          clearFilter('type');
                        }}
                        style={styles.clearButton}
                      >
                        <X size={16} color="#ff9654" />
                      </TouchableOpacity>
                    )}
                    {showTypeDropdown ? (
                      <ChevronUp size={20} color="#666666" />
                    ) : (
                      <ChevronDown size={20} color="#666666" />
                    )}
                  </View>
                </TouchableOpacity>

                {showTypeDropdown && (
                  <View style={styles.dropdown}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {typeOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.dropdownItem,
                            gameType === option && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setGameType(option);
                            setShowTypeDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            gameType === option && styles.dropdownItemTextSelected
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Complexity Filter */}
              <View style={styles.filterItem}>
                <TouchableOpacity
                  style={[styles.filterButton, complexity ? styles.filterButtonActive : undefined]}
                  onPress={() => {
                    if (showComplexityDropdown && complexity) {
                      clearFilter('complexity');
                    } else {
                      toggleDropdown('complexity');
                    }
                  }}
                >
                  <View style={styles.filterButtonContent}>
                    <Brain size={20} color={complexity ? "#ff9654" : "#666666"} />
                    <Text style={[styles.filterButtonText, complexity ? styles.filterButtonTextActive : undefined]}>
                      {complexity || 'Game complexity'}
                    </Text>
                  </View>
                  <View style={styles.filterButtonRight}>
                    {complexity && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          clearFilter('complexity');
                        }}
                        style={styles.clearButton}
                      >
                        <X size={16} color="#ff9654" />
                      </TouchableOpacity>
                    )}
                    {showComplexityDropdown ? (
                      <ChevronUp size={20} color="#666666" />
                    ) : (
                      <ChevronDown size={20} color="#666666" />
                    )}
                  </View>
                </TouchableOpacity>

                {showComplexityDropdown && (
                  <View style={styles.dropdown}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {complexityOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.dropdownItem,
                            complexity === option && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setComplexity(option);
                            setShowComplexityDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            complexity === option && styles.dropdownItemTextSelected
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.gamesSection}>
              <View style={styles.gamesHeader}>
                <View style={styles.gamesHeaderLeft}>
                  <Text style={styles.label}>Select Games</Text>
                  <Text style={styles.sublabel}>
                    {(playerCount || playTime || minAge || gameType || complexity)
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
              style={[styles.createButton, loading || selectedGames.length === 0 ? styles.createButtonDisabled : undefined]}
              onPress={handleCreatePoll}
              disabled={loading || selectedGames.length === 0}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.createButtonText}>{loading ? 'Creating...' : 'Create Poll'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </div>
    );
  } else {
    content = (
      <View style={[styles.dialog, { flex: 1, display: 'flex', flexDirection: 'column' }]}>
        <TouchableOpacity
          style={styles.absoluteCloseButton}
          onPress={() => {
            onClose();
            resetForm();
          }}
          accessibilityLabel="Close"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color="#666666" />
        </TouchableOpacity>
        <View style={styles.header}>
          <Text style={styles.title}>Create Poll</Text>
        </View>
        <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={styles.scrollContent}>
          <View style={styles.titleSection}>
            <Text style={styles.label}>Poll Title (Optional)</Text>
            <Text style={styles.sublabel}>
              Customize your poll title or keep the auto-generated name
            </Text>
            <TextInput
              style={styles.titleInput}
              value={pollTitle}
              onChangeText={setPollTitle}
              placeholder="Enter a custom title or keep the default"
              placeholderTextColor="#999999"
              maxLength={100}
            />
          </View>

          <View style={styles.descriptionSection}>
            <Text style={styles.label}>Description (Optional)</Text>
            <Text style={styles.sublabel}>
              Add context, instructions, or any additional information for voters
            </Text>
            <TextInput
              style={styles.descriptionInput}
              value={pollDescription}
              onChangeText={setPollDescription}
              placeholder="e.g., Vote for your top 3 games, or Let's decide what to play this weekend"
              placeholderTextColor="#999999"
              maxLength={500}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.label}>Filter Games</Text>

            {/* Player Count Filter */}
            <View style={styles.filterItem}>
              <TouchableOpacity
                style={[styles.filterButton, playerCount ? styles.filterButtonActive : undefined]}
                onPress={() => {
                  if (showPlayerDropdown && playerCount) {
                    clearFilter('player');
                  } else {
                    toggleDropdown('player');
                  }
                }}
              >
                <View style={styles.filterButtonContent}>
                  <Users size={20} color={playerCount ? "#ff9654" : "#666666"} />
                  <Text style={[styles.filterButtonText, playerCount ? styles.filterButtonTextActive : undefined]}>
                    {playerCount ? `${playerCount} players` : 'Player count'}
                  </Text>
                </View>
                <View style={styles.filterButtonRight}>
                  {playerCount && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        clearFilter('player');
                      }}
                      style={styles.clearButton}
                    >
                      <X size={16} color="#ff9654" />
                    </TouchableOpacity>
                  )}
                  {showPlayerDropdown ? (
                    <ChevronUp size={20} color="#666666" />
                  ) : (
                    <ChevronDown size={20} color="#666666" />
                  )}
                </View>
              </TouchableOpacity>

              {showPlayerDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {playerOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownItem,
                          playerCount === option && styles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setPlayerCount(option);
                          setShowPlayerDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          playerCount === option && styles.dropdownItemTextSelected
                        ]}>
                          {option} {option === '1' ? 'player' : 'players'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Play Time Filter */}
            <View style={styles.filterItem}>
              <TouchableOpacity
                style={[styles.filterButton, playTime ? styles.filterButtonActive : undefined]}
                onPress={() => {
                  if (showTimeDropdown && playTime) {
                    clearFilter('time');
                  } else {
                    toggleDropdown('time');
                  }
                }}
              >
                <View style={styles.filterButtonContent}>
                  <Clock size={20} color={playTime ? "#ff9654" : "#666666"} />
                  <Text style={[styles.filterButtonText, playTime ? styles.filterButtonTextActive : undefined]}>
                    {playTime ? `${playTime} minutes${playTime === '120+' ? ' or more' : ''}` : 'Play time'}
                  </Text>
                </View>
                <View style={styles.filterButtonRight}>
                  {playTime && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        clearFilter('time');
                      }}
                      style={styles.clearButton}
                    >
                      <X size={16} color="#ff9654" />
                    </TouchableOpacity>
                  )}
                  {showTimeDropdown ? (
                    <ChevronUp size={20} color="#666666" />
                  ) : (
                    <ChevronDown size={20} color="#666666" />
                  )}
                </View>
              </TouchableOpacity>

              {showTimeDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {timeOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownItem,
                          playTime === option && styles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setPlayTime(option);
                          setShowTimeDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          playTime === option && styles.dropdownItemTextSelected
                        ]}>
                          {option} minutes{option === '120+' ? ' or more' : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Minimum Age Filter */}
            <View style={styles.filterItem}>
              <TouchableOpacity
                style={[styles.filterButton, minAge ? styles.filterButtonActive : undefined]}
                onPress={() => {
                  if (showAgeDropdown && minAge) {
                    clearFilter('age');
                  } else {
                    toggleDropdown('age');
                  }
                }}
              >
                <View style={styles.filterButtonContent}>
                  <Baby size={20} color={minAge ? "#ff9654" : "#666666"} />
                  <Text style={[styles.filterButtonText, minAge ? styles.filterButtonTextActive : undefined]}>
                    {minAge ? `${minAge} years` : 'Youngest player age'}
                  </Text>
                </View>
                <View style={styles.filterButtonRight}>
                  {minAge && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        clearFilter('age');
                      }}
                      style={styles.clearButton}
                    >
                      <X size={16} color="#ff9654" />
                    </TouchableOpacity>
                  )}
                  {showAgeDropdown ? (
                    <ChevronUp size={20} color="#666666" />
                  ) : (
                    <ChevronDown size={20} color="#666666" />
                  )}
                </View>
              </TouchableOpacity>

              {showAgeDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {ageOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownItem,
                          minAge === option && styles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setMinAge(option);
                          setShowAgeDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          minAge === option && styles.dropdownItemTextSelected
                        ]}>
                          {option} years
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Game Type Filter */}
            <View style={styles.filterItem}>
              <TouchableOpacity
                style={[styles.filterButton, gameType ? styles.filterButtonActive : undefined]}
                onPress={() => {
                  if (showTypeDropdown && gameType) {
                    clearFilter('type');
                  } else {
                    toggleDropdown('type');
                  }
                }}
              >
                <View style={styles.filterButtonContent}>
                  <Users2 size={20} color={gameType ? "#ff9654" : "#666666"} />
                  <Text style={[styles.filterButtonText, gameType ? styles.filterButtonTextActive : undefined]}>
                    {gameType || 'Co-op/Competitive'}
                  </Text>
                </View>
                <View style={styles.filterButtonRight}>
                  {gameType && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        clearFilter('type');
                      }}
                      style={styles.clearButton}
                    >
                      <X size={16} color="#ff9654" />
                    </TouchableOpacity>
                  )}
                  {showTypeDropdown ? (
                    <ChevronUp size={20} color="#666666" />
                  ) : (
                    <ChevronDown size={20} color="#666666" />
                  )}
                </View>
              </TouchableOpacity>

              {showTypeDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {typeOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownItem,
                          gameType === option && styles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setGameType(option);
                          setShowTypeDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          gameType === option && styles.dropdownItemTextSelected
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Complexity Filter */}
            <View style={styles.filterItem}>
              <TouchableOpacity
                style={[styles.filterButton, complexity ? styles.filterButtonActive : undefined]}
                onPress={() => {
                  if (showComplexityDropdown && complexity) {
                    clearFilter('complexity');
                  } else {
                    toggleDropdown('complexity');
                  }
                }}
              >
                <View style={styles.filterButtonContent}>
                  <Brain size={20} color={complexity ? "#ff9654" : "#666666"} />
                  <Text style={[styles.filterButtonText, complexity ? styles.filterButtonTextActive : undefined]}>
                    {complexity || 'Game complexity'}
                  </Text>
                </View>
                <View style={styles.filterButtonRight}>
                  {complexity && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        clearFilter('complexity');
                      }}
                      style={styles.clearButton}
                    >
                      <X size={16} color="#ff9654" />
                    </TouchableOpacity>
                  )}
                  {showComplexityDropdown ? (
                    <ChevronUp size={20} color="#666666" />
                  ) : (
                    <ChevronDown size={20} color="#666666" />
                  )}
                </View>
              </TouchableOpacity>

              {showComplexityDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {complexityOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownItem,
                          complexity === option && styles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setComplexity(option);
                          setShowComplexityDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          complexity === option && styles.dropdownItemTextSelected
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          <View style={styles.gamesSection}>
            <View style={styles.gamesHeader}>
              <View style={styles.gamesHeaderLeft}>
                <Text style={styles.label}>Select Games</Text>
                <Text style={styles.sublabel}>
                  {(playerCount || playTime || minAge || gameType || complexity)
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
            style={[styles.createButton, loading || selectedGames.length === 0 ? styles.createButtonDisabled : undefined]}
            onPress={handleCreatePoll}
            disabled={loading || selectedGames.length === 0}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.createButtonText}>{loading ? 'Creating...' : 'Create Poll'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={() => { onClose(); resetForm(); }}>
        <View style={styles.overlay}>
          <Pressable style={{ flex: 1 }} onPress={() => { }} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <View style={{ width: '100%', maxWidth: screenWidth * 0.95, maxHeight: screenHeight * 0.8, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {content}
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
type Styles = {
  overlay: ViewStyle;
  webOverlay: ViewStyle;
  dialog: ViewStyle;
  header: ViewStyle;
  closeButton: ViewStyle;
  title: TextStyle;
  content: ViewStyle;
  titleSection: ViewStyle;
  titleInput: TextStyle;
  descriptionSection: ViewStyle;
  descriptionInput: TextStyle;
  label: TextStyle;
  sublabel: TextStyle;
  filterSection: ViewStyle;
  filterItem: ViewStyle;
  filterButton: ViewStyle;
  filterButtonActive: ViewStyle;
  filterButtonContent: ViewStyle;
  filterButtonText: TextStyle;
  filterButtonTextActive: TextStyle;
  filterButtonRight: ViewStyle;
  clearButton: ViewStyle;
  dropdown: ViewStyle;
  dropdownScroll: ViewStyle;
  dropdownItem: ViewStyle;
  dropdownItemSelected: ViewStyle;
  dropdownItemText: TextStyle;
  dropdownItemTextSelected: TextStyle;
  gamesSection: ViewStyle;
  gamesHeader: ViewStyle;
  gamesHeaderLeft: ViewStyle;
  gamesHeaderRight: ViewStyle;
  selectAllButton: ViewStyle;
  selectAllButtonText: TextStyle;
  clearAllButton: ViewStyle;
  clearAllButtonText: TextStyle;
  gameItem: ViewStyle;
  gameItemSelected: ViewStyle;
  gameInfo: ViewStyle;
  gameName: TextStyle;
  playerCount: TextStyle;
  checkbox: ViewStyle;
  checkboxSelected: ViewStyle;
  noGamesText: TextStyle;
  errorText: TextStyle;
  createButton: ViewStyle;
  createButtonDisabled: ViewStyle;
  createButtonText: TextStyle;
  scrollContent: ViewStyle;
  footer: ViewStyle;
};

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

const styles = StyleSheet.create<Styles & { absoluteCloseButton: ViewStyle, footer: ViewStyle }>({
  overlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
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
    maxWidth: screenWidth * 0.95,
    maxHeight: screenHeight * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
    minHeight: 40,
    position: 'relative',
    marginHorizontal: -20, // counteract dialog padding for full-width header
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
    marginTop: 10,
  },
  content: {
    paddingVertical: 20,
  },
  scrollContent: {
    paddingBottom: 0,
    paddingTop: 0,
    paddingHorizontal: 0,
    // backgroundColor: 'green',
  },
  titleSection: {
    marginBottom: 20,
    width: '100%',
    paddingTop: 8,
  },
  titleInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  descriptionSection: {
    marginBottom: 20,
    width: '100%',
  },
  descriptionInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    minHeight: 80,
    textAlignVertical: 'top',
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
  filterSection: {
    marginBottom: 20,
    width: '100%',
  },
  filterItem: {
    marginBottom: 12,
    position: 'relative',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
  },
  filterButtonActive: {
    borderColor: '#ff9654',
    backgroundColor: '#fff5ef',
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  filterButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
  },
  filterButtonTextActive: {
    color: '#ff9654',
    fontFamily: 'Poppins-SemiBold',
  },
  filterButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    padding: 2,
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#fff5ef',
  },
  dropdownItemText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
  },
  dropdownItemTextSelected: {
    color: '#ff9654',
    fontFamily: 'Poppins-SemiBold',
  },
  gamesSection: {
    marginTop: 8,
    width: '100%',
    marginBottom: 0,
    paddingBottom: 0,
    //backgroundColor: 'red'
  },
  gamesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gamesHeaderLeft: {
    flex: 1,
  },
  gamesHeaderRight: {
    flexDirection: 'row',
    gap: 8,
  },
  selectAllButton: {
    backgroundColor: '#ff9654',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectAllButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#ffffff',
  },
  clearAllButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  clearAllButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#666666',
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
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
    marginBottom: 4,
  },
  playerCount: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e1e5ea',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#ff9654',
    borderColor: '#ff9654',
  },
  noGamesText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
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
    padding: 13,
    paddingRight: 16,// 20% less than 16
    margin: 16, // 20% less than 20
    borderRadius: 10, // 20% less than 12
    gap: 3, // 20% less than 8
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13, // 20% less than 16
    color: '#ffffff',
  },
  absoluteCloseButton: {
    position: 'absolute',
    top: 26, // match header padding, shifted down 2px
    right: 20, // match header padding
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  footer: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 14, // 30% less than 20
    paddingRight: 14, // 30% less than 20
    minHeight: 30, // add a minHeight to shrink the container
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
