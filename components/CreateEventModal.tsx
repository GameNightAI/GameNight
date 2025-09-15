import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, Platform, Modal } from 'react-native';
import { format, isAfter, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth, isSameDay, isBefore, startOfDay, min, max } from 'date-fns';
import { CreateEventDetails } from './CreateEventDetails';
import { DateReviewModal } from './DateReviewModal';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { PollEvent } from '@/types/poll';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  pollId?: string; // Optional poll ID if creating event from a poll
}

// Interface for date-specific options that go into poll_events table
interface DateSpecificOptions {
  location: string;
  startTime: Date | null;
  endTime: Date | null;
}

// Interface for event creation options (UI state + poll_events data)
interface EventOptions {
  location: string;
  startTime: Date | null;
  endTime: Date | null;
  dateSpecificOptions?: Record<string, DateSpecificOptions>;
}

export default function CreateEventModal({ visible, onClose, onSuccess, pollId }: CreateEventModalProps) {
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [defaultEventName, setDefaultEventName] = useState('');
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [showDateReviewModal, setShowDateReviewModal] = useState(false);
  const [eventOptions, setEventOptions] = useState<EventOptions>({
    location: '',
    startTime: null,
    endTime: null,
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const resetForm = () => {
    setEventName('');
    setEventDescription('');
    setEventLocation('');
    setDefaultEventName('');
    setEventOptions({
      location: '',
      startTime: null,
      endTime: null,
    });
    setSelectedDates([]);
    setCurrentMonth(new Date()); // Reset calendar to current month
    setShowEventDetailsModal(false);
    setShowDateReviewModal(false);
  };

  useEffect(() => {
    if (visible) {
      Animated.timing(animation, {
        toValue: 1,
        duration: 120, // Fast animation
        useNativeDriver: true,
      }).start();
    } else {
      animation.setValue(0);
      // Reset form when modal closes
      resetForm();
    }
  }, [visible]);

  // Update default event name when selected dates change
  useEffect(() => {
    if (selectedDates.length === 0) {
      setDefaultEventName('');
      if (!eventName || eventName.startsWith('GameNyte - ')) {
        setEventName('');
      }
    } else if (selectedDates.length === 1) {
      const date = selectedDates[0];
      const newDefaultName = `GameNyte - ${format(date, 'MMM/dd')}`;
      setDefaultEventName(newDefaultName);
      if (!eventName || eventName.startsWith('GameNyte - ')) {
        setEventName(newDefaultName);
      }
    } else {
      const minDate = min(selectedDates);
      const maxDate = max(selectedDates);
      const newDefaultName = `GameNyte - ${format(minDate, 'MMM.dd')} - ${format(maxDate, 'MMM.dd')}`;
      setDefaultEventName(newDefaultName);
      if (!eventName || eventName.startsWith('GameNyte - ')) {
        setEventName(newDefaultName);
      }
    }
  }, [selectedDates]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev =>
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const getCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    // Adjust start to beginning of the first calendar week (Monday-start)
    let startDay = start.getDay(); // Sunday = 0
    startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Monday = 0

    // Calculate the first date to display (could be from the previous month)
    const calendarStart = new Date(start);
    calendarStart.setDate(start.getDate() - startDay);

    // Build exactly 35 days (5 weeks)
    const days: {
      date: Date;
      isCurrentMonth: boolean;
      isPast: boolean;
    }[] = [];

    for (let i = 0; i < 35; i++) {
      const date = new Date(calendarStart);
      date.setDate(calendarStart.getDate() + i);

      days.push({
        date,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isPast: isBefore(date, startOfDay(new Date())),
      });
    }

    return days;
  };

  const toggleDateSelection = (date: Date) => {
    setSelectedDates(prev => {
      const isSelected = prev.some(d => isSameDay(d, date));
      if (isSelected) {
        return prev.filter(d => !isSameDay(d, date));
      } else {
        return [...prev, date];
      }
    });
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => isSameDay(d, date));
  };

  const handleEventDetailsSave = (name: string, description: string, location: string) => {
    setEventName(name);
    setEventDescription(description);
    setEventLocation(location);
  };

  const handleCreate = async (finalEventOptions: EventOptions) => {
    if (!eventName) {
      Alert.alert('Please enter an event name');
      return;
    }
    if (selectedDates.length === 0) {
      Alert.alert('Please select at least one available date');
      return;
    }

    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('You must be logged in to create an event');
        return;
      }

      // Create the main poll record
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          user_id: user.id,
          title: eventName,
          description: eventDescription.trim() || null,
          max_votes: 1,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create poll_events entries for each selected date
      const eventPromises = selectedDates.map(async (date) => {
        // Get date-specific options if they exist
        const dateKey = date.toISOString().split('T')[0];
        const dateSpecificOptions = finalEventOptions.dateSpecificOptions?.[dateKey];

        // Determine location and time for this specific date
        const location = dateSpecificOptions?.location || eventLocation || '';

        const startTime = dateSpecificOptions?.startTime || finalEventOptions.startTime || null;
        const endTime = dateSpecificOptions?.endTime || finalEventOptions.endTime || null;

        const eventData = {
          poll_id: poll.id,
          location: location || '',
          event_date: format(date, 'yyyy-MM-dd'),
          start_time: startTime ? format(startTime, 'HH:mm') : null,
          end_time: endTime ? format(endTime, 'HH:mm') : null,
        };

        const { data: event, error: eventError } = await supabase
          .from('poll_events')
          .insert(eventData)
          .select()
          .single();

        if (eventError) throw eventError;
        return event;
      });

      const createdEvents = await Promise.all(eventPromises);

      Toast.show({ type: 'success', text1: 'Event created successfully!' });

      // Reset form
      resetForm();

      // Close modal and call success callback
      onClose();
      onSuccess?.();

    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const calendarDays = getCalendarDays();

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.dialog,
            {
              opacity: animation,
              transform: [
                {
                  scale: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {pollId ? 'Create Event for Poll' : 'Create Event'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              onPress={() => setShowEventDetailsModal(true)}
              style={styles.input}
            >
              <Text style={eventName ? styles.eventNameText : styles.placeholderText}>
                {eventName || 'Enter Event Details (Optional)'}
              </Text>
              <View style={styles.eventDetailsPreview}>
                <Text style={styles.eventDescriptionText} numberOfLines={2}>
                  {eventDescription || ''}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.availabilityLabel}>Set Available Dates</Text>
            <Text style={styles.availabilitySublabel}>Tap dates when you're available to play</Text>

            {/* Calendar Container */}
            <View style={styles.calendarContainer}>
              {/* Month Navigation */}
              <View style={styles.monthNavigation}>
                <TouchableOpacity
                  style={styles.monthNavButton}
                  onPress={() => navigateMonth('prev')}
                >
                  <ChevronLeft size={20} color="#666666" />
                </TouchableOpacity>
                <Text style={styles.monthText}>
                  {format(currentMonth, 'MMMM yyyy')}
                </Text>
                <TouchableOpacity
                  style={styles.monthNavButton}
                  onPress={() => navigateMonth('next')}
                >
                  <ChevronRight size={20} color="#666666" />
                </TouchableOpacity>
              </View>

              {/* Day Headers */}
              <View style={styles.dayHeaders}>
                {days.map((day, index) => (
                  <Text
                    key={day}
                    style={[
                      styles.dayHeader,
                      index === days.length - 1 && styles.lastDayHeader // Remove border from last header
                    ]}
                  >
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {Array.from({ length: 5 }, (_, rowIndex) => (
                  <View key={rowIndex} style={styles.calendarRow}>
                    {Array.from({ length: 7 }, (_, colIndex) => {
                      const dayIndex = rowIndex * 7 + colIndex;
                      const dayData = calendarDays[dayIndex];
                      if (!dayData) return (
                        <TouchableOpacity
                          key={colIndex}
                          style={styles.calendarDay}
                          disabled={true}
                        />
                      );

                      const { date, isCurrentMonth, isPast } = dayData;
                      const isSelected = isDateSelected(date);

                      return (
                        <TouchableOpacity
                          key={colIndex}
                          style={[
                            styles.calendarDay,
                            isSelected && styles.selectedDay,
                            !isCurrentMonth && styles.otherMonthDay,
                            isPast && styles.pastDay,
                          ]}
                          onPress={() => !isPast && toggleDateSelection(date)}
                          disabled={isPast}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              isSelected && styles.selectedDayText,
                              !isCurrentMonth && styles.otherMonthDayText,
                              isPast && styles.pastDayText,
                            ]}
                          >
                            {date.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.createButton, selectedDates.length === 0 && styles.createButtonDisabled]}
              onPress={() => selectedDates.length > 0 && setShowDateReviewModal(true)}
              disabled={selectedDates.length === 0}
            >
              <Text style={styles.createButtonText}>Select Dates</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>

      {/* Event Details Modal */}
      <CreateEventDetails
        isVisible={showEventDetailsModal}
        onClose={() => setShowEventDetailsModal(false)}
        onSave={handleEventDetailsSave}
        currentEventName={eventName}
        currentDescription={eventDescription}
        currentLocation={eventLocation}
      />

      {/* Date Review Modal */}
      <DateReviewModal
        visible={showDateReviewModal}
        onClose={() => setShowDateReviewModal(false)}
        onFinalize={handleCreate}
        selectedDates={selectedDates}
        eventOptions={eventOptions}
        defaultLocation={eventLocation}
        pollId={pollId}
      />
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
  dialogContainer: {
    maxWidth: 400,
    maxHeight: '85%',
    width: '100%',
    height: 'auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '85%',
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
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },

  createButton: {
    backgroundColor: '#0070f3',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center'
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  cancelButton: {
    marginTop: 12,
    alignItems: 'center'
  },

  eventNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2b5f',
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
  },
  eventDetailsPreview: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    minHeight: 0,
  },
  eventDescriptionText: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  availabilityLabel: {
    marginTop: 16,
    marginBottom: 4,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2b5f',
    fontFamily: 'Poppins-SemiBold',
  },
  availabilitySublabel: {
    marginBottom: 8,
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Poppins-Regular',
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  cancelButtonText: {
    color: '#ff9654',
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  calendarContainer: {
    marginTop: 16,
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f7f7fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    width: '100%',
    maxWidth: 350, // Fixed maximum width
    alignSelf: 'center',
    overflow: 'hidden', // Prevent overflow
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  monthNavButton: {
    padding: 5,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b5f',
    fontFamily: 'Poppins-SemiBold',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 5,
    width: '100%',
  },
  dayHeader: {
    flex: 1, // Equal width for each header
    height: 30, // Reduced height for headers
    textAlign: 'center',
    lineHeight: 30,
    backgroundColor: '#e1e5ea',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a2b5f',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a2b5f',
  },
  lastDayHeader: {
    borderRightWidth: 0, // Remove border from last header
  },
  calendarGrid: {
    width: '100%', // Use full width of container
    height: 250, // Fixed height for 5 rows (50 * 5 = 250)
  },
  calendarRow: {
    flexDirection: 'row',
    width: '100%',
    height: 50, // Fixed height per row (250 ÷ 5 = 50)
  },
  calendarDay: {
    flex: 1, // Equal width for each day cell
    height: 50, // Match row height
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    position: 'relative',
  },
  otherMonthDay: {
    opacity: 0.5,
  },
  pastDay: {
    backgroundColor: '#f0f0f0',
    borderColor: '#f0f0f0',
  },
  selectedDay: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  otherMonthDayText: {
    color: '#888',
  },
  pastDayText: {
    color: '#888',
  },
  selectedDayText: {
    color: 'white',
  },
});
