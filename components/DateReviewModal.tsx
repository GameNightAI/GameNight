import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Switch, Dimensions } from 'react-native';
import { format } from 'date-fns';

import { SquarePen } from 'lucide-react-native';
import { CreateEventDetails } from './CreateEventDetails';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';


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
  eventName: string;
  eventDescription: string;
  eventLocation: string;
  onEventDetailsSave: (name: string, description: string, location: string) => void;
}

export function DateReviewModal({
  visible,
  onClose,
  onFinalize,
  selectedDates,
  eventOptions,
  defaultLocation,
  eventName,
  eventDescription,
  eventLocation,
  onEventDetailsSave
}: DateReviewModalProps) {
  const { colors, typography, touchTargets } = useTheme();
  const { announceForAccessibility } = useAccessibility();
  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

  const [localEventOptions, setLocalEventOptions] = useState(eventOptions);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'start' | 'end'>('start');
  const [timeValidationError, setTimeValidationError] = useState('');
  const [dateSpecificOptions, setDateSpecificOptions] = useState<Record<string, DateSpecificOptions>>({});
  const [currentEditingDate, setCurrentEditingDate] = useState<string>('');
  const [customTimeDates, setCustomTimeDates] = useState<Set<string>>(new Set());
  const [customLocationDates, setCustomLocationDates] = useState<Set<string>>(new Set());
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);

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
    <View style={styles.overlay}>
      <View style={styles.dateReviewDialog}>
        <View style={styles.dateReviewHeader}>
          <Text style={styles.dateReviewTitle}>Review Selected Dates</Text>

        </View>

        <ScrollView style={styles.dateReviewContent} showsVerticalScrollIndicator={false}>
          {/* Event Details Section */}
          <View style={styles.eventDetailsSection}>
            <TouchableOpacity
              style={[styles.eventDetailsButton, (eventName || eventDescription || eventLocation) && styles.eventDetailsButtonActive]}
              onPress={() => {
                announceForAccessibility('Opening event details');
                setShowEventDetailsModal(true);
              }}
              hitSlop={touchTargets.small}
              accessibilityLabel="Edit event details"
              accessibilityHint="Opens event title, description, and location editor"
            >
              <View style={styles.eventDetailsButtonContent}>
                <View style={styles.eventDetailsButtonLeft}>
                  <Text style={styles.eventDetailsButtonLabel}>Event Details</Text>
                </View>
                <View style={styles.eventDetailsButtonRight}>
                  <View style={[styles.eventDetailsButtonIndicator, { opacity: (eventName || eventDescription || eventLocation) ? 1 : 0, marginRight: 8 }]}>
                    <Text style={styles.eventDetailsButtonIndicatorText}>✓</Text>
                  </View>
                  <SquarePen size={20} color={colors.textMuted} />
                </View>
              </View>
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
                  <TouchableOpacity
                    style={[styles.timeResetButton, { marginLeft: 8 }]}
                    hitSlop={touchTargets.small}
                    accessibilityRole="button"
                    accessibilityLabel="Clear start time"
                    accessibilityHint="Clears the selected start time"
                    onPress={(e) => {
                      e.preventDefault?.();
                      setLocalEventOptions(prevOptions => ({
                        ...prevOptions,
                        startTime: null,
                      }));
                      announceForAccessibility('Start time cleared');
                    }}
                  >
                    <Text style={styles.clearTimeButtonText}>✕</Text>
                  </TouchableOpacity>
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
                  <TouchableOpacity
                    style={[styles.timeResetButton, { marginLeft: 8 }]}
                    hitSlop={touchTargets.small}
                    accessibilityRole="button"
                    accessibilityLabel="Clear end time"
                    accessibilityHint="Clears the selected end time"
                    onPress={(e) => {
                      e.preventDefault?.();
                      setLocalEventOptions(prevOptions => ({
                        ...prevOptions,
                        endTime: null,
                      }));
                      announceForAccessibility('End time cleared');
                    }}
                  >
                    <Text style={styles.clearTimeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {timeValidationError ? (
              <Text style={styles.validationError}>{timeValidationError}</Text>
            ) : null}
          </View>
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
                <View style={styles.dateCardContent}>
                  <View style={styles.dateCardDateContainer}>
                    <Text style={styles.dateCardDate}>
                      {format(date, 'MMM d, yyyy')}
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
                        onValueChange={() => {
                          toggleCustomTime(date);
                          announceForAccessibility(hasCustomTime ? 'Custom time disabled' : 'Custom time enabled');
                        }}
                      />
                    </View>
                    <View style={styles.toggleRow}>
                      <Text style={styles.toggleLabel}>Custom Location</Text>
                      <Switch
                        value={hasCustomLocation}
                        onValueChange={() => {
                          toggleCustomLocation(date);
                          announceForAccessibility(hasCustomLocation ? 'Custom location disabled' : 'Custom location enabled');
                        }}
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
            onPress={() => {
              announceForAccessibility('Returning to calendar');
              onClose();
            }}
            accessibilityLabel="Back to Calendar"
            accessibilityHint="Returns to the calendar view"
            hitSlop={touchTargets.small}
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
              announceForAccessibility('Event creation finalized');
            }}
            accessibilityLabel="Create Event"
            accessibilityHint="Creates the event with the selected dates and options"
            hitSlop={touchTargets.small}
          >
            <Text style={styles.finalizeButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Event Details Modal */}
      <CreateEventDetails
        isVisible={showEventDetailsModal}
        onClose={() => {
          setShowEventDetailsModal(false);
          announceForAccessibility('Event details closed');
        }}
        onSave={onEventDetailsSave}
        currentEventName={eventName}
        currentDescription={eventDescription}
        currentLocation={eventLocation}
      />
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], typography: ReturnType<typeof useTheme>['typography']) => {
  const { height: screenHeight } = Dimensions.get('window');
  const responsiveMinHeight = Math.max(400, Math.min(600, screenHeight * 0.5));

  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.tints.neutral,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: 20,
    },
    dateReviewDialog: {
      backgroundColor: colors.card,
      borderRadius: 12,
      width: '90%',
      maxWidth: 600,
      minHeight: responsiveMinHeight,
      maxHeight: '85%',
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
      borderBottomColor: colors.border,
    },
    eventDetailsSection: {
      marginBottom: 0,
      width: '100%',
      paddingTop: 4,
    },
    eventDetailsButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      marginTop: 8,
    },
    eventDetailsButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.tints.accent,
    },
    eventDetailsButtonContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    eventDetailsButtonLeft: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    eventDetailsButtonRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    eventDetailsButtonLabel: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.subheadline,
      color: colors.text,
      marginBottom: 2,
    },
    eventDetailsButtonIndicator: {
      backgroundColor: colors.success,
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    eventDetailsButtonIndicatorText: {
      fontSize: typography.fontSize.caption1,
      fontFamily: typography.getFontFamily('semibold'),
      color: '#ffffff',
    },
    dateReviewTitle: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.headline,
      color: colors.text,
      flex: 1,
      textAlign: 'center',
    },
    inputSection: {
      marginVertical: 8,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputLabel: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.subheadline,
      color: colors.text,
      marginBottom: 4,
      paddingTop: 6,
    },
    textInput: {
      fontFamily: typography.getFontFamily('normal'),
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: typography.fontSize.subheadline,
      color: colors.text,
    },
    timeFormContainer: {
      flexDirection: 'column',
      marginTop: 4,
    },
    timeForm: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    timeInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    timeFormLabel: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.subheadline,
      color: colors.text,
      minWidth: 32,
      textAlign: 'left',
      marginRight: 8,
    },
    timeInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'solid',
      color: colors.text,
      fontSize: typography.fontSize.subheadline,
      fontFamily: typography.getFontFamily('normal'),
      backgroundColor: colors.border,
      borderRadius: 8,
      padding: 4,
      minHeight: 22,
      width: 140,
      textAlign: 'center',
    },
    timeResetButton: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.body,
      color: colors.textMuted,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flex: 1,
      alignItems: 'center',
    },
    timeButtonText: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.callout,
      color: colors.text,
    },
    clearTimeButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      marginLeft: 8,
    },
    clearTimeButtonText: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.body,
      color: colors.textMuted,
      marginLeft: 4,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    toggleLabel: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.subheadline,
      color: colors.text,
      flex: 1,
      marginRight: 16,
    },
    dateReviewContent: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    dateCard: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 6,
      paddingHorizontal: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    dateCardIcon: {
      width: 48,
      height: 48,
      backgroundColor: colors.primary,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    dateCardIconText: {
      fontSize: typography.fontSize.callout,
      color: colors.card,
    },
    dateCardContent: {
      flex: 1,
    },
    dateCardDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    dateCardDate: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.callout,
      color: colors.text,
      marginRight: 8,
    },
    dateCardDayTime: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.subheadline,
      color: colors.textMuted,
    },
    dateReviewActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    backButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      flex: 1,
      marginRight: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButtonText: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.subheadline,
      color: colors.textMuted,
      textAlign: 'center',
    },
    finalizeButton: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
      flex: 1,
      marginLeft: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    finalizeButtonText: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.subheadline,
      color: '#ffffff',
      textAlign: 'center',
    },
    validationError: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.caption1,
      color: colors.error,
      marginTop: 8,
      marginHorizontal: 16,
    },
    dateCardLocation: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.subheadline,
      color: colors.textMuted,
      marginTop: 4,
    },
    dateSpecificTimeSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    dateSpecificLocationSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    dateSpecificLabel: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.caption1,
      color: colors.text,
      marginBottom: 8,
    },
    dateSpecificTimeInputs: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dateTimeButton: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.border,
      flex: 1,
      alignItems: 'center',
    },
    dateTimeButtonText: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.callout,
      color: colors.text,
    },
    dateLocationInput: {
      fontFamily: typography.getFontFamily('normal'),
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: typography.fontSize.subheadline,
      color: colors.text,
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
      borderColor: colors.border,
      borderStyle: 'solid',
      color: colors.text,
      fontSize: typography.fontSize.caption2,
      fontFamily: typography.getFontFamily('normal'),
      backgroundColor: colors.background,
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
      fontFamily: typography.getFontFamily('bold'),
      fontSize: typography.fontSize.caption2,
      color: colors.textMuted,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
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
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.callout,
      color: colors.textMuted,
      marginHorizontal: 4,
    },
    inlineLocationInput: {
      fontFamily: typography.getFontFamily('normal'),
      backgroundColor: colors.background,
      borderRadius: 6,
      padding: 6,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: typography.fontSize.footnote,
      color: colors.text,
      marginLeft: 4,
      flex: 1,
    },
    dateToggles: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
};
