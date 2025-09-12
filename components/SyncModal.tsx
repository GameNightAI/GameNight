import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Platform, ActivityIndicator, Animated } from 'react-native';
import { Search, X, Info, CheckCircle } from 'lucide-react-native';

interface SyncModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSync: (username: string) => Promise<void>;
  loading?: boolean;
  syncProgress?: {
    stage: 'connecting' | 'fetching' | 'processing' | 'saving' | 'complete';
    message: string;
    progress?: number;
  } | null;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isVisible,
  onClose,
  onSync,
  loading = false,
  syncProgress,
}) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (loading && syncProgress?.stage !== 'complete') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [loading, syncProgress?.stage, pulseAnim]);

  const handleSync = async () => {
    if (!username.trim()) {
      setError('Please enter a BoardGameGeek username');
      return;
    }
    setError('');
    try {
      await onSync(username.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync collection');
    }
  };

  const getProgressMessage = () => {
    if (!syncProgress) return 'Importing Games...';
    return syncProgress.message;
  };

  const getProgressIcon = () => {
    if (syncProgress?.stage === 'complete') {
      return <CheckCircle size={20} color="#10b981" />;
    }
    return <ActivityIndicator color="#ffffff" size="small" />;
  };

  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Connect to BoardGameGeek</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        Enter your BoardGameGeek username to import your collection
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="BGG Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.syncButton, loading && styles.syncButtonDisabled]}
        onPress={handleSync}
        disabled={loading}
      >
        {loading ? (
          <Animated.View style={[styles.loadingContainer, { opacity: pulseAnim }]}>
            {getProgressIcon()}
            <Text style={styles.syncButtonText}>{getProgressMessage()}</Text>
          </Animated.View>
        ) : (
          <>
            <Search color="#fff" size={20} />
            <Text style={styles.syncButtonText}>Import Collection</Text>
          </>
        )}
      </TouchableOpacity>

      {syncProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${syncProgress.progress || 0}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {syncProgress.stage === 'complete' ? 'Collection imported successfully!' : getProgressMessage()}
          </Text>
        </View>
      )}
    </View>
  );

  if (Platform.OS === 'web') {
    if (!isVisible) return null;
    return (
      <View style={styles.webOverlay}>
        <View style={styles.webModalContainer}>
          {content}
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
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
    padding: 20,
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
  },
  webModalContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: 400,
    margin: 20,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
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
  inputContainer: {
    marginBottom: 20,
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
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#e74c3c',
    marginBottom: 16,
  },
  syncButton: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e1e5ea',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff9654',
    borderRadius: 2,
  },
  progressText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
  },
});
