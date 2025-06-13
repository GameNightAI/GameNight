import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, ScrollView, TextInput } from 'react-native';
import { X, Calendar, ChevronLeft, ChevronRight, Share2, Plus, CreditCard as Edit3, Clock, ChevronDown, MapPin } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface CreateDatePollModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CalendarDate {
  date: Date;
  isSelected: boolean;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface TimeOption {
  value: string;
  label: string;
}

export const CreateDatePollModal: React.FC<CreateDatePollModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [title, setTitle] = useState('Game Night');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [showStartTimeDropdown, setShowStartTimeDropdown] = useState(false);
  const [showEndTimeDropdown, setShowEndTimeDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate time options in 15-minute increments (12-hour format)
  const generateTimeOptions = (): TimeOption[] => {
    const options: TimeOption[] = [];
    
    for (let hour = 1; hour <= 12; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const minuteStr = minute.toString().padStart(2, '0');
        
        // AM times
        const amValue = `${hour.toString().padStart(2, '0')}:${minuteStr}:AM`;
        const amLabel = `${hour}:${minuteStr} AM`;
        options.push({ value: amValue, label: amLabel });
        
        // PM times
        const pmValue = `${hour.toString().padStart(2, '0')}:${minuteStr}:PM`;
        const pmLabel = `${hour}:${minuteStr} PM`;
        options.push({ value: pmValue, label: pmLabel });
      }
    }
    
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Reset form when modal opens
  useEffect(() => {
    if (isVisible) {
      resetForm();
    }
  }, [isVisible]);

  const resetForm = () => {
    setSelectedDates([]);
    setTitle('Game Night');
    setIsEditingTitle(false);
    setDescription('');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setShowStartTimeDropdown(false);
    setShowEndTimeDropdown(false);
    setError(null);
    setCurrentDate(new Date());
  };

  const generateCalendarDates = (): CalendarDate[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End at the last Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const dates: CalendarDate[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const currentDateCopy = new Date(date);
      currentDateCopy.setHours(0, 0, 0, 0);
      
      dates.push({
        date: new Date(currentDateCopy),
        isSelected: selectedDates.some(selectedDate => 
          selectedDate.getTime() === currentDateCopy.getTime()
        ),
        isCurrentMonth: currentDateCopy.getMonth() === month,
        isToday: currentDateCopy.getTime() === today.getTime(),
      });
    }
    
    return dates;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const toggleDateSelection = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Don't allow selecting past dates
    if (date < today) return;
    
    const dateTime = date.getTime();
    const isSelected = selectedDates.some(selectedDate => 
      selectedDate.getTime() === dateTime
    );
    
    if (isSelected) {
      setSelectedDates(selectedDates.filter(selectedDate => 
        selectedDate.getTime() !== dateTime
      ));
    } else {
      setSelectedDates([...selectedDates, new Date(date)]);
    }
  };

  const convertTo24Hour = (time12h: string): string => {
    if (!time12h) return '';
    
    const [time, period] = time12h.split(':');
    const [hour, minute] = time.split(':');
    
    let hour24 = parseInt(hour);
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  const isValidTimeRange = (start: string, end: string): boolean => {
    if (!start || !end) return true;
    
    const start24 = convertTo24Hour(start);
    const end24 = convertTo24Hour(end);
    
    const [startHour, startMin] = start24.split(':').map(Number);
    const [endHour, endMin] = end24.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes > startMinutes;
  };

  const handleCreatePoll = async () => {
    try {
      setLoading(true);
      setError(null);

      if (selectedDates.length === 0) {
        setError('Please select at least one date');
        return;
      }

      if (!title.trim()) {
        setError('Please enter a title for your poll');
        return;
      }

      if (startTime && endTime && !isValidTimeRange(startTime, endTime)) {
        setError('End time must be after start time');
        return;
      }

      // TODO: Implement actual poll creation with Supabase
      // This is a placeholder for the actual implementation
      console.log('Creating date poll:', {
        title: title.trim(),
        description: description.trim(),
        selectedDates,
        startTime: startTime || null,
        endTime: endTime || null,
        location: location.trim() || null,
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      onSuccess();
      resetForm();
    } catch (err) {
      console.error('Error creating date poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  const formatSelectedDates = () => {
    if (selectedDates.length === 0) return 'No dates selected';
    
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    
    if (sortedDates.length <= 3) {
      return sortedDates.map(date => 
        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ).join(', ');
    }
    
    return `${sortedDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} and ${sortedDates.length - 1} more`;
  };

  const handleTitleSubmit = () => {
    if (title.trim()) {
      setIsEditingTitle(false);
    } else {
      setTitle('Game Night');
      setIsEditingTitle(false);
    }
  };

  const handleStartTimeSelect = (timeValue: string) => {
    setStartTime(timeValue);
    setShowStartTimeDropdown(false);
    setShowEndTimeDropdown(false);
  };

  const handleEndTimeSelect = (timeValue: string) => {
    setEndTime(timeValue);
    setShowEndTimeDropdown(false);
    setShowStartTimeDropdown(false);
  };

  const getTimeLabel = (timeValue: string) => {
    if (!timeValue) return '';
    const option = timeOptions.find(opt => opt.value === timeValue);
    return option ? option.label : timeValue;
  };

  const calendarDates = generateCalendarDates();

  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule Game Night</Text>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => {
            onClose();
            resetForm();
          }}
        >
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.label}>Poll Title</Text>
          {isEditingTitle ? (
            <View style={styles.titleEditContainer}>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                onSubmitEditing={handleTitleSubmit}
                onBlur={handleTitleSubmit}
                autoFocus
                editable={!loading}
                placeholder="Enter poll title"
              />
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.titleDisplay}
              onPress={() => setIsEditingTitle(true)}
            >
              <Text style={styles.titleDisplayText}>{title}</Text>
              <Edit3 size={16} color="#666666" />
            </TouchableOpacity>
          )}
          <Text style={styles.titleHint}>Tap to edit the poll title</Text>
        </View>

        <View style={styles.calendarSection}>
          <Text style={styles.label}>Select Available Dates</Text>
          <Text style={styles.sublabel}>Tap dates when you're available to play</Text>
          
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity 
                style={styles.navButton}
                onPress={() => navigateMonth('prev')}
              >
                <ChevronLeft size={20} color="#1a2b5f" />
              </TouchableOpacity>
              
              <Text style={styles.monthYear}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
              
              <TouchableOpacity 
                style={styles.navButton}
                onPress={() => navigateMonth('next')}
              >
                <ChevronRight size={20} color="#1a2b5f" />
              </TouchableOpacity>
            </View>

            <View style={styles.dayNamesRow}>
              {dayNames.map(day => (
                <Text key={day} style={styles.dayName}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDates.map((calendarDate, index) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isPast = calendarDate.date < today;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateCell,
                      !calendarDate.isCurrentMonth && styles.dateCellInactive,
                      calendarDate.isSelected && styles.dateCellSelected,
                      calendarDate.isToday && styles.dateCellToday,
                      isPast && styles.dateCellPast,
                    ]}
                    onPress={() => toggleDateSelection(calendarDate.date)}
                    disabled={isPast || !calendarDate.isCurrentMonth}
                  >
                    <Text style={[
                      styles.dateText,
                      !calendarDate.isCurrentMonth && styles.dateTextInactive,
                      calendarDate.isSelected && styles.dateTextSelected,
                      calendarDate.isToday && styles.dateTextToday,
                      isPast && styles.dateTextPast,
                    ]}>
                      {calendarDate.date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {selectedDates.length > 0 && (
            <Animated.View 
              entering={FadeIn.duration(300)}
              style={styles.selectedDatesContainer}
            >
              <Text style={styles.selectedDatesLabel}>Selected Dates:</Text>
              <Text style={styles.selectedDatesText}>{formatSelectedDates()}</Text>
            </Animated.View>
          )}
        </View>

        <View style={[styles.timeSection, { position: 'relative', zIndex: 10 }]}>
          <Text style={styles.label}>Event Time (Optional)</Text>
          <Text style={styles.sublabel}>Set a specific time for your game night</Text>
          
          <View style={styles.timeInputsContainer}>
            <View style={[styles.timeInputGroup, { position: 'relative', zIndex: 20 }]}>
              <Text style={styles.timeLabel}>Start Time</Text>
              <TouchableOpacity
                style={styles.timeDropdownButton}
                onPress={() => {
                  setShowStartTimeDropdown(!showStartTimeDropdown);
                  setShowEndTimeDropdown(false);
                }}
              >
                <Clock size={16} color="#666666" />
                <Text style={[
                  styles.timeDropdownText,
                  !startTime && styles.timeDropdownPlaceholder
                ]}>
                  {startTime ? getTimeLabel(startTime) : 'Select time'}
                </Text>
                <ChevronDown size={16} color="#666666" />
              </TouchableOpacity>

              {showStartTimeDropdown && (
                <View style={[styles.timeDropdown, styles.timeDropdownAbsolute]}>
                  <ScrollView 
                    style={styles.timeDropdownScroll}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {timeOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.timeDropdownItem,
                          startTime === option.value && styles.timeDropdownItemSelected
                        ]}
                        onPress={() => handleStartTimeSelect(option.value)}
                      >
                        <Text style={[
                          styles.timeDropdownItemText,
                          startTime === option.value && styles.timeDropdownItemTextSelected
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={[styles.timeInputGroup, { position: 'relative', zIndex: 10 }]}>
              <Text style={styles.timeLabel}>End Time</Text>
              <TouchableOpacity
                style={styles.timeDropdownButton}
                onPress={() => {
                  setShowEndTimeDropdown(!showEndTimeDropdown);
                  setShowStartTimeDropdown(false);
                }}
              >
                <Clock size={16} color="#666666" />
                <Text style={[
                  styles.timeDropdownText,
                  !endTime && styles.timeDropdownPlaceholder
                ]}>
                  {endTime ? getTimeLabel(endTime) : 'Select time'}
                </Text>
                <ChevronDown size={16} color="#666666" />
              </TouchableOpacity>

              {showEndTimeDropdown && (
                <View style={[styles.timeDropdown, styles.timeDropdownAbsolute]}>
                  <ScrollView 
                    style={styles.timeDropdownScroll}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {timeOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.timeDropdownItem,
                          endTime === option.value && styles.timeDropdownItemSelected
                        ]}
                        onPress={() => handleEndTimeSelect(option.value)}
                      >
                        <Text style={[
                          styles.timeDropdownItemText,
                          endTime === option.value && styles.timeDropdownItemTextSelected
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
          
          <Text style={styles.timeHint}>Choose from available time slots in 15-minute increments</Text>
        </View>

        <View style={styles.locationSection}>
          <Text style={styles.label}>Location (Optional)</Text>
          <Text style={styles.sublabel}>Where will you be playing?</Text>
          <View style={styles.locationInputContainer}>
            <MapPin size={16} color="#666666" style={styles.locationIcon} />
            <TextInput
              style={styles.locationInput}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter location (e.g., John's house, Local game store)"
              editable={!loading}
            />
          </View>
          <Text style={styles.locationHint}>Help your group know where to meet for game night</Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add any additional details about your game night..."
            multiline
            numberOfLines={3}
            editable={!loading}
          />
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={handleCreatePoll}
        disabled={loading}
      >
        <Plus color="#fff" size={20} />
        <Text style={styles.createButtonText}>
          {loading ? 'Creating Poll...' : 'Create Date Poll'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'web') {
    if (!isVisible) return null;
    return (
      <View style={styles.webOverlay}>
        {content}
      </View>
    );
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {content}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90vh',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
  },
  content: {
    padding: 24,
    maxHeight: 500,
  },
  titleSection: {
    marginBottom: 24,
  },
  titleEditContainer: {
    marginBottom: 4,
  },
  titleInput: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#ff9654',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
  },
  titleDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
  },
  titleDisplayText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#1a2b5f',
    flex: 1,
  },
  titleHint: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8d8d8d',
    marginTop: 4,
  },
  calendarSection: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  sublabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  calendarContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  monthYear: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#666666',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  dateCellInactive: {
    opacity: 0.3,
  },
  dateCellSelected: {
    backgroundColor: '#ff9654',
  },
  dateCellToday: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  dateCellPast: {
    opacity: 0.3,
  },
  dateText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
  },
  dateTextInactive: {
    color: '#999999',
  },
  dateTextSelected: {
    color: '#ffffff',
    fontFamily: 'Poppins-SemiBold',
  },
  dateTextToday: {
    color: '#2196f3',
    fontFamily: 'Poppins-SemiBold',
  },
  dateTextPast: {
    color: '#cccccc',
  },
  selectedDatesContainer: {
    backgroundColor: '#fff5ef',
    borderRadius: 12,
    padding: 16,
  },
  selectedDatesLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  selectedDatesText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#ff9654',
  },
  timeSection: {
    marginBottom: 24,
  },
  timeInputsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  timeDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  timeDropdownText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333333',
  },
  timeDropdownPlaceholder: {
    color: '#999999',
  },
  timeDropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timeDropdownAbsolute: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    ...(Platform.OS === 'web' ? { zIndex: 999 } : {}),
  },
  timeDropdownScroll: {
    maxHeight: 200,
  },
  timeDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeDropdownItemSelected: {
    backgroundColor: '#fff5ef',
  },
  timeDropdownItemText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
  },
  timeDropdownItemTextSelected: {
    color: '#ff9654',
    fontFamily: 'Poppins-SemiBold',
  },
  timeHint: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8d8d8d',
    marginTop: 4,
  },
  locationSection: {
    marginBottom: 24,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  locationIcon: {
    marginRight: 12,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333333',
  },
  locationHint: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8d8d8d',
  },
  inputSection: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    padding: 16,
    margin: 24,
    borderRadius: 12,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
});