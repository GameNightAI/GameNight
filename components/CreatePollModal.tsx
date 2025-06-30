import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, Modal, Platform, ScrollView, Dimensions, Image } from 'react-native';
import { X, Plus, Check, Users, ChevronDown, ChevronUp, Clock, Brain, Users as Users2, Baby, UserCheck, Globe, Shuffle, ChartBar as BarChart3, Trophy, Heart, ThumbsUp } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay,
  FadeIn,
  FadeOut,
  ZoomIn,
  SlideInDown,
  runOnJS,
  Easing
} from 'react-native-reanimated';
import { supabase } from '@/services/supabase';
import { Game } from '@/types/game';

interface CreatePollModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PollStep = 'type-selection' | 'game-selection' | 'in-person-type-selection' | 'random-animation' | 'random-result' | 'score-based-voting' | 'score-based-results' | 'score-based-tie-breaker';
type PollType = 'remote' | 'in-person';

interface GameVote {
  gameId: number;
  vetos: number;
  oks: number;
  excited: number;
  voters: Array<{
    name: string;
    vote: 'veto' | 'ok' | 'excited';
  }>;
}

interface GameScore {
  game: Game;
  vetos: number;
  score: number; // excited = 2, ok = 1
  voters: Array<{
    name: string;
    vote: 'veto' | 'ok' | 'excited';
  }>;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<PollStep>('type-selection');
  const [pollType, setPollType] = useState<PollType>('remote');
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [randomlySelectedGame, setRandomlySelectedGame] = useState<Game | null>(null);

