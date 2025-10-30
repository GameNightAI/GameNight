import { useCallback, useMemo, useState } from 'react';
import { Game } from '@/types/game';

// ============================================================================
// Filter Option Constants
// ============================================================================

export interface FilterOption {
  value: any;
  label: string;
  min?: number;
  max?: number;
}

// Player count options: 1-14 players + 15+
export const playerOptions: FilterOption[] = Array.from({ length: 14 }, (_, i) => String(i + 1))
  .concat(['15+'])
  .map(value => ({
    value: value === '15+' ? 15 : parseInt(value),
    label: value
  }));

// Play time options for minimum dropdown (includes 0)
export const minTimeOptions: FilterOption[] = [
  { value: 0, label: '0 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '120+ min' },
];

// Play time options for maximum dropdown (excludes 0)
export const maxTimeOptions: FilterOption[] = [
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '120+ min' },
];

// Legacy timeOptions for backwards compatibility (will be removed)
export const timeOptions: FilterOption[] = [
  { value: 1, min: 1, max: 30, label: '30 min or less' },
  { value: 31, min: 31, max: 60, label: '31-60 min' },
  { value: 61, min: 61, max: 90, label: '61-90 min' },
  { value: 91, min: 91, max: 120, label: '91-120 min' },
  { value: 121, min: 121, max: 999999999, label: 'More than 120 min' },
];

// Age range options with min/max ranges
export const ageOptions: FilterOption[] = [
  // { value: 1, min: 1, max: 5, label: '5 and under' },
  // { value: 6, min: 6, max: 7, label: '6-7' },
  // { value: 8, min: 8, max: 9, label: '8-9' },
  // { value: 10, min: 10, max: 11, label: '10-11' },
  // { value: 12, min: 12, max: 13, label: '12-13' },
  //{ value: 14, min: 14, max: 15, label: '14-15' },
  //{ value: 16, min: 16, max: 999, label: '16 and up' },
  { value: 1, min: 1, max: 5, label: '5 and under' },
  { value: 6, min: 6, max: 8, label: '6-8' },
  { value: 9, min: 9, max: 12, label: '9-12' },
  { value: 13, min: 13, max: 15, label: '13-15' },
  { value: 16, min: 16, max: 999, label: '16 and up' },
];

// Game type options
export const typeOptions: FilterOption[] = ['Competitive', 'Cooperative', 'Team-based']
  .map(value => ({ value, label: value }));

// Complexity options with numeric values
export const complexityOptions: FilterOption[] = ['Light', 'Medium Light', 'Medium', 'Medium Heavy', 'Heavy']
  .map((label, index) => ({ value: index + 1, label }));

// ============================================================================
// Core Types
// ============================================================================

export type NumericRange = {
  min?: number | null;
  max?: number | null;
};

export interface FilterState {
  playerCount?: NumericRange;
  playTime?: NumericRange;
  minAge?: NumericRange;
  complexity?: NumericRange;
  gameType?: Array<'Competitive' | 'Cooperative' | 'Team-based'>;
}

// ============================================================================
// Filter Logic
// ============================================================================

/**
 * Helper: Check if a game supports a specific player count
 * Handles expansion player counts with proper null handling
 */
function gameSupportsPlayerCount(game: Game, playerCount: number): boolean {
  // Calculate effective min/max players considering expansions
  // Critical: Treat null min_exp_players as Infinity (prevents null from being treated as minimum)
  const gameMinPlayers = Math.min(game.min_players || game.min_exp_players || 0, game.min_exp_players || Infinity);

  // Max players: null naturally handled (null < any positive number, so Math.max works correctly)
  const gameMaxPlayers = Math.max(game.max_players || 0, game.max_exp_players || 0);

  // Special case: playerCount === 15 represents "15+" option
  // Include any game that can support 15 or more players, regardless of minimum
  return (gameMinPlayers <= playerCount || playerCount === 15) && playerCount <= gameMaxPlayers;
}

/**
 * Helper: Check if game's player range intersects with filter's player range
 */
