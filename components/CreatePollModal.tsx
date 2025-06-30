import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, Modal, Platform, ScrollView, Dimensions, Image } from 'react-native';
import { X, Plus, Check, Users, ChevronDown, ChevronUp, Clock, Brain, Users as Users2, Baby, Heart, ThumbsUp } from 'lucide-react-native';
import Animated, { FadeIn, SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { supabase } from '@/services/supabase';
import { Game } from '@/types/game';

interface CreatePollModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SelectionMethodModalProps {
  isVisible: boolean;
  onClose: () => void;
  selectedGames: Game[];
  onRandomSelection: (game: Game) => void;
  onScoreBasedStart: () => void;
}

interface ScoreBasedVotingProps {
  isVisible: boolean;
  onClose: () => void;
  games: Game[];
  onComplete: (results: GameResult[]) => void;
}

interface Vote {
  type: 'veto' | 'ok' | 'excited';
  voter: string;
}

interface GameVotes {
  [gameId: number]: Vote[];
}

interface GameResult {
  game: Game;
  score: number;
  votes: Vote[];
  vetoed: boolean;
}

interface RandomSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  selectedGame: Game;
}

interface ScoreBasedResultsProps {
  isVisible: boolean;
  onClose: () => void;
  results: GameResult[];
  onRandomTieBreaker?: (tiedGames: GameResult[]) => void;
}

// Random Selection Modal Component
const RandomSelectionModal: React.FC<RandomSelectionModalProps> = ({
  isVisible,
  onClose,
  selectedGame,
}) => {
  const [showAnimation, setShowAnimation] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(3);

  useEffect(() => {
    if (isVisible) {
      setShowAnimation(true);
      setCountdown(3);
      
      // Countdown animation
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            setTimeout(() => setShowAnimation(false), 300);
            return null;
          }
          return prev - 1;
        });
      }, 700);

      return () => clearInterval(countdownInterval);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const content = (
    <View style={styles.randomSelectionOverlay}>
      {showAnimation && countdown !== null && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeIn.duration(150)}
          style={styles.countdownContainer}
        >
          <Animated.Text
            key={countdown}
            entering={FadeIn.duration(200)}
            exiting={FadeIn.duration(200)}
            style={styles.countdownText}
          >
            {countdown}
          </Animated.Text>
        </Animated.View>
      )}

      {!showAnimation && (
        <Animated.View
          entering={SlideInDown.duration(800).springify()}
          style={styles.randomResultCard}
        >
          <Text style={styles.randomResultTitle}>Selected Game</Text>
          
          <View style={styles.selectedGameContainer}>
            <Image
              source={{ uri: selectedGame.thumbnail }}
              style={styles.selectedGameImage}
              resizeMode="cover"
            />
            <Text style={styles.selectedGameName}>{selectedGame.name}</Text>
            <Text style={styles.selectedGameDetails}>
              {selectedGame.min_players}-{selectedGame.max_players} players • {selectedGame.playing_time} min
            </Text>
          </View>

          <TouchableOpacity
            style={styles.randomCloseButton}
            onPress={onClose}
          >
            <Text style={styles.randomCloseText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOverlay}>
        {content}
      </View>
    );
  }

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {content}
      </View>
    </Modal>
  );
};

