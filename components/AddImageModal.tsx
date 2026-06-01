import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, Upload, X, RefreshCw } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useBodyScrollLock } from '@/utils/scrollLock';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useRegisterModalSurface } from '@/contexts/ModalSurfaceContext';
import { prepareAnalyzeImage } from '@/utils/prepareAnalyzeImage';
import {
  analyzeImage,
  ANALYZE_WARM_EXPECTED_SECONDS,
  type BoardGameDetection,
} from '@/services/analyzeImage';

/**
 * Image analyzer requests use a full deployed origin on native (see analyzerBaseUrl).
 * Before publication: confirm the production domain matches where `/.netlify/functions/analyze` is hosted,
 * and update the Netlify fallback below if the app moves off klack.netlify.app
 * (see also package.json "homepage").
 */

// Sample images
const sampleImage2 = require('@/assets/images/sample-game-2.png');

interface AddImageModalProps {
  isVisible: boolean;
  onClose: () => void;
  onNext: (
    imageData: { uri: string; name: string; type: string },
    analysisResults?: { boardGames: BoardGameDetection[] },
  ) => void;
  onBack: () => void;
}

export const AddImageModal: React.FC<AddImageModalProps> = ({
  isVisible,
  onClose,
  onNext,
  onBack,
}) => {
  const { colors, typography, touchTargets } = useTheme();
  const { announceForAccessibility } = useAccessibility();
  const insets = useSafeAreaInsets();
  const { screenHeight, isDesktop } = useDeviceType();
  /*
   to test locally
   run 2 terminals
   1. npx expo start --web --port 19006 (explicit port labelling here)
      *run in dev mode (not default expo go)
   2. netlify dev --port 8082 (or relabel the port in line 64)
  */
  const isWebLocalhost = Platform.OS === 'web'
    && typeof window !== 'undefined'
    && (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1');
  const analyzerBaseUrl = isWebLocalhost
    ? 'http://localhost:8082'
    : Platform.select({
      web: typeof window !== 'undefined' ? window.location.origin : 'https://klack.netlify.app',
      default: 'https://klack.netlify.app',
    });

  // Lock body scroll on web when modal is visible
  useBodyScrollLock(isVisible);
  useRegisterModalSurface('AddImageModal', isVisible);

  const [image, setImage] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(true);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const slowMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fullSizeImageVisible, setFullSizeImageVisible] = useState(false);
  const [fullSizeImageSource, setFullSizeImageSource] = useState<any>(null);
  const [instructionsModalVisible, setInstructionsModalVisible] = useState(false);

  const styles = useMemo(() => getStyles(colors, typography, insets, screenHeight), [colors, typography, insets, screenHeight]);

  // Reset picker visibility when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      setPickerVisible(true);
    } else {
      analyzeAbortRef.current?.abort();
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      analyzeAbortRef.current?.abort();
      if (slowMessageTimerRef.current) {
        clearTimeout(slowMessageTimerRef.current);
      }
    };
  }, []);

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
        setShowRetry(false);
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

  // THIS IS NOT IN USE. LEAVING HERE FOR REFERENCE, TO BE UPDATED FOR JPG TO PNG CONVERSION
  const selectSampleImage = (sampleNumber: number) => {
    const imageData = {
      uri: Image.resolveAssetSource(sampleImage2).uri,
      name: `sample-game-${sampleNumber}.png`,
      type: 'image/png',
    };
    setImage(imageData);
    setError(null);
  };

  const runAnalyze = async () => {
    if (!image) return;

    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;

    setLoading(true);
    setError(null);
    setShowRetry(false);
    setStatusMessage('Preparing your photo…');
    announceForAccessibility('Preparing your photo');

    slowMessageTimerRef.current = setTimeout(() => {
      setStatusMessage(`This can take up to ${ANALYZE_WARM_EXPECTED_SECONDS} seconds.`);
    }, 3000);

    try {
      const prepared = await prepareAnalyzeImage(image.uri);

      setStatusMessage('Analyzing your photo…');
      announceForAccessibility('Analyzing your photo');

      const result = await analyzeImage({
        imageBase64: prepared.imageBase64,
        mimeType: prepared.mimeType,
        analyzerBaseUrl,
        signal: controller.signal,
        onRetry: () => {
          setStatusMessage('Still working, retrying…');
          announceForAccessibility('Still working, retrying');
        },
      });

      if (result.boardGames.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No games found',
          text2: 'Try another photo or check the tips.',
        });
      }

      onNext(image, { boardGames: result.boardGames });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      console.error('Analysis error:', err);

      const userErrorMessage = err instanceof Error ? err.message : 'Failed to analyze image';
      setError(userErrorMessage);
      setShowRetry(true);
      Toast.show({
        type: 'error',
        text1: 'Analysis failed',
        text2: userErrorMessage,
      });
      announceForAccessibility(`Analysis failed. ${userErrorMessage}`);
    } finally {
      if (slowMessageTimerRef.current) {
        clearTimeout(slowMessageTimerRef.current);
        slowMessageTimerRef.current = null;
      }
      setLoading(false);
      setStatusMessage(null);
    }
  };

  const handleAnalyze = () => {
    runAnalyze();
  };

  const content = (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            analyzeAbortRef.current?.abort();
            onBack();
            announceForAccessibility('Returning to add game options');
          }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Returns to the previous step"
          hitSlop={touchTargets.sizeTwenty}
        >
          <ArrowLeft size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Games With A Photo</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            analyzeAbortRef.current?.abort();
            onClose();
            announceForAccessibility('Photo analysis modal closed');
          }}
          accessibilityLabel="Close modal"
          accessibilityRole="button"
          accessibilityHint="Closes the photo analysis modal"
          hitSlop={touchTargets.sizeTwenty}
        >
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={true}
      >
        {/* Initial upload section - shown when no image is selected */}
        {!image && (
          <>
            <View style={styles.sampleSection}>
              {/* <Text style={styles.description}>
                Take a photo or upload an image to automatically detect and add them to your collection:
              </Text> */}
              <View style={styles.sampleButtons}>
                <View style={styles.sampleButton}>
                  <TouchableOpacity
                    style={styles.sampleImageContainer}
                    onPress={() => {
                      showFullSizeImage(sampleImage2);
                      announceForAccessibility('Opening sample image in full size');
                    }}
                    accessibilityLabel="View sample image"
                    accessibilityRole="button"
                    accessibilityHint="Opens the sample image in full size view"
                  >
                    <Image source={sampleImage2} style={styles.sampleImage} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.instructionsButton}
                onPress={() => {
                  setInstructionsModalVisible(true);
                  announceForAccessibility('Opening instructions modal');
                }}
                accessibilityLabel="View instructions"
                accessibilityRole="button"
                accessibilityHint="Opens instructions for taking good photos"
                hitSlop={touchTargets.standard}
              >
                <Text style={styles.instructionsButtonText}>📋 View Instructions</Text>
              </TouchableOpacity>

            </View>

            <View style={styles.uploadSection}>
              <View style={styles.uploadButtons}>
                {isDesktop ? null : (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => {
                      console.log('Take Photo button pressed');
                      pickImage(true);
                      announceForAccessibility('Opening camera to take photo');
                    }}
                    accessibilityLabel="Take photo"
                    accessibilityRole="button"
                    accessibilityHint="Opens camera to take a photo of board games"
                    hitSlop={touchTargets.tiny}
                  >
                    <Camera size={24} color="#fff" />
                    <Text style={styles.uploadButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => {
                    console.log('Choose from Library button pressed');
                    pickImage(false);
                    announceForAccessibility('Opening image library');
                  }}
                  accessibilityLabel={!isDesktop ? 'Add photo' : 'Upload Image'}
                  accessibilityRole="button"
                  accessibilityHint="Opens image library to select a photo"
                  hitSlop={touchTargets.tiny}
                >
                  <Upload size={24} color="#fff" />
                  <Text style={styles.uploadButtonText}>
                    {!isDesktop ? 'Add Photo' : 'Upload Image'}
                  </Text>
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

            {/* Analyze button - shown when image is selected */}
            <TouchableOpacity
              style={[
                styles.analyzeButton,
                loading && styles.analyzeButtonDisabled
              ]}
              onPress={() => {
                handleAnalyze();
                announceForAccessibility('Starting image analysis');
              }}
              disabled={loading}
              accessibilityLabel="Detect games in image"
              accessibilityRole="button"
              accessibilityHint="Analyzes the selected image to detect board games"
              hitSlop={touchTargets.standard}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Camera size={20} color="#fff" />
                  <Text style={styles.analyzeButtonText}>Detect Games</Text>
                </>
              )}
            </TouchableOpacity>

            {loading && statusMessage && (
              <Text style={styles.statusText}>{statusMessage}</Text>
            )}

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {showRetry && !loading && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  runAnalyze();
                  announceForAccessibility('Retrying image analysis');
                }}
                accessibilityLabel="Retry analysis"
                accessibilityRole="button"
                accessibilityHint="Retries analyzing the selected image"
                hitSlop={touchTargets.standard}
              >
                <RefreshCw size={18} color="#fff" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}

            <View style={styles.previewButtons}>
              <TouchableOpacity
                style={[styles.retakeButton, loading && styles.analyzeButtonDisabled]}
                onPress={() => {
                  setImage(null);
                  setError(null);
                  setShowRetry(false);
                  announceForAccessibility('Photo cleared, ready to select new image');
                }}
                disabled={loading}
                accessibilityLabel="Change photo"
                accessibilityRole="button"
                accessibilityHint="Clears current photo to select a different one"
                hitSlop={touchTargets.standard}
              >
                <Text style={styles.retakeButtonText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
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
          onPress={hideFullSizeImage}
        >
          <Image
            source={fullSizeImageSource}
            style={styles.fullSizeImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.fullSizeCloseButton}
            onPress={() => {
              hideFullSizeImage();
              announceForAccessibility('Sample image closed');
            }}
            accessibilityLabel="Close full size image"
            accessibilityRole="button"
            accessibilityHint="Closes the full size image view"
            hitSlop={touchTargets.tiny}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  // Instructions modal
  const instructionsModal = (
    <Modal
      visible={instructionsModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setInstructionsModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.instructionsOverlay}
        activeOpacity={1}
        onPress={() => setInstructionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.instructionsDialog}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.instructionsHeader}>
            <Text style={styles.instructionsTitle}>Instructions</Text>
            <TouchableOpacity
              style={styles.instructionsCloseButton}
              onPress={() => {
                setInstructionsModalVisible(false);
                announceForAccessibility('Instructions modal closed');
              }}
              accessibilityLabel="Close instructions"
              accessibilityRole="button"
              accessibilityHint="Closes the instructions modal"
              hitSlop={touchTargets.sizeTwenty}
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.instructionsContent}>
            <Text style={styles.instructionsBulletPoint}>• Add a clear photo with good lighting</Text>
            <Text style={styles.instructionsBulletPoint}>• Ensure boxes are oriented so game names are visible</Text>
            <Text style={styles.instructionsBulletPoint}>• Remove any obstructions</Text>
            {/* <View style={styles.orContainer}>
              <Text style={styles.orText}>OR</Text>
            </View>
            <Text style={styles.instructionsBulletPoint}>• Choose a photo from your library</Text>*/}
          </View>
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
        {instructionsModal}
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
        {instructionsModal}
      </Modal>
      {fullSizeImageModal}
    </>
  );
};

