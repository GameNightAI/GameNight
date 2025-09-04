import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, TextInput, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useDeviceType } from '@/hooks/useDeviceType';

interface CreateEventDetailsProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (eventName: string, description: string) => void;
  currentEventName: string;
  currentDescription: string;
}

export const CreateEventDetails: React.FC<CreateEventDetailsProps> = ({
  isVisible,
  onClose,
  onSave,
  currentEventName,
  currentDescription,
}) => {
  const deviceType = useDeviceType();
  const [eventName, setEventName] = useState(currentEventName);
  const [description, setDescription] = useState(currentDescription);

  useEffect(() => {
    setEventName(currentEventName);
    setDescription(currentDescription);
  }, [currentEventName, currentDescription]);

  const handleSave = () => {
    onSave(eventName, description);
    onClose();
  };

  const handleClose = () => {
    setEventName(currentEventName); // Reset to original value
    setDescription(currentDescription); // Reset to original value
    onClose();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <View style={styles.header}>
          <Text style={styles.title}>Event Details</Text>
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
          <Text style={styles.label}>Event Name</Text>
          <Text style={styles.sublabel}>
            Give your event a memorable name
          </Text>
          <TextInput
            style={styles.titleInput}
            value={eventName}
            onChangeText={setEventName}
            placeholder="Enter event name"
            placeholderTextColor="#999999"
            maxLength={100}
            autoFocus
          />

          <Text style={[styles.label, styles.descriptionLabel]}>Description (Optional)</Text>
          <Text style={styles.sublabel}>
            Add context, details, or any additional information about the event
          </Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g., Monthly board game night, or Casual gaming meetup"
            placeholderTextColor="#999999"
            maxLength={500}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
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
  descriptionLabel: TextStyle;
  descriptionInput: TextStyle;
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
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingVertical: 8,
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
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 8,
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
    marginBottom: 6,
  },
  titleInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 0,
  },
  descriptionLabel: {
    marginTop: 12,
  },
  descriptionInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 8,
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
