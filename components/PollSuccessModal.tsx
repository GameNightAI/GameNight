import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, TextInput } from 'react-native';
import { CircleCheck as CheckCircle, Share2, Users, Copy, Check, X } from 'lucide-react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';

interface PollSuccessModalProps {
  isVisible: boolean;
  onClose: () => void;
  pollId: string;
  pollTitle: string;
  onShareLink: () => void;
  onLocalVoting: () => void;
}

export const PollSuccessModal: React.FC<PollSuccessModalProps> = ({
  isVisible,
  onClose,
  pollId,
  pollTitle,
  onShareLink,
  onLocalVoting,
}) => {
  const [showCopiedConfirmation, setShowCopiedConfirmation] = useState(false);

  // Generate the share URL
  const baseUrl = Platform.select({
    web: typeof window !== 'undefined' ? window.location.origin : 'https://gamenyte.netlify.app',
    default: 'https://gamenyte.netlify.app',
  });
  const shareUrl = `${baseUrl}/poll/${pollId}`;

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      setShowCopiedConfirmation(true);
      setTimeout(() => {
        setShowCopiedConfirmation(false);
      }, 2000);
    } catch (err) {
      console.log('Error copying to clipboard:', err);
    }
  };

  const content = (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.overlay}
    >
      <Animated.View
        entering={SlideInDown.duration(500).springify()}
        style={styles.modal}
      >
        {/* Header with close button */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <CheckCircle size={32} color="#10b981" />
            <Text style={styles.title}>Poll Created Successfully! 🎉</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* Poll title */}
        <View style={styles.pollTitleContainer}>
          <Text style={styles.pollTitle}>"{pollTitle}"</Text>
        </View>

        {/* Instructions */}
        <Text style={styles.subtitle}>
          Your poll is ready! Here's how to get your friends voting:
        </Text>

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
            <TextInput
              style={styles.linkInput}
              value={shareUrl}
              editable={false}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyLink}
            >
              {showCopiedConfirmation ? (
                <Check size={20} color="#10b981" />
              ) : (
                <Copy size={20} color="#ff9654" />
              )}
            </TouchableOpacity>
          </View>

          {showCopiedConfirmation && (
            <Animated.Text
              entering={FadeIn.duration(200)}
              style={styles.copiedText}
            >
              Link copied to clipboard! 📋
            </Animated.Text>
          )}
        </View>

        {/* In-Person Voting Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={24} color="#10b981" />
            <Text style={styles.sectionTitle}>Vote In-Person</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Pass your device around for everyone to vote on the same screen
          </Text>
          
          <TouchableOpacity
            style={styles.localVotingButton}
            onPress={onLocalVoting}
          >
            <Users size={20} color="#ffffff" />
            <Text style={styles.localVotingButtonText}>Start In-Person Voting</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onClose}
          >
            <Text style={styles.primaryButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );

  if (Platform.OS === 'web') {
    if (!isVisible) return null;
    return content;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: Platform.OS === 'web' ? 1000 : undefined,
    padding: 20,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
    marginLeft: 16,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    color: '#1a2b5f',
    textAlign: 'center',
    marginTop: 12,
  },
  pollTitleContainer: {
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9654',
  },
  pollTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginLeft: 12,
  },
  sectionDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  copyButton: {
    backgroundColor: '#fff5ef',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  copiedText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#10b981',
    textAlign: 'center',
    marginTop: 12,
  },
  localVotingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  localVotingButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  actionButtons: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#ffffff',
  },
});