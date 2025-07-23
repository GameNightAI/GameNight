// Original implementation commented out for deployment
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

export default function ImageAnalyzer() {
  const [image, setImage] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const pickImage = async (fromCamera: boolean) => {
    let result: ImagePicker.ImagePickerResult;

    if (fromCamera) {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.7,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.7,
      });
    }

    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      setImage({
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.type || 'image/jpeg',
      });
      setError(null); // Clear any previous errors
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);

    try {
      const imageData = await fetch(image.uri);
      const blob = await imageData.blob();
      const base64 = await convertToBase64(blob);

      const isLocalhost =
        typeof window !== 'undefined' && window.location.hostname === 'localhost';
      /*
       to test locally
       run 2 terminals
       1. npx expo start --web --port 19006 (explicit port labelling here)
          *run in dev mode (not default expo go)
       2. run netlify dev --port 8082 (or relabel the port in line 64)
      */
      const functionURL = isLocalhost
        ? 'http://localhost:8082/.netlify/functions/analyze'
        : '/.netlify/functions/analyze';

      const res = await fetch(functionURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Analysis failed');
      }

      // Handle backend response structure
      if (json.error) {
        setError(json.error);
        return;
      }

      if (json.boardGames && json.boardGames.length > 0) {
        // Format the board games data for display
        const gamesList = json.boardGames.map((game: any) => `${game.title} (BGG ID: ${game.bgg_id})`).join('\n');
        const result = `Found ${json.boardGames.length} game(s):\n\n${gamesList}`;

        router.push({
          pathname: '/image-analyzer/results',
          params: {
            result,
            imageUri: image.uri,
            imageName: image.name,
            boardGames: JSON.stringify(json.boardGames),
          },
        } as any);
      } else {
        // No games found
        const result = 'No board games detected in the image.';
        router.push({
          pathname: '/image-analyzer/results',
          params: {
            result,
            imageUri: image.uri,
            imageName: image.name,
          },
        } as any);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image Analyzer</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={() => pickImage(true)}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => pickImage(false)}>
          <Text style={styles.buttonText}>Pick from Gallery</Text>
        </TouchableOpacity>
      </View>

      {image && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          <Text style={styles.imageName}>{image.name}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.analyzeButton, (!image || loading) && { opacity: 0.5 }]}
        onPress={handleAnalyze}
        disabled={!image || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.analyzeButtonText}>Analyze Image</Text>
        )}
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// 🔁 Helper: Convert Blob to base64 string
async function convertToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  button: {
    backgroundColor: '#ff9654',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  imageName: {
    fontSize: 14,
    color: '#666',
  },
  analyzeButton: {
    backgroundColor: '#1a2b5f',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  analyzeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#c33',
    textAlign: 'center',
    fontWeight: '500',
  },
});
