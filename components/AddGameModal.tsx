import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Platform, ActivityIndicator, FlatList, Image } from 'react-native';
import { Search, X, Plus, Camera } from 'lucide-react-native';
import { XMLParser } from 'fast-xml-parser';
import { supabase } from '@/services/supabase';
import { debounce } from 'lodash';
import { useRouter } from 'expo-router';
import { AddImageModal } from './AddImageModal';
import { AddResultsModal } from './AddResultsModal';
import { useAddGameModalFlow } from '@/hooks/useAddGameModalFlow';

interface Game {
  id: string;
  name: string;
  yearPublished?: string;
  thumbnail?: string;
  image_url?: string;
}

interface AddGameModalProps {
  isVisible: boolean;
  onClose: () => void;
  onGameAdded: () => void;
}

export const AddGameModal: React.FC<AddGameModalProps> = ({
  isVisible,
  onClose,
  onGameAdded,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [adding, setAdding] = useState(false);

  const {
    modalState,
    modalActions,
  } = useAddGameModalFlow();

  const fetchSearchResults = useCallback(async (term: string) => {
    try {
      // Perform an API request based on the search term
      const response = await fetch(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(term)}&type=boardgame`);

      const xmlText = await response.text();

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
      });

      const result = parser.parse(xmlText);

      // No search results returned by API
      if (!result.items || !result.items.item) {
        setSearchResults([]);
      } else {
        const items = Array.isArray(result.items.item) ? result.items.item : [result.items.item];

        const ids = items
          .filter((item: any) => item.name.type === 'primary')
          .map((item: any) => item.id);

        const { data: games } = await supabase
          .from('games')
          .select()
          .in('id', ids)
          .order('rank');

        setSearchResults(games || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Handle the error, e.g., show an error message to the user
    } finally {
      setSearching(false);
    }
  }, []);

  const debouncedSearch = useMemo(() => {
    return debounce(fetchSearchResults, 500);
  }, [fetchSearchResults]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setError('Please enter a search term');
      return;
    }
    setSearching(true);
    setError('');
    debouncedSearch(text);
  };

  const handleAddGame = async (game: Game) => {
    try {
      setAdding(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if the game already exists in the collection
      const { data: existingGames } = await supabase
        .from('collections')
        .select('id')
        .eq('user_id', user.id)
        .eq('bgg_game_id', game.id);

      if (existingGames && existingGames.length > 0) {
        setError(`${game.name} is already in your collection`);
        return;
      }

      // Fetch detailed game info
      const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${game.id}&stats=1`);
      const xmlText = await response.text();

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
      });

      const result = parser.parse(xmlText);
      const gameInfo = result.items.item;

      const gameData = {
        user_id: user.id,
        bgg_game_id: parseInt(game.id),
        name: game.name,
        thumbnail: gameInfo.thumbnail,
        min_players: parseInt(gameInfo.minplayers.value),
        max_players: parseInt(gameInfo.maxplayers.value),
        playing_time: parseInt(gameInfo.playingtime.value),
        year_published: game.yearPublished ? parseInt(game.yearPublished) : null,
      };

      const { error: insertError } = await supabase
        .from('collections')
        .upsert(gameData);

      if (insertError) throw insertError;

      onGameAdded();
      onClose();
    } catch (err) {
      console.error('Add game error:', err);
      setError('Failed to add game to collection');
    } finally {
      setAdding(false);
    }
  };

  const handleImageAnalysisComplete = (imageData: { uri: string; name: string; type: string }, analysisResults?: any) => {
    modalActions.setImageData(imageData);
    if (analysisResults) {
      modalActions.setAnalysisResults(analysisResults);
    }
    modalActions.next();
  };

  const handleCloseModal = () => {
    modalActions.reset();
    onClose();
  };

  const handleBackToSelect = () => {
    modalActions.back();
  };

  const renderSelectStep = () => (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Game</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        Search for games to add to your collection
      </Text>

      <View style={styles.analyzeContainer}>
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={() => modalActions.next()}
        >
          <Camera size={20} color="#ff9654" />
          <Text style={styles.analyzeButtonText}>Analyze Image</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search for games..."
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        style={styles.resultsList}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={styles.resultItem}>
            <Image
              source={{ uri: item.image_url }}
              style={styles.thumbnail}
              resizeMode="contain"
            />
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle}>{item.name}</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, adding && styles.addButtonDisabled]}
              onPress={() => handleAddGame(item)}
              disabled={adding}
            >
              <Plus size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searching ? 'Searching...' : 'No games found'}
          </Text>
        }
      />
    </View>
  );

  const content = (() => {
    switch (modalState.step) {
      case 'select':
        return renderSelectStep();
      case 'image':
        return (
          <AddImageModal
            isVisible={true}
            onClose={handleCloseModal}
            onNext={handleImageAnalysisComplete}
            onBack={handleBackToSelect}
          />
        );
      case 'results':
        return (
          <AddResultsModal
            isVisible={true}
            onClose={handleCloseModal}
            onBack={handleBackToSelect}
            imageData={modalState.imageData || null}
            analysisResults={modalState.analysisResults || null}
          />
        );
      default:
        return renderSelectStep();
    }
  })();

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
      onRequestClose={handleCloseModal}
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
    padding: Platform.OS === 'ios' ? 20 : 10,
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
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
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
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  analyzeContainer: {
    marginBottom: 20,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  analyzeButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
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
  searchButton: {
    backgroundColor: '#ff9654',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#e74c3c',
    marginBottom: 16,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f7f9fc',
    padding: 12,
    paddingLeft: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultInfo: {
    flex: 1,
    marginRight: 12,
  },
  resultTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
  },
  resultYear: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#ff9654',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginLeft: 0,
    marginRight: 6,
    backgroundColor: '#f0f0f0',
  },
});