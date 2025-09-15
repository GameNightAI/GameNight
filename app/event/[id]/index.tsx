// event/EventScreen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';

import { supabase } from '@/services/supabase';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { Calendar, MapPin, Clock } from 'lucide-react-native';
import { format } from 'date-fns';
import { Poll, PollEvent, VoteEvent } from '@/types/poll';
import { EventDateCard } from '@/components/EventDateCard';
import { EventVoteType } from '@/components/eventVotingOptions';
import Toast from 'react-native-toast-message';

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



export default function EventScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [eventDates, setEventDates] = useState<PollEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, EventVoteType>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, { yes: number; no: number; maybe: number }>>({});
  const [voting, setVoting] = useState(false);



  // Load event data
  useEffect(() => {
    const loadEvent = async () => {
      if (!id) return;

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



        // Check if current user is creator
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
          setIsCreator(currentUser.id === eventData.user_id);
        }

        // Get creator name
        // if (eventData.user_id) {
        //   const { data: profileData } = await supabase
        //     .from('profiles')
        //     .select('username, email')
        //     .eq('id', eventData.user_id)
        //     .maybeSingle();

        //   if (profileData) {
        //     setCreatorName(profileData.username || profileData.email || null);
        //   }
        // }

        // Load user votes and vote counts
        await loadVotes(id as string, currentUser?.id);

      } catch (err) {
        console.error('Error loading event:', err);
        setError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id]);

  // Load votes for the event
  const loadVotes = async (eventId: string, userId?: string) => {
    try {
      // Load all votes for this event's dates
      const { data: votesData, error: votesError } = await supabase
        .from('votes_events')
        .select('*')
        .in('poll_event_id', eventDates.map(d => d.id));

      if (votesError) {
        console.error('Error loading votes:', votesError);
        return;
      }

      // Calculate vote counts for each date
      const counts: Record<string, { yes: number; no: number; maybe: number }> = {};
      const userVoteMap: Record<string, EventVoteType> = {};

      eventDates.forEach(date => {
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

        // Track user's votes
        if (userId && vote.voter_name === userId) {
          userVoteMap[dateId] = vote.vote_type as EventVoteType;
        }
      });

      setVoteCounts(counts);
      setUserVotes(userVoteMap);
    } catch (err) {
      console.error('Error loading votes:', err);
    }
  };

  // Handle vote submission
  const handleVote = async (eventId: string, voteType: EventVoteType) => {
    if (!user || voting) return;

    try {
      setVoting(true);

      // Check if user already voted on this date
      const existingVote = userVotes[eventId];

      if (existingVote === voteType) {
        // User is trying to vote the same way again - remove the vote
        const { error: deleteError } = await supabase
          .from('votes_events')
          .delete()
          .eq('poll_event_id', eventId)
          .eq('voter_name', user.id);

        if (deleteError) throw deleteError;

        // Update local state
        const newUserVotes = { ...userVotes };
        delete newUserVotes[eventId];
        setUserVotes(newUserVotes);

        // Update vote counts
        const newCounts = { ...voteCounts };
        if (newCounts[eventId]) {
          switch (voteType) {
            case 2: newCounts[eventId].yes--; break;
            case 1: newCounts[eventId].maybe--; break;
            case -2: newCounts[eventId].no--; break;
          }
        }
        setVoteCounts(newCounts);

        Toast.show({ type: 'success', text1: 'Vote removed' });
      } else {
        // Insert or update vote
        const voteData = {
          poll_event_id: eventId,
          voter_name: user.id,
          vote_type: voteType,
        };

        if (existingVote !== undefined) {
          // Update existing vote
          const { error: updateError } = await supabase
            .from('votes_events')
            .update({ vote_type: voteType })
            .eq('poll_event_id', eventId)
            .eq('voter_name', user.id);

          if (updateError) throw updateError;
        } else {
          // Insert new vote
          const { error: insertError } = await supabase
            .from('votes_events')
            .insert(voteData);

          if (insertError) throw insertError;
        }

        // Update local state
        setUserVotes(prev => ({ ...prev, [eventId]: voteType }));

        // Update vote counts
        const newCounts = { ...voteCounts };
        if (newCounts[eventId]) {
          // Remove old vote count
          if (existingVote !== undefined) {
            switch (existingVote) {
              case 2: newCounts[eventId].yes--; break;
              case 1: newCounts[eventId].maybe--; break;
              case -2: newCounts[eventId].no--; break;
            }
          }
          // Add new vote count
          switch (voteType) {
            case 2: newCounts[eventId].yes++; break;
            case 1: newCounts[eventId].maybe++; break;
            case -2: newCounts[eventId].no++; break;
          }
        }
        setVoteCounts(newCounts);

        Toast.show({ type: 'success', text1: 'Vote submitted!' });
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
      Toast.show({ type: 'error', text1: 'Failed to submit vote' });
    } finally {
      setVoting(false);
    }
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => router.replace({ pathname: '/event/[id]', params: { id: id as string } })}
      />
    );
  }

  if (!event) {
    return (
      <ErrorState
        message="Event not found"
        onRetry={() => router.replace({ pathname: '/event/[id]', params: { id: id as string } })}
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Event Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
          <Text style={styles.backLink}>&larr; Back to Events</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{event.title}</Text>
        {event.description && (
          <Text style={styles.description}>{event.description}</Text>
        )}
        <Text style={styles.subtitle}>
          Created by {user?.email || 'Anonymous'}
        </Text>
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

      {/* Event Dates */}
      <View style={styles.datesSection}>
        <Text style={styles.sectionTitle}>Vote on Event Dates</Text>
        {!user && (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>
              Please log in to vote on event dates
            </Text>
          </View>
        )}
        {eventDates.map((eventDate, index) => {
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
          /* const displayTime = event.use_same_time && event.start_time && event.end_time
            ? `${formatTimeString(event.start_time)} - ${formatTimeString(event.end_time)}`
            : eventDate.start_time && eventDate.end_time
              ? `${formatTimeString(eventDate.start_time)} - ${formatTimeString(eventDate.end_time)}`
              : 'Time not set'; */

          return (
            <EventDateCard
              key={eventDate.id}
              eventDate={eventDate}
              index={index}
              selectedVote={userVotes[eventDate.id]}
              onVote={handleVote}
              disabled={voting || !user}
              voteCounts={voteCounts[eventDate.id]}
              displayLocation={displayLocation}
              displayTime={displayTime}
            />
          );
        })}
      </View>





      {/* View Results Button */}
      <TouchableOpacity
        style={styles.resultsButton}
        onPress={() => router.push({ pathname: '/event/[id]/results', params: { id: event.id } })}
      >
        <Text style={styles.resultsButtonText}>View Full Results</Text>
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
    padding: 20,
    backgroundColor: '#1a2b5f',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 22,
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
  detailsSection: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
  },

  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 16,
  },

  datesSection: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  loginPrompt: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  loginPromptText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
  },

  resultsButton: {
    backgroundColor: '#ff9654',
    borderRadius: 8,
    padding: 16,
    margin: 20,
    alignItems: 'center',
  },
  resultsButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
  },
});
