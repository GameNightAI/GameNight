import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, ScrollView, TextInput, Dimensions, Platform, Image, ImageStyle } from 'react-native';
import { X, Plus, Check, Users, ChevronDown, ChevronUp, Clock, Brain, Users as Users2, Baby, ArrowLeft, SquarePen, ListFilter, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { Game } from '@/types/game';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import Select from 'react-select';
import { useDeviceType } from '@/hooks/useDeviceType';
import { isSafari } from '@/utils/safari-polyfill';
import { CreatePollDetails } from './CreatePollDetails';
import { CreatePollAddOptions } from './CreatePollAddOptions';
import { FilterGameModal } from './FilterGameModal';
import { GameSearchModal } from './GameSearchModal';
import { PollSuccessModal } from './PollSuccessModal';
import { FilterOption, playerOptions, timeOptions, ageOptions, typeOptions, complexityOptions } from '@/utils/filterOptions';
import { useCallback } from 'react';

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
  const router = useRouter();
  const deviceType = useDeviceType();
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [searchAddedGames, setSearchAddedGames] = useState<Game[]>([]);
  const [selectedGamesForPoll, setSelectedGamesForPoll] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollTitle, setPollTitle] = useState('');
  const [defaultTitle, setDefaultTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  // Modal states
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isAdditionalOptionsModalVisible, setIsAdditionalOptionsModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isGameSearchModalVisible, setIsGameSearchModalVisible] = useState(false);
  const [isPollCreatedModalVisible, setIsPollCreatedModalVisible] = useState(false);
  const [createdPollUrl, setCreatedPollUrl] = useState('');

  // Filter states - changed to arrays for multi-select
  const [playerCount, setPlayerCount] = useState<FilterOption[]>([]);
  const [playTime, setPlayTime] = useState<FilterOption[]>([]);
  const [minAge, setMinAge] = useState<FilterOption[]>([]);
  const [gameType, setGameType] = useState<FilterOption[]>([]);
  const [complexity, setComplexity] = useState<FilterOption[]>([]);

  const isFiltered = [
    playerCount,
    playTime,
    minAge,
    gameType,
    complexity,
  ].some(_ => _.length);

  // Dropdown z-index management similar to FilterGameModal
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const getFilterSectionZIndex = (index: number) => {
    if (openDropdownIndex === null) return 1000;
    if (openDropdownIndex === index) return 99999;
    return 1000;
  };
  const handleDropdownChange = (index: number, isOpen: boolean) => {
    setOpenDropdownIndex(isOpen ? index : null);
  };

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [isSmallMobile, setIsSmallMobile] = useState(false);
  const [isReady, setIsReady] = useState(false); // Loading state for screen size detection

  useEffect(() => {
    const updateScreenSize = () => {
      const { width, height } = Dimensions.get('window');
      setIsMobile(width < 768);
      setIsSmallMobile(width < 380 || height < 700);
    };

    updateScreenSize();
    setIsReady(true); // Mark as ready after initial screen size detection

    const handleResize = () => {
      updateScreenSize();
    };

    if (Platform.OS === 'web') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Filter options imported from utils/filterOptions.ts

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

  const filterGames = useCallback(() => {
    let filtered = [...availableGames];

    // Filter out games that are already added via search to prevent duplicates
    filtered = filtered.filter(game =>
      !searchAddedGames.some(searchGame => searchGame.id === game.id)
    );

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
          return time && t.min !== undefined && t.max !== undefined && t.min <= time && time <= t.max;
        })
      );
    }

    if (minAge.length) {
      filtered = filtered.filter(game =>
        minAge.some(a => (
          a.min !== undefined && a.max !== undefined && a.min <= game.minAge
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
  }, [availableGames, searchAddedGames, playerCount, playTime, minAge, gameType, complexity]);

  useEffect(() => {
    filterGames();
  }, [filterGames]);

  // Update default title when selected games change
  useEffect(() => {
    // Count games that are selected for the poll via checkboxes
    const totalSelectedGames = selectedGamesForPoll.length;

    let newDefaultTitle = '';
    if (totalSelectedGames === 1) {
      newDefaultTitle = 'Vote on 1 game';
    } else if (totalSelectedGames > 1) {
      newDefaultTitle = `Vote on ${totalSelectedGames} games`;
    }
    setDefaultTitle(newDefaultTitle);
    if ((!pollTitle || pollTitle.startsWith('Vote on')) && newDefaultTitle) {
      setPollTitle(newDefaultTitle);
    }
  }, [selectedGamesForPoll]);

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
        min_exp_players: game.min_players || 0,
        max_exp_players: game.max_players || 0,
      }));

      setAvailableGames(games);
      setFilteredGames(games);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load games');
    }
  };

  const handleAddGames = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use selectedGamesForPoll which contains the combined checked games
      const allSelectedGames = [...selectedGamesForPoll];

      if (allSelectedGames.length === 0) {
        setError('Please select at least one game to add.');
        setLoading(false);
        return;
      }

      // Filter out games that are already in the poll (preselectedGames)
      const newGames = allSelectedGames.filter(game =>
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

      // Use selectedGamesForPoll which contains the combined checked games
      const allSelectedGames = [...selectedGamesForPoll];

      if (allSelectedGames.length === 0) {
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

      const pollGames = allSelectedGames.map(game => ({
        poll_id: poll.id,
        game_id: game.id,
      }));

      const { error: gamesError } = await supabase
        .from('poll_games')
        .insert(pollGames);

      if (gamesError) throw gamesError;

      // Show success modal for new polls, call onSuccess immediately for adding games
      if (!isAddingToExistingPoll) {
        const pollUrl = `${window.location.origin}/poll/${poll.id}/`;
        setCreatedPollUrl(pollUrl);
        setIsPollCreatedModalVisible(true);

        // Don't call onSuccess yet - wait for user to close the success modal
      } else {
        // For adding games to existing poll, call onSuccess immediately
        onSuccess('add-games', allSelectedGames);
        resetForm();
      }
    } catch (err) {
      console.error('Error creating poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedGames([]);
    setSearchAddedGames([]);
    setSelectedGamesForPoll([]);
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
    setSelectedGamesForPoll(current => {
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

  const handlePollCreatedModalClose = () => {
    setIsPollCreatedModalVisible(false);
    // SIMPLIFIED: Just close the success modal, keep main modal open
  };

  // Add a wrapper for onClose to debug when it's called
  const handleMainModalClose = () => {
    onClose();
    resetForm();
  };

  // Modal handlers
  const handleDetailsSave = (title: string, description: string) => {
    setPollTitle(title);
    setPollDescription(description);
  };

  // Safari-compatible select styles
  const getSelectStyles = (index: number) => {
    const baseSelectStyles = {
      control: (baseStyles: any, state: any) => {
        return {
          ...baseStyles,
          fontFamily: 'Poppins-Regular',
          fontSize: 14,
          borderColor: '#e1e5ea',
          borderRadius: 8,
          minHeight: 40,
          boxShadow: 'none',
          '&:hover': {
            borderColor: '#ff9654',
          },
        }
      },
      container: (baseStyles: any, state: any) => ({
        ...baseStyles,
        marginBottom: 6,
        position: 'relative',
        zIndex: getFilterSectionZIndex(index),
      }),
      menu: (baseStyles: any, state: any) => ({
        ...baseStyles,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e1e5ea',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: getFilterSectionZIndex(index),
        position: 'absolute',
        maxHeight: 'none',
        overflow: 'hidden',
      }),
      menuPortal: (baseStyles: any) => ({
        ...baseStyles,
        zIndex: 999999,
      }),
      menuList: (baseStyles: any, state: any) => ({
        ...baseStyles,
        maxHeight: 160,
        overflow: 'auto',
      }),
      clearIndicator: (baseStyles: any, state: any) => ({
        ...baseStyles,
        color: '#666666',
        fontSize: 11,
        fontFamily: 'Poppins-SemiBold',
        padding: '2px 6px',
        cursor: 'pointer',
        '&:hover': {
          color: '#ff9654',
        },
        // Hide the default SVG icon
        '& svg': {
          display: 'none',
        },
        // Show only our custom CLR text (no absolute centering)
        '&::after': {
          content: '"CLR"',
          display: 'block',
        },
      }),
      multiValueLabel: (baseStyles: any, state: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
      }),
      noOptionsMessage: (baseStyles: any, state: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
      }),
      option: (baseStyles: any, state: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: state.isSelected ? '#ff9654' : '#333333',
        backgroundColor: state.isSelected ? '#fff5ef' : 'transparent',
        '&:hover': {
          backgroundColor: '#fff5ef',
        },
      }),
      placeholder: (baseStyles: any, state: any) => ({
        ...baseStyles,
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: '#999999',
      }),
    };

    return baseSelectStyles;
  };

  if (!isVisible || !isReady) return null;

  const selectStyles0 = getSelectStyles(0);
  const selectStyles1 = getSelectStyles(1);
  const selectStyles2 = getSelectStyles(2);
  const selectStyles3 = getSelectStyles(3);
  const selectStyles4 = getSelectStyles(4);

  const content = (
    <>
      {isAddingToExistingPoll && (
        <TouchableOpacity
          style={styles.absoluteBackButton}
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
        style={styles.absoluteCloseButton}
        onPress={handleMainModalClose}
        accessibilityLabel="Close"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <X size={isMobile ? 20 : 24} color="#666666" />
      </TouchableOpacity>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isAddingToExistingPoll ? 'Add More Games' : 'Create Poll'}
        </Text>
      </View>
      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {!isAddingToExistingPoll && (
          <>
            <View style={styles.titleSection}>
              <TouchableOpacity
                style={[styles.titleButton, pollTitle && styles.titleButtonActive]}
                onPress={() => setIsDetailsModalVisible(true)}
              >
                <View style={styles.titleButtonContent}>
                  <View style={styles.titleButtonLeft}>
                    <Text style={styles.titleButtonLabel}>Poll Details</Text>
                  </View>
                  <View style={styles.titleButtonRight}>
                    <View style={[styles.titleButtonIndicator, { opacity: pollTitle ? 1 : 0 }]}>
                      <Text style={styles.titleButtonIndicatorText}>✓</Text>
                    </View>
                    <SquarePen size={20} color="#666666" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.descriptionSection}>
              <TouchableOpacity
                style={[styles.descriptionButton, pollDescription && styles.descriptionButtonActive]}
                onPress={() => setIsAdditionalOptionsModalVisible(true)}
              >
                <View style={styles.descriptionButtonContent}>
                  <View style={styles.descriptionButtonLeft}>
                    <Text style={styles.descriptionButtonLabel}>Additional Options</Text>
                  </View>
                  <View style={styles.descriptionButtonRight}>
                    <View style={[styles.descriptionButtonIndicator, { opacity: pollDescription ? 1 : 0 }]}>
                      <Text style={styles.descriptionButtonIndicatorText}>✓</Text>
                    </View>
                    <SquarePen size={20} color="#666666" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.filterSection}>
          {/* <Text style={styles.label}>Filter Games</Text> */}
          <Text style={styles.sublabel}>
            {isAddingToExistingPoll
              ? 'Edit poll filters'
              : ''
            }
          </Text>

          <TouchableOpacity
            style={[styles.filterButton, isFiltered && styles.filterButtonActive]}
            onPress={() => setIsFilterModalVisible(true)}
          >
            <View style={styles.filterButtonContent}>
              <View style={styles.filterButtonLeft}>
                <Text style={styles.filterButtonLabel}>Filter Games (Optional)</Text>
              </View>
              <View style={styles.filterButtonRight}>
                <View style={[styles.filterButtonIndicator, { opacity: isFiltered ? 1 : 0 }]}>
                  <Text style={styles.filterButtonIndicatorText}>✓</Text>
                </View>
                <ListFilter size={20} color="#666666" />
              </View>
            </View>
          </TouchableOpacity>

          {isFiltered && (
            <View style={styles.activeFilters}>
              <Text style={styles.activeFiltersText}>
                Active filters: {[
                  playerCount.length ? `Player Count` : null,
                  playTime.length ? `Play Time` : null,
                  minAge.length ? `Age Range` : null,
                  gameType.length ? `Game Type` : null,
                  complexity.length ? `Complexity` : null,
                ].filter(Boolean).join(', ')}
              </Text>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setPlayerCount([]);
                  setPlayTime([]);
                  setMinAge([]);
                  setGameType([]);
                  setComplexity([]);
                }}
              >
                <X size={16} color="#666666" />
              </TouchableOpacity>
            </View>
          )}

        </View>

        <View style={styles.searchSection}>
          {/* <Text style={styles.sublabel}>
            {isAddingToExistingPoll
              ? 'Add games not in your collection'
              : 'Add games not in your collection to the poll'
            }
          </Text> */}
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setIsGameSearchModalVisible(true)}
          >
            <Search size={20} color="#fff" />
            <Text style={styles.searchButtonText}>Search for Games</Text>
          </TouchableOpacity>
        </View>

        {/* Collection Games Section */}
        <View style={styles.gamesSection}>
          <View style={styles.gamesHeader}>
            <Text style={styles.label}>Games Selection</Text>
            <View style={styles.gamesHeaderRight}>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={() => setSelectedGamesForPoll([...filteredGames, ...searchAddedGames])}
              >
                <Text style={styles.selectAllButtonText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={() => setSelectedGamesForPoll([])}
              >
                <Text style={styles.clearAllButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Games Added via Search Section */}
        {searchAddedGames.length > 0 && (
          <View style={styles.searchAddedSection}>
            {searchAddedGames.map(game => {
              const isAlreadyInPoll = preselectedGames?.some(pg => pg.id === game.id);
              return (
                <TouchableOpacity
                  key={`search-${game.id}`}
                  style={[
                    styles.searchAddedGameItem,
                    isAlreadyInPoll && styles.gameItemDisabled
                  ]}
                  onPress={() => !isAlreadyInPoll && toggleGameSelection(game)}
                  disabled={isAlreadyInPoll}
                >
                  <Image
                    source={{ uri: game.thumbnail || game.image || 'https://via.placeholder.com/60?text=No+Image' }}
                    style={[
                      {
                        width: 48,
                        height: 48,
                        borderRadius: 6,
                        backgroundColor: '#f0f0f0',
                        marginRight: 8,
                      },
                      isAlreadyInPoll && styles.gameThumbnailDisabled
                    ]}
                    resizeMode="cover"
                  />
                  <View style={styles.gameInfo}>
                    <Text style={[
                      styles.gameName,
                      isAlreadyInPoll && styles.gameNameDisabled
                    ]}>{game.name}</Text>
                    <Text style={[
                      styles.playerCount,
                      isAlreadyInPoll && styles.playerCountDisabled
                    ]}>
                      {game.min_players}-{game.max_players} players • {game.playing_time ? `${game.playing_time} min` : game.minPlaytime && game.maxPlaytime ? (game.minPlaytime === game.minPlaytime ? `${game.minPlaytime} min` : `${game.minPlaytime}-${game.maxPlaytime} min`) : game.minPlaytime || game.maxPlaytime ? `${game.minPlaytime || game.maxPlaytime} min` : 'Unknown time'}
                    </Text>
                    {isAlreadyInPoll && (
                      <Text style={styles.alreadyInPollText}>Already in poll</Text>
                    )}
                  </View>
                  {/* <TouchableOpacity
                    style={styles.removeSearchGameButton}
                    onPress={() => {
                      // Remove from searchAddedGames
                      setSearchAddedGames(prev => prev.filter(g => g.id !== game.id));
                      // Also remove from selectedGamesForPoll if it was selected
                      setSelectedGamesForPoll(prev => prev.filter(g => g.id !== game.id));
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={16} color="#666666" />
                  </TouchableOpacity> */}
                  <View style={[
                    styles.checkbox,
                    selectedGamesForPoll.some(g => g.id === game.id) && styles.checkboxSelected,
                    isAlreadyInPoll && styles.checkboxDisabled
                  ]}>
                    {selectedGamesForPoll.some(g => g.id === game.id) && (
                      <Check size={isMobile ? 14 : 16} color="#ffffff" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Games List Section */}
        <View style={styles.gamesListSection}>
          {filteredGames.length === 0 ? (
            <Text style={styles.noGamesText}>
              No games found matching your filters
            </Text>
          ) : (
            filteredGames.map(game => {
              const isSelected = selectedGamesForPoll.some(g => g.id === game.id);
              const isAlreadyInPoll = preselectedGames?.some(pg => pg.id === game.id);
              return (
                <TouchableOpacity
                  key={game.id}
                  style={[
                    styles.gameItem,
                    isSelected && styles.gameItemSelected,
                    isAlreadyInPoll && styles.gameItemDisabled
                  ]}
                  onPress={() => !isAlreadyInPoll && toggleGameSelection(game)}
                  disabled={isAlreadyInPoll}
                >
                  <Image
                    source={{ uri: game.thumbnail || game.image || 'https://via.placeholder.com/60?text=No+Image' }}
                    style={[
                      {
                        width: 48,
                        height: 48,
                        borderRadius: 6,
                        backgroundColor: '#f0f0f0',
                        marginRight: 8,
                      },
                      isAlreadyInPoll && styles.gameThumbnailDisabled
                    ]}
                    resizeMode="cover"
                  />
                  <View style={styles.gameInfo}>
                    <Text style={[
                      styles.gameName,
                      isAlreadyInPoll && styles.gameNameDisabled
                    ]}>{game.name}</Text>
                    <Text style={[
                      styles.playerCount,
                      isAlreadyInPoll && styles.playerCountDisabled
                    ]}>
                      {game.min_players}-{game.max_players} players • {game.playing_time ? `${game.playing_time} min` : game.minPlaytime && game.maxPlaytime ? (game.minPlaytime === game.minPlaytime ? `${game.minPlaytime} min` : `${game.minPlaytime}-${game.maxPlaytime} min`) : game.minPlaytime || game.maxPlaytime ? `${game.minPlaytime || game.maxPlaytime} min` : 'Unknown time'}
                    </Text>
                    {isAlreadyInPoll && (
                      <Text style={styles.alreadyInPollText}>Already in poll</Text>
                    )}
                  </View>
                  <View style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                    isAlreadyInPoll && styles.checkboxDisabled
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
          style={[styles.createButton, loading || selectedGamesForPoll.length === 0 ? styles.createButtonDisabled : undefined]}
          onPress={isAddingToExistingPoll ? handleAddGames : handleCreatePoll}
          disabled={loading || selectedGamesForPoll.length === 0}
        >
          <Plus size={isMobile ? 18 : 20} color="#fff" />
          <Text style={styles.createButtonText}>
            {loading ? (isAddingToExistingPoll ? 'Adding...' : 'Creating...') : (isAddingToExistingPoll ? 'Add Games' : 'Create Poll')}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.overlay}>
      <View style={{
        maxWidth: isMobile ? '100%' : 800,
        maxHeight: '85%',
        width: '100%',
        height: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? 8 : 20,
      }}>
        <View style={[styles.dialog, {
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: isMobile ? '100%' : undefined,
          maxHeight: isMobile ? '100%' : undefined
        }]}>
          {content}
        </View>
      </View>
      {/* Details Modal */}
      <CreatePollDetails
        isVisible={isDetailsModalVisible}
        onClose={() => setIsDetailsModalVisible(false)}
        onSave={handleDetailsSave}
        currentTitle={pollTitle}
        currentDescription={pollDescription}
      />

      {/* Additional Options Modal */}
      <CreatePollAddOptions
        isVisible={isAdditionalOptionsModalVisible}
        onClose={() => setIsAdditionalOptionsModalVisible(false)}
        onSave={(options) => {
          // Handle additional options when implemented
          console.log('Additional options:', options);
          setIsAdditionalOptionsModalVisible(false);
        }}
      />

      {/* Filter Modal */}
      <FilterGameModal
        isVisible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApplyFilters={() => setIsFilterModalVisible(false)}
        title="Filter Collection"
        description="All filters (optional)"
        applyButtonText="Apply Filters"
        filterConfigs={[
          {
            key: 'playerCount',
            label: 'Player Count',
            placeholder: '# Players',
            options: playerOptions,
            value: playerCount,
            onChange: setPlayerCount,
          },
          {
            key: 'playTime',
            label: 'Play Time',
            placeholder: 'Play Time',
            options: timeOptions,
            value: playTime,
            onChange: setPlayTime,
          },
          {
            key: 'age',
            label: 'Age Range',
            placeholder: 'Age Range',
            options: ageOptions,
            value: minAge,
            onChange: setMinAge,
          },
          {
            key: 'gameType',
            label: 'Game Type',
            placeholder: 'Play Style',
            options: typeOptions,
            value: gameType,
            onChange: setGameType,
          },
          {
            key: 'complexity',
            label: 'Complexity',
            placeholder: 'Complexity',
            options: complexityOptions,
            value: complexity,
            onChange: setComplexity,
          },
        ]}
      />

      {/* Game Search Modal */}
      <GameSearchModal
        isVisible={isGameSearchModalVisible}
        onClose={() => setIsGameSearchModalVisible(false)}
        mode="poll"
        onGameSelected={(game) => {
          // Add to searchAddedGames and automatically select for poll
          setSearchAddedGames(prev => [...prev, game]);
          setSelectedGamesForPoll(prev => [...prev, game]);
          setIsGameSearchModalVisible(false);
        }}
        existingGameIds={selectedGames.map(g => g.id.toString())}
        userCollectionIds={[]}
        title="Search for Games"
        searchPlaceholder="Enter search..."
      />

      {/* Poll Success Modal */}
      <PollSuccessModal
        isVisible={isPollCreatedModalVisible}
        onClose={handlePollCreatedModalClose}
        onDone={() => {
          // Close both modals and call onSuccess
          setIsPollCreatedModalVisible(false);
          onSuccess('single-user');
          resetForm();
        }}
        pollUrl={createdPollUrl}
        onStartInPersonVoting={() => {
          // Extract poll ID from URL and navigate to the local poll voting page
          const pollId = createdPollUrl.split('/poll/')[1]?.split('/')[0];
          if (pollId) {
            // Use router.push for proper navigation to local voting
            router.push(`/poll/local/${pollId}/`);
          }
        }}
      />
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
  titleButton: ViewStyle;
  titleButtonActive: ViewStyle;
  titleButtonContent: ViewStyle;
  titleButtonLeft: ViewStyle;
  titleButtonRight: ViewStyle;
  titleButtonLabel: TextStyle;
  titleButtonIndicator: ViewStyle;
  titleButtonIndicatorText: TextStyle;
  descriptionSection: ViewStyle;
  descriptionInput: TextStyle;
  descriptionButton: ViewStyle;
  descriptionButtonActive: ViewStyle;
  descriptionButtonContent: ViewStyle;
  descriptionButtonLeft: ViewStyle;
  descriptionButtonRight: ViewStyle;
  descriptionButtonLabel: TextStyle;
  descriptionButtonIndicator: ViewStyle;
  descriptionButtonIndicatorText: TextStyle;
  label: TextStyle;
  sublabel: TextStyle;
  filterSection: ViewStyle;
  filterItem: ViewStyle;
  filterButton: ViewStyle;
  filterButtonActive: ViewStyle;
  filterButtonContent: ViewStyle;
  filterButtonLeft: ViewStyle;
  filterButtonRight: ViewStyle;
  filterButtonLabel: TextStyle;
  filterButtonIndicator: ViewStyle;
  filterButtonIndicatorText: TextStyle;
  activeFilters: ViewStyle;
  activeFiltersText: TextStyle;
  clearFiltersButton: ViewStyle;
  searchSection: ViewStyle;
  searchButton: ViewStyle;
  searchButtonText: TextStyle;
  clearButton: ViewStyle;
  dropdown: ViewStyle;
  dropdownScroll: ViewStyle;
  dropdownItem: ViewStyle;
  dropdownItemSelected: ViewStyle;
  dropdownItemText: TextStyle;
  dropdownItemTextSelected: TextStyle;
  searchAddedSection: ViewStyle;
  sectionHeader: ViewStyle;
  sectionLabel: TextStyle;
  clearSearchButton: ViewStyle;
  clearSearchButtonText: TextStyle;
  searchAddedGameItem: ViewStyle;
  searchAddedIndicator: ViewStyle;
  searchAddedIndicatorText: TextStyle;
  removeSearchGameButton: ViewStyle;
  gamesSection: ViewStyle;
  gamesListSection: ViewStyle;
  gamesHeader: ViewStyle;
  gamesHeaderLeft: ViewStyle;
  gamesHeaderRight: ViewStyle;
  selectAllButton: ViewStyle;
  selectAllButtonText: TextStyle;
  clearAllButton: ViewStyle;
  clearAllButtonText: TextStyle;
  gameItem: ViewStyle;
  gameItemSelected: ViewStyle;
  gameThumbnail: ViewStyle;
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
  optionRow: ViewStyle;
  optionText: TextStyle;
  optionTextSelected: TextStyle;
  gameItemDisabled: ViewStyle;
  gameThumbnailDisabled: ImageStyle;
  gameNameDisabled: TextStyle;
  playerCountDisabled: TextStyle;
  alreadyInPollText: TextStyle;
  checkboxDisabled: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  overlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
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
    borderRadius: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 12,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
    minHeight: 24,
    position: 'relative',
    marginHorizontal: 0,
    paddingBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginTop: 8,
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
    marginBottom: 10,
    width: '100%',
    paddingTop: 4,
  },
  titleInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#333333',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  titleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  titleButtonActive: {
    borderColor: '#ff9654',
    backgroundColor: '#fff5ef',
  },
  titleButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleButtonLeft: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  titleButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleButtonLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 2,
  },
  titleButtonIndicator: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  titleButtonIndicatorText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  descriptionSection: {
    marginBottom: 3,
    width: '100%',
  },
  descriptionInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#333333',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  descriptionButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 0,
  },
  descriptionButtonActive: {
    borderColor: '#ff9654',
    backgroundColor: '#fff5ef',
  },
  descriptionButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  descriptionButtonLeft: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  descriptionButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  descriptionButtonLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 2,
  },
  descriptionButtonIndicator: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  descriptionButtonIndicatorText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  label: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    paddingLeft: 2,
    marginBottom: 0,
    lineHeight: 20,
  },
  sublabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
    paddingLeft: 2,
    marginTop: 6,
    marginBottom: 0,
  },
  filterSection: {
    marginBottom: 10,
    marginTop: 5,
    width: '100%',
    position: 'relative',
    zIndex: 1000,
  },
  filterItem: {
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    position: 'relative',
  },
  filterButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 8,
    padding: 10,
    marginTop: 2,
  },
  filterButtonActive: {
    borderColor: '#ff9654',
    backgroundColor: '#fff5ef',
  },
  filterButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButtonLeft: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  filterButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButtonLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 2,
  },
  filterButtonIndicator: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  filterButtonIndicatorText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  activeFilters: {
    marginTop: 8,
    marginBottom: 0,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    position: 'relative',
  },
  activeFiltersText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
  clearFiltersButton: {
    position: 'absolute',
    right: 8,
    top: 4,
    bottom: 4,
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },

  searchSection: {
    marginBottom: 8,
    marginTop: 0,
  },
  searchButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    padding: 10,
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
  searchAddedSection: {
    marginBottom: 0,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    paddingLeft: 2,
  },
  clearSearchButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  clearSearchButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    color: '#666666',
  },
  searchAddedGameItem: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff5ef',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  searchAddedIndicator: {
    backgroundColor: '#ff9654',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  searchAddedIndicatorText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 10,
    color: '#ffffff',
  },
  removeSearchGameButton: {
    width: 20,
    height: 20,
    marginLeft: 8,
    marginRight: 12,
    borderRadius: 4,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 4,
    width: '100%',
    marginBottom: 0,
    paddingBottom: 0,
  },
  gamesListSection: {
    width: '100%',
    marginBottom: 0,
    paddingBottom: 0,
  },
  gamesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    minHeight: 32,
  },
  gamesHeaderLeft: {
    flex: 1,
  },
  gamesHeaderRight: {
    flexDirection: 'row',
    gap: 6,
  },
  selectAllButton: {
    backgroundColor: '#ff9654',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  selectAllButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    color: '#ffffff',
  },
  clearAllButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  clearAllButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    color: '#666666',
  },
  gameItem: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  gameThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  gameItemSelected: {
    backgroundColor: '#fff5ef',
    borderColor: '#ff9654',
  },
  gameItemDisabled: {
    opacity: 0.7,
    backgroundColor: '#f0f0f0',
    borderColor: '#e1e5ea',
  },
  gameThumbnailDisabled: {
    opacity: 0.7,
    backgroundColor: '#f0f0f0',
  },
  gameInfo: {
    flex: 1,
    marginRight: 8,
  },
  gameName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#333333',
    marginBottom: 4,
  },
  gameNameDisabled: {
    color: '#999999',
  },
  playerCount: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#666666',
  },
  playerCountDisabled: {
    color: '#999999',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
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
  checkboxDisabled: {
    backgroundColor: '#e1e5ea',
    borderColor: '#e1e5ea',
  },
  noGamesText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    padding: 12,
    paddingRight: 14,
    margin: 12,
    borderRadius: 8,
    gap: 3,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#ffffff',
  },
  absoluteBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#1d4ed8',
  },
  absoluteCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  footer: {
    paddingTop: 14,
    paddingBottom: 0,
    paddingLeft: 12,
    paddingRight: 12,
    minHeight: 28,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
  },
  optionTextSelected: {
    color: '#ff9654',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  alreadyInPollText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: '#999999',
    marginTop: 4,
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
