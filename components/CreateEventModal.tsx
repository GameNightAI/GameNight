import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView, Alert, Pressable, Animated } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, isAfter } from 'date-fns';
// If you haven't installed this yet, run: expo install @react-native-community/datetimepicker
// For date-fns: npm install date-fns

// Types
export type TimeRange = {
  start: Date | null;
  end: Date | null;
};

const hours = Array.from({ length: 24 }, (_, i) => i);
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate?: (payload: any) => void;
}

export default function CreateEventModal({ visible, onClose, onCreate }: CreateEventModalProps) {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>({ start: null, end: null });
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [availabilityGrid, setAvailabilityGrid] = useState(
    Array(7).fill(null).map(() => Array(24).fill(false))
  );
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
    }
  }, [visible]);

  const toggleSlot = (dayIndex: number, hour: number) => {
    setAvailabilityGrid(grid =>
      grid.map((day, i) =>
        i === dayIndex ? day.map((slot, h) => (h === hour ? !slot : slot)) : day
      )
    );
  };

  const handleCreate = () => {
    if (!eventName || !eventDate || !timeRange.start || !timeRange.end) {
      Alert.alert('Please fill in all fields');
      return;
    }
    // Use date-fns to check that end time is after start time
    if (!isAfter(timeRange.end, timeRange.start)) {
      Alert.alert('End time must be after start time');
      return;
    }
    // Format the date and times for storage/display
    const formattedDate = format(eventDate, 'yyyy-MM-dd');
    const formattedStart = format(timeRange.start, 'HH:mm');
    const formattedEnd = format(timeRange.end, 'HH:mm');
    const payload = {
      name: eventName,
      date: formattedDate, // e.g., "2024-06-13"
      startTime: formattedStart, // e.g., "14:00"
      endTime: formattedEnd,     // e.g., "16:00"
      availability: availabilityGrid,
    };
    onCreate?.(payload);
    onClose();
    // Optionally reset form here
    setEventName('');
    setEventDate(null);
    setTimeRange({ start: null, end: null });
    setAvailabilityGrid(Array(7).fill(null).map(() => Array(24).fill(false)));
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.modal,
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
          <ScrollView>
            <Text style={styles.title}>Create Event</Text>
            <TextInput
              style={styles.input}
              placeholder="Event Name"
              value={eventName}
              onChangeText={setEventName}
            />

            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
              <Text>
                {eventDate ? format(eventDate, 'PPP') : 'Select Event Date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={eventDate || new Date()}
                mode="date"
                display="default"
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  setShowDatePicker(false);
                  if (date) setEventDate(date);
                }}
              />
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => setShowStartTimePicker(true)} style={[styles.input, { flex: 1, marginRight: 4 }]}>
                <Text>
                  {timeRange.start ? format(timeRange.start, 'HH:mm') : 'Start Time'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowEndTimePicker(true)} style={[styles.input, { flex: 1, marginLeft: 4 }]}>
                <Text>
                  {timeRange.end ? format(timeRange.end, 'HH:mm') : 'End Time'}
                </Text>
              </TouchableOpacity>
            </View>
            {showStartTimePicker && (
              <DateTimePicker
                value={timeRange.start || new Date()}
                mode="time"
                display="default"
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  setShowStartTimePicker(false);
                  if (date) setTimeRange(tr => ({ ...tr, start: date }));
                }}
              />
            )}
            {showEndTimePicker && (
              <DateTimePicker
                value={timeRange.end || new Date()}
                mode="time"
                display="default"
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  setShowEndTimePicker(false);
                  if (date) setTimeRange(tr => ({ ...tr, end: date }));
                }}
              />
            )}

            <Text style={{ marginTop: 16, marginBottom: 8 }}>Availability Grid</Text>
            <ScrollView horizontal contentContainerStyle={{ minWidth: days.length * 40 + 50 }}>
              <View>
                {/* Header Row: Days */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.cornerSpacer} />
                  {days.map((day, dayIndex) => (
                    <View key={dayIndex} style={styles.dayHeaderCell}>
                      <Text style={styles.dayHeaderText}>{day}</Text>
                    </View>
                  ))}
                </View>
                {/* Rows: Hours */}
                {hours.map((hour) => (
                  <View key={hour} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Hour label */}
                    <View style={styles.hourHeaderCell}>
                      <Text style={styles.hourHeaderText}>{hour}:00</Text>
                    </View>
                    {/* Slots for each day in this hour */}
                    {days.map((_, dayIndex) => (
                      <View key={dayIndex} style={styles.slotCell}>
                        <TouchableOpacity
                          onPress={() => toggleSlot(dayIndex, hour)}
                          style={[
                            styles.slot,
                            { backgroundColor: availabilityGrid[dayIndex][hour] ? '#10b981' : '#ddd' }
                          ]}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Create Event</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={{ color: '#ff9654', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center'
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '90%', maxWidth: 400, maxHeight: '90%'
  },
  title: {
    fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center'
  },
  input: {
    backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, marginBottom: 12
  },
  dayHeader: {
    width: 32, fontSize: 12, textAlign: 'center', fontWeight: 'bold', marginHorizontal: 1
  },
  hourHeader: {
    width: 36, fontSize: 10, textAlign: 'right', fontWeight: 'bold', marginRight: 2
  },
  slot: {
    width: 28, height: 24, borderRadius: 4, margin: 1, borderWidth: 1, borderColor: '#bbb'
  },
  createButton: {
    backgroundColor: '#0070f3', padding: 12, borderRadius: 8, marginTop: 16, alignItems: 'center'
  },
  cancelButton: {
    marginTop: 12, alignItems: 'center'
  },
  cornerSpacer: {
    width: 44, // matches hourHeaderCell width
    height: 28,
  },
  dayHeaderCell: {
    width: 40,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f7f7fa',
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a2b5f',
    textAlign: 'center',
  },
  hourHeaderCell: {
    width: 44,
    height: 28,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 4,
    borderRightWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f7f7fa',
  },
  hourHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a2b5f',
    textAlign: 'right',
  },
  slotCell: {
    width: 40,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
