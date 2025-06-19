import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Poll Results: {pollTitle}</Text>
      {gameResults.map((game) => (
        <GameResultCard key={game.id} game={game} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  heading: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
  },
});