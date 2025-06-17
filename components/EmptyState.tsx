import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Package, RefreshCw, Link2, Search } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface EmptyStateProps {
  username: string | null;
  onRefresh: (username?: string) => void | Promise<void>;
  message?: string;
  buttonText?: string;
  showSyncButton?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  username,
  onRefresh,
  message,
  buttonText = "Refresh",
  showSyncButton = false
}) => {
  const [inputUsername, setInputUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!inputUsername.trim()) {
      setError('Please enter a BoardGameGeek username');
      return;
    }
    setError('');
    onRefresh(inputUsername.trim());
    setInputUsername('');
  };

  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={styles.container}
    >
      <Package size={48} color="#8d8d8d" />
      <Text style={styles.emptyTitle}>No Games Found</Text>
      <Text style={styles.emptyMessage}>
        {message || (showSyncButton ?
          'Enter your BoardGameGeek username to import your collection' :
          username ?
            `We couldn't find any games in ${username}'s collection.` :
            'We couldn\'t find any games in your collection.'
        )}
      </Text>

      {showSyncButton && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter BGG Username"
            value={inputUsername}
            onChangeText={(text) => {
              setInputUsername(text);
              setError('');
            }}
            onSubmitEditing={handleSubmit}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={styles.importButton}
            onPress={handleSubmit}
          >
            <Search size={18} color="#ffffff" />
            <Text style={styles.importButtonText}>Import Collection</Text>
          </TouchableOpacity>
        </View>
      )}

      {!showSyncButton && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => onRefresh()}
        >
          <RefreshCw size={18} color="#ffffff" />
          <Text style={styles.refreshText}>{buttonText}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.helpText}>
        {showSyncButton ?
          'Your BoardGameGeek collection must be public to sync games.' :
          'Make sure your BoardGameGeek collection is public and contains board games.'
        }
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
  inputContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 24,
  },
  input: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#e74c3c',
    marginBottom: 12,
    textAlign: 'center',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  importButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
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
  helpText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#8d8d8d',
    textAlign: 'center',
    maxWidth: 280,
  },
});