import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ScrollView, Alert } from 'react-native';
import { Plus, Minus, Trophy, Users, RotateCcw, X, Pen, Check } from 'lucide-react-native';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';

interface Player {
  id: string;
  name: string;
  scores: number[];
  total: number;
}

interface Round {
  roundNumber: number;
  scores: { [playerId: string]: number };
}

type GamePhase = 'setup' | 'playing' | 'finished';

export default function ScoreTrackerScreen() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [currentRound, setCurrentRound] = useState(1);
  const [roundScores, setRoundScores] = useState<{ [playerId: string]: string }>({});
  const [rounds, setRounds] = useState<Round[]>([]);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState('');
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  const addPlayer = useCallback(() => {
    if (newPlayerName.trim() && !players.some(p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase())) {
      const newPlayer: Player = {
        id: Date.now().toString(),
        name: newPlayerName.trim(),
        scores: [],
        total: 0,
      };
      setPlayers(prev => [...prev, newPlayer]);
      setNewPlayerName('');
    }
  }, [newPlayerName, players]);

  const removePlayer = useCallback((playerId: string) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
  }, []);

  const startGame = useCallback(() => {
    if (players.length >= 2) {
      setGamePhase('playing');
      // Initialize round scores for all players
      const initialScores: { [playerId: string]: string } = {};
      players.forEach(player => {
        initialScores[player.id] = '';
      });
      setRoundScores(initialScores);
    }
  }, [players]);

  const updateRoundScore = useCallback((playerId: string, score: string) => {
    // Allow negative numbers by accepting minus sign
    if (score === '' || score === '-' || /^-?\d*$/.test(score)) {
      setRoundScores(prev => ({
        ...prev,
        [playerId]: score,
      }));
    }
  }, []);

  const submitRound = useCallback(() => {
    // Validate all scores are entered
    const allScoresEntered = players.every(player => 
      roundScores[player.id] !== undefined && 
      roundScores[player.id].trim() !== '' &&
      roundScores[player.id] !== '-'
    );

    if (!allScoresEntered) {
      Alert.alert('Incomplete Scores', 'Please enter scores for all players before continuing.');
      return;
    }

    // Convert scores to numbers and update players
    const roundData: Round = {
      roundNumber: currentRound,
      scores: {},
    };

    const updatedPlayers = players.map(player => {
      const score = parseInt(roundScores[player.id]) || 0;
      roundData.scores[player.id] = score;
      
      return {
        ...player,
        scores: [...player.scores, score],
        total: player.total + score, // This will handle negative numbers correctly
      };
    });

    setPlayers(updatedPlayers);
    setRounds(prev => [...prev, roundData]);
    setCurrentRound(prev => prev + 1);

    // Reset round scores for next round
    const resetScores: { [playerId: string]: string } = {};
    players.forEach(player => {
      resetScores[player.id] = '';
    });
    setRoundScores(resetScores);
  }, [players, roundScores, currentRound]);

  const finishGame = useCallback(() => {
    setGamePhase('finished');
  }, []);

  const resetGame = useCallback(() => {
    setConfirmationVisible(false)
    setGamePhase('setup');
    setPlayers([]);
    setNewPlayerName('');
    setCurrentRound(1);
    setRoundScores({});
    setRounds([]);
    setEditingPlayerId(null);
    setEditingPlayerName('');
  }, []);

  const startEditingPlayer = useCallback((player: Player) => {
    setEditingPlayerId(player.id);
    setEditingPlayerName(player.name);
  }, []);

  const savePlayerName = useCallback(() => {
    if (editingPlayerName.trim() && editingPlayerId) {
      setPlayers(prev => prev.map(player => 
        player.id === editingPlayerId 
          ? { ...player, name: editingPlayerName.trim() }
          : player
      ));
      setEditingPlayerId(null);
      setEditingPlayerName('');
    }
  }, [editingPlayerName, editingPlayerId]);

  const cancelEditingPlayer = useCallback(() => {
    setEditingPlayerId(null);
    setEditingPlayerName('');
  }, []);

  // Get sorted players by total score (descending)
  const sortedPlayers = [...players].sort((a, b) => b.total - a.total);

  if (gamePhase === 'setup') {
    return (
      <View style={styles.container}>
        <Image
          source={{ uri: 'https://images.pexels.com/photos/278918/pexels-photo-278918.jpeg' }}
          style={styles.backgroundImage}
        />
        <View style={styles.overlay} />

        <View style={styles.header}>
          <Text style={styles.title}>Score Tracker</Text>
          <Text style={styles.subtitle}>Add players to start tracking scores</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.setupSection}>
            <Text style={styles.sectionTitle}>Add Players</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newPlayerName}
                onChangeText={setNewPlayerName}
                placeholder="Enter player name"
                placeholderTextColor="#666666"
                onSubmitEditing={addPlayer}
                maxLength={20}
              />
              <TouchableOpacity
                style={[styles.addButton, !newPlayerName.trim() && styles.addButtonDisabled]}
                onPress={addPlayer}
                disabled={!newPlayerName.trim()}
              >
                <Plus color="#fff" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.playersList} showsVerticalScrollIndicator={false}>
              {players.map((player, index) => (
                <Animated.View
                  key={player.id}
                  entering={FadeIn.delay(index * 100)}
                  style={styles.playerItem}
                >
                  {editingPlayerId === player.id ? (
                    <View style={styles.editingContainer}>
                      <TextInput
                        style={styles.editInput}
                        value={editingPlayerName}
                        onChangeText={setEditingPlayerName}
                        onSubmitEditing={savePlayerName}
                        autoFocus
                        maxLength={20}
                      />
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={savePlayerName}
                      >
                        <Check size={16} color="#10b981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={cancelEditingPlayer}
                      >
                        <X size={16} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{player.name}</Text>
                      </View>
                      <View style={styles.playerActions}>
                        <TouchableOpacity
                          style={styles.editPlayerButton}
                          onPress={() => startEditingPlayer(player)}
                        >
                          <Pen size={16} color="#ff9654" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removePlayer(player.id)}
                        >
                          <X size={16} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </Animated.View>
              ))}
            </ScrollView>

            {players.length === 0 && (
              <Text style={styles.emptyText}>
                Add at least 2 players to start the game
              </Text>
            )}
          </View>

          {players.length >= 2 && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startGame}
            >
              <Trophy size={24} color="#ffffff" />
              <Text style={styles.startButtonText}>Start Game</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (gamePhase === 'playing') {
    return (
      <View style={styles.container}>
        <View style={styles.gameHeader}>
          <Text style={styles.gameTitle}>Round {currentRound}</Text>
          <Text style={styles.gameSubtitle}>Enter scores for this round</Text>
        </View>

        <ScrollView style={styles.gameContent} showsVerticalScrollIndicator={false}>
          {/* Current Round Score Entry */}
          <View style={styles.roundSection}>
            <Text style={styles.roundTitle}>Round {currentRound} Scores</Text>
            
            {players.map((player, index) => (
              <Animated.View
                key={player.id}
                entering={SlideInRight.delay(index * 100)}
                style={styles.scoreInputRow}
              >
                <View style={styles.playerScoreInfo}>
                  <Text style={styles.scorePlayerName}>{player.name}</Text>
                  <Text style={styles.scorePlayerTotal}>Total: {player.total}</Text>
                </View>
                <TextInput
                  style={styles.scoreInput}
                  value={roundScores[player.id] || ''}
                  onChangeText={(text) => updateRoundScore(player.id, text)}
                  placeholder="0"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
                  maxLength={6}
                />
              </Animated.View>
            ))}

            <View style={styles.roundActions}>
              <TouchableOpacity
                style={styles.submitRoundButton}
                onPress={submitRound}
              >
                <Text style={styles.submitRoundText}>Submit Round</Text>
              </TouchableOpacity>
              
              {rounds.length > 0 && (
                <TouchableOpacity
                  style={styles.finishGameButton}
                  onPress={finishGame}
                >
                  <Text style={styles.finishGameText}>Finish Game</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Score History */}
          {rounds.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Score History</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyScroll}>
                <View style={styles.historyTable}>
                  {/* Header Row */}
                  <View style={styles.historyHeaderRow}>
                    <Text style={styles.historyHeaderCellPlayer}>Player</Text>
                    <Text style={styles.historyHeaderCellTotal}>Total</Text>
                    {/* Show rounds in reverse order (latest first) */}
                    {[...rounds].reverse().map(round => (
                      <Text key={round.roundNumber} style={styles.historyHeaderCell}>
                        R{round.roundNumber}
                      </Text>
                    ))}
                  </View>

                  {/* Player Rows */}
                  {sortedPlayers.map((player, index) => (
                    <View key={player.id} style={[
                      styles.historyPlayerRow,
                      index === 0 && styles.historyLeaderRow
                    ]}>
                      <Text style={[
                        styles.historyPlayerName,
                        index === 0 && styles.historyLeaderText
                      ]}>
                        {player.name}
                        {index === 0 && ' 👑'}
                      </Text>
                      <Text style={[
                        styles.historyTotalCell,
                        index === 0 && styles.historyLeaderText
                      ]}>
                        {player.total}
                      </Text>
                      {/* Show scores in reverse order (latest first) */}
                      {[...player.scores].reverse().map((score, scoreIndex) => (
                        <Text key={scoreIndex} style={[
                          styles.historyScoreCell,
                          index === 0 && styles.historyLeaderText
                        ]}>
                          {score}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Finished game phase
  return (
    <View style={styles.container}>
      <View style={styles.finishedHeader}>
        <Text style={styles.finishedTitle}>Game Complete!</Text>
        <Text style={styles.finishedSubtitle}>Final Scores</Text>
      </View>

      <ScrollView style={styles.finishedContent} showsVerticalScrollIndicator={false}>
        <View style={styles.podiumSection}>
          {sortedPlayers.slice(0, 3).map((player, index) => (
            <Animated.View
              key={player.id}
              entering={FadeIn.delay(index * 200)}
              style={[
                styles.podiumItem,
                index === 0 && styles.podiumFirst,
                index === 1 && styles.podiumSecond,
                index === 2 && styles.podiumThird,
              ]}
            >
              <Text style={styles.podiumPosition}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
              </Text>
              <Text style={styles.podiumName}>{player.name}</Text>
              <Text style={styles.podiumScore}>{player.total}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Complete Results Table */}
        <View style={styles.finalResultsSection}>
          <Text style={styles.finalResultsTitle}>Complete Results</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.finalTable}>
              {/* Header */}
              <View style={styles.finalHeaderRow}>
                <Text style={styles.finalHeaderCell}>Rank</Text>
                <Text style={styles.finalHeaderCellPlayer}>Player</Text>
                <Text style={styles.finalHeaderCellTotal}>Total</Text>
                {/* Show rounds in reverse order (latest first) */}
                {[...rounds].reverse().map(round => (
                  <Text key={round.roundNumber} style={styles.finalHeaderCell}>
                    R{round.roundNumber}
                  </Text>
                ))}
              </View>

              {/* Player Rows */}
              {sortedPlayers.map((player, index) => (
                <View key={player.id} style={styles.finalPlayerRow}>
                  <Text style={styles.finalRankCell}>#{index + 1}</Text>
                  <Text style={styles.finalPlayerNameCell}>{player.name}</Text>
                  <Text style={styles.finalTotalCell}>{player.total}</Text>
                  {/* Show scores in reverse order (latest first) */}
                  {[...player.scores].reverse().map((score, scoreIndex) => (
                    <Text key={scoreIndex} style={styles.finalScoreCell}>
                      {score}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.newGameButton}
        onPress={() => setConfirmationVisible(true)}
      >
        <RotateCcw size={24} color="#ffffff" />
        <Text style={styles.newGameButtonText}>New Game</Text>
      </TouchableOpacity>
      
      <ConfirmationDialog
        isVisible={confirmationVisible}
        title="New Game"
        message={`Are you sure you want to reset the tracker and start a new game?`}
        onConfirm={resetGame}
        onCancel={() => setConfirmationVisible(false)}
      />
      
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
  setupSection: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
    marginBottom: 20,
    textAlign: 'center',
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
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  playersList: {
    flex: 1,
    maxHeight: 300,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  editingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333333',
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  saveButton: {
    width: 32,
    height: 32,
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    width: 32,
    height: 32,
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333333',
  },
  playerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editPlayerButton: {
    width: 32,
    height: 32,
    backgroundColor: '#fff5ef',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  startButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  startButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#ffffff',
    marginLeft: 8,
  },
  gameHeader: {
    backgroundColor: '#8b5cf6',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  gameTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
  },
  gameSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.9,
  },
  gameContent: {
    flex: 1,
    padding: 20,
  },
  roundSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  roundTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  playerScoreInfo: {
    flex: 1,
  },
  scorePlayerName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333333',
  },
  scorePlayerTotal: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  scoreInput: {
    width: 80,
    backgroundColor: '#f7f9fc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333333',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  roundActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  submitRoundButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitRoundText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  finishGameButton: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  finishGameText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  historySection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  historyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 16,
    textAlign: 'center',
  },
  historyScroll: {
    maxHeight: 300,
  },
  historyTable: {
    minWidth: 300,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e1e5ea',
    paddingBottom: 8,
    marginBottom: 8,
  },
  historyHeaderCellPlayer: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    width: 80,
    textAlign: 'center',
  },
  historyHeaderCellTotal: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    width: 60,
    textAlign: 'center',
  },
  historyHeaderCell: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    width: 50,
    textAlign: 'center',
  },
  historyPlayerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyLeaderRow: {
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  historyPlayerName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333333',
    width: 80,
    textAlign: 'center',
  },
  historyScoreCell: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
    width: 50,
    textAlign: 'center',
  },
  historyTotalCell: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: '#333333',
    width: 60,
    textAlign: 'center',
  },
  historyLeaderText: {
    color: '#ff9654',
  },
  gameFooter: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff0f0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  resetButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#e74c3c',
    marginLeft: 8,
  },
  finishedHeader: {
    backgroundColor: '#10b981',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  finishedTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: '#ffffff',
    textAlign: 'center',
  },
  finishedSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 18,
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.9,
  },
  finishedContent: {
    flex: 1,
    padding: 20,
  },
  podiumSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 32,
    gap: 16,
  },
  podiumItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  podiumFirst: {
    backgroundColor: '#fff7ed',
    borderWidth: 2,
    borderColor: '#ff9654',
    transform: [{ scale: 1.1 }],
  },
  podiumSecond: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#94a3b8',
  },
  podiumThird: {
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  podiumPosition: {
    fontSize: 32,
    marginBottom: 8,
  },
  podiumName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 4,
  },
  podiumScore: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#10b981',
  },
  finalResultsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  finalResultsTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
    marginBottom: 20,
    textAlign: 'center',
  },
  finalTable: {
    minWidth: 400,
  },
  finalHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e1e5ea',
    paddingBottom: 12,
    marginBottom: 12,
  },
  finalHeaderCell: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    width: 50,
    textAlign: 'center',
  },
  finalHeaderCellPlayer: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    width: 80,
    textAlign: 'center',
  },
  finalHeaderCellTotal: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    width: 60,
    textAlign: 'center',
  },
  finalPlayerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  finalRankCell: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: '#8b5cf6',
    width: 50,
    textAlign: 'center',
  },
  finalPlayerNameCell: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333333',
    width: 80,
    textAlign: 'center',
  },
  finalScoreCell: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
    width: 50,
    textAlign: 'center',
  },
  finalTotalCell: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: '#10b981',
    width: 60,
    textAlign: 'center',
  },
  newGameButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
  },
  newGameButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#ffffff',
    marginLeft: 8,
  },
});