// Score Based Results Modal Component
const ScoreBasedResultsModal: React.FC<ScoreBasedResultsProps> = ({
  isVisible,
  onClose,
  results,
  onRandomTieBreaker,
}) => {
  // Sort results by score (descending), then by fewest vetos if all are vetoed
  const sortedResults = [...results].sort((a, b) => {
    // If both are vetoed, sort by fewest vetos (count veto votes)
    if (a.vetoed && b.vetoed) {
      const aVetos = a.votes.filter(v => v.type === 'veto').length;
      const bVetos = b.votes.filter(v => v.type === 'veto').length;
      return aVetos - bVetos; // Fewer vetos = better rank
    }
    
    // Non-vetoed games always rank higher than vetoed games
    if (a.vetoed && !b.vetoed) return 1;
    if (!a.vetoed && b.vetoed) return -1;
    
    // Both non-vetoed, sort by score
    return b.score - a.score;
  });

  // Check for ties at the top
  const topScore = sortedResults[0]?.score || 0;
  const topVetoed = sortedResults[0]?.vetoed || false;
  const tiedGames = sortedResults.filter(result => 
    result.score === topScore && result.vetoed === topVetoed
  );

  const hasTie = tiedGames.length > 1;

  if (!isVisible) return null;

  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Final Results</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsScrollView} showsVerticalScrollIndicator={false}>
        {sortedResults.map((result, index) => (
          <View
            key={result.game.id}
            style={[
              styles.resultItem,
              index === 0 && !result.vetoed && styles.winnerItem,
              result.vetoed && styles.vetoedItem,
            ]}
          >
            <View style={styles.resultRank}>
              <Text style={[
                styles.resultRankText,
                index === 0 && !result.vetoed && styles.winnerText,
              ]}>
                #{index + 1}
                {index === 0 && !result.vetoed && ' 👑'}
              </Text>
            </View>
            
            <View style={styles.resultInfo}>
              <Text style={[
                styles.resultGameName,
                index === 0 && !result.vetoed && styles.winnerText,
                result.vetoed && styles.vetoedText,
              ]}>
                {result.game.name}
              </Text>
              
              <View style={styles.resultVotes}>
                <View style={styles.voteTypeCount}>
                  <Heart size={16} color="#ec4899" fill="#ec4899" />
                  <Text style={styles.voteCountText}>
                    {result.votes.filter(v => v.type === 'excited').length}
                  </Text>
                </View>
                <View style={styles.voteTypeCount}>
                  <ThumbsUp size={16} color="#10b981" />
                  <Text style={styles.voteCountText}>
                    {result.votes.filter(v => v.type === 'ok').length}
                  </Text>
                </View>
                <View style={styles.voteTypeCount}>
                  <X size={16} color="#ef4444" />
                  <Text style={styles.voteCountText}>
                    {result.votes.filter(v => v.type === 'veto').length}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.resultScore}>
              <Text style={[
                styles.resultScoreText,
                index === 0 && !result.vetoed && styles.winnerText,
                result.vetoed && styles.vetoedText,
              ]}>
                {result.vetoed ? 'VETOED' : `${result.score} pts`}
              </Text>
            </View>
          </View>
        ))}

        {hasTie && !sortedResults[0].vetoed && onRandomTieBreaker && (
          <View style={styles.tieSection}>
            <Text style={styles.tieText}>
              There's a tie for first place! Would you like to randomly select between the tied games?
            </Text>
            <TouchableOpacity
              style={styles.tieBreakerButton}
              onPress={() => onRandomTieBreaker(tiedGames)}
            >
              <Text style={styles.tieBreakerText}>Random Tie Breaker</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {content}
      </View>
    </Modal>
  );
};

