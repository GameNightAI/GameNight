import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image } from 'react-native';
import { Plus, Shuffle, X } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  SlideInDown,
  SlideOutUp,
  useSharedValue,
  runOnJS
} from 'react-native-reanimated';

export default function FirstPlayerScreen() {
  const [players, setPlayers] = useState<string[]>([]);
  const [newPlayer, setNewPlayer] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const opacity = useSharedValue(0);

  const addPlayer = () => {
    if (newPlayer.trim() && !players.includes(newPlayer.trim())) {
      setPlayers([...players, newPlayer.trim()]);
      setNewPlayer('');
    }
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
    setSelectedPlayer(null);
  };

  const updateCountdown = useCallback((value: number | null) => {
    setCountdown(value);
  }, []);

  const finishSelection = useCallback((finalPlayer: string) => {
    setIsSelecting(false);
    setSelectedPlayer(finalPlayer);
    setCountdown(null);
  }, []);

  const selectRandomPlayer = async () => {
    if (players.length > 0) {
      setIsSelecting(true);
      setSelectedPlayer(null);

      const finalIndex = Math.floor(Math.random() * players.length);
      const finalPlayer = players[finalIndex];

      // Start countdown with faster timing (700ms per number)
      for (let i = 3; i > 0; i--) {
        runOnJS(updateCountdown)(i);
        await new Promise(resolve => setTimeout(resolve, 700));
      }

      // Show the reveal animation slightly faster
      runOnJS(updateCountdown)(null);
      setTimeout(() => {
        runOnJS(finishSelection)(finalPlayer);
      }, 300);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://images.pexels.com/photos/278918/pexels-photo-278918.jpeg' }}
        style={styles.backgroundImage}
      />
      <View style={styles.overlay} />

      {countdown !== null && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={styles.countdownOverlay}
        >
          <Animated.Text
            entering={ZoomIn.duration(200)}
            exiting={ZoomOut.duration(200)}
            style={styles.countdownText}
          >
            {countdown}
          </Animated.Text>
        </Animated.View>
      )}

      {selectedPlayer && !isSelecting && (
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.revealOverlay}
        >
          <Animated.View
            entering={SlideInDown.duration(800).springify()}
            exiting={SlideOutUp.duration(300)}
            style={styles.revealCard}
          >
            <Text style={styles.revealText}>
              {selectedPlayer}
            </Text>
            <Text style={styles.revealSubtext}>
              goes first!
            </Text>
            <TouchableOpacity
              style={styles.closeRevealButton}
              onPress={() => setSelectedPlayer(null)}
            >
              <Text style={styles.closeRevealText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>Who's Going First?</Text>
        <Text style={styles.subtitle}>Add players and randomly select who starts</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newPlayer}
            onChangeText={setNewPlayer}
            placeholder="Enter player name"
            placeholderTextColor="#666666"
            onSubmitEditing={addPlayer}
          />
          <TouchableOpacity
            style={[styles.addButton, !newPlayer.trim() && styles.addButtonDisabled]}
            onPress={() => addPlayer()}
            disabled={!newPlayer.trim()}
          >
            <Plus color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={players}
          keyExtractor={(_, index) => index.toString()}
          style={styles.list}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={styles.playerItem}
            >
              <Text style={styles.playerName}>{item}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePlayer(index)}
              >
                <X size={16} color="#e74c3c" />
              </TouchableOpacity>
            </Animated.View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Add some players to get started
            </Text>
          }
        />

        {players.length > 1 && (
          <TouchableOpacity
            style={[styles.shuffleButton, isSelecting && styles.shuffleButtonDisabled]}
            onPress={selectRandomPlayer}
            disabled={isSelecting}
          >
            <Shuffle size={24} color="#fff" />
            <Text style={styles.shuffleText}>
              {isSelecting ? 'Selecting...' : 'Select Random Player'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: 200,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(26, 43, 95, 0.85)',
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 20,
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addButton: {
    width: 56,
    height: 56,
    backgroundColor: '#ff9654',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  list: {
    flex: 1,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  playerName: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333333',
  },
  removeButton: {
    width: 32,
    height: 32,
    backgroundColor: '#fff0f0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    marginTop: 32,
  },
  shuffleButton: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  shuffleButtonDisabled: {
    opacity: 0.7,
  },
  shuffleText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 8,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 43, 95, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  countdownText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 120,
    color: '#ffffff',
  },
  revealOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 43, 95, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  revealCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  revealText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 8,
  },
  revealSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 20,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  closeRevealButton: {
    backgroundColor: '#ff9654',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  closeRevealText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
});