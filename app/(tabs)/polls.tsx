import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Platform, Pressable } from 'react-native';
import { useDebouncedWindowDimensions } from '@/hooks/useDebouncedWindowDimensions';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Plus, Share2, Trash2, X, Copy, Check, BarChart3, Users, Edit } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/services/supabase';
import { Poll } from '@/types/poll';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CreatePollModal } from '@/components/CreatePollModal';
import { EditPollModal } from '@/components/EditPollModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { PollsEmptyState } from '@/components/PollsEmptyState';
import { Calendar, Shield } from 'lucide-react-native';
import { PollScreenCard } from '@/components/PollScreenCard';
import { usePollResults } from '@/hooks/usePollResults';
import { Game } from '@/types/game';

type TabType = 'all' | 'created' | 'other';

// Extend Poll type locally for voteCount
interface PollWithVoteCount extends Poll {
  voteCount: number;
}

export default function PollsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [polls, setPolls] = useState<PollWithVoteCount[]>([]);

  // Use fallback values for web platform
  const safeAreaBottom = Platform.OS === 'web' ? 0 : insets.bottom;
  const [allPolls, setAllPolls] = useState<PollWithVoteCount[]>([]);
  const [otherUsersPolls, setOtherUsersPolls] = useState<PollWithVoteCount[]>([]);
  const [creatorMap, setCreatorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [pollToEdit, setPollToEdit] = useState<Poll | null>(null);
  const [pollToDelete, setPollToDelete] = useState<Poll | null>(null);
  const [showShareLink, setShowShareLink] = useState<string | null>(null);
  const [showCopiedConfirmation, setShowCopiedConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { width, height } = useDebouncedWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 380 || height < 700;
  const [openResultsPollId, setOpenResultsPollId] = useState<string | null>(null);
  const [newVotes, setNewVotes] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const [preselectedGames, setPreselectedGames] = useState<Game[] | null>(null);

  // Memoize the loadPolls function to prevent unnecessary re-creations
  const loadPolls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }
      setCurrentUserId(user.id);

      // Load all polls
      const { data: allPollsData, error: allPollsError } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

      if (allPollsError) throw allPollsError;

      // Fetch vote counts for all poll IDs using aggregate
      const pollIds = (allPollsData || []).map(p => p.id);
      let voterCountMap: Record<string, number> = {};
      if (pollIds.length > 0) {
        const { data: numberOfVoters, error: numberOfVotersError } = await supabase
          .from('votes')
          .select('poll_id, voter_name');
        if (!numberOfVotersError && numberOfVoters) {
          const pollVoters: Record<string, Set<string>> = {};
          numberOfVoters.forEach((row: any) => {
            if (row.poll_id && row.voter_name) {
              if (!pollVoters[row.poll_id]) pollVoters[row.poll_id] = new Set();
              pollVoters[row.poll_id].add(row.voter_name);
            }
          });
          Object.keys(pollVoters).forEach(pid => {
            voterCountMap[pid] = pollVoters[pid].size;
          });
        }
      }

      // Fetch creator usernames/emails for all unique user_ids
      const userIds = Array.from(new Set((allPollsData || []).map(p => p.user_id)));
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

      setAllPolls([]); // will be set below

      // Separate created polls and other users' polls
      const createdPolls = allPollsData?.filter(poll => poll.user_id === user.id) || [];

      // Get polls from other users that the current user has voted in
      const { data: userVotes, error: votesError } = await supabase
        .from('votes')
        .select('poll_id, voter_name')
        .eq('voter_name', user.email || 'Anonymous');

      if (votesError) throw votesError;

      let otherUsersPolls: Poll[] = [];
      if (userVotes && userVotes.length > 0) {
        const votedPollIds = [...new Set(userVotes.map(vote => vote.poll_id))];
        otherUsersPolls = allPollsData?.filter(poll =>
          poll.user_id !== user.id && votedPollIds.includes(poll.id)
        ) || [];
      }

      // Add voterCount to each poll
      const addVoterCount = (polls: Poll[]): PollWithVoteCount[] =>
        polls.map(p => ({ ...p, voteCount: voterCountMap[p.id] || 0 }));

      setPolls(addVoterCount(createdPolls));
      setOtherUsersPolls(addVoterCount(otherUsersPolls));

      // Set allPolls to be the union of createdPolls and otherUsersPolls (no duplicates)
      const uniqueAllPolls: PollWithVoteCount[] = [
        ...addVoterCount(createdPolls),
        ...addVoterCount(otherUsersPolls.filter(
          (poll) => !createdPolls.some((myPoll) => myPoll.id === poll.id)
        )),
      ];
      // Sort by created_at to ensure proper date ordering
      uniqueAllPolls.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllPolls(uniqueAllPolls);
    } catch (err) {
      console.error('Error loading polls:', err);
      setError(err instanceof Error ? err.message : 'Failed to load polls');
    } finally {
      setLoading(false);
      // Reset newVotes when polls are refreshed
      setNewVotes(false);
    }
  }, [router]);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  // Handle refresh parameter from URL
  useEffect(() => {
    if (params.refresh === 'true') {
      loadPolls();
      // Clear the refresh parameter from URL
      router.setParams({ refresh: undefined });
    }
  }, [params.refresh, loadPolls, router]);

  // Auto-switch to 'all' tab if 'other' tab has no polls
  useEffect(() => {
    if (activeTab === 'other' && otherUsersPolls.length === 0) {
      setActiveTab('all');
    }
  }, [activeTab, otherUsersPolls.length]);

  // --- Real-time vote listening subscription ---
  useEffect(() => {
    // Subscribe to new votes for any poll
    const channel = supabase
      .channel('votes-listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
        },
        (payload) => {
          setNewVotes(true);
        }
      )
      .subscribe();
    subscriptionRef.current = channel;
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

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

  // Memoize current polls to prevent unnecessary re-renders
  const currentPolls = useMemo(() => {
    return activeTab === 'all' ? allPolls : activeTab === 'created' ? polls : otherUsersPolls;
  }, [activeTab, allPolls, polls, otherUsersPolls]);

  const handleShare = useCallback(async (pollId: string) => {
    // Use a proper base URL for React Native
    const baseUrl = Platform.select({
      web: typeof window !== 'undefined' ? window.location.origin : 'https://gamenyte.netlify.app',
      default: 'https://gamenyte.netlify.app', // Replace with your actual domain
    });

    const shareUrl = `${baseUrl}/poll/${pollId}`;
    setShowShareLink(shareUrl);

    try {
      if (Platform.OS === 'web') {
        // Web-specific sharing
        if (navigator.share) {
          await navigator.share({
            title: 'Vote on which game to play!',
            text: 'Help us decide which game to play by voting in this poll.',
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
    if (!pollToDelete) return;

    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollToDelete.id);

      if (error) throw error;

      setPollToDelete(null);
      await loadPolls();
    } catch (err) {
      console.error('Error deleting poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete poll');
    }
  }, [pollToDelete, loadPolls]);

  const handleEditPoll = useCallback((poll: Poll) => {
    setPollToEdit(poll);
    setEditModalVisible(true);
  }, []);

  // Helper to render poll results dropdown - memoized to prevent unnecessary re-renders
  const PollResultsDropdown = useCallback(({ pollId }: { pollId: string }) => {
    const { results, loading, error } = usePollResults(pollId);
    if (loading) return <LoadingState />;
    if (error) return <ErrorState message={error} onRetry={() => { }} />;
    if (!results || results.length === 0) return <Text style={{ padding: 16, color: '#888' }}>No votes yet.</Text>;

    // Transform the data to match PollScreenCard's expected format
    const transformedGames = results.map(result => {
      const transformedGame = { ...result.game } as any;

      // Flatten the nested votes structure using forEach
      if (result.game.votes?.votes) {
        Object.entries(result.game.votes.votes).forEach(([voteType, count]) => {
          transformedGame[voteType] = count || 0;
        });
      }

      return transformedGame;
    });

    return (
      <PollScreenCard
        games={transformedGames}
        onViewDetails={() => router.push({ pathname: '/poll/[id]/results', params: { id: pollId } })}
      />
    );
  }, [router]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadPolls} />;
  }

  const isCreator = activeTab === 'created';
  // userId is managed by useState and set in useEffect

  return (
    <View style={styles.container}>
      {currentPolls.length > 0 && (
        <View style={getScaledStyle(styles.header, 0.75)}>
          <TouchableOpacity
            style={getScaledStyle(styles.createButton, 0.75)}
            onPress={() => setCreateModalVisible(true)}
          >
            <Plus size={isSmallMobile ? 15 : 20} color="#ffffff" />
            <Text style={getScaledStyle(styles.createButtonText, 0.75)}>Create Poll</Text>
          </TouchableOpacity>
          <View style={getScaledStyle(styles.tabsWrapper, 0.75)}>
            <View style={getScaledStyle(styles.tabContainer, 0.75)}>
              <TouchableOpacity
                style={[getScaledStyle(styles.tab, 0.75), activeTab === 'all' && getScaledStyle(styles.activeTab, 0.75)]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[getScaledStyle(styles.tabText, 0.75), activeTab === 'all' && getScaledStyle(styles.activeTabText, 0.75)]}>
                  All Polls ({allPolls.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[getScaledStyle(styles.tab, 0.75), activeTab === 'created' && getScaledStyle(styles.activeTab, 0.75)]}
                onPress={() => setActiveTab('created')}
              >
                <Text style={[getScaledStyle(styles.tabText, 0.75), activeTab === 'created' && getScaledStyle(styles.activeTabText, 0.75)]}>
                  My Polls ({polls.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  getScaledStyle(styles.tab, 0.75),
                  activeTab === 'other' && getScaledStyle(styles.activeTab, 0.75),
                  otherUsersPolls.length === 0 && styles.disabledTab
                ]}
                onPress={() => otherUsersPolls.length > 0 && setActiveTab('other')}
                disabled={otherUsersPolls.length === 0}
              >
                <Text style={[
                  getScaledStyle(styles.tabText, 0.75),
                  activeTab === 'other' && getScaledStyle(styles.activeTabText, 0.75),
                  otherUsersPolls.length === 0 && styles.disabledTabText
                ]}>
                  Voted In ({otherUsersPolls.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* --- Banner notification for new votes --- */}
      {newVotes && (
        <View style={{
          backgroundColor: '#fffbe6',
          borderBottomWidth: 1,
          borderBottomColor: '#ffe58f',
          padding: isSmallMobile ? 10.5 : 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}>
          <Text style={{ color: '#b45309', fontWeight: 'bold', fontSize: isSmallMobile ? 11.25 : 15 }}>
            New votes have been cast! Refresh to dismiss.
          </Text>
          <TouchableOpacity onPress={() => {
            setNewVotes(false);
          }}>
            <Text style={{ color: '#2563eb', fontWeight: 'bold', marginLeft: isSmallMobile ? 12 : 16 }}>Dismiss</Text>
          </TouchableOpacity>
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
        data={currentPolls}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isDropdownOpen = openResultsPollId === item.id;
          return (
            <Animated.View
              entering={FadeIn.delay(index * 100)}
              style={getScaledStyle(styles.pollCard, 0.75)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Pressable
                  style={({ hovered }) => [
                    getScaledStyle(styles.pollTitleContainer, 0.75),
                    hovered && Platform.OS === 'web' ? getScaledStyle(styles.pollTitleContainerHover, 0.75) : null,
                  ]}
                  onPress={() => router.push({ pathname: '/poll/[id]', params: { id: item.id } })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isSmallMobile ? 1.5 : 2 }}>
                    <Text style={[getScaledStyle(styles.pollTitle, 0.75), { textDecorationLine: 'underline', color: '#1a2b5f', fontSize: isSmallMobile ? 13.5 : 18, paddingTop: isSmallMobile ? 6 : 8, marginBottom: 0, flexShrink: 1 }]} numberOfLines={2}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: isSmallMobile ? 9 : 12 }}>
                      <Calendar size={isSmallMobile ? 12 : 16} color="#8d8d8d" style={{ paddingTop: isSmallMobile ? 6 : 8, marginBottom: 0, marginRight: isSmallMobile ? 3 : 4 }} />
                      <Text style={[getScaledStyle(styles.pollDate, 0.75), { paddingTop: isSmallMobile ? 6 : 8, marginBottom: 0 }]} numberOfLines={1}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  {item.description && (
                    <Text style={getScaledStyle(styles.pollDescription, 0.75)}>{item.description}</Text>
                  )}
                </Pressable>
                <View style={{ alignItems: 'flex-end', minWidth: isSmallMobile ? 30 : 40 }}>
                  {item.user_id === currentUserId && (
                    <TouchableOpacity
                      style={getScaledStyle(styles.deleteCircle, 0.75)}
                      onPress={() => setPollToDelete(item)}
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
                    <TouchableOpacity style={getScaledStyle(styles.localVoteButtonMobile, 0.75)} onPress={() => router.push(`/poll/local/${item.id}`)}>
                      <Users size={isSmallMobile ? 13.5 : 18} color="#10b981" />
                      <Text style={getScaledStyle(styles.localVoteButtonTextMobile, 0.75)}>In-Person</Text>
                    </TouchableOpacity>
                    {item.user_id === currentUserId && (
                      <TouchableOpacity style={getScaledStyle(styles.editButtonMobile, 0.75)} onPress={() => handleEditPoll(item)}>
                        <Edit size={isSmallMobile ? 13.5 : 18} color="#4b5563" />
                        <Text style={getScaledStyle(styles.editButtonTextMobile, 0.75)}>Edit</Text>
                      </TouchableOpacity>
                    )}
                    {/* <TouchableOpacity style={getScaledStyle(styles.duplicateButtonMobile, 0.75)} onPress={() => handleDuplicatePoll(item.id)}>
                      <Copy size={isSmallMobile ? 13.5 : 18} color="#4b5563" />
                      <Text style={getScaledStyle(styles.duplicateButtonTextMobile, 0.75)}>Duplicate</Text>
                    </TouchableOpacity> */}
                  </View>
                  <TouchableOpacity
                    style={[
                      getScaledStyle(styles.resultsButtonMobile, 0.75),
                      item.voteCount === 0 && { backgroundColor: '#e5e7eb' }
                    ]}
                    onPress={() => setOpenResultsPollId(isDropdownOpen ? null : item.id)}
                    disabled={item.voteCount === 0}
                  >
                    <BarChart3 size={isSmallMobile ? 13.5 : 18} color={item.voteCount === 0 ? '#6b7280' : '#2563eb'} />
                    <Text
                      style={[
                        getScaledStyle(styles.resultsButtonTextMobile, 0.75),
                        item.voteCount === 0 && { color: '#6b7280' }
                      ]}
                    >
                      View Results ({item.voteCount})
                    </Text>
                  </TouchableOpacity>
                  {isDropdownOpen && (
                    <View style={{ marginTop: isSmallMobile ? 6 : 8 }}>
                      <PollResultsDropdown pollId={item.id} />
                    </View>
                  )}
                </>
              ) : (
                <View style={{ flexDirection: 'row', gap: isSmallMobile ? 9 : 12, marginTop: isSmallMobile ? 13.5 : 18 }}>
                  <TouchableOpacity style={getScaledStyle(styles.shareButtonDesktop, 0.75)} onPress={() => handleShare(item.id)}>
                    <Share2 size={isSmallMobile ? 13.5 : 18} color="#ff9654" />
                    <Text style={getScaledStyle(styles.shareLinkButtonTextDesktop, 0.75)}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={getScaledStyle(styles.localVoteButtonDesktop, 0.75)} onPress={() => router.push(`/poll/local/${item.id}`)}>
                    <Users size={isSmallMobile ? 13.5 : 18} color="#10b981" />
                    <Text style={getScaledStyle(styles.localVoteButtonTextDesktop, 0.75)}>In-Person</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      getScaledStyle(styles.resultsButtonDesktop, 0.75),
                      item.voteCount === 0 && { backgroundColor: '#e5e7eb' }
                    ]}
                    onPress={() => setOpenResultsPollId(isDropdownOpen ? null : item.id)}
                    disabled={item.voteCount === 0}
                  >
                    <BarChart3 size={isSmallMobile ? 13.5 : 18} color={item.voteCount === 0 ? '#6b7280' : '#2563eb'} />
                    <Text
                      style={[
                        getScaledStyle(styles.resultsButtonTextDesktop, 0.75),
                        item.voteCount === 0 && { color: '#6b7280' }
                      ]}
                    >
                      Results ({item.voteCount})
                    </Text>
                  </TouchableOpacity>
                  {item.user_id === currentUserId && (
                    <TouchableOpacity
                      style={getScaledStyle(styles.editButtonDesktop, 0.75)}
                      onPress={() => handleEditPoll(item)}
                    >
                      <Edit size={isSmallMobile ? 13.5 : 18} color="#4b5563" />
                      <Text style={getScaledStyle(styles.editButtonTextDesktop, 0.75)}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  {/*<TouchableOpacity
                    style={getScaledStyle(styles.duplicateButtonDesktop, 0.75)}
                    onPress={() => handleDuplicatePoll(item.id)}
                  >
                    <Copy size={isSmallMobile ? 13.5 : 18} color="#4b5563" />
                    <Text style={getScaledStyle(styles.duplicateButtonTextDesktop, 0.75)}>Duplicate</Text>
                  </TouchableOpacity> */}
                </View>
              )}
              {/* Dropdown for desktop, below poll card */}
              {!isMobile && isDropdownOpen && (
                <View style={{ marginTop: isSmallMobile ? 6 : 8 }}>
                  <PollResultsDropdown pollId={item.id} />
                </View>
              )}
            </Animated.View>
          );
        }}
        contentContainerStyle={[
          getScaledStyle(styles.listContent, 0.75),
          { paddingBottom: 80 + safeAreaBottom },
          currentPolls.length === 0 && { flex: 1, justifyContent: 'center' }
        ]}
        ListEmptyComponent={
          <PollsEmptyState onCreate={() => setCreateModalVisible(true)} />
        }
      />

      <CreatePollModal
        isVisible={createModalVisible}
        onClose={() => {
          setCreateModalVisible(false);
          setPreselectedGames(null);
        }}
        onSuccess={() => {
          setCreateModalVisible(false);
          setPreselectedGames(null);
          loadPolls();
        }}
        preselectedGames={preselectedGames || undefined}
      />

      <EditPollModal
        isVisible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setPollToEdit(null);
        }}
        onSuccess={() => {
          setEditModalVisible(false);
          setPollToEdit(null);
          loadPolls();
        }}
        pollId={pollToEdit?.id || ''}
        pollTitle={pollToEdit?.title || ''}
        pollDescription={pollToEdit?.description}
      />

      <ConfirmationDialog
        isVisible={pollToDelete !== null}
        title="Delete Poll"
        message={`Are you sure you want to delete "${pollToDelete?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setPollToDelete(null)}
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
  pollCard: {
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
  pollMainRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    width: '100%',
  },
  pollTitleContainer: {
    flex: 1,
    minWidth: 220,
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    transitionProperty: Platform.OS === 'web' ? 'background' : undefined,
    transitionDuration: Platform.OS === 'web' ? '0.2s' : undefined,
  },
  pollTitleContainerHover: {
    backgroundColor: '#f3f4f6',
  },
  pollTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 4,
    paddingTop: 8, // Add padding to shift title down
  },
  pollDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  pollDate: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8d8d8d',
  },
  pollActions: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 0,
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5ef',
    borderRadius: 8,
    padding: 8,
    minWidth: 100,
    flexShrink: 1,
  },
  resultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 8,
    marginLeft: 4,
    minWidth: 110,
    flexShrink: 1,
  },
  resultsButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 4,
  },
  localVoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    gap: 4,
  },
  localVoteButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#10b981',
  },
  shareLinkButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
    marginLeft: 4,
  },
  voteCountBadge: {
    marginLeft: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  voteCountText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#1a2b5f',
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
  localVoteButtonDesktop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 6,
  },
  localVoteButtonTextDesktop: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#10b981',
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
  localVoteButtonMobile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 6,
  },
  localVoteButtonTextMobile: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#10b981',
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
  responseCountBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    minWidth: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  responseCountText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
  },
  editButtonDesktop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 6,
  },
  editButtonTextDesktop: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#4b5563',
  },
  editButtonMobile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 6,
  },
  editButtonTextMobile: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#4b5563',
  },
  duplicateButtonDesktop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 6,
  },
  duplicateButtonTextDesktop: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#4b5563',
  },
  duplicateButtonMobile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 6,
  },
  duplicateButtonTextMobile: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#4b5563',
  },
  disabledTab: {
    opacity: 0.5,
    pointerEvents: 'none',
  },
  disabledTabText: {
    color: '#9ca3af',
  },
});