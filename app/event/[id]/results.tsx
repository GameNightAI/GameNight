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
import { TruncatedText } from '@/components/TruncatedText';

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

// Helper function to get ranking color
const getRankingColor = (rank: number) => {
  switch (rank) {
    case 1:
      return '#ffd700'; // Gold
    case 2:
      return '#c0c0c0'; // Silver
    case 3:
      return '#cd7f32'; // Bronze
    default:
      return '#6b7280'; // Gray
  }
};

// Helper function to get ordinal suffix
const getOrdinalSuffix = (num: number) => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
};



export default function EventResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [eventDates, setEventDates] = useState<PollEvent[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, { yes: number; no: number; maybe: number }>>({});
  const [rankedDates, setRankedDates] = useState<Array<PollEvent & { ranking: number; totalScore: number; totalVotes: number }>>([]);
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

        // Load vote counts for ranking
        await loadVoteCounts(datesData || []);

      } catch (err) {
        console.error('Error loading event data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load event data');
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [id]);

  // Load vote counts and calculate rankings
  const loadVoteCounts = async (dates: PollEvent[]) => {
    if (!dates || dates.length === 0) return;

    try {
      // Load all votes for this event's dates
      const { data: votesData, error: votesError } = await supabase
        .from('votes_events')
        .select('*')
        .in('poll_event_id', dates.map(d => d.id));

      if (votesError) {
        console.error('Error loading votes:', votesError);
        return;
      }

      // Calculate vote counts for each date
      const counts: Record<string, { yes: number; no: number; maybe: number }> = {};

      dates.forEach(date => {
        counts[date.id] = { yes: 0, no: 0, maybe: 0 };
      });

      votesData?.forEach(vote => {
        const dateId = vote.poll_event_id;
        if (counts[dateId]) {
          switch (vote.vote_type) {
            case 2: counts[dateId].yes++; break;
            case 1: counts[dateId].maybe++; break;
            case -2: counts[dateId].no++; break;
          }
        }
      });

      setVoteCounts(counts);

      // Calculate rankings
      const dateResults = dates.map(date => {
        const dateCounts = counts[date.id] || { yes: 0, no: 0, maybe: 0 };
        // Calculate score: Ideal (2 points), Doable (1 point), No (-1 point)
        const totalScore = (dateCounts.yes * 2) + (dateCounts.maybe * 1) + (dateCounts.no * -1);
        const totalVotes = dateCounts.yes + dateCounts.maybe + dateCounts.no;

        return {
          ...date,
          totalScore,
          totalVotes,
          ranking: 0, // Will be set after sorting
        };
      });

      // Sort by total score (descending) and assign rankings
      dateResults.sort((a, b) => b.totalScore - a.totalScore);

      // Handle ties - assign same rank to items with same score
      let currentRank = 1;
      let lastScore: number | null = null;

      dateResults.forEach((result, index) => {
        if (lastScore !== null && result.totalScore !== lastScore) {
          currentRank = index + 1;
        }
        result.ranking = currentRank;
        lastScore = result.totalScore;
      });

      setRankedDates(dateResults);
    } catch (err) {
      console.error('Error loading vote counts:', err);
    }
  };

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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
          <Text style={styles.backLink}>&larr; Back to Events</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Event Results</Text>
        <Text style={styles.subtitle}>{event.title}</Text>
      </View>

      {!user && (
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>
            Want to create your own events?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={styles.signUpLink}>Sign up for free</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Event Dates */}
        <View style={styles.dateResults}>
          <Text style={styles.sectionTitle}>Event Date Rankings</Text>
          {rankedDates.length === 0 ? (
            <Text style={styles.emptyText}>No votes have been cast yet.</Text>
          ) : (
            rankedDates.map((eventDate) => {
              const date = new Date(eventDate.event_date);
              const displayLocation = event.use_same_location && event.location
                ? event.location
                : eventDate.location || 'Location not set';
              const getDisplayTime = (startTime: string | null, endTime: string | null): string => {
                if (startTime) {
                  startTime = formatTimeString(startTime);
                }
                if (endTime) {
                  endTime = formatTimeString(endTime);
                }
                if (startTime && endTime) {
                  return ` ${startTime} - ${endTime}`;
                } else if (startTime) {
                  return ` Starts at ${startTime}`;
                } else if (endTime) {
                  return ` Ends at ${endTime}`;
                } else {
                  return ' Time not set';
                }
              };
              let displayTime;
              if (event.use_same_time && (event.start_time || event.end_time)) {
                displayTime = getDisplayTime(event.start_time, event.end_time);
              } else {
                displayTime = getDisplayTime(eventDate.start_time, eventDate.end_time);
              }
              const counts = voteCounts[eventDate.id] || { yes: 0, no: 0, maybe: 0 };

              return (
                <View key={eventDate.id} style={styles.dateResultCard}>
                  <View style={styles.dateResultHeader}>
                    <View style={styles.rankingContainer}>
                      <View style={[styles.rankingBadge, { backgroundColor: getRankingColor(eventDate.ranking) }]}>
                        <Text style={styles.rankingNumber}>{eventDate.ranking}</Text>
                      </View>
                      <View style={styles.rankingInfo}>
                        <Text style={styles.rankingLabel}>
                          {`${eventDate.ranking}${getOrdinalSuffix(eventDate.ranking)} Place`}
                        </Text>
                        <Text style={styles.scoreText}>
                          {eventDate.totalVotes} vote{eventDate.totalVotes !== 1 ? 's' : ''} • Score: {eventDate.totalScore}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.dateInfo}>
                    <Text style={styles.dateText}>
                      {format(date, 'EEEE, MMMM d, yyyy')}
                    </Text>
                    <View style={styles.dateDetails}>
                      <View style={styles.dateDetailRow}>
                        <MapPin size={16} color="#6b7280" />
                        <TruncatedText
                          text={displayLocation}
                          maxLength={35}
                          textStyle={styles.dateDetailText}
                          buttonTextStyle={styles.truncateButtonText}
                        />
                      </View>
                      <View style={styles.dateDetailRow}>
                        <Clock size={16} color="#6b7280" />
                        <Text style={styles.dateDetailText}>{displayTime}</Text>
                      </View>
                    </View>
                    <View style={styles.voteBreakdown}>
                      <Text style={styles.voteBreakdownText}>
                        Ideal: {counts.yes} • Doable: {counts.maybe} • No: {counts.no}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
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

      <View style={styles.bottomActionsContainer}>
        <TouchableOpacity
          style={styles.backToVotingButton}
          onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
        >
          <Text style={styles.backToVotingButtonText}>Back to Voting</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    padding: 20,
    backgroundColor: '#1a2b5f',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#fff',
    opacity: 0.8,
  },
  backLink: {
    color: '#1d4ed8',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    marginBottom: 8,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingBottom: 32,
    width: '100%',
    alignSelf: 'stretch',
  },
  signUpContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  signUpLink: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#ff9654',
    textDecorationLine: 'underline',
  },
  bottomActionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  backToVotingButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  backToVotingButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
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
    marginBottom: 16,
  },
  rankingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankingBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankingNumber: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: 'white',
  },
  rankingInfo: {
    flex: 1,
  },
  rankingLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 2,
  },
  scoreText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
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
  voteBreakdown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  voteBreakdownText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    padding: 20,
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
  truncateButtonText: {
    color: '#0070f3',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