// Score Based Voting Component
const ScoreBasedVotingModal: React.FC<ScoreBasedVotingProps> = ({
  isVisible,
  onClose,
  games,
  onComplete,
}) => {
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameVotes, setGameVotes] = useState<GameVotes>({});
  const [voterName, setVoterName] = useState('');

  const currentGame = games[currentGameIndex];
  const currentVotes = gameVotes[currentGame?.id] || [];
  const progress = ((currentGameIndex + 1) / games.length) * 100;

  const addVote = (type: 'veto' | 'ok' | 'excited', voter: string) => {
    if (!currentGame || !voter.trim()) return;

    setGameVotes(prev => {
      const gameId = currentGame.id;
      const existingVotes = prev[gameId] || [];
      
      // Check if this voter already voted for this game
      const existingVoteIndex = existingVotes.findIndex(v => v.voter === voter);
      
      let newVotes;
      if (existingVoteIndex >= 0) {
        // Replace existing vote
        newVotes = [...existingVotes];
        newVotes[existingVoteIndex] = { type, voter };
      } else {
        // Add new vote
        newVotes = [...existingVotes, { type, voter }];
      }
      
      return {
        ...prev,
        [gameId]: newVotes,
      };
    });
  };

  const removeVote = (voteIndex: number) => {
    if (!currentGame) return;

    setGameVotes(prev => {
      const gameId = currentGame.id;
      const existingVotes = prev[gameId] || [];
      const newVotes = existingVotes.filter((_, index) => index !== voteIndex);
      
      return {
        ...prev,
        [gameId]: newVotes,
      };
    });
  };

  const nextGame = () => {
    if (currentGameIndex < games.length - 1) {
      setCurrentGameIndex(prev => prev + 1);
      setVoterName('');
    } else {
      // Calculate final results
      const results: GameResult[] = games.map(game => {
        const votes = gameVotes[game.id] || [];
        const vetoCount = votes.filter(v => v.type === 'veto').length;
        const okCount = votes.filter(v => v.type === 'ok').length;
        const excitedCount = votes.filter(v => v.type === 'excited').length;
        
        const score = (excitedCount * 2) + okCount;
        const vetoed = vetoCount > 0;
        
        return {
          game,
          score,
          votes,
          vetoed,
        };
      });
      
      onComplete(results);
    }
  };

  if (!isVisible || !currentGame) return null;

  const content = (
    <View style={styles.scoreBasedContainer}>
      {/* Header with progress */}
      <View style={styles.scoreBasedHeader}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Game {currentGameIndex + 1} of {games.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color="#666666" />
        </TouchableOpacity>
      </View>

      {/* Game Display */}
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

      {/* Instructions */}
      <Text style={styles.instructionText}>
        Ask your players their preferences and record them or pass the phone around for a secret ballot
      </Text>

      {/* Voting Buttons */}
      <View style={styles.votingSection}>
        <View style={styles.voteButtonsContainer}>
          <TouchableOpacity
            style={[styles.voteButton, styles.vetoButton]}
            onPress={() => addVote('veto', `Voter ${currentVotes.length + 1}`)}
          >
            <X size={32} color="#ffffff" />
            <Text style={styles.voteButtonText}>Veto</Text>
            <Text style={styles.voteButtonSubtext}>Don't want to play</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteButton, styles.okButton]}
            onPress={() => addVote('ok', `Voter ${currentVotes.length + 1}`)}
          >
            <ThumbsUp size={32} color="#ffffff" />
            <Text style={styles.voteButtonText}>OK</Text>
            <Text style={styles.voteButtonSubtext}>Would play</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteButton, styles.excitedButton]}
            onPress={() => addVote('excited', `Voter ${currentVotes.length + 1}`)}
          >
            <Heart size={32} color="#ffffff" />
            <Text style={styles.voteButtonText}>Excited</Text>
            <Text style={styles.voteButtonSubtext}>Really want to play</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Current Votes Display */}
      {currentVotes.length > 0 && (
        <View style={styles.currentVotesContainer}>
          <Text style={styles.currentVotesTitle}>Current Votes ({currentVotes.length})</Text>
          <View style={styles.votesDisplay}>
            {currentVotes.map((vote, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.voteChip,
                  vote.type === 'veto' && styles.vetoChip,
                  vote.type === 'ok' && styles.okChip,
                  vote.type === 'excited' && styles.excitedChip,
                ]}
                onPress={() => removeVote(index)}
              >
                {vote.type === 'veto' && <X size={16} color="#ef4444" />}
                {vote.type === 'ok' && <ThumbsUp size={16} color="#10b981" />}
                {vote.type === 'excited' && <Heart size={16} color="#ec4899" fill="#ec4899" />}
                <Text style={styles.voteChipText}>{vote.voter}</Text>
                <X size={12} color="#666666" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Next Button */}
      <TouchableOpacity
        style={styles.nextButton}
        onPress={nextGame}
      >
        <Text style={styles.nextButtonText}>
          {currentGameIndex < games.length - 1 ? 'Next Game' : 'View Results'}
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
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {content}
      </View>
    </Modal>
  );
};

