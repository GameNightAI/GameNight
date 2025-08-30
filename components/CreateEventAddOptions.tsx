import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, TextInput, Platform, Switch } from 'react-native';
import { X } from 'lucide-react-native';
import { useDeviceType } from '@/hooks/useDeviceType';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

interface CreateEventAddOptionsProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (options: {
    location: string;
    startTime: Date | null;
    endTime: Date | null;
    useSameLocation: boolean;
    useSameTime: boolean;
  }) => void;
  currentOptions?: {
    location: string;
    startTime: Date | null;
    endTime: Date | null;
    useSameLocation: boolean;
    useSameTime: boolean;
  };
}

export const CreateEventAddOptions: React.FC<CreateEventAddOptionsProps> = ({
  isVisible,
  onClose,
  onSave,
  currentOptions = {
    location: '',
    startTime: null,
    endTime: null,
    useSameLocation: false,
    useSameTime: false,
  },
}) => {
  const deviceType = useDeviceType();
  const [location, setLocation] = useState(currentOptions.location);
  const [startTime, setStartTime] = useState<Date | null>(currentOptions.startTime);
  const [endTime, setEndTime] = useState<Date | null>(currentOptions.endTime);
  const [useSameLocation, setUseSameLocation] = useState(currentOptions.useSameLocation);
  const [useSameTime, setUseSameTime] = useState(currentOptions.useSameTime);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    setLocation(currentOptions.location);
    setStartTime(currentOptions.startTime);
    setEndTime(currentOptions.endTime);
    setUseSameLocation(currentOptions.useSameLocation);
    setUseSameTime(currentOptions.useSameTime);
  }, [currentOptions]);

  const handleSave = () => {
    onSave({
      location,
      startTime,
      endTime,
      useSameLocation,
      useSameTime,
    });
    onClose();
  };

  const handleClose = () => {
    // Reset to original values
    setLocation(currentOptions.location);
    setStartTime(currentOptions.startTime);
    setEndTime(currentOptions.endTime);
    setUseSameLocation(currentOptions.useSameLocation);
    setUseSameTime(currentOptions.useSameTime);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <View style={styles.header}>
          <Text style={styles.title}>Event Options</Text>
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
          <View style={styles.optionRow}>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>Use same location for all events</Text>
              <Text style={styles.optionSublabel}>
                Apply the location below to all upcoming event options
              </Text>
            </View>
            <Switch
              value={useSameLocation}
              onValueChange={setUseSameLocation}
              trackColor={{ false: '#e1e5ea', true: '#ff9654' }}
              thumbColor={useSameLocation ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          {useSameLocation && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.textInput}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., Community Center, John's House, Online"
                placeholderTextColor="#999999"
                maxLength={100}
              />
            </View>
          )}

          <View style={styles.optionRow}>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionLabel}>Use same time for all events</Text>
              <Text style={styles.optionSublabel}>
                Apply the time below to all upcoming event options
              </Text>
            </View>
            <Switch
              value={useSameTime}
              onValueChange={setUseSameTime}
              trackColor={{ false: '#e1e5ea', true: '#ff9654' }}
              thumbColor={useSameTime ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          {useSameTime && (
            <View style={styles.timeContainer}>
              <Text style={styles.inputLabel}>Event Time</Text>
              <View style={styles.timeRow}>
                <TouchableOpacity
                  onPress={() => setShowStartTimePicker(true)}
                  style={[styles.timeInput, { flex: 1, marginRight: 8 }]}
                >
                  <Text style={startTime ? styles.timeText : styles.placeholderText}>
                    {startTime ? format(startTime, 'HH:mm') : 'Start Time'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowEndTimePicker(true)}
                  style={[styles.timeInput, { flex: 1, marginLeft: 8 }]}
                >
                  <Text style={endTime ? styles.timeText : styles.placeholderText}>
                    {endTime ? format(endTime, 'HH:mm') : 'End Time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showStartTimePicker && (
            <DateTimePicker
              value={startTime || new Date()}
              mode="time"
              display="default"
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                setShowStartTimePicker(false);
                if (date) setStartTime(date);
              }}
            />
          )}
          {showEndTimePicker && (
            <DateTimePicker
              value={endTime || new Date()}
              mode="time"
              display="default"
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                setShowEndTimePicker(false);
                if (date) setEndTime(date);
              }}
            />
          )}
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
  optionRow: ViewStyle;
  optionTextContainer: ViewStyle;
  optionLabel: TextStyle;
  optionSublabel: TextStyle;
  inputContainer: ViewStyle;
  inputLabel: TextStyle;
  textInput: TextStyle;
  timeContainer: ViewStyle;
  timeRow: ViewStyle;
  timeInput: TextStyle;
  timeText: TextStyle;
  placeholderText: TextStyle;
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
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  optionLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  optionSublabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  textInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    padding: 12,
  },
  timeContainer: {
    marginBottom: 20,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#1a2b5f',
    fontWeight: '500',
  },
  placeholderText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#888888',
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
