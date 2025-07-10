import React, { useState, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { usePollResults } from '@/hooks/usePollResults';
import { GameResultCard } from '@/components/PollGameResultCard';
import { supabase } from '@/services/supabase';

export default function PollResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);

  const { pollTitle, gameResults, hasVoted, loading, error } = usePollResults(id as string | undefined);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  if (loading) return <LoadingState />;

  if (!hasVoted) {
    return (
      <ErrorState
        message="You need to vote in the poll before viewing the results."
        onRetry={() => router.back()}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          router.replace({ pathname: '/poll/[id]', params: { id: id as string } });
        }}
      />
    );
  }

  // Sort games by total positive votes (heart votes count double)
  const sortedResults = [...gameResults].sort((a, b) => {
    const aScore = (a.double_thumbs_up * 2) + a.thumbs_up - a.thumbs_down;
    const bScore = (b.double_thumbs_up * 2) + b.thumbs_up - b.thumbs_down;
    return bScore - aScore;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Poll Results</Text>
        <Text style={styles.subtitle}>{pollTitle}</Text>
      </View>

      {!user && (
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>
            Want to create your own polls?{' '}
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
        {sortedResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No votes have been cast yet.</Text>
          </View>
        ) : (
          sortedResults.map((game) => (
            <GameResultCard key={game.id} game={game} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    backgroundColor: '#1a2b5f',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  signUpContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
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
});