// Selection Method Modal Component
const SelectionMethodModal: React.FC<SelectionMethodModalProps> = ({
  isVisible,
  onClose,
  selectedGames,
  onRandomSelection,
  onScoreBasedStart,
}) => {
  const handleRandomSelection = () => {
    if (selectedGames.length > 0) {
      const randomIndex = Math.floor(Math.random() * selectedGames.length);
      const selectedGame = selectedGames[randomIndex];
      onRandomSelection(selectedGame);
    }
  };

  if (!isVisible) return null;

  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Selection Method</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        How would you like to select a game from your chosen options?
      </Text>

      <View style={styles.methodsContainer}>
        <TouchableOpacity
          style={styles.methodCard}
          onPress={handleRandomSelection}
        >
          <View style={styles.methodIcon}>
            <Text style={styles.methodEmoji}>🎲</Text>
          </View>
          <Text style={styles.methodTitle}>Random Selection</Text>
          <Text style={styles.methodDescription}>
            Randomly pick one game from your selected options
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.methodCard}
          onPress={onScoreBasedStart}
        >
          <View style={styles.methodIcon}>
            <Text style={styles.methodEmoji}>🏆</Text>
          </View>
          <Text style={styles.methodTitle}>Score Based</Text>
          <Text style={styles.methodDescription}>
            Players give scores to each game option
          </Text>
        </TouchableOpacity>

        <View style={[styles.methodCard, styles.methodCardDisabled]}>
          <View style={styles.methodIcon}>
            <Text style={styles.methodEmoji}>📊</Text>
          </View>
          <Text style={styles.methodTitle}>Ranked Choice</Text>
          <Text style={styles.methodDescription}>
            Players rank games in order of preference
          </Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
      </View>
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
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {content}
      </View>
    </Modal>
  );
};

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
  const [showSelectionMethod, setShowSelectionMethod] = useState(false);
  const [showRandomResult, setShowRandomResult] = useState(false);
  const [randomSelectedGame, setRandomSelectedGame] = useState<Game | null>(null);
  const [showScoreBasedVoting, setShowScoreBasedVoting] = useState(false);
  const [showScoreBasedResults, setShowScoreBasedResults] = useState(false);
  const [scoreBasedResults, setScoreBasedResults] = useState<GameResult[]>([]);

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

  const handleInPersonPoll = () => {
    if (selectedGames.length === 0) {
      setError('Please select at least one game');
      return;
    }
    setShowSelectionMethod(true);
  };

  const handleRandomSelection = (game: Game) => {
    setRandomSelectedGame(game);
    setShowSelectionMethod(false);
    setShowRandomResult(true);
  };

  const handleScoreBasedStart = () => {
    setShowSelectionMethod(false);
    setShowScoreBasedVoting(true);
  };

  const handleScoreBasedComplete = (results: GameResult[]) => {
    setScoreBasedResults(results);
    setShowScoreBasedVoting(false);
    setShowScoreBasedResults(true);
  };

  const handleRandomTieBreaker = (tiedGames: GameResult[]) => {
    const randomIndex = Math.floor(Math.random() * tiedGames.length);
    const selectedGame = tiedGames[randomIndex].game;
    setRandomSelectedGame(selectedGame);
    setShowScoreBasedResults(false);
    setShowRandomResult(true);
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
    setShowSelectionMethod(false);
    setShowRandomResult(false);
    setShowScoreBasedVoting(false);
    setShowScoreBasedResults(false);
    setRandomSelectedGame(null);
    setScoreBasedResults([]);
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

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreatePoll}
          disabled={loading}
        >
          <Plus color="#fff" size={20} />
          <Text style={styles.createButtonText}>
            {loading ? 'Creating Poll...' : 'Remote Poll'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.inPersonButton, selectedGames.length === 0 && styles.createButtonDisabled]}
          onPress={handleInPersonPoll}
          disabled={selectedGames.length === 0}
        >
          <Users size={20} color="#ffffff" />
          <Text style={styles.inPersonButtonText}>In-Person</Text>
        </TouchableOpacity>
      </View>

      {/* Selection Method Modal */}
      <SelectionMethodModal
        isVisible={showSelectionMethod}
        onClose={() => setShowSelectionMethod(false)}
        selectedGames={selectedGames}
        onRandomSelection={handleRandomSelection}
        onScoreBasedStart={handleScoreBasedStart}
      />

      {/* Random Selection Result Modal */}
      {randomSelectedGame && (
        <RandomSelectionModal
          isVisible={showRandomResult}
          onClose={() => {
            setShowRandomResult(false);
            setRandomSelectedGame(null);
            onClose();
            resetForm();
          }}
          selectedGame={randomSelectedGame}
        />
      )}

      {/* Score Based Voting Modal */}
      <ScoreBasedVotingModal
        isVisible={showScoreBasedVoting}
        onClose={() => setShowScoreBasedVoting(false)}
        games={selectedGames}
        onComplete={handleScoreBasedComplete}
      />

      {/* Score Based Results Modal */}
      <ScoreBasedResultsModal
        isVisible={showScoreBasedResults}
        onClose={() => {
          setShowScoreBasedResults(false);
          onClose();
          resetForm();
        }}
        results={scoreBasedResults}
        onRandomTieBreaker={handleRandomTieBreaker}
      />
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
  header: ViewStyle;
  closeButton: ViewStyle;
  title: TextStyle;
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
  buttonContainer: ViewStyle;
  createButton: ViewStyle;
  createButtonDisabled: ViewStyle;
  createButtonText: TextStyle;
  inPersonButton: ViewStyle;
  inPersonButtonText: TextStyle;
  description: TextStyle;
  methodsContainer: ViewStyle;
  methodCard: ViewStyle;
  methodCardDisabled: ViewStyle;
  methodIcon: ViewStyle;
  methodEmoji: TextStyle;
  methodTitle: TextStyle;
  methodDescription: TextStyle;
  comingSoonBadge: ViewStyle;
  comingSoonText: TextStyle;
  randomSelectionOverlay: ViewStyle;
  countdownContainer: ViewStyle;
  countdownText: TextStyle;
  randomResultCard: ViewStyle;
  randomResultTitle: TextStyle;
  selectedGameContainer: ViewStyle;
  selectedGameImage: ViewStyle;
  selectedGameName: TextStyle;
  selectedGameDetails: TextStyle;
  randomCloseButton: ViewStyle;
  randomCloseText: TextStyle;
  scoreBasedContainer: ViewStyle;
  scoreBasedHeader: ViewStyle;
  progressContainer: ViewStyle;
  progressText: TextStyle;
  progressBar: ViewStyle;
  progressFill: ViewStyle;
  gameDisplayContainer: ViewStyle;
  gameImage: ViewStyle;
  gameTitle: TextStyle;
  gameDetails: TextStyle;
  instructionText: TextStyle;
  votingSection: ViewStyle;
  voteButtonsContainer: ViewStyle;
  voteButton: ViewStyle;
  vetoButton: ViewStyle;
  okButton: ViewStyle;
  excitedButton: ViewStyle;
  voteButtonText: TextStyle;
  voteButtonSubtext: TextStyle;
  currentVotesContainer: ViewStyle;
  currentVotesTitle: TextStyle;
  votesDisplay: ViewStyle;
  voteChip: ViewStyle;
  vetoChip: ViewStyle;
  okChip: ViewStyle;
  excitedChip: ViewStyle;
  voteChipText: TextStyle;
  nextButton: ViewStyle;
  nextButtonText: TextStyle;
  resultsScrollView: ViewStyle;
  resultItem: ViewStyle;
  winnerItem: ViewStyle;
  vetoedItem: ViewStyle;
  resultRank: ViewStyle;
  resultRankText: TextStyle;
  winnerText: TextStyle;
  resultInfo: ViewStyle;
  resultGameName: TextStyle;
  vetoedText: TextStyle;
  resultVotes: ViewStyle;
  voteTypeCount: ViewStyle;
  voteCountText: TextStyle;
  resultScore: ViewStyle;
  resultScoreText: TextStyle;
  tieSection: ViewStyle;
  tieText: TextStyle;
  tieBreakerButton: ViewStyle;
  tieBreakerText: TextStyle;
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
  header: {
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    padding: 16,
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
  inPersonButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2b5f',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  inPersonButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  methodsContainer: {
    gap: 16,
  },
  methodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e1e5ea',
    position: 'relative',
  },
  methodCardDisabled: {
    opacity: 0.6,
  },
  methodIcon: {
    marginBottom: 12,
  },
  methodEmoji: {
    fontSize: 32,
  },
  methodTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 8,
    textAlign: 'center',
  },
  methodDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ff9654',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#ffffff',
  },
  randomSelectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 43, 95, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  countdownContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 120,
    color: '#ffffff',
  },
  randomResultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  randomResultTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
    marginBottom: 24,
  },
  selectedGameContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  selectedGameImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedGameName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 8,
  },
  selectedGameDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  randomCloseButton: {
    backgroundColor: '#ff9654',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  randomCloseText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  scoreBasedContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: screenHeight * 0.9,
    overflow: 'hidden',
  },
  scoreBasedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e1e5ea',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff9654',
    borderRadius: 3,
  },
  gameDisplayContainer: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  gameImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 12,
  },
  gameTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 4,
  },
  gameDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  instructionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    lineHeight: 22,
  },
  votingSection: {
    padding: 20,
  },
  voteButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minHeight: 100,
    justifyContent: 'center',
  },
  vetoButton: {
    backgroundColor: '#ef4444',
  },
  okButton: {
    backgroundColor: '#10b981',
  },
  excitedButton: {
    backgroundColor: '#ec4899',
  },
  voteButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginTop: 8,
  },
  voteButtonSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  currentVotesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  currentVotesTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 12,
  },
  votesDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  voteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  vetoChip: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  okChip: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  excitedChip: {
    backgroundColor: '#fdf2f8',
    borderWidth: 1,
    borderColor: '#ec4899',
  },
  voteChipText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
  },
  nextButton: {
    backgroundColor: '#1a2b5f',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  resultsScrollView: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  winnerItem: {
    backgroundColor: '#fff7ed',
    borderColor: '#ff9654',
    borderWidth: 2,
  },
  vetoedItem: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  resultRank: {
    width: 60,
    alignItems: 'center',
  },
  resultRankText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#666666',
  },
  winnerText: {
    color: '#ff9654',
  },
  resultInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  resultGameName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  vetoedText: {
    color: '#ef4444',
  },
  resultVotes: {
    flexDirection: 'row',
    gap: 16,
  },
  voteTypeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteCountText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#666666',
  },
  resultScore: {
    alignItems: 'center',
    minWidth: 80,
  },
  resultScoreText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#10b981',
  },
  tieSection: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  tieText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  tieBreakerButton: {
    backgroundColor: '#ff9654',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tieBreakerText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
});