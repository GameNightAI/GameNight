import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Platform, TextInput, Switch } from 'react-native';
import { format } from 'date-fns';
import { ScrollableTimePicker } from './ScrollableTimePicker';

interface EventOptions {
  location: string;
  startTime: Date | null;
  endTime: Date | null;
  dateSpecificOptions?: Record<string, DateSpecificOptions>;
}

interface DateSpecificOptions {
  location: string;
  startTime: Date | null;
  endTime: Date | null;
}

interface DateReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onFinalize: (eventOptions: EventOptions) => void;
  selectedDates: Date[];
  eventOptions: EventOptions;
  defaultLocation: string;
  pollId?: string; // Optional poll ID for creating events
}

export function DateReviewModal({
  visible,
  onClose,
  onFinalize,
  selectedDates,
  eventOptions,
  defaultLocation
}: DateReviewModalProps) {
  const [localEventOptions, setLocalEventOptions] = useState(eventOptions);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'start' | 'end'>('start');
  const [timeValidationError, setTimeValidationError] = useState('');
  const [dateSpecificOptions, setDateSpecificOptions] = useState<Record<string, DateSpecificOptions>>({});
  const [currentEditingDate, setCurrentEditingDate] = useState<string>('');
  const [customTimeDates, setCustomTimeDates] = useState<Set<string>>(new Set());
  const [customLocationDates, setCustomLocationDates] = useState<Set<string>>(new Set());

  const formatTime = (date: Date | null): string => {
    if (!date) return '';
    return format(date, 'h:mm a');
  };

  const openTimePicker = (mode: 'start' | 'end') => {
    setTimePickerMode(mode);
    setShowTimePicker(true);
    setTimeValidationError('');
  };

  const saveTimeSelection = (newTime: Date) => {
    if (timePickerMode === 'start') {
      // Validate start time is before end time if end time exists
      if (localEventOptions.endTime && newTime >= localEventOptions.endTime) {
        setTimeValidationError('Start time must be before end time');
        return;
      }
      setLocalEventOptions(prev => ({ ...prev, startTime: newTime }));
    } else {
      // Validate end time is after start time
      if (localEventOptions.startTime && newTime <= localEventOptions.startTime) {
        setTimeValidationError('End time must be after start time');
        return;
      }
      setLocalEventOptions(prev => ({ ...prev, endTime: newTime }));
    }

    setShowTimePicker(false);
    setTimeValidationError('');
  };

  const clearTime = (mode: 'start' | 'end') => {
    if (mode === 'start') {
      setLocalEventOptions(prev => ({ ...prev, startTime: null }));
    } else {
      setLocalEventOptions(prev => ({ ...prev, endTime: null }));
    }
    setTimeValidationError('');
  };

  const getDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const toggleCustomTime = (date: Date) => {
    const dateKey = getDateKey(date);
    setCustomTimeDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
        // Clear custom time when toggling off
        updateDateSpecificOptions(date, { startTime: null, endTime: null });
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const toggleCustomLocation = (date: Date) => {
    const dateKey = getDateKey(date);
    setCustomLocationDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
        // Clear custom location when toggling off
        updateDateSpecificOptions(date, { location: '' });
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const getDateSpecificOptions = (date: Date): DateSpecificOptions => {
    const dateKey = getDateKey(date);
    return dateSpecificOptions[dateKey] || {
      location: '',
      startTime: null,
      endTime: null
    };
  };

  const updateDateSpecificOptions = (date: Date, updates: Partial<DateSpecificOptions>) => {
    const dateKey = getDateKey(date);
    setDateSpecificOptions(prev => ({
      ...prev,
      [dateKey]: {
        ...getDateSpecificOptions(date),
        ...updates
      }
    }));
  };

  const openTimePickerForDate = (date: Date, mode: 'start' | 'end') => {
    setCurrentEditingDate(getDateKey(date));
    setTimePickerMode(mode);
    setShowTimePicker(true);
    setTimeValidationError('');
  };

  const saveTimeSelectionForDate = (newTime: Date) => {
    const dateKey = currentEditingDate;
    const currentOptions = dateSpecificOptions[dateKey] || {
      location: '',
      startTime: null,
      endTime: null
    };

    if (timePickerMode === 'start') {
      // Validate start time is before end time if end time exists
      if (currentOptions.endTime && newTime >= currentOptions.endTime) {
        setTimeValidationError('Start time must be before end time');
        return;
      }
      updateDateSpecificOptions(new Date(dateKey + 'T00:00:00'), { startTime: newTime });
    } else {
      // Validate end time is after start time
      if (currentOptions.startTime && newTime <= currentOptions.startTime) {
        setTimeValidationError('End time must be after start time');
        return;
      }
      updateDateSpecificOptions(new Date(dateKey + 'T00:00:00'), { endTime: newTime });
    }

    setShowTimePicker(false);
    setTimeValidationError('');
  };

  const convertTimeInputToDate = (timeString: string, date: Date) => {
    // Hopefully this should resolve the issue with hitting "Reset" on iOS crashing the app.
    if (!timeString) {
      return;
    }
    date ||= new Date();
    let [hour, min] = timeString.split(':');
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), parseInt(hour), parseInt(min));
  };

  const formatTimeForInput = (date: Date | null): string => {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

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

          {/* Time Inputs */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Event Time</Text>
            <View style={styles.timeFormContainer}>
              <View style={styles.timeForm}>
                <View style={styles.timeInputRow}>
                  <Text style={styles.timeFormLabel}>Start</Text>
                  <input
                    type="time"
                    style={styles.timeInput}
                    value={formatTimeForInput(localEventOptions.startTime)}
                    onChange={(e) => setLocalEventOptions(prevOptions => ({
                      ...prevOptions,
                      startTime: convertTimeInputToDate(e.target.value, new Date()) || null,
                    }))}
                  />
                  <button
                    type="button"
                    style={styles.timeResetButton}
                    onClick={(e) => {
                      e.preventDefault();
                      setLocalEventOptions(prevOptions => ({
                        ...prevOptions,
                        startTime: null,
                      }));
                    }}
                  >
                    ✕
                  </button>
                </View>
              </View>
              <View style={styles.timeForm}>
                <View style={styles.timeInputRow}>
                  <Text style={styles.timeFormLabel}>End</Text>
                  <input
                    type="time"
                    style={styles.timeInput}
                    value={formatTimeForInput(localEventOptions.endTime)}
                    onChange={(e) => setLocalEventOptions(prevOptions => ({
                      ...prevOptions,
                      endTime: convertTimeInputToDate(e.target.value, new Date()) || null,
                    }))}
                  />
                  <button
                    type="button"
                    style={styles.timeResetButton}
                    onClick={(e) => {
                      e.preventDefault();
                      setLocalEventOptions(prevOptions => ({
                        ...prevOptions,
                        endTime: null,
                      }));
                    }}
                  >
                    ✕
                  </button>
                </View>
              </View>
            </View>
            {/* <datalist id="time-options">
                <option value="12:00"/>
                <option value="12:30"/>
                <option value="13:00"/>
              </datalist> */}

            {/* <View style={styles.timeInputs}>
              <View style={styles.timeInputContainer}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => openTimePicker('start')}
                >
                  <Text style={styles.timeButtonText}>
                    {localEventOptions.startTime ? formatTime(localEventOptions.startTime) : 'Start Time'}
                  </Text>
                </TouchableOpacity>
                {localEventOptions.startTime && (
                  <TouchableOpacity
                    style={styles.clearTimeButton}
                    onPress={() => clearTime('start')}
                  >
                    <Text style={styles.clearTimeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.timeInputContainer}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => openTimePicker('end')}
                >
                  <Text style={styles.timeButtonText}>
                    {localEventOptions.endTime ? formatTime(localEventOptions.endTime) : 'End Time'}
                  </Text>
                </TouchableOpacity>
                {localEventOptions.endTime && (
                  <TouchableOpacity
                    style={styles.clearTimeButton}
                    onPress={() => clearTime('end')}
                  >
                    <Text style={styles.clearTimeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View> */}
            {timeValidationError ? (
              <Text style={styles.validationError}>{timeValidationError}</Text>
            ) : null}
          </View>

          <ScrollView style={styles.dateReviewContent} showsVerticalScrollIndicator={false}>
            {selectedDates.map((date, index) => {
              const dateKey = getDateKey(date);
              const dateOptions = getDateSpecificOptions(date);
              const hasCustomTime = customTimeDates.has(dateKey);
              const hasCustomLocation = customLocationDates.has(dateKey);

              const getDisplayTime = (startTime: Date | null, endTime: Date | null): string => {
                if (startTime && endTime) {
                  return ` ${formatTime(startTime)} - ${formatTime(endTime)}`;
                } else if (startTime) {
                  return ` Starts at ${formatTime(startTime)}`;
                } else if (endTime) {
                  return ` Ends at ${formatTime(endTime)}`;
                } else {
                  return ' Time not set';
                }
              };

              const displayTime = hasCustomTime
                ? getDisplayTime(dateOptions.startTime, dateOptions.endTime)
                : getDisplayTime(localEventOptions.startTime, localEventOptions.endTime);

              const displayLocation = hasCustomLocation
                ? (dateOptions.location || 'Location not set')
                : (defaultLocation || 'Location not set');

              return (
                <View key={index} style={styles.dateCard}>
                  {/* <View style={styles.dateCardIcon}>
                    <Text style={styles.dateCardIconText}>📅</Text>
                  </View> */}
                  <View style={styles.dateCardContent}>
                    <View style={styles.dateCardDateContainer}>
                      <Text style={styles.dateCardDate}>
                        {format(date, 'MMMM d, yyyy')}
                      </Text>
                      <Text style={styles.dateCardDayTime}>
                        • {format(date, 'EEEE')}
                      </Text>
                    </View>
                    <View style={styles.dateCardDayTimeContainer}>
                      {hasCustomTime ? (
                        <View style={styles.customTimeInputs}>
                          <View style={styles.timeInputRow}>
                            <Text style={styles.timeFormLabel}>Start</Text>
                            <input type="time"
                              style={styles.customTimeInput}
                              value={formatTimeForInput(dateOptions.startTime)}
                              onChange={(e) => updateDateSpecificOptions(
                                date,
                                { startTime: convertTimeInputToDate(e.target.value, date) }
                              )}
                            />
                            <button type="button"
                              style={styles.customTimeResetButton}
                              onClick={(e) => {
                                e.preventDefault();
                                updateDateSpecificOptions(
                                  date,
                                  { startTime: null }
                                );
                              }}
                            >
                              ✕
                            </button>
                          </View>
                          <View style={styles.timeInputRow}>
                            <Text style={styles.timeFormLabel}>End</Text>
                            <input type="time"
                              style={styles.customTimeInput}
                              value={formatTimeForInput(dateOptions.endTime)}
                              onChange={(e) => updateDateSpecificOptions(
                                date,
                                { endTime: convertTimeInputToDate(e.target.value, date) }
                              )}
                            />
                            <button type="button"
                              style={styles.customTimeResetButton}
                              onClick={(e) => {
                                e.preventDefault();
                                updateDateSpecificOptions(
                                  date,
                                  { endTime: null }
                                );
                              }}
                            >
                              ✕
                            </button>
                          </View>

                          {/* <TouchableOpacity
                            style={styles.inlineTimeButton}
                            onPress={() => openTimePickerForDate(date, 'start')}
                          >
                            <Text style={styles.inlineTimeButtonText}>
                              {dateOptions.startTime ? formatTime(dateOptions.startTime) : 'Start Time'}
                            </Text>
                          </TouchableOpacity>
                          <Text style={styles.timeSeparator}>-</Text>
                          <TouchableOpacity
                            style={styles.inlineTimeButton}
                            onPress={() => openTimePickerForDate(date, 'end')}
                          >
                            <Text style={styles.inlineTimeButtonText}>
                              {dateOptions.endTime ? formatTime(dateOptions.endTime) : 'End Time'}
                            </Text>
                          </TouchableOpacity> */}
                        </View>
                      ) : (
                        <Text style={styles.dateCardDayTime}>{displayTime}</Text>
                      )}
                    </View>
                    <Text style={styles.dateCardLocation}>
                      📍 {hasCustomLocation ? (
                        <TextInput
                          style={styles.inlineLocationInput}
                          value={dateOptions.location}
                          onChangeText={(text) => updateDateSpecificOptions(date, { location: text })}
                          placeholder="Enter location"
                          maxLength={50}
                        />
                      ) : displayLocation}
                    </Text>

                    {/* Toggle Switches */}
                    <View style={styles.dateToggles}>
                      <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Custom Time</Text>
                        <Switch
                          value={hasCustomTime}
                          onValueChange={() => toggleCustomTime(date)}
                        />
                      </View>
                      <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Custom Location</Text>
                        <Switch
                          value={hasCustomLocation}
                          onValueChange={() => toggleCustomLocation(date)}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
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
              onPress={() => {
                // Prepare the final event options with date-specific data
                const finalOptions = {
                  ...localEventOptions,
                  dateSpecificOptions: dateSpecificOptions
                };
                onFinalize(finalOptions);
              }}
            >
              <Text style={styles.finalizeButtonText}>Create Event</Text>
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
    minHeight: 22,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666666',
    fontFamily: 'Poppins-SemiBold',
  },
  inputSection: {
    marginHorizontal: 16,
    marginBottom: 4,
  },
  inputLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 4,
    paddingTop: 6,
  },
  textInput: {
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    fontSize: 16,
    color: '#333333',
  },
  timeFormContainer: {
    flexDirection: 'column',
    gap: 6,
    marginTop: 4,
  },
  timeForm: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeFormLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#1a2b5f',
    minWidth: 32,
    textAlign: 'left',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderStyle: 'solid',
    outline: 'none',
    color: '#1a2b5f',
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#f8f9ff',
    borderRadius: 8,
    padding: 4,
    minHeight: 22,
    width: 140,
    textAlign: 'center',
  },
  timeResetButton: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#666666',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 8,
    padding: 4,
    minHeight: 28,
    minWidth: 32,
    textAlign: 'center',
    marginLeft: 8,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  timeButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    flex: 1,
    alignItems: 'center',
  },
  timeButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#1a2b5f',
  },
  clearTimeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    marginLeft: 8,
  },
  clearTimeButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#666666',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#1a2b5f',
    flex: 1,
    marginRight: 16,
  },
  dateReviewContent: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
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
  dateCardDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  dateCardDate: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
  },
  dateCardDayTime: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
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
    justifyContent: 'center',
  },
  backButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  finalizeButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0070f3',
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalizeButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
  },
  validationError: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 8,
    marginHorizontal: 16,
  },
  dateCardLocation: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  dateSpecificTimeSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
  },
  dateSpecificLocationSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
  },
  dateSpecificLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  dateSpecificTimeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateTimeButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    flex: 1,
    alignItems: 'center',
  },
  dateTimeButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#1a2b5f',
  },
  dateLocationInput: {
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    fontSize: 14,
    color: '#333333',
  },
  dateCardDayTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  customTimeInputs: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: 4,
  },
  customTimeInput: {
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderStyle: 'solid',
    outline: 'none',
    color: '#6b7280',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 3,
    paddingTop: 4,
    minHeight: 20,
    width: 100,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 2,
    marginBottom: 6,
  },
  customTimeResetButton: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 10,
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 4,
    minHeight: 20,
    minWidth: 20,
    textAlign: 'center',
    marginLeft: 4,
    opacity: 0.7,
  },
  inlineTimeButton: {
    // Styling handled by global CSS
  },
  inlineTimeButtonText: {
    // Styling handled by global CSS
  },
  timeSeparator: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginHorizontal: 4,
  },
  inlineLocationInput: {
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    fontSize: 14,
    color: '#333333',
    marginLeft: 4,
    flex: 1,
  },
  dateToggles: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
  },
});