function playerRangesIntersect(game: Game, filterMin: number | null | undefined, filterMax: number | null | undefined): boolean {
  // If no filter range specified, include all games
  if (filterMin == null && filterMax == null) return true;

  // Calculate game's effective player range
  const gameMinPlayers = Math.min(game.min_players || 0, game.min_exp_players || Infinity);
  const gameMaxPlayers = Math.max(game.max_players || 0, game.max_exp_players || 0);

  // If only filterMax specified, check if any count in range [filterMax, filterMax] works
  if (filterMin == null && filterMax != null) {
    return gameSupportsPlayerCount(game, filterMax);
  }

  // If only filterMin specified, include games that can support at least filterMin players
  if (filterMin != null && filterMax == null) {
    // Unknown max (0/null) → treat as unbounded; include if game's min <= filterMin
    if (gameMaxPlayers <= 0) {
      return gameMinPlayers <= filterMin;
    }
    return gameMaxPlayers >= filterMin;
  }

  // Both specified: check if ranges intersect
  // If filterMax is 15 (representing 15+), treat as unbounded upper range and only enforce minimum
  if (filterMin != null && filterMax === 15) {
    return gameMaxPlayers >= filterMin;
  }

  // Both specified with finite Max; handle unknown game max (0/null) as unbounded
  if (filterMin != null && filterMax != null && filterMax !== 15) {
    if (gameMaxPlayers <= 0) {
      // No max info: include if game's minimum is within user's upper bound
      return gameMinPlayers <= filterMax;
    }
    // Standard overlap
    return gameMaxPlayers >= filterMin && gameMinPlayers <= filterMax;
  }

  // Standard overlap: Game range [gameMin, gameMax] intersects with filter range [filterMin, filterMax]
  return gameMaxPlayers >= (filterMin ?? 0) && gameMinPlayers <= (filterMax ?? Infinity);
}


/**
 * Helper: Get game's play time range
 * Uses minPlaytime/maxPlaytime if available, falls back to playing_time as both min and max
 */
function getGamePlayTimeRange(game: Game): { min: number; max: number } | null {
  // Primary: Use minPlaytime and maxPlaytime for range
  if (typeof game.minPlaytime === 'number' && typeof game.maxPlaytime === 'number' &&
    game.minPlaytime > 0 && game.maxPlaytime > 0) {
    return { min: game.minPlaytime, max: game.maxPlaytime };
  }

  // Fallback: Use playing_time as both min and max
  if (typeof game.playing_time === 'number' && game.playing_time > 0) {
    return { min: game.playing_time, max: game.playing_time };
  }

  return null; // No time data available
}

/**
 * Helper: Check if game's play time range overlaps with filter range
 * Uses inclusive overlap logic: ranges overlap if gameMax >= userMin AND gameMin <= userMax
 */
function gameMatchesPlayTime(game: Game, filterMin: number | null | undefined, filterMax: number | null | undefined): boolean {
  // If no filter range specified, include all games
  if (filterMin == null && filterMax == null) return true;

  const gameRange = getGamePlayTimeRange(game);
  if (gameRange == null) return false; // No time data, exclude

  // Handle 120+ case - treat as any game with max >= 120
  const userMin = filterMin ?? 0;
  const userMax = filterMax === 120 ? Infinity : (filterMax ?? Infinity);

  // Inclusive range overlap logic: ranges overlap if gameMax >= userMin AND gameMin <= userMax
  return gameRange.max >= userMin && gameRange.min <= userMax;
}

/**
 * Helper: Extract actual min value from stored option.value for age
 */
function extractAgeMin(storedValue: number | null | undefined): number | null | undefined {
  if (storedValue == null) return storedValue;
  const option = ageOptions.find(opt => opt.value === storedValue);
  return option?.min ?? storedValue;
}

/**
 * Helper: Extract actual max value from stored option.value for age
 */
function extractAgeMax(storedValue: number | null | undefined): number | null | undefined {
  if (storedValue == null) return storedValue;
  const option = ageOptions.find(opt => opt.value === storedValue);
  return option?.max ?? storedValue;
}

/**
 * Helper: Check if game's age falls within filter range
 * Note: Filter min/max are option.value, we extract the actual min/max ranges
 */
function gameMatchesAge(game: Game, filterMin: number | null | undefined, filterMax: number | null | undefined): boolean {
  // If no filter range specified, include all games
  if (filterMin == null && filterMax == null) return true;

  const gameAge = game.minAge;
  if (typeof gameAge !== 'number') return false; // No age data, exclude

  // Extract actual min/max from stored option.value
  const actualMin = extractAgeMin(filterMin);
  const actualMax = extractAgeMax(filterMax);

  // Check if game age falls within filter range
  const min = actualMin ?? 0;
  const max = actualMax ?? Infinity;
  return gameAge >= min && gameAge <= max;
}

