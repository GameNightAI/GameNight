import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, Modal, Platform, ScrollView, Dimensions } from 'react-native';
import { X, Plus, Check, Users, ChevronDown, ChevronUp, Clock, Brain, Users as Users2, Baby, Shuffle, Heart, ThumbsUp, ThumbsDown, Undo2 } from 'lucide-react-native';
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
  onRandomSelection: (selectedGame: Game) => void;
  onScoreBasedComplete: (results: GameResult[]) => void;
}

interface GameResult {
  game: Game;
  score: number;
  vetos: number;
  votes: {
    veto: number;
    ok: number;
    excited: number;
  };
}

interface ScoreBasedVotingProps {
  games: Game[];
  onComplete: (results: GameResult[]) => void;
  onBack: () => void;
}

interface RandomSelectionResultProps {
  game: Game;
  onClose: () => void;
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
  const [showSelectionMethod, setShowSelectionMethod] = useState(false);

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

  const handleInPersonPoll = () => {
    if (selectedGames.length === 0) {
      setError('Please select at least one game');
      return;
    }
    setShowSelectionMethod(true);
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

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.inPersonButton]}
          onPress={handleInPersonPoll}
          disabled={loading || selectedGames.length === 0}
        >
          <Users size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>In-Person</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.remoteButton]}
          onPress={handleCreatePoll}
          disabled={loading || selectedGames.length === 0}
        >
          <Plus color="#fff" size={20} />
          <Text style={styles.actionButtonText}>
            {loading ? 'Creating...' : 'Remote Poll'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    if (!isVisible) return null;
    return (
      <View style={styles.webOverlay}>
        {content}
        <SelectionMethodModal
          isVisible={showSelectionMethod}
          onClose={() => setShowSelectionMethod(false)}
          selectedGames={selectedGames}
          onRandomSelection={(game) => {
            setShowSelectionMethod(false);
            onClose();
            resetForm();
          }}
          onScoreBasedComplete={(results) => {
            setShowSelectionMethod(false);
            onClose();
            resetForm();
          }}
        />
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
        <SelectionMethodModal
          isVisible={showSelectionMethod}
          onClose={() => setShowSelectionMethod(false)}
          selectedGames={selectedGames}
          onRandomSelection={(game) => {
            setShowSelectionMethod(false);
            onClose();
            resetForm();
          }}
          onScoreBasedComplete={(results) => {
            setShowSelectionMethod(false);
            onClose();
            resetForm();
          }}
        />
      </View>
    </Modal>
  );
};

const SelectionMethodModal: React.FC<SelectionMethodModalProps> = ({
  isVisible,
  onClose,
  selectedGames,
  onRandomSelection,
  onScoreBasedComplete,
}) => {
  const [showScoreBased, setShowScoreBased] = useState(false);
  const [showRandomResult, setShowRandomResult] = useState(false);
  const [randomSelectedGame, setRandomSelectedGame] = useState<Game | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleRandomSelection = () => {
    setIsAnimating(true);
    
    // Brief animation delay
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * selectedGames.length);
      const selectedGame = selectedGames[randomIndex];
      setRandomSelectedGame(selectedGame);
      setIsAnimating(false);
      setShowRandomResult(true);
    }, 1000);
  };

  const handleScoreBasedSelection = () => {
    setShowScoreBased(true);
  };

  if (showScoreBased) {
    return (
      <ScoreBasedVoting
        games={selectedGames}
        onComplete={onScoreBasedComplete}
        onBack={() => setShowScoreBased(false)}
      />
    );
  }

  if (showRandomResult && randomSelectedGame) {
    return (
      <RandomSelectionResult
        game={randomSelectedGame}
        onClose={() => {
          setShowRandomResult(false);
          setRandomSelectedGame(null);
          onRandomSelection(randomSelectedGame);
        }}
      />
    );
  }

  if (!isVisible) return null;

  const content = (
    <View style={styles.selectionDialog}>
      <View style={styles.selectionHeader}>
        <Text style={styles.selectionTitle}>Choose Selection Method</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.selectionSubtitle}>
        How would you like to select a game from your chosen options?
      </Text>

      {isAnimating && (
        <View style={styles.animationOverlay}>
          <Text style={styles.animationText}>Selecting...</Text>
        </View>
      )}

      <View style={styles.methodsContainer}>
        <TouchableOpacity
          style={styles.methodCard}
          onPress={handleRandomSelection}
          disabled={isAnimating}
        >
          <View style={styles.methodIcon}>
            <Shuffle size={32} color="#10b981" />
          </View>
          <Text style={styles.methodTitle}>Random Selection</Text>
          <Text style={styles.methodDescription}>
            Randomly pick one game from your selected options
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.methodCard}
          onPress={handleScoreBasedSelection}
          disabled={isAnimating}
        >
          <View style={styles.methodIcon}>
            <Heart size={32} color="#ec4899" />
          </View>
          <Text style={styles.methodTitle}>Score Based</Text>
          <Text style={styles.methodDescription}>
            Players give scores to each game so that their vote can be recorded
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.methodCard, styles.comingSoonCard]}
          disabled={true}
        >
          <View style={styles.methodIcon}>
            <Users size={32} color="#94a3b8" />
          </View>
          <Text style={[styles.methodTitle, styles.comingSoonText]}>Ranked Choice</Text>
          <Text style={[styles.methodDescription, styles.comingSoonText]}>
            Players rank games in order of preference
          </Text>
          <Text style={styles.comingSoonLabel}>Coming Soon</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.selectionWebOverlay}>
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
      <View style={styles.selectionOverlay}>
        {content}
      </View>
    </Modal>
  );
};

