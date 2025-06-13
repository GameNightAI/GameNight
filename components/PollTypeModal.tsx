import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { X, Gamepad2, Calendar } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface PollTypeModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectGamePoll: () => void;
  onSelectDatePoll: () => void;
}

export const PollTypeModal: React.FC<PollTypeModalProps> = ({
  isVisible,
  onClose,
  onSelectGamePoll,
  onSelectDatePoll,
}) => {
  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Poll</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        What would you like to create a poll for?
      </Text>

      <View style={styles.optionsContainer}>
        <Animated.View entering={FadeIn.delay(100).duration(400)}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={onSelectGamePoll}
          >
            <View style={[styles.iconContainer, styles.gameIconContainer]}>
              <Gamepad2 size={32} color="#ff9654" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Pick a Game</Text>
              <Text style={styles.optionDescription}>
                Let your group vote on which board game to play
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(200).duration(400)}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={onSelectDatePoll}
          >
            <View style={[styles.iconContainer, styles.dateIconContainer]}>
              <Calendar size={32} color="#4CAF50" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Pick a Date</Text>
              <Text style={styles.optionDescription}>
                Schedule when to meet for your game night
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );

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
    padding: 20,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e1e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  gameIconContainer: {
    backgroundColor: '#fff5ef',
  },
  dateIconContainer: {
    backgroundColor: '#f0f8f0',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  optionDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});