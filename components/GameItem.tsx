import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Users, Clock, X } from 'lucide-react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { Game } from '@/types/game';

interface GameItemProps {
  game: Game;
  onDelete: (id: number) => void;
}

function decodeHTML(html: string): string {
  var txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

export const GameItem: React.FC<GameItemProps> = ({ game, onDelete }) => {
  return (
    <Animated.View
      style={styles.container}
      exiting={FadeOut.duration(200)}
    >
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(game.id)}
      >
        <X size={16} color="#e74c3c" />
      </TouchableOpacity>

      <Image
        source={{ uri: game.thumbnail }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {decodeHTML(game.name)}
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Users size={16} color="#666666" />
            <Text style={styles.infoText}>
              {game.max_players ?
                game.min_players + (game.min_players === game.max_players ? '' : '-' + game.max_players) + ' player' + (game.max_players === 1 ? '' : 's')
                : 'N/A'}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Clock size={16} color="#666666" />
            <Text style={styles.infoText}>
              {game.maxPlaytime === 0 ? 'N/A'
                : game.minPlaytime + (game.minPlaytime === game.maxPlaytime ? '' : '-' + game.maxPlaytime) + ' min'}
            </Text>
          </View>
        </View>

        {game.yearPublished && (
          <Text style={styles.yearText}>
            {game.yearPublished > 0 ? game.yearPublished : -game.yearPublished + ' BCE'}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: '#fff0f0',
    borderRadius: 12,
    padding: 4,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
    paddingRight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#666666',
    marginLeft: 4,
  },
  yearText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#8d8d8d',
    marginTop: 4,
  },
});
