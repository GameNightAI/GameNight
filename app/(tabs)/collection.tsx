import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { X, ListFilter, Plus, Camera } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/services/supabase';
import { GameItem } from '@/components/GameItem';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { FilterGameModal, filterGames } from '@/components/FilterGameModal';
import { FilterOption, playerOptions, timeOptions, ageOptions, typeOptions, complexityOptions } from '@/utils/filterOptions';
import { AddGameModal } from '@/components/AddGameModal';
import { CreatePollModal } from '@/components/CreatePollModal';
import { Game } from '@/types/game';

export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  // Use fallback values for web platform
  const safeAreaBottom = Platform.OS === 'web' ? 0 : insets.bottom;
  // const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [addGameModalVisible, setAddGameModalVisible] = useState(false);
  const [createPollModalVisible, setCreatePollModalVisible] = useState(false);

  const router = useRouter();

  const [playerCount, setPlayerCount] = useState<FilterOption[]>([]);
  const [playTime, setPlayTime] = useState<FilterOption[]>([]);
  const [age, setAge] = useState<FilterOption[]>([]);
  const [gameType, setGameType] = useState<FilterOption[]>([]);
  const [complexity, setComplexity] = useState<FilterOption[]>([]);

  const isFiltered = ([
    playerCount,
    playTime,
    age,
    gameType,
    complexity,
  ]).some(_ => _.length);

  // const getCollection = useEffect(() => {
  // }, []);

  const loadGames = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('expansions_players_view')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_expansion', false)  // Eventually, we'll have expansions listed as children of their base games. For now, we exclude them completely.
        .order('name', { ascending: true });

      if (error) throw error;

      const mappedGames = data.map(game => ({
        id: game.bgg_game_id,
        name: game.name,
        yearPublished: game.year_published,
        thumbnail: game.thumbnail || 'https://via.placeholder.com/150?text=No+Image',
        image: game.image_url || 'https://via.placeholder.com/300?text=No+Image',
        min_players: game.min_players,
        max_players: game.max_players,
        playing_time: game.playing_time,
        minPlaytime: game.minplaytime,
        maxPlaytime: game.maxplaytime,
        description: game.description || '',
        minAge: game.min_age,
        is_cooperative: game.is_cooperative || false,
        is_teambased: game.is_teambased || false,
        complexity: game.complexity,
        complexity_tier: game.complexity_tier,
        complexity_desc: game.complexity_desc || '',
        average: game.average,
        bayesaverage: game.bayesaverage,
        min_exp_players: game.min_exp_players,
        max_exp_players: game.max_exp_players,
      }));

      setAllGames(mappedGames);
      const filteredGames = filterGames(mappedGames, playerCount, playTime, age, gameType, complexity);
      setGames(filteredGames);

    } catch (err) {
      console.error('Error in loadGames:', err);
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
      setRefreshing(false);

    }
  }, []);

  // const filteredGames = filterGames(games, playerCount, playTime, age, gameType, complexity);

  const handleDelete = useCallback(async () => {
    if (!gameToDelete) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('bgg_game_id', gameToDelete.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setAllGames(prevGames => prevGames.filter(game => game.id !== gameToDelete.id));
      setGames(prevGames => prevGames.filter(game => game.id !== gameToDelete.id));
    } catch (err) {
      console.error('Error deleting game:', err);
    } finally {
      setGameToDelete(null);
    }
  }, [gameToDelete]);

  const applyFilters = useCallback(() => {
    const filteredGames = filterGames(allGames, playerCount, playTime, age, gameType, complexity);
    setGames(filteredGames);
  }, [allGames, playerCount, playTime, age, gameType, complexity]);

  const clearFilters = () => {
    setPlayerCount([]);
    setPlayTime([]);
    setAge([]);
    setGameType([]);
    setComplexity([]);
    // Immediately show all games when filters are cleared
    if (allGames.length > 0) {
      setGames(allGames);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGames();
  }, [loadGames]);

  // Convert collection filters to CreatePollModal format
  const convertFiltersForPoll = () => {
    const convertedFilters = {
      playerCount: playerCount,
      playTime: playTime,
      minAge: age,
      gameType: gameType,
      complexity: complexity,
    };
    return convertedFilters;
  };

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    if (allGames.length > 0) {
      applyFilters();
    }
  }, [applyFilters]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadGames} />;
  }

  if ((!filterModalVisible) && games.length === 0 && !loading) {
    return (
      <EmptyState
        username={null}
        onRefresh={loadGames}
        loadGames={loadGames}
        message={isFiltered ? 'No games found' : undefined}
        buttonText={isFiltered ? "Clear Filters" : undefined}
        showSyncButton={!isFiltered}
        handleClearFilters={clearFilters}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.countText}>{games.length} games</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsSection}
        >
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <ListFilter size={20} color="#ff9654" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setAddGameModalVisible(true)}
          >
            <Plus size={20} color="#ff9654" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createPollButton}
            onPress={() => setCreatePollModalVisible(true)}
          >
            <Plus size={20} color="#ffffff" />
            <Text style={styles.createPollButtonText}>Create Poll</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {isFiltered && (
        <View style={styles.filterBanner}>
          <View style={styles.filterBannerContent}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setFilterModalVisible(true)}
            >
              <Text style={styles.clearButtonText}>Edit Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={games}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item, index }) => (
          <Animated.View>
            <GameItem
              game={item}
              onDelete={() => setGameToDelete(item)}
            />
          </Animated.View>
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: 80 + safeAreaBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ff9654']}
            tintColor="#ff9654"
          />
        }
      />

      <ConfirmationDialog
        isVisible={gameToDelete !== null}
        title="Delete Game"
        message={`Are you sure you want to remove ${gameToDelete?.name} from your GameNyte collection?\n\n(This will not affect your BGG collection.)`}
        onConfirm={handleDelete}
        onCancel={() => setGameToDelete(null)}
      />

      <FilterGameModal
        isVisible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApplyFilters={() => setFilterModalVisible(false)}
        title="Filter Your Collection"
        description="All filters (optional)"
        applyButtonText="Filter Games"
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
            value: age,
            onChange: setAge,
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

      <AddGameModal
        isVisible={addGameModalVisible}
        onClose={() => setAddGameModalVisible(false)}
        onGameAdded={loadGames}
        userCollectionIds={allGames.map(g => g.id.toString())}
      />

      <CreatePollModal
        isVisible={createPollModalVisible}
        onClose={() => setCreatePollModalVisible(false)}
        onSuccess={(pollType) => {
          setCreatePollModalVisible(false);
          // Navigate to polls tab with refresh parameter
          router.push('/(tabs)/polls?refresh=true');
        }}
        initialFilters={convertFiltersForPoll()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f7f9fc',
  },
  titleSection: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  countText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    backgroundColor: '#fff',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  filterBanner: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  filterBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  createPollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9654',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    marginRight: 8,
  },
  createPollButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },

  listContent: {
    padding: 16,
  },

});