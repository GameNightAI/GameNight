import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, ScrollView, TextInput, Dimensions, Platform, Image } from 'react-native';
import { X, Plus, Check, Users, ChevronDown, ChevronUp, Clock, Brain, Users as Users2, Baby, ArrowLeft, SquarePen } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { Game } from '@/types/game';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import Select from 'react-select';
import { useDeviceType } from '@/hooks/useDeviceType';
import { isSafari } from '@/utils/safari-polyfill';
import { CreatePollTitleModal } from './CreatePollTitleModal';
import { CreatePollDescrModal } from './CreatePollDescrModal';
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
  const deviceType = useDeviceType();
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollTitle, setPollTitle] = useState('');
  const [defaultTitle, setDefaultTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  // Modal states
  const [isTitleModalVisible, setIsTitleModalVisible] = useState(false);
  const [isDescriptionModalVisible, setIsDescriptionModalVisible] = useState(false);

  // Filter states - changed to arrays for multi-select
  const [playerCount, setPlayerCount] = useState<any[]>([]);
  const [playTime, setPlayTime] = useState<any[]>([]);
  const [minAge, setMinAge] = useState<any[]>([]);
  const [gameType, setGameType] = useState<any[]>([]);
  const [complexity, setComplexity] = useState<any[]>([]);

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

  const filterGames = useCallback(() => {
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
  }, [availableGames, playerCount, playTime, minAge, gameType, complexity]);

  useEffect(() => {
    filterGames();
  }, [filterGames]);

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

  // Modal handlers
  const handleTitleSave = (title: string) => {
    setPollTitle(title);
  };

  const handleDescriptionSave = (description: string) => {
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
        <Text style={styles.title}>
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
              <TouchableOpacity
                style={[styles.titleButton, pollTitle && styles.titleButtonActive]}
                onPress={() => setIsTitleModalVisible(true)}
              >
                <View style={styles.titleButtonContent}>
                  <View style={styles.titleButtonLeft}>
                    <Text style={styles.titleButtonLabel}>Poll Title (Optional)</Text>
                    <Text style={styles.titleButtonValue}>
                      {pollTitle || 'Click to set title'}
                    </Text>
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
                onPress={() => setIsDescriptionModalVisible(true)}
              >
                <View style={styles.descriptionButtonContent}>
                  <View style={styles.descriptionButtonLeft}>
                    <Text style={styles.descriptionButtonLabel}>Description (Optional)</Text>
                    <Text style={styles.titleButtonValue}>
                      {pollDescription || 'Click to add description'}
                    </Text>
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
          <Text style={styles.label}>Filter Games</Text>
          <Text style={styles.sublabel}>
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
            styles={selectStyles0}
            onMenuOpen={() => handleDropdownChange(0, true)}
            onMenuClose={() => handleDropdownChange(0, false)}
            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
            menuPosition="fixed"
            formatOptionLabel={(option: any) => {
              const isSelected = playerCount.some(p => p.value === option.value);
              return (
                <View style={styles.optionRow}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check size={12} color="#ffffff" />}
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                </View>
              );
            }}
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
            styles={selectStyles1}
            onMenuOpen={() => handleDropdownChange(1, true)}
            onMenuClose={() => handleDropdownChange(1, false)}
            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
            menuPosition="fixed"
            formatOptionLabel={(option: any) => {
              const isSelected = playTime.some(t => t.value === option.value);
              return (
                <View style={styles.optionRow}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check size={12} color="#ffffff" />}
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                </View>
              );
            }}
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
            styles={selectStyles2}
            onMenuOpen={() => handleDropdownChange(2, true)}
            onMenuClose={() => handleDropdownChange(2, false)}
            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
            menuPosition="fixed"
            formatOptionLabel={(option: any) => {
              const isSelected = minAge.some(a => a.value === option.value);
              return (
                <View style={styles.optionRow}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check size={12} color="#ffffff" />}
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                </View>
              );
            }}
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
            styles={selectStyles3}
            onMenuOpen={() => handleDropdownChange(3, true)}
            onMenuClose={() => handleDropdownChange(3, false)}
            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
            menuPosition="fixed"
            formatOptionLabel={(option: any) => {
              const isSelected = gameType.some(t => t.value === option.value);
              return (
                <View style={styles.optionRow}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check size={12} color="#ffffff" />}
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                </View>
              );
            }}
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
            styles={selectStyles4}
            onMenuOpen={() => handleDropdownChange(4, true)}
            onMenuClose={() => handleDropdownChange(4, false)}
            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
            menuPosition="fixed"
            formatOptionLabel={(option: any) => {
              const isSelected = complexity.some(c => c.value === option.value);
              return (
                <View style={styles.optionRow}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check size={12} color="#ffffff" />}
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                </View>
              );
            }}
          />
        </View>

        <View style={styles.gamesSection}>
          <View style={styles.gamesHeader}>
            <Text style={styles.label}>Select Games</Text>
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

          <Text style={[styles.sublabel, { marginBottom: 16 }]}>
            {(playerCount.length || playTime.length || minAge.length || gameType.length || complexity.length)
              ? `Games that match your filters`
              : isAddingToExistingPoll
                ? 'Choose additional games from your collection to add to the poll'
                : 'Choose games from your collection to include in the poll'}
          </Text>

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
                  <Image
                    source={{ uri: game.thumbnail || game.image || 'https://via.placeholder.com/60?text=No+Image' }}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 6,
                      backgroundColor: '#f0f0f0',
                      marginRight: 8,
                    }}
                    resizeMode="cover"
                  />
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
          style={[styles.createButton, loading || selectedGames.length === 0 ? styles.createButtonDisabled : undefined]}
          onPress={isAddingToExistingPoll ? handleAddGames : handleCreatePoll}
          disabled={loading || selectedGames.length === 0}
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
        maxWidth: isMobile ? '95%' : 800,
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
      {/* Title Modal */}
      <CreatePollTitleModal
        isVisible={isTitleModalVisible}
        onClose={() => setIsTitleModalVisible(false)}
        onSave={handleTitleSave}
        currentTitle={pollTitle}
      />

      {/* Description Modal */}
      <CreatePollDescrModal
        isVisible={isDescriptionModalVisible}
        onClose={() => setIsDescriptionModalVisible(false)}
        onSave={handleDescriptionSave}
        currentDescription={pollDescription}
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
  titleButtonValue: TextStyle;
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
  descriptionButtonValue: TextStyle;
  descriptionButtonIndicator: ViewStyle;
  descriptionButtonIndicatorText: TextStyle;
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
  titleButtonValue: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
  },
  titleButtonIndicator: {
    backgroundColor: '#4ade80',
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
    marginBottom: 10,
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
  descriptionButtonValue: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
  },
  descriptionButtonIndicator: {
    backgroundColor: '#4ade80',
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
    marginBottom: 4,
  },
  sublabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
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
    marginTop: 4,
    width: '100%',
    marginBottom: 0,
    paddingBottom: 0,
  },
  gamesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
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
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#333333',
    marginBottom: 4,
  },
  playerCount: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#666666',
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
    top: 20,
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
    top: 20,
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
