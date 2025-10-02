import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Image } from 'react-native';
import { X, Camera, RefreshCw, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { AddImageModal } from './AddImageModal';
import { AddResultsModal } from './AddResultsModal';
import { useAddGameModalFlow } from '@/hooks/useAddGameModalFlow';
import { GameSearchModal } from './GameSearchModal';
import { SyncModal } from './SyncModal';
import { Game } from '@/types/game';
import { supabase } from '@/services/supabase';
import { fetchGames } from '@/services/bggApi';

const sampleImage1 = require('@/assets/images/sample-game-1.png');

interface AddGameModalProps {
  isVisible: boolean;
  onClose: () => void;
  onGameAdded: () => void;
  userCollectionIds?: string[];
}

export const AddGameModal: React.FC<AddGameModalProps> = ({
  isVisible,
  onClose,
  onGameAdded,
  userCollectionIds = [],
}) => {
  const router = useRouter();
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [fullSizeImageVisible, setFullSizeImageVisible] = useState(false);
  const [fullSizeImageSource, setFullSizeImageSource] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const {
    modalState,
    modalActions,
  } = useAddGameModalFlow();

  const showFullSizeImage = (imageSource: any) => {
    setFullSizeImageSource(imageSource);
    setFullSizeImageVisible(true);
  };

  const hideFullSizeImage = () => {
    setFullSizeImageVisible(false);
    setFullSizeImageSource(null);
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

  const handleGameAdded = (game: Game) => {
    onGameAdded();
    setSearchModalVisible(false);
  };

  const handleSync = async (username: string) => {
    try {
      setSyncing(true);
      setSyncError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      if (!username || !username.trim()) {
        setSyncError('Please enter a valid BoardGameGeek username');
        return;
      }

      username = username.replace('@', ''); // Requested in GAM-134 ("Ignore @ when people enter BGG ID")
      const bggGames = await fetchGames(username);

      if (!bggGames || bggGames.length === 0) {
        setSyncError('No games found in collection. Make sure your collection is public and contains board games.');
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
          min_players: game.min_players,
          max_players: game.max_players,
          playing_time: game.playing_time,
          minplaytime: game.minPlaytime,
          maxplaytime: game.maxPlaytime,
          year_published: game.yearPublished,
          description: game.description,
        });
      });

      // Convert the Map values back to an array
      const uniqueGamesList = Array.from(uniqueGames.values());

      const { error: insertError } = await supabase
        .from('collections')
        .upsert(uniqueGamesList, { onConflict: 'user_id,bgg_game_id' });

      if (insertError) throw insertError;

      // Refresh the games list and show success message
      onGameAdded();

      Toast.show({ type: 'success', text1: 'Collection imported!' });
      setSyncModalVisible(false);
    } catch (err) {
      console.error('Error in handleSync:', err);
      setSyncError(err instanceof Error ? err.message : 'Failed to sync games');
    } finally {
      setSyncing(false);
    }
  };

  const renderSelectStep = () => (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Game(s)</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        Search for games to add to your collection
      </Text>

      <View style={styles.buttonsContainer}>
        <View style={styles.analyzeContainer}>
          <View style={styles.sampleImageContainer}>
            <TouchableOpacity
              style={styles.sampleImageTouchable}
              onPress={() => showFullSizeImage(sampleImage1)}
            >
              <Image source={sampleImage1} style={styles.sampleImage} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={() => modalActions.next()}
          >
            <Camera size={20} color="#fff" />
            <Text style={styles.analyzeButtonText}>Add Games With A Photo</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => setSearchModalVisible(true)}
        >
          <Search size={16} color="#fff" />
          <Text style={styles.searchButtonText}>Search for Games</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.syncButton}
          onPress={() => setSyncModalVisible(true)}
        >
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.syncButtonText}>Sync with BGG</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Full-size image modal
  const fullSizeImageModal = (
    <Modal
      visible={fullSizeImageVisible}
      transparent
      animationType="fade"
      onRequestClose={hideFullSizeImage}
    >
      <TouchableOpacity
        style={styles.fullSizeOverlay}
        activeOpacity={1}
        onPress={hideFullSizeImage}
      >
        <TouchableOpacity
          style={styles.fullSizeImageContainer}
          activeOpacity={1}
          onPress={hideFullSizeImage}
        >
          <Image
            source={fullSizeImageSource}
            style={styles.fullSizeImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.fullSizeCloseButton}
            onPress={hideFullSizeImage}
          >
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
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
            onGamesAdded={onGameAdded}
          />
        );
      default:
        return renderSelectStep();
    }
  })();

  if (Platform.OS === 'web') {
    if (!isVisible) return null;
    return (
      <>
        <View style={styles.webOverlay}>
          {content}
        </View>
        {fullSizeImageModal}
        <GameSearchModal
          isVisible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
          mode="collection"
          onGameAdded={handleGameAdded}
          userCollectionIds={userCollectionIds}
          title="Add to Collection"
          searchPlaceholder="Search for games..."
        />
        <SyncModal
          isVisible={syncModalVisible}
          onClose={() => setSyncModalVisible(false)}
          onSync={handleSync}
          loading={syncing}
        />
      </>
    );
  }

  return (
    <>
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
      {fullSizeImageModal}
      <GameSearchModal
        isVisible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        mode="collection"
        onGameAdded={handleGameAdded}
        userCollectionIds={userCollectionIds}
        title="Add to Collection"
        searchPlaceholder="Search for games..."
      />
      <SyncModal
        isVisible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
        onSync={handleSync}
        loading={syncing}
      />
    </>
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
    marginBottom: 0,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  analyzeButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
  searchButton: {
    backgroundColor: '#6c757d',
    // borderWidth: 1,
    borderColor: '#ff9654',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#fff',
    marginLeft: 8,
  },
  syncButton: {
    backgroundColor: '#6c757d',
    //borderWidth: 1,
    borderColor: '#ff9654',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  syncButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#fff',
    marginLeft: 8,
  },

  sampleImageContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  sampleImageTouchable: {
    width: 200,
    height: 200,
    overflow: 'hidden',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  sampleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  fullSizeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullSizeImageContainer: {
    position: 'relative',
    width: '90%',
    height: '80%',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fullSizeImage: {
    width: '100%',
    height: '100%',
  },
  fullSizeCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  buttonsContainer: {
    flexDirection: 'column',
    gap: 16,
  },
});