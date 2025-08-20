
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform, Modal, Dimensions } from 'react-native';
import { ArrowLeft, Check, X } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { ThumbnailModal } from './ThumbnailModal';

interface AddResultsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onBack: () => void;
  imageData: {
    uri: string;
    name: string;
    type: string;
  } | null;
  analysisResults: {
    result: string;
    boardGames: any[];
  } | null;
  onGamesAdded?: () => void; // Add this callback prop
}

export const AddResultsModal: React.FC<AddResultsModalProps> = ({
  isVisible,
  onClose,
  onBack,
  imageData,
  analysisResults,
  onGamesAdded,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateScreenSize = () => {
      const { width } = Dimensions.get('window');
      setIsMobile(width < 768);
    };

    updateScreenSize();

    // Use a simpler approach for screen size changes
    const handleResize = () => {
      updateScreenSize();
    };

    if (Platform.OS === 'web') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  const [selectedGames, setSelectedGames] = useState<Set<number>>(new Set());
  const [databaseResults, setDatabaseResults] = useState<any[] | null>(null);
  const [loadingDatabase, setLoadingDatabase] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const [addingToCollection, setAddingToCollection] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showNoSelectionWarning, setShowNoSelectionWarning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessView, setShowSuccessView] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // Parse board games from analysis results
  const parsedBoardGames = analysisResults?.boardGames || [];

  // Initialize selectedGames with all detected games
  useEffect(() => {
    if (parsedBoardGames && parsedBoardGames.length > 0) {
      const allGameIds = new Set(parsedBoardGames.map((game: any) => game.bgg_id));
      setSelectedGames(allGameIds);
    }
  }, [parsedBoardGames]);

  const handleGameSelection = (bggId: number) => {
    const newSelected = new Set(selectedGames);
    if (newSelected.has(bggId)) {
      newSelected.delete(bggId);
    } else {
      newSelected.add(bggId);
    }
    setSelectedGames(newSelected);
  };

  const handleThumbnailPress = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setImageModalVisible(true);
  };

  // Computed styles based on screen size
  const responsiveStyles = {
    dialog: {
      ...styles.dialog,
      padding: isMobile ? 16 : 24,
      maxWidth: isMobile ? '95%' : 500 as any,
    },
    buttonRow: {
      ...styles.buttonRow,
      flexDirection: (isMobile ? 'column' : 'row') as 'row' | 'column',
      gap: isMobile ? 8 : 12,
      width: '100%' as any,
    },
  };



  const handleAddSelectedToCollection = async () => {
    if (selectedGames.size === 0) {
      setShowNoSelectionWarning(true);
      // Hide warning after 3 seconds
      setTimeout(() => setShowNoSelectionWarning(false), 3000);
      return;
    }

    try {
      setAddingToCollection(true);
      setAddError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setAddError('User not authenticated');
        return;
      }

      // Get the selected games data from database results (only games that are in the database)
      const selectedGameData = databaseResults?.filter((result: any) =>
        selectedGames.has(result.detected.bgg_id) && result.inDatabase
      ) || [];

      if (selectedGameData.length === 0) {
        setAddError('No valid games selected for collection. Only games found in the database can be added.');
        return;
      }

      // Check which games are already in the collection
      const bggIds = selectedGameData.map((result: any) => result.detected.bgg_id);
      const { data: existingGames } = await supabase
        .from('collections')
        .select('bgg_game_id')
        .eq('user_id', user.id)
        .in('bgg_game_id', bggIds);

      const existingBggIds = new Set(existingGames?.map(g => g.bgg_game_id) || []);
      const newGames = selectedGameData.filter((result: any) => !existingBggIds.has(result.detected.bgg_id));

      const duplicateCount = selectedGameData.length - newGames.length;

      if (newGames.length === 0) {
        setAddError(`All ${selectedGameData.length} selected game${selectedGameData.length !== 1 ? 's' : ''} were already found in your collection`);
        return;
      }

      // Create game data from database results (no need to fetch from BGG API)
      const gameData = newGames.map((result: any) => {
        const detectedGame = result.detected;
        const databaseGame = result.gameData;

        return {
          user_id: user.id,
          bgg_game_id: databaseGame?.id,
          name: databaseGame?.name || detectedGame.title,
          thumbnail: databaseGame?.image_url || null,
          min_players: databaseGame?.min_players || 1,
          max_players: databaseGame?.max_players || 4,
          playing_time: databaseGame?.playing_time || 60,
          year_published: databaseGame?.year_published || null,
          description: databaseGame?.description || '',
        };
      });

      // Insert the games into the collection
      const { error: insertError } = await supabase
        .from('collections')
        .upsert(gameData, { onConflict: 'user_id,bgg_game_id' });

      if (insertError) throw insertError;

      // Clear selections and show success
      setSelectedGames(new Set());
      setAddError(null);

      // Create success message
      let message = `Successfully added ${newGames.length} game${(newGames.length) !== 1 ? 's' : ''} to your collection`;
      if (duplicateCount > 0) {
        message += ` (${duplicateCount} game${duplicateCount !== 1 ? 's' : ''} were already in your collection)`;
      }
      setSuccessMessage(message);
      setShowSuccessView(true);

      // Call the callback to refresh the collection
      if (onGamesAdded) {
        onGamesAdded();
      }
    } catch (err) {
      console.error('Error adding games to collection:', err);
      setAddError(err instanceof Error ? err.message : 'Failed to add games to collection');
    } finally {
      setAddingToCollection(false);
    }
  };

  // Calculate similarity between two strings
  const calculateSimilarity = (str1: string, str2: string): number => {
    if (str1 === str2) return 1.0;
    if (str1.length === 0) return 0.0;
    if (str2.length === 0) return 0.0;

    // Check for exact substring matches
    if (str1.includes(str2) || str2.includes(str1)) {
      return 0.8;
    }

    // Regex-based matching for common patterns
    const regexMatches = checkRegexPatterns(str1, str2);
    if (regexMatches > 0) {
      return regexMatches;
    }

    // Check for word matches
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));

    if (commonWords.length > 0) {
      const wordSimilarity = commonWords.length / Math.max(words1.length, words2.length);
      return wordSimilarity * 0.7; // Weight word matches
    }

    // Simple character-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // Check for common regex patterns in game names
  const checkRegexPatterns = (str1: string, str2: string): number => {
    const patterns = [
      // Remove common suffixes/prefixes for comparison
      { pattern: /\s*(deluxe|edition|version|game|board game|card game)\s*$/i, weight: 0.9 },
      // Handle numbered versions
      { pattern: /\s*(2|3|4|5|6|7|8|9|10|II|III|IV|V|VI|VII|VIII|IX|X)\s*$/i, weight: 0.85 },
      // Handle expansions
      { pattern: /\s*(expansion|expansion pack|add-on)\s*$/i, weight: 0.8 },
      // Handle special characters and punctuation
      { pattern: /[^\w\s]/g, weight: 0.95 },
      // Handle "The" prefix
      { pattern: /^the\s+/i, weight: 0.9 },
      // Handle year suffixes
      { pattern: /\s*\d{4}\s*$/i, weight: 0.85 }
    ];

    for (const { pattern, weight } of patterns) {
      const clean1 = str1.replace(pattern, '').trim();
      const clean2 = str2.replace(pattern, '').trim();

      if (clean1 === clean2 && clean1.length > 0) {
        return weight;
      }

      // Check if one cleaned string contains the other
      if (clean1.includes(clean2) || clean2.includes(clean1)) {
        return weight * 0.8;
      }
    }

    return 0;
  };

  // Levenshtein distance calculation
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  // Query database for detected games
  useEffect(() => {
    const queryDatabase = async () => {
      if (!parsedBoardGames || parsedBoardGames.length === 0) {
        setDatabaseResults(null);
        setLoadingDatabase(false);
        return;
      }

      // Prevent multiple queries for the same data
      if (databaseResults !== null || hasQueried) return;

      setHasQueried(true);
      setLoadingDatabase(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoadingDatabase(false);
          return;
        }

        const searchPromises = parsedBoardGames.map(async (detectedGame: any) => {
          const detectedTitle = detectedGame.title;

          // Use Supabase text search for better performance
          const { data: searchResults, error: searchError } = await supabase
            .from('games')
            .select('id, name, image_url, year_published, min_players, max_players, playing_time, complexity, description, rank')
            .textSearch('name', detectedTitle, {
              type: 'websearch',
              config: 'english'
            })
            .order('rank', { ascending: true })
            .limit(10); // Limit results for performance

          if (searchError) {
            console.error(`Search error for "${detectedTitle}":`, searchError);
            return null;
          }

          // Apply fuzzy matching to search results
          const fuzzyMatches = searchResults?.map((game: any) => {
            const gameName = game.name.toLowerCase();
            const similarity = calculateSimilarity(detectedTitle.toLowerCase(), gameName);

            return {
              game,
              similarity,
              rank: game.rank || 999999
            };
          }).filter((match: any) => match.similarity > 0.3)
            .sort((a: any, b: any) => {
              // Primary sort: similarity (highest first)
              if (a.similarity !== b.similarity) {
                return b.similarity - a.similarity;
              }
              // Secondary sort: rank (lowest rank number = highest ranked game)
              return a.rank - b.rank;
            });

          const bestMatch = fuzzyMatches?.[0];

          // Check if the game is already in the user's collection
          let inCollection = false;
          if (bestMatch?.game?.id) {
            const { data: collectionCheck } = await supabase
              .from('collections')
              .select('id')
              .eq('user_id', user.id)
              .eq('bgg_game_id', bestMatch.game.id)
              .single();

            inCollection = !!collectionCheck;
          }

          return {
            detected: detectedGame,
            fuzzyMatches: fuzzyMatches || [],
            bestMatch: bestMatch || null,
            inDatabase: !!bestMatch,
            gameData: bestMatch?.game || null,
            inCollection: inCollection,
          };
        });

        // Wait for all searches to complete
        const results = await Promise.all(searchPromises);
        const validResults = results.filter(result => result !== null);

        if (validResults.length === 0) {
          setDatabaseResults(null);
        } else {
          setDatabaseResults(validResults);
        }
      } catch (error) {
        console.error('Database query failed:', error);
        setDatabaseResults(null);
      } finally {
        setLoadingDatabase(false);
      }
    };

    queryDatabase();
  }, [parsedBoardGames]);



  const content = (
    <View style={responsiveStyles.dialog}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#666666" />
        </TouchableOpacity>
        <Text style={styles.title}>Analysis Results</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      {showSuccessView ? (
        // Success View
        <View style={styles.successView}>
          <View style={styles.successIconContainer}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Success!</Text>
          <Text style={styles.successMessage}>{successMessage}</Text>
          <TouchableOpacity
            style={styles.okButton}
            onPress={() => {
              setShowSuccessView(false);
              setSuccessMessage(null);
              onClose();
            }}
          >
            <Text style={styles.okButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Main Content View
        <View style={styles.contentContainer}>
          {loadingDatabase && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1a2b5f" />
              <Text style={styles.loadingText}>Searching database for matches...</Text>
            </View>
          )}

          {!loadingDatabase && parsedBoardGames && parsedBoardGames.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Detected Games ({parsedBoardGames.length} found)</Text>

              <ScrollView style={styles.gamesScrollView} showsVerticalScrollIndicator={true}>
                {isMobile ? (
                  // Mobile card layout
                  <View style={styles.mobileGameList}>
                    {parsedBoardGames.map((game: any, index: number) => {
                      const comparison = databaseResults?.find(
                        (comp: any) => comp.detected.bgg_id === game.bgg_id
                      );
                      const isSelected = selectedGames.has(game.bgg_id);
                      const isInCollection = comparison?.inCollection || false;

                      return (
                        <View key={index} style={[styles.mobileGameCard, isInCollection && styles.gameAlreadyInCollection]}>
                          <View style={styles.mobileCardContent}>
                            <TouchableOpacity
                              style={[styles.mobileCheckbox, isSelected && styles.checkboxSelected]}
                              onPress={() => handleGameSelection(game.bgg_id)}
                              disabled={isInCollection}
                            >
                              {isSelected && <Check size={12} color="#fff" />}
                            </TouchableOpacity>

                            <View style={styles.mobileThumbnailSection}>
                              {comparison && comparison.gameData && comparison.gameData.image_url ? (
                                <TouchableOpacity
                                  onPress={() => handleThumbnailPress(comparison.gameData.image_url)}
                                  style={styles.mobileThumbnailContainer}
                                >
                                  <Image
                                    source={{ uri: comparison.gameData.image_url }}
                                    style={[styles.mobileGameThumbnail, isInCollection && styles.greyedOutImage]}
                                    resizeMode="cover"
                                  />
                                </TouchableOpacity>
                              ) : (
                                <View style={styles.mobileNoThumbnail}>
                                  <Text style={styles.mobileNoThumbnailText}>No image</Text>
                                </View>
                              )}
                            </View>

                            <View style={styles.mobileGameInfo}>
                              {comparison && comparison.gameData ? (
                                <Text style={[styles.mobileDatabaseTitle, isInCollection && styles.greyedOutText]}>
                                  {comparison.gameData.name}
                                </Text>
                              ) : (
                                <Text style={styles.mobileStatusText}>Not in database</Text>
                              )}
                              {isInCollection && (
                                <Text style={styles.alreadyInCollectionText}>Already in collection</Text>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  // Desktop table layout
                  <View style={styles.comparisonTable}>
                    <View style={styles.tableHeader}>
                      <View style={styles.checkboxCell}>
                        <Text style={styles.tableHeaderText}>Select</Text>
                      </View>
                      <View style={styles.bggIdCell}>
                        <Text style={styles.tableHeaderText}>Thumbnail</Text>
                      </View>
                      <View style={styles.gameInfo}>
                        <Text style={styles.tableHeaderText}>Detected Game</Text>
                      </View>
                    </View>

                    {parsedBoardGames.map((game: any, index: number) => {
                      const comparison = databaseResults?.find(
                        (comp: any) => comp.detected.bgg_id === game.bgg_id
                      );
                      const isSelected = selectedGames.has(game.bgg_id);
                      const isInCollection = comparison?.inCollection || false;

                      return (
                        <View key={index} style={[styles.tableRow, isInCollection && styles.gameAlreadyInCollection]}>
                          <View style={styles.checkboxCell}>
                            <TouchableOpacity
                              style={[styles.checkbox, isSelected && styles.checkboxSelected]}
                              onPress={() => handleGameSelection(game.bgg_id)}
                              disabled={isInCollection}
                            >
                              {isSelected && <Check size={12} color="#fff" />}
                            </TouchableOpacity>
                          </View>
                          <View style={styles.bggIdCell}>
                            {comparison && comparison.gameData && comparison.gameData.image_url ? (
                              <TouchableOpacity
                                onPress={() => handleThumbnailPress(comparison.gameData.image_url)}
                                style={styles.thumbnailContainer}
                              >
                                <Image
                                  source={{ uri: comparison.gameData.image_url }}
                                  style={[styles.gameThumbnail, isInCollection && styles.greyedOutImage]}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.noThumbnail}>
                                <Text style={styles.noThumbnailText}>No image</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.databaseGameCell}>
                            {comparison && comparison.gameData ? (
                              <Text style={[styles.databaseGameTitle, isInCollection && styles.greyedOutText]}>
                                {comparison.gameData.name}
                              </Text>
                            ) : (
                              <Text style={styles.statusTextUnknown}>Not in database</Text>
                            )}
                            {isInCollection && (
                              <Text style={styles.alreadyInCollectionText}>Already in collection</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            </>
          )}

          {parsedBoardGames && parsedBoardGames.length === 0 && (
            <View style={styles.resultCard}>
              <Text style={styles.resultText}>No board games detected in the image.</Text>
            </View>
          )}

          {/* Sticky action buttons at bottom */}
          {!loadingDatabase && parsedBoardGames && parsedBoardGames.length > 0 && (
            <View style={styles.stickyActionButtons}>
              <View style={responsiveStyles.buttonRow}>
                <TouchableOpacity
                  style={[styles.addToCollectionButton, addingToCollection && { opacity: 0.7 }]}
                  onPress={handleAddSelectedToCollection}
                  disabled={addingToCollection}
                >
                  {addingToCollection ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.addToCollectionButtonText}>
                      Add Game{selectedGames.size !== 1 ? 's' : ''} to Collection
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onBack}
                >
                  <Text style={styles.cancelButtonText}>Cancel Upload</Text>
                </TouchableOpacity>
              </View>

              {showNoSelectionWarning && (
                <Text style={styles.warningText}>Please select at least one game to add to your collection</Text>
              )}
              {addError && (
                <Text style={styles.errorText}>{addError}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Thumbnail Modal */}
      <ThumbnailModal
        isVisible={imageModalVisible}
        imageUrl={selectedImageUrl}
        onClose={() => setImageModalVisible(false)}
      />
    </View>
  );

  if (Platform.OS === 'web') {
    if (!isVisible) return null;
    return (
      <View style={styles.webOverlay} onTouchEnd={() => {
        if (showSuccessView) {
          setShowSuccessView(false);
          setSuccessMessage(null);
          onClose();
        }
      }}>
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
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => {
          if (showSuccessView) {
            setShowSuccessView(false);
            setSuccessMessage(null);
            onClose();
          }
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {content}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'ios' ? 20 : 10,
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
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  gamesScrollView: {
    flex: 1,
    marginBottom: 16,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  analyzedImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  imageName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
  },
  resultsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9654',
  },
  resultText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  boardGamesSection: {
    marginTop: 16,
  },
  comparisonTable: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableHeaderText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  checkboxCell: {
    flex: 0.3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  gameInfo: {
    flex: 2.5,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  bggIdCell: {
    flex: 0.8,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  databaseGameCell: {
    flex: 2,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1a2b5f',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#1a2b5f',
    borderColor: '#1a2b5f',
  },
  gameTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
  },
  thumbnailContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  noThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noThumbnailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
  },
  databaseGameTitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#1a2b5f',
  },
  statusTextUnknown: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
  },
  addToCollectionSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  addToCollectionButton: {
    backgroundColor: '#1a2b5f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  addToCollectionButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  cancelButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  // Mobile styles
  mobileGameList: {
    gap: 12,
  },
  mobileGameCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  mobileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  mobileCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1a2b5f',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileGameTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    flex: 1,
  },
  mobileCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  mobileThumbnailSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mobileThumbnailContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mobileGameThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    flexShrink: 0,
  },
  mobileNoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mobileNoThumbnailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
  },
  mobileGameInfo: {
    flex: 1,
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  mobileDatabaseTitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  mobileStatusText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    marginTop: 16,
  },
  summaryTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  summaryText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#ef4444',
    marginTop: 8,
    textAlign: 'center',
  },
  warningText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#f59e0b',
    marginTop: 8,
    textAlign: 'center',
  },
  successText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#10b981',
    marginTop: 8,
    textAlign: 'center',
  },
  stickyActionButtons: {
    backgroundColor: '#fff',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  gameAlreadyInCollection: {
    opacity: 0.5,
  },
  greyedOutImage: {
    opacity: 0.7,
  },
  greyedOutText: {
    color: '#999999',
  },
  alreadyInCollectionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: '#999999',
    marginTop: 4,
  },
  successView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 40,
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  successTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  successMessage: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  okButton: {
    backgroundColor: '#1a2b5f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
});
