import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, Modal, Platform, ScrollView, Dimensions, Image } from 'react-native';
import { X, Plus, Check, Users, ChevronDown, ChevronUp, Clock, Brain, Users as Users2, Baby, Heart, ThumbsUp } from 'lucide-react-native';
import Animated, { FadeIn, SlideInRight, SlideOutLeft, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { supabase } from '@/services/supabase';
import { Game } from '@/types/game';

interface CreatePollModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface VoteCount {
  veto: number;
  ok: number;
  excited: number;
}

interface Vote {
  id: string;
  type: 'veto' | 'ok' | 'excited';
}

interface GameVotes {
  [gameId: number]: Vote[];
}

interface GameResult {
  game: Game;
  score: number;
  votes: VoteCount;
  hasVeto: boolean;
}

type SelectionMethod = 'remote' | 'random' | 'ranked' | 'score';
type VotingPhase = 'method-selection' | 'game-selection' | 'voting' | 'results';

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionMethod, setSelectionMethod] = useState<SelectionMethod>('remote');
  const [votingPhase, setVotingPhase] = useState<VotingPhase>('method-selection');

  // Filter states
  const [playerCount, setPlayerCount] = useState<string>('');
  const [playTime, setPlayTime] = useState<string>('');
  const [minAge, setMinAge] = useState<string>('');
  const [gameType, setGameType] = useState<string>('');
  const [complexity, setComplexity] = useState<string>('');

  // Dropdown visibility states
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showAgeDropdown, setShowAgeDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showComplexityDropdown, setShowComplexityDropdown] = useState(false);

  // Score-based voting states
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameVotes, setGameVotes] = useState<GameVotes>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [finalResults, setFinalResults] = useState<GameResult[]>([]);
  const [tiedGames, setTiedGames] = useState<GameResult[]>([]);
  const [showTieBreaker, setShowTieBreaker] = useState(false);
  const [randomWinner, setRandomWinner] = useState<GameResult | null>(null);

  const playerOptions = Array.from({ length: 14 }, (_, i) => String(i + 1)).concat(['15+']);
  const timeOptions = ['30', '60', '90', '120+'];
  const ageOptions = ['6+', '8+', '10+', '12+', '14+', '16+'];
  const typeOptions = ['Any', 'Cooperative', 'Competitive'];
  const complexityOptions = ['Light', 'Medium Light', 'Medium', 'Medium Heavy', 'Heavy'];

  useEffect(() => {
    if (isVisible) {
      loadGames();
    }
  }, [isVisible]);

  useEffect(() => {
    filterGames();
  }, [availableGames, playerCount, playTime, minAge, gameType, complexity]);

  const loadGames = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('collections_games')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const games = data.map(game => ({
        id: game.bgg_game_id,
        name: game.name,
        thumbnail: game.thumbnail,
        min_players: game.min_players,
        max_players: game.max_players,
        playing_time: game.playing_time,
        yearPublished: game.year_published,
        description: game.description,
        image: game.thumbnail,
        minAge: game.min_age,
        is_cooperative: game.is_cooperative,
        complexity: game.complexity,
        minPlaytime: game.minplaytime,
        maxPlaytime: game.maxplaytime,
        complexity_desc: game.complexity_desc
      }));

      setAvailableGames(games);
      setFilteredGames(games);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load games');
    }
  };

  const filterGames = () => {
    let filtered = [...availableGames];

    if (playerCount) {
      const count = parseInt(playerCount === '15+' ? '15' : playerCount);
      filtered = filtered.filter(game =>
        game.min_players <= count && game.max_players >= count
      );
    }

    if (playTime) {
      const maxTime = parseInt(playTime === '120+' ? '120' : playTime);
      filtered = filtered.filter(game =>
        game.playing_time <= maxTime || (playTime === '120+' && game.playing_time >= 120)
      );
    }

    if (minAge) {
      const age = parseInt(minAge.replace('+', ''));
      filtered = filtered.filter(game =>
        !game.minAge || game.minAge <= age
      );
    }

    if (gameType && gameType !== 'Any') {
      filtered = filtered.filter(game =>
        gameType === 'Cooperative' ? game.is_cooperative : !game.is_cooperative
      );
    }

    if (complexity) {
      filtered = filtered.filter(game => {
        if (!game.complexity_desc) return false;
        switch (complexity) {
          case 'Light': return game.complexity_desc === 'Light';
          case 'Medium Light': return game.complexity_desc === 'Medium Light';
          case 'Medium': return game.complexity_desc === 'Medium';
          case 'Medium Heavy': return game.complexity_desc === 'Medium Heavy';
          case 'Heavy': return game.complexity_desc === 'Heavy';
          default: return true;
        }
      });
    }

    setFilteredGames(filtered);
    setSelectedGames(prev =>
      prev.filter(game =>
        filtered.some(g => g.id === game.id)
      )
    );
  };

  const handleCreatePoll = async () => {
    try {
      setLoading(true);
      setError(null);

      if (selectedGames.length === 0) {
        setError('Please select at least one game');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const title = selectedGames.length === 1
        ? `Vote on ${selectedGames[0].name}`
        : `Vote on ${selectedGames.length} games`;

      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          user_id: user.id,
          title,
          max_votes: 1,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      const pollGames = selectedGames.map(game => ({
        poll_id: poll.id,
        game_id: game.id,
      }));

      const { error: gamesError } = await supabase
        .from('poll_games')
        .insert(pollGames);

      if (gamesError) throw gamesError;

      onSuccess();
      resetForm();
    } catch (err) {
      console.error('Error creating poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  const handleRandomSelection = () => {
    if (selectedGames.length === 0) {
      setError('Please select at least one game');
      return;
    }

    setIsAnimating(true);
    
    // Show animation for 2 seconds
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * selectedGames.length);
      const selectedGame = selectedGames[randomIndex];
      
      setRandomWinner({
        game: selectedGame,
        score: 0,
        votes: { veto: 0, ok: 0, excited: 0 },
        hasVeto: false
      });
      setIsAnimating(false);
      setShowResults(true);
    }, 2000);
  };

  const handleScoreBasedSelection = () => {
    if (selectedGames.length === 0) {
      setError('Please select at least one game');
      return;
    }

    setVotingPhase('voting');
    setCurrentGameIndex(0);
    setGameVotes({});
  };

  const addVote = (type: 'veto' | 'ok' | 'excited') => {
    const currentGame = selectedGames[currentGameIndex];
    const newVote: Vote = {
      id: Date.now().toString(),
      type
    };

    setGameVotes(prev => ({
      ...prev,
      [currentGame.id]: [...(prev[currentGame.id] || []), newVote]
    }));
  };

  const removeVote = (voteId: string) => {
    const currentGame = selectedGames[currentGameIndex];
    setGameVotes(prev => ({
      ...prev,
      [currentGame.id]: (prev[currentGame.id] || []).filter(vote => vote.id !== voteId)
    }));
  };

  const getCurrentGameVotes = (): VoteCount => {
    const currentGame = selectedGames[currentGameIndex];
    const votes = gameVotes[currentGame.id] || [];
    
    return {
      veto: votes.filter(v => v.type === 'veto').length,
      ok: votes.filter(v => v.type === 'ok').length,
      excited: votes.filter(v => v.type === 'excited').length,
    };
  };

  const nextGame = () => {
    if (currentGameIndex < selectedGames.length - 1) {
      setCurrentGameIndex(prev => prev + 1);
    } else {
      calculateResults();
    }
  };

  const calculateResults = () => {
    const results: GameResult[] = selectedGames.map(game => {
      const votes = gameVotes[game.id] || [];
      const voteCount: VoteCount = {
        veto: votes.filter(v => v.type === 'veto').length,
        ok: votes.filter(v => v.type === 'ok').length,
        excited: votes.filter(v => v.type === 'excited').length,
      };

      const hasVeto = voteCount.veto > 0;
      const score = hasVeto ? -voteCount.veto : (voteCount.excited * 2) + voteCount.ok;

      return {
        game,
        score,
        votes: voteCount,
        hasVeto
      };
    });

    // Sort by score (highest first), but games with vetos go to bottom
    const sortedResults = results.sort((a, b) => {
      if (a.hasVeto && !b.hasVeto) return 1;
      if (!a.hasVeto && b.hasVeto) return -1;
      if (a.hasVeto && b.hasVeto) return b.score - a.score; // Less negative is better
      return b.score - a.score;
    });

    setFinalResults(sortedResults);

    // Check for ties at the top
    const topScore = sortedResults[0]?.score;
    const topGames = sortedResults.filter(result => result.score === topScore && !result.hasVeto);
    
    if (topGames.length > 1) {
      setTiedGames(topGames);
      setShowTieBreaker(true);
    }

    setShowResults(true);
  };

  const handleTieBreaker = () => {
    const randomIndex = Math.floor(Math.random() * tiedGames.length);
    setRandomWinner(tiedGames[randomIndex]);
    setShowTieBreaker(false);
  };

  const resetForm = () => {
    setSelectedGames([]);
    setError(null);
    setPlayerCount('');
    setPlayTime('');
    setMinAge('');
    setGameType('');
    setComplexity('');
    setShowPlayerDropdown(false);
    setShowTimeDropdown(false);
    setShowAgeDropdown(false);
    setShowTypeDropdown(false);
    setShowComplexityDropdown(false);
    setSelectionMethod('remote');
    setVotingPhase('method-selection');
    setCurrentGameIndex(0);
    setGameVotes({});
    setIsAnimating(false);
    setShowResults(false);
    setFinalResults([]);
    setTiedGames([]);
    setShowTieBreaker(false);
    setRandomWinner(null);
  };

  const toggleGameSelection = (game: Game) => {
    setSelectedGames(current => {
      const isSelected = current.some(g => g.id === game.id);
      if (isSelected) {
        return current.filter(g => g.id !== game.id);
      } else {
        return [...current, game];
      }
    });
  };

  const closeAllDropdowns = () => {
    setShowPlayerDropdown(false);
    setShowTimeDropdown(false);
    setShowAgeDropdown(false);
    setShowTypeDropdown(false);
    setShowComplexityDropdown(false);
  };

  const toggleDropdown = (dropdown: string) => {
    closeAllDropdowns();
    switch (dropdown) {
      case 'player':
        setShowPlayerDropdown(true);
        break;
      case 'time':
        setShowTimeDropdown(true);
        break;
      case 'age':
        setShowAgeDropdown(true);
        break;
      case 'type':
        setShowTypeDropdown(true);
        break;
      case 'complexity':
        setShowComplexityDropdown(true);
        break;
    }
  };

  const clearFilter = (filterType: string) => {
    switch (filterType) {
      case 'player':
        setPlayerCount('');
        setShowPlayerDropdown(false);
        break;
      case 'time':
        setPlayTime('');
        setShowTimeDropdown(false);
        break;
      case 'age':
        setMinAge('');
        setShowAgeDropdown(false);
        break;
      case 'type':
        setGameType('');
        setShowTypeDropdown(false);
        break;
      case 'complexity':
        setComplexity('');
        setShowComplexityDropdown(false);
        break;
    }
  };

  // Method Selection Phase
  if (votingPhase === 'method-selection') {
    const content = (
      <View style={styles.dialog}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Selection Method</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              onClose();
              resetForm();
            }}
          >
            <X size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.methodDescription}>
          How would you like to select a game from your chosen options?
        </Text>

        <View style={styles.methodsContainer}>
          <TouchableOpacity
            style={[styles.methodCard, selectionMethod === 'remote' && styles.methodCardSelected]}
            onPress={() => setSelectionMethod('remote')}
          >
            <View style={styles.methodIcon}>
              <Text style={styles.methodEmoji}>📱</Text>
            </View>
            <Text style={styles.methodTitle}>Remote Poll</Text>
            <Text style={styles.methodSubtitle}>Share a link for others to vote</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, selectionMethod === 'random' && styles.methodCardSelected]}
            onPress={() => setSelectionMethod('random')}
          >
            <View style={styles.methodIcon}>
              <Text style={styles.methodEmoji}>🎲</Text>
            </View>
            <Text style={styles.methodTitle}>Random Selection</Text>
            <Text style={styles.methodSubtitle}>Randomly pick one game from your selected options</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, selectionMethod === 'ranked' && styles.methodCardSelected]}
            onPress={() => setSelectionMethod('ranked')}
          >
            <View style={styles.methodIcon}>
              <Text style={styles.methodEmoji}>📊</Text>
            </View>
            <Text style={styles.methodTitle}>Ranked Choice</Text>
            <Text style={styles.methodSubtitle}>Players rank games in order of preference</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, selectionMethod === 'score' && styles.methodCardSelected]}
            onPress={() => setSelectionMethod('score')}
          >
            <View style={styles.methodIcon}>
              <Text style={styles.methodEmoji}>🏆</Text>
            </View>
            <Text style={styles.methodTitle}>Score Based</Text>
            <Text style={styles.methodSubtitle}>Players give scores to each game</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !selectionMethod && styles.continueButtonDisabled]}
          onPress={() => {
            if (selectionMethod === 'remote') {
              setVotingPhase('game-selection');
            } else if (selectionMethod === 'random' || selectionMethod === 'score') {
              setVotingPhase('game-selection');
            } else if (selectionMethod === 'ranked') {
              // Coming soon - do nothing for now
            }
          }}
          disabled={!selectionMethod || selectionMethod === 'ranked'}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );

    if (Platform.OS === 'web') {
      if (!isVisible) return null;
      return (
        <View style={styles.webOverlay}>
          {content}
        </View>
      );
    }

    return (
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          {content}
        </View>
      </Modal>
    );
  }

  // Score-based voting phase
  if (votingPhase === 'voting' && selectionMethod === 'score') {
    const currentGame = selectedGames[currentGameIndex];
    const currentVotes = getCurrentGameVotes();
    const currentGameVotesList = gameVotes[currentGame.id] || [];

    const content = (
      <View style={styles.votingDialog}>
        <View style={styles.votingHeader}>
          <Text style={styles.votingTitle}>Game {currentGameIndex + 1} of {selectedGames.length}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              onClose();
              resetForm();
            }}
          >
            <X size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentGameIndex + 1) / selectedGames.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {currentGameIndex + 1} / {selectedGames.length}
          </Text>
        </View>

        <View style={styles.gameDisplayContainer}>
          <Image
            source={{ uri: currentGame.thumbnail }}
            style={styles.gameImage}
            resizeMode="cover"
          />
          <Text style={styles.gameTitle}>{currentGame.name}</Text>
          <Text style={styles.gameDetails}>
            {currentGame.min_players}-{currentGame.max_players} players • {currentGame.playing_time} min
          </Text>
        </View>

        <Text style={styles.votingInstruction}>
          Ask your players how they want to vote and record it or pass the phone around for a secret ballot
        </Text>

        <View style={styles.voteButtonsContainer}>
          <TouchableOpacity
            style={styles.vetoButton}
            onPress={() => addVote('veto')}
          >
            <X size={24} color="#ffffff" />
            <Text style={styles.voteButtonText}>Veto</Text>
            <Text style={styles.voteButtonSubtext}>Don't want to play</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.okButton}
            onPress={() => addVote('ok')}
          >
            <ThumbsUp size={24} color="#ffffff" />
            <Text style={styles.voteButtonText}>OK</Text>
            <Text style={styles.voteButtonSubtext}>Would play</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.excitedButton}
            onPress={() => addVote('excited')}
          >
            <Heart size={24} color="#ffffff" />
            <Text style={styles.voteButtonText}>Excited</Text>
            <Text style={styles.voteButtonSubtext}>Really want to play</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.currentVotesContainer}>
          <Text style={styles.currentVotesTitle}>Current Votes:</Text>
          <View style={styles.voteCountsRow}>
            <Text style={styles.voteCount}>Veto: {currentVotes.veto}</Text>
            <Text style={styles.voteCount}>OK: {currentVotes.ok}</Text>
            <Text style={styles.voteCount}>Excited: {currentVotes.excited}</Text>
          </View>

          {currentGameVotesList.length > 0 && (
            <View style={styles.votesList}>
              {currentGameVotesList.map((vote, index) => (
                <View key={vote.id} style={styles.voteItem}>
                  <Text style={styles.voteItemText}>
                    Vote {index + 1}: {vote.type === 'veto' ? 'Veto' : vote.type === 'ok' ? 'OK' : 'Excited'}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeVoteButton}
                    onPress={() => removeVote(vote.id)}
                  >
                    <X size={16} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={nextGame}
        >
          <Text style={styles.nextButtonText}>
            {currentGameIndex === selectedGames.length - 1 ? 'View Results' : 'Next Game'}
          </Text>
        </TouchableOpacity>
      </View>
    );

    if (Platform.OS === 'web') {
      if (!isVisible) return null;
      return (
        <View style={styles.webOverlay}>
          {content}
        </View>
      );
    }

    return (
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          {content}
        </View>
      </Modal>
    );
  }

  // Results phase for random or score-based selection
  if (showResults && (selectionMethod === 'random' || selectionMethod === 'score')) {
    const content = (
      <View style={styles.resultsDialog}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {selectionMethod === 'random' ? 'Random Selection Result' : 'Score-Based Results'}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              onClose();
              resetForm();
            }}
          >
            <X size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        {isAnimating ? (
          <View style={styles.animationContainer}>
            <Animated.View
              style={styles.spinningDice}
              entering={ZoomIn.duration(300)}
            >
              <Text style={styles.diceEmoji}>🎲</Text>
            </Animated.View>
            <Text style={styles.animationText}>Selecting...</Text>
          </View>
        ) : (
          <ScrollView style={styles.resultsContent} showsVerticalScrollIndicator={false}>
            {selectionMethod === 'random' && randomWinner ? (
              <View style={styles.winnerContainer}>
                <Text style={styles.winnerLabel}>Selected Game:</Text>
                <Image
                  source={{ uri: randomWinner.game.thumbnail }}
                  style={styles.winnerImage}
                  resizeMode="cover"
                />
                <Text style={styles.winnerName}>{randomWinner.game.name}</Text>
                <Text style={styles.winnerDetails}>
                  {randomWinner.game.min_players}-{randomWinner.game.max_players} players • {randomWinner.game.playing_time} min
                </Text>
              </View>
            ) : (
              <>
                {showTieBreaker && (
                  <View style={styles.tieBreakerContainer}>
                    <Text style={styles.tieBreakerTitle}>Tie Detected!</Text>
                    <Text style={styles.tieBreakerText}>
                      Multiple games tied for first place. Would you like to randomly select between them?
                    </Text>
                    <TouchableOpacity
                      style={styles.tieBreakerButton}
                      onPress={handleTieBreaker}
                    >
                      <Text style={styles.tieBreakerButtonText}>Random Tie Breaker</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {randomWinner && (
                  <View style={styles.tieWinnerContainer}>
                    <Text style={styles.tieWinnerLabel}>Tie Breaker Winner:</Text>
                    <Image
                      source={{ uri: randomWinner.game.thumbnail }}
                      style={styles.tieWinnerImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.tieWinnerName}>{randomWinner.game.name}</Text>
                  </View>
                )}

                <View style={styles.fullResultsContainer}>
                  <Text style={styles.fullResultsTitle}>
                    {randomWinner ? 'Full Rankings:' : 'Final Rankings:'}
                  </Text>
                  {finalResults.map((result, index) => (
                    <View key={result.game.id} style={[
                      styles.resultItem,
                      index === 0 && !randomWinner && styles.resultItemWinner
                    ]}>
                      <View style={styles.resultRank}>
                        <Text style={styles.resultRankText}>#{index + 1}</Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultGameName}>{result.game.name}</Text>
                        <Text style={styles.resultScore}>
                          {result.hasVeto 
                            ? `${result.votes.veto} veto${result.votes.veto !== 1 ? 's' : ''}`
                            : `Score: ${result.score} (${result.votes.excited}❤️ ${result.votes.ok}👍 ${result.votes.veto}❌)`
                          }
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        )}

        {!isAnimating && (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              onClose();
              resetForm();
            }}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    );

    if (Platform.OS === 'web') {
      if (!isVisible) return null;
      return (
        <View style={styles.webOverlay}>
          {content}
        </View>
      );
    }

    return (
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          {content}
        </View>
      </Modal>
    );
  }

  // Game Selection Phase (for all methods)
  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Poll</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            onClose();
            resetForm();
          }}
        >
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.filterSection}>
          <Text style={styles.label}>Filter Games</Text>

          {/* Player Count Filter */}
          <View style={styles.filterItem}>
            <TouchableOpacity
              style={[styles.filterButton, playerCount ? styles.filterButtonActive : undefined]}
              onPress={() => {
                if (showPlayerDropdown && playerCount) {
                  clearFilter('player');
                } else {
                  toggleDropdown('player');
                }
              }}
            >
              <View style={styles.filterButtonContent}>
                <Users size={20} color={playerCount ? "#ff9654" : "#666666"} />
                <Text style={[styles.filterButtonText, playerCount ? styles.filterButtonTextActive : undefined]}>
                  {playerCount ? `${playerCount} players` : 'Player count'}
                </Text>
              </View>
              <View style={styles.filterButtonRight}>
                {playerCount && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      clearFilter('player');
                    }}
                    style={styles.clearButton}
                  >
                    <X size={16} color="#ff9654" />
                  </TouchableOpacity>
                )}
                {showPlayerDropdown ? (
                  <ChevronUp size={20} color="#666666" />
                ) : (
                  <ChevronDown size={20} color="#666666" />
                )}
              </View>
            </TouchableOpacity>

            {showPlayerDropdown && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {playerOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        playerCount === option && styles.dropdownItemSelected
                      ]}
                      onPress={() => {
                        setPlayerCount(option);
                        setShowPlayerDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        playerCount === option && styles.dropdownItemTextSelected
                      ]}>
                        {option} {option === '1' ? 'player' : 'players'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Play Time Filter */}
          <View style={styles.filterItem}>
            <TouchableOpacity
              style={[styles.filterButton, playTime ? styles.filterButtonActive : undefined]}
              onPress={() => {
                if (showTimeDropdown && playTime) {
                  clearFilter('time');
                } else {
                  toggleDropdown('time');
                }
              }}
            >
              <View style={styles.filterButtonContent}>
                <Clock size={20} color={playTime ? "#ff9654" : "#666666"} />
                <Text style={[styles.filterButtonText, playTime ? styles.filterButtonTextActive : undefined]}>
                  {playTime ? `${playTime} minutes${playTime === '120+' ? ' or more' : ''}` : 'Play time'}
                </Text>
              </View>
              <View style={styles.filterButtonRight}>
                {playTime && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      clearFilter('time');
                    }}
                    style={styles.clearButton}
                  >
                    <X size={16} color="#ff9654" />
                  </TouchableOpacity>
                )}
                {showTimeDropdown ? (
                  <ChevronUp size={20} color="#666666" />
                ) : (
                  <ChevronDown size={20} color="#666666" />
                )}
              </View>
            </TouchableOpacity>

            {showTimeDropdown && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {timeOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        playTime === option && styles.dropdownItemSelected
                      ]}
                      onPress={() => {
                        setPlayTime(option);
                        setShowTimeDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        playTime === option && styles.dropdownItemTextSelected
                      ]}>
                        {option} minutes{option === '120+' ? ' or more' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Minimum Age Filter */}
          <View style={styles.filterItem}>
            <TouchableOpacity
              style={[styles.filterButton, minAge ? styles.filterButtonActive : undefined]}
              onPress={() => {
                if (showAgeDropdown && minAge) {
                  clearFilter('age');
                } else {
                  toggleDropdown('age');
                }
              }}
            >
              <View style={styles.filterButtonContent}>
                <Baby size={20} color={minAge ? "#ff9654" : "#666666"} />
                <Text style={[styles.filterButtonText, minAge ? styles.filterButtonTextActive : undefined]}>
                  {minAge ? `${minAge} years` : 'Youngest player age'}
                </Text>
              </View>
              <View style={styles.filterButtonRight}>
                {minAge && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      clearFilter('age');
                    }}
                    style={styles.clearButton}
                  >
                    <X size={16} color="#ff9654" />
                  </TouchableOpacity>
                )}
                {showAgeDropdown ? (
                  <ChevronUp size={20} color="#666666" />
                ) : (
                  <ChevronDown size={20} color="#666666" />
                )}
              </View>
            </TouchableOpacity>

            {showAgeDropdown && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {ageOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        minAge === option && styles.dropdownItemSelected
                      ]}
                      onPress={() => {
                        setMinAge(option);
                        setShowAgeDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        minAge === option && styles.dropdownItemTextSelected
                      ]}>
                        {option} years
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Game Type Filter */}
          <View style={styles.filterItem}>
            <TouchableOpacity
              style={[styles.filterButton, gameType ? styles.filterButtonActive : undefined]}
              onPress={() => {
                if (showTypeDropdown && gameType) {
                  clearFilter('type');
                } else {
                  toggleDropdown('type');
                }
              }}
            >
              <View style={styles.filterButtonContent}>
                <Users2 size={20} color={gameType ? "#ff9654" : "#666666"} />
                <Text style={[styles.filterButtonText, gameType ? styles.filterButtonTextActive : undefined]}>
                  {gameType || 'Game type'}
                </Text>
              </View>
              <View style={styles.filterButtonRight}>
                {gameType && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      clearFilter('type');
                    }}
                    style={styles.clearButton}
                  >
                    <X size={16} color="#ff9654" />
                  </TouchableOpacity>
                )}
                {showTypeDropdown ? (
                  <ChevronUp size={20} color="#666666" />
                ) : (
                  <ChevronDown size={20} color="#666666" />
                )}
              </View>
            </TouchableOpacity>

            {showTypeDropdown && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {typeOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        gameType === option && styles.dropdownItemSelected
                      ]}
                      onPress={() => {
                        setGameType(option);
                        setShowTypeDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        gameType === option && styles.dropdownItemTextSelected
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Complexity Filter */}
          <View style={styles.filterItem}>
            <TouchableOpacity
              style={[styles.filterButton, complexity ? styles.filterButtonActive : undefined]}
              onPress={() => {
                if (showComplexityDropdown && complexity) {
                  clearFilter('complexity');
                } else {
                  toggleDropdown('complexity');
                }
              }}
            >
              <View style={styles.filterButtonContent}>
                <Brain size={20} color={complexity ? "#ff9654" : "#666666"} />
                <Text style={[styles.filterButtonText, complexity ? styles.filterButtonTextActive : undefined]}>
                  {complexity || 'Game complexity'}
                </Text>
              </View>
              <View style={styles.filterButtonRight}>
                {complexity && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      clearFilter('complexity');
                    }}
                    style={styles.clearButton}
                  >
                    <X size={16} color="#ff9654" />
                  </TouchableOpacity>
                )}
                {showComplexityDropdown ? (
                  <ChevronUp size={20} color="#666666" />
                ) : (
                  <ChevronDown size={20} color="#666666" />
                )}
              </View>
            </TouchableOpacity>

            {showComplexityDropdown && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {complexityOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        complexity === option && styles.dropdownItemSelected
                      ]}
                      onPress={() => {
                        setComplexity(option);
                        setShowComplexityDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        complexity === option && styles.dropdownItemTextSelected
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        <View style={styles.gamesSection}>
          <Text style={styles.label}>Select Games</Text>
          <Text style={styles.sublabel}>
            {(playerCount || playTime || minAge || gameType || complexity)
              ? `Games that match your filters`
              : 'Choose games from your collection to include in the poll'}
          </Text>

          {filteredGames.length === 0 ? (
            <Text style={styles.noGamesText}>
              No games found matching your filters
            </Text>
          ) : (
            filteredGames.map(game => (
              <TouchableOpacity
                key={game.id}
                style={[
                  styles.gameItem,
                  selectedGames.some(g => g.id === game.id) && styles.gameItemSelected
                ]}
                onPress={() => toggleGameSelection(game)}
              >
                <View style={styles.gameInfo}>
                  <Text style={styles.gameName}>{game.name}</Text>
                  <Text style={styles.playerCount}>
                    {game.min_players}-{game.max_players} players • {game.playing_time} min
                  </Text>
                </View>
                {selectedGames.some(g => g.id === game.id) && (
                  <Check size={20} color="#ff9654" />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={() => {
          if (selectionMethod === 'remote') {
            handleCreatePoll();
          } else if (selectionMethod === 'random') {
            handleRandomSelection();
          } else if (selectionMethod === 'score') {
            handleScoreBasedSelection();
          }
        }}
        disabled={loading}
      >
        <Plus color="#fff" size={20} />
        <Text style={styles.createButtonText}>
          {loading ? 'Creating Poll...' : 
           selectionMethod === 'remote' ? 'Create Poll' :
           selectionMethod === 'random' ? 'Random Selection' :
           selectionMethod === 'score' ? 'Start Voting' :
           'Create Poll'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'web') {
    if (!isVisible) return null;
    return (
      <View style={styles.webOverlay}>
        {content}
      </View>
    );
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {content}
      </View>
    </Modal>
  );
};

type Styles = {
  overlay: ViewStyle;
  webOverlay: ViewStyle;
  dialog: ViewStyle;
  votingDialog: ViewStyle;
  resultsDialog: ViewStyle;
  header: ViewStyle;
  votingHeader: ViewStyle;
  resultsHeader: ViewStyle;
  closeButton: ViewStyle;
  title: TextStyle;
  votingTitle: TextStyle;
  resultsTitle: TextStyle;
  methodDescription: TextStyle;
  methodsContainer: ViewStyle;
  methodCard: ViewStyle;
  methodCardSelected: ViewStyle;
  methodIcon: ViewStyle;
  methodEmoji: TextStyle;
  methodTitle: TextStyle;
  methodSubtitle: TextStyle;
  comingSoonBadge: ViewStyle;
  comingSoonText: TextStyle;
  continueButton: ViewStyle;
  continueButtonDisabled: ViewStyle;
  continueButtonText: TextStyle;
  progressContainer: ViewStyle;
  progressBar: ViewStyle;
  progressFill: ViewStyle;
  progressText: TextStyle;
  gameDisplayContainer: ViewStyle;
  gameImage: ViewStyle;
  gameTitle: TextStyle;
  gameDetails: TextStyle;
  votingInstruction: TextStyle;
  voteButtonsContainer: ViewStyle;
  vetoButton: ViewStyle;
  okButton: ViewStyle;
  excitedButton: ViewStyle;
  voteButtonText: TextStyle;
  voteButtonSubtext: TextStyle;
  currentVotesContainer: ViewStyle;
  currentVotesTitle: TextStyle;
  voteCountsRow: ViewStyle;
  voteCount: TextStyle;
  votesList: ViewStyle;
  voteItem: ViewStyle;
  voteItemText: TextStyle;
  removeVoteButton: ViewStyle;
  nextButton: ViewStyle;
  nextButtonText: TextStyle;
  animationContainer: ViewStyle;
  spinningDice: ViewStyle;
  diceEmoji: TextStyle;
  animationText: TextStyle;
  resultsContent: ViewStyle;
  winnerContainer: ViewStyle;
  winnerLabel: TextStyle;
  winnerImage: ViewStyle;
  winnerName: TextStyle;
  winnerDetails: TextStyle;
  tieBreakerContainer: ViewStyle;
  tieBreakerTitle: TextStyle;
  tieBreakerText: TextStyle;
  tieBreakerButton: ViewStyle;
  tieBreakerButtonText: TextStyle;
  tieWinnerContainer: ViewStyle;
  tieWinnerLabel: TextStyle;
  tieWinnerImage: ViewStyle;
  tieWinnerName: TextStyle;
  fullResultsContainer: ViewStyle;
  fullResultsTitle: TextStyle;
  resultItem: ViewStyle;
  resultItemWinner: ViewStyle;
  resultRank: ViewStyle;
  resultRankText: TextStyle;
  resultInfo: ViewStyle;
  resultGameName: TextStyle;
  resultScore: TextStyle;
  doneButton: ViewStyle;
  doneButtonText: TextStyle;
  content: ViewStyle;
  label: TextStyle;
  sublabel: TextStyle;
  filterSection: ViewStyle;
  filterItem: ViewStyle;
  filterButton: ViewStyle;
  filterButtonActive: ViewStyle;
  filterButtonContent: ViewStyle;
  filterButtonText: TextStyle;
  filterButtonTextActive: TextStyle;
  filterButtonRight: ViewStyle;
  clearButton: ViewStyle;
  dropdown: ViewStyle;
  dropdownScroll: ViewStyle;
  dropdownItem: ViewStyle;
  dropdownItemSelected: ViewStyle;
  dropdownItemText: TextStyle;
  dropdownItemTextSelected: TextStyle;
  gamesSection: ViewStyle;
  gameItem: ViewStyle;
  gameItemSelected: ViewStyle;
  gameInfo: ViewStyle;
  gameName: TextStyle;
  playerCount: TextStyle;
  noGamesText: TextStyle;
  errorText: TextStyle;
  createButton: ViewStyle;
  createButtonDisabled: ViewStyle;
  createButtonText: TextStyle;
};

const screenHeight = Dimensions.get('window').height;

const styles = StyleSheet.create<Styles>({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: screenHeight * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  votingDialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    height: screenHeight * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  resultsDialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: screenHeight * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  votingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a2b5f',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
  },
  votingTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#ffffff',
  },
  resultsTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
  },
  methodDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  methodsContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  methodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e1e5ea',
    position: 'relative',
  },
  methodCardSelected: {
    borderColor: '#ff9654',
    backgroundColor: '#fff5ef',
  },
  methodIcon: {
    alignItems: 'center',
    marginBottom: 8,
  },
  methodEmoji: {
    fontSize: 32,
  },
  methodTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 4,
  },
  methodSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ff9654',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  comingSoonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 10,
    color: '#ffffff',
  },
  continueButton: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f7f9fc',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e1e5ea',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff9654',
    borderRadius: 2,
  },
  progressText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  gameDisplayContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  gameImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
  },
  gameTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 8,
  },
  gameDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  votingInstruction: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    lineHeight: 20,
  },
  voteButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  vetoButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  okButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  excitedButton: {
    flex: 1,
    backgroundColor: '#ec4899',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  voteButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ffffff',
    marginTop: 4,
  },
  voteButtonSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 2,
  },
  currentVotesContainer: {
    backgroundColor: '#f7f9fc',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  currentVotesTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  voteCountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  voteCount: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#666666',
  },
  votesList: {
    gap: 8,
  },
  voteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
  },
  voteItemText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
  },
  removeVoteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  spinningDice: {
    marginBottom: 20,
  },
  diceEmoji: {
    fontSize: 64,
  },
  animationText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
  },
  resultsContent: {
    flex: 1,
    padding: 20,
  },
  winnerContainer: {
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  winnerLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#15803d',
    marginBottom: 16,
  },
  winnerImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 16,
  },
  winnerName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 8,
  },
  winnerDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  tieBreakerContainer: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  tieBreakerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#ea580c',
    marginBottom: 8,
  },
  tieBreakerText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#9a3412',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  tieBreakerButton: {
    backgroundColor: '#ea580c',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tieBreakerButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
  tieWinnerContainer: {
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  tieWinnerLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#d97706',
    marginBottom: 12,
  },
  tieWinnerImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 12,
  },
  tieWinnerName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#92400e',
    textAlign: 'center',
  },
  fullResultsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  fullResultsTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultItemWinner: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  resultRank: {
    width: 40,
    alignItems: 'center',
  },
  resultRankText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#ff9654',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultGameName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  resultScore: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
  },
  doneButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    alignItems: 'center',
  },
  doneButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  content: {
    padding: 20,
  },
  label: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  sublabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterItem: {
    marginBottom: 12,
    position: 'relative',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
  },
  filterButtonActive: {
    borderColor: '#ff9654',
    backgroundColor: '#fff5ef',
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  filterButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
  },
  filterButtonTextActive: {
    color: '#ff9654',
    fontFamily: 'Poppins-SemiBold',
  },
  filterButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    padding: 2,
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#fff5ef',
  },
  dropdownItemText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
  },
  dropdownItemTextSelected: {
    color: '#ff9654',
    fontFamily: 'Poppins-SemiBold',
  },
  gamesSection: {
    marginTop: 8,
  },
  gameItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  gameItemSelected: {
    backgroundColor: '#fff5ef',
    borderColor: '#ff9654',
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
    marginBottom: 4,
  },
  playerCount: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
  },
  noGamesText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    padding: 16,
    margin: 20,
    borderRadius: 12,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
});