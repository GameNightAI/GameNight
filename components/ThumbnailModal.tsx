import React from 'react';
import { View, Image, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { X } from 'lucide-react-native';

interface ThumbnailModalProps {
  isVisible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export const ThumbnailModal: React.FC<ThumbnailModalProps> = ({
  isVisible,
  imageUrl,
  onClose,
}) => {
  if (!imageUrl) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullSizeImage}
            resizeMode="contain"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    height: '80%',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullSizeImage: {
    width: '100%',
    height: '100%',
  },
}); 