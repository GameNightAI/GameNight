import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, FlatList, TextInput, Platform, Pressable } from 'react-native';
import { useDebouncedWindowDimensions } from '@/hooks/useDebouncedWindowDimensions';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Plus, Share2, Trash2, X, Copy, Check, BarChart3, Edit, Calendar } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/services/supabase';
import { Poll, PollEvent } from '@/types/poll';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import CreateEventModal from '@/components/CreateEventModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { PollsEmptyState } from '@/components/PollsEmptyState';
import { PollScreenCard } from '@/components/PollScreenCard';
import { usePollResults } from '@/hooks/usePollResults';
import { useEventResults } from '@/hooks/useEventResults';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

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

type TabType = 'all' | 'created' | 'invited';

// Extend Poll type locally for voteCount and event-specific data
interface EventWithVoteCount extends Poll {
  voteCount: number;
  eventOptions: PollEvent[];
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [events, setEvents] = useState<EventWithVoteCount[]>([]);
  const [allEvents, setAllEvents] = useState<EventWithVoteCount[]>([]);
  const [otherUsersEvents, setOtherUsersEvents] = useState<EventWithVoteCount[]>([]);
  const [creatorMap, setCreatorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventWithVoteCount | null>(null);
  const [showShareLink, setShowShareLink] = useState<string | null>(null);
  const [showCopiedConfirmation, setShowCopiedConfirmation] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { width: screenWidth, height } = useDebouncedWindowDimensions();
  const isMobile = screenWidth < 768;
  const isSmallMobile = screenWidth < 380 || height < 700;
  const [openResultsEventId, setOpenResultsEventId] = useState<string | null>(null);

  // Use fallback values for web platform
  const safeAreaBottom = Platform.OS === 'web' ? 0 : insets.bottom;

  // Memoize the loadEvents function to prevent unnecessary re-creations
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }
      setCurrentUserId(user.id);

      // Load all events (polls with poll_events) using inner join
      const { data: allEventsData, error: allEventsError } = await supabase
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
        .order('created_at', { ascending: false });

      if (allEventsError) throw allEventsError;