const ScoreBasedVoting: React.FC<ScoreBasedVotingProps> = ({
  games,
  onComplete,
  onBack,
}) => {
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [votes, setVotes] = useState<Array<{ type: 'veto' | 'ok' | 'excited' }>>([]);
  const [showResults, setShowResults] = useState(false);

  const currentGame = games[currentGameIndex];
  const isLastGame = currentGameIndex === games.length - 1;

  const addVote = (type: 'veto' | 'ok' | 'excited') => {
    setVotes(prev => [...prev, { type }]);
  };

  const removeLastVote = () => {
    setVotes(prev => prev.slice(0, -1));
  };

  const submitGameVotes = () => {
    const vetoCount = votes.filter(v => v.type === 'veto').length;
    const okCount = votes.filter(v => v.type === 'ok').length;
    const excitedCount = votes.filter(v => v.type === 'excited').length;
    
    const score = (excitedCount * 2) + okCount;

    const result: GameResult = {
      game: currentGame,
      score,
      vetos: vetoCount,
      votes: {
        veto: vetoCount,
        ok: okCount,
        excited: excitedCount,
      },
    };

    const newResults = [...gameResults, result];
    setGameResults(newResults);

    if (isLastGame) {
      // Calculate final results
      const gamesWithoutVetos = newResults.filter(r => r.vetos === 0);
      
      let finalResults: GameResult[];
      if (gamesWithoutVetos.length > 0) {
        // Sort by score (descending)
        finalResults = gamesWithoutVetos.sort((a, b) => b.score - a.score);
      } else {
        // All games have vetos, sort by fewest vetos
        finalResults = newResults.sort((a, b) => a.vetos - b.vetos);
      }

      setShowResults(true);
      onComplete(finalResults);
    } else {
      // Move to next game
      setCurrentGameIndex(prev => prev + 1);
      setVotes([]);
    }
  };

  if (showResults) {
    return null; // Results will be handled by parent component
  }

  const content = (
    <View style={styles.scoreBasedDialog}>
      <View style={styles.scoreBasedHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Game {currentGameIndex + 1} of {games.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentGameIndex + 1) / games.length) * 100}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      <View style={styles.gameDisplayContainer}>
        <View style={styles.gameImageContainer}>
          <View style={styles.gamePlaceholder}>
            <Text style={styles.gameInitial}>{currentGame.name.charAt(0)}</Text>
          </View>
        </View>
        
        <Text style={styles.gameDisplayName}>{currentGame.name}</Text>
        <Text style={styles.gameDisplayDetails}>
          {currentGame.min_players}-{currentGame.max_players} players • {currentGame.playing_time} min
        </Text>
      </View>

      <Text style={styles.instructionText}>
        Ask your players their preferences and record them or pass the phone around for a secret ballot
      </Text>

      <View style={styles.votingSection}>
        <View style={styles.voteButtonsContainer}>
          <TouchableOpacity
            style={[styles.voteButton, styles.vetoButton]}
            onPress={() => addVote('veto')}
          >
            <X size={24} color="#ffffff" />
            <Text style={styles.voteButtonText}>Veto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteButton, styles.okButton]}
            onPress={() => addVote('ok')}
          >
            <ThumbsUp size={24} color="#ffffff" />
            <Text style={styles.voteButtonText}>OK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteButton, styles.excitedButton]}
            onPress={() => addVote('excited')}
          >
            <Heart size={24} color="#ffffff" />
            <Text style={styles.voteButtonText}>Excited</Text>
          </TouchableOpacity>
        </View>

        {votes.length > 0 && (
          <TouchableOpacity
            style={styles.undoButton}
            onPress={removeLastVote}
          >
            <Undo2 size={20} color="#ff9654" />
            <Text style={styles.undoButtonText}>Remove Last Vote</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[styles.submitButton, votes.length === 0 && styles.submitButtonDisabled]}
          onPress={submitGameVotes}
          disabled={votes.length === 0}
        >
          <Text style={styles.submitButtonText}>
            {isLastGame ? 'Finish Voting' : 'Next Game'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.scoreBasedWebOverlay}>
        {content}
      </View>
    );
  }

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
    >
      <View style={styles.scoreBasedOverlay}>
        {content}
      </View>
    </Modal>
  );
};

