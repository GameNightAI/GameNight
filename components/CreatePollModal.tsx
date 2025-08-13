import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, ScrollView, TextInput, Dimensions, Platform } from 'react-native';
import { X, Plus, Check, Users, ChevronDown, ChevronUp, Clock, Brain, Users as Users2, Baby, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { Game } from '@/types/game';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import Select from 'react-select';
import { useDeviceType } from '@/hooks/useDeviceType';
import { isSafari } from '@/utils/safari-polyfill';

interface CreatePollModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: (pollType: 'single-user' | 'multi-user-device' | 'add-games', addedGames?: Game[]) => void;
  preselectedGames?: Game[];
  initialFilters?: {
    playerCount: any[];
    playTime: any[];
    minAge: any[];
    gameType: any[];
    complexity: any[];
  };
  isAddingToExistingPoll?: boolean;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
  preselectedGames,
  initialFilters,
  isAddingToExistingPoll = false,
}) => {
  const deviceType = useDeviceType();
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollTitle, setPollTitle] = useState('');
  const [defaultTitle, setDefaultTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');

  // Filter states - changed to arrays for multi-select
  const [playerCount, setPlayerCount] = useState<any[]>([]);
  const [playTime, setPlayTime] = useState<any[]>([]);
  const [minAge, setMinAge] = useState<any[]>([]);
  const [gameType, setGameType] = useState<any[]>([]);
  const [complexity, setComplexity] = useState<any[]>([]);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [isSmallMobile, setIsSmallMobile] = useState(false);

  useEffect(() => {
    const updateScreenSize = () => {
      const { width, height } = Dimensions.get('window');
      setIsMobile(width < 768);
      setIsSmallMobile(width < 380 || height < 700);
    };

    updateScreenSize();

    const handleResize = () => {
      updateScreenSize();
    };

    if (Platform.OS === 'web') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

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
      if (preselectedGames && preselectedGames.length > 0) {
        setSelectedGames(preselectedGames);
      }
      // Apply initial filters if provided
      if (initialFilters) {
        setPlayerCount(initialFilters.playerCount);
        setPlayTime(initialFilters.playTime);
        setMinAge(initialFilters.minAge);
        setGameType(initialFilters.gameType);
        setComplexity(initialFilters.complexity);
      }
    }
  }, [isVisible, initialFilters]);

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

    if (playerCount.length) {
      filtered = filtered.filter(game =>
        playerCount.some(p => (
          // Ignore game.min_players when 15+ is selected,
          // since the number of actual players could be arbitrarily large.
          (game.min_players <= p.value || p.value === 15)
          && p.value <= game.max_players
        ))
      );
    }

    if (playTime.length) {
      filtered = filtered.filter(game =>
        playTime.some(t => {
          const time = game.playing_time || game.maxPlaytime || game.minPlaytime;
          return time && t.min <= time && time <= t.max;
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
    // Don't automatically remove selected games when filters change
    // This prevents scroll jumping when selecting filter options
  };

  const handleAddGames = async () => {
    try {
      setLoading(true);
      setError(null);

      if (selectedGames.length === 0) {
        setError('Please select at least one game to add.');
        setLoading(false);
        return;
      }

      // Filter out games that are already in the poll (preselectedGames)
      const newGames = selectedGames.filter(game =>
        !preselectedGames?.some(preselected => preselected.id === game.id)
      );

      if (newGames.length === 0) {
        setError('All selected games are already in the poll.');
        setLoading(false);
        return;
      }

      // Return the new games to the parent component
      onSuccess('add-games', newGames);
      resetForm();
    } catch (err) {
      console.error('Error adding games:', err);
      setError(err instanceof Error ? err.message : 'Failed to add games');
    } finally {
      setLoading(false);
    }
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
      const pollUrl = `${window.location.origin}/poll/${poll.id}/`;
      await Clipboard.setStringAsync(pollUrl);
      Toast.show({ type: 'success', text1: 'Poll link copied to clipboard!' });

      // Pass pollType to onSuccess for downstream handling
      onSuccess('single-user');
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
    setPlayerCount([]);
    setPlayTime([]);
    setMinAge([]);
    setGameType([]);
    setComplexity([]);
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

  // Responsive styles based on screen size
  const getResponsiveStyles = () => {
    const baseScale = isSmallMobile ? 0.85 : 1;

    return {
      dialog: {
        ...styles.dialog,
        maxWidth: isMobile ? '95%' as any : 800,
        maxHeight: isMobile ? '90%' as any : 600,
        paddingHorizontal: isMobile ? 16 : 20,
        borderRadius: isMobile ? 8 : 12,
      },
      title: {
        ...styles.title,
        fontSize: isMobile ? 18 : 20,
      },
      label: {
        ...styles.label,
        fontSize: isMobile ? 15 : 16,
      },
      sublabel: {
        ...styles.sublabel,
        fontSize: isMobile ? 13 : 14,
      },
      titleInput: {
        ...styles.titleInput,
        fontSize: isMobile ? 15 : 16,
        padding: isMobile ? 10 : 12,
      },
      descriptionInput: {
        ...styles.descriptionInput,
        fontSize: isMobile ? 15 : 16,
        padding: isMobile ? 10 : 12,
        minHeight: isMobile ? 70 : 80,
      },
      gameName: {
        ...styles.gameName,
        fontSize: isMobile ? 15 : 16,
      },
      playerCount: {
        ...styles.playerCount,
        fontSize: isMobile ? 13 : 14,
      },
      createButton: {
        ...styles.createButton,
        padding: isMobile ? 12 : 13,
        margin: isMobile ? 12 : 16,
      },
      createButtonText: {
        ...styles.createButtonText,
        fontSize: isMobile ? 12 : 13,
      },
      selectAllButton: {
        ...styles.selectAllButton,
        paddingHorizontal: isMobile ? 10 : 12,
        paddingVertical: isMobile ? 5 : 6,
      },
      selectAllButtonText: {
        ...styles.selectAllButtonText,
        fontSize: isMobile ? 11 : 12,
      },
      clearAllButton: {
        ...styles.clearAllButton,
        paddingHorizontal: isMobile ? 10 : 12,
        paddingVertical: isMobile ? 5 : 6,
      },
      clearAllButtonText: {
        ...styles.clearAllButtonText,
        fontSize: isMobile ? 11 : 12,
      },
      gameItem: {
        ...styles.gameItem,
        padding: isMobile ? 12 : 16,
        marginBottom: isMobile ? 6 : 8,
      },
      checkbox: {
        ...styles.checkbox,
        width: isMobile ? 20 : 24,
        height: isMobile ? 20 : 24,
      },
      absoluteBackButton: {
        ...styles.absoluteBackButton,
        top: isMobile ? 20 : 26,
        left: isMobile ? 16 : 20,
        padding: isMobile ? 4 : 6,
      },
      absoluteCloseButton: {
        ...styles.absoluteCloseButton,
        top: isMobile ? 20 : 26,
        right: isMobile ? 16 : 20,
        padding: isMobile ? 4 : 6,
      },
    };
  };

  // Safari-compatible select styles
  const getSelectStyles = () => {
    const baseSelectStyles = {
      control: (baseStyles: any, state: any) => {
        return {
          ...baseStyles,
          fontFamily: 'Poppins-Regular',
          fontSize: isMobile ? 15 : 16,
          borderColor: '#e1e5ea',
          borderRadius: isMobile ? 8 : 12,
          minHeight: isMobile ? 44 : 48,
          boxShadow: 'none',
          '&:hover': {
            borderColor: '#ff9654',
          },
          // Safari-specific fixes
          ...(isSafari() && {
            WebkitAppearance: 'none',
            WebkitBorderRadius: isMobile ? 8 : 12,
          }),
        }
      },
      container: (baseStyles: any, state: any) => ({
        ...baseStyles,
        marginBottom: isMobile ? 10 : 12,
      }),
      menu: (baseStyles: any, state: any) => ({
        ...baseStyles,
        backgroundColor: '#ffffff',
        borderRadius: isMobile ? 8 : 12,
        borderWidth: 1,
        borderColor: '#e1e5ea',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 9999,
        position: 'absolute',
        maxHeight: 'none',
        overflow: 'hidden',
        // Safari-specific fixes
        ...(isSafari() && {
          WebkitBorderRadius: isMobile ? 8 : 12,
        }),
      }),
      menuList: (baseStyles: any, state: any) => ({
        ...baseStyles,
        maxHeight: isMobile ? 180 : 200,
        overflow: 'auto',
        // Safari-specific scrollbar styling
        ...(isSafari() && {
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '4px',
          },
        }),
      }),
      multiValueLabel: (baseStyles: any, state: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: isMobile ? 13 : 14,
      }),
      noOptionsMessage: (baseStyles: any, state: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: isMobile ? 14 : 16,
      }),
      option: (baseStyles: any, state: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: isMobile ? 15 : 16,
        color: state.isSelected ? '#ff9654' : '#333333',
        backgroundColor: state.isSelected ? '#fff5ef' : 'transparent',
        '&:hover': {
          backgroundColor: '#fff5ef',
        },
      }),
      placeholder: (baseStyles: any, state: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: isMobile ? 15 : 16,
        color: '#999999',
      }),
    };

    return baseSelectStyles;
  };

  if (!isVisible) return null;

  const responsiveStyles = getResponsiveStyles();
  const selectStyles = getSelectStyles();

  return (
    <View style={styles.overlay}>
      <div style={{
        maxWidth: isMobile ? '95vw' : '90vw',
        maxHeight: isMobile ? '90vh' : '80vh',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? 10 : 20,
      }}>
        <View style={[responsiveStyles.dialog, {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          maxWidth: isMobile ? '100%' : undefined,
          maxHeight: isMobile ? '100%' : undefined
        }]}>
          {isAddingToExistingPoll && (
            <TouchableOpacity
              style={responsiveStyles.absoluteBackButton}
              onPress={() => {
                onClose();
                resetForm();
              }}
              accessibilityLabel="Back to Edit Poll"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={isMobile ? 20 : 24} color="#666666" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={responsiveStyles.absoluteCloseButton}
            onPress={() => {
              onClose();
              resetForm();
            }}
            accessibilityLabel="Close"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={isMobile ? 20 : 24} color="#666666" />
          </TouchableOpacity>
          <View style={styles.header}>
            <Text style={responsiveStyles.title}>
              {isAddingToExistingPoll ? 'Add More Games' : 'Create Poll'}
            </Text>
          </View>
          <ScrollView
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={!isMobile}
          >
            {!isAddingToExistingPoll && (
              <>
                <View style={styles.titleSection}>
                  <Text style={responsiveStyles.label}>Poll Title (Optional)</Text>
                  <Text style={responsiveStyles.sublabel}>
                    Customize your poll title or keep the auto-generated name
                  </Text>
                  <TextInput
                    style={responsiveStyles.titleInput}
                    value={pollTitle}
                    onChangeText={setPollTitle}
                    placeholder="Enter a custom title or keep the default"
                    placeholderTextColor="#999999"
                    maxLength={100}
                  />
                </View>

                <View style={styles.descriptionSection}>
                  <Text style={responsiveStyles.label}>Description (Optional)</Text>
                  <Text style={responsiveStyles.sublabel}>
                    Add context, instructions, or any additional information for voters
                  </Text>
                  <TextInput
                    style={responsiveStyles.descriptionInput}
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
              </>
            )}

            <View style={styles.filterSection}>
              <Text style={responsiveStyles.label}>Filter Games</Text>
              <Text style={responsiveStyles.sublabel}>
                {isAddingToExistingPoll
                  ? 'Filter your collection to find additional games to add to the poll. All filters are optional.'
                  : 'Filter your collection to find the perfect games for your poll. All filters are optional.'
                }
              </Text>

              <Select
                placeholder="Player count"
                value={playerCount}
                onChange={handlePlayerCountChange}
                options={playerOptions}
                defaultValue={[]}
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
                options={timeOptions}
                defaultValue={[]}
                isMulti
                isClearable
                isSearchable={false}
                closeMenuOnSelect={false}
                blurInputOnSelect={false}
                styles={selectStyles}
              />

              <Select
                placeholder="Age range"
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

            <View style={styles.gamesSection}>
              <View style={styles.gamesHeader}>
                <View style={styles.gamesHeaderLeft}>
                  <Text style={responsiveStyles.label}>Select Games</Text>
                  <Text style={responsiveStyles.sublabel}>
                    {(playerCount.length || playTime.length || minAge.length || gameType.length || complexity.length)
                      ? `Games that match your filters`
                      : isAddingToExistingPoll
                        ? 'Choose additional games from your collection to add to the poll'
                        : 'Choose games from your collection to include in the poll'}
                  </Text>
                </View>
                <View style={styles.gamesHeaderRight}>
                  <TouchableOpacity
                    style={responsiveStyles.selectAllButton}
                    onPress={() => setSelectedGames([...filteredGames])}
                  >
                    <Text style={responsiveStyles.selectAllButtonText}>Select All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={responsiveStyles.clearAllButton}
                    onPress={() => setSelectedGames([])}
                  >
                    <Text style={responsiveStyles.clearAllButtonText}>Clear All</Text>
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
                        responsiveStyles.gameItem,
                        isSelected && styles.gameItemSelected
                      ]}
                      onPress={() => toggleGameSelection(game)}
                    >
                      <View style={styles.gameInfo}>
                        <Text style={responsiveStyles.gameName}>{game.name}</Text>
                        <Text style={responsiveStyles.playerCount}>
                          {game.min_players}-{game.max_players} players • {game.playing_time ? `${game.playing_time} min` : game.minPlaytime && game.maxPlaytime ? (game.minPlaytime === game.maxPlaytime ? `${game.minPlaytime} min` : `${game.minPlaytime}-${game.maxPlaytime} min`) : game.minPlaytime || game.maxPlaytime ? `${game.minPlaytime || game.maxPlaytime} min` : 'Unknown time'}
                        </Text>
                      </View>
                      <View style={[
                        responsiveStyles.checkbox,
                        isSelected && styles.checkboxSelected
                      ]}>
                        {isSelected && (
                          <Check size={isMobile ? 14 : 16} color="#ffffff" />
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
              style={[responsiveStyles.createButton, loading || selectedGames.length === 0 ? styles.createButtonDisabled : undefined]}
              onPress={isAddingToExistingPoll ? handleAddGames : handleCreatePoll}
              disabled={loading || selectedGames.length === 0}
            >
              <Plus size={isMobile ? 18 : 20} color="#fff" />
              <Text style={responsiveStyles.createButtonText}>
                {loading ? (isAddingToExistingPoll ? 'Adding...' : 'Creating...') : (isAddingToExistingPoll ? 'Add Games' : 'Create Poll')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </div>
    </View>
  );
};

type Styles = {
  overlay: ViewStyle;
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
  absoluteBackButton: ViewStyle;
  absoluteCloseButton: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
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
    padding: Platform.OS === 'web' ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
    minHeight: Platform.OS === 'web' ? 40 : 36,
    position: 'relative',
    marginHorizontal: Platform.OS === 'web' ? -20 : -16,
  },
  closeButton: {
    padding: Platform.OS === 'web' ? 4 : 2,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: Platform.OS === 'web' ? 20 : 18,
    color: '#1a2b5f',
    marginTop: 10,
  },
  content: {
    paddingVertical: Platform.OS === 'web' ? 20 : 16,
  },
  scrollContent: {
    paddingBottom: 0,
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  titleSection: {
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    width: '100%',
    paddingTop: Platform.OS === 'web' ? 8 : 6,
  },
  titleInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#333333',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: Platform.OS === 'web' ? 12 : 8,
    padding: Platform.OS === 'web' ? 12 : 10,
    marginTop: 8,
  },
  descriptionSection: {
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    width: '100%',
  },
  descriptionInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#333333',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: Platform.OS === 'web' ? 12 : 8,
    padding: Platform.OS === 'web' ? 12 : 10,
    marginTop: 8,
    minHeight: Platform.OS === 'web' ? 80 : 70,
    textAlignVertical: 'top',
  },
  label: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  sublabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#666666',
    marginBottom: 12,
  },
  filterSection: {
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    marginTop: Platform.OS === 'web' ? 10 : 8,
    width: '100%',
    position: 'relative',
    zIndex: 1000,
  },
  filterItem: {
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    position: 'relative',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: Platform.OS === 'web' ? 12 : 8,
    padding: Platform.OS === 'web' ? 12 : 10,
    minHeight: Platform.OS === 'web' ? 48 : 44,
  },
  filterButtonActive: {
    borderColor: '#ff9654',
    backgroundColor: '#fff5ef',
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 8 : 6,
    flex: 1,
  },
  filterButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#333333',
  },
  filterButtonTextActive: {
    color: '#ff9654',
    fontFamily: 'Poppins-SemiBold',
    fontSize: Platform.OS === 'web' ? 16 : 15,
  },
  filterButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 8 : 6,
  },
  clearButton: {
    padding: 2,
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? 12 : 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: Platform.OS === 'web' ? 200 : 180,
  },
  dropdownScroll: {
    maxHeight: Platform.OS === 'web' ? 200 : 180,
  },
  dropdownItem: {
    padding: Platform.OS === 'web' ? 12 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#fff5ef',
  },
  dropdownItemText: {
    fontFamily: 'Poppins-Regular',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#333333',
  },
  dropdownItemTextSelected: {
    color: '#ff9654',
    fontFamily: 'Poppins-SemiBold',
    fontSize: Platform.OS === 'web' ? 16 : 15,
  },
  gamesSection: {
    marginTop: Platform.OS === 'web' ? 8 : 6,
    width: '100%',
    marginBottom: 0,
    paddingBottom: 0,
  },
  gamesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
  },
  gamesHeaderLeft: {
    flex: 1,
  },
  gamesHeaderRight: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 8 : 6,
  },
  selectAllButton: {
    backgroundColor: '#ff9654',
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 6 : 5,
    borderRadius: Platform.OS === 'web' ? 6 : 5,
  },
  selectAllButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#ffffff',
  },
  clearAllButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 6 : 5,
    borderRadius: Platform.OS === 'web' ? 6 : 5,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  clearAllButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#666666',
  },
  gameItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 16 : 12,
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? 12 : 8,
    marginBottom: Platform.OS === 'web' ? 8 : 6,
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
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#333333',
    marginBottom: 4,
  },
  playerCount: {
    fontFamily: 'Poppins-Regular',
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#666666',
  },
  checkbox: {
    width: Platform.OS === 'web' ? 24 : 20,
    height: Platform.OS === 'web' ? 24 : 20,
    borderRadius: Platform.OS === 'web' ? 6 : 4,
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
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    padding: Platform.OS === 'web' ? 13 : 12,
    paddingRight: Platform.OS === 'web' ? 16 : 14,
    margin: Platform.OS === 'web' ? 16 : 12,
    borderRadius: Platform.OS === 'web' ? 10 : 8,
    gap: 3,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#ffffff',
  },
  absoluteBackButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 26 : 20,
    left: Platform.OS === 'web' ? 20 : 16,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: Platform.OS === 'web' ? 16 : 12,
    padding: Platform.OS === 'web' ? 6 : 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#1d4ed8',
  },
  absoluteCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 26 : 20,
    right: Platform.OS === 'web' ? 20 : 16,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: Platform.OS === 'web' ? 16 : 12,
    padding: Platform.OS === 'web' ? 6 : 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  footer: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: Platform.OS === 'web' ? 14 : 12,
    paddingRight: Platform.OS === 'web' ? 14 : 12,
    minHeight: Platform.OS === 'web' ? 30 : 28,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

