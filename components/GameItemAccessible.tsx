import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Check, X, Loader2 } from 'lucide-react-native';
import { accessibilityConfigs } from '@/hooks/useAccessibility';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';
import { Game } from '@/types/game';

interface GameItemAccessibleProps {
  game: Game;
  isSelected: boolean;
  onToggle: () => void;
  isDisabled?: boolean;
  isUpdating?: boolean;
}

export const GameItemAccessible: React.FC<GameItemAccessibleProps> = ({
  game,
  isSelected,
  onToggle,
  isDisabled = false,
  isUpdating = false,
}) => {
  const { announceForAccessibility } = useAccessibilityContext();

  const handleToggle = () => {
    onToggle();

    // Announce the action for screen readers
    const action = isSelected ? 'removed from selection' : 'added to selection';
    announceForAccessibility(`${game.name} ${action}`);
  };

  const playerCountText = game.max_players > 0
    ? `${game.min_players}-${game.max_players} players`
    : 'N/A players';

  const playTimeText = game.playing_time
    ? `${game.playing_time} min`
    : 'Unknown time';

  const accessibilityConfig = accessibilityConfigs.gameCard(
    game.name,
    playerCountText,
    playTimeText
  );

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selected,
        isDisabled && styles.disabled,
      ]}
      onPress={handleToggle}
      disabled={isDisabled || isUpdating}
      accessibilityLabel={accessibilityConfig.label}
      accessibilityHint={accessibilityConfig.hint}
      accessibilityRole={accessibilityConfig.role}
      accessibilityState={{
        selected: isSelected,
        disabled: isDisabled || isUpdating,
      }}
    >
      <Image
        source={{
          uri: game.thumbnail || 'https://via.placeholder.com/60?text=No+Image'
        }}
        style={styles.image}
        accessibilityLabel={`${game.name} game cover`}
        accessibilityRole="image"
      />

      <View style={styles.content}>
        <Text style={[styles.title, isDisabled && styles.disabledText]}>
          {game.name}
        </Text>
        <Text style={[styles.details, isDisabled && styles.disabledText]}>
          {playerCountText} • {playTimeText}
        </Text>
      </View>

      <View style={styles.actions}>
        {isUpdating ? (
          <Loader2 size={16} color="#666666" />
        ) : (
          <View style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
            isDisabled && styles.checkboxDisabled,
          ]}>
            {isSelected && (
              <Check size={14} color="#ffffff" />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  selected: {
    backgroundColor: '#fff5ef',
    borderColor: '#ff9654',
  },
  disabled: {
    opacity: 0.7,
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  details: {
    fontSize: 13,
    color: '#666666',
  },
  disabledText: {
    color: '#999999',
  },
  actions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e1e5ea',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#ff9654',
    borderColor: '#ff9654',
  },
  checkboxDisabled: {
    backgroundColor: '#e1e5ea',
    borderColor: '#e1e5ea',
  },
});
