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
  const [manualPeriodInput, setManualPeriodInput] = useState<'AM' | 'PM'>('PM');
  const [showManualInput, setShowManualInput] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lastValidTime, setLastValidTime] = useState<{ hour: number, minute: number, period: 'AM' | 'PM' } | null>(null);

  const hourScrollRef = useRef<ScrollView | null>(null);
  const minuteScrollRef = useRef<ScrollView | null>(null);

  // Generate time options
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 15, 30, 45];
  const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  useEffect(() => {
    if (visible && !hasInitialized) {
      const now = initialTime ?? new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
      const displayMinute = Math.floor(minute / 15) * 15;
      const period = hour >= 12 ? 'PM' : 'AM';

      setSelectedHour(displayHour);
      setSelectedMinute(displayMinute);
      setSelectedPeriod(period);

      // Initialize manual input values to match the initial time
      setManualHourInput(displayHour.toString());
      setManualMinuteInput(displayMinute.toString().padStart(2, '0'));
      setManualPeriodInput(period);

      setTimeout(() => {
        const hourIndex = hours.indexOf(displayHour);
        const minuteIndex = minutes.indexOf(displayMinute);

        if (hourScrollRef.current && hourIndex >= 0) {
          hourScrollRef.current.scrollTo({ y: hourIndex * 60, animated: false });
        }
        if (minuteScrollRef.current && minuteIndex >= 0) {
          minuteScrollRef.current.scrollTo({ y: minuteIndex * 60, animated: false });
        }

        setHasInitialized(true);
      }, 100);
    }

    // Reset init flag when modal closes
    if (!visible && hasInitialized) {
      setHasInitialized(false);
    }
  }, [visible, initialTime, hasInitialized]);

  // Update lastValidTime when scroll wheel values change
  useEffect(() => {
    if (!showManualInput) {
      setLastValidTime({
        hour: selectedHour,
        minute: selectedMinute,
        period: selectedPeriod
      });
    }
  }, [selectedHour, selectedMinute, selectedPeriod, showManualInput]);

  const createTimeFromSelection = (): Date => {
    const now = new Date();

    // Use manual input values if in manual input mode, otherwise use selected values
    let hour, minute, period;

    if (showManualInput) {
      const manualHour = parseInt(manualHourInput, 10);
      const manualMinute = parseInt(manualMinuteInput, 10);

      hour = (!isNaN(manualHour) && manualHour >= 1 && manualHour <= 12) ? manualHour : selectedHour;
      minute = (!isNaN(manualMinute) && manualMinute >= 0 && manualMinute <= 59)
        ? Math.floor(manualMinute / 15) * 15
        : selectedMinute;
      period = manualPeriodInput;
    } else {
      hour = selectedHour;
      minute = selectedMinute;
      period = selectedPeriod;
    }

    // Convert to 24-hour format
    if (period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }

    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
  };

  const handleSave = () => {
    // createTimeFromSelection() already handles manual input values
    const newTime = createTimeFromSelection();
    onSave(newTime);
  };

  const formatTime = (): string => {
    // If in manual input mode, show the current manual input values
    if (showManualInput) {
      // Always show what's in the manual input fields, even if empty
      const displayHour = manualHourInput || '';
      const displayMinute = manualMinuteInput || '';
      const period = manualPeriodInput;

      // Format the display with proper padding for minutes
      const formattedMinute = displayMinute ? displayMinute.padStart(2, '0') : '';
      return `${displayHour}:${formattedMinute} ${period}`;
    }
    return `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;
  };

  const validateAndSetManualTime = () => {
    const hour = parseInt(manualHourInput, 10);
    const minute = parseInt(manualMinuteInput, 10);

    let shouldUpdate = false;
    let clampedHour = selectedHour;
    let clampedMinute = selectedMinute;

    // Update hour if valid (1-12)
    if (!isNaN(hour) && hour >= 1 && hour <= 12) {
      clampedHour = Math.max(1, Math.min(12, hour));
      shouldUpdate = true;
    }

    // Update minute if valid (0-59)
    if (!isNaN(minute) && minute >= 0 && minute <= 59) {
      clampedMinute = Math.floor(minute / 15) * 15; // Round to nearest 15
      shouldUpdate = true;
    }

    // Update period if it changed
    if (manualPeriodInput !== selectedPeriod) {
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      // Update the selected values immediately
      setSelectedHour(clampedHour);
      setSelectedMinute(clampedMinute);
      setSelectedPeriod(manualPeriodInput);

      // Store the last valid time
      setLastValidTime({
        hour: clampedHour,
        minute: clampedMinute,
        period: manualPeriodInput
      });

      // Sync scroll to match manual input
      const hourIndex = hours.indexOf(clampedHour);
      const minuteIndex = minutes.indexOf(clampedMinute);

      setTimeout(() => {
        if (hourScrollRef.current && hourIndex >= 0) {
          hourScrollRef.current.scrollTo({ y: hourIndex * 60, animated: true });
        }
        if (minuteScrollRef.current && minuteIndex >= 0) {
          minuteScrollRef.current.scrollTo({ y: minuteIndex * 60, animated: true });
        }
      }, 100);
    }
  };

  const handleManualInputBlur = () => {
    // Apply the manual input values to the selected values before exiting
    const hour = parseInt(manualHourInput, 10);
    const minute = parseInt(manualMinuteInput, 10);

    if (!isNaN(hour) && hour >= 1 && hour <= 12) {
      setSelectedHour(hour);
    }
    if (!isNaN(minute) && minute >= 0 && minute <= 59) {
      setSelectedMinute(Math.floor(minute / 15) * 15);
    }
    setSelectedPeriod(manualPeriodInput);

    setShowManualInput(false);
  };

  const handleManualInputSubmit = () => {
    // Apply the manual input values to the selected values before exiting
    const hour = parseInt(manualHourInput, 10);
    const minute = parseInt(manualMinuteInput, 10);

    if (!isNaN(hour) && hour >= 1 && hour <= 12) {
      setSelectedHour(hour);
    }
    if (!isNaN(minute) && minute >= 0 && minute <= 59) {
      setSelectedMinute(Math.floor(minute / 15) * 15);
    }
    setSelectedPeriod(manualPeriodInput);

    setShowManualInput(false);
  };

  const toggleManualInput = () => {
    setShowManualInput(!showManualInput);
    if (!showManualInput) {
      setManualHourInput(selectedHour.toString());
      setManualMinuteInput(selectedMinute.toString().padStart(2, '0'));
      setManualPeriodInput(selectedPeriod);
      setLastValidTime({
        hour: selectedHour,
        minute: selectedMinute,
        period: selectedPeriod
      });
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
    const handleScrollEnd = (event: any) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / 60);
      if (index >= 0 && index < items.length) {
        onValueChange(items[index]);
      }
    };

    const handleTimeOptionPress = (item: number) => {
      onValueChange(item);
      // Scroll to the selected item
      const index = items.indexOf(item);
      if (scrollRef.current && index >= 0) {
        scrollRef.current.scrollTo({ y: index * 60, animated: true });
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
        >
          {/* Top padding */}
          <View style={styles.scrollPadding} />

          {items.map((item, index) => (
            <TouchableOpacity
              key={item}
              style={styles.timeOption}
              onPress={() => handleTimeOptionPress(item)}
            >
              <Text style={[
                styles.timeOptionText,
                item === selectedValue && styles.timeOptionTextSelected
              ]}>
                {formatter ? formatter(item) : item}
              </Text>
            </TouchableOpacity>
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
                    onChangeText={(text) => {
                      setManualHourInput(text);
                      // Update time immediately as user types
                      setTimeout(() => validateAndSetManualTime(), 50);
                    }}
                    onSubmitEditing={() => {
                      validateAndSetManualTime();
                      setShowManualInput(false);
                    }}
                    placeholder="6"
                    placeholderTextColor="#999999"
                    keyboardType="numeric"
                    maxLength={2}
                    autoFocus={true}
                    returnKeyType="next"
                  />
                  <Text style={styles.timeSeparator}>:</Text>
                  <TextInput
                    style={styles.manualTimeInput}
                    value={manualMinuteInput}
                    onChangeText={(text) => {
                      setManualMinuteInput(text);
                      // Update time immediately as user types
                      setTimeout(() => validateAndSetManualTime(), 50);
                    }}
                    onSubmitEditing={() => {
                      validateAndSetManualTime();
                      setShowManualInput(false);
                    }}
                    placeholder="30"
                    placeholderTextColor="#999999"
                    keyboardType="numeric"
                    maxLength={2}
                    returnKeyType="done"
                  />
                </View>
                <View style={styles.manualPeriodContainer}>
                  <TouchableOpacity
                    style={[
                      styles.manualPeriodButton,
                      manualPeriodInput === 'AM' && styles.manualPeriodButtonSelected
                    ]}
                    onPress={() => {
                      setManualPeriodInput('AM');
                      setSelectedPeriod('AM');
                      // Immediately update scroll wheel to match
                      const hour = parseInt(manualHourInput, 10);
                      const minute = parseInt(manualMinuteInput, 10);

                      if (!isNaN(hour) && hour >= 1 && hour <= 12) {
                        setSelectedHour(hour);
                        // Sync scroll wheel position
                        const hourIndex = hours.indexOf(hour);
                        setTimeout(() => {
                          if (hourScrollRef.current && hourIndex >= 0) {
                            hourScrollRef.current.scrollTo({ y: hourIndex * 60, animated: true });
                          }
                        }, 50);
                      }
                      if (!isNaN(minute) && minute >= 0 && minute <= 59) {
                        const roundedMinute = Math.floor(minute / 15) * 15;
                        setSelectedMinute(roundedMinute);
                        // Sync scroll wheel position
                        const minuteIndex = minutes.indexOf(roundedMinute);
                        setTimeout(() => {
                          if (minuteScrollRef.current && minuteIndex >= 0) {
                            minuteScrollRef.current.scrollTo({ y: minuteIndex * 60, animated: true });
                          }
                        }, 50);
                      }
                    }}
                  >
                    <Text style={[
                      styles.manualPeriodButtonText,
                      manualPeriodInput === 'AM' && styles.manualPeriodButtonTextSelected
                    ]}>
                      AM
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.manualPeriodButton,
                      manualPeriodInput === 'PM' && styles.manualPeriodButtonSelected
                    ]}
                    onPress={() => {
                      setManualPeriodInput('PM');
                      setSelectedPeriod('PM');
                      // Immediately update scroll wheel to match
                      const hour = parseInt(manualHourInput, 10);
                      const minute = parseInt(manualMinuteInput, 10);

                      if (!isNaN(hour) && hour >= 1 && hour <= 12) {
                        setSelectedHour(hour);
                        // Sync scroll wheel position
                        const hourIndex = hours.indexOf(hour);
                        setTimeout(() => {
                          if (hourScrollRef.current && hourIndex >= 0) {
                            hourScrollRef.current.scrollTo({ y: hourIndex * 60, animated: true });
                          }
                        }, 50);
                      }
                      if (!isNaN(minute) && minute >= 0 && minute <= 59) {
                        const roundedMinute = Math.floor(minute / 15) * 15;
                        setSelectedMinute(roundedMinute);
                        // Sync scroll wheel position
                        const minuteIndex = minutes.indexOf(roundedMinute);
                        setTimeout(() => {
                          if (minuteScrollRef.current && minuteIndex >= 0) {
                            minuteScrollRef.current.scrollTo({ y: minuteIndex * 60, animated: true });
                          }
                        }, 50);
                      }
                    }}
                  >
                    <Text style={[
                      styles.manualPeriodButtonText,
                      manualPeriodInput === 'PM' && styles.manualPeriodButtonTextSelected
                    ]}>
                      PM
                    </Text>
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
    height: '80%',
    maxHeight: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    display: 'flex',
    flexDirection: 'column',
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
    gap: 16,
  },
  manualPeriodContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  manualPeriodButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    minWidth: 60,
    alignItems: 'center',
  },
  manualPeriodButtonSelected: {
    backgroundColor: '#0070f3',
    borderColor: '#0070f3',
  },
  manualPeriodButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#666666',
  },
  manualPeriodButtonTextSelected: {
    color: 'white',
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
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    flex: 1,
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
    flexShrink: 0, // Prevent buttons from shrinking
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