const getStyles = (colors: any, typography: any, insets: any, screenHeight: number) => {
  const responsiveMinHeight = Math.max(340, Math.min(540, screenHeight * 0.68));

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.tints.neutral,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: Math.max(20, insets.top),
      paddingBottom: Math.max(20, insets.bottom),
      paddingHorizontal: 20,
    },
    webOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.tints.neutral,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: 20,
    },
    dialog: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      width: '100%',
      maxWidth: 500,
      minHeight: responsiveMinHeight,
      maxHeight: '92%',
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
      marginBottom: 8,
    },
    backButton: {
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButton: {
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.headline,
      color: colors.text,
    },
    description: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.body,
      color: colors.textMuted,
      marginBottom: 20,
    },
    imagePreview: {
      alignItems: 'center',
      marginBottom: 0,
      paddingVertical: 10,
      paddingHorizontal: 0,
      backgroundColor: colors.background,
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
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.caption1,
      color: colors.textMuted,
    },
    sectionTitle: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.callout,
      color: colors.text,
      marginBottom: 12,
    },
    uploadSection: {
      marginBottom: 0,
    },
    uploadButtons: {
      marginBottom: 8,
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent,
      marginBottom: 8,
    },
    uploadButtonText: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.subheadline,
      color: colors.card,
      marginLeft: 8,
    },
    errorText: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.body,
      color: colors.error,
      marginTop: 10,
      marginBottom: 4,
      textAlign: 'center',
    },
    statusText: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.footnote,
      color: colors.textMuted,
      marginTop: 10,
      textAlign: 'center',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.textMuted,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginTop: 10,
    },
    retryButtonText: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.subheadline,
      color: colors.card,
      marginLeft: 8,
    },
    analyzeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginTop: 10,
      marginBottom: 10,
    },
    analyzeButtonDisabled: {
      opacity: 0.5,
    },
    analyzeButtonText: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.subheadline,
      color: colors.card,
      marginLeft: 8,
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
      backgroundColor: colors.textMuted,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      width: '100%',
    },
    retakeButtonText: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.subheadline,
      color: colors.card,
      textAlign: 'center',
    },
    sampleSection: {
      marginBottom: 12,
    },
    sampleButtons: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 12,
    },
    sampleButton: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 0,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'transparent'
    },
    sampleImageContainer: {
      width: 260,
      height: 260,
      overflow: 'hidden',
      borderRadius: 0,
      borderWidth: 0,
      borderColor: colors.border,
    },
    sampleImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    bulletPoints: {
      marginTop: 20,
      marginBottom: 0,
    },
    bulletPoint: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.body,
      color: colors.textMuted,
      marginBottom: 5,
    },
    fullSizeOverlay: {
      flex: 1,
      backgroundColor: colors.tints.neutral,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullSizeImageContainer: {
      position: 'relative',
      width: '90%',
      height: '80%',
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    fullSizeImage: {
      width: '100%',
      height: '100%',
    },
    fullSizeCloseButton: {
      position: 'absolute',
      top: 20,
      right: 20,
      backgroundColor: colors.tints.neutral,
      borderRadius: 20,
      padding: 8,
    },
    // Instructions button styles
    instructionsButton: {
      backgroundColor: colors.background,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.textMuted,
    },
    instructionsButtonText: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.subheadline,
      color: colors.text,
    },
    // Instructions modal styles
    instructionsOverlay: {
      flex: 1,
      backgroundColor: colors.tints.neutral,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    instructionsDialog: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    instructionsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    instructionsTitle: {
      fontFamily: typography.getFontFamily('semibold'),
      fontSize: typography.fontSize.headline,
      color: colors.text,
    },
    instructionsCloseButton: {
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    instructionsContent: {
      alignItems: 'flex-start',
    },
    instructionsBulletPoint: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.footnote,
      color: colors.textMuted,
      marginBottom: 8,
      lineHeight: 20,
    },
    orContainer: {
      alignItems: 'center',
      marginVertical: 15,
      width: '100%',
    },
    orText: {
      fontFamily: typography.getFontFamily('normal'),
      fontSize: typography.fontSize.subheadline,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
};