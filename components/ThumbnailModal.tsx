import React, { useMemo } from 'react';
import { View, Image, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';

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
  const { colors, touchTargets } = useTheme();
  const { announceForAccessibility } = useAccessibility();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (!imageUrl) return null;

  const handleClose = () => {
    onClose();
    announceForAccessibility('Image modal closed');
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityLabel="Close image"
              accessibilityRole="button"
              accessibilityHint="Closes the full-size image view"
              hitSlop={touchTargets.sizeTwenty}
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullSizeImage}
            resizeMode="contain"
            accessibilityLabel="Full-size game image"
            accessibilityRole="image"
          />
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.tints.neutral,
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
    backgroundColor: colors.tints.neutral,
    borderRadius: 20,
    padding: 8,
  },
  fullSizeImage: {
    width: '100%',
    height: '100%',
  },
}); 