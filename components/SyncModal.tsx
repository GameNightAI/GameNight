import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Info, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';

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
  const { colors, typography, touchTargets } = useTheme();
  const { announceForAccessibility, isReduceMotionEnabled } = useAccessibility();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors, typography, insets), [colors, typography, insets]);

  useEffect(() => {
    if (!loading) return;
    if (!syncProgress) return;
    if (syncProgress.stage === 'complete') {
      announceForAccessibility('Collection imported successfully');
    } else if (syncProgress.message) {
      announceForAccessibility(syncProgress.message);
    }
  }, [loading, syncProgress?.stage, syncProgress?.message, announceForAccessibility]);

  const handleSync = async () => {
    if (!username.trim()) {
      setError('Please enter a BoardGameGeek username');
      announceForAccessibility('Please enter a BoardGameGeek username');
      return;
    }
    setError('');
    try {
      await onSync(username.trim());
      announceForAccessibility('Starting collection import');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync collection');
      announceForAccessibility('Failed to sync collection');
    }
  };

  const getProgressMessage = () => {
    if (!syncProgress) return 'Importing Games...';
    return syncProgress.message;
  };

  const getProgressIcon = () => {
    if (syncProgress?.stage === 'complete') {
      return <CheckCircle size={20} color={colors.success} />;
    }
    return <ActivityIndicator color="#ffffff" size="small" />;
  };

  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Connect to BoardGameGeek</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => { onClose(); announceForAccessibility('Sync modal closed'); }}
          accessibilityLabel="Close"
          accessibilityRole="button"
          accessibilityHint="Closes the sync modal"
          hitSlop={touchTargets.sizeTwenty}
        >
          <X size={20} color={colors.textMuted} />
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
          accessibilityLabel="BoardGameGeek username"
          accessibilityHint="Enter your BoardGameGeek username"
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.syncButton, loading && styles.syncButtonDisabled]}
        onPress={handleSync}
        disabled={loading}
        accessibilityLabel="Import collection"
        accessibilityRole="button"
        accessibilityHint="Starts importing your collection from BoardGameGeek"
        hitSlop={touchTargets.small}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            {getProgressIcon()}
            <Text style={styles.syncButtonText}>{getProgressMessage()}</Text>
          </View>
        ) : (
          <>
            <Search color="#ffffff" size={20} />
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

const getStyles = (colors: any, typography: any, insets: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.tints.neutral,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Math.max(20, insets.top),
    paddingBottom: Math.max(20, insets.bottom),
    paddingHorizontal: 20,
  },
  dialog: {
    backgroundColor: colors.card,
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
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.headline,
    color: colors.text,
  },
  description: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.callout,
    color: colors.textMuted,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.callout,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  errorText: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.callout,
    color: colors.error,
    marginBottom: 16,
  },
  syncButton: {
    backgroundColor: colors.accent,
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
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.subheadline,
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
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
