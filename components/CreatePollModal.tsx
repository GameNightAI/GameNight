import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, TouchableOpacity, Modal, Platform, ScrollView, Dimensions, Image } from 'react-native';
import { X, Plus, Check, Users, ChevronDown, ChevronUp, Clock, Brain, Users as Users2, Baby, Shuffle, Heart, ThumbsUp, ThumbsDown, Crown, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { Game } from '@/types/game';

interface CreatePollModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface VoteType {
  VETO: 'veto';
  OK: 'ok';
  EXCITED: 'excited';
}

const VOTE_TYPE: VoteType = {
  VETO: 'veto',
  OK: 'ok',
  EXCITED: 'excited'
};

interface GameVotes {
  veto: number;
  ok: number;
  excited: number;
}

interface ScoredGame extends Game {
  votes: GameVotes;
  score: number;
  isVetoed: boolean;
  rank?: number;
}

type SelectionMethod = 'random' | 'ranked' | 'score';
type VotingType = 'remote' | 'in-person';

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
  const [selectionMethod, setSelectionMethod] = useState<SelectionMethod | null>(null);
  const [votingType, setVotingType] = useState<VotingType | null>(null);

  // Score-based voting states
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [gameVotes, setGameVotes] = useState<Record<number, GameVotes>>({});
  const [currentGameVoteCount, setCurrentGameVoteCount] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [finalResults, setFinalResults] = useState<ScoredGame[]>([]);
  const [showVoteDetails, setShowVoteDetails] = useState<Record<number, boolean>>({});

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
    setSelectionMethod(null);
    setVotingType(null);
    setCurrentGameIndex(0);
    setGameVotes({});
    setCurrentGameVoteCount(0);
    setShowResults(false);
    setFinalResults([]);
    setShowVoteDetails({});
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

  const handleSelectionMethodChoice = (method: SelectionMethod) => {
    setSelectionMethod(method);
    
    if (method === 'random') {
      // Random selection - pick immediately
      const randomGame = selectedGames[Math.floor(Math.random() * selectedGames.length)];
      const results: ScoredGame[] = [{
        ...randomGame,
        votes: { veto: 0, ok: 0, excited: 0 },
        score: 0,
        isVetoed: false,
        rank: 1
      }];
      setFinalResults(results);
      setShowResults(true);
    } else if (method === 'score') {
      // Initialize voting for score-based selection
      const initialVotes: Record<number, GameVotes> = {};
      selectedGames.forEach(game => {
        initialVotes[game.id] = { veto: 0, ok: 0, excited: 0 };
      });
      setGameVotes(initialVotes);
      setCurrentGameIndex(0);
      setCurrentGameVoteCount(0);
    }
  };

  const handleVotingTypeChoice = (type: VotingType) => {
    setVotingType(type);
    setShowSelectionMethod(true);
  };

  const addVote = (voteType: keyof GameVotes) => {
    const currentGame = selectedGames[currentGameIndex];
    if (!currentGame) return;

    setGameVotes(prev => ({
      ...prev,
      [currentGame.id]: {
        ...prev[currentGame.id],
        [voteType]: prev[currentGame.id][voteType] + 1
      }
    }));

    setCurrentGameVoteCount(prev => prev + 1);
  };

  const removeLastVote = () => {
    const currentGame = selectedGames[currentGameIndex];
    if (!currentGame || currentGameVoteCount === 0) return;

    const currentVotes = gameVotes[currentGame.id];
    
    // Find the last vote type that was added (in reverse order of preference)
    if (currentVotes.excited > 0) {
      setGameVotes(prev => ({
        ...prev,
        [currentGame.id]: {
          ...prev[currentGame.id],
          excited: prev[currentGame.id].excited - 1
        }
      }));
    } else if (currentVotes.ok > 0) {
      setGameVotes(prev => ({
        ...prev,
        [currentGame.id]: {
          ...prev[currentGame.id],
          ok: prev[currentGame.id].ok - 1
        }
      }));
    } else if (currentVotes.veto > 0) {
      setGameVotes(prev => ({
        ...prev,
        [currentGame.id]: {
          ...prev[currentGame.id],
          veto: prev[currentGame.id].veto - 1
        }
      }));
    }

    setCurrentGameVoteCount(prev => prev - 1);
  };

  const nextGame = () => {
    if (currentGameIndex < selectedGames.length - 1) {
      setCurrentGameIndex(prev => prev + 1);
      setCurrentGameVoteCount(0); // Reset vote count for new game
    } else {
      // Calculate final results
      calculateResults();
    }
  };

  const calculateResults = () => {
    const scoredGames: ScoredGame[] = selectedGames.map(game => {
      const votes = gameVotes[game.id];
      const score = (votes.excited * 2) + votes.ok; // Excited = 2 points, OK = 1 point
      const isVetoed = votes.veto > 0;

      return {
        ...game,
        votes,
        score,
        isVetoed
      };
    });

    // Sort games: non-vetoed games first (by score desc, then by excited count desc), then vetoed games (by veto count asc)
    const nonVetoedGames = scoredGames.filter(game => !game.isVetoed);
    const vetoedGames = scoredGames.filter(game => game.isVetoed);

    // Sort non-vetoed games by score (desc), then by excited votes (desc)
    nonVetoedGames.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return b.votes.excited - a.votes.excited;
    });

    // Sort vetoed games by number of vetos (asc)
    vetoedGames.sort((a, b) => a.votes.veto - b.votes.veto);

    // Assign ranks
    const rankedGames: ScoredGame[] = [];
    
    // Rank non-vetoed games
    let currentRank = 1;
    for (let i = 0; i < nonVetoedGames.length; i++) {
      const game = nonVetoedGames[i];
      
      // Check if this game ties with the previous one
      if (i > 0) {
        const prevGame = nonVetoedGames[i - 1];
        if (game.score !== prevGame.score || game.votes.excited !== prevGame.votes.excited) {
          currentRank = i + 1;
        }
      }
      
      rankedGames.push({ ...game, rank: currentRank });
    }

    // Add vetoed games at the bottom (they still get ranks)
    const vetoedStartRank = nonVetoedGames.length + 1;
    vetoedGames.forEach((game, index) => {
      rankedGames.push({ ...game, rank: vetoedStartRank + index });
    });

    setFinalResults(rankedGames);
    setShowResults(true);
  };

  const toggleVoteDetails = (gameId: number) => {
    setShowVoteDetails(prev => ({
      ...prev,
      [gameId]: !prev[gameId]
    }));
  };

  const handleRandomTiebreaker = () => {
    // Find all games with rank 1
    const topGames = finalResults.filter(game => game.rank === 1);
    if (topGames.length > 1) {
      const randomWinner = topGames[Math.floor(Math.random() * topGames.length)];
      
      // Update results to show the random winner
      const updatedResults = finalResults.map(game => {
        if (game.id === randomWinner.id) {
          return { ...game, rank: 1 };
        } else if (topGames.some(tg => tg.id === game.id)) {
          return { ...game, rank: 2 };
        }
        return game;
      });
      
      setFinalResults(updatedResults);
    }
  };

  const currentGame = selectedGames[currentGameIndex];
  const isLastGame = currentGameIndex === selectedGames.length - 1;

  // Check if there are ties in the results
  const topScore = finalResults.length > 0 ? finalResults.find(g => g.rank === 1)?.score : 0;
  const topGames = finalResults.filter(game => game.rank === 1);
  const hasTie = topGames.length > 1;

  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {showResults ? 'Results' : 
           selectionMethod === 'score' && votingType ? `Game ${currentGameIndex + 1} of ${selectedGames.length}` :
           showSelectionMethod ? 'Choose Selection Method' :
           votingType ? 'Select Games' : 'Create Poll'}
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
        {!votingType ? (
          // Voting Type Selection
          <View style={styles.votingTypeSection}>
            <Text style={styles.label}>How would you like to select a game from your chosen options?</Text>
            
            <TouchableOpacity
              style={styles.votingTypeCard}
              onPress={() => handleVotingTypeChoice('in-person')}
            >
              <View style={styles.votingTypeIcon}>
                <Users size={32} color="#10b981" />
              </View>
              <View style={styles.votingTypeContent}>
                <Text style={styles.votingTypeTitle}>In-Person Voting</Text>
                <Text style={styles.votingTypeDescription}>
                  Everyone is together and can vote on each game
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.votingTypeCard}
              onPress={() => handleVotingTypeChoice('remote')}
            >
              <View style={styles.votingTypeIcon}>
                <Users2 size={32} color="#8b5cf6" />
              </View>
              <View style={styles.votingTypeContent}>
                <Text style={styles.votingTypeTitle}>Remote Voting</Text>
                <Text style={styles.votingTypeDescription}>
                  Create a poll link to share with remote players
                </Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ) : showResults ? (
          // Results Display
          <View style={styles.resultsSection}>
            {selectionMethod === 'random' ? (
              <View style={styles.randomResultSection}>
                <View style={styles.randomWinnerCard}>
                  <Shuffle size={32} color="#10b981" />
                  <Text style={styles.randomWinnerTitle}>Random Selection</Text>
                  <Text style={styles.randomWinnerName}>{finalResults[0]?.name}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.scoreResultsSection}>
                {hasTie && (
                  <View style={styles.tieSection}>
                    <Text style={styles.tieMessage}>
                      Tie between top games! 
                      {topGames.some(g => g.votes.excited > 0) && 
                        topGames.filter(g => g.votes.excited === Math.max(...topGames.map(tg => tg.votes.excited))).length === 1
                        ? ' Winner determined by excited votes.'
                        : ''
                      }
                    </Text>
                    {topGames.filter(g => g.votes.excited === Math.max(...topGames.map(tg => tg.votes.excited))).length > 1 && (
                      <TouchableOpacity
                        style={styles.tiebreakerButton}
                        onPress={handleRandomTiebreaker}
                      >
                        <Shuffle size={16} color="#ffffff" />
                        <Text style={styles.tiebreakerButtonText}>Random Tiebreaker</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {finalResults.map((game, index) => (
                  <View key={game.id} style={[
                    styles.resultCard,
                    game.rank === 1 && styles.winnerCard,
                    game.isVetoed && styles.vetoedCard
                  ]}>
                    <View style={styles.resultHeader}>
                      <View style={styles.resultRank}>
                        {game.rank === 1 && !game.isVetoed && <Crown size={20} color="#ff9654" />}
                        <Text style={[
                          styles.resultRankText,
                          game.rank === 1 && !game.isVetoed && styles.winnerRankText
                        ]}>
                          #{game.rank}
                        </Text>
                      </View>
                      
                      <View style={styles.resultGameInfo}>
                        <Image source={{ uri: game.thumbnail }} style={styles.resultGameImage} />
                        <View style={styles.resultGameDetails}>
                          <Text style={[
                            styles.resultGameName,
                            game.rank === 1 && !game.isVetoed && styles.winnerGameName
                          ]}>
                            {game.name}
                          </Text>
                          <Text style={styles.resultGameMeta}>
                            {game.min_players}-{game.max_players} players • {game.playing_time} min
                          </Text>
                          {game.isVetoed ? (
                            <Text style={styles.vetoedText}>
                              Vetoed ({game.votes.veto} veto{game.votes.veto !== 1 ? 's' : ''})
                            </Text>
                          ) : (
                            <Text style={[
                              styles.resultScore,
                              game.rank === 1 && styles.winnerScore
                            ]}>
                              {game.score} point{game.score !== 1 ? 's' : ''}
                            </Text>
                          )}
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.showVotesButton}
                        onPress={() => toggleVoteDetails(game.id)}
                      >
                        {showVoteDetails[game.id] ? (
                          <EyeOff size={20} color="#666666" />
                        ) : (
                          <Eye size={20} color="#666666" />
                        )}
                      </TouchableOpacity>
                    </View>

                    {showVoteDetails[game.id] && (
                      <View style={styles.voteDetails}>
                        <View style={styles.voteBreakdown}>
                          <View style={styles.voteItem}>
                            <Heart size={16} color="#ec4899" fill="#ec4899" />
                            <Text style={styles.voteItemText}>{game.votes.excited} excited</Text>
                          </View>
                          <View style={styles.voteItem}>
                            <ThumbsUp size={16} color="#10b981" />
                            <Text style={styles.voteItemText}>{game.votes.ok} ok</Text>
                          </View>
                          <View style={styles.voteItem}>
                            <ThumbsDown size={16} color="#ef4444" />
                            <Text style={styles.voteItemText}>{game.votes.veto} veto</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
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
        ) : showSelectionMethod ? (
          // Selection Method Choice
          <View style={styles.selectionMethodSection}>
            <Text style={styles.label}>How would you like to select a game from your chosen options?</Text>
            
            <TouchableOpacity
              style={styles.methodCard}
              onPress={() => handleSelectionMethodChoice('random')}
            >
              <View style={styles.methodIcon}>
                <Shuffle size={32} color="#10b981" />
              </View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>Random Selection</Text>
                <Text style={styles.methodDescription}>
                  Randomly pick one game from your selected options
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodCard, styles.disabledCard]}
              disabled
            >
              <View style={styles.methodIcon}>
                <Users size={32} color="#8b5cf6" />
              </View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>Ranked Choice</Text>
                <Text style={styles.methodDescription}>
                  Players rank games in order of preference
                </Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.methodCard}
              onPress={() => handleSelectionMethodChoice('score')}
            >
              <View style={styles.methodIcon}>
                <Trophy size={32} color="#ff9654" />
              </View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>Score Based</Text>
                <Text style={styles.methodDescription}>
                  Players give scores to each game so that their vote can be recorded
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : selectionMethod === 'score' && currentGame ? (
          // Score-based voting interface
          <View style={styles.scoreVotingSection}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentGameIndex + 1) / selectedGames.length) * 100}%` }
                ]} 
              />
            </View>

            <View style={styles.gameCard}>
              <Image source={{ uri: currentGame.thumbnail }} style={styles.gameImage} />
              <Text style={styles.gameTitle}>{currentGame.name}</Text>
              <Text style={styles.gameDetails}>
                {currentGame.min_players}-{currentGame.max_players} players • {currentGame.playing_time} min
              </Text>
            </View>

            <Text style={styles.votingInstructions}>
              Ask your players their preferences and record them or pass the phone around for a secret ballot
            </Text>

            <View style={styles.voteButtons}>
              <TouchableOpacity
                style={styles.vetoButton}
                onPress={() => addVote('veto')}
              >
                <X size={32} color="#ffffff" />
                <Text style={styles.voteButtonText}>Veto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.okButton}
                onPress={() => addVote('ok')}
              >
                <ThumbsUp size={32} color="#ffffff" />
                <Text style={styles.voteButtonText}>OK</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.excitedButton}
                onPress={() => addVote('excited')}
              >
                <Heart size={32} color="#ffffff" />
                <Text style={styles.voteButtonText}>Excited</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.voteCount}>
              Total votes recorded: {currentGameVoteCount}
            </Text>

            <TouchableOpacity
              style={[styles.removeVoteButton, currentGameVoteCount === 0 && styles.removeVoteButtonDisabled]}
              onPress={removeLastVote}
              disabled={currentGameVoteCount === 0}
            >
              <Text style={styles.removeVoteButtonText}>Remove Last Vote</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={nextGame}
            >
              <Text style={styles.nextButtonText}>
                {isLastGame ? 'Finish & Calculate' : 'Next Game'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Game selection interface
          <>
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

            {selectedGames.length > 0 && (
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => setShowSelectionMethod(true)}
              >
                <Text style={styles.continueButtonText}>
                  Continue with {selectedGames.length} game{selectedGames.length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {votingType === 'remote' && !showSelectionMethod && selectedGames.length > 0 && (
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreatePoll}
          disabled={loading}
        >
          <Plus color="#fff" size={20} />
          <Text style={styles.createButtonText}>
            {loading ? 'Creating Poll...' : 'Create Poll'}
          </Text>
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
  continueButton: ViewStyle;
  continueButtonText: TextStyle;
  votingTypeSection: ViewStyle;
  votingTypeCard: ViewStyle;
  votingTypeIcon: ViewStyle;
  votingTypeContent: ViewStyle;
  votingTypeTitle: TextStyle;
  votingTypeDescription: TextStyle;
  comingSoonBadge: ViewStyle;
  comingSoonText: TextStyle;
  selectionMethodSection: ViewStyle;
  methodCard: ViewStyle;
  disabledCard: ViewStyle;
  methodIcon: ViewStyle;
  methodContent: ViewStyle;
  methodTitle: TextStyle;
  methodDescription: TextStyle;
  scoreVotingSection: ViewStyle;
  progressBar: ViewStyle;
  progressFill: ViewStyle;
  gameCard: ViewStyle;
  gameImage: ViewStyle;
  gameTitle: TextStyle;
  gameDetails: TextStyle;
  votingInstructions: TextStyle;
  voteButtons: ViewStyle;
  vetoButton: ViewStyle;
  okButton: ViewStyle;
  excitedButton: ViewStyle;
  voteButtonText: TextStyle;
  voteCount: TextStyle;
  removeVoteButton: ViewStyle;
  removeVoteButtonDisabled: ViewStyle;
  removeVoteButtonText: TextStyle;
  nextButton: ViewStyle;
  nextButtonText: TextStyle;
  resultsSection: ViewStyle;
  randomResultSection: ViewStyle;
  randomWinnerCard: ViewStyle;
  randomWinnerTitle: TextStyle;
  randomWinnerName: TextStyle;
  scoreResultsSection: ViewStyle;
  tieSection: ViewStyle;
  tieMessage: TextStyle;
  tiebreakerButton: ViewStyle;
  tiebreakerButtonText: TextStyle;
  resultCard: ViewStyle;
  winnerCard: ViewStyle;
  vetoedCard: ViewStyle;
  resultHeader: ViewStyle;
  resultRank: ViewStyle;
  resultRankText: TextStyle;
  winnerRankText: TextStyle;
  resultGameInfo: ViewStyle;
  resultGameImage: ViewStyle;
  resultGameDetails: ViewStyle;
  resultGameName: TextStyle;
  winnerGameName: TextStyle;
  resultGameMeta: TextStyle;
  resultScore: TextStyle;
  winnerScore: TextStyle;
  vetoedText: TextStyle;
  showVotesButton: ViewStyle;
  voteDetails: ViewStyle;
  voteBreakdown: ViewStyle;
  voteItem: ViewStyle;
  voteItemText: TextStyle;
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
  continueButton: {
    backgroundColor: '#ff9654',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  votingTypeSection: {
    gap: 16,
  },
  votingTypeCard: {
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
  votingTypeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f7f9fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  votingTypeContent: {
    flex: 1,
  },
  votingTypeTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  votingTypeDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  comingSoonBadge: {
    backgroundColor: '#ff9654',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  comingSoonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#ffffff',
  },
  selectionMethodSection: {
    gap: 16,
  },
  methodCard: {
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
  disabledCard: {
    opacity: 0.6,
  },
  methodIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f7f9fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  methodDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  scoreVotingSection: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e1e5ea',
    borderRadius: 2,
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff9654',
    borderRadius: 2,
  },
  gameCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
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
  votingInstructions: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  vetoButton: {
    backgroundColor: '#ef4444',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  okButton: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  excitedButton: {
    backgroundColor: '#ec4899',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  voteButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ffffff',
    marginTop: 8,
  },
  voteCount: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 16,
  },
  removeVoteButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ff9654',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  removeVoteButtonDisabled: {
    opacity: 0.5,
    borderColor: '#cccccc',
  },
  removeVoteButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
  },
  nextButton: {
    backgroundColor: '#1a2b5f',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  resultsSection: {
    alignItems: 'center',
  },
  randomResultSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  randomWinnerCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  randomWinnerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#10b981',
    marginTop: 16,
    marginBottom: 8,
  },
  randomWinnerName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a2b5f',
    textAlign: 'center',
  },
  scoreResultsSection: {
    width: '100%',
    marginBottom: 32,
  },
  tieSection: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ff9654',
  },
  tieMessage: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
    textAlign: 'center',
    marginBottom: 12,
  },
  tiebreakerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  tiebreakerButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e5ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  winnerCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#ff9654',
    borderWidth: 2,
  },
  vetoedCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultRank: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    minWidth: 40,
  },
  resultRankText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#666666',
  },
  winnerRankText: {
    color: '#ff9654',
  },
  resultGameInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultGameImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  resultGameDetails: {
    flex: 1,
  },
  resultGameName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  winnerGameName: {
    color: '#ff9654',
  },
  resultGameMeta: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  resultScore: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: '#10b981',
  },
  winnerScore: {
    color: '#ff9654',
  },
  vetoedText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ef4444',
  },
  showVotesButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f7f9fc',
  },
  voteDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  voteBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  voteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteItemText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
  },
  doneButton: {
    backgroundColor: '#1a2b5f',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
});