/**
 * Helper: Check if game's complexity falls within filter range
 * Note: Filter min/max values come from complexityOptions' value field (1-5)
 * Games with null complexity_tier are excluded (filtered out)
 */
function gameMatchesComplexity(game: Game, filterMin: number | null | undefined, filterMax: number | null | undefined): boolean {
  // If no filter range specified, include all games
  if (filterMin == null && filterMax == null) return true;

  const gameComplexity = game.complexity_tier;
  if (gameComplexity == null) return false; // Exclude games with null complexity

  // Check if game complexity falls within filter range
  const min = filterMin ?? 1;  // Default to lightest complexity (1)
  const max = filterMax ?? 5;  // Default to heaviest complexity (5)
  return gameComplexity >= min && gameComplexity <= max;
}

/**
 * Helper: Check if game matches any of the selected game types
 * Uses OR logic - game passes if it matches ANY of the selected types
 */
function gameMatchesGameType(game: Game, selectedTypes: Array<'Competitive' | 'Cooperative' | 'Team-based'>): boolean {
  // If no game types selected, include all games
  if (selectedTypes.length === 0) return true;

  // Check if game matches any of the selected types
  return selectedTypes.some(type => {
    switch (type) {
      case 'Competitive':
        return !game.is_cooperative; // Competitive = not cooperative
      case 'Cooperative':
        return game.is_cooperative === true;
      case 'Team-based':
        return game.is_teambased === true;
      default:
        return false;
    }
  });
}

/**
 * Main filter function - filters games based on FilterState
 * Implements all filters: Player Count, Play Time, Age, Complexity, Game Type
 */
export function filterGames(games: Game[], filters: FilterState): Game[] {
  return games.filter((game) => {
    // ========== Player Count Filter ==========
    if (filters.playerCount && (filters.playerCount.min != null || filters.playerCount.max != null)) {
      if (!playerRangesIntersect(game, filters.playerCount.min, filters.playerCount.max)) {
        return false;
      }
    }

    // ========== Play Time Filter ==========
    if (filters.playTime && (filters.playTime.min != null || filters.playTime.max != null)) {
      if (!gameMatchesPlayTime(game, filters.playTime.min, filters.playTime.max)) {
        return false;
      }
    }

    // ========== Age Filter ==========
    if (filters.minAge && (filters.minAge.min != null || filters.minAge.max != null)) {
      if (!gameMatchesAge(game, filters.minAge.min, filters.minAge.max)) {
        return false;
      }
    }

    // ========== Complexity Filter ==========
    if (filters.complexity && (filters.complexity.min != null || filters.complexity.max != null)) {
      if (!gameMatchesComplexity(game, filters.complexity.min, filters.complexity.max)) {
        return false;
      }
    }

    // ========== Game Type Filter ==========
    if (filters.gameType && filters.gameType.length > 0) {
      if (!gameMatchesGameType(game, filters.gameType)) {
        return false;
      }
    }

    return true;
  });
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Custom hook for managing game filter state and operations
 * Provides a complete filtering interface for components
 */
export function useGameFilters(initial?: Partial<FilterState>) {
  const [filters, setFilters] = useState<FilterState>({
    playerCount: initial?.playerCount || undefined,
    playTime: initial?.playTime || undefined,
    minAge: initial?.minAge || undefined,
    complexity: initial?.complexity || undefined,
    gameType: initial?.gameType ?? [],
  });

  // Check if any filters are currently active
  const isFiltered = useMemo(() => {
    return (
      (filters.playerCount && (filters.playerCount.min != null || filters.playerCount.max != null)) ||
      (filters.playTime && (filters.playTime.min != null || filters.playTime.max != null)) ||
      (filters.minAge && (filters.minAge.min != null || filters.minAge.max != null)) ||
      (filters.complexity && (filters.complexity.min != null || filters.complexity.max != null)) ||
      (filters.gameType && filters.gameType.length > 0)
    );
  }, [filters]);

  // Update a specific filter property
  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters to default state
  const clearFilters = useCallback(() => {
    setFilters({ gameType: [] });
  }, []);

  // Apply current filters to a list of games
  const applyFilters = useCallback((games: Game[]) => {
    return filterGames(games, filters);
  }, [filters]);

  return { filters, setFilters, updateFilter, clearFilters, isFiltered, applyFilters } as const;
}
