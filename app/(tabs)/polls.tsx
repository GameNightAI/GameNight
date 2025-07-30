import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Platform, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Share2, Trash2, X, Copy, Check, BarChart3, Users } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';

import { supabase } from '@/services/supabase';
import { Poll } from '@/types/poll';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CreatePollModal } from '@/components/CreatePollModal';
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
  const [polls, setPolls] = useState<PollWithVoteCount[]>([]);
  const [allPolls, setAllPolls] = useState<PollWithVoteCount[]>([]);
  const [otherUsersPolls, setOtherUsersPolls] = useState<PollWithVoteCount[]>([]);
  const [creatorMap, setCreatorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [pollToDelete, setPollToDelete] = useState<Poll | null>(null);
  const [showShareLink, setShowShareLink] = useState<string | null>(null);
  const [showCopiedConfirmation, setShowCopiedConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [openResultsPollId, setOpenResultsPollId] = useState<string | null>(null);
  const [newVotes, setNewVotes] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const [preselectedGames, setPreselectedGames] = useState<Game[] | null>(null);

  useEffect(() => {
    loadPolls();
  }, []);

  // --- Real-time vote listening subscription ---
  useEffect(() => {
    // Subscribe to new votes for any poll
    const channel = supabase
      .channel('votes-listener')
      .on(
        'postgres_changes',
        {
          event: '*',
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

  const loadPolls = async () => {
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
    }
  };

  const handleShare = async (pollId: string) => {
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
  };

  const handleDelete = async () => {
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
  };

  const handleDuplicatePoll = async (pollId: string) => {
    try {
      // Get poll games
      const { data: pollGames, error: pollGamesError } = await supabase
        .from('poll_games')
        .select('game_id')
        .eq('poll_id', pollId);
      if (pollGamesError) throw pollGamesError;
      if (!pollGames || pollGames.length === 0) {
        setError('No games found in poll.');
        return;
      }
      const gameIds = pollGames.map(pg => pg.game_id);
      // Get game details
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .in('id', gameIds);
      if (gamesError) throw gamesError;
      if (!gamesData || gamesData.length === 0) {
        setError('No game details found.');
        return;
      }
      setPreselectedGames(gamesData);
      setCreateModalVisible(true);
    } catch (err) {
      console.error('Error duplicating poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to duplicate poll');
    }
  };

  // Helper to render poll results dropdown
  function PollResultsDropdown({ pollId }: { pollId: string }) {
    const { gameResults, loading, error } = usePollResults(pollId);
    if (loading) return <LoadingState />;
    if (error) return <ErrorState message={error} onRetry={() => { }} />;
    if (!gameResults || gameResults.length === 0) return <Text style={{ padding: 16, color: '#888' }}>No votes yet.</Text>;

    return (
      <PollScreenCard
        games={gameResults}
        onViewDetails={() => router.push({ pathname: '/poll/[id]/results', params: { id: pollId } })}
      />
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadPolls} />;
  }

  const currentPolls = activeTab === 'all' ? allPolls : activeTab === 'created' ? polls : otherUsersPolls;
  const isCreator = activeTab === 'created';
  // userId is managed by useState and set in useEffect

  return (
    <View style={styles.container}>
      {currentPolls.length > 0 && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setCreateModalVisible(true)}
          >
            <Plus size={20} color="#ffffff" />
            <Text style={styles.createButtonText}>Create Poll</Text>
          </TouchableOpacity>
          <View style={styles.tabsWrapper}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                  All Polls ({allPolls.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'created' && styles.activeTab]}
                onPress={() => setActiveTab('created')}
              >
                <Text style={[styles.tabText, activeTab === 'created' && styles.activeTabText]}>
                  My Polls ({polls.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'other' && styles.activeTab]}
                onPress={() => setActiveTab('other')}
              >
                <Text style={[styles.tabText, activeTab === 'other' && styles.activeTabText]}>
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
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}>
          <Text style={{ color: '#b45309', fontWeight: 'bold', fontSize: 15 }}>
            New votes have been cast! Pull to refresh or tap below.
          </Text>
          <TouchableOpacity onPress={() => {
            setNewVotes(false);
            // Optionally, trigger a refetch of polls here
          }}>
            <Text style={{ color: '#2563eb', fontWeight: 'bold', marginLeft: 16 }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {showShareLink && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.shareLinkContainer}
        >
          <View style={styles.shareLinkHeader}>
            <Text style={styles.shareLinkTitle}>Share Link</Text>
            <TouchableOpacity
              onPress={() => setShowShareLink(null)}
              style={styles.closeShareLinkButton}
            >
              <X size={20} color="#666666" />
            </TouchableOpacity>
          </View>

          <View style={styles.shareLinkContent}>
            <TextInput
              style={styles.shareLinkInput}
              value={showShareLink}
              editable={false}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.copyButton}
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(showShareLink);
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
                <Check size={20} color="#4CAF50" />
              ) : (
                <Copy size={20} color="#ff9654" />
              )}
            </TouchableOpacity>
          </View>

          {showCopiedConfirmation && (
            <Text style={styles.copiedConfirmation}>Link copied to clipboard!</Text>
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
              style={styles.pollCard}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Pressable
                  style={({ hovered }) => [
                    styles.pollTitleContainer,
                    hovered && Platform.OS === 'web' ? styles.pollTitleContainerHover : null,
                  ]}
                  onPress={() => router.push({ pathname: '/poll/[id]', params: { id: item.id } })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={[styles.pollTitle, { textDecorationLine: 'underline', color: '#1a2b5f', fontSize: 18, paddingTop: 8, marginBottom: 0, flexShrink: 1 }]} numberOfLines={2}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                      <Calendar size={16} color="#8d8d8d" style={{ paddingTop: 8, marginBottom: 0, marginRight: 4 }} />
                      <Text style={[styles.pollDate, { paddingTop: 8, marginBottom: 0 }]} numberOfLines={1}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  {item.description && (
                    <Text style={styles.pollDescription}>{item.description}</Text>
                  )}
                </Pressable>
                <View style={{ alignItems: 'flex-end', minWidth: 40 }}>
                  {item.user_id === currentUserId && (
                    <TouchableOpacity
                      style={styles.deleteCircle}
                      onPress={() => setPollToDelete(item)}
                    >
                      <Text style={{ fontSize: 20, color: '#e74c3c', fontWeight: 'bold' }}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {/* Action buttons */}
              {isMobile ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <TouchableOpacity style={styles.shareButtonMobile} onPress={() => handleShare(item.id)}>
                      <Share2 size={18} color="#ff9654" />
                      <Text style={styles.shareLinkButtonTextMobile}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.localVoteButtonMobile} onPress={() => router.push(`/poll/local/${item.id}`)}>
                      <Users size={18} color="#10b981" />
                      <Text style={styles.localVoteButtonTextMobile}>In-Person</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.duplicateButtonMobile} onPress={() => handleDuplicatePoll(item.id)}>
                      <Copy size={18} color="#4b5563" />
                      <Text style={styles.duplicateButtonTextMobile}>Duplicate</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.resultsButtonMobile,
                      item.voteCount === 0 && { backgroundColor: '#e5e7eb' }
                    ]}
                    onPress={() => setOpenResultsPollId(isDropdownOpen ? null : item.id)}
                    disabled={item.voteCount === 0}
                  >
                    <BarChart3 size={18} color={item.voteCount === 0 ? '#6b7280' : '#2563eb'} />
                    <Text
                      style={[
                        styles.resultsButtonTextMobile,
                        item.voteCount === 0 && { color: '#6b7280' }
                      ]}
                    >
                      View Results ({item.voteCount})
                    </Text>
                  </TouchableOpacity>
                  {isDropdownOpen && (
                    <View style={{ marginTop: 8 }}>
                      <PollResultsDropdown pollId={item.id} />
                    </View>
                  )}
                </>
              ) : (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
                  <TouchableOpacity style={styles.shareButtonDesktop} onPress={() => handleShare(item.id)}>
                    <Share2 size={18} color="#ff9654" />
                    <Text style={styles.shareLinkButtonTextDesktop}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.localVoteButtonDesktop} onPress={() => router.push(`/poll/local/${item.id}`)}>
                    <Users size={18} color="#10b981" />
                    <Text style={styles.localVoteButtonTextDesktop}>In-Person</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.resultsButtonDesktop,
                      item.voteCount === 0 && { backgroundColor: '#e5e7eb' }
                    ]}
                    onPress={() => setOpenResultsPollId(isDropdownOpen ? null : item.id)}
                    disabled={item.voteCount === 0}
                  >
                    <BarChart3 size={18} color={item.voteCount === 0 ? '#6b7280' : '#2563eb'} />
                    <Text
                      style={[
                        styles.resultsButtonTextDesktop,
                        item.voteCount === 0 && { color: '#6b7280' }
                      ]}
                    >
                      Results ({item.voteCount})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.duplicateButtonDesktop}
                    onPress={() => handleDuplicatePoll(item.id)}
                  >
                    <Copy size={18} color="#4b5563" />
                    <Text style={styles.duplicateButtonTextDesktop}>Duplicate</Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* Dropdown for desktop, below poll card */}
              {!isMobile && isDropdownOpen && (
                <View style={{ marginTop: 8 }}>
                  <PollResultsDropdown pollId={item.id} />
                </View>
              )}
            </Animated.View>
          );
        }}
        contentContainerStyle={[
          styles.listContent,
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
    paddingBottom: 32,
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
});