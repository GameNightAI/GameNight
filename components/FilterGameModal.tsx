import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { Game } from '@/types/game';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';
import { FilterField } from './DropdownFilterMenu';

interface FilterOption {
  value: any;
  label: string;
  min?: number;
  max?: number;
}

interface FilterConfig {
  key: string;
  label: string;
  placeholder: string;
  options: FilterOption[];
  value: FilterOption[];
  onChange: (value: FilterOption[]) => void;
}

interface FilterGameModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilters: () => void;
  title?: string;
  description?: string;
  applyButtonText?: string;
  filterConfigs: FilterConfig[];
}

export const FilterGameModal: React.FC<FilterGameModalProps> = ({
  isVisible,
  onClose,
  onApplyFilters,
  title = "Filter Your Collection",
  description = "All filters (optional)",
  applyButtonText = "Apply Filters",
  filterConfigs,
}) => {
  const { colors, typography, touchTargets } = useTheme();
  const { announceForAccessibility } = useAccessibility();



  const clearAllFilters = () => {
    filterConfigs.forEach(config => {
      config.onChange([]);
    });
    announceForAccessibility('All filters cleared');
  }

  const handleApplyFilters = () => {
    announceForAccessibility('Filters applied successfully');
    onApplyFilters();
  };



  const styles = useMemo(() => getStyles(colors, typography), [colors, typography]);

  if (!isVisible) return null;

  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityHint="Closes the filter modal"
          hitSlop={touchTargets.small}
        >
          <X size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        {description}
      </Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
      >
        {filterConfigs.map((config) => {
          const isPlayerCount = config.key === 'playerCount';
          const isAge = config.key === 'age';
          const isPlayTime = config.key === 'playTime';

          return (
            <View key={config.key} style={styles.filterSection}>
              <FilterField
                type={isPlayerCount || isAge ? 'number' : 'dropdown'}
                range={isPlayerCount || isAge}
                label={config.label}
                placeholder={config.placeholder}
                options={config.options}
                value={config.value}
                onChange={(value) => config.onChange(Array.from(value || []))}
                maxPlaceholder={
                  isPlayerCount ? 'max players' : isAge ? 'max age limit' : undefined
                }
                minPlaceholder={
                  isPlayerCount ? 'min players' : isAge ? 'min age limit' : undefined
                }
                clamp={
                  isPlayerCount ? { min: 0, max: 120 }
                    : isAge ? { min: 0, max: 100 }
                      : undefined
                }
              />
            </View>
          );
        })}

        {/* Clear All Button */}
        <TouchableOpacity
          style={styles.clearAllButton}
          onPress={clearAllFilters}
          accessibilityLabel="Clear all filters"
          accessibilityHint="Removes all applied filters"
          hitSlop={touchTargets.small}
        >
          <Text style={styles.clearAllButtonText}>Clear All Filters</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={styles.applyButton}
        onPress={handleApplyFilters}
        accessibilityLabel="Apply filters"
        accessibilityHint="Applies the selected filters to the collection"
        hitSlop={touchTargets.small}
      >
        <Text style={styles.applyButtonText}>{applyButtonText}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.overlay}>
      <View
        style={styles.dialog}
      >
        {content}
      </View>
    </View>
  );
};

export const filterGames = (
  games: Game[],
  playerCount: FilterOption[],
  playTime: FilterOption[],
  age: FilterOption[],
  gameType: FilterOption[],
  complexity: FilterOption[]
) => {
  return games.filter(game => {
    let is_match = true;

    if (playerCount.length) {
      // Support either dropdown options OR a single range object with {min?, max?}
      const hasRange = playerCount.length === 1 && playerCount[0].value === 'range';
      if (hasRange) {
        const r = playerCount[0];
        const minVal = r.min != null ? r.min : undefined;
        const maxVal = r.max != null ? r.max : undefined;
        const gameMin = Math.min(game.min_players, game.min_exp_players || Infinity);
        const gameMax = Math.max(game.max_players, game.max_exp_players);
        // If only max is provided: include 0 and all up to max
        if (maxVal != null && minVal == null) {
          is_match &&= (gameMin <= maxVal) || gameMin === 0;
        } else {
          // Intersect [min,max] with [gameMin,gameMax], inclusive
          const lo = minVal != null ? minVal : -Infinity;
          const hi = maxVal != null ? maxVal : Infinity;
          is_match &&= !(gameMax < lo || gameMin > hi);
        }
      } else {
        // Dropdown chips behavior (legacy): exact player count in [min,max]
        is_match &&= playerCount.some(({ value }) => (
          (Math.min(game.min_players, game.min_exp_players || Infinity) <= value || value === 15)
          && value <= (Math.max(game.max_players, game.max_exp_players))
        ));
      }
    }

    if (playTime.length) {
      is_match &&= playTime.some((t: FilterOption) => {
        const time = game.playing_time || game.maxPlaytime || game.minPlaytime;
        // Perhaps this should incorporate game.minplaytime and game.maxplaytime more sensibly
        return (
          t.min! <= time
          && time <= t.max!
        );
      });
    }

    if (age.length) {
      const hasRange = age.length === 1 && age[0].value === 'range';
      if (hasRange) {
        const r = age[0];
        const minVal = r.min != null ? r.min : undefined;
        const maxVal = r.max != null ? r.max : undefined;
        const v = game.minAge;
        const lo = minVal != null ? minVal : -Infinity;
        const hi = maxVal != null ? maxVal : Infinity;
        is_match &&= (lo <= v && v <= hi);
      } else {
        is_match &&= age.some((a: FilterOption) => (
          a.min! <= game.minAge
          && game.minAge <= a.max!
        ));
      }
    }

    if (gameType.length) {
      is_match &&= gameType.some((t: FilterOption) => {
        switch (t.value) {
          case 'Competitive':
            return !game.is_cooperative
          case 'Cooperative':
            return game.is_cooperative
          case 'Team-based':
            return game.is_teambased
        }
      });
    }

    if (complexity.length) {
      is_match &&= complexity.some((c: FilterOption) => (
        game.complexity_tier === c.value
      ));
    }

    return is_match;
  });
};

const getStyles = (colors: any, typography: any) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.tints.neutral,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    padding: 20,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: 8,
    width: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    minHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,

  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.callout,
    color: colors.text,
  },
  description: {
    fontFamily: typography.getFontFamily('normal'),
    fontSize: typography.fontSize.caption1,
    color: colors.textMuted,
    marginBottom: 8,
    paddingTop: 2,
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  scrollViewContent: {
    paddingBottom: 4,
    paddingTop: 2,
  },
  filterSection: {
    marginBottom: 6,
    position: 'relative',
  },
  applyButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 0,
  },
  applyButtonText: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.subheadline,
    color: '#ffffff',
  },
  clearAllButton: {
    backgroundColor: colors.border,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  clearAllButtonText: {
    fontFamily: typography.getFontFamily('semibold'),
    fontSize: typography.fontSize.subheadline,
    color: colors.text,
  },
});
