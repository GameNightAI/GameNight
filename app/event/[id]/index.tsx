// event/EventScreen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
// import { Calendar, MapPin, Clock } from 'lucide-react-native';
import { format } from 'date-fns';
import { Poll, PollEvent, VoteEvent } from '@/types/poll';
import { EventDateCard } from '@/components/EventDateCard';
import { EventVoteType } from '@/components/eventVotingOptions';
import { VoterNameInput } from '@/components/PollVoterNameInput';
import { PollResultsButton } from '@/components/PollResultsButton';
import { useTheme } from '@/hooks/useTheme';
import {
  saveUsername,
  getUsername,
} from '@/utils/storage';
import { censor } from '@/utils/profanityFilter';

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
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const [event, setEvent] = useState<Event | null>(null);
  const [eventDates, setEventDates] = useState<PollEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, EventVoteType>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, { yes: number; no: number; maybe: number }>>({});
  const [pendingVotes, setPendingVotes] = useState<Record<string, EventVoteType>>({});
  const [voterName, setVoterName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasPreviousVotes, setHasPreviousVotes] = useState(false);
  const [storageInitialized, setStorageInitialized] = useState(false);
  const [comment, setComment] = useState('');

  const styles = useMemo(() => getStyles(colors, typography, insets), [colors, typography, insets]);

  // Initialize storage and voter name
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // Single device: prefill with username if logged in
        if (user?.username) {
          setVoterName(user.username);
        } else {
          const savedName = await getUsername();
          if (savedName) setVoterName(savedName);
        }
        setStorageInitialized(true);
      } catch (error) {
        console.warn('Error initializing storage:', error);
        setStorageInitialized(true); // Continue anyway
      }
    };

    initializeStorage();
  }, [user]);

  // Check for previous votes with better error handling
  const checkPreviousVotes = useCallback(async (name: string, eventId: string) => {
    try {
      if (!user) {
        const trimmedName = name.trim();
        if (!trimmedName) {
          setHasPreviousVotes(false);
          return;
        }

        // Use trimmedName in the query for non-logged-in users
        const { data: previousVotes, error: previousVotesError } = await supabase
          .from('votes_events')
          .select('id')
          .in('poll_event_id', eventDates.map(d => d.id))
          .eq('voter_name', trimmedName);

        if (previousVotesError) {
          console.warn('Error checking previous votes:', previousVotesError);
          setHasPreviousVotes(false);
          return;
        }

        setHasPreviousVotes(previousVotes && previousVotes.length > 0);
      } else {
        // Use user.id for logged-in users
        const { data: previousVotes, error: previousVotesError } = await supabase
          .from('votes_events')
          .select('id')
          .in('poll_event_id', eventDates.map(d => d.id))
          .eq('user_id', user.id);

        if (previousVotesError) {
          console.warn('Error checking previous votes:', previousVotesError);
          setHasPreviousVotes(false);
          return;
        }

        setHasPreviousVotes(previousVotes && previousVotes.length > 0);
      }
    } catch (error) {
      console.warn('Error in checkPreviousVotes:', error);
      setHasPreviousVotes(false);
    }
  }, [user, eventDates]);

  useEffect(() => {
    if ((user || (storageInitialized && voterName)) && id && eventDates.length > 0) {
      checkPreviousVotes(voterName, id as string);
    }
  }, [user, voterName, id, storageInitialized, checkPreviousVotes]);

  // Reload votes after storage initialization to display user's previous votes
  useEffect(() => {
    if (storageInitialized && id && eventDates.length > 0) {
      loadVotes(id as string, user?.id);
    }
  }, [storageInitialized, voterName, id, user?.id]);

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
        if (eventData?.user_id) {
          const { data: profileData, error: creatorError } = await supabase
            .from('profiles')
            .select('username, firstname, lastname')
            .eq('id', eventData.user_id)
            .maybeSingle();
          if (creatorError) {
            setCreatorName(eventData.user_id)
            throw creatorError;
          } else if (profileData) {
            const { username, firstname, lastname } = profileData;
            setCreatorName(
              firstname || lastname
                ? `${censor([firstname, lastname].join(' ').trim())} (${username})`
                : username
            );
          }
        }

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
      // Guard: Don't load votes if eventDates hasn't been populated yet
      if (eventDates.length === 0) {
        return;
      }

      // Load all votes for this event's dates using votes_events
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
      const pendingVoteMap: Record<string, EventVoteType> = {};

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

        // Track user's votes - check both user_id and voter_name
        const isUserVote = (userId && vote.user_id === userId) ||
          (!userId && voterName && vote.voter_name === voterName.trim());

        if (isUserVote) {
          userVoteMap[dateId] = vote.vote_type as EventVoteType;
          pendingVoteMap[dateId] = vote.vote_type as EventVoteType;
        }
      });

      setVoteCounts(counts);
      setUserVotes(userVoteMap);
      setPendingVotes(pendingVoteMap);
    } catch (err) {
      console.error('Error loading votes:', err);
    }
  };

  // Handle vote selection (update pending state only)
  const handleVote = (eventId: string, voteType: EventVoteType) => {
    if (submitting) return;

    setPendingVotes(prev => {
      const updated = { ...prev };
      if (updated[eventId] === voteType) {
        delete updated[eventId];
      } else {
        updated[eventId] = voteType;
      }
      return updated;
    });
  };

  // Submit all pending votes
  const navigateToResults = () => {
    router.push({ pathname: '/event/[id]/results', params: { id: id as string } });
  };

  const submitAllVotes = async () => {
    if (Object.keys(pendingVotes).length === 0) {
      Toast.show({
        type: 'error',
        text1: 'No votes selected',
        text2: 'Please vote for at least one date before submitting.',
        visibilityTime: 4000,
        autoHide: true,
      });
      return;
    }

    try {
      setSubmitting(true);

      const finalName = (() => {
        if (!user) {
          const trimmed = voterName.trim();
          if (!trimmed) {
            setNameError(true);
            Toast.show({ type: 'error', text1: 'Please enter your name' });
            setSubmitting(false);
            return '';
          }
          return trimmed;
        }
        return user.username || user.id || '';
      })();

      // Check if the voter has previously voted on any date in this event
      const { data: previousVotes, error: previousVotesError } = await supabase
        .from('votes_events')
        .select('id, poll_event_id, vote_type')
        .in('poll_event_id', eventDates.map(d => d.id))
        .eq(
          user ? 'user_id' : 'voter_name',
          user ? user.id : finalName
        );

      if (previousVotesError) {
        console.error('Error checking previous votes:', previousVotesError);
        throw previousVotesError;
      }

      const hasPreviousVotes = previousVotes?.length > 0;
      let updated = false; // Track if any votes were updated or inserted as an update

      // Submit each vote
      for (const [eventId, voteType] of Object.entries(pendingVotes)) {
        // Check for existing vote for this date
        const existing = previousVotes?.find(v => v.poll_event_id === eventId);

        if (existing) {
          if (existing.vote_type !== voteType) {
            const { error: updateError } = await supabase
              .from('votes_events')
              .update({ vote_type: voteType })
              .eq('id', existing.id);
            if (updateError) {
              console.error('Error updating vote:', updateError);
              throw updateError;
            }
            updated = true;
          }
        } else {
          const { error: insertError } = await supabase
            .from('votes_events')
            .insert({
              poll_event_id: eventId,
              vote_type: voteType,
              voter_name: user ? null : finalName,
              user_id: user ? user.id : null,
            });
          if (insertError) {
            console.error('Error inserting vote:', insertError);
            throw insertError;
          }
          // If the voter has previously voted on any other date, mark as updated
          if (hasPreviousVotes) {
            updated = true;
          }
        }
      }

      // Save voter name for future use with error handling
      if (!user) {
        try {
          await saveUsername(finalName);
        } catch (storageError) {
          console.warn('Failed to save username to storage:', storageError);
        }
      }

      // Insert comment if present
      if (comment.trim()) {
        const { error: commentError } = await supabase.from('poll_comments').insert({
          poll_id: id,
          voter_name: user ? null : finalName,
          user_id: user ? user.id : null,
          comment_text: comment.trim(),
        });
        if (commentError) {
          Toast.show({ type: 'error', text1: 'Failed to submit comment' });
        }
      }

      // Reload votes to refresh UI
      await loadVotes(id as string, user?.id);

      // Clear pending votes and comment
      setPendingVotes({});
      setComment('');

      // Navigate to results after successful submission
      navigateToResults();

      // Only show toast for new votes, not updated votes
      if (!updated) {
        Toast.show({ type: 'success', text1: 'Votes submitted!' });
      } else {
        Toast.show({ type: 'success', text1: 'Vote updated!' });
      }
    } catch (err) {
      console.error('Error submitting votes:', err);
      Toast.show({ type: 'error', text1: 'Failed to submit votes' });
    } finally {
      setSubmitting(false);
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Event Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/events')}
            accessibilityLabel="Back to events"
            accessibilityRole="button"
            accessibilityHint="Returns to the events list"
          >
            <Text style={styles.backLink}>&larr; Back to Events</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{event.title}</Text>
          {event.description && (
            <Text style={styles.description}>{event.description}</Text>
          )}
          <Text style={styles.subtitle}>
            Poll created by {creatorName}
          </Text>
        </View>

        {!user && (
          <>
            <VoterNameInput
              value={voterName}
              onChange={(text) => {
                setVoterName(text);
                if (nameError) setNameError(false);
              }}
              hasError={nameError}
            />
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>
                Want to create your own events?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/auth/register')}
                accessibilityLabel="Sign up for free"
                accessibilityRole="button"
                accessibilityHint="Opens the registration screen to create an account"
              >
                <Text style={styles.signUpLink}>Sign up for free</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Event Dates */}
        <View style={styles.datesSection}>
          <Text style={styles.sectionTitle}>Vote on Event Dates</Text>
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
              displayTime = getDisplayTime(event.start_time || null, event.end_time || null);
            } else {
              displayTime = getDisplayTime(eventDate.start_time || null, eventDate.end_time || null);
            }

            return (
              <EventDateCard
                key={eventDate.id}
                eventDate={eventDate}
                index={index}
                selectedVote={pendingVotes[eventDate.id]}
                onVote={handleVote}
                disabled={submitting}
                voteCounts={voteCounts[eventDate.id]}
                displayLocation={displayLocation}
                displayTime={displayTime}
              />
            );
          })}
        </View>

        {/* Comments Field */}
        <View style={styles.commentContainer}>
          <Text style={styles.commentLabel}>Comments (optional):</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Add any comments about your vote..."
            placeholderTextColor={colors.textMuted}
            multiline
            editable={!submitting}
            accessibilityLabel="Comments input"
            accessibilityHint="Optional field to add comments about your vote"
          />
        </View>

      </ScrollView>

      {/* Fixed bottom button container */}
      <View style={styles.fixedBottomContainer}>
        <View style={styles.submitVotesContainer}>
          <TouchableOpacity
            style={styles.submitVotesButton}
            onPress={submitAllVotes}
            disabled={submitting}
            accessibilityLabel={submitting ? 'Submitting votes' : (hasPreviousVotes ? 'Update Vote' : 'Submit My Votes')}
            accessibilityRole="button"
            accessibilityHint={submitting ? 'Votes are being submitted' : 'Submits your votes for this event'}
          >
            <Text style={styles.submitVotesButtonText}>
              {submitting ? 'Submitting...' : (hasPreviousVotes ? 'Update Vote' : 'Submit My Votes')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomActionsContainer}>
          <View style={styles.viewResultsContainer}>
            <PollResultsButton
              onPress={navigateToResults}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: any, typography: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: Math.max(40, insets.top),
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: typography.fontSize.title2,
    fontFamily: typography.getFontFamily('bold'),
    color: colors.card,
    marginBottom: 8,
    lineHeight: typography.lineHeight.tight * typography.fontSize.title1,
  },
  description: {
    fontSize: typography.fontSize.callout,
    fontFamily: typography.getFontFamily('normal'),
    color: colors.card,
    marginBottom: 12,
    lineHeight: typography.lineHeight.normal * typography.fontSize.body,
  },
  subtitle: {
    fontSize: typography.fontSize.footnote,
    fontFamily: typography.getFontFamily('normal'),
    color: colors.card,
    opacity: 0.8,
  },
  backLink: {
    color: colors.accent,
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.subheadline,
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
    fontSize: typography.fontSize.footnote,
    fontFamily: typography.getFontFamily('normal'),
    color: colors.textMuted,
  },
  signUpLink: {
    fontSize: typography.fontSize.footnote,
    fontFamily: typography.getFontFamily('semibold'),
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  detailsSection: {
    backgroundColor: colors.card,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.body,
    color: colors.text,
    marginLeft: 12,
  },
  sectionTitle: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.headline,
    color: colors.primary,
    marginBottom: 16,
    lineHeight: typography.lineHeight.tight * typography.fontSize.title3,
  },
  datesSection: {
    backgroundColor: colors.card,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  loginPrompt: {
    backgroundColor: colors.tints.warningBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.tints.warningBorder,
  },
  loginPromptText: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.footnote,
    color: colors.warning,
    textAlign: 'center',
  },
  commentContainer: {
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 20,
    width: '100%',
  },
  commentLabel: {
    fontSize: typography.fontSize.subheadline,
    fontFamily: typography.getFontFamily('semibold'),
    color: colors.primary,
    marginBottom: 4,
  },
  commentInput: {
    minHeight: 48,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: typography.fontSize.subheadline,
    fontFamily: typography.getFontFamily('normal'),
    backgroundColor: colors.background,
    color: colors.text,
  },
  fixedBottomContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Math.max(20, insets.bottom),
  },
  submitVotesContainer: {
    paddingTop: 10,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 0,
    width: '100%',
    alignSelf: 'stretch'
  },
  submitVotesButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 44,
  },
  submitVotesButtonText: {
    fontSize: typography.fontSize.body,
    fontFamily: typography.getFontFamily('semibold'),
    color: colors.card,
  },
  bottomActionsContainer: {
    width: '100%',
    alignSelf: 'stretch',
    marginTop: 8
  },
  viewResultsContainer: {
    marginTop: 8,
    width: '100%',
    alignSelf: 'stretch'
  },
});