  // Score-based voting states
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameVotes, setGameVotes] = useState<Record<number, GameVote>>({});
  const [currentVoterName, setCurrentVoterName] = useState('');
  const [finalScores, setFinalScores] = useState<GameScore[]>([]);
  const [tiedGames, setTiedGames] = useState<Game[]>([]);

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
    if (isVisible && currentStep === 'game-selection') {
      loadGames();
    }
  }, [isVisible, currentStep]);

  useEffect(() => {
    if (currentStep === 'game-selection') {
      filterGames();
    }
  }, [availableGames, playerCount, playTime, minAge, gameType, complexity, currentStep]);

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

  const handleInPersonPoll = () => {
    setPollType('in-person');
    setCurrentStep('game-selection');
  };

  const handleRemotePoll = () => {
    setPollType('remote');
    setCurrentStep('game-selection');
  };

  const handleCreateRemotePoll = async () => {
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

  const handleCreateInPersonPoll = () => {
    if (selectedGames.length === 0) {
      setError('Please select at least one game');
      return;
    }
    setCurrentStep('in-person-type-selection');
  };

  const handleRandomSelection = async () => {
    if (selectedGames.length > 0) {
      setCurrentStep('random-animation');
      
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * selectedGames.length);
        const selectedGame = selectedGames[randomIndex];
        setRandomlySelectedGame(selectedGame);
        runOnJS(setCurrentStep)('random-result');
      }, 2000);
    }
  };

  const handleRankedChoice = () => {
    onClose();
    resetForm();
  };

  const handleScoreBased = () => {
    // Initialize voting for score-based selection
    setCurrentGameIndex(0);
    setGameVotes({});
    setCurrentVoterName('');
    setCurrentStep('score-based-voting');
  };

  const handleVote = (vote: 'veto' | 'ok' | 'excited') => {
    if (!currentVoterName.trim()) return;

    const currentGame = selectedGames[currentGameIndex];
    const gameId = currentGame.id;

    setGameVotes(prev => {
      const currentGameVotes = prev[gameId] || {
        gameId,
        vetos: 0,
        oks: 0,
        excited: 0,
        voters: []
      };

      // Check if this voter already voted for this game
      const existingVoterIndex = currentGameVotes.voters.findIndex(v => v.name === currentVoterName.trim());
      
      if (existingVoterIndex >= 0) {
        // Remove the previous vote
        const previousVote = currentGameVotes.voters[existingVoterIndex].vote;
        currentGameVotes[previousVote === 'veto' ? 'vetos' : previousVote === 'ok' ? 'oks' : 'excited']--;
        currentGameVotes.voters.splice(existingVoterIndex, 1);
      }

      // Add the new vote
      currentGameVotes.voters.push({
        name: currentVoterName.trim(),
        vote
      });
      currentGameVotes[vote === 'veto' ? 'vetos' : vote === 'ok' ? 'oks' : 'excited']++;

      return {
        ...prev,
        [gameId]: currentGameVotes
      };
    });

    setCurrentVoterName('');
  };

  const removeVote = (voterName: string) => {
    const currentGame = selectedGames[currentGameIndex];
    const gameId = currentGame.id;

    setGameVotes(prev => {
      const currentGameVotes = prev[gameId];
      if (!currentGameVotes) return prev;

      const voterIndex = currentGameVotes.voters.findIndex(v => v.name === voterName);
      if (voterIndex >= 0) {
        const vote = currentGameVotes.voters[voterIndex].vote;
        currentGameVotes[vote === 'veto' ? 'vetos' : vote === 'ok' ? 'oks' : 'excited']--;
        currentGameVotes.voters.splice(voterIndex, 1);
      }

      return {
        ...prev,
        [gameId]: { ...currentGameVotes }
      };
    });
  };

  const nextGame = () => {
    if (currentGameIndex < selectedGames.length - 1) {
      setCurrentGameIndex(currentGameIndex + 1);
      setCurrentVoterName('');
    } else {
      // All games voted on, calculate results
      calculateFinalScores();
    }
  };

  const calculateFinalScores = () => {
    const scores: GameScore[] = selectedGames.map(game => {
      const votes = gameVotes[game.id] || { gameId: game.id, vetos: 0, oks: 0, excited: 0, voters: [] };
      return {
        game,
        vetos: votes.vetos,
        score: (votes.excited * 2) + votes.oks, // excited = 2 points, ok = 1 point
        voters: votes.voters
      };
    });

    // Filter out games with vetos
    const gamesWithoutVetos = scores.filter(score => score.vetos === 0);
    
    if (gamesWithoutVetos.length === 0) {
      // All games have vetos, rank by fewest vetos
      const sortedByVetos = scores.sort((a, b) => a.vetos - b.vetos);
      setFinalScores(sortedByVetos);
      setCurrentStep('score-based-results');
    } else {
      // Sort by score (highest first)
      const sortedScores = gamesWithoutVetos.sort((a, b) => b.score - a.score);
      
      // Check for ties at the top
      const topScore = sortedScores[0].score;
      const tiedTopGames = sortedScores.filter(score => score.score === topScore);
      
      if (tiedTopGames.length > 1 && topScore > 0) {
        // There's a tie, offer random selection
        setTiedGames(tiedTopGames.map(score => score.game));
        setFinalScores(sortedScores);
        setCurrentStep('score-based-tie-breaker');
      } else {
        setFinalScores(sortedScores);
        setCurrentStep('score-based-results');
      }
    }
  };

  const handleTieBreaker = () => {
    if (tiedGames.length > 0) {
      const randomIndex = Math.floor(Math.random() * tiedGames.length);
      const selectedGame = tiedGames[randomIndex];
      setRandomlySelectedGame(selectedGame);
      setCurrentStep('random-result');
    }
  };

  const resetForm = () => {
    setCurrentStep('type-selection');
    setPollType('remote');
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
    setRandomlySelectedGame(null);
    setCurrentGameIndex(0);
    setGameVotes({});
    setCurrentVoterName('');
    setFinalScores([]);
    setTiedGames([]);
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

  const renderTypeSelection = () => (
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

      <Text style={styles.description}>
        Choose the type of poll you want to create
      </Text>

      <View style={styles.pollTypeContainer}>
        <TouchableOpacity
          style={styles.pollTypeOption}
          onPress={handleInPersonPoll}
        >
          <View style={styles.pollTypeIcon}>
            <UserCheck size={32} color="#8b5cf6" />
          </View>
          <Text style={styles.pollTypeTitle}>In-person</Text>
          <Text style={styles.pollTypeDescription}>
            For players deciding what to play together in person
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pollTypeOption}
          onPress={handleRemotePoll}
        >
          <View style={styles.pollTypeIcon}>
            <Globe size={32} color="#10b981" />
          </View>
          <Text style={styles.pollTypeTitle}>Remote Poll</Text>
          <Text style={styles.pollTypeDescription}>
            Share a link for others to vote on games remotely
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRandomAnimation = () => (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Selecting Game...</Text>
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

      <View style={styles.animationContainer}>
        <RandomSelectionAnimation />
        <Text style={styles.animationText}>
          Randomly selecting from {selectedGames.length} games...
        </Text>
      </View>
    </View>
  );

  const renderRandomResult = () => (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {currentStep === 'score-based-tie-breaker' ? 'Tie Breaker Result' : 'Random Selection Result'}
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

      <View style={styles.randomResultContainer}>
        <View style={styles.randomResultIcon}>
          <Shuffle size={48} color="#10b981" />
        </View>
        
        <Text style={styles.randomResultTitle}>Selected Game:</Text>
        
        {randomlySelectedGame && (
          <Animated.View 
            entering={ZoomIn.delay(300).duration(600).springify()}
            style={styles.selectedGameCard}
          >
            <Image
              source={{ uri: randomlySelectedGame.thumbnail }}
              style={styles.selectedGameImage}
              resizeMode="cover"
            />
            <View style={styles.selectedGameInfo}>
              <Text style={styles.selectedGameName}>{randomlySelectedGame.name}</Text>
              <Text style={styles.selectedGameDetails}>
                {randomlySelectedGame.min_players}-{randomlySelectedGame.max_players} players • {randomlySelectedGame.playing_time} min
              </Text>
              {randomlySelectedGame.yearPublished && (
                <Text style={styles.selectedGameYear}>
                  Published: {randomlySelectedGame.yearPublished}
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        <Text style={styles.randomResultSubtext}>
          Enjoy your game!
        </Text>
      </View>

      <View style={styles.randomResultActions}>
        {currentStep !== 'score-based-tie-breaker' && (
          <TouchableOpacity
            style={styles.selectAgainButton}
            onPress={handleRandomSelection}
          >
            <Shuffle size={20} color="#10b981" />
            <Text style={styles.selectAgainText}>Select Again</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => {
            onClose();
            resetForm();
          }}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInPersonTypeSelection = () => (
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

      <Text style={styles.description}>
        How would you like to select a game from your chosen options?
      </Text>

      <View style={styles.selectionMethodContainer}>
        <TouchableOpacity
          style={styles.selectionMethodOption}
          onPress={handleRandomSelection}
        >
          <View style={styles.selectionMethodIcon}>
            <Shuffle size={24} color="#10b981" />
          </View>
          <View style={styles.selectionMethodContent}>
            <Text style={styles.selectionMethodTitle}>Random Selection</Text>
            <Text style={styles.selectionMethodDescription}>
              Randomly pick one game from your selected options
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.selectionMethodOption}
          onPress={handleRankedChoice}
        >
          <View style={styles.selectionMethodIcon}>
            <BarChart3 size={24} color="#8b5cf6" />
          </View>
          <View style={styles.selectionMethodContent}>
            <Text style={styles.selectionMethodTitle}>Ranked Choice</Text>
            <Text style={styles.selectionMethodDescription}>
              Players rank games in order of preference
            </Text>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.selectionMethodOption}
          onPress={handleScoreBased}
        >
          <View style={styles.selectionMethodIcon}>
            <Trophy size={24} color="#ff9654" />
          </View>
          <View style={styles.selectionMethodContent}>
            <Text style={styles.selectionMethodTitle}>Score Based</Text>
            <Text style={styles.selectionMethodDescription}>
              Players give scores to each game option
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep('game-selection')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderScoreBasedVoting = () => {
    const currentGame = selectedGames[currentGameIndex];
    const currentGameVotes = gameVotes[currentGame.id] || { gameId: currentGame.id, vetos: 0, oks: 0, excited: 0, voters: [] };

    return (
      <View style={styles.dialog}>
        <View style={styles.header}>
          <Text style={styles.title}>Score Based Voting</Text>
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

        <View style={styles.votingProgress}>
          <Text style={styles.progressText}>
            Game {currentGameIndex + 1} of {selectedGames.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentGameIndex + 1) / selectedGames.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        <View style={styles.gameVotingSection}>
          <Image
            source={{ uri: currentGame.thumbnail }}
            style={styles.votingGameImage}
            resizeMode="cover"
          />
          <Text style={styles.votingGameName}>{currentGame.name}</Text>
          <Text style={styles.votingGameDetails}>
            {currentGame.min_players}-{currentGame.max_players} players • {currentGame.playing_time} min
          </Text>
          
          <Text style={styles.votingInstructions}>
            Ask your players how they feel about this game and record their votes:
          </Text>

          <View style={styles.voterInputSection}>
            <Text style={styles.voterInputLabel}>Player Name:</Text>
            <View style={styles.voterInputRow}>
              <input
                style={styles.voterInput}
                value={currentVoterName}
                onChange={(e) => setCurrentVoterName(e.target.value)}
                placeholder="Enter player name"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && currentVoterName.trim()) {
                    e.preventDefault();
                  }
                }}
              />
            </View>
          </View>

          <View style={styles.voteButtonsSection}>
            <TouchableOpacity
              style={[styles.voteOptionButton, styles.vetoButton]}
              onPress={() => handleVote('veto')}
              disabled={!currentVoterName.trim()}
            >
              <X size={24} color="#ffffff" />
              <Text style={styles.voteOptionText}>Veto</Text>
              <Text style={styles.voteOptionSubtext}>Don't want to play</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.voteOptionButton, styles.okButton]}
              onPress={() => handleVote('ok')}
              disabled={!currentVoterName.trim()}
            >
              <ThumbsUp size={24} color="#ffffff" />
              <Text style={styles.voteOptionText}>OK</Text>
              <Text style={styles.voteOptionSubtext}>Would play</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.voteOptionButton, styles.excitedButton]}
              onPress={() => handleVote('excited')}
              disabled={!currentVoterName.trim()}
            >
              <Heart size={24} color="#ffffff" />
              <Text style={styles.voteOptionText}>Excited</Text>
              <Text style={styles.voteOptionSubtext}>Really want to play</Text>
            </TouchableOpacity>
          </View>

          {currentGameVotes.voters.length > 0 && (
            <View style={styles.currentVotesSection}>
              <Text style={styles.currentVotesTitle}>Current Votes:</Text>
              <View style={styles.votesSummary}>
                <Text style={styles.voteSummaryItem}>Veto: {currentGameVotes.vetos}</Text>
                <Text style={styles.voteSummaryItem}>OK: {currentGameVotes.oks}</Text>
                <Text style={styles.voteSummaryItem}>Excited: {currentGameVotes.excited}</Text>
              </View>
              
              <ScrollView style={styles.votersList} showsVerticalScrollIndicator={false}>
                {currentGameVotes.voters.map((voter, index) => (
                  <View key={index} style={styles.voterItem}>
                    <Text style={styles.voterName}>{voter.name}</Text>
                    <View style={styles.voterVoteContainer}>
                      <Text style={[
                        styles.voterVote,
                        voter.vote === 'veto' && styles.vetoVote,
                        voter.vote === 'ok' && styles.okVote,
                        voter.vote === 'excited' && styles.excitedVote,
                      ]}>
                        {voter.vote === 'veto' ? 'Veto' : voter.vote === 'ok' ? 'OK' : 'Excited'}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeVoteButton}
                        onPress={() => removeVote(voter.name)}
                      >
                        <X size={16} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.votingActions}>
          <TouchableOpacity
            style={styles.nextGameButton}
            onPress={nextGame}
          >
            <Text style={styles.nextGameButtonText}>
              {currentGameIndex < selectedGames.length - 1 ? 'Next Game' : 'View Results'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderScoreBasedResults = () => (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Final Results</Text>
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

      <ScrollView style={styles.resultsScrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultsDescription}>
          {finalScores.every(score => score.vetos > 0) 
            ? "All games received vetos. Ranked by fewest vetos:"
            : "Games ranked by player excitement (Excited = 2 points, OK = 1 point):"
          }
        </Text>

        {finalScores.map((scoreData, index) => (
          <Animated.View
            key={scoreData.game.id}
            entering={FadeIn.delay(index * 100)}
            style={[
              styles.resultGameCard,
              index === 0 && styles.winnerCard
            ]}
          >
            <View style={styles.resultRank}>
              <Text style={[styles.rankNumber, index === 0 && styles.winnerRank]}>
                #{index + 1}
              </Text>
              {index === 0 && <Text style={styles.crownEmoji}>👑</Text>}
            </View>

            <Image
              source={{ uri: scoreData.game.thumbnail }}
              style={styles.resultGameImage}
              resizeMode="cover"
            />

            <View style={styles.resultGameInfo}>
              <Text style={[styles.resultGameName, index === 0 && styles.winnerName]}>
                {scoreData.game.name}
              </Text>
              <Text style={styles.resultGameDetails}>
                {scoreData.game.min_players}-{scoreData.game.max_players} players • {scoreData.game.playing_time} min
              </Text>

              <View style={styles.resultScores}>
                {scoreData.vetos > 0 && (
                  <Text style={styles.vetoScore}>Vetos: {scoreData.vetos}</Text>
                )}
                {!finalScores.every(score => score.vetos > 0) && (
                  <Text style={styles.totalScore}>Score: {scoreData.score}</Text>
                )}
              </View>

              {scoreData.voters.length > 0 && (
                <View style={styles.resultVoters}>
                  <Text style={styles.votersLabel}>Voters:</Text>
                  {scoreData.voters.map((voter, voterIndex) => (
                    <Text key={voterIndex} style={[
                      styles.voterResult,
                      voter.vote === 'veto' && styles.vetoVote,
                      voter.vote === 'ok' && styles.okVote,
                      voter.vote === 'excited' && styles.excitedVote,
                    ]}>
                      {voter.name} ({voter.vote === 'veto' ? 'Veto' : voter.vote === 'ok' ? 'OK' : 'Excited'})
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={styles.resultsActions}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => {
            onClose();
            resetForm();
          }}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderScoreBasedTieBreaker = () => (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>Tie Breaker</Text>
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

      <View style={styles.tieBreakerContainer}>
        <Text style={styles.tieBreakerTitle}>
          We have a tie!
        </Text>
        <Text style={styles.tieBreakerDescription}>
          The following games are tied for first place:
        </Text>

        <View style={styles.tiedGamesList}>
          {tiedGames.map((game, index) => (
            <View key={game.id} style={styles.tiedGameItem}>
              <Image
                source={{ uri: game.thumbnail }}
                style={styles.tiedGameImage}
                resizeMode="cover"
              />
              <Text style={styles.tiedGameName}>{game.name}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.tieBreakerSubtext}>
          Would you like to randomly select between these games?
        </Text>
      </View>

      <View style={styles.tieBreakerActions}>
        <TouchableOpacity
          style={styles.viewFullResultsButton}
          onPress={() => setCurrentStep('score-based-results')}
        >
          <Text style={styles.viewFullResultsText}>View Full Results</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.randomTieBreakerButton}
          onPress={handleTieBreaker}
        >
          <Shuffle size={20} color="#ffffff" />
          <Text style={styles.randomTieBreakerText}>Random Selection</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGameSelection = () => (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {pollType === 'remote' ? 'Create Remote Poll' : 'Create In-person Poll'}
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

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep('type-selection')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={pollType === 'remote' ? handleCreateRemotePoll : handleCreateInPersonPoll}
          disabled={loading}
        >
          <Plus color="#fff" size={20} />
          <Text style={styles.createButtonText}>
            {loading ? 'Creating Poll...' : pollType === 'remote' ? 'Create Poll' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getCurrentContent = () => {
    switch (currentStep) {
      case 'type-selection':
        return renderTypeSelection();
      case 'game-selection':
        return renderGameSelection();
      case 'in-person-type-selection':
        return renderInPersonTypeSelection();
      case 'random-animation':
        return renderRandomAnimation();
      case 'random-result':
        return renderRandomResult();
      case 'score-based-voting':
        return renderScoreBasedVoting();
      case 'score-based-results':
        return renderScoreBasedResults();
      case 'score-based-tie-breaker':
        return renderScoreBasedTieBreaker();
      default:
        return renderTypeSelection();
    }
  };

  const content = getCurrentContent();

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

// Random Selection Animation Component
function RandomSelectionAnimation() {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  React.useEffect(() => {
    // Continuous rotation
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
    
    // Pulsing scale animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );

    // Subtle opacity animation
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  return (
    <View style={styles.animationIconContainer}>
      <Animated.View style={[styles.animationIcon, animatedStyle]}>
        <Shuffle size={64} color="#10b981" />
      </Animated.View>
      
      {/* Surrounding animated dots */}
      <AnimatedDot delay={0} />
      <AnimatedDot delay={200} />
      <AnimatedDot delay={400} />
      <AnimatedDot delay={600} />
    </View>
  );
}

function AnimatedDot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.3);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  React.useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.5, { duration: 600 })
        ),
        -1,
        true
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 600 }),
          withTiming(0.3, { duration: 600 })
        ),
        -1,
        true
      )
    );
  }, [delay]);

  return (
    <Animated.View style={[styles.animationDot, animatedStyle]} />
  );
}

type Styles = {
  overlay: ViewStyle;
  webOverlay: ViewStyle;
  dialog: ViewStyle;
  header: ViewStyle;
  closeButton: ViewStyle;
  title: TextStyle;
  description: TextStyle;
  pollTypeContainer: ViewStyle;
  pollTypeOption: ViewStyle;
  pollTypeIcon: ViewStyle;
  pollTypeTitle: TextStyle;
  pollTypeDescription: TextStyle;
  comingSoonText: TextStyle;
  selectionMethodContainer: ViewStyle;
  selectionMethodOption: ViewStyle;
  selectionMethodIcon: ViewStyle;
  selectionMethodContent: ViewStyle;
  selectionMethodTitle: TextStyle;
  selectionMethodDescription: TextStyle;
  animationContainer: ViewStyle;
  animationIconContainer: ViewStyle;
  animationIcon: ViewStyle;
  animationDot: ViewStyle;
  animationText: TextStyle;
  randomResultContainer: ViewStyle;
  randomResultIcon: ViewStyle;
  randomResultTitle: TextStyle;
  randomResultSubtext: TextStyle;
  selectedGameCard: ViewStyle;
  selectedGameImage: ViewStyle;
  selectedGameInfo: ViewStyle;
  selectedGameName: TextStyle;
  selectedGameDetails: TextStyle;
  selectedGameYear: TextStyle;
  randomResultActions: ViewStyle;
  selectAgainButton: ViewStyle;
  selectAgainText: TextStyle;
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
  actionButtons: ViewStyle;
  backButton: ViewStyle;
  backButtonText: TextStyle;
  createButton: ViewStyle;
  createButtonDisabled: ViewStyle;
  createButtonText: TextStyle;
  votingProgress: ViewStyle;
  progressText: TextStyle;
  progressBar: ViewStyle;
  progressFill: ViewStyle;
  gameVotingSection: ViewStyle;
  votingGameImage: ViewStyle;
  votingGameName: TextStyle;
  votingGameDetails: TextStyle;
  votingInstructions: TextStyle;
  voterInputSection: ViewStyle;
  voterInputLabel: TextStyle;
  voterInputRow: ViewStyle;
  voterInput: any;
  voteButtonsSection: ViewStyle;
  voteOptionButton: ViewStyle;
  vetoButton: ViewStyle;
  okButton: ViewStyle;
  excitedButton: ViewStyle;
  voteOptionText: TextStyle;
  voteOptionSubtext: TextStyle;
  currentVotesSection: ViewStyle;
  currentVotesTitle: TextStyle;
  votesSummary: ViewStyle;
  voteSummaryItem: TextStyle;
  votersList: ViewStyle;
  voterItem: ViewStyle;
  voterName: TextStyle;
  voterVoteContainer: ViewStyle;
  voterVote: TextStyle;
  vetoVote: TextStyle;
  okVote: TextStyle;
  excitedVote: TextStyle;
  removeVoteButton: ViewStyle;
  votingActions: ViewStyle;
  nextGameButton: ViewStyle;
  nextGameButtonText: TextStyle;
  resultsScrollView: ViewStyle;
  resultsDescription: TextStyle;
  resultGameCard: ViewStyle;
  winnerCard: ViewStyle;
  resultRank: ViewStyle;
  rankNumber: TextStyle;
  winnerRank: TextStyle;
  crownEmoji: TextStyle;
  resultGameImage: ViewStyle;
  resultGameInfo: ViewStyle;
  resultGameName: TextStyle;
  winnerName: TextStyle;
  resultGameDetails: TextStyle;
  resultScores: ViewStyle;
  vetoScore: TextStyle;
  totalScore: TextStyle;
  resultVoters: ViewStyle;
  votersLabel: TextStyle;
  voterResult: TextStyle;
  resultsActions: ViewStyle;
  tieBreakerContainer: ViewStyle;
  tieBreakerTitle: TextStyle;
  tieBreakerDescription: TextStyle;
  tiedGamesList: ViewStyle;
  tiedGameItem: ViewStyle;
  tiedGameImage: ViewStyle;
  tiedGameName: TextStyle;
  tieBreakerSubtext: TextStyle;
  tieBreakerActions: ViewStyle;
  viewFullResultsButton: ViewStyle;
  viewFullResultsText: TextStyle;
  randomTieBreakerButton: ViewStyle;
  randomTieBreakerText: TextStyle;
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
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  pollTypeContainer: {
    padding: 20,
    paddingTop: 0,
    gap: 16,
  },
  pollTypeOption: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e1e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pollTypeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f7f9fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pollTypeTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  pollTypeDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  comingSoonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#ff9654',
    marginTop: 8,
    backgroundColor: '#fff5ef',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectionMethodContainer: {
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  selectionMethodOption: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e1e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectionMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f7f9fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectionMethodContent: {
    flex: 1,
  },
  selectionMethodTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  selectionMethodDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
  animationContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationIconContainer: {
    position: 'relative',
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  animationIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  animationText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    textAlign: 'center',
    lineHeight: 24,
  },
  randomResultContainer: {
    padding: 32,
    alignItems: 'center',
  },
  randomResultIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  randomResultTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    color: '#1a2b5f',
    marginBottom: 24,
    textAlign: 'center',
  },
  randomResultSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 24,
  },
  selectedGameCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    width: '100%',
    maxWidth: 300,
  },
  selectedGameImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  selectedGameInfo: {
    alignItems: 'center',
  },
  selectedGameName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 26,
  },
  selectedGameDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectedGameYear: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8d8d8d',
    textAlign: 'center',
  },
  randomResultActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
  },
  selectAgainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  selectAgainText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#10b981',
    marginLeft: 8,
  },
  doneButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#666666',
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 16,
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
  votingProgress: {
    padding: 20,
    paddingBottom: 10,
  },
  progressText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e1e5ea',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff9654',
    borderRadius: 4,
  },
  gameVotingSection: {
    padding: 20,
    alignItems: 'center',
  },
  votingGameImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  votingGameName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 8,
  },
  votingGameDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  votingInstructions: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  voterInputSection: {
    width: '100%',
    marginBottom: 24,
  },
  voterInputLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  voterInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voterInput: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333333',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    outline: 'none',
  },
  voteButtonsSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    width: '100%',
    justifyContent: 'center',
  },
  voteOptionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    minHeight: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  vetoButton: {
    backgroundColor: '#e74c3c',
  },
  okButton: {
    backgroundColor: '#10b981',
  },
  excitedButton: {
    backgroundColor: '#ec4899',
  },
  voteOptionText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  voteOptionSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
  },
  currentVotesSection: {
    width: '100%',
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  currentVotesTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 12,
  },
  votesSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  voteSummaryItem: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333333',
  },
  votersList: {
    maxHeight: 120,
  },
  voterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 4,
  },
  voterName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  voterVoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voterVote: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vetoVote: {
    backgroundColor: '#fef2f2',
    color: '#e74c3c',
  },
  okVote: {
    backgroundColor: '#ecfdf5',
    color: '#10b981',
  },
  excitedVote: {
    backgroundColor: '#fdf2f8',
    color: '#ec4899',
  },
  removeVoteButton: {
    width: 24,
    height: 24,
    backgroundColor: '#fff0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  votingActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
  },
  nextGameButton: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nextGameButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  resultsScrollView: {
    flex: 1,
    padding: 20,
  },
  resultsDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  resultGameCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  winnerCard: {
    backgroundColor: '#fff7ed',
    borderWidth: 2,
    borderColor: '#ff9654',
  },
  resultRank: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 40,
  },
  rankNumber: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#8b5cf6',
  },
  winnerRank: {
    color: '#ff9654',
  },
  crownEmoji: {
    fontSize: 16,
    marginTop: 4,
  },
  resultGameImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#f0f0f0',
  },
  resultGameInfo: {
    flex: 1,
  },
  resultGameName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  winnerName: {
    color: '#ff9654',
  },
  resultGameDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  resultScores: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  vetoScore: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#e74c3c',
  },
  totalScore: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#10b981',
  },
  resultVoters: {
    marginTop: 8,
  },
  votersLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  voterResult: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginBottom: 2,
  },
  resultsActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
  },
  tieBreakerContainer: {
    padding: 32,
    alignItems: 'center',
  },
  tieBreakerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
    marginBottom: 16,
    textAlign: 'center',
  },
  tieBreakerDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  tiedGamesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  tiedGameItem: {
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 16,
    minWidth: 120,
  },
  tiedGameImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  tiedGameName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    textAlign: 'center',
  },
  tieBreakerSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  tieBreakerActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
  },
  viewFullResultsButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  viewFullResultsText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#666666',
  },
  randomTieBreakerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
  },
  randomTieBreakerText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
  },
});