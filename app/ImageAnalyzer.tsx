import React, { useState } from 'react';
import { View, Text, Button, Image, ActivityIndicator, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function ImageAnalyzer() {
  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async (fromCamera: boolean) => {
    let result: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImage({
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.type || 'image/jpeg',
      });
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);

    // In Expo preview, just show a placeholder result
    setTimeout(() => {
      setResult('Analysis not available in Expo preview. Connect to a backend to enable this feature.');
      setLoading(false);
    }, 1000);
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
        <Text style={styles.analyzeButtonText}>{loading ? 'Analyzing...' : 'Analyze Image'}</Text>
      </TouchableOpacity>
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>Result:</Text>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16, gap: 12 },
  button: { backgroundColor: '#ff9654', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  previewContainer: { alignItems: 'center', marginBottom: 16 },
  imagePreview: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
  imageName: { fontSize: 14, color: '#666' },
  analyzeButton: { backgroundColor: '#1a2b5f', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  analyzeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resultContainer: { marginTop: 16, backgroundColor: '#f7f9fc', padding: 12, borderRadius: 8 },
  resultLabel: { fontWeight: 'bold', marginBottom: 4 },
  resultText: { color: '#333' },
}); 