import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCw, Search, Star, Filter, Users, Plus } from 'lucide-react-native';
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
  handleClearFilters: any;
  onSyncClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  username,
  onRefresh,
  loadGames,
  message,
  buttonText = "Refresh",
  showSyncButton = false,
  handleClearFilters,
  onSyncClick
}) => {
  const [addGameModalVisible, setAddGameModalVisible] = useState(false);
  const router = useRouter();

  const handleImportCollection = () => {
    if (onSyncClick) {
      onSyncClick();
    } else {
      // Fallback to old behavior if onSyncClick is not provided
      onRefresh();
    }
  };


  if (showSyncButton) {
    return (
      <Animated.View
        entering={FadeIn.duration(500)}
        style={styles.container}
      >
        {/* Main heading */}
        <Text style={styles.title}>Add games to your collection!</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Enable these benefits:
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
          activeOpacity={0.8}
        >
          <Plus size={20} color="#ffffff" />
          <Text style={styles.addGameButtonText}>Add Games</Text>
        </TouchableOpacity>

        {/* Or divider */}
        <Text style={styles.orText}>or</Text>

        {/* Import BGG Collection Button */}
        <TouchableOpacity
          style={styles.importButton}
          onPress={handleImportCollection}
          activeOpacity={0.8}
        >
          <Search size={20} color="#ffffff" />
          <Text style={styles.importButtonText}>Import BGG Collection</Text>
        </TouchableOpacity>

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
      <Text style={styles.emptyTitle}>No Games Found</Text>
      <Text style={styles.emptyMessage}>
        {message || (username ?
          `We couldn't find any games in ${username}'s collection.` :
          'We couldn\'t find any games in your collection.'
        )}
      </Text>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={handleClearFilters}
      >
        <RefreshCw size={18} color="#ffffff" />
        <Text style={styles.refreshText}>{buttonText}</Text>
      </TouchableOpacity>

      <Text style={styles.helpText}>
        Make sure your BoardGameGeek collection contains board games.
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
    marginBottom: 16,
    maxWidth: 300,
    lineHeight: 24,
  },
  benefitsList: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
    //borderColor: 'red',
    //borderWidth: 1,
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