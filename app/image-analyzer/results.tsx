
// Original implementation commented out for deployment
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Share, Save, Camera } from 'lucide-react-native';

export default function ImageAnalyzerResults() {
  const router = useRouter();
  const { result, imageUri, imageName, boardGames } = useLocalSearchParams<{
    result: string;
    imageUri: string;
    imageName: string;
    boardGames?: string;
  }>();

  const handleNewAnalysis = () => {
    router.push('/image-analyzer/' as any);
  };

  const handleBackToCollection = () => {
    router.push('/(tabs)/collection');
  };

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {imageUri && (
          <View style={styles.imageSection}>
            <Image source={{ uri: imageUri }} style={styles.analyzedImage} />
            <Text style={styles.imageName}>{imageName || 'Analyzed Image'}</Text>
          </View>
        )}

        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Analysis Results</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{result}</Text>
          </View>

          {boardGames && (
            <View style={styles.boardGamesSection}>
              <Text style={styles.sectionTitle}>Detected Games</Text>
              {JSON.parse(boardGames).map((game: any, index: number) => (
                <View key={index} style={styles.gameItem}>
                  <Text style={styles.gameTitle}>{game.title}</Text>
                  <Text style={styles.gameId}>BGG ID: {game.bgg_id}</Text>
                </View>
              ))}
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
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  analyzedImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  imageName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
  },
  resultsSection: {
    marginBottom: 24,
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
});
