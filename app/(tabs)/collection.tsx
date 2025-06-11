import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { RefreshCw, X, Search, Plus } from 'lucide-react-native';

import { supabase } from '@/services/supabase';
import { fetchGames } from '@/services/bggApi';
import { GameItem } from '@/components/GameItem';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { SyncModal } from '@/components/SyncModal';
import { FindGameModal } from '@/components/FindGameModal';
import { AddGameModal } from '@/components/AddGameModal';
import { Game } from '@/types/game';

export default function CollectionScreen() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [findModalVisible, setFindModalVisible] = useState(false);
  const [addGameModalVisible, setAddGameModalVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();
  const { players, time, unlimited } = useLocalSearchParams<{ 
    players?: string;
    time?: string;
    unlimited?: string;
  }>();

  const isFiltered = Boolean(players || time);

  const loadGames = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('collections_games')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      const mappedGames = data.map(game => ({
        id: game.bgg_game_id,
        name: game.name,
        yearPublished: game.year_published,
        thumbnail: game.thumbnail || 'https://via.placeholder.com/150?text=No+Image',
        image: game.thumbnail || 'https://via.placeholder.com/300?text=No+Image',
        minplayers: game.min_players,
        maxplayers: game.max_players,
        playingTime: game.playing_time,
        minplaytime: game.minplaytime,
        maxplaytime: game.maxplaytime,
        description: game.description || '',
      }));

      // Filter games based on player count and play time
      const filteredGames = mappedGames.filter(game => {
        let matches = true;
        
        if (players) {
          const playerCount = parseInt(players);
          matches = matches && game.minplayers <= playerCount && game.maxplayers >= playerCount;
        }
        
        if (time && unlimited !== '1') {
          const maxTime = parseInt(time);
          matches = matches && game.playingTime <= maxTime;
        }
        
        return matches;
      });

      setGames(filteredGames);
    } catch (err) {
      console.error('Error in loadGames:', err);
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, players, time, unlimited]);

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

      setGames(prevGames => prevGames.filter(game => game.id !== gameToDelete.id));
    } catch (err) {
      console.error('Error deleting game:', err);
    } finally {
      setGameToDelete(null);
    }
  }, [gameToDelete]);

  const handleSync = async (username: string) => {
    try {
      setSyncing(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const bggGames = await fetchGames(username);

      if (!bggGames || bggGames.length === 0) {
        setError('No games found in collection. Make sure your collection is public and contains board games.');
        return;
      }

      // Create a Map to store unique games, using bgg_game_id as the key
      const uniqueGames = new Map();
      
      // Only keep the last occurrence of each game ID
      bggGames.forEach(game => {
        uniqueGames.set(game.id, {
          user_id: user.id,
          bgg_game_id: game.id,
          name: game.name,
          thumbnail: game.thumbnail,
          min_players: game.minplayers,
          max_players: game.maxplayers,
          playing_time: game.playingTime,
          minplaytime: game.minplaytime,
          maxplaytime: game.maxplaytime,
          year_published: game.yearPublished,
        });
      });

      // Convert the Map values back to an array
      const uniqueGamesList = Array.from(uniqueGames.values());

      const { error: insertError } = await supabase
        .from('collections')
        .upsert(uniqueGamesList, { onConflict: 'user_id,bgg_game_id' });

      if (insertError) throw insertError;

      await loadGames();
    } catch (err) {
      console.error('Error in handleSync:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync games');
    } finally {
      setSyncing(false);
    }
  };

  const handleFind = (players: string, time?: string, unlimited?: boolean) => {
    const params: { players: string; time?: string; unlimited?: string } = { players };
    if (time) {
      params.time = time;
      params.unlimited = unlimited ? '1' : '0';
    }
    router.setParams(params);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGames();
  }, [loadGames]);

  const clearFilters = () => {
    router.push('/collection');
  };

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadGames} />;
  }

  if (games.length === 0 && !loading) {
    return (
      <EmptyState 
        username={null} 
        onRefresh={handleSync}
        message={
          isFiltered 
            ? `No games found for ${players} players${time ? ` within ${time}${unlimited === '1' ? '+' : ''} minutes` : ''}`
            : undefined
        }
        buttonText={isFiltered ? "Clear Filters" : undefined}
        showSyncButton={!isFiltered}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>
            {isFiltered ? 
              `Games for ${players} Players${time ? ` (${time}${unlimited === '1' ? '+' : ''} min)` : ''}` 
              : 'My Collection'}
          </Text>
          <Text style={styles.countText}>{games.length} games</Text>
        </View>
        
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.findButton}
            onPress={() => setFindModalVisible(true)}
          >
            <Search size={20} color="#ff9654" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.findButton}
            onPress={() => setAddGameModalVisible(true)}
          >
            <Plus size={20} color="#ff9654" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.syncButton}
            onPress={() => setSyncModalVisible(true)}
          >
            <RefreshCw size={20} color="#ff9654" />
            <Text style={styles.syncButtonText}>Sync with BGG</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isFiltered && (
        <View style={styles.filterBanner}>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearFilters}
          >
            <X size={16} color="#666666" />
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={games}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeIn.delay(index * 100).duration(300)}>
            <GameItem 
              game={item} 
              onDelete={() => setGameToDelete(item)}
            />
          </Animated.View>
        )}
        contentContainerStyle={styles.listContent}
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
        message={`Are you sure you want to remove ${gameToDelete?.name} from your collection?`}
        onConfirm={handleDelete}
        onCancel={() => setGameToDelete(null)}
      />

      <SyncModal
        isVisible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
        onSync={handleSync}
        loading={syncing}
      />

      <FindGameModal
        isVisible={findModalVisible}
        onClose={() => setFindModalVisible(false)}
        onSearch={handleFind}
      />

      <AddGameModal
        isVisible={addGameModalVisible}
        onClose={() => setAddGameModalVisible(false)}
        onGameAdded={loadGames}
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
  findButton: {
    backgroundColor: '#fff',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  syncButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
    marginLeft: 8,
  },
  filterBanner: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
