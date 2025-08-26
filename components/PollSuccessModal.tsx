import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { X, Share2, Users, Copy } from 'lucide-react-native';
import { useDeviceType } from '@/hooks/useDeviceType';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

interface PollSuccessModalProps {
  isVisible: boolean;
  onClose: () => void;
  onDone: () => void;
  pollUrl: string;
  onStartInPersonVoting?: () => void;
}

export const PollSuccessModal: React.FC<PollSuccessModalProps> = ({
  isVisible,
  onClose,
  onDone,
  pollUrl,
  onStartInPersonVoting,
}) => {
  const deviceType = useDeviceType();
  const [isMobile, setIsMobile] = React.useState(false);
  const [isSmallMobile, setIsSmallMobile] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const updateScreenSize = () => {
      const { width, height } = Dimensions.get('window');
      setIsMobile(width < 768);
      setIsSmallMobile(width < 380 || height < 700);
    };

    updateScreenSize();
    setIsReady(true);

    const handleResize = () => {
      updateScreenSize();
    };

    if (Platform.OS === 'web') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(pollUrl);
      Toast.show({ type: 'success', text1: 'Poll link copied to clipboard!' });
    } catch (err) {
      console.error('Failed to copy link:', err);
      Toast.show({ type: 'error', text1: 'Failed to copy link' });
    }
  };

  const handleStartInPersonVoting = () => {
    // Close the modal first
    onClose();
    // Call the callback if provided, otherwise the parent will handle navigation
    if (onStartInPersonVoting) {
      onStartInPersonVoting();
    }
  };

  if (!isVisible || !isReady) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.dialog, {
        maxWidth: isMobile ? '90%' : 500,
        width: '100%',
      }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onDone}
          accessibilityLabel="Close"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={isMobile ? 20 : 24} color="#666666" />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Success Header */}
          <View style={styles.successHeader}>
            <Text style={styles.title}>Poll Created!</Text>
            <View style={styles.checkmarkContainer}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          </View>

          {/* Share Link Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Share2 size={24} color="#ff9654" />
              <Text style={styles.sectionTitle}>Share the Link</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Send this link to your friends so they can vote from anywhere
            </Text>
            <View style={styles.linkContainer}>
              <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
                {pollUrl}
              </Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyLink}
                accessibilityLabel="Copy poll link"
              >
                <Copy size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* In-Person Voting Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={24} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Vote In-Person</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Pass your device around for everyone to vote on the same screen
            </Text>
            <TouchableOpacity
              style={styles.startVotingButton}
              onPress={handleStartInPersonVoting}
              accessibilityLabel="Start in-person voting"
            >
              <Users size={20} color="#ffffff" />
              <Text style={styles.startVotingButtonText}>Start In-Person Voting</Text>
            </TouchableOpacity>
          </View>

          {/* Done Button */}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={onDone}
            accessibilityLabel="Done - close all modals"
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

type Styles = {
  overlay: ViewStyle;
  dialog: ViewStyle;
  closeButton: ViewStyle;
  content: ViewStyle;
  successHeader: ViewStyle;
  checkmarkContainer: ViewStyle;
  checkmark: TextStyle;
  title: TextStyle;
  section: ViewStyle;
  sectionHeader: ViewStyle;
  sectionTitle: TextStyle;
  sectionDescription: TextStyle;
  linkContainer: ViewStyle;
  linkText: TextStyle;
  copyButton: ViewStyle;
  startVotingButton: ViewStyle;
  startVotingButtonText: TextStyle;
  doneButton: ViewStyle;
  doneButtonText: TextStyle;
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
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  content: {
    padding: 24,
    paddingTop: 12,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  checkmarkContainer: {
    marginTop: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    marginTop: 12,
    fontSize: 18,
    color: '#1a2b5f',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14
    ,
    color: '#1a2b5f',
    marginLeft: 12,
    fontWeight: 'bold',
  },
  sectionDescription: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 15,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 10,
    color: '#666666',
    marginRight: 8,
  },
  copyButton: {
    backgroundColor: '#ff9654',
    borderRadius: 6,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startVotingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  startVotingButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: '#1a2b5f',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  doneButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});
