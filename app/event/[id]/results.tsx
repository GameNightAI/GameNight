import React, { useState, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { supabase } from '@/services/supabase';
import { Calendar, MapPin, Clock, Trophy, Medal, Award } from 'lucide-react-native';
import { format } from 'date-fns';
import { Poll, PollEvent } from '@/types/poll';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';

// Helper function to format time strings (HH:mm format) to readable format
const formatTimeString = (timeString: string | null): string => {
  if (!timeString) return '';

  try {
    // Parse time string (HH:mm format) and create a date object for today
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return format(date, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', timeString, error);
    return timeString; // Return original string if formatting fails
  }
};

// Extend Poll type for event-specific data
interface Event extends Poll {
  location?: string;
  start_time?: string | null;
  end_time?: string | null;
  use_same_location?: boolean;
  use_same_time?: boolean;
  date_specific_options?: Record<string, any>;
}





// Helper function to get ranking icon
const getRankingIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy size={24} color="#ffd700" />;
    case 2:
      return <Medal size={24} color="#c0c0c0" />;
    case 3:
      return <Award size={24} color="#cd7f32" />;
    default:
      return null;
  }
};



export default function EventResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [eventDates, setEventDates] = useState<PollEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    if (!id) return;

    const loadEventData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load event details (only polls that have poll_events - these are events)
        const { data: eventData, error: eventError } = await supabase
          .from('polls')
          .select(`
            *,
            poll_events!inner(
              id,
              event_date,
              start_time,
              end_time,
              location
            )
          `)
          .eq('id', id)
          .single();

        if (eventError) throw eventError;
        setEvent(eventData);

        // Load event dates
        const { data: datesData, error: datesError } = await supabase
          .from('poll_events')
          .select('*')
          .eq('poll_id', id)
          .order('event_date', { ascending: true });

        if (datesError) throw datesError;
        setEventDates(datesData || []);

        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
        }

      } catch (err) {
        console.error('Error loading event data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load event data');
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [id]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);





  if (loading) return <LoadingState />;

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          router.replace({ pathname: '/event/[id]/results', params: { id: id as string } });
        }}
      />
    );
  }

  if (!event) {
    return (
      <ErrorState
        message="Event not found"
        onRetry={() => {
          router.replace({ pathname: '/event/[id]/results', params: { id: id as string } });
        }}
      />
    );
  }



  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back to Event</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Event Results</Text>
        <Text style={styles.subtitle}>{event.title}</Text>
      </View>

      {/* Event Information */}
      <View style={styles.overallStats}>
        <Text style={styles.sectionTitle}>Event Information</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Calendar size={24} color="#10b981" />
            <Text style={styles.statNumber}>{eventDates.length}</Text>
            <Text style={styles.statLabel}>Event Dates</Text>
          </View>
        </View>
      </View>

      {/* Event Dates */}
      <View style={styles.dateResults}>
        <Text style={styles.sectionTitle}>Event Dates</Text>
        {eventDates.map((eventDate, index) => {
          const date = new Date(eventDate.event_date);
          const displayLocation = event.use_same_location && event.location
            ? event.location
            : eventDate.location || 'Location not set';
          const displayTime = event.use_same_time && event.start_time && event.end_time
            ? `${formatTimeString(event.start_time)} - ${formatTimeString(event.end_time)}`
            : eventDate.start_time && eventDate.end_time
              ? `${formatTimeString(eventDate.start_time)} - ${formatTimeString(eventDate.end_time)}`
              : 'Time not set';

          return (
            <View key={eventDate.id} style={styles.dateResultCard}>
              <View style={styles.dateResultHeader}>
                <View style={styles.dateInfo}>
                  <Text style={styles.dateText}>
                    {format(date, 'EEEE, MMMM d, yyyy')}
                  </Text>
                  <View style={styles.dateDetails}>
                    <View style={styles.dateDetailRow}>
                      <MapPin size={16} color="#6b7280" />
                      <Text style={styles.dateDetailText}>{displayLocation}</Text>
                    </View>
                    <View style={styles.dateDetailRow}>
                      <Clock size={16} color="#6b7280" />
                      <Text style={styles.dateDetailText}>{displayTime}</Text>
                    </View>
                  </View>
                </View>
                {index < 3 && getRankingIcon(index + 1)}
              </View>
            </View>
          );
        })}
      </View>



      {/* Share Button */}
      <TouchableOpacity
        style={styles.shareButton}
        onPress={async () => {
          try {
            // Copy event URL to clipboard
            const baseUrl = Platform.select({
              web: typeof window !== 'undefined' ? window.location.origin : 'https://gamenyte.netlify.app',
              default: 'https://gamenyte.netlify.app',
            });
            const eventUrl = `${baseUrl}/event/${event.id}`;

            await Clipboard.setStringAsync(eventUrl);
            Toast.show({ type: 'success', text1: 'Event link copied to clipboard!' });
          } catch (err) {
            console.log('Error copying to clipboard:', err);
            Toast.show({ type: 'error', text1: 'Failed to copy link' });
          }
        }}
      >
        <Text style={styles.shareButtonText}>Share Event</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#0070f3',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
  },
  overallStats: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  statNumber: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    color: '#1a2b5f',
    marginTop: 8,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
  },
  dateResults: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  dateResultCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  dateResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateInfo: {
    flex: 1,
  },
  dateText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  dateDetails: {
    gap: 4,
  },
  dateDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateDetailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginLeft: 6,
  },

  shareButton: {
    backgroundColor: '#ff9654',
    borderRadius: 8,
    padding: 16,
    margin: 20,
    alignItems: 'center',
  },
  shareButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
  },
});
