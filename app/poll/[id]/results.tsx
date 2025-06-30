import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { usePollResults } from '@/hooks/usePollResults';
import { GameResultCard } from '@/components/PollGameResultCard';

export default function PollResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const { pollTitle, gameResults, hasVoted, loading, error } = usePollResults(id as string | undefined);

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
          sortedResults.map((game, index) => (
            <View key={game.id} style={styles.gameResultContainer}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <GameResultCard game={game} />
            </View>
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
  gameResultContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: '#ff9654',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rankText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 12,
    color: '#ffffff',
  },
});