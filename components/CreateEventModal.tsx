import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, Platform, Modal } from 'react-native';
import { format, isAfter, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfDay } from 'date-fns';
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
  useSameLocation: boolean;
  useSameTime: boolean;
  location: string;
  startTime: Date | null;
  endTime: Date | null;
  dateSpecificOptions?: Record<string, DateSpecificOptions>;
}

export default function CreateEventModal({ visible, onClose, onSuccess, pollId }: CreateEventModalProps) {
  const router = useRouter();
  const [eventName, setEventName] = useState('GameNyte');
  const [eventDescription, setEventDescription] = useState('');
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [showDateReviewModal, setShowDateReviewModal] = useState(false);
  const [eventOptions, setEventOptions] = useState<EventOptions>({
    useSameLocation: true,
    useSameTime: true,
    location: '',
    startTime: null,
    endTime: null,
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(animation, {
        toValue: 1,
        duration: 120, // Fast animation
        useNativeDriver: true,
      }).start();
    } else {
      animation.setValue(0);
      // Reset internal modal states when main modal closes
      setShowEventDetailsModal(false);
      setShowDateReviewModal(false);
    }
  }, [visible]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev =>
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const getCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    // Get all days in the month
    const monthDays = eachDayOfInterval({ start, end });

    // Get the first day of the week for the first day of the month
    // Monday = 0, Tuesday = 1, ..., Sunday = 6
    let firstDayOfWeek = start.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Convert Sunday=0 to Sunday=6, others shift by 1

    // Add days from previous month to fill the first week
    const prevMonthDays = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(start);
      prevDate.setDate(start.getDate() - (i + 1));
      prevMonthDays.push({ date: prevDate, isCurrentMonth: false, isPast: true });
    }

    // Add current month days
    const currentMonthDays = monthDays.map(date => ({
      date,
      isCurrentMonth: true,
      isPast: isBefore(date, startOfDay(new Date()))
    }));

    // Calculate how many days we need to fill exactly 5 rows (35 days total)
    const totalDays = prevMonthDays.length + currentMonthDays.length;
    const remainingDays = 35 - totalDays; // 5 rows × 7 days = 35

    // Add days from next month to fill the remaining slots
    const nextMonthDays = [];
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(end);
      nextDate.setDate(end.getDate() + i);
      nextMonthDays.push({ date: nextDate, isCurrentMonth: false, isPast: false });
    }

    // Ensure we return exactly 35 days
    const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
    return allDays.slice(0, 35);
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

  const handleEventDetailsSave = (name: string, description: string) => {
    setEventName(name);
    setEventDescription(description);
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
        const location = finalEventOptions.useSameLocation
          ? finalEventOptions.location
          : (dateSpecificOptions?.location || '');

        const startTime = finalEventOptions.useSameTime
          ? finalEventOptions.startTime
          : (dateSpecificOptions?.startTime || null);

        const endTime = finalEventOptions.useSameTime
          ? finalEventOptions.endTime
          : (dateSpecificOptions?.endTime || null);

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
      setEventName('GameNyte');
      setEventDescription('');
      setEventOptions({
        useSameLocation: true,
        useSameTime: true,
        location: '',
        startTime: null,
        endTime: null,
      });
      setSelectedDates([]);

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
                {eventName || 'Enter Event Name & Description'}
              </Text>
              {eventDescription && (
                <View style={styles.eventDetailsPreview}>
                  <Text style={styles.eventDescriptionText} numberOfLines={2}>
                    {eventDescription}
                  </Text>
                </View>
              )}
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
                {days.map(day => (
                  <Text key={day} style={styles.dayHeader}>
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
      />

      {/* Date Review Modal */}
      <DateReviewModal
        visible={showDateReviewModal}
        onClose={() => setShowDateReviewModal(false)}
        onFinalize={handleCreate}
        selectedDates={selectedDates}
        eventOptions={eventOptions}
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
    justifyContent: 'space-around',
    marginBottom: 5,
  },
  dayHeader: {
    width: '14.28%', // 100% ÷ 7 columns = 14.28%
    height: 50, // Match row height
    textAlign: 'center',
    lineHeight: 50,
    backgroundColor: '#e1e5ea',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a2b5f',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a2b5f',
  },
  calendarGrid: {
    width: 330, // Fixed width
    height: 300, // Fixed height (330 * 6/7 ≈ 300)
  },
  calendarRow: {
    flexDirection: 'row',
    width: '100%',
    height: 50, // Fixed height per row (300 ÷ 6 = 50)
  },
  calendarDay: {
    width: '14.28%', // 100% ÷ 7 columns = 14.28%
    aspectRatio: 1, // Square cells
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
