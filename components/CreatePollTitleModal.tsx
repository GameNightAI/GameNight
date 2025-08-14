import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, TextInput, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useDeviceType } from '@/hooks/useDeviceType';

interface CreatePollTitleModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  currentTitle: string;
}

export const CreatePollTitleModal: React.FC<CreatePollTitleModalProps> = ({
  isVisible,
  onClose,
  onSave,
  currentTitle,
}) => {
  const deviceType = useDeviceType();
  const [title, setTitle] = useState(currentTitle);

  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle]);

  const handleSave = () => {
    onSave(title);
    onClose();
  };

  const handleClose = () => {
    setTitle(currentTitle); // Reset to original value
    onClose();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Poll Title</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            accessibilityLabel="Close"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#666666" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Poll Title (Optional)</Text>
          <Text style={styles.sublabel}>
            Customize your poll title or keep the auto-generated name
          </Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter a custom title or keep the default"
            placeholderTextColor="#999999"
            maxLength={100}
            autoFocus
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

type Styles = {
  overlay: ViewStyle;
  dialog: ViewStyle;
  header: ViewStyle;
  closeButton: ViewStyle;
  title: TextStyle;
  content: ViewStyle;
  label: TextStyle;
  sublabel: TextStyle;
  titleInput: TextStyle;
  footer: ViewStyle;
  cancelButton: ViewStyle;
  cancelButtonText: TextStyle;
  saveButton: ViewStyle;
  saveButtonText: TextStyle;
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
    zIndex: 2000,
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
  },
  content: {
    padding: Platform.OS === 'web' ? 20 : 16,
  },
  label: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  sublabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  titleInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: Platform.OS === 'web' ? 20 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  cancelButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#666666',
  },
  saveButton: {
    backgroundColor: '#ff9654',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
});
