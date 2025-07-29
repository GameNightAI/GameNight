
// Original implementation commented out for deployment
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Share, Save, Camera, Check, X } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { XMLParser } from 'fast-xml-parser';

export default function ImageAnalyzerResults() {
  const router = useRouter();
  const { result, imageUri, imageName, boardGames } = useLocalSearchParams<{
    result: string;
    imageUri: string;
    imageName: string;
    boardGames?: string;
  }>();

  const [selectedGames, setSelectedGames] = useState<Set<number>>(new Set());
  const [databaseResults, setDatabaseResults] = useState<any[] | null>(null);
  const [loadingDatabase, setLoadingDatabase] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const [selectAll, setSelectAll] = useState(false);



  const handleNewAnalysis = () => {
    router.push('/image-analyzer/' as any);
  };

  const handleBackToCollection = () => {
    router.push('/(tabs)/collection');
  };

  const handleGameSelection = (bggId: number) => {
    const newSelected = new Set(selectedGames);
    if (newSelected.has(bggId)) {
      newSelected.delete(bggId);
    } else {
      newSelected.add(bggId);
    }
    setSelectedGames(newSelected);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect all
      setSelectedGames(new Set());
      setSelectAll(false);
    } else {
      // Select all
      const allGameIds = parsedBoardGames.map((game: any) => game.bgg_id);
      setSelectedGames(new Set(allGameIds));
      setSelectAll(true);
    }
  };

  const [addingToCollection, setAddingToCollection] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showNoSelectionWarning, setShowNoSelectionWarning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

      // Get the selected games data
      const selectedGameData = parsedBoardGames.filter((game: any) =>
        selectedGames.has(game.bgg_id)
      );

      // Check which games are already in the collection
      const bggIds = selectedGameData.map((game: any) => game.bgg_id);
      const { data: existingGames } = await supabase
        .from('collections')
        .select('bgg_game_id')
        .eq('user_id', user.id)
        .in('bgg_game_id', bggIds);

      const existingBggIds = new Set(existingGames?.map(g => g.bgg_game_id) || []);
      const newGames = selectedGameData.filter((game: any) => !existingBggIds.has(game.bgg_id));

      const duplicateCount = selectedGameData.length - newGames.length;

      if (newGames.length === 0) {
        setAddError(`All ${selectedGameData.length} selected game${selectedGameData.length !== 1 ? 's' : ''} were already found in your collection`);
        return;
      }

      // Get detailed game info from BGG API for new games
      const gameDataPromises = newGames.map(async (game: any) => {
        try {
          const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${game.bgg_id}&stats=1`);
          const xmlText = await response.text();

          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '',
          });

          const result = parser.parse(xmlText);
          const gameInfo = result.items.item;

          return {
            user_id: user.id,
            bgg_game_id: game.bgg_id,
            name: game.title,
            thumbnail: gameInfo.thumbnail,
            min_players: parseInt(gameInfo.minplayers?.value || '1'),
            max_players: parseInt(gameInfo.maxplayers?.value || '4'),
            playing_time: parseInt(gameInfo.playingtime?.value || '60'),
            year_published: gameInfo.yearpublished?.value ? parseInt(gameInfo.yearpublished.value) : null,
            description: gameInfo.description || '',
          };
        } catch (error) {
          console.error(`Error fetching details for game ${game.bgg_id}:`, error);
          // Return basic data if API call fails
          return {
            user_id: user.id,
            bgg_game_id: game.bgg_id,
            name: game.title,
            thumbnail: null,
            min_players: 1,
            max_players: 4,
            playing_time: 60,
            year_published: null,
            description: '',
          };
        }
      });

      const gameData = await Promise.all(gameDataPromises);

      // Insert the games into the collection
      const { error: insertError } = await supabase
        .from('collections')
        .upsert(gameData, { onConflict: 'user_id,bgg_game_id' });

      if (insertError) throw insertError;

      // Clear selections and show success
      setSelectedGames(new Set());
      setAddError(null);

      // Create success message
      let message = `Successfully added ${newGames.length} game${newGames.length !== 1 ? 's' : ''} to your collection`;
      if (duplicateCount > 0) {
        message += ` (${duplicateCount} game${duplicateCount !== 1 ? 's' : ''} were already in your collection)`;
      }
      setSuccessMessage(message);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);

      // Navigate back to collection to see the added games
      router.push('/(tabs)/collection');
    } catch (err) {
      console.error('Error adding games to collection:', err);
      setAddError(err instanceof Error ? err.message : 'Failed to add games to collection');
    } finally {
      setAddingToCollection(false);
    }
  };

  const parsedBoardGames = boardGames ? JSON.parse(boardGames) : [];

  // Keep select all state in sync with individual selections
  useEffect(() => {
    if (parsedBoardGames.length > 0) {
      const allSelected = parsedBoardGames.every((game: any) => selectedGames.has(game.bgg_id));
      const noneSelected = selectedGames.size === 0;

      // Only update selectAll if it doesn't match the current state
      if (allSelected && !selectAll) {
        setSelectAll(true);
      } else if (!allSelected && selectAll) {
        setSelectAll(false);
      }
    }
  }, [selectedGames, parsedBoardGames, selectAll]);

  // Calculate similarity between two strings (with regex support)
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
        console.log('=== CLIENT-SIDE DATABASE SEARCH ===');
        console.log('Detected games from OpenAI:', parsedBoardGames.map((game: any) => game.title));
        console.log('Performing fuzzy name matching against database...');

        // Perform individual searches for each detected game
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

          return {
            detected: detectedGame,
            fuzzyMatches: fuzzyMatches || [],
            bestMatch: bestMatch || null,
            inDatabase: !!bestMatch,
            gameData: bestMatch?.game || null,
          };
        });

        // Wait for all searches to complete
        const results = await Promise.all(searchPromises);
        const validResults = results.filter(result => result !== null);

        console.log('Database search completed');
        console.log('Valid results:', validResults.length);

        if (validResults.length === 0) {
          console.error('No valid search results found');
          setDatabaseResults(null);
        } else {
          console.log('Fuzzy search results:', validResults);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToCollection}
        >
          <ArrowLeft size={24} color="#1a2b5f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Results</Text>
        <View style={styles.headerActions}>
          {/* TODO: Add share and save functionality 
          <TouchableOpacity style={styles.actionButton}>
            <Share size={20} color="#ff9654" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Save size={20} color="#ff9654" />
          </TouchableOpacity>
          */}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {imageUri && (
          <View style={styles.imageSection}>
            <Image source={{ uri: imageUri }} style={styles.analyzedImage} />
            <Text style={styles.imageName}>{imageName || 'Analyzed Image'}</Text>
          </View>
        )}

        <View style={styles.resultsSection}>
          {loadingDatabase && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1a2b5f" />
              <Text style={styles.loadingText}>Searching database for matches...</Text>
            </View>
          )}

          {!loadingDatabase && parsedBoardGames.length > 0 && (
            <View style={styles.boardGamesSection}>
              <Text style={styles.sectionTitle}>Detected Games ({parsedBoardGames.length} found)</Text>
              <View style={styles.selectAllContainer}>
                <TouchableOpacity
                  style={[styles.selectAllButton, selectAll && styles.selectAllButtonActive]}
                  onPress={handleSelectAll}
                >
                  <View style={[styles.checkbox, selectAll && styles.checkboxSelected]}>
                    {selectAll && <Check size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.selectAllText, selectAll && styles.selectAllTextActive]}>
                    {selectAll ? 'Clear All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.comparisonTable}>
                <View style={styles.tableHeader}>
                  <View style={styles.checkboxCell}>
                    <Text style={styles.tableHeaderText}>Select</Text>
                  </View>
                  <View style={styles.gameInfo}>
                    <Text style={styles.tableHeaderText}>Detected Game</Text>
                  </View>
                  <View style={styles.bggIdCell}>
                    <Text style={styles.tableHeaderText}>BGG ID</Text>
                  </View>
                  <View style={styles.databaseGameCell}>
                    <Text style={styles.tableHeaderText}>Database Game</Text>
                  </View>
                </View>
                {parsedBoardGames.map((game: any, index: number) => {
                  // Find corresponding database data if available
                  const comparison = databaseResults?.find(
                    (comp: any) => comp.detected.bgg_id === game.bgg_id
                  );

                  const isSelected = selectedGames.has(game.bgg_id);

                  return (
                    <View key={index} style={styles.tableRow}>
                      <View style={styles.checkboxCell}>
                        <TouchableOpacity
                          style={[styles.checkbox, isSelected && styles.checkboxSelected]}
                          onPress={() => handleGameSelection(game.bgg_id)}
                        >
                          {isSelected && <Check size={12} color="#fff" />}
                        </TouchableOpacity>
                      </View>
                      <View style={styles.gameInfo}>
                        <Text style={styles.gameTitle}>{game.title}</Text>
                      </View>
                      <View style={styles.bggIdCell}>
                        <Text style={styles.gameId}>{game.bgg_id}</Text>
                      </View>
                      <View style={styles.databaseGameCell}>
                        {comparison && comparison.gameData ? (
                          <Text style={styles.databaseGameTitle}>{comparison.gameData.name}</Text>
                        ) : (
                          <Text style={styles.statusTextUnknown}>Not in database</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>


              <View style={styles.addToCollectionSection}>
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
                {showNoSelectionWarning && (
                  <Text style={styles.warningText}>Please select at least one game to add to your collection</Text>
                )}
                {successMessage && (
                  <Text style={styles.successText}>{successMessage}</Text>
                )}
                {addError && (
                  <Text style={styles.errorText}>{addError}</Text>
                )}
              </View>


              {databaseResults && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Summary</Text>
                  <Text style={styles.summaryText}>
                    {databaseResults.filter((c: any) => c.inDatabase).length} of {databaseResults.length} detected games are in our database
                  </Text>
                  {databaseResults.filter((c: any) => !c.inDatabase).length > 0 && (
                    <Text style={styles.summaryText}>
                      {databaseResults.filter((c: any) => !c.inDatabase).length} games not in our database
                    </Text>
                  )}
                </View>
              )}

              {databaseResults && databaseResults.filter((c: any) => !c.inDatabase).length > 0 && (
                <View style={styles.missingGamesSection}>
                  <Text style={styles.subsectionTitle}>Games Not in Database</Text>
                  {databaseResults
                    .filter((c: any) => !c.inDatabase)
                    .map((comparison: any, index: number) => (
                      <View key={index} style={styles.missingGameItem}>
                        <View style={styles.missingGameInfo}>
                          <Text style={styles.gameTitle}>{comparison.detected.title}</Text>
                          <Text style={styles.gameId}>BGG ID: {comparison.detected.bgg_id}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.addToCollectionButton}
                          onPress={() => {
                            // TODO: Implement add to database functionality
                            console.log('Add to database:', comparison.detected);
                          }}
                        >
                          <Text style={styles.addToCollectionButtonText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                </View>
              )}
            </View>
          )}

          {parsedBoardGames.length === 0 && (
            <View style={styles.resultCard}>
              <Text style={styles.resultText}>No board games detected in the image.</Text>
            </View>
          )}

          {parsedBoardGames.length > 0 && loadingDatabase && (
            <View style={styles.comparisonSection}>
              <Text style={styles.sectionTitle}>Database Comparison</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  Searching database...
                </Text>
              </View>
            </View>
          )}

          {parsedBoardGames.length > 0 && !loadingDatabase && !databaseResults && (
            <View style={styles.comparisonSection}>
              <Text style={styles.sectionTitle}>Database Comparison</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  Database comparison is not available at this time
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.newAnalysisButton}
            onPress={handleNewAnalysis}
          >
            <Camera size={20} color="#fff" />
            <Text style={styles.newAnalysisButtonText}>Analyze Another Image</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#1a2b5f',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    alignItems: 'center',
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
    width: '90%',
    maxWidth: 600,
  },
  analyzedImage: {
    width: 200,
    height: 200,
    borderRadius: 0,
    marginBottom: 8,
  },
  imageName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
  },
  resultsSection: {
    marginBottom: 24,
    width: '90%',
    maxWidth: 800,
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
  actionsSection: {
    marginTop: 24,
    width: '90%',
    maxWidth: 600,
    alignItems: 'center',
  },
  newAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2b5f',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  newAnalysisButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  boardGamesSection: {
    marginTop: 16,
  },
  gameItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  gameTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 4,
  },
  gameId: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
  },
  comparisonSection: {
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
    flexWrap: 'nowrap',
  },
  tableHeaderText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexWrap: 'nowrap',
  },
  gameInfo: {
    flex: 2.5,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 8,
    minWidth: 120,
  },
  bggIdCell: {
    flex: 0.8,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 8,
    minWidth: 60,
  },
  databaseGameCell: {
    flex: 2,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 8,
    minWidth: 100,
  },
  databaseGameTitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#1a2b5f',
  },
  statusCell: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    minWidth: 80,
    paddingHorizontal: 8,
  },
  statusInCollection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusNotInCollection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusTextIn: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#22c55e',
  },
  statusTextNot: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#ef4444',
  },
  statusTextUnknown: {
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
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  missingGamesSection: {
    marginTop: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  subsectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
    marginBottom: 8,
  },
  missingGameItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  missingGameInfo: {
    flex: 1,
  },
  addToCollectionButton: {
    backgroundColor: '#1a2b5f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCollectionButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  checkboxCell: {
    flex: 0.3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minWidth: 40,
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
  addToCollectionSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
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
  selectAllContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  selectAllButtonActive: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  selectAllText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#1a2b5f',
  },
  selectAllTextActive: {
    color: '#ff9654',
  },
});