const RandomSelectionResult: React.FC<RandomSelectionResultProps> = ({
  game,
  onClose,
}) => {
  const content = (
    <View style={styles.resultDialog}>
      <Text style={styles.resultTitle}>Random Selection Result</Text>
      
      <View style={styles.resultGameContainer}>
        <View style={styles.resultGameImage}>
          <Text style={styles.resultGameInitial}>{game.name.charAt(0)}</Text>
        </View>
        <Text style={styles.resultGameName}>{game.name}</Text>
        <Text style={styles.resultGameDetails}>
          {game.min_players}-{game.max_players} players • {game.playing_time} min
        </Text>
      </View>

      <TouchableOpacity style={styles.resultCloseButton} onPress={onClose}>
        <Text style={styles.resultCloseText}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.resultWebOverlay}>
        {content}
      </View>
    );
  }

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
    >
      <View style={styles.resultOverlay}>
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
  actionButtons: ViewStyle;
  actionButton: ViewStyle;
  actionButtonText: TextStyle;
  inPersonButton: ViewStyle;
  remoteButton: ViewStyle;
  selectionOverlay: ViewStyle;
  selectionWebOverlay: ViewStyle;
  selectionDialog: ViewStyle;
  selectionHeader: ViewStyle;
  selectionTitle: TextStyle;
  selectionSubtitle: TextStyle;
  animationOverlay: ViewStyle;
  animationText: TextStyle;
  methodsContainer: ViewStyle;
  methodCard: ViewStyle;
  methodIcon: ViewStyle;
  methodTitle: TextStyle;
  methodDescription: TextStyle;
  comingSoonCard: ViewStyle;
  comingSoonText: TextStyle;
  comingSoonLabel: TextStyle;
  scoreBasedOverlay: ViewStyle;
  scoreBasedWebOverlay: ViewStyle;
  scoreBasedDialog: ViewStyle;
  scoreBasedHeader: ViewStyle;
  backButton: ViewStyle;
  progressContainer: ViewStyle;
  progressText: TextStyle;
  progressBar: ViewStyle;
  progressFill: ViewStyle;
  gameDisplayContainer: ViewStyle;
  gameImageContainer: ViewStyle;
  gamePlaceholder: ViewStyle;
  gameInitial: TextStyle;
  gameDisplayName: TextStyle;
  gameDisplayDetails: TextStyle;
  instructionText: TextStyle;
  votingSection: ViewStyle;
  voteButtonsContainer: ViewStyle;
  voteButton: ViewStyle;
  voteButtonText: TextStyle;
  vetoButton: ViewStyle;
  okButton: ViewStyle;
  excitedButton: ViewStyle;
  undoButton: ViewStyle;
  undoButtonText: TextStyle;
  submitContainer: ViewStyle;
  submitButton: ViewStyle;
  submitButtonDisabled: ViewStyle;
  submitButtonText: TextStyle;
  resultOverlay: ViewStyle;
  resultWebOverlay: ViewStyle;
  resultDialog: ViewStyle;
  resultTitle: TextStyle;
  resultGameContainer: ViewStyle;
  resultGameImage: ViewStyle;
  resultGameInitial: TextStyle;
  resultGameName: TextStyle;
  resultGameDetails: TextStyle;
  resultCloseButton: ViewStyle;
  resultCloseText: TextStyle;
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  inPersonButton: {
    backgroundColor: '#8b5cf6',
  },
  remoteButton: {
    backgroundColor: '#ff9654',
  },
  selectionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  selectionWebOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
    padding: 20,
  },
  selectionDialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
  },
  selectionSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  animationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  animationText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
  },
  methodsContainer: {
    gap: 16,
  },
  methodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  methodIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f7f9fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  comingSoonCard: {
    opacity: 0.6,
  },
  comingSoonText: {
    color: '#94a3b8',
  },
  comingSoonLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#ff9654',
    backgroundColor: '#fff5ef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  scoreBasedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scoreBasedWebOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
    padding: 20,
  },
  scoreBasedDialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    height: '90%',
    maxHeight: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  scoreBasedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5ea',
    backgroundColor: '#f7f9fc',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  progressContainer: {
    flex: 1,
  },
  progressText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e1e5ea',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff9654',
    borderRadius: 2,
  },
  gameDisplayContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f7f9fc',
  },
  gameImageContainer: {
    marginBottom: 16,
  },
  gamePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#1a2b5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameInitial: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: '#ffffff',
  },
  gameDisplayName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 8,
  },
  gameDisplayDetails: {
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
    padding: 20,
    lineHeight: 22,
  },
  votingSection: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  voteButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  voteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  voteButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#ffffff',
    marginTop: 4,
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
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5ef',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  undoButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
    marginLeft: 8,
  },
  submitContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e5ea',
  },
  submitButton: {
    backgroundColor: '#1a2b5f',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  resultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultWebOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1003,
    padding: 20,
  },
  resultDialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  resultTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
    marginBottom: 24,
    textAlign: 'center',
  },
  resultGameContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resultGameImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#1a2b5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultGameInitial: {
    fontFamily: 'Poppins-Bold',
    fontSize: 40,
    color: '#ffffff',
  },
  resultGameName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    color: '#1a2b5f',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultGameDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  resultCloseButton: {
    backgroundColor: '#ff9654',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  resultCloseText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
});