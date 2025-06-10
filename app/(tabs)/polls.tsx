import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Share2, Trash2, X, Copy, Check } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { supabase } from '@/services/supabase';
import { Poll } from '@/types/poll';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { CreatePollModal } from '@/components/CreatePollModal';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

export default function PollsScreen() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [pollToDelete, setPollToDelete] = useState<Poll | null>(null);
  const [showShareLink, setShowShareLink] = useState<string | null>(null);
  const [showCopiedConfirmation, setShowCopiedConfirmation] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPolls(data);
    } catch (err) {
      console.error('Error loading polls:', err);
      setError(err instanceof Error ? err.message : 'Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (pollId: string) => {
    const shareUrl = `${window.location.origin}/poll/${pollId}`;
    setShowShareLink(shareUrl);
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Vote on which game to play!',
          text: 'Help us decide which game to play by voting in this poll.',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShowCopiedConfirmation(true);
        setTimeout(() => {
          setShowCopiedConfirmation(false);
        }, 2000);
      }
    } catch (err) {
      console.log('Error sharing:', err);
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

      setPolls(prevPolls => prevPolls.filter(poll => poll.id !== pollToDelete.id));
      setPollToDelete(null);
    } catch (err) {
      console.error('Error deleting poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete poll');
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadPolls} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Game Polls</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Plus size={20} color="#ffffff" />
          <Text style={styles.createButtonText}>Create Poll</Text>
        </TouchableOpacity>
      </View>

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
              selectTextOnFocus/>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => {
                navigator.clipboard.writeText(showShareLink);
                setShowCopiedConfirmation(true);
                setTimeout(() => {
                  setShowCopiedConfirmation(false);
                }, 2000);
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
        data={polls}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View 
            entering={FadeIn.delay(index * 100)}
            style={styles.pollCard}
          >
            <View style={styles.pollInfo}>
              <Text style={styles.pollTitle}>{item.title}</Text>
              {item.description && (
                <Text style={styles.pollDescription}>{item.description}</Text>
              )}
              <Text style={styles.pollDate}>
                Created {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.pollActions}>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => setPollToDelete(item)}
              >
                <Trash2 size={20} color="#e74c3c" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.shareButton}
                onPress={() => handleShare(item.id)}
              >
                <Share2 size={20} color="#ff9654" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No polls yet. Create one to get started!
          </Text>
        }
      />

      <CreatePollModal
        isVisible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          loadPolls();
        }}
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
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9654',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
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
    padding: 20,
    paddingTop: 0,
  },
  pollCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pollInfo: {
    flex: 1,
  },
  pollTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
  },
  shareButton: {
    padding: 8,
    backgroundColor: '#fff5ef',
    borderRadius: 8,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 32,
  },
});