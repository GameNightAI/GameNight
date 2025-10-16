import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Switch, Modal } from 'react-native';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SquarePen, X } from 'lucide-react-native';
import { CreateEventDetails } from './CreateEventDetails';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useBodyScrollLock } from '@/utils/scrollLock';
import { useDeviceType } from '@/hooks/useDeviceType';


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
  defaultEventName: string;
  onEventDetailsSave: (name: string, description: string, location: string) => void;
}

// Types and helper component defined outside to prevent recreation on every render
type TimeParts = { h: string; m: string; p: 'AM' | 'PM' };

interface TimeRowProps {
  label: string;
  parts: TimeParts;
  onChange: (p: TimeParts) => void;
  onClear: () => void;
  error?: string;
  small?: boolean;
  touchTargets: any;
  styles: any;
  colors: any;
  saveAttempted: boolean;
}

const TimeRow = React.memo(({
  label,
  parts,
  onChange,
  onClear,
  error,
  small,
  touchTargets,
  styles,
  colors,
  saveAttempted,
}: TimeRowProps) => {
  const inputStyle = small ? styles.customTimeInput : styles.hhInput;
  return (
    <View style={styles.timeInputRow}>
      <Text style={styles.timeFormLabel}>{label}</Text>
      <TextInput
        style={inputStyle}
        value={parts.h}
        onChangeText={(text) => onChange({ ...parts, h: text.replace(/[^0-9]/g, '').slice(0, 2) })}
        placeholder="HH"
        keyboardType="numeric"
        maxLength={2}
      />
      <Text style={styles.timeSeparator}>:</Text>
      <TextInput
        style={inputStyle}
        value={parts.m}
        onChangeText={(text) => onChange({ ...parts, m: text.replace(/[^0-9]/g, '').slice(0, 2) })}
        placeholder="MM"
        keyboardType="numeric"
        maxLength={2}
      />
      <View style={styles.periodToggleContainer}>
        <TouchableOpacity
          style={[styles.periodButton, parts.p === 'AM' && styles.periodButtonActive]}
          onPress={() => onChange({ ...parts, p: 'AM' })}
          accessibilityRole="button"
          accessibilityLabel="Set period to AM"
        >
          <Text style={styles.periodButtonText}>AM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, parts.p === 'PM' && styles.periodButtonActive]}
          onPress={() => onChange({ ...parts, p: 'PM' })}
          accessibilityRole="button"
          accessibilityLabel="Set period to PM"
        >
          <Text style={styles.periodButtonText}>PM</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.timeResetButton, { marginLeft: 8 }]}
        hitSlop={touchTargets.small}
        accessibilityRole="button"
        accessibilityLabel={`Clear ${label.toLowerCase()} time`}
        accessibilityHint={`Clears the ${label.toLowerCase()} time`}
        onPress={(e) => {
          e.preventDefault?.();
          onClear();
        }}
      >
        <Text style={styles.clearTimeButtonText}>✕</Text>
      </TouchableOpacity>
      {saveAttempted && !!error ? (
        <Text style={[styles.validationError, { marginLeft: 8 }]}>{error}</Text>
      ) : null}
    </View>
  );
});

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
  defaultEventName,
  onEventDetailsSave
}: DateReviewModalProps) {
  const { colors, typography, touchTargets } = useTheme();
  const { announceForAccessibility } = useAccessibility();
  const insets = useSafeAreaInsets();
  const { isMobile, screenWidth, screenHeight } = useDeviceType();

  // Lock body scroll on web when modal is visible
  useBodyScrollLock(visible);

  const styles = useMemo(() => getStyles(colors, typography, isMobile, screenWidth, screenHeight, insets), [colors, typography, isMobile, screenWidth, screenHeight, insets]);


  const [localEventOptions, setLocalEventOptions] = useState(eventOptions);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'start' | 'end'>('start');
  const [timeValidationError, setTimeValidationError] = useState('');
  const [dateSpecificOptions, setDateSpecificOptions] = useState<Record<string, DateSpecificOptions>>({});
  const [currentEditingDate, setCurrentEditingDate] = useState<string>('');
  const [customTimeDates, setCustomTimeDates] = useState<Set<string>>(new Set());
  const [customLocationDates, setCustomLocationDates] = useState<Set<string>>(new Set());
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);

  // Global time input state: separate HH, MM, and period with validation
  const initialStartHours = eventOptions.startTime ? (() => {
    const h = eventOptions.startTime!.getHours();
    const hr12 = h % 12 === 0 ? 12 : h % 12;
    return hr12.toString();
  })() : '';
  const initialStartMinutes = eventOptions.startTime ? eventOptions.startTime!.getMinutes().toString().padStart(2, '0') : '';
  const initialStartPeriod: 'AM' | 'PM' = eventOptions.startTime ? (eventOptions.startTime!.getHours() >= 12 ? 'PM' : 'AM') : 'AM';

  const initialEndHours = eventOptions.endTime ? (() => {
    const h = eventOptions.endTime!.getHours();
    const hr12 = h % 12 === 0 ? 12 : h % 12;
    return hr12.toString();
  })() : '';
  const initialEndMinutes = eventOptions.endTime ? eventOptions.endTime!.getMinutes().toString().padStart(2, '0') : '';
  const initialEndPeriod: 'AM' | 'PM' = eventOptions.endTime ? (eventOptions.endTime!.getHours() >= 12 ? 'PM' : 'AM') : 'AM';

  const [startHourText, setStartHourText] = useState(initialStartHours);
  const [startMinuteText, setStartMinuteText] = useState(initialStartMinutes);
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>(initialStartPeriod);
  const [startTimeError, setStartTimeError] = useState('');

  const [endHourText, setEndHourText] = useState(initialEndHours);
  const [endMinuteText, setEndMinuteText] = useState(initialEndMinutes);
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>(initialEndPeriod);
  const [endTimeError, setEndTimeError] = useState('');

  // Validation UI control
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [showValidationBanner, setShowValidationBanner] = useState(false);

  // Per-date time text state: separate HH, MM, and period for start/end
  const [dateTimeTexts, setDateTimeTexts] = useState<Record<string, {
    startHour?: string; startMinute?: string; startPeriod?: 'AM' | 'PM'; startError?: string;
    endHour?: string; endMinute?: string; endPeriod?: 'AM' | 'PM'; endError?: string;
  }>>({});

  // Hide banner when all errors are resolved
  React.useEffect(() => {
    if (saveAttempted && showValidationBanner) {
      const hasGlobalErrors = !!(startTimeError || endTimeError);
      const hasPerDateErrors = Object.values(dateTimeTexts).some(date =>
        date?.startError || date?.endError
      );

      if (!hasGlobalErrors && !hasPerDateErrors) {
        setShowValidationBanner(false);
      }
    }
  }, [startTimeError, endTimeError, dateTimeTexts, saveAttempted, showValidationBanner]);

  // Determine if the user has manually provided any details
  const hasManualDetails = !!(
    (eventName && eventName !== defaultEventName) ||
    eventDescription?.trim() ||
    eventLocation?.trim()
  );

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


  const getDatePart = (date: Date, type: 'start' | 'end', part: 'hour' | 'minute' | 'period'): string => {
    const dateKey = getDateKey(date);
    const existing = dateTimeTexts[dateKey];

    // For custom time dates, only return what's explicitly set; don't fall back to global
    if (existing) {
      if (type === 'start') {
        if (part === 'hour') return existing.startHour ?? '';
        if (part === 'minute') return existing.startMinute ?? '';
        return (existing.startPeriod ?? 'AM') as string;
      } else {
        if (part === 'hour') return existing.endHour ?? '';
        if (part === 'minute') return existing.endMinute ?? '';
        return (existing.endPeriod ?? 'PM') as string;
      }
    }

    // If no custom time entry, return defaults (empty for h/m, AM/PM for period)
    if (part === 'hour' || part === 'minute') return '';
    return type === 'start' ? 'AM' : 'PM';
  };

  const setDatePart = (date: Date, type: 'start' | 'end', part: 'hour' | 'minute' | 'period', value: string) => {
    const dateKey = getDateKey(date);
    setDateTimeTexts(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        ...(type === 'start' ? {
          startHour: part === 'hour' ? value : prev[dateKey]?.startHour,
          startMinute: part === 'minute' ? value : prev[dateKey]?.startMinute,
          startPeriod: (part === 'period' ? value : prev[dateKey]?.startPeriod) as 'AM' | 'PM'
        }
          : {
            endHour: part === 'hour' ? value : prev[dateKey]?.endHour,
            endMinute: part === 'minute' ? value : prev[dateKey]?.endMinute,
            endPeriod: (part === 'period' ? value : prev[dateKey]?.endPeriod) as 'AM' | 'PM'
          })
      }
    }));
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

  // Helpers (inline): sanitization, completeness, conversion, compare
  const isFilledParts = (h?: string, m?: string) => {
    return !!(h && h.length > 0 && m && m.length > 0);
  };


  const convertPartsToDate = (hourStr: string, minuteStr: string, period: 'AM' | 'PM', date: Date) => {
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (isNaN(hour) || isNaN(minute)) return null;
    if (hour < 1 || hour > 12) return null;
    if (minute < 0 || minute > 59) return null;
    let hour24 = hour % 12;
    if (period === 'PM') hour24 += 12;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour24, minute);
  };

  const compareTimes = (a: Date, b: Date) => a.getTime() - b.getTime();

  const anyErrorsPresent = (globalStartErr: string, globalEndErr: string, perDate: Record<string, { startError?: string; endError?: string }>) => {
    if (globalStartErr || globalEndErr) return true;
    for (const k in perDate) {
      if (perDate[k]?.startError || perDate[k]?.endError) return true;
    }
    return false;
  };

  // Validation on save
  const validateAllTimes = () => {
    const errors: {
      globalStart?: string;
      globalEnd?: string;
      perDate: Record<string, { startError?: string; endError?: string }>;
    } = { perDate: {} };

    // Validate global times
    const startFilled = isFilledParts(startHourText, startMinuteText);
    const endFilled = isFilledParts(endHourText, endMinuteText);

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (startFilled) {
      startDate = convertPartsToDate(startHourText, startMinuteText, startPeriod, new Date());
      if (!startDate) {
        errors.globalStart = 'Hour 1–12, Minute 00–59';
      }
    }

    if (endFilled) {
      endDate = convertPartsToDate(endHourText, endMinuteText, endPeriod, new Date());
      if (!endDate) {
        errors.globalEnd = 'Hour 1–12, Minute 00–59';
      }
    }

    // Check start >= end if both present
    if (startDate && endDate && compareTimes(startDate, endDate) >= 0) {
      errors.globalEnd = 'End must be after Start';
    }

    // Validate per-date custom times
    selectedDates.forEach(date => {
      const dateKey = getDateKey(date);
      const hasCustomTime = customTimeDates.has(dateKey);

      if (hasCustomTime) {
        const startHour = getDatePart(date, 'start', 'hour');
        const startMinute = getDatePart(date, 'start', 'minute');
        const startPeriod = getDatePart(date, 'start', 'period') as 'AM' | 'PM';
        const endHour = getDatePart(date, 'end', 'hour');
        const endMinute = getDatePart(date, 'end', 'minute');
        const endPeriod = getDatePart(date, 'end', 'period') as 'AM' | 'PM';

        const customStartFilled = isFilledParts(startHour, startMinute);
        const customEndFilled = isFilledParts(endHour, endMinute);

        let customStartDate: Date | null = null;
        let customEndDate: Date | null = null;

        if (customStartFilled) {
          customStartDate = convertPartsToDate(startHour, startMinute, startPeriod, date);
          if (!customStartDate) {
            errors.perDate[dateKey] = { ...errors.perDate[dateKey], startError: 'Hour 1–12, Minute 00–59' };
          }
        }

        if (customEndFilled) {
          customEndDate = convertPartsToDate(endHour, endMinute, endPeriod, date);
          if (!customEndDate) {
            errors.perDate[dateKey] = { ...errors.perDate[dateKey], endError: 'Hour 1–12, Minute 00–59' };
          }
        }

        // Check custom start >= end if both present
        if (customStartDate && customEndDate && compareTimes(customStartDate, customEndDate) >= 0) {
          errors.perDate[dateKey] = { ...errors.perDate[dateKey], endError: 'End must be after Start' };
        }
      }
    });

    return errors;
  };

  // Memoized callbacks for global time inputs
  const handleStartChange = useCallback((p: TimeParts) => {
    setStartHourText(p.h);
    setStartMinuteText(p.m);
    setStartPeriod(p.p);
    const d = isFilledParts(p.h, p.m) ? convertPartsToDate(p.h, p.m, p.p, new Date()) : null;
    if (!isFilledParts(p.h, p.m)) {
      setLocalEventOptions(prev => ({ ...prev, startTime: null }));
    } else if (d) {
      setLocalEventOptions(prev => ({ ...prev, startTime: d }));
    }
  }, []);

  const handleStartClear = useCallback(() => {
    setStartHourText('');
    setStartMinuteText('');
    setLocalEventOptions(prev => ({ ...prev, startTime: null }));
    announceForAccessibility('Start time cleared');
  }, [announceForAccessibility]);

  const handleEndChange = useCallback((p: TimeParts) => {
    setEndHourText(p.h);
    setEndMinuteText(p.m);
    setEndPeriod(p.p);
    const d = isFilledParts(p.h, p.m) ? convertPartsToDate(p.h, p.m, p.p, new Date()) : null;
    if (!isFilledParts(p.h, p.m)) {
      setLocalEventOptions(prev => ({ ...prev, endTime: null }));
    } else if (d) {
      setLocalEventOptions(prev => ({ ...prev, endTime: d }));
    }
  }, []);

  const handleEndClear = useCallback(() => {
    setEndHourText('');
    setEndMinuteText('');
    setLocalEventOptions(prev => ({ ...prev, endTime: null }));
    announceForAccessibility('End time cleared');
  }, [announceForAccessibility]);

  // Memoize global time parts
  const startParts = useMemo(() => ({ h: startHourText, m: startMinuteText, p: startPeriod }), [startHourText, startMinuteText, startPeriod]);
  const endParts = useMemo(() => ({ h: endHourText, m: endMinuteText, p: endPeriod }), [endHourText, endMinuteText, endPeriod]);


  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dateReviewDialog}>
          <View style={styles.dateReviewHeader}>
            <Text style={styles.dateReviewTitle}>Review Selected Dates</Text>
            <TouchableOpacity
              style={[styles.closeButton]}
              onPress={() => { onClose(); announceForAccessibility?.('Date review modal closed'); }}
              accessibilityLabel="Close"
              accessibilityHint="Closes the date review modal"
              hitSlop={touchTargets.sizeTwenty}
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {showValidationBanner && (
            <View style={styles.validationBanner}>
              <Text style={styles.validationBannerText}>Fix highlighted times to continue</Text>
            </View>
          )}

          <ScrollView
            style={styles.dateReviewContent}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Event Details Section */}
            <View style={styles.eventDetailsSection}>
              <TouchableOpacity
                style={[styles.eventDetailsButton, hasManualDetails && styles.eventDetailsButtonActive]}
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
                    <View style={[styles.eventDetailsButtonIndicator, { opacity: hasManualDetails ? 1 : 0, marginRight: 8 }]}>
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
                  <TimeRow
                    label="Start"
                    parts={startParts}
                    onChange={handleStartChange}
                    onClear={handleStartClear}
                    error={startTimeError}
                    touchTargets={touchTargets}
                    styles={styles}
                    colors={colors}
                    saveAttempted={saveAttempted}
                  />
                </View>
                <View style={styles.timeForm}>
                  <TimeRow
                    label="End"
                    parts={endParts}
                    onChange={handleEndChange}
                    onClear={handleEndClear}
                    error={endTimeError}
                    touchTargets={touchTargets}
                    styles={styles}
                    colors={colors}
                    saveAttempted={saveAttempted}
                  />
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
                          <TimeRow
                            label="Start"
                            small
                            parts={{
                              h: getDatePart(date, 'start', 'hour'),
                              m: getDatePart(date, 'start', 'minute'),
                              p: getDatePart(date, 'start', 'period') as 'AM' | 'PM',
                            }}
                            onChange={(p) => {
                              setDatePart(date, 'start', 'hour', p.h);
                              setDatePart(date, 'start', 'minute', p.m);
                              setDatePart(date, 'start', 'period', p.p);
                              const d = isFilledParts(p.h, p.m) ? convertPartsToDate(p.h, p.m, p.p, date) : null;
                              if (!isFilledParts(p.h, p.m)) {
                                updateDateSpecificOptions(date, { startTime: null });
                              } else if (d) {
                                updateDateSpecificOptions(date, { startTime: d });
                              }
                            }}
                            onClear={() => {
                              setDatePart(date, 'start', 'hour', '');
                              setDatePart(date, 'start', 'minute', '');
                              updateDateSpecificOptions(date, { startTime: null });
                            }}
                            error={dateTimeTexts[dateKey]?.startError}
                            touchTargets={touchTargets}
                            styles={styles}
                            colors={colors}
                            saveAttempted={saveAttempted}
                          />
                          <TimeRow
                            label="End"
                            small
                            parts={{
                              h: getDatePart(date, 'end', 'hour'),
                              m: getDatePart(date, 'end', 'minute'),
                              p: getDatePart(date, 'end', 'period') as 'AM' | 'PM',
                            }}
                            onChange={(p) => {
                              setDatePart(date, 'end', 'hour', p.h);
                              setDatePart(date, 'end', 'minute', p.m);
                              setDatePart(date, 'end', 'period', p.p);
                              const d = isFilledParts(p.h, p.m) ? convertPartsToDate(p.h, p.m, p.p, date) : null;
                              if (!isFilledParts(p.h, p.m)) {
                                updateDateSpecificOptions(date, { endTime: null });
                              } else if (d) {
                                updateDateSpecificOptions(date, { endTime: d });
                              }
                            }}
                            onClear={() => {
                              setDatePart(date, 'end', 'hour', '');
                              setDatePart(date, 'end', 'minute', '');
                              updateDateSpecificOptions(date, { endTime: null });
                            }}
                            error={dateTimeTexts[dateKey]?.endError}
                            touchTargets={touchTargets}
                            styles={styles}
                            colors={colors}
                            saveAttempted={saveAttempted}
                          />
                          {saveAttempted && (dateTimeTexts[dateKey]?.startError || dateTimeTexts[dateKey]?.endError) && (
                            <View style={styles.perDateErrorContainer}>
                              {dateTimeTexts[dateKey]?.startError && (
                                <Text style={styles.validationError}>{dateTimeTexts[dateKey].startError}</Text>
                              )}
                              {dateTimeTexts[dateKey]?.endError && (
                                <Text style={styles.validationError}>{dateTimeTexts[dateKey].endError}</Text>
                              )}
                            </View>
                          )}
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
                setSaveAttempted(true);
                const errors = validateAllTimes();

                if (anyErrorsPresent(errors.globalStart || '', errors.globalEnd || '', errors.perDate)) {
                  // Set error states
                  setStartTimeError(errors.globalStart || '');
                  setEndTimeError(errors.globalEnd || '');

                  // Update per-date error states
                  setDateTimeTexts(prev => {
                    const updated = { ...prev };
                    for (const dateKey in errors.perDate) {
                      updated[dateKey] = {
                        ...updated[dateKey],
                        startError: errors.perDate[dateKey].startError,
                        endError: errors.perDate[dateKey].endError
                      };
                    }
                    return updated;
                  });

                  // Show banner
                  setShowValidationBanner(true);

                  // Announce error
                  announceForAccessibility('Please fix the highlighted time errors');
                  return;
                }

                // Hide banner and clear errors
                setShowValidationBanner(false);
                setStartTimeError('');
                setEndTimeError('');
                setDateTimeTexts(prev => {
                  const updated = { ...prev };
                  for (const dateKey in updated) {
                    updated[dateKey] = { ...updated[dateKey], startError: '', endError: '' };
                  }
                  return updated;
                });

                // Build final options with validated dates
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
    </Modal>
  );
}

const getStyles = (colors: any, typography: any, isMobile: boolean, screenWidth: number, screenHeight: number, insets: any) => {
  const responsiveMinHeight = Math.max(500, Math.min(600, screenHeight * 0.75));

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
      //paddingTop: Math.max(20, insets.top),
      paddingBottom: Math.max(20, insets.bottom),
      paddingHorizontal: 20,
    },
    dateReviewDialog: {
      backgroundColor: colors.card,
      borderRadius: 12,
      width: isMobile ? '100%' : '90%',
      maxWidth: isMobile ? 500 : Math.min(800, screenWidth * 0.8),
      minHeight: responsiveMinHeight,
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
      borderBottomColor: colors.border,
    },
    closeButton: {
      paddingHorizontal: 4,
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
    hhInput: {
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
      width: 56,
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
    periodToggleContainer: {
      flexDirection: 'row',
      marginLeft: 8,
    },
    periodButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      marginLeft: 4,
    },
    periodButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    periodButtonText: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.caption1,
      color: colors.text,
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
    validationBanner: {
      backgroundColor: colors.error,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    validationBannerText: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.subheadline,
      color: '#ffffff',
    },
    perDateErrorContainer: {
      marginTop: 8,
      paddingHorizontal: 8,
    },
  });
};
