import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { RefreshCw, Search, Star, Filter, Users, Plus, X, Dice6 } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { AddGameModal } from '@/components/AddGameModal';

interface EmptyStateProps {
  username: string | null;
  onRefresh: (username?: string) => void | Promise<void>;
  loadGames: () => void;
  message?: string;
  buttonText?: string;
  showSyncButton?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  username,
  onRefresh,
  loadGames,
  message,
  buttonText = "Refresh",
  showSyncButton = false
}) => {
  const [inputUsername, setInputUsername] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [addGameModalVisible, setAddGameModalVisible] = useState(false);
  const router = useRouter();

  const handleImportCollection = () => {
    if (!inputUsername.trim()) {
      setError('Please enter a BoardGameGeek username');
      return;
    }
    setError('');
    onRefresh(inputUsername.trim());
    setInputUsername('');
    setShowModal(false);
  };

  const openImportModal = () => {
    setShowModal(true);
    setError('');
    setInputUsername('');
  };

  const closeModal = () => {
    setShowModal(false);
    setError('');
    setInputUsername('');
  };

  const modalContent = (
    <View style={styles.modalDialog}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Import BGG Collection</Text>
        <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.modalDescription}>
        Enter your BoardGameGeek username to import your collection
      </Text>

      <View style={styles.modalInputContainer}>
        <TextInput
          style={styles.modalInput}
          placeholder="BGG Username"
          value={inputUsername}
          onChangeText={(text) => {
            setInputUsername(text);
            setError('');
          }}
          onSubmitEditing={handleImportCollection}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
      </View>

      {error ? <Text style={styles.modalErrorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.modalImportButton}
        onPress={handleImportCollection}
      >
        <Search size={20} color="#ffffff" />
        <Text style={styles.modalImportButtonText}>Import Collection</Text>
      </TouchableOpacity>

      <Text style={styles.modalHelpText}>
        Your BoardGameGeek collection must be public to sync games.
      </Text>
    </View>
  );

  if (showSyncButton) {
    return (
      <Animated.View
        entering={FadeIn.duration(500)}
        style={styles.container}
      >
        {/* Die icon */}
        <View style={styles.iconContainer}>
          <Dice6 size={48} color="#ff9654" />
        </View>

        {/* Main heading */}
        <Text style={styles.title}>Add games to your collection!</Text>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Start building your board game collection and unlock these benefits:
        </Text>

        {/* Benefits list */}
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Star size={20} color="#ff9654" />
            <Text style={styles.benefitText}>Track your collection</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Filter size={20} color="#ff9654" />
            <Text style={styles.benefitText}>Easily filter to find the right game</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Users size={20} color="#ff9654" />
            <Text style={styles.benefitText}>Let your friends vote on what they want to play</Text>
          </View>
        </View>

        {/* Add Game Button */}
        <TouchableOpacity
          style={styles.addGameButton}
          onPress={() => setAddGameModalVisible(true)}
        >
          <Plus size={20} color="#ffffff" />
          <Text style={styles.addGameButtonText}>Add Game</Text>
        </TouchableOpacity>

        {/* Or divider */}
        <Text style={styles.orText}>or</Text>

        {/* Import BGG Collection Button */}
        <TouchableOpacity
          style={styles.importButton}
          onPress={openImportModal}
        >
          <Search size={20} color="#ffffff" />
          <Text style={styles.importButtonText}>Import BGG Collection</Text>
        </TouchableOpacity>

        {/* Help text */}
        <Text style={styles.helpText}>
          Your BoardGameGeek collection must be public to sync games.
        </Text>

        {/* Import Modal */}
        {Platform.OS === 'web' ? (
          showModal && (
            <View style={styles.webModalOverlay}>
              {modalContent}
            </View>
          )
        ) : (
          <Modal
            visible={showModal}
            transparent
            animationType="fade"
            onRequestClose={closeModal}
          >
            <View style={styles.modalOverlay}>
              {modalContent}
            </View>
          </Modal>
        )}
        
        <AddGameModal
          isVisible={addGameModalVisible}
          onClose={() => setAddGameModalVisible(false)}
          onGameAdded={loadGames}
        />
      </Animated.View>
    );
  }

  // Fallback for non-sync scenarios
  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={styles.container}
    >
      <Dice6 size={48} color="#8d8d8d" />
      <Text style={styles.emptyTitle}>No Games Found</Text>
      <Text style={styles.emptyMessage}>
        {message || (username ?
          `We couldn't find any games in ${username}'s collection.` :
          'We couldn\'t find any games in your collection.'
        )}
      </Text>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={() => router.push('/collection')}
      >
        <RefreshCw size={18} color="#ffffff" />
        <Text style={styles.refreshText}>{buttonText}</Text>
      </TouchableOpacity>

      <Text style={styles.helpText}>
        Make sure your BoardGameGeek collection is public and contains board games.
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    padding: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#fff5ef',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 300,
    lineHeight: 24,
  },
  benefitsList: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 40,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  benefitText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#1a2b5f',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  addGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  addGameButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
  },
  orText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8d8d8d',
    marginBottom: 16,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  importButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
  },
  helpText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#8d8d8d',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webModalOverlay: {
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
  modalDialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalInputContainer: {
    marginBottom: 16,
  },
  modalInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  modalErrorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#e74c3c',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalImportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalImportButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
  },
  modalHelpText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#8d8d8d',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Legacy styles for non-sync scenarios
  emptyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyMessage: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9654',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  refreshText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
  },
});