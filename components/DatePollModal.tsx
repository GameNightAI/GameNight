import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, ScrollView, TextInput } from 'react-native';
import { X, Calendar, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/services/supabase';

interface DatePollModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DateOption {
  date: Date;
  label?: string;
}

export const DatePollModal: React.FC<DatePollModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const [selectedDates, setSelectedDates] = useState<DateOption[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pollTitle, setPollTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const resetForm = () => {
    setSelectedDates([]);
    setPollTitle('');
    setPollDescription('');
    setError(null);
    setCurrentMonth(new Date());
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(selected => 
      selected.date.getTime() === date.getTime()
    );
  };

  const isDatePast = (date: Date) => {
    return date < today;
  };

  const toggleDate = (date: Date) => {
    if (isDatePast(date)) return;

    const isSelected = isDateSelected(date);
    
    if (isSelected) {
      setSelectedDates(prev => prev.filter(selected => 
        selected.date.getTime() !== date.getTime()
      ));
    } else {
      setSelectedDates(prev => [...prev, { date: new Date(date) }]);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCreatePoll = async () => {
    try {
      setLoading(true);
      setError(null);

      if (selectedDates.length === 0) {
        setError('Please select at least one date');
        return;
      }

      if (!pollTitle.trim()) {
        setError('Please enter a poll title');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create the poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          user_id: user.id,
          title: pollTitle.trim(),
          description: pollDescription.trim() || null,
          max_votes: selectedDates.length, // Allow voting for multiple dates
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create poll dates
      const pollDates = selectedDates.map(dateOption => ({
        poll_id: poll.id,
        date_option: dateOption.date.toISOString(),
        label: dateOption.label || null,
      }));

      const { error: datesError } = await supabase
        .from('poll_dates')
        .insert(pollDates);

      if (datesError) throw datesError;

      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Error creating date poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth(currentMonth);

  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Date Poll</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          Select the dates you're available to play and create a poll for your group
        </Text>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Poll Title</Text>
          <TextInput
            style={styles.input}
            value={pollTitle}
            onChangeText={setPollTitle}
            placeholder="When should we play?"
            placeholderTextColor="#999999"
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={pollDescription}
            onChangeText={setPollDescription}
            placeholder="Add any additional details..."
            placeholderTextColor="#999999"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.calendarSection}>
          <Text style={styles.label}>Select Available Dates</Text>
          
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth('prev')}
            >
              <ChevronLeft size={20} color="#666666" />
            </TouchableOpacity>
            
            <Text style={styles.monthYear}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth('next')}
            >
              <ChevronRight size={20} color="#666666" />
            </TouchableOpacity>
          </View>

          <View style={styles.calendar}>
            <View style={styles.dayNamesRow}>
              {dayNames.map(day => (
                <Text key={day} style={styles.dayName}>{day}</Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {days.map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    date && isDateSelected(date) && styles.dayCellSelected,
                    date && isDatePast(date) && styles.dayCellPast,
                  ]}
                  onPress={() => date && toggleDate(date)}
                  disabled={!date || isDatePast(date)}
                >
                  {date && (
                    <>
                      <Text style={[
                        styles.dayText,
                        isDateSelected(date) && styles.dayTextSelected,
                        isDatePast(date) && styles.dayTextPast,
                      ]}>
                        {date.getDate()}
                      </Text>
                      {isDateSelected(date) && (
                        <View style={styles.selectedIndicator}>
                          <Check size={12} color="#ffffff" />
                        </View>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {selectedDates.length > 0 && (
          <View style={styles.selectedDatesSection}>
            <Text style={styles.label}>Selected Dates ({selectedDates.length})</Text>
            <View style={styles.selectedDatesList}>
              {selectedDates.map((dateOption, index) => (
                <View key={index} style={styles.selectedDateItem}>
                  <Calendar size={16} color="#ff9654" />
                  <Text style={styles.selectedDateText}>
                    {formatDate(dateOption.date)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => toggleDate(dateOption.date)}
                    style={styles.removeDateButton}
                  >
                    <X size={14} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

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
      onRequestClose={handleClose}
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
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90vh',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
  },
  content: {
    padding: 20,
    maxHeight: 500,
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  calendarSection: {
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f7f9fc',
  },
  monthYear: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
  },
  calendar: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    overflow: 'hidden',
  },
  dayNamesRow: {
    flexDirection: 'row',
    backgroundColor: '#f7f9fc',
    paddingVertical: 12,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#666666',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: '#ff9654',
  },
  dayCellPast: {
    backgroundColor: '#f8f9fa',
  },
  dayText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontFamily: 'Poppins-SemiBold',
  },
  dayTextPast: {
    color: '#cccccc',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDatesSection: {
    marginBottom: 20,
  },
  selectedDatesList: {
    gap: 8,
  },
  selectedDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5ef',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  selectedDateText: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
  },
  removeDateButton: {
    padding: 4,
    backgroundColor: '#fff0f0',
    borderRadius: 4,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    padding: 16,
    margin: 20,
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