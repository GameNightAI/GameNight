import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Platform, TextInput, Switch } from 'react-native';
import { format } from 'date-fns';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface EventOptions {
  location: string;
  startTime: Date | null;
  endTime: Date | null;
  useSameLocation: boolean;
  useSameTime: boolean;
}

interface DateReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onFinalize: (eventOptions: EventOptions) => void;
  selectedDates: Date[];
  eventOptions: EventOptions;
}

export function DateReviewModal({
  visible,
  onClose,
  onFinalize,
  selectedDates,
  eventOptions
}: DateReviewModalProps) {
  const [localEventOptions, setLocalEventOptions] = useState(eventOptions);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dateReviewDialog}>
          <View style={styles.dateReviewHeader}>
            <Text style={styles.dateReviewTitle}>Review Selected Dates</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Location Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Event Location</Text>
            <TextInput
              style={styles.textInput}
              value={localEventOptions.location}
              onChangeText={(text) => setLocalEventOptions(prev => ({ ...prev, location: text }))}
              placeholder="Enter event location"
            />
          </View>

          {/* Time Inputs */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Event Time</Text>
            <View style={styles.timeInputs}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={styles.timeButtonText}>
                  {localEventOptions.startTime ? format(localEventOptions.startTime, 'h:mm a') : 'Start Time'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.timeButtonText}>
                  {localEventOptions.endTime ? format(localEventOptions.endTime, 'h:mm a') : 'End Time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Toggle Switches */}
          <View style={styles.toggleSection}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Use same location for all dates</Text>
              <Switch
                value={localEventOptions.useSameLocation}
                onValueChange={(value) => setLocalEventOptions(prev => ({ ...prev, useSameLocation: value }))}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Use same time for all dates</Text>
              <Switch
                value={localEventOptions.useSameTime}
                onValueChange={(value) => setLocalEventOptions(prev => ({ ...prev, useSameTime: value }))}
              />
            </View>
          </View>

          <ScrollView style={styles.dateReviewContent} showsVerticalScrollIndicator={false}>
            {selectedDates.map((date, index) => (
              <View key={index} style={styles.dateCard}>
                <View style={styles.dateCardIcon}>
                  <Text style={styles.dateCardIconText}>📅</Text>
                </View>
                <View style={styles.dateCardContent}>
                  <Text style={styles.dateCardDate}>
                    {format(date, 'MMMM d, yyyy')}
                  </Text>
                  <Text style={styles.dateCardDayTime}>
                    {format(date, 'EEEE')} • {localEventOptions.startTime && localEventOptions.endTime
                      ? `${format(localEventOptions.startTime, 'h:mm a')} - ${format(localEventOptions.endTime, 'h:mm a')}`
                      : 'Time not set'
                    }
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dateReviewActions}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onClose}
            >
              <Text style={styles.backButtonText}>Back to Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.finalizeButton}
              onPress={() => onFinalize(localEventOptions)}
            >
              <Text style={styles.finalizeButtonText}>Create Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* DateTime Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={localEventOptions.startTime || new Date()}
          mode="time"
          onChange={(event, date) => {
            setShowStartTimePicker(false);
            if (date) {
              setLocalEventOptions(prev => ({ ...prev, startTime: date }));
            }
          }}
        />
      )}
      {showEndTimePicker && (
        <DateTimePicker
          value={localEventOptions.endTime || new Date()}
          mode="time"
          onChange={(event, date) => {
            setShowEndTimePicker(false);
            if (date) {
              setLocalEventOptions(prev => ({ ...prev, endTime: date }));
            }
          }}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  dateReviewDialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dateReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  dateReviewTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666666',
    fontFamily: 'Poppins-SemiBold',
  },
  inputSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a2b5f',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    fontSize: 16,
  },
  timeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#1a2b5f',
  },
  toggleSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#1a2b5f',
    flex: 1,
    marginRight: 16,
  },
  dateReviewContent: {
    flex: 1,
    padding: 16,
  },
  dateCard: {
    flexDirection: 'row',
    backgroundColor: '#f7f7fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    alignItems: 'center',
  },
  dateCardIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dateCardIconText: {
    fontSize: 24,
  },
  dateCardContent: {
    flex: 1,
  },
  dateCardDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2b5f',
    marginBottom: 4,
  },
  dateCardDayTime: {
    fontSize: 14,
    color: '#666',
  },
  dateReviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
  },
  backButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    backgroundColor: '#f8f9fa',
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  finalizeButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0070f3',
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  finalizeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
});
