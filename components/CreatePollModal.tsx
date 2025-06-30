import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, Modal, Platform, ScrollView, Dimensions, Image } from 'react-native';
import { X, Plus, Check, Users, ChevronDown, ChevronUp, Clock, Brain, Users as Users2, Baby, Heart, ThumbsUp, ThumbsDown, Undo2 } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { Game } from '@/types/game';

interface CreatePollModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface VotingMethod {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  backgroundColor: string;
  comingSoon?: boolean;
}

interface ScoreVotingGame extends Game {
  votes: Array<'veto' | 'ok' | 'excited'>;
}

type VoteType = 'veto' | 'ok' | 'excited';

interface GameResult {
  game: Game;
  score: number;
  vetoCount: number;
  hasVeto: boolean;
}

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

  // Voting method selection
  const [showVotingMethods, setShowVotingMethods] = useState(false);
  const [selectedVotingMethod, setSelectedVotingMethod] = useState<string | null>(null);

  // Score-based voting states
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameVotes, setGameVotes] = useState<{ [gameId: number]: Array<VoteType> }>({});
  const [currentGameVoteCount, setCurrentGameVoteCount] = useState(0);

  // Results display
  const [showResults, setShowResults] = useState(false);
  const [finalResults, setFinalResults] = useState<GameResult[]>([]);

  const playerOptions = Array.from({ length: 14 }, (_, i) => String(i + 1)).concat(['15+']);
  const timeOptions = ['30', '60', '90', '120+'];
  const ageOptions = ['6+', '8+', '10+', '12+', '14+', '16+'];
  const typeOptions = ['Any', 'Cooperative', 'Competitive'];
  const complexityOptions = ['Light', 'Medium Light', 'Medium', 'Medium Heavy', 'Heavy'];

  const votingMethods: VotingMethod[] = [
    {
      id: 'random',
      title: 'Random Selection',
      description: 'Randomly pick one game from your selected options',
      icon: ({ size, color }: any) => <Text style={{ fontSize: size, color }}>🎲</Text>,
      color: '#10b981',
      backgroundColor: '#ecfdf5',
    },
    {
      id: 'ranked',
      title: 'Ranked Choice',
      description: 'Players rank games in order of preference',
      icon: ({ size, color }: any) => <Text style={{ fontSize: size, color }}>📊</Text>,
      color: '#8b5cf6',
      backgroundColor: '#f3f4f6',
      comingSoon: true,
    },
    {
      id: 'score',
      title: 'Score Based',
      description: 'Players give scores to each game option',
      icon: ({ size, color }: any) => <Text style={{ fontSize: size, color }}>🏆</Text>,
      color: '#ff9654',
      backgroundColor: '#fff5ef',
    },
  ];

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
    setShowVotingMethods(false);
    setSelectedVotingMethod(null);
    setCurrentGameIndex(0);
    setGameVotes({});
    setCurrentGameVoteCount(0);
    setShowResults(false);
    setFinalResults([]);
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

  const handleVotingMethodSelect = (methodId: string) => {
    if (methodId === 'score') {
      setSelectedVotingMethod(methodId);
      setShowVotingMethods(false);
      // Initialize voting for the first game
      setCurrentGameIndex(0);
      const initialVotes: { [gameId: number]: Array<VoteType> } = {};
      selectedGames.forEach(game => {
        initialVotes[game.id] = [];
      });
      setGameVotes(initialVotes);
      setCurrentGameVoteCount(0);
    } else if (methodId === 'random') {
      // Handle random selection
      if (selectedGames.length > 0) {
        const randomIndex = Math.floor(Math.random() * selectedGames.length);
        const selectedGame = selectedGames[randomIndex];
        
        // Show results in native display
        const randomResult: GameResult[] = [{
          game: selectedGame,
          score: 0,
          vetoCount: 0,
          hasVeto: false
        }];
        setFinalResults(randomResult);
        setShowResults(true);
      }
    }
  };

  const addVote = (voteType: VoteType) => {
    const currentGame = selectedGames[currentGameIndex];
    if (!currentGame) return;

    setGameVotes(prev => ({
      ...prev,
      [currentGame.id]: [...(prev[currentGame.id] || []), voteType]
    }));
    setCurrentGameVoteCount(prev => prev + 1);
  };

  const removeLastVote = () => {
    const currentGame = selectedGames[currentGameIndex];
    if (!currentGame) return;

    const currentVotes = gameVotes[currentGame.id] || [];
    if (currentVotes.length === 0) return;

    setGameVotes(prev => ({
      ...prev,
      [currentGame.id]: currentVotes.slice(0, -1)
    }));
    setCurrentGameVoteCount(prev => Math.max(0, prev - 1));
  };

  const nextGame = () => {
    if (currentGameIndex < selectedGames.length - 1) {
      setCurrentGameIndex(prev => prev + 1);
      // Reset vote count for the next game
      setCurrentGameVoteCount(0);
    } else {
      // Calculate results and finish
      calculateScoreResults();
    }
  };

  const calculateScoreResults = () => {
    const results = selectedGames.map(game => {
      const votes = gameVotes[game.id] || [];
      const vetoCount = votes.filter(v => v === 'veto').length;
      const okCount = votes.filter(v => v === 'ok').length;
      const excitedCount = votes.filter(v => v === 'excited').length;
      
      // Excited counts as 2 points, ok as 1 point
      const score = (excitedCount * 2) + okCount;
      
      return {
        game,
        score,
        vetoCount,
        hasVeto: vetoCount > 0
      };
    });

    // Filter out games with vetos
    const validGames = results.filter(r => !r.hasVeto);
    
    let finalResults: GameResult[];
    
    if (validGames.length === 0) {
      // All games have vetos, show ranking by fewest vetos
      finalResults = results.sort((a, b) => a.vetoCount - b.vetoCount);
    } else {
      // Sort by score (highest first)
      finalResults = validGames.sort((a, b) => b.score - a.score);
    }

    setFinalResults(finalResults);
    setShowResults(true);
  };

  // Results display screen
  if (showResults) {
    const allHaveVetos = finalResults.every(r => r.hasVeto);
    const topScore = finalResults[0]?.score || 0;
    const topGames = finalResults.filter(r => r.score === topScore);
    const hasTie = topGames.length > 1 && !allHaveVetos;

    const content = (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {selectedVotingMethod === 'random' ? 'Random Selection' : 'Voting Results'}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowResults(false);
              onClose();
              resetForm();
            }}
          >
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.resultsContent} showsVerticalScrollIndicator={false}>
          {selectedVotingMethod === 'random' ? (
            <View style={styles.randomResultSection}>
              <Text style={styles.randomResultLabel}>Selected Game:</Text>
              <View style={styles.winnerCard}>
                <Image
                  source={{ uri: finalResults[0].game.thumbnail || 'https://via.placeholder.com/150?text=No+Image' }}
                  style={styles.winnerImage}
                  resizeMode="cover"
                />
                <Text style={styles.winnerName}>{finalResults[0].game.name}</Text>
                <Text style={styles.winnerDetails}>
                  {finalResults[0].game.min_players}-{finalResults[0].game.max_players} players • {finalResults[0].game.playing_time} min
                </Text>
              </View>
            </View>
          ) : (
            <>
              {allHaveVetos && (
                <View style={styles.statusSection}>
                  <Text style={styles.statusText}>All games received vetos!</Text>
                  <Text style={styles.statusSubtext}>Ranking by fewest vetos:</Text>
                </View>
              )}

              {hasTie && !allHaveVetos && (
                <View style={styles.statusSection}>
                  <Text style={styles.statusText}>We have a tie!</Text>
                  <Text style={styles.statusSubtext}>Top games with {topScore} points each:</Text>
                </View>
              )}

              <View style={styles.rankingSection}>
                {finalResults.map((result, index) => (
                  <View 
                    key={result.game.id} 
                    style={[
                      styles.rankingCard,
                      index === 0 && !allHaveVetos && styles.winnerRankingCard
                    ]}
                  >
                    <View style={styles.rankingPosition}>
                      <Text style={[
                        styles.rankingNumber,
                        index === 0 && !allHaveVetos && styles.winnerRankingNumber
                      ]}>
                        #{index + 1}
                      </Text>
                      {index === 0 && !allHaveVetos && (
                        <Text style={styles.crownEmoji}>👑</Text>
                      )}
                    </View>
                    
                    <Image
                      source={{ uri: result.game.thumbnail || 'https://via.placeholder.com/150?text=No+Image' }}
                      style={styles.rankingImage}
                      resizeMode="cover"
                    />
                    
                    <View style={styles.rankingInfo}>
                      <Text style={[
                        styles.rankingGameName,
                        index === 0 && !allHaveVetos && styles.winnerRankingText
                      ]}>
                        {result.game.name}
                      </Text>
                      <Text style={styles.rankingGameDetails}>
                        {result.game.min_players}-{result.game.max_players} players • {result.game.playing_time} min
                      </Text>
                      <Text style={[
                        styles.rankingScore,
                        index === 0 && !allHaveVetos && styles.winnerRankingScore
                      ]}>
                        {allHaveVetos 
                          ? `${result.vetoCount} veto${result.vetoCount !== 1 ? 's' : ''}`
                          : `${result.score} point${result.score !== 1 ? 's' : ''}`
                        }
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {hasTie && (
                <TouchableOpacity
                  style={styles.randomTiebreakerButton}
                  onPress={() => {
                    const randomWinner = topGames[Math.floor(Math.random() * topGames.length)];
                    const tiebreakerResult: GameResult[] = [randomWinner];
                    setFinalResults(tiebreakerResult);
                    setSelectedVotingMethod('random');
                  }}
                >
                  <Text style={styles.randomTiebreakerText}>Random Tiebreaker</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.resultsFooter}>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              setShowResults(false);
              onClose();
              resetForm();
            }}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
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

  // If we're in score-based voting mode
  if (selectedVotingMethod === 'score' && selectedGames.length > 0) {
    const currentGame = selectedGames[currentGameIndex];
    const currentVotes = gameVotes[currentGame.id] || [];
    
    const content = (
      <View style={styles.scoreVotingContainer}>
        <View style={styles.scoreVotingHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setSelectedVotingMethod(null);
              setShowVotingMethods(true);
            }}
          >
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.scoreVotingProgress}>
            Game {currentGameIndex + 1} of {selectedGames.length}
          </Text>
        </View>

        <View style={styles.scoreVotingContent}>
          <View style={styles.gameDisplaySection}>
            <Image
              source={{ uri: currentGame.thumbnail || 'https://via.placeholder.com/150?text=No+Image' }}
              style={styles.gameImage}
              resizeMode="cover"
            />
            <Text style={styles.gameTitle}>{currentGame.name}</Text>
            <Text style={styles.gameDetails}>
              {currentGame.min_players}-{currentGame.max_players} players • {currentGame.playing_time} min
            </Text>
          </View>

          <Text style={styles.votingInstructions}>
            Ask your players their preferences and record them or pass the phone around for a secret ballot
          </Text>

          <View style={styles.voteButtonsSection}>
            <TouchableOpacity
              style={[styles.voteButton, styles.vetoButton]}
              onPress={() => addVote('veto')}
            >
              <X size={32} color="#ffffff" />
              <Text style={styles.voteButtonText}>Veto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.voteButton, styles.okButton]}
              onPress={() => addVote('ok')}
            >
              <ThumbsUp size={32} color="#ffffff" />
              <Text style={styles.voteButtonText}>OK</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.voteButton, styles.excitedButton]}
              onPress={() => addVote('excited')}
            >
              <Heart size={32} color="#ffffff" />
              <Text style={styles.voteButtonText}>Excited</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.voteCountSection}>
            <Text style={styles.voteCountText}>
              Total votes recorded: {currentGameVoteCount}
            </Text>
          </View>

          <View style={styles.scoreVotingActions}>
            {currentVotes.length > 0 && (
              <TouchableOpacity
                style={styles.removeVoteButton}
                onPress={removeLastVote}
              >
                <Undo2 size={20} color="#ff9654" />
                <Text style={styles.removeVoteText}>Remove Last Vote</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.nextGameButton}
              onPress={nextGame}
            >
              <Text style={styles.nextGameText}>
                {currentGameIndex < selectedGames.length - 1 ? 'Next Game' : 'Finish & Calculate'}
              </Text>
            </TouchableOpacity>
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

  // Voting method selection screen
  if (showVotingMethods && selectedGames.length > 0) {
    const content = (
      <View style={styles.votingMethodsContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Selection Method</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowVotingMethods(false)}
          >
            <X size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.votingMethodsSubtitle}>
          How would you like to select a game from your chosen options?
        </Text>

        <ScrollView style={styles.votingMethodsList} showsVerticalScrollIndicator={false}>
          {votingMethods.map((method, index) => {
            const IconComponent = method.icon;
            
            return (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.votingMethodCard,
                  method.comingSoon && styles.votingMethodCardDisabled
                ]}
                onPress={() => !method.comingSoon && handleVotingMethodSelect(method.id)}
                disabled={method.comingSoon}
              >
                <View style={[styles.votingMethodIcon, { backgroundColor: method.backgroundColor }]}>
                  <IconComponent size={32} color={method.color} />
                </View>
                
                <View style={styles.votingMethodContent}>
                  <Text style={styles.votingMethodTitle}>{method.title}</Text>
                  <Text style={styles.votingMethodDescription}>{method.description}</Text>
                  {method.comingSoon && (
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
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
        style={[styles.createButton, (loading || selectedGames.length === 0) && styles.createButtonDisabled]}
        onPress={() => {
          if (selectedGames.length > 0) {
            setShowVotingMethods(true);
          }
        }}
        disabled={loading || selectedGames.length === 0}
      >
        <Plus color="#fff" size={20} />
        <Text style={styles.createButtonText}>
          {loading ? 'Creating Poll...' : 'Continue'}
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
  createButton: ViewStyle;
  createButtonDisabled: ViewStyle;
  createButtonText: TextStyle;
  votingMethodsContainer: ViewStyle;
  votingMethodsSubtitle: TextStyle;
  votingMethodsList: ViewStyle;
  votingMethodCard: ViewStyle;
  votingMethodCardDisabled: ViewStyle;
  votingMethodIcon: ViewStyle;
  votingMethodContent: ViewStyle;
  votingMethodTitle: TextStyle;
  votingMethodDescription: TextStyle;
  comingSoonText: TextStyle;
  scoreVotingContainer: ViewStyle;
  scoreVotingHeader: ViewStyle;
  scoreVotingProgress: TextStyle;
  scoreVotingContent: ViewStyle;
  gameDisplaySection: ViewStyle;
  gameImage: ViewStyle;
  gameTitle: TextStyle;
  gameDetails: TextStyle;
  votingInstructions: TextStyle;
  voteButtonsSection: ViewStyle;
  voteButton: ViewStyle;
  vetoButton: ViewStyle;
  okButton: ViewStyle;
  excitedButton: ViewStyle;
  voteButtonText: TextStyle;
  voteCountSection: ViewStyle;
  voteCountText: TextStyle;
  scoreVotingActions: ViewStyle;
  removeVoteButton: ViewStyle;
  removeVoteText: TextStyle;
  nextGameButton: ViewStyle;
  nextGameText: TextStyle;
  resultsContainer: ViewStyle;
  resultsHeader: ViewStyle;
  resultsTitle: TextStyle;
  resultsContent: ViewStyle;
  randomResultSection: ViewStyle;
  randomResultLabel: TextStyle;
  winnerCard: ViewStyle;
  winnerImage: ViewStyle;
  winnerName: TextStyle;
  winnerDetails: TextStyle;
  statusSection: ViewStyle;
  statusText: TextStyle;
  statusSubtext: TextStyle;
  rankingSection: ViewStyle;
  rankingCard: ViewStyle;
  winnerRankingCard: ViewStyle;
  rankingPosition: ViewStyle;
  rankingNumber: TextStyle;
  winnerRankingNumber: TextStyle;
  crownEmoji: TextStyle;
  rankingImage: ViewStyle;
  rankingInfo: ViewStyle;
  rankingGameName: TextStyle;
  winnerRankingText: TextStyle;
  rankingGameDetails: TextStyle;
  rankingScore: TextStyle;
  winnerRankingScore: TextStyle;
  randomTiebreakerButton: ViewStyle;
  randomTiebreakerText: TextStyle;
  resultsFooter: ViewStyle;
  doneButton: ViewStyle;
  doneButtonText: TextStyle;
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
  votingMethodsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  votingMethodsSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  votingMethodsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  votingMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e1e5ea',
  },
  votingMethodCardDisabled: {
    opacity: 0.6,
  },
  votingMethodIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  votingMethodContent: {
    flex: 1,
  },
  votingMethodTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  votingMethodDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  comingSoonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#ff9654',
    marginTop: 4,
  },
  scoreVotingContainer: {
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
  scoreVotingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
    backgroundColor: '#1a2b5f',
  },
  scoreVotingProgress: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  scoreVotingContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  gameDisplaySection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  gameImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  gameTitle: {
    fontFamily: 'Poppins-Bold',
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
  votingInstructions: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  voteButtonsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  voteButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  voteButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#ffffff',
    marginTop: 4,
  },
  voteCountSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  voteCountText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
  },
  scoreVotingActions: {
    gap: 12,
  },
  removeVoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5ef',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  removeVoteText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
    marginLeft: 8,
  },
  nextGameButton: {
    backgroundColor: '#1a2b5f',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nextGameText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  resultsContainer: {
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
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#10b981',
  },
  resultsTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  resultsContent: {
    flex: 1,
    padding: 20,
  },
  randomResultSection: {
    alignItems: 'center',
  },
  randomResultLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 20,
  },
  winnerCard: {
    backgroundColor: '#fff5ef',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff9654',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  winnerImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  winnerName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 8,
  },
  winnerDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  statusSection: {
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  statusSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
  },
  rankingSection: {
    gap: 12,
  },
  rankingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  winnerRankingCard: {
    backgroundColor: '#fff5ef',
    borderColor: '#ff9654',
    borderWidth: 2,
  },
  rankingPosition: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
    justifyContent: 'center',
  },
  rankingNumber: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#666666',
  },
  winnerRankingNumber: {
    color: '#ff9654',
  },
  crownEmoji: {
    fontSize: 16,
    marginLeft: 4,
  },
  rankingImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 16,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingGameName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  winnerRankingText: {
    color: '#ff9654',
  },
  rankingGameDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  rankingScore: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#10b981',
  },
  winnerRankingScore: {
    color: '#ff9654',
  },
  randomTiebreakerButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  randomTiebreakerText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  resultsFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
  },
  doneButton: {
    backgroundColor: '#1a2b5f',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
});