import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { VOTING_OPTIONS, ICON_MAP, getIconColor } from './votingOptions';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';
import { decode } from 'html-entities';

interface GameVoteSummary {
  name: string;
  [key: string]: any; // allow dynamic vote type keys
}

interface PollScreenCardProps {
  games: GameVoteSummary[];
  onViewDetails: () => void;
}

export function PollScreenCard({ games, onViewDetails }: PollScreenCardProps) {
  const { colors, typography } = useTheme();
  const { announceForAccessibility } = useAccessibility();
  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);
  // Calculate scores and sort
  const scoredResults = games.map(game => ({
    ...game,
    score: VOTING_OPTIONS.reduce((sum, voteType) => {
      const voteCount = game[voteType.value] || 0;
      return sum + voteCount * voteType.score;
    }, 0)
  }));
  scoredResults.sort((a, b) => b.score - a.score);

  // Assign ranks, handling ties
  let lastScore: number | null = null;
  let lastRank = 0;
  let tieGroup: number[] = [];
  const tempRanked: any[] = [];
  scoredResults.forEach((game, idx) => {
    if (lastScore === null || game.score !== lastScore) {
      if (tieGroup.length > 1) {
        tieGroup.forEach(i => tempRanked[i].tie = true);
      }
      tieGroup = [idx];
      lastRank = idx + 1;
    } else {
      tieGroup.push(idx);
    }
    tempRanked.push({ ...game, rank: lastRank, tie: false });
    lastScore = game.score;
  });
  if (tieGroup.length > 1) {
    tieGroup.forEach(i => tempRanked[i].tie = true);
  }
  const rankedResults = tempRanked;

  return (
    <View style={styles.card}>
      <Text style={styles.header}>Games & Votes</Text>
      {/* Header row for vote types */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }} />
        {VOTING_OPTIONS.map(option => {
          const IconComponent = ICON_MAP[option.icon];
          return (
            <View style={styles.voteCol} key={option.value}>
              <IconComponent color={getIconColor(option.value, true)} />
            </View>
          );
        })}
      </View>
      {/* Labels row */}
      <View style={styles.labelsRow}>
        <View style={{ flex: 1 }} />
        {VOTING_OPTIONS.map(option => (
          <View style={styles.voteCol} key={option.value}>
            <Text style={styles.voteTypeLabel}>{option.label}</Text>
          </View>
        ))}
      </View>
      {rankedResults.map((game, idx) => {
        // Alternate row shading for desktop/web
        const rowStyle = [
          styles.gameRowColumns,
          styles.baseRow,
          idx % 2 === 0 ? styles.altRow : null,
          Platform.OS === 'web' ? styles.gameRowDesktop : null,
        ];
        return (
          <View key={idx} style={rowStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={styles.rankNumber}>{game.rank}.</Text>
              <Text style={styles.gameName}>{decode(game.name)}</Text>
              {game.tie && (
                <Text style={styles.tieLabel}>(tie)</Text>
              )}
            </View>
            {VOTING_OPTIONS.map(option => (
              <View style={styles.voteCol} key={option.value}>
                <Text style={styles.voteValue}>{game[option.value] || 0}</Text>
              </View>
            ))}
          </View>
        );
      })}
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => {
          onViewDetails();
          announceForAccessibility('Opening detailed poll results');
        }}
        accessibilityLabel="View detailed poll results"
        accessibilityRole="button"
        accessibilityHint="Opens the detailed results view"
      >
        <Text style={styles.detailsButtonText}>View Detailed Results</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: any, typography: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? { maxWidth: 420, minWidth: 320, width: '100%', alignSelf: 'center' }
      : {}),
  },
  header: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.callout,
    color: colors.primary,
    marginBottom: 8,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gameName: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.caption2, // Font for game name in dropdown on poll screen
    color: colors.text,
    flex: 1,
  },
  detailsButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
  },
  detailsButtonText: {
    color: '#ffffff',
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.subheadline,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 2 : 4,
    paddingLeft: 0,
    paddingRight: 0,
    minHeight: Platform.OS === 'web' ? 28 : undefined,
    paddingVertical: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 2 : 4,
    paddingLeft: 0,
    paddingRight: 0,
    minHeight: Platform.OS === 'web' ? 20 : undefined,
    paddingVertical: 2,
  },
  gameRowColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 2 : 6,
    paddingVertical: Platform.OS === 'web' ? 4 : 0,
    paddingHorizontal: Platform.OS === 'web' ? 2 : 0,
  },
  baseRow: {
    backgroundColor: colors.card,
    borderRadius: 6,
  },
  gameRowDesktop: {
    minHeight: 32,
  },
  altRow: {
    backgroundColor: colors.tints.neutral,
    borderRadius: 6,
  },
  voteCol: {
    width: Platform.OS === 'web' ? 32 : 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteIcon: {
    fontSize: 16,
    fontFamily: typography.getFontFamily('semibold'),
    color: colors.text,
  },
  voteValue: {
    fontSize: typography.fontSize.subheadline,
    fontFamily: typography.getFontFamily('normal'),
    color: colors.text,
  },
  voteTypeLabel: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.caption2,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  rankNumber: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.subheadline,
    color: colors.textMuted,
    marginRight: 8,
    minWidth: 22,
    textAlign: 'right',
  },
  tieLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSize.caption2,
    marginLeft: 4,
  },
});
