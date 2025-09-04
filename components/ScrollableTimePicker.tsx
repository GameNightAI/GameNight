import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Platform, TextInput } from 'react-native';
import { format } from 'date-fns';

interface TimeSelection {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
}

interface ScrollableTimePickerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (time: Date) => void;
  initialTime?: Date | null;
  title: string;
  validationError?: string;
}

export function ScrollableTimePicker({
  visible,
  onClose,
  onSave,
  initialTime,
  title,
  validationError
}: ScrollableTimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(6);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');
  const [manualHourInput, setManualHourInput] = useState('');
  const [manualMinuteInput, setManualMinuteInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const hourScrollRef = useRef<ScrollView | null>(null);
  const minuteScrollRef = useRef<ScrollView | null>(null);

  // Generate time options
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 15, 30, 45];
  const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  // Initialize with current time or provided time
  useEffect(() => {
    if (visible && initialTime) {
      const hour = initialTime.getHours();
      const minute = initialTime.getMinutes();
      const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
      const displayMinute = Math.floor(minute / 15) * 15;
      const period = hour >= 12 ? 'PM' : 'AM';

      setSelectedHour(displayHour);
      setSelectedMinute(displayMinute);
      setSelectedPeriod(period);

      // Auto-scroll to selected values
      setTimeout(() => {
        const hourIndex = hours.indexOf(displayHour);
        const minuteIndex = minutes.indexOf(displayMinute);

        if (hourScrollRef.current && hourIndex >= 0) {
          hourScrollRef.current.scrollTo({ y: hourIndex * 60, animated: false });
        }
        if (minuteScrollRef.current && minuteIndex >= 0) {
          minuteScrollRef.current.scrollTo({ y: minuteIndex * 60, animated: false });
        }
      }, 100);
    } else if (visible) {
      // Reset to default values
      setSelectedHour(6);
      setSelectedMinute(0);
      setSelectedPeriod('PM');
    }
  }, [visible, initialTime]);

  const createTimeFromSelection = (): Date => {
    const now = new Date();
    let hour = selectedHour;

    // Convert to 24-hour format
    if (selectedPeriod === 'PM' && selectedHour !== 12) {
      hour += 12;
    } else if (selectedPeriod === 'AM' && selectedHour === 12) {
      hour = 0;
    }

    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, selectedMinute);
  };

  const handleSave = () => {
    const newTime = createTimeFromSelection();
    onSave(newTime);
  };

  const formatTime = (): string => {
    return `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;
  };

  const handleManualTimeSubmit = () => {
    const hour = parseInt(manualHourInput, 10);
    const minute = parseInt(manualMinuteInput, 10);

    // Validate inputs
    if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setShowManualInput(false);
      setManualHourInput('');
      setManualMinuteInput('');
    }
  };

  const toggleManualInput = () => {
    setShowManualInput(!showManualInput);
    if (!showManualInput) {
      setManualHourInput(selectedHour.toString());
      setManualMinuteInput(selectedMinute.toString().padStart(2, '0'));
    } else {
      setManualHourInput('');
      setManualMinuteInput('');
    }
  };

  const TimePickerColumn = ({
    items,
    selectedValue,
    onValueChange,
    scrollRef,
    formatter
  }: {
    items: number[];
    selectedValue: number;
    onValueChange: (value: number) => void;
    scrollRef: React.RefObject<ScrollView | null>;
    formatter?: (value: number) => string;
  }) => {
    const handleScroll = (event: any) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / 60);
      if (index >= 0 && index < items.length) {
        onValueChange(items[index]);
      }
    };

    const handleScrollEnd = (event: any) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / 60);
      if (index >= 0 && index < items.length) {
        onValueChange(items[index]);
      }
    };

    return (
      <View style={styles.timeColumn}>
        <ScrollView
          ref={scrollRef}
          style={styles.timeScrollView}
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          onScroll={Platform.OS === 'web' ? handleScroll : undefined}
        >
          {/* Top padding */}
          <View style={styles.scrollPadding} />

          {items.map((item, index) => (
            <View key={item} style={styles.timeOption}>
              <Text style={[
                styles.timeOptionText,
                item === selectedValue && styles.timeOptionTextSelected
              ]}>
                {formatter ? formatter(item) : item}
              </Text>
            </View>
          ))}

          {/* Bottom padding */}
          <View style={styles.scrollPadding} />
        </ScrollView>

        {/* Selection indicator */}
        <View style={styles.selectionIndicator} />
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Time Display */}
          <View style={styles.timeDisplay}>
            {showManualInput ? (
              <View style={styles.manualInputContainer}>
                <View style={styles.manualInputFields}>
                  <TextInput
                    style={styles.manualTimeInput}
                    value={manualHourInput}
                    onChangeText={setManualHourInput}
                    placeholder="6"
                    placeholderTextColor="#999999"
                    keyboardType="numeric"
                    maxLength={2}
                    autoFocus={true}
                  />
                  <Text style={styles.timeSeparator}>:</Text>
                  <TextInput
                    style={styles.manualTimeInput}
                    value={manualMinuteInput}
                    onChangeText={setManualMinuteInput}
                    placeholder="30"
                    placeholderTextColor="#999999"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <Text style={styles.timeSeparator}>{selectedPeriod}</Text>
                </View>
                <View style={styles.manualInputActions}>
                  <TouchableOpacity
                    style={styles.manualInputButton}
                    onPress={handleManualTimeSubmit}
                  >
                    <Text style={styles.manualInputButtonText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.manualInputButton}
                    onPress={() => {
                      setShowManualInput(false);
                      setManualHourInput('');
                      setManualMinuteInput('');
                    }}
                  >
                    <Text style={styles.manualInputButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={toggleManualInput}>
                <Text style={styles.timeDisplayText}>{formatTime()}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Time Picker */}
          <View style={styles.timePickerContainer}>
            {/* Hours */}
            <TimePickerColumn
              items={hours}
              selectedValue={selectedHour}
              onValueChange={setSelectedHour}
              scrollRef={hourScrollRef}
            />

            {/* Separator */}
            <Text style={styles.separator}>:</Text>

            {/* Minutes */}
            <TimePickerColumn
              items={minutes}
              selectedValue={selectedMinute}
              onValueChange={setSelectedMinute}
              scrollRef={minuteScrollRef}
              formatter={(minute) => minute.toString().padStart(2, '0')}
            />

            {/* AM/PM */}
            <View style={styles.periodContainer}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 'AM' && styles.periodButtonSelected
                ]}
                onPress={() => setSelectedPeriod('AM')}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === 'AM' && styles.periodButtonTextSelected
                ]}>
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 'PM' && styles.periodButtonSelected
                ]}
                onPress={() => setSelectedPeriod('PM')}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === 'PM' && styles.periodButtonTextSelected
                ]}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Validation Error */}
          {validationError ? (
            <Text style={styles.validationError}>{validationError}</Text>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
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
  dialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 350,
    maxHeight: '70%',
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  title: {
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
  timeDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  timeDisplayText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 32,
    color: '#1a2b5f',
    letterSpacing: 1,
  },
  manualInputContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  manualInputFields: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualTimeInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 28,
    color: '#1a2b5f',
    borderWidth: 2,
    borderColor: '#0070f3',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: 60,
    textAlign: 'center',
  },
  timeSeparator: {
    fontFamily: 'Poppins-Regular',
    fontSize: 28,
    color: '#1a2b5f',
    marginHorizontal: 4,
  },
  manualInputActions: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInputButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0070f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualInputButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: 'white',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  timeColumn: {
    flex: 1,
    maxWidth: 80,
    height: 180,
    position: 'relative',
  },
  timeScrollView: {
    flex: 1,
  },
  scrollPadding: {
    height: 60,
  },
  timeOption: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeOptionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 24,
    color: '#666666',
  },
  timeOptionTextSelected: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 28,
    color: '#0070f3',
  },
  selectionIndicator: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 60,
    marginTop: -30,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#0070f3',
    backgroundColor: 'rgba(0, 112, 243, 0.1)',
    pointerEvents: 'none',
  },
  separator: {
    fontFamily: 'Poppins-Regular',
    fontSize: 28,
    color: '#666666',
    marginHorizontal: 10,
  },
  periodContainer: {
    marginLeft: 20,
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    minWidth: 60,
    alignItems: 'center',
  },
  periodButtonSelected: {
    backgroundColor: '#0070f3',
    borderColor: '#0070f3',
  },
  periodButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#666666',
  },
  periodButtonTextSelected: {
    color: 'white',
  },
  validationError: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#666666',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0070f3',
    alignItems: 'center',
  },
  saveButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: 'white',
  },
});