      // Not created yet. Future feature.
      // Fetch creator usernames/emails for all unique user_ids
      const userIds = Array.from(new Set((allEventsData || []).map(e => e.user_id)));
      let creatorMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', userIds);
        if (profiles) {
          profiles.forEach((profile: any) => {
            creatorMap[profile.id] = profile.email || profile.username || profile.id;
          });
        }
      }
      setCreatorMap(creatorMap);

      setAllEvents([]); // will be set below

      // Separate created events and other users' events
      const createdEvents = allEventsData?.filter(event => event.user_id === user.id) || [];

      let otherUsersEvents: EventWithVoteCount[] = [];

      // *****NEED TO UPDATE THIS ONCE VOTE COUNT IS BUILT OUT*****
      // Add eventOptions to each event
      const addEventOptions = (events: any[]): EventWithVoteCount[] =>
        events.map(e => ({
          ...e,
          voteCount: 0,
          eventOptions: e.poll_events || []
        }));

      setEvents(addEventOptions(createdEvents));
      setOtherUsersEvents(addEventOptions(otherUsersEvents));

      // Set allEvents to be the union of createdEvents and otherUsersEvents (no duplicates)
      const uniqueAllEvents: EventWithVoteCount[] = [
        ...addEventOptions(createdEvents),
        ...addEventOptions(otherUsersEvents.filter(
          (event) => !createdEvents.some((myEvent) => myEvent.id === event.id)
        )),
      ];
      // Sort by created_at to ensure proper date ordering
      uniqueAllEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllEvents(uniqueAllEvents);
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Handle refresh parameter from URL
  useEffect(() => {
    if (params.refresh === 'true') {
      loadEvents();
      // Clear the refresh parameter from URL
      router.setParams({ refresh: undefined });
    }
  }, [params.refresh, loadEvents, router]);

  // Auto-switch to 'all' tab if 'invited' tab has no events
  useEffect(() => {
    if (activeTab === 'invited' && otherUsersEvents.length === 0) {
      setActiveTab('all');
    }
  }, [activeTab, otherUsersEvents.length]);

  // Memoize the scaled style function to prevent recalculation on every render
  const getScaledStyle = useCallback((baseStyle: any, scale: number = 1) => {
    if (!isSmallMobile) return baseStyle;
    return {
      ...baseStyle,
      fontSize: baseStyle.fontSize ? baseStyle.fontSize * scale : undefined,
      paddingHorizontal: baseStyle.paddingHorizontal ? baseStyle.paddingHorizontal * scale : undefined,
      paddingVertical: baseStyle.paddingVertical ? baseStyle.paddingVertical * scale : undefined,
      padding: baseStyle.padding ? baseStyle.padding * scale : undefined,
      marginBottom: baseStyle.marginBottom ? baseStyle.marginBottom * scale : undefined,
      marginTop: baseStyle.marginTop ? baseStyle.marginTop * scale : undefined,
      marginLeft: baseStyle.marginLeft ? baseStyle.marginLeft * scale : undefined,
      marginRight: baseStyle.marginRight ? baseStyle.marginRight * scale : undefined,
      gap: baseStyle.gap ? baseStyle.gap * scale : undefined,
      borderRadius: baseStyle.borderRadius ? baseStyle.borderRadius * scale : undefined,
      minWidth: baseStyle.minWidth ? baseStyle.minWidth * scale : undefined,
      width: baseStyle.width ? baseStyle.width * scale : undefined,
      height: baseStyle.height ? baseStyle.height * scale : undefined,
    };
  }, [isSmallMobile]);

  // Memoize current events to prevent unnecessary re-renders
  const currentEvents = useMemo(() => {
    return activeTab === 'all' ? allEvents : activeTab === 'created' ? events : otherUsersEvents;
  }, [activeTab, allEvents, events, otherUsersEvents]);

  const handleShare = useCallback(async (eventId: string) => {
    // Use a proper base URL for React Native
    const baseUrl = Platform.select({
      web: typeof window !== 'undefined' ? window.location.origin : 'https://gamenyte.netlify.app',
      default: 'https://gamenyte.netlify.app', // Replace with your actual domain
    });

    const shareUrl = `${baseUrl}/event/${eventId}`;
    setShowShareLink(shareUrl);

    try {
      if (Platform.OS === 'web') {
        // Web-specific sharing
        if (navigator.share) {
          await navigator.share({
            title: 'Vote on event dates!',
            url: shareUrl,
          });
        } else {
          // Fallback for web browsers without native sharing
          await Clipboard.setStringAsync(shareUrl);
          setShowCopiedConfirmation(true);
          setTimeout(() => {
            setShowCopiedConfirmation(false);
          }, 2000);
        }
      } else {
        // Mobile-specific sharing
        await Clipboard.setStringAsync(shareUrl);
        setShowCopiedConfirmation(true);
        setTimeout(() => {
          setShowCopiedConfirmation(false);
        }, 2000);
      }
    } catch (err) {
      console.log('Error sharing:', err);
      // Final fallback
      try {
        await Clipboard.setStringAsync(shareUrl);
        setShowCopiedConfirmation(true);
        setTimeout(() => {
          setShowCopiedConfirmation(false);
        }, 2000);
      } catch (clipboardErr) {
        console.log('Error copying to clipboard:', clipboardErr);
        // Last resort: show the URL in an alert for manual copying
        alert(`Share this link: ${shareUrl}`);
      }
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!eventToDelete) return;

    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', eventToDelete.id);

      if (error) throw error;

      setEventToDelete(null);
      await loadEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  }, [eventToDelete, loadEvents]);

  // Helper to render event results dropdown - memoized to prevent unnecessary re-renders
  const EventResultsDropdown = useCallback(({ eventId }: { eventId: string }) => {
    const { event, eventDates, loading, error } = useEventResults(eventId);
    const [voteCounts, setVoteCounts] = useState<Record<string, { yes: number; no: number; maybe: number }>>({});
    const [votesLoading, setVotesLoading] = useState(true);

    // Load vote counts for event dates
    useEffect(() => {
      const loadVoteCounts = async () => {
        if (!eventDates || eventDates.length === 0) {
          setVotesLoading(false);
          return;
        }

        try {
          setVotesLoading(true);

          // Load all votes for this event's dates
          const { data: votesData, error: votesError } = await supabase
            .from('votes_events')
            .select('*')
            .in('poll_event_id', eventDates.map(d => d.id));

          if (votesError) {
            console.error('Error loading votes:', votesError);
            setVotesLoading(false);
            return;
          }

          // Calculate vote counts for each date
          const counts: Record<string, { yes: number; no: number; maybe: number }> = {};

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
          });

          setVoteCounts(counts);
        } catch (err) {
          console.error('Error loading vote counts:', err);
        } finally {
          setVotesLoading(false);
        }
      };

      loadVoteCounts();
    }, [eventDates]);

    if (loading || votesLoading) return <LoadingState />;
    if (error) return <ErrorState message={error} onRetry={() => { }} />;
    if (!eventDates || eventDates.length === 0) return <Text style={{ padding: 16, color: '#888' }}>No event dates available.</Text>;

    return (
      <View style={styles.eventResultsContainer}>
        <Text style={styles.eventResultsTitle}>Event Date Results</Text>

        {/* Table Header */}
        <View style={styles.eventTableHeader}>
          <Text style={styles.eventTableHeaderDate}>Date</Text>
          <Text style={styles.eventTableHeaderVote}>Ideal</Text>
          <Text style={styles.eventTableHeaderVote}>Doable</Text>
          <Text style={styles.eventTableHeaderVote}>No</Text>
        </View>

        {/* Table Rows */}
        {eventDates.map((eventDate, index) => {
          const counts = voteCounts[eventDate.id] || { yes: 0, no: 0, maybe: 0 };
          const displayLocation = event?.use_same_location && event?.location
            ? event.location
            : eventDate.location || 'Location not set';
          const displayTime = event?.use_same_time && event?.start_time && event?.end_time
            ? `${formatTimeString(event.start_time)} - ${formatTimeString(event.end_time)}`
            : eventDate.start_time && eventDate.end_time
              ? `${formatTimeString(eventDate.start_time)} - ${formatTimeString(eventDate.end_time)}`
              : 'Time not set';

          return (
            <View key={eventDate.id} style={styles.eventTableRow}>
              <View style={styles.eventTableDateCell}>
                <Text style={styles.eventTableDateText}>
                  {format(new Date(eventDate.event_date), 'MMM d, yyyy')}
                </Text>
                <Text style={styles.eventTableDateSubtext}>
                  {displayLocation !== 'Location not set' ? displayLocation : displayTime}
                </Text>
              </View>
              <View style={styles.eventTableVoteCell}>
                <Text style={[styles.eventTableVoteCount, { color: '#10b981' }]}>{counts.yes}</Text>
              </View>
              <View style={styles.eventTableVoteCell}>
                <Text style={[styles.eventTableVoteCount, { color: '#f59e0b' }]}>{counts.maybe}</Text>
              </View>
              <View style={styles.eventTableVoteCell}>
                <Text style={[styles.eventTableVoteCount, { color: '#ef4444' }]}>{counts.no}</Text>
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => router.push({ pathname: '/event/[id]/results', params: { id: eventId } })}
        >
          <Text style={styles.viewDetailsButtonText}>View Full Results</Text>
        </TouchableOpacity>
      </View>
    );
  }, [router]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadEvents} />;
  }

  const isCreator = activeTab === 'created';

  return (
    <View style={styles.container}>
      {currentEvents.length > 0 && (
        <View style={getScaledStyle(styles.header, 0.75)}>
          <TouchableOpacity
            style={getScaledStyle(styles.createButton, 0.75)}
            onPress={() => setCreateModalVisible(true)}
          >
            <Plus size={isSmallMobile ? 15 : 20} color="#ffffff" />
            <Text style={getScaledStyle(styles.createButtonText, 0.75)}>Create Event</Text>
          </TouchableOpacity>
          <View style={getScaledStyle(styles.tabsWrapper, 0.75)}>
            <View style={getScaledStyle(styles.tabContainer, 0.75)}>
              <TouchableOpacity
                style={[getScaledStyle(styles.tab, 0.75), activeTab === 'all' && getScaledStyle(styles.activeTab, 0.75)]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[getScaledStyle(styles.tabText, 0.75), activeTab === 'all' && getScaledStyle(styles.activeTabText, 0.75)]}>
                  All Events ({allEvents.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[getScaledStyle(styles.tab, 0.75), activeTab === 'created' && getScaledStyle(styles.activeTab, 0.75)]}
                onPress={() => setActiveTab('created')}
              >
                <Text style={[getScaledStyle(styles.tabText, 0.75), activeTab === 'created' && getScaledStyle(styles.activeTabText, 0.75)]}>
                  My Events ({events.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  getScaledStyle(styles.tab, 0.75),
                  activeTab === 'invited' && getScaledStyle(styles.activeTab, 0.75),
                  otherUsersEvents.length === 0 && styles.disabledTab
                ]}
                onPress={() => otherUsersEvents.length > 0 && setActiveTab('invited')}
                disabled={otherUsersEvents.length === 0}
              >
                <Text style={[
                  getScaledStyle(styles.tabText, 0.75),
                  activeTab === 'invited' && getScaledStyle(styles.activeTabText, 0.75),
                  otherUsersEvents.length === 0 && styles.disabledTabText
                ]}>
                  Voted In ({otherUsersEvents.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}



      {showShareLink && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={getScaledStyle(styles.shareLinkContainer, 0.75)}
        >
          <View style={getScaledStyle(styles.shareLinkHeader, 0.75)}>
            <Text style={getScaledStyle(styles.shareLinkTitle, 0.75)}>Share Link</Text>
            <TouchableOpacity
              onPress={() => setShowShareLink(null)}
              style={getScaledStyle(styles.closeShareLinkButton, 0.75)}
            >
              <X size={isSmallMobile ? 15 : 20} color="#666666" />
            </TouchableOpacity>
          </View>

          <View style={getScaledStyle(styles.shareLinkContent, 0.75)}>
            <TextInput
              style={getScaledStyle(styles.shareLinkInput, 0.75)}
              value={showShareLink}
              editable={false}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={getScaledStyle(styles.copyButton, 0.75)}
              onPress={async () => {
                try {
                  // Copy only the link value, not the text input content
                  await Clipboard.setStringAsync(showShareLink || '');
                  setShowCopiedConfirmation(true);
                  setTimeout(() => {
                    setShowCopiedConfirmation(false);
                  }, 2000);
                } catch (err) {
                  console.log('Error copying to clipboard:', err);
                }
              }}
            >
              {showCopiedConfirmation ? (
                <Check size={isSmallMobile ? 15 : 20} color="#4CAF50" />
              ) : (
                <Copy size={isSmallMobile ? 15 : 20} color="#ff9654" />
              )}
            </TouchableOpacity>
          </View>

          {showCopiedConfirmation && (
            <Text style={getScaledStyle(styles.copiedConfirmation, 0.75)}>Link copied to clipboard!</Text>
          )}
        </Animated.View>
      )}

      <FlatList
        data={currentEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isDropdownOpen = openResultsEventId === item.id;
          return (
            <Animated.View
              entering={FadeIn.delay(index * 100)}
              style={getScaledStyle(styles.eventCard, 0.75)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Pressable
                  style={({ hovered }) => [
                    getScaledStyle(styles.eventTitleContainer, 0.75),
                    hovered && Platform.OS === 'web' ? getScaledStyle(styles.eventTitleContainerHover, 0.75) : null,
                  ]}
                  onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isSmallMobile ? 1.5 : 2 }}>
                    <Text style={[getScaledStyle(styles.eventTitle, 0.75), { textDecorationLine: 'underline', color: '#1a2b5f', fontSize: isSmallMobile ? 13.5 : 18, paddingTop: isSmallMobile ? 6 : 8, marginBottom: 0, flexShrink: 1 }]} numberOfLines={2}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: isSmallMobile ? 9 : 12 }}>
                      <Calendar size={isSmallMobile ? 12 : 16} color="#8d8d8d" style={{ paddingTop: isSmallMobile ? 6 : 8, marginBottom: 0, marginRight: isSmallMobile ? 3 : 4 }} />
                      <Text style={[getScaledStyle(styles.eventDate, 0.75), { paddingTop: isSmallMobile ? 6 : 8, marginBottom: 0 }]} numberOfLines={1}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  {item.description && (
                    <Text style={getScaledStyle(styles.eventDescription, 0.75)}>{item.description}</Text>
                  )}
                  {/* Show event options count */}
                  <Text style={getScaledStyle(styles.eventOptionsCount, 0.75)}>
                    {item.eventOptions.length} date{item.eventOptions.length !== 1 ? 's' : ''} available
                  </Text>
                </Pressable>
                <View style={{ alignItems: 'flex-end', minWidth: isSmallMobile ? 30 : 40 }}>
                  {item.user_id === currentUserId && (
                    <TouchableOpacity
                      style={getScaledStyle(styles.deleteCircle, 0.75)}
                      onPress={() => setEventToDelete(item)}
                    >
                      <Text style={{ fontSize: isSmallMobile ? 15 : 20, color: '#e74c3c', fontWeight: 'bold' }}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {/* Action buttons */}
              {isMobile ? (
                <>
                  <View style={{ flexDirection: 'row', gap: isSmallMobile ? 6 : 8, marginTop: isSmallMobile ? 9 : 12 }}>
                    <TouchableOpacity style={getScaledStyle(styles.shareButtonMobile, 0.75)} onPress={() => handleShare(item.id)}>
                      <Share2 size={isSmallMobile ? 13.5 : 18} color="#ff9654" />
                      <Text style={getScaledStyle(styles.shareLinkButtonTextMobile, 0.75)}>Share</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={getScaledStyle(styles.resultsButtonMobile, 0.75)}
                    onPress={() => setOpenResultsEventId(isDropdownOpen ? null : item.id)}
                  >
                    <BarChart3 size={isSmallMobile ? 13.5 : 18} color="#2563eb" />
                    <Text style={getScaledStyle(styles.resultsButtonTextMobile, 0.75)}>
                      View Results
                    </Text>
                  </TouchableOpacity>
                  {isDropdownOpen && (
                    <View style={{ marginTop: isSmallMobile ? 6 : 8 }}>
                      <EventResultsDropdown eventId={item.id} />
                    </View>
                  )}
                </>
              ) : (
                <View style={{ flexDirection: 'row', gap: isSmallMobile ? 9 : 12, marginTop: isSmallMobile ? 13.5 : 18 }}>
                  <TouchableOpacity style={getScaledStyle(styles.shareButtonDesktop, 0.75)} onPress={() => handleShare(item.id)}>
                    <Share2 size={isSmallMobile ? 13.5 : 18} color="#ff9654" />
                    <Text style={getScaledStyle(styles.shareLinkButtonTextDesktop, 0.75)}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={getScaledStyle(styles.resultsButtonDesktop, 0.75)}
                    onPress={() => setOpenResultsEventId(isDropdownOpen ? null : item.id)}
                  >
                    <BarChart3 size={isSmallMobile ? 13.5 : 18} color="#2563eb" />
                    <Text style={getScaledStyle(styles.resultsButtonTextDesktop, 0.75)}>
                      Results
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* Dropdown for desktop, below event card */}
              {!isMobile && isDropdownOpen && (
                <View style={{ marginTop: isSmallMobile ? 6 : 8 }}>
                  <EventResultsDropdown eventId={item.id} />
                </View>
              )}
            </Animated.View>
          );
        }}
        contentContainerStyle={[
          getScaledStyle(styles.listContent, 0.75),
          { paddingBottom: 80 + safeAreaBottom },
          currentEvents.length === 0 && { flex: 1, justifyContent: 'center' }
        ]}
        ListEmptyComponent={
          <PollsEmptyState onCreate={() => setCreateModalVisible(true)} />
        }
      />

      {/* Create Event Modal */}
      <CreateEventModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          loadEvents();
        }}
      />

      <ConfirmationDialog
        isVisible={eventToDelete !== null}
        title="Delete Event"
        message={`Are you sure you want to delete "${eventToDelete?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setEventToDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    paddingHorizontal: 8,
  },
  header: {
    padding: 20,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9654',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    marginRight: 8,
  },
  createButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
  tabsWrapper: {
    width: '100%',
    marginTop: 8,
    alignItems: 'flex-start',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    flexShrink: 1,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#1a2b5f',
    fontFamily: 'Poppins-SemiBold',
  },
  disabledTab: {
    opacity: 0.5,
    pointerEvents: 'none',
  },
  disabledTabText: {
    color: '#9ca3af',
  },
  shareLinkContainer: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shareLinkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shareLinkTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
  },
  closeShareLinkButton: {
    padding: 4,
  },
  shareLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareLinkInput: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
  },
  copyButton: {
    padding: 8,
    backgroundColor: '#fff5ef',
    borderRadius: 8,
  },
  copiedConfirmation: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 80, // Base padding for tab bar
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventTitleContainer: {
    flex: 1,
    minWidth: 220,
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    transitionProperty: Platform.OS === 'web' ? 'background' : undefined,
    transitionDuration: Platform.OS === 'web' ? '0.2s' : undefined,
  },
  eventTitleContainerHover: {
    backgroundColor: '#f3f4f6',
  },
  eventTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 4,
    paddingTop: 8, // Add padding to shift title down
  },
  eventDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  eventDate: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8d8d8d',
  },
  eventOptionsCount: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
  },
  deleteCircle: {
    backgroundColor: '#fff5f5',
    borderRadius: 999,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginTop: 0, // Reduce margin so X sits higher
  },
  shareButtonDesktop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5ef',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 6,
  },
  shareLinkButtonTextDesktop: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#ff9654',
  },

  resultsButtonDesktop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f6ff',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 6,
  },
  resultsButtonTextDesktop: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#2563eb',
  },
  shareButtonMobile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5ef',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 6,
  },
  shareLinkButtonTextMobile: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#ff9654',
  },

  resultsButtonMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f6ff',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  resultsButtonTextMobile: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#2563eb',
  },
  // Event Results Dropdown Styles
  eventResultsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  eventResultsTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 16,
  },
  // Table Styles
  eventTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  eventTableHeaderDate: {
    flex: 2,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
  },
  eventTableHeaderVote: {
    flex: 1,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    textAlign: 'center',
  },
  eventTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    alignItems: 'center',
  },
  eventTableDateCell: {
    flex: 2,
  },
  eventTableDateText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 2,
  },
  eventTableDateSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
  },
  eventTableVoteCell: {
    flex: 1,
    alignItems: 'center',
  },
  eventTableVoteCount: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  viewDetailsButton: {
    backgroundColor: '#ff9654',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  viewDetailsButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: 'white',
  },
}); 