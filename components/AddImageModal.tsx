import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, Upload, X } from 'lucide-react-native';
import { Alert } from 'react-native';

// Sample images
const sampleImage1 = require('@/assets/images/sample-game-1.png');
const sampleImage2 = require('@/assets/images/sample-game-2.png');

interface AddImageModalProps {
  isVisible: boolean;
  onClose: () => void;
  onNext: (imageData: { uri: string; name: string; type: string }, analysisResults?: any) => void;
  onBack: () => void;
}

export const AddImageModal: React.FC<AddImageModalProps> = ({
  isVisible,
  onClose,
  onNext,
  onBack,
}) => {
  const [image, setImage] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(true);
  const [fullSizeImageVisible, setFullSizeImageVisible] = useState(false);
  const [fullSizeImageSource, setFullSizeImageSource] = useState<any>(null);

  // Reset picker visibility when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      setPickerVisible(true);
    }
  }, [isVisible]);

  const showFullSizeImage = (imageSource: any) => {
    setFullSizeImageSource(imageSource);
    setFullSizeImageVisible(true);
  };

  const hideFullSizeImage = () => {
    setFullSizeImageVisible(false);
    setFullSizeImageSource(null);
  };

  const pickImage = async (fromCamera: boolean) => {
    try {
      console.log('Starting image picker, fromCamera:', fromCamera);

      // Temporarily hide modal to avoid conflicts
      setPickerVisible(false);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check permissions first
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to take photos.');
          setPickerVisible(true);
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Media library permission is required to select photos.');
          setPickerVisible(true);
          return;
        }
      }

      let result: ImagePicker.ImagePickerResult;

      if (fromCamera) {
        console.log('Launching camera...');
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          quality: 0.7,
        });
      } else {
        console.log('Launching image library...');
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          quality: 0.7,
        });
      }

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        console.log('Selected asset:', asset);
        const imageData = {
          uri: asset.uri,
          name: asset.fileName || 'photo.jpg',
          type: asset.type || 'image/jpeg',
        };
        setImage(imageData);
        setError(null);
        console.log('Image set successfully:', imageData);
      } else {
        console.log('Image picker was canceled or no assets selected');
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setError(`Failed to pick image: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      // Re-show modal after picker is done
      setPickerVisible(true);
    }
  };

  const selectSampleImage = (sampleNumber: number) => {
    const sampleImage = sampleNumber === 1 ? sampleImage1 : sampleImage2;
    const imageData = {
      uri: Image.resolveAssetSource(sampleImage).uri,
      name: `sample-game-${sampleNumber}.png`,
      type: 'image/png',
    };
    setImage(imageData);
    setError(null);
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
       2. netlify dev --port 8082 (or relabel the port in line 64)
      */
      const functionURL = isLocalhost
        ? 'http://localhost:8082/.netlify/functions/analyze'
        : '/.netlify/functions/analyze';

      const res = await fetch(functionURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || `HTTP error! status: ${res.status}`);
      }

      // Handle backend response structure
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.boardGames && result.boardGames.length > 0) {
        // Format the board games data for display
        const gamesList = result.boardGames.map((game: any) => `${game.title} (BGG ID: ${game.bgg_id})`).join('\n');
        const formattedResult = `Found ${result.boardGames.length} game(s):\n\n${gamesList}`;

        // Pass the image data and analysis results to the parent
        onNext(image, {
          ...result,
          result: formattedResult
        });
      } else {
        // No games found
        const formattedResult = 'No board games detected in the image.';

        // Pass the image data and analysis results to the parent
        onNext(image, {
          ...result,
          result: formattedResult,
          boardGames: []
        });
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#666666" />
        </TouchableOpacity>
        <Text style={styles.title}>Analyze Image</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Initial upload section - shown when no image is selected */}
        {!image && (
          <>
            <View style={styles.sampleSection}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <Text style={styles.description}>
                Take a photo or upload an image to automatically detect and add them to your collection
              </Text>
              <View style={styles.sampleButtons}>
                <View style={styles.sampleButton}>
                  <TouchableOpacity
                    style={styles.sampleImageContainer}
                    onPress={() => showFullSizeImage(sampleImage1)}
                  >
                    <Image source={sampleImage1} style={styles.sampleImage} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sampleButtonTextContainer}
                    onPress={() => selectSampleImage(1)}
                  >
                  </TouchableOpacity>
                </View>
                <View style={styles.sampleButton}>
                  <TouchableOpacity
                    style={styles.sampleImageContainer}
                    onPress={() => showFullSizeImage(sampleImage2)}
                  >
                    <Image source={sampleImage2} style={styles.sampleImage} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sampleButtonTextContainer}
                    onPress={() => selectSampleImage(2)}
                  >
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.uploadSection}>
              <Text style={styles.sectionTitle}>Upload Image</Text>

              <View style={styles.uploadButtons}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => {
                    console.log('Take Photo button pressed');
                    pickImage(true);
                  }}
                >
                  <Camera size={24} color="#ff9654" />
                  <Text style={styles.uploadButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => {
                    console.log('Choose from Library button pressed');
                    pickImage(false);
                  }}
                >
                  <Upload size={24} color="#ff9654" />
                  <Text style={styles.uploadButtonText}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Image preview section - shown when image is selected */}
        {image && (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Image Preview</Text>
            <View style={styles.imagePreview}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
            </View>

            <View style={styles.previewButtons}>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => {
                  setImage(null);
                  setError(null);
                }}
              >
                <Text style={styles.retakeButtonText}>Retake Photo or Upload New Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Analyze button - only shown when image is selected */}
        {image && (
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              loading && styles.analyzeButtonDisabled
            ]}
            onPress={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Camera size={20} color="#fff" />
                <Text style={styles.analyzeButtonText}>Analyze Image</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  // Full-size image modal
  const fullSizeImageModal = (
    <Modal
      visible={fullSizeImageVisible}
      transparent
      animationType="fade"
      onRequestClose={hideFullSizeImage}
    >
      <TouchableOpacity
        style={styles.fullSizeOverlay}
        activeOpacity={1}
        onPress={hideFullSizeImage}
      >
        <TouchableOpacity
          style={styles.fullSizeImageContainer}
          activeOpacity={1}
          onPress={() => { }} // Prevent closing when tapping the image
        >
          <Image
            source={fullSizeImageSource}
            style={styles.fullSizeImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.fullSizeCloseButton}
            onPress={hideFullSizeImage}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  if (Platform.OS === 'web') {
    if (!isVisible) return null;
    return (
      <>
        <View style={styles.webOverlay}>
          {content}
        </View>
        {fullSizeImageModal}
      </>
    );
  }

  return (
    <>
      <Modal
        visible={isVisible && pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          {content}
        </View>
      </Modal>
      {fullSizeImageModal}
    </>
  );
};

async function convertToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 string
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

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
    maxHeight: '85%',
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
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  imagePreview: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 0,
    backgroundColor: '#f7f9fc',
    borderRadius: 8,
  },
  previewImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    minHeight: 200,
    maxHeight: 300,
    borderRadius: 0,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  imageName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#1a2b5f',
    marginBottom: 12,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadButtons: {
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff9654',
    gap: 8,
  },
  uploadButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#ff9654',
  },
  sampleSection: {
    marginBottom: 20,
  },
  sampleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  sampleButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  sampleImageContainer: {
    width: '100%',
    height: '100%',
    minHeight: 120,
    maxHeight: 200,
    marginBottom: 8,
    // borderWidth: 2,
    // borderColor: '#ff0000',
  },
  sampleButtonTextContainer: {
    width: '100%',
    alignItems: 'center',
  },
  sampleImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    resizeMode: 'contain',
    // borderWidth: 1,
    // borderColor: '#00ff00',
  },
  sampleButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666666',
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#e74c3c',
    marginBottom: 16,
    textAlign: 'center',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  analyzeButtonDisabled: {
    opacity: 0.5,
  },
  analyzeButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  fullSizeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullSizeImageContainer: {
    position: 'relative',
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullSizeImage: {
    width: '100%',
    height: '100%',
  },
  fullSizeCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewButtons: {
    width: '100%',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9654',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    width: '100%',
  },
  retakeButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: isMobile ? 12 : 16,
    color: '#fff',
    textAlign: 'center',
  },
});