const selectStyles = {
  control: (baseStyles: any, state: any) => {
    return {
      ...baseStyles,
      fontFamily: 'Poppins-Regular',
      fontSize: 16,
      borderColor: '#e1e5ea',
      borderRadius: 12,
      minHeight: 48,
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#ff9654',
      },
    }
  },
  container: (baseStyles: any, state: any) => ({
    ...baseStyles,
    marginBottom: 12,
  }),
  menu: (baseStyles: any, state: any) => ({
    ...baseStyles,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 9999,
    position: 'absolute',
    maxHeight: 'none',
    overflow: 'hidden',
  }),
  menuList: (baseStyles: any, state: any) => ({
    ...baseStyles,
    maxHeight: 200,
    overflow: 'auto',
  }),
  multiValueLabel: (baseStyles: any, state: any) => ({
    ...baseStyles,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  }),
  noOptionsMessage: (baseStyles: any, state: any) => ({
    ...baseStyles,
    fontFamily: 'Poppins-Regular',
  }),
  option: (baseStyles: any, state: any) => ({
    ...baseStyles,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: state.isSelected ? '#ff9654' : '#333333',
    backgroundColor: state.isSelected ? '#fff5ef' : 'transparent',
    '&:hover': {
      backgroundColor: '#fff5ef',
    },
  }),
  placeholder: (baseStyles: any, state: any) => ({
    ...baseStyles,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#999999',
  }),